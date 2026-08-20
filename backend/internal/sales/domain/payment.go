package domain

import (
	"fmt"
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type PaymentMethod string

const (
	PaymentMethodCash       PaymentMethod = "cash"
	PaymentMethodCreditCard PaymentMethod = "credit_card"
	PaymentMethodDebitCard  PaymentMethod = "debit_card"
	PaymentMethodPIX        PaymentMethod = "pix"
	PaymentMethodVoucher    PaymentMethod = "voucher"
)

func IsValidPaymentMethod(m string) bool {
	switch PaymentMethod(strings.ToLower(strings.TrimSpace(m))) {
	case PaymentMethodCash, PaymentMethodCreditCard, PaymentMethodDebitCard, PaymentMethodPIX, PaymentMethodVoucher:
		return true
	default:
		return false
	}
}

type Payment struct {
	ID                uuid.UUID   `json:"id"`
	TenantID          uuid.UUID   `json:"tenantId"`
	SaleID            uuid.UUID   `json:"saleId"`
	PaymentMethod     string      `json:"paymentMethod"`
	Amount            money.Cents `json:"amount"`
	Status            string      `json:"status"` // completed | refunded
	ExternalReference *string     `json:"externalReference,omitempty"`
	CreatedAt         time.Time   `json:"createdAt"`
}

func NewPayment(tenantID, saleID uuid.UUID, method string, amount money.Cents, extRef *string) (*Payment, error) {
	cleanMethod := strings.ToLower(strings.TrimSpace(method))
	if !IsValidPaymentMethod(cleanMethod) {
		return nil, ErrInvalidPaymentMethod
	}
	if amount <= 0 {
		return nil, fmt.Errorf("valor do pagamento deve ser maior que zero")
	}

	return &Payment{
		ID:                uuid.New(),
		TenantID:          tenantID,
		SaleID:            saleID,
		PaymentMethod:     cleanMethod,
		Amount:            amount,
		Status:            "completed",
		ExternalReference: extRef,
		CreatedAt:         time.Now(),
	}, nil
}
