package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type CashMovementType string

const (
	CashMovementOpeningFloat          CashMovementType = "opening_float"
	CashMovementBleedWithdrawal       CashMovementType = "bleed_withdrawal"       // Sangria
	CashMovementDepositReinforcement  CashMovementType = "deposit_reinforcement"  // Suprimento
	CashMovementCashSale              CashMovementType = "cash_sale"              // Venda em espécie
)

func IsValidCashMovementType(m string) bool {
	switch CashMovementType(strings.ToLower(strings.TrimSpace(m))) {
	case CashMovementOpeningFloat, CashMovementBleedWithdrawal,
		CashMovementDepositReinforcement, CashMovementCashSale:
		return true
	default:
		return false
	}
}

type CashMovement struct {
	ID             uuid.UUID        `json:"id"`
	TenantID       uuid.UUID        `json:"tenantId"`
	SessionID      uuid.UUID        `json:"sessionId"`
	MovementType   CashMovementType `json:"movementType"`
	Amount         float64          `json:"amount"`
	Reason         *string          `json:"reason,omitempty"`
	AuthorizedByID *uuid.UUID       `json:"authorizedById,omitempty"`
	// Campos de referência para idempotência (retry do Outbox dispatcher)
	ReferenceType *string    `json:"referenceType,omitempty"`
	ReferenceID   *uuid.UUID `json:"referenceId,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type CashSession struct {
	ID                  uuid.UUID  `json:"id"`
	TenantID            uuid.UUID  `json:"tenantId"`
	ComplexID           uuid.UUID  `json:"complexId"`
	POSTerminalID       string     `json:"posTerminalId"`
	OperatorID          uuid.UUID  `json:"operatorId"`
	Status              string     `json:"status"` // open | closed
	OpenedAt            time.Time  `json:"openedAt"`
	ClosedAt            *time.Time `json:"closedAt,omitempty"`
	OpeningBalance      float64    `json:"openingBalance"`
	ClosingCashCounted  *float64   `json:"closingCashCounted,omitempty"`
	ClosingCardCounted  *float64   `json:"closingCardCounted,omitempty"`
	ClosingPixCounted   *float64   `json:"closingPixCounted,omitempty"`
	ExpectedCashBalance *float64   `json:"expectedCashBalance,omitempty"`
	DifferenceAmount    *float64   `json:"differenceAmount,omitempty"` // Positivo: Sobra / Negativo: Quebra
	Notes               *string    `json:"notes,omitempty"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

func NewCashSession(
	tenantID, complexID uuid.UUID,
	posTerminalID string,
	operatorID uuid.UUID,
	openingFloat float64,
) (*CashSession, error) {
	cleanTerminal := strings.TrimSpace(posTerminalID)
	if cleanTerminal == "" {
		return nil, ErrInvalidAmount
	}
	if openingFloat < 0 {
		return nil, ErrInvalidAmount
	}

	now := time.Now()
	return &CashSession{
		ID:             uuid.New(),
		TenantID:       tenantID,
		ComplexID:      complexID,
		POSTerminalID:  cleanTerminal,
		OperatorID:     operatorID,
		Status:         "open",
		OpenedAt:       now,
		OpeningBalance: openingFloat,
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

// CloseBlind executa o cálculo de auditoria do Fechamento Cego de Caixa
func (s *CashSession) CloseBlind(
	cashCounted, cardCounted, pixCounted float64,
	totalCashSales, totalDeposits, totalBleeds float64,
	notes *string,
) (float64, error) {
	if s.Status == "closed" {
		return 0, ErrCashSessionClosed
	}

	expectedCash := (s.OpeningBalance + totalDeposits + totalCashSales) - totalBleeds
	if expectedCash < 0 {
		expectedCash = 0
	}

	diff := cashCounted - expectedCash
	now := time.Now()

	s.Status = "closed"
	s.ClosedAt = &now
	s.ClosingCashCounted = &cashCounted
	s.ClosingCardCounted = &cardCounted
	s.ClosingPixCounted = &pixCounted
	s.ExpectedCashBalance = &expectedCash
	s.DifferenceAmount = &diff
	s.Notes = notes
	s.UpdatedAt = now

	return diff, nil
}
