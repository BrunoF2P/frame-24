package domain

import (
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type PaymentMethod string

const (
	PaymentMethodPix        PaymentMethod = "pix"
	PaymentMethodCreditCard PaymentMethod = "credit_card"
	PaymentMethodDebitCard  PaymentMethod = "debit_card"
	PaymentMethodCash       PaymentMethod = "cash"
	PaymentMethodVoucher    PaymentMethod = "voucher"
)

type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusApproved  PaymentStatus = "approved"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
	PaymentStatusCancelled PaymentStatus = "cancelled"
)

type PaymentAttempt struct {
	ID                uuid.UUID     `json:"id"`
	TenantID          uuid.UUID     `json:"tenantId"`
	SaleID            uuid.UUID     `json:"saleId"`
	IdempotencyKey    string        `json:"idempotencyKey"`
	PaymentMethod     PaymentMethod `json:"paymentMethod"`
	Provider          string        `json:"provider"`
	Amount            money.Cents   `json:"amount"`
	Status            PaymentStatus `json:"status"`
	ExternalReference *string       `json:"externalReference,omitempty"`
	QRCodePix         *string       `json:"qrCodePix,omitempty"`
	QRCodeURL         *string       `json:"qrCodeUrl,omitempty"`
	ErrorMessage      *string       `json:"errorMessage,omitempty"`
	CreatedAt         time.Time     `json:"createdAt"`
	UpdatedAt         time.Time     `json:"updatedAt"`
}

func NewPaymentAttempt(
	tenantID, saleID uuid.UUID,
	idempotencyKey string,
	method PaymentMethod,
	provider string,
	amount money.Cents,
) (*PaymentAttempt, error) {
	cleanKey := strings.TrimSpace(idempotencyKey)
	if cleanKey == "" {
		return nil, ErrDuplicateIdempotencyKey
	}
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}

	switch method {
	case PaymentMethodPix, PaymentMethodCreditCard, PaymentMethodDebitCard, PaymentMethodCash, PaymentMethodVoucher:
	default:
		return nil, ErrInvalidPaymentMethod
	}

	now := time.Now()
	return &PaymentAttempt{
		ID:             uuid.New(),
		TenantID:       tenantID,
		SaleID:         saleID,
		IdempotencyKey: cleanKey,
		PaymentMethod:  method,
		Provider:       strings.TrimSpace(provider),
		Amount:         amount,
		Status:         PaymentStatusPending,
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

func (p *PaymentAttempt) Approve(extRef string) error {
	if p.Status == PaymentStatusApproved {
		return nil
	}
	if p.Status == PaymentStatusCancelled || p.Status == PaymentStatusRefunded {
		return ErrPaymentAlreadyFinalized
	}
	p.Status = PaymentStatusApproved
	p.ExternalReference = &extRef
	p.UpdatedAt = time.Now()
	return nil
}

func (p *PaymentAttempt) Fail(reason string) error {
	if p.Status == PaymentStatusApproved {
		return ErrPaymentAlreadyFinalized
	}
	p.Status = PaymentStatusFailed
	p.ErrorMessage = &reason
	p.UpdatedAt = time.Now()
	return nil
}
