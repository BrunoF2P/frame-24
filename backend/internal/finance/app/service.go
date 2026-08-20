package app

import (
	"context"
	"fmt"
	"time"

	"frame-24/internal/finance/domain"
	"frame-24/internal/finance/repo"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/money"
	"frame-24/internal/platform/outbox"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LedgerEntryInput struct {
	AccountCode string
	EntryType   string // debit | credit
	Amount      money.Cents
}

type Service struct {
	pool *pgxpool.Pool
	repo repo.Repository
}

func NewService(pool *pgxpool.Pool, r repo.Repository) *Service {
	return &Service{
		pool: pool,
		repo: r,
	}
}

func (s *Service) EnsureStandardAccounts(ctx context.Context, tenantID uuid.UUID) error {
	return db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		return s.repo.CreateStandardAccountsIfMissing(ctx, tx, tenantID)
	})
}

func (s *Service) ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]domain.Account, error) {
	_ = s.EnsureStandardAccounts(ctx, tenantID)
	return s.repo.ListAccounts(ctx, tenantID)
}

func (s *Service) CreateAccount(ctx context.Context, tenantID uuid.UUID, code, name, accType string) (*domain.Account, error) {
	acc, err := domain.NewAccount(tenantID, code, name, accType, false)
	if err != nil {
		return nil, err
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		return s.repo.CreateAccount(ctx, tx, acc)
	})
	if err != nil {
		return nil, err
	}
	return acc, nil
}

func (s *Service) PostLedgerTransaction(
	ctx context.Context,
	tenantID uuid.UUID,
	description, refType string,
	refID *uuid.UUID,
	entries []LedgerEntryInput,
) (*domain.Transaction, error) {
	if len(entries) < 2 {
		return nil, domain.ErrEmptyTransaction
	}

	_ = s.EnsureStandardAccounts(ctx, tenantID)

	txEntity := domain.NewTransaction(tenantID, time.Now(), description, refType, refID)

	for _, e := range entries {
		acc, err := s.repo.GetAccountByCode(ctx, tenantID, e.AccountCode)
		if err != nil {
			return nil, fmt.Errorf("conta contabil %s: %w", e.AccountCode, err)
		}
		if err := txEntity.AddEntry(acc.ID, e.EntryType, e.Amount); err != nil {
			return nil, err
		}
	}

	if err := txEntity.Validate(); err != nil {
		return nil, err
	}

	err := db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		return s.repo.RecordTransaction(ctx, tx, txEntity)
	})
	if err != nil {
		return nil, err
	}

	return txEntity, nil
}

func (s *Service) ListTransactions(ctx context.Context, tenantID uuid.UUID, limit int, beforeTS *time.Time, beforeID *uuid.UUID) ([]domain.Transaction, error) {
	return s.repo.ListTransactions(ctx, tenantID, limit, beforeTS, beforeID)
}

// ---------------------------------------------------------------------
// Módulo de Caixa de PDV (Cash Sessions)
// ---------------------------------------------------------------------

func (s *Service) OpenCashSession(
	ctx context.Context,
	tenantID, complexID uuid.UUID,
	posTerminalID string,
	operatorID uuid.UUID,
	openingFloat money.Cents,
) (*domain.CashSession, error) {
	existing, err := s.repo.GetOpenCashSession(ctx, tenantID, complexID, posTerminalID, operatorID)
	if err == nil && existing != nil {
		return nil, domain.ErrCashSessionAlreadyOpen
	}

	session, err := domain.NewCashSession(tenantID, complexID, posTerminalID, operatorID, openingFloat)
	if err != nil {
		return nil, err
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateCashSession(ctx, tx, session); err != nil {
			return err
		}

		if openingFloat > 0 {
			reason := "Fundo de troco inicial"
			movement := &domain.CashMovement{
				ID:           uuid.New(),
				TenantID:     tenantID,
				SessionID:    session.ID,
				MovementType: domain.CashMovementOpeningFloat,
				Amount:       openingFloat,
				Reason:       &reason,
				CreatedAt:    time.Now(),
			}
			if err := s.repo.RecordCashMovement(ctx, tx, movement); err != nil {
				return err
			}
		}

		return outbox.InsertEvent(ctx, tx, tenantID, "finance.cash_session.opened", session.ID, map[string]any{
			"sessionId":      session.ID,
			"complexId":      complexID,
			"posTerminalId":  posTerminalID,
			"operatorId":     operatorID,
			"openingBalance": openingFloat,
		})
	})

	if err != nil {
		return nil, err
	}
	return session, nil
}

