package http

import (
	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type CreatePixRequest struct {
	SaleID         uuid.UUID   `json:"saleId"`
	IdempotencyKey string      `json:"idempotencyKey"`
	Amount         money.Cents `json:"amount"`
	Description    string      `json:"description"`
}

type WebhookRequest struct {
	TenantID       *uuid.UUID   `json:"tenantId,omitempty"`
	IdempotencyKey string       `json:"idempotencyKey"`
	ExternalRef    string       `json:"externalRef"`
	Status         string       `json:"status"`
	Amount         *money.Cents `json:"amount,omitempty"`
	ErrorMessage   *string      `json:"errorMessage,omitempty"`
}

type InitiateTefRequest struct {
	SaleID            *uuid.UUID  `json:"saleId,omitempty"`
	POSTerminalID     string      `json:"posTerminalId"`
	NSU               string      `json:"nsu"`
	AuthorizationCode string      `json:"authorizationCode"`
	CardBrand         string      `json:"cardBrand"`
	TransactionType   string      `json:"transactionType"` // credit, debit, voucher
	Installments      int         `json:"installments"`
	Amount            money.Cents `json:"amount"`
	ReceiptMerchant   *string     `json:"receiptMerchant,omitempty"`
	ReceiptCustomer   *string     `json:"receiptCustomer,omitempty"`
}

type TefActionRequest struct {
	POSTerminalID string `json:"posTerminalId"`
	NSU           string `json:"nsu"`
	Reason        string `json:"reason,omitempty"`
}
