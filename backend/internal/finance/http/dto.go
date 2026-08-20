package http

import (
	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type CreateAccountRequest struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	AccountType string `json:"accountType"` // asset | liability | equity | revenue | expense
}

type LedgerEntryDTO struct {
	AccountCode string      `json:"accountCode"`
	EntryType   string      `json:"entryType"` // debit | credit
	Amount      money.Cents `json:"amount"`
}

type PostTransactionRequest struct {
	Description   string           `json:"description"`
	ReferenceType string           `json:"referenceType"`
	ReferenceID   *uuid.UUID       `json:"referenceId,omitempty"`
	Entries       []LedgerEntryDTO `json:"entries"`
}

type OpenCashSessionRequest struct {
	ComplexID     uuid.UUID   `json:"complexId"`
	POSTerminalID string      `json:"posTerminalId"`
	OpeningFloat  money.Cents `json:"openingFloat"`
}

type CashMovementRequest struct {
	Amount         money.Cents `json:"amount"`
	Reason         string      `json:"reason"`
	AuthorizedByID *uuid.UUID  `json:"authorizedById,omitempty"`
}

type CloseBlindRequest struct {
	CashCounted money.Cents `json:"cashCounted"`
	CardCounted money.Cents `json:"cardCounted"`
	PixCounted  money.Cents `json:"pixCounted"`
	Notes       *string     `json:"notes,omitempty"`
}
