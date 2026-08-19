package app

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/payments/domain"
	"frame-24/internal/payments/repo"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/outbox"
)

type Service struct {
	pool       *pgxpool.Pool
	repo       repo.Repository
	pixGateway domain.PixGateway
	tefAdapter domain.TefAdapter
}

func NewService(
	pool *pgxpool.Pool,
	repo repo.Repository,
	pixGateway domain.PixGateway,
	tefAdapter domain.TefAdapter,
) *Service {
	return &Service{
		pool:       pool,
		repo:       repo,
		pixGateway: pixGateway,
		tefAdapter: tefAdapter,
	}
}

// CreatePixPayment gera uma tentativa de pagamento PIX com QR Code dinâmico do BACEN
func (s *Service) CreatePixPayment(
	ctx context.Context,
	tenantID, saleID uuid.UUID,
	idempotencyKey string,
	amount float64,
	description string,
) (*domain.PaymentAttempt, error) {
	// Validação de entrada
	if strings.TrimSpace(idempotencyKey) == "" {
		return nil, fmt.Errorf("%w: idempotencyKey obrigatorio", domain.ErrWebhookPayloadMalformed)
	}

	// 1. Verificar se já existe tentativa com esta idempotencyKey (pré-insert)
	existing, err := s.repo.GetPaymentAttemptByIdempotencyKey(ctx, tenantID, idempotencyKey)
	if err == nil && existing != nil {
		return existing, nil // Idempotência: retorna tentativa já criada
	}

	attempt, err := domain.NewPaymentAttempt(tenantID, saleID, idempotencyKey, domain.PaymentMethodPix, "bacen_pix", amount)
	if err != nil {
		return nil, err
	}

	// 2. Chamar Gateway de PIX (se fornecido) para gerar QR Code dinâmico
	if s.pixGateway != nil {
		pixResp, err := s.pixGateway.GenerateDynamicPix(ctx, tenantID, saleID, amount, description)
		if err != nil {
			return nil, fmt.Errorf("falha na geracao do PIX no gateway: %w", err)
		}
		attempt.QRCodePix = &pixResp.QRCodePayload
		attempt.QRCodeURL = &pixResp.QRCodeURL
		attempt.ExternalReference = &pixResp.TxID
	} else {
		// Mock local EMVCo para ambiente de dev / teste
		payload := fmt.Sprintf("00020126580014br.gov.bcb.pix0136%s520400005303986540%0.2f5802BR5913CINEMA_SaaS6009SAO_PAULO62070503***6304ABCD", attempt.ID.String(), amount)
		url := fmt.Sprintf("https://pix.frame24.internal/qr/%s", attempt.ID.String())
		txID := fmt.Sprintf("TX-PIX-%s", attempt.ID.String()[:8])
		attempt.QRCodePix = &payload
		attempt.QRCodeURL = &url
		attempt.ExternalReference = &txID
	}

	// 3. Persistir no banco de dados e emitir evento outbox (ON CONFLICT → re-busca o vencedor)
	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreatePaymentAttempt(ctx, tx, attempt); err != nil {
			if err == domain.ErrDuplicateIdempotencyKey {
				return nil // será re-buscado abaixo
			}
			return err
		}
		return outbox.InsertEvent(ctx, tx, tenantID, "payments.pix.created", attempt.ID, map[string]any{
			"paymentAttemptId":  attempt.ID,
			"saleId":            saleID,
			"amount":            amount,
			"externalReference": attempt.ExternalReference,
		})
	})
	if err != nil {
		return nil, err
	}

	// Re-buscar o vencedor da race (caso ON CONFLICT DO NOTHING tenha sido ativado)
	winner, err := s.repo.GetPaymentAttemptByIdempotencyKey(ctx, tenantID, idempotencyKey)
	if err != nil {
		return nil, err
	}
	return winner, nil
}

