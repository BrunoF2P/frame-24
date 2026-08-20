package domain

import (
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type EntryType string

const (
	EntryTypeDebit  EntryType = "debit"
	EntryTypeCredit EntryType = "credit"
)

type LedgerEntry struct {
	ID            uuid.UUID   `json:"id"`
	TenantID      uuid.UUID   `json:"tenantId"`
	TransactionID uuid.UUID   `json:"transactionId"`
	AccountID     uuid.UUID   `json:"accountId"`
	EntryType     EntryType   `json:"entryType"`
	Amount        money.Cents `json:"amount"`
	CreatedAt     time.Time   `json:"createdAt"`
}

type Transaction struct {
	ID              uuid.UUID     `json:"id"`
	TenantID        uuid.UUID     `json:"tenantId"`
	TransactionDate time.Time     `json:"transactionDate"`
	Description     string        `json:"description"`
	ReferenceType   string        `json:"referenceType"` // sale | payment | cash_session | inventory_discard | purchase | manual | split_tax
	ReferenceID     *uuid.UUID    `json:"referenceId,omitempty"`
	CreatedAt       time.Time     `json:"createdAt"`
	Entries         []LedgerEntry `json:"entries"`
}

var validReferenceTypes = map[string]bool{
	"sale":              true,
	"payment":           true,
	"cash_session":      true,
	"inventory_discard": true,
	"purchase":          true,
	"manual":            true,
	"split_tax":         true,
}

func IsValidReferenceType(ref string) bool {
	return validReferenceTypes[strings.ToLower(strings.TrimSpace(ref))]
}

func NewTransaction(
	tenantID uuid.UUID,
	date time.Time,
	description, refType string,
	refID *uuid.UUID,
) *Transaction {
	cleanDesc := strings.TrimSpace(description)
	cleanRef := strings.ToLower(strings.TrimSpace(refType))
	if !IsValidReferenceType(cleanRef) {
		cleanRef = "manual"
	}
	if date.IsZero() {
		date = time.Now()
	}

	return &Transaction{
		ID:              uuid.New(),
		TenantID:        tenantID,
		TransactionDate: date,
		Description:     cleanDesc,
		ReferenceType:   cleanRef,
		ReferenceID:     refID,
		CreatedAt:       time.Now(),
		Entries:         make([]LedgerEntry, 0),
	}
}

// AddEntry adiciona uma perna (débito ou crédito) à transação contábil
func (t *Transaction) AddEntry(accountID uuid.UUID, entryType string, amount money.Cents) error {
	cleanType := strings.ToLower(strings.TrimSpace(entryType))
	if cleanType != string(EntryTypeDebit) && cleanType != string(EntryTypeCredit) {
		return ErrInvalidAccountType
	}
	if amount <= 0 {
		return ErrInvalidAmount
	}

	t.Entries = append(t.Entries, LedgerEntry{
		ID:            uuid.New(),
		TenantID:      t.TenantID,
		TransactionID: t.ID,
		AccountID:     accountID,
		EntryType:     EntryType(cleanType),
		Amount:        amount,
		CreatedAt:     time.Now(),
	})
	return nil
}

// Validate verifica se a transação atende ao princípio fundamental das partidas dobradas
func (t *Transaction) Validate() error {
	if len(t.Entries) < 2 {
		return ErrEmptyTransaction
	}

	var sumDebit, sumCredit money.Cents
	for _, entry := range t.Entries {
		switch entry.EntryType {
		case EntryTypeDebit:
			sumDebit += entry.Amount
		case EntryTypeCredit:
			sumCredit += entry.Amount
		}
	}

	if sumDebit != sumCredit {
		return ErrUnbalancedTransaction
	}

	return nil
}