func (s *Service) GetOpenCashSession(ctx context.Context, tenantID, complexID uuid.UUID, posTerminalID string, operatorID uuid.UUID) (*domain.CashSession, error) {
	return s.repo.GetOpenCashSession(ctx, tenantID, complexID, posTerminalID, operatorID)
}

func (s *Service) RecordCashBleed(
	ctx context.Context,
	tenantID, sessionID uuid.UUID,
	amount money.Cents,
	reason string,
	authorizedByID *uuid.UUID,
) error {
	if amount <= 0 {
		return domain.ErrInvalidAmount
	}

	movement := &domain.CashMovement{
		ID:             uuid.New(),
		TenantID:       tenantID,
		SessionID:      sessionID,
		MovementType:   domain.CashMovementBleedWithdrawal,
		Amount:         amount,
		Reason:         &reason,
		AuthorizedByID: authorizedByID,
		CreatedAt:      time.Now(),
	}

	return db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		if err := s.repo.RecordCashMovement(ctx, tx, movement); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, tenantID, "finance.cash_session.bleed", movement.ID, map[string]any{
			"sessionId": sessionID,
			"amount":    amount,
			"reason":    reason,
		})
	})
}

func (s *Service) RecordCashSupply(
	ctx context.Context,
	tenantID, sessionID uuid.UUID,
	amount money.Cents,
	reason string,
	authorizedByID *uuid.UUID,
) error {
	if amount <= 0 {
		return domain.ErrInvalidAmount
	}

	movement := &domain.CashMovement{
		ID:             uuid.New(),
		TenantID:       tenantID,
		SessionID:      sessionID,
		MovementType:   domain.CashMovementDepositReinforcement,
		Amount:         amount,
		Reason:         &reason,
		AuthorizedByID: authorizedByID,
		CreatedAt:      time.Now(),
	}

	return db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		if err := s.repo.RecordCashMovement(ctx, tx, movement); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, tenantID, "finance.cash_session.supply", movement.ID, map[string]any{
			"sessionId": sessionID,
			"amount":    amount,
			"reason":    reason,
		})
	})
}

func (s *Service) RecordCashSale(ctx context.Context, tenantID, sessionID, saleID uuid.UUID, amount money.Cents) error {
	if amount <= 0 {
		return nil
	}

	refType := "sale"
	movement := &domain.CashMovement{
		ID:            uuid.New(),
		TenantID:      tenantID,
		SessionID:     sessionID,
		MovementType:  domain.CashMovementCashSale,
		Amount:        amount,
		ReferenceType: &refType,
		ReferenceID:   &saleID,
		CreatedAt:     time.Now(),
	}

	return db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		return s.repo.RecordCashMovement(ctx, tx, movement)
	})

}

type SaleConcessionItemPayload struct {
	ProductID *uuid.UUID
	Quantity  float64
	UnitCost  money.Subcent
}