// ProcessWebhook processa confirmações assíncronas de pagamento dos gateways com idempotência
func (s *Service) ProcessWebhook(
	ctx context.Context,
	tenantID uuid.UUID,
	idempotencyKey string,
	externalRef string,
	status string,
	amount *float64,
	errorMessage *string,
) (*domain.PaymentAttempt, error) {
	// Validação de payload mínimo
	if strings.TrimSpace(idempotencyKey) == "" || strings.TrimSpace(status) == "" {
		return nil, domain.ErrWebhookPayloadMalformed
	}

	attempt, err := s.repo.GetPaymentAttemptByIdempotencyKey(ctx, tenantID, idempotencyKey)
	if err != nil {
		return nil, err
	}

	if attempt.Status == domain.PaymentStatusApproved {
		return attempt, nil // Já aprovado — idempotente
	}

	// Validar que o externalRef do gateway bate com o registrado (se ambos existem)
	if externalRef != "" && attempt.ExternalReference != nil && *attempt.ExternalReference != "" {
		if *attempt.ExternalReference != externalRef {
			return nil, fmt.Errorf("%w: externalRef divergente", domain.ErrWebhookPayloadMalformed)
		}
	}

	// Validar divergência de valor se enviado pelo gateway
	if amount != nil && *amount > 0 {
		if math.Abs(*amount-attempt.Amount) > 0.01 {
			return nil, domain.ErrInvalidAmount
		}
	}

	cleanStatus := strings.ToLower(strings.TrimSpace(status))
	if cleanStatus == "approved" || cleanStatus == "paid" || cleanStatus == "concluido" {
		if err := attempt.Approve(externalRef); err != nil {
			return nil, err
		}
	} else {
		reason := "pagamento_recusado"
		if errorMessage != nil {
			reason = *errorMessage
		}
		if err := attempt.Fail(reason); err != nil {
			return nil, err
		}
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		if err := s.repo.UpdatePaymentAttempt(ctx, tx, attempt); err != nil {
			return err
		}

		if attempt.Status == domain.PaymentStatusApproved {
			return outbox.InsertEvent(ctx, tx, tenantID, "payments.payment.approved", attempt.ID, map[string]any{
				"paymentAttemptId":  attempt.ID,
				"saleId":            attempt.SaleID,
				"amount":            attempt.Amount,
				"paymentMethod":     attempt.PaymentMethod,
				"externalReference": attempt.ExternalReference,
			})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return attempt, nil
}

// InitiateTef registra uma transação autorizada no PinPad físico (Fase 1 do 2-phase commit)
func (s *Service) InitiateTef(
	ctx context.Context,
	tenantID uuid.UUID,
	saleID *uuid.UUID,
	posTerminalID, nsu, authCode, cardBrand string,
	txType domain.TefTransactionType,
	installments int,
	amount float64,
	receiptMerchant, receiptCustomer *string,
) (*domain.TefTransaction, error) {
	// 1. Verificar se este NSU já foi registrado neste terminal (idempotência pré-insert)
	existing, err := s.repo.GetTefTransactionByNSU(ctx, tenantID, posTerminalID, nsu)
	if err == nil && existing != nil {
		return existing, nil // Idempotente
	}

	tef, err := domain.NewTefTransaction(
		tenantID, saleID, posTerminalID, nsu, authCode, cardBrand,
		txType, installments, amount, receiptMerchant, receiptCustomer,
	)
	if err != nil {
		return nil, err
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(pgTx pgx.Tx) error {
		return s.repo.CreateTefTransaction(ctx, pgTx, tef)
	})
	if err != nil {
		return nil, err
	}

	// 2. Re-buscar pelo NSU após ON CONFLICT DO NOTHING para garantir que retornamos
	// o registro vencedor da race (pode diferir de `tef` se outra goroutine ganhou o insert)
	winner, err := s.repo.GetTefTransactionByNSU(ctx, tenantID, posTerminalID, nsu)
	if err != nil {
		return nil, err
	}
	return winner, nil
}

// ConfirmTef confirma a transação TEF (CNC - Confirm / Commit) após sucesso da venda no PDV
func (s *Service) ConfirmTef(
	ctx context.Context,
	tenantID uuid.UUID,
	terminalID, nsu string,
) (*domain.TefTransaction, error) {
	tx, err := s.repo.GetTefTransactionByNSU(ctx, tenantID, terminalID, nsu)
	if err != nil {
		return nil, err
	}

	if err := tx.Confirm(); err != nil {
		return nil, err
	}

	// Se houver adaptador TEF conectado, envia confirmação ao concentrador (ex: SiTEF / PayGo)
	if s.tefAdapter != nil {
		if err := s.tefAdapter.ConfirmTransaction(ctx, tenantID, terminalID, nsu); err != nil {
			return nil, fmt.Errorf("falha ao confirmar transacao no concentrador TEF: %w", err)
		}
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(pgTx pgx.Tx) error {
		if err := s.repo.UpdateTefTransaction(ctx, pgTx, tx); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, pgTx, tenantID, "payments.tef.confirmed", tx.ID, map[string]any{
			"tefId":         tx.ID,
			"posTerminalId": terminalID,
			"nsu":           nsu,
			"amount":        tx.Amount,
		})
	})
	if err != nil {
		return nil, err
	}

	return tx, nil
}

// ReverseTef desfaz a transação TEF (NCN - Non-Confirmation / Auto-Reversal) em caso de erro no PDV
func (s *Service) ReverseTef(
	ctx context.Context,
	tenantID uuid.UUID,
	terminalID, nsu, reason string,
) (*domain.TefTransaction, error) {
	tx, err := s.repo.GetTefTransactionByNSU(ctx, tenantID, terminalID, nsu)
	if err != nil {
		return nil, err
	}

	if err := tx.Reverse(); err != nil {
		return nil, err
	}

	if s.tefAdapter != nil {
		if err := s.tefAdapter.ReverseTransaction(ctx, tenantID, terminalID, nsu, reason); err != nil {
			return nil, fmt.Errorf("falha ao desfazimento no concentrador TEF: %w", err)
		}
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(pgTx pgx.Tx) error {
		if err := s.repo.UpdateTefTransaction(ctx, pgTx, tx); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, pgTx, tenantID, "payments.tef.reversed", tx.ID, map[string]any{
			"tefId":         tx.ID,
			"posTerminalId": terminalID,
			"nsu":           nsu,
			"reason":        reason,
		})
	})
	if err != nil {
		return nil, err
	}

	return tx, nil
}
