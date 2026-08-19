package domain

import (
	"math"
	"time"

	"github.com/google/uuid"
)

type SaleItem struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	SaleID     uuid.UUID  `json:"saleId"`
	ItemType   string     `json:"itemType"` // product | combo
	ProductID  *uuid.UUID `json:"productId,omitempty"`
	ComboID    *uuid.UUID `json:"comboId,omitempty"`
	UnitID     uuid.UUID  `json:"unitId"`
	Quantity   float64    `json:"quantity"`
	UnitPrice  float64    `json:"unitPrice"`
	TotalPrice float64    `json:"totalPrice"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type Sale struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenantId"`
	ComplexID          uuid.UUID  `json:"complexId"`
	POSTerminalID      *string    `json:"posTerminalId,omitempty"`
	OperatorID         *uuid.UUID `json:"operatorId,omitempty"`
	CustomerID         *uuid.UUID `json:"customerId,omitempty"`
	Status             string     `json:"status"` // pending | completed | canceled | refunded
	SubtotalTickets    float64    `json:"subtotalTickets"`
	SubtotalConcession float64    `json:"subtotalConcession"`
	DiscountAmount     float64    `json:"discountAmount"`
	TotalAmount        float64    `json:"totalAmount"`
	Notes              *string    `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`

	// Relacionamentos agregados
	Tickets  []Ticket   `json:"tickets,omitempty"`
	Items    []SaleItem `json:"items,omitempty"`
	Payments []Payment  `json:"payments,omitempty"`
}

func NewSale(
	tenantID, complexID uuid.UUID,
	posTerminalID *string,
	operatorID, customerID *uuid.UUID,
	subtotalTickets, subtotalConcession, discountAmount, totalAmount float64,
	notes *string,
) (*Sale, error) {
	now := time.Now()

	// Validação de cálculo: Total == SubtotalTickets + SubtotalConcession - DiscountAmount
	expectedTotal := (subtotalTickets + subtotalConcession) - discountAmount
	if math.Abs(totalAmount-expectedTotal) > 0.01 {
		return nil, ErrInvalidSaleTotal
	}

	return &Sale{
		ID:                 uuid.New(),
		TenantID:           tenantID,
		ComplexID:          complexID,
		POSTerminalID:      posTerminalID,
		OperatorID:         operatorID,
		CustomerID:         customerID,
		Status:             "completed",
		SubtotalTickets:    subtotalTickets,
		SubtotalConcession: subtotalConcession,
		DiscountAmount:     discountAmount,
		TotalAmount:        totalAmount,
		Notes:              notes,
		CreatedAt:          now,
		UpdatedAt:          now,
	}, nil
}

// ValidatePayments verifica se a soma das formas de pagamento cobre com precisão o total da venda
func (s *Sale) ValidatePayments(payments []Payment) error {
	var sum float64
	for _, p := range payments {
		sum += p.Amount
	}
	if math.Abs(sum-s.TotalAmount) > 0.01 {
		return ErrInvalidPaymentAmount
	}
	return nil
}