// CloseCashSessionBlind realiza o Fechamento Cego de Caixa e apura quebra/sobra com partidas dobradas
func (s *Service) CloseCashSessionBlind(
	ctx context.Context,
	tenantID, sessionID uuid.UUID,
	cashCounted, cardCounted, pixCounted money.Cents,
	notes *string,
) (*domain.CashSession, error) {
	var closedSession *domain.CashSession

	err := db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		// 1. Lock exclusivo FOR UPDATE na linha da sessão para evitar fechamentos concorrentes.
		//    Em produção (s.pool != nil), qualquer erro é propagado — sem fallback.
		//    Em testes unitários in-memory (s.pool == nil), GetCashSessionByIDForUpdate delega
		//    para a implementação fake que não usa pgx.Tx, por isso o fallback é seguro.
		session, err := s.repo.GetCashSessionByIDForUpdate(ctx, tx, tenantID, sessionID)
		if err != nil {
			if s.pool == nil {
				// Modo teste in-memory: fake repo pode não implementar FOR UPDATE via pgx.Tx
				session, err = s.repo.GetCashSessionByID(ctx, tenantID, sessionID)
				if err != nil {
					return err
				}
			} else {
				// Produção: propaga o erro — o lock é obrigatório
				return err
			}
		}
		if session.Status == "closed" {
			return domain.ErrCashSessionClosed
		}

		cashSales, deposits, bleeds, err := s.repo.GetCashMovementsTotals(ctx, tenantID, sessionID)
		if err != nil {
			return err
		}

		diff, err := session.CloseBlind(cashCounted, cardCounted, pixCounted, cashSales, deposits, bleeds, notes)
		if err != nil {
			return err
		}

		if err := s.repo.CloseCashSession(ctx, tx, session); err != nil {
			return err
		}

		// 2. Se houver diferença de caixa (Sobra ou Quebra), registra lançamento de ajuste no Ledger
		if diff != 0 {
			_ = s.repo.CreateStandardAccountsIfMissing(ctx, tx, tenantID)

			caixaAcc, err1 := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeCaixaPDV)
			if err1 != nil {
				return err1
			}

			desc := fmt.Sprintf("Ajuste de fechamento de caixa PDV %s", session.POSTerminalID)
			t := domain.NewTransaction(tenantID, time.Now(), desc, "cash_session", &session.ID)

			if diff > 0 {
				// Sobra de Caixa: Débito em Caixa PDV (Ativo aumenta) / Crédito em Receita de Sobras (Receita)
				sobraAcc, err2 := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeReceitaSobrasCaixa)
				if err2 != nil {
					return err2
				}
				_ = t.AddEntry(caixaAcc.ID, "debit", diff)
				_ = t.AddEntry(sobraAcc.ID, "credit", diff)
			} else {
				// Quebra de Caixa (Falta): Débito em Despesa de Quebra (Despesa) / Crédito em Caixa PDV (Ativo diminui)
				absDiff := diff.Abs()
				quebraAcc, err2 := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeDespesaQuebraCaixa)
				if err2 != nil {
					return err2
				}
				_ = t.AddEntry(quebraAcc.ID, "debit", absDiff)
				_ = t.AddEntry(caixaAcc.ID, "credit", absDiff)
			}

			if err := s.repo.RecordTransaction(ctx, tx, t); err != nil {
				return err
			}
		}

		// 3. Notificar evento outbox
		closedSession = session
		return outbox.InsertEvent(ctx, tx, tenantID, "finance.cash_session.closed", session.ID, map[string]any{
			"sessionId":           session.ID,
			"complexId":           session.ComplexID,
			"posTerminalId":       session.POSTerminalID,
			"closingCashCounted":  cashCounted,
			"closingCardCounted":  cardCounted,
			"closingPixCounted":   pixCounted,
			"expectedCashBalance": *session.ExpectedCashBalance,
			"differenceAmount":    diff,
		})
	})

	if err != nil {
		return nil, err
	}
	return closedSession, nil
}

