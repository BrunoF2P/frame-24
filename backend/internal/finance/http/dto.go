package http

import "github.com/google/uuid"

type CreateAccountRequest struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	AccountType string `json:"accountType"` // asset | liability | equity | revenue | expense
}

type LedgerEntryDTO struct {
	AccountCode string  `json:"accountCode"`
	EntryType   string  `json:"entryType"` // debit | credit
	Amount      float64 `json:"amount"`
}

type PostTransactionRequest struct {
	Description   string           `json:"description"`
	ReferenceType string           `json:"referenceType"`
	ReferenceID   *uuid.UUID       `json:"referenceId,omitempty"`
	Entries       []LedgerEntryDTO `json:"entries"`
}

type OpenCashSessionRequest struct {
	ComplexID     uuid.UUID `json:"complexId"`
	POSTerminalID string    `json:"posTerminalId"`
	OpeningFloat  float64   `json:"openingFloat"`
}

type CashMovementRequest struct {
	Amount         float64    `json:"amount"`
	Reason         string     `json:"reason"`
	AuthorizedByID *uuid.UUID `json:"authorizedById,omitempty"`
}

type CloseBlindRequest struct {
	CashCounted float64 `json:"cashCounted"`
	CardCounted float64 `json:"cardCounted"`
	PixCounted  float64 `json:"pixCounted"`
	Notes       *string `json:"notes,omitempty"`
}
