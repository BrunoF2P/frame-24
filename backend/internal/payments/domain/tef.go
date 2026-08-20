package domain

import (
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type TefTransactionType string

const (
	TefTypeCredit  TefTransactionType = "credit"
	TefTypeDebit   TefTransactionType = "debit"
	TefTypeVoucher TefTransactionType = "voucher"
)

type TefStatus string

const (
	TefStatusAuthorized TefStatus = "authorized" // Transação autorizada pelo PinPad, aguardando finalização da venda (CNC)
	TefStatusConfirmed  TefStatus = "confirmed"  // Venda finalizada com sucesso, TEF confirmado (CNC)
	TefStatusReversed   TefStatus = "reversed"   // Venda abortada, TEF desfeito no concentrador (NCN)
	TefStatusPending    TefStatus = "pending"
)

type TefTransaction struct {
	ID                uuid.UUID          `json:"id"`
	TenantID          uuid.UUID          `json:"tenantId"`
	SaleID            *uuid.UUID         `json:"saleId,omitempty"`
	POSTerminalID     string             `json:"posTerminalId"`
	NSU               string             `json:"nsu"` // Número Seqüencial Único
	AuthorizationCode string             `json:"authorizationCode"`
	CardBrand         string             `json:"cardBrand"` // Visa, Mastercard, Elo, etc.
	TransactionType   TefTransactionType `json:"transactionType"`
	Installments      int                `json:"installments"`
	Amount            money.Cents        `json:"amount"`
	Status            TefStatus          `json:"status"`
	TerminalMAC       *string            `json:"terminalMac,omitempty"`
	ReceiptMerchant   *string            `json:"receiptMerchant,omitempty"`
	ReceiptCustomer   *string            `json:"receiptCustomer,omitempty"`
	CreatedAt         time.Time          `json:"createdAt"`
	UpdatedAt         time.Time          `json:"updatedAt"`
}

func NewTefTransaction(
	tenantID uuid.UUID,
	saleID *uuid.UUID,
	posTerminalID, nsu, authCode, cardBrand string,
	txType TefTransactionType,
	installments int,
	amount money.Cents,
	receiptMerchant, receiptCustomer *string,
) (*TefTransaction, error) {
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	cleanTerminal := strings.TrimSpace(posTerminalID)
	cleanNSU := strings.TrimSpace(nsu)
	cleanAuth := strings.TrimSpace(authCode)
	if cleanTerminal == "" || cleanNSU == "" || cleanAuth == "" {
		return nil, ErrInvalidAmount
	}
	if installments < 1 {
		installments = 1
	}

	now := time.Now()
	return &TefTransaction{
		ID:                uuid.New(),
		TenantID:          tenantID,
		SaleID:            saleID,
		POSTerminalID:     cleanTerminal,
		NSU:               cleanNSU,
		AuthorizationCode: cleanAuth,
		CardBrand:         strings.TrimSpace(cardBrand),
		TransactionType:   txType,
		Installments:      installments,
		Amount:            amount,
		Status:            TefStatusAuthorized,
		ReceiptMerchant:   receiptMerchant,
		ReceiptCustomer:   receiptCustomer,
		CreatedAt:         now,
		UpdatedAt:         now,
	}, nil
}

// Confirm realiza o commit da transação TEF (CNC)
func (t *TefTransaction) Confirm() error {
	if t.Status == TefStatusConfirmed {
		return nil
	}
	if t.Status == TefStatusReversed {
		return ErrTefAlreadyReversed
	}
	t.Status = TefStatusConfirmed
	t.UpdatedAt = time.Now()
	return nil
}

// Reverse realiza o desfazimento da transação TEF no concentrador (NCN)
func (t *TefTransaction) Reverse() error {
	if t.Status == TefStatusReversed {
		return nil
	}
	if t.Status == TefStatusConfirmed {
		return ErrTefAlreadyConfirmed
	}
	t.Status = TefStatusReversed
	t.UpdatedAt = time.Now()
	return nil
}