// ProcessSaleCompletedEvent gera as partidas dobradas automáticas de uma venda concluída (incluindo CMV)
func (s *Service) ProcessSaleCompletedEvent(
	ctx context.Context,
	tenantID, saleID uuid.UUID,
	subtotalTickets, subtotalConcession, discountAmount, totalAmount money.Cents,
	paymentsMap map[string]money.Cents,
	concessionItems []SaleConcessionItemPayload,
) error {
	_ = s.EnsureStandardAccounts(ctx, tenantID)

	desc := fmt.Sprintf("Venda de bilheteria e concessao #%s", saleID.String()[:8])
	t := domain.NewTransaction(tenantID, time.Now(), desc, "sale", &saleID)

	// 1. Débitos (Entrada de Recursos por Meio de Pagamento)
	var totalDebits money.Cents
	for method, amount := range paymentsMap {
		if amount <= 0 {
			continue
		}
		var accCode string
		switch method {
		case "cash":
			accCode = domain.CodeCaixaPDV
		case "credit_card", "debit_card":
			accCode = domain.CodeAdquirentesCartao
		case "pix":
			accCode = domain.CodeRecebiveisPIX
		default:
			accCode = domain.CodeCaixaPDV
		}

		acc, err := s.repo.GetAccountByCode(ctx, tenantID, accCode)
		if err != nil {
			return fmt.Errorf("conta para metodo %s (%s) nao encontrada: %w", method, accCode, err)
		}
		if err := t.AddEntry(acc.ID, "debit", amount); err != nil {
			return err
		}
		totalDebits += amount
	}

	// 2. Créditos (Receitas Reconhecidas com rateio estrito do total)
	if totalDebits > 0 {
		var ticketPortion, concessionPortion money.Cents
		grossTotal := subtotalTickets + subtotalConcession
		if grossTotal > 0 {
			// Rateio do desconto proporcional entre ingressos e bomboniere, com
			// arredondamento half-up no valor do desconto alocado aos ingressos.
			discountTickets := (discountAmount.Mul(int64(subtotalTickets)) + grossTotal/2) / grossTotal
			ticketPortion = subtotalTickets - discountTickets
			if ticketPortion < 0 {
				ticketPortion = 0
			}
			concessionPortion = totalDebits - ticketPortion
			if concessionPortion < 0 {
				concessionPortion = 0
			}
		}

		if ticketPortion > 0 {
			recIngresso, err := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeReceitaBilheteria)
			if err != nil {
				return fmt.Errorf("conta de receita de bilheteria nao encontrada: %w", err)
			}
			if err := t.AddEntry(recIngresso.ID, "credit", ticketPortion); err != nil {
				return err
			}
		}

		if concessionPortion > 0 {
			recConcession, err := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeReceitaBomboniere)
			if err != nil {
				return fmt.Errorf("conta de receita de bomboniere nao encontrada: %w", err)
			}
			if err := t.AddEntry(recConcession.ID, "credit", concessionPortion); err != nil {
				return err
			}
		}
	}

	// 3. Lançamento de Custo das Mercadorias Vendidas (CMV)
	var totalCMV money.Cents
	for _, it := range concessionItems {
		if it.UnitCost > 0 && it.Quantity > 0 {
			totalCMV += it.UnitCost.MulQuantityToCents(it.Quantity)
		}
	}

	if totalCMV > 0 {
		cmvAcc, err1 := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeCMV)
		estoqueAcc, err2 := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeEstoqueMercadorias)
		if err1 == nil && err2 == nil && cmvAcc != nil && estoqueAcc != nil {
			_ = t.AddEntry(cmvAcc.ID, "debit", totalCMV)
			_ = t.AddEntry(estoqueAcc.ID, "credit", totalCMV)
		}
	}

	if len(t.Entries) >= 2 {
		if err := t.Validate(); err != nil {
			return fmt.Errorf("transacao contabil da venda %s desbalanceada: %w", saleID, err)
		}

		return db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
			return s.repo.RecordTransaction(ctx, tx, t)
		})
	}

	return nil
}

// RecordOnlinePaymentReceipt liquida o recebível (PIX/cartão) em Bancos quando o gateway confirma
// o pagamento via payment_attempt (partidas dobradas idempotentes — retry não duplica o lançamento)
func (s *Service) RecordOnlinePaymentReceipt(
	ctx context.Context,
	tenantID, saleID, paymentAttemptID uuid.UUID,
	amount money.Cents,
	paymentMethod string,
) error {
	if amount <= 0 {
		return nil
	}
	_ = s.EnsureStandardAccounts(ctx, tenantID)

	var receivableCode string
	switch paymentMethod {
	case "pix":
		receivableCode = domain.CodeRecebiveisPIX
	case "credit_card", "debit_card":
		receivableCode = domain.CodeAdquirentesCartao
	default:
		return nil // métodos não online (cash/voucher) não têm recebível a liquidar aqui
	}

	desc := fmt.Sprintf("Recebimento online - venda #%s (tentativa #%s)", saleID.String()[:8], paymentAttemptID.String()[:8])
	t := domain.NewTransaction(tenantID, time.Now(), desc, "payment", &paymentAttemptID)

	bankAcc, err := s.repo.GetAccountByCode(ctx, tenantID, domain.CodeBancosContaMovimento)
	if err != nil {
		return fmt.Errorf("conta de bancos nao encontrada: %w", err)
	}
	receivableAcc, err := s.repo.GetAccountByCode(ctx, tenantID, receivableCode)
	if err != nil {
		return fmt.Errorf("conta de recebiveis (%s) nao encontrada: %w", receivableCode, err)
	}
	if err := t.AddEntry(bankAcc.ID, "debit", amount); err != nil {
		return err
	}
	if err := t.AddEntry(receivableAcc.ID, "credit", amount); err != nil {
		return err
	}
	if err := t.Validate(); err != nil {
		return fmt.Errorf("transacao de recebimento online desbalanceada: %w", err)
	}
	return db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		return s.repo.RecordTransaction(ctx, tx, t)
	})
}
