package domain

import (
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type SaleItem struct {
	ID         uuid.UUID   `json:"id"`
	TenantID   uuid.UUID   `json:"tenantId"`
	SaleID     uuid.UUID   `json:"saleId"`
	ItemType   string      `json:"itemType"` // product | combo
	ProductID  *uuid.UUID  `json:"productId,omitempty"`
	ComboID    *uuid.UUID  `json:"comboId,omitempty"`
	UnitID     uuid.UUID   `json:"unitId"`
	Quantity   float64     `json:"quantity"`
	UnitPrice  money.Cents `json:"unitPrice"`
	TotalPrice money.Cents `json:"totalPrice"`
	CreatedAt  time.Time   `json:"createdAt"`
}

type Sale struct {
	ID                 uuid.UUID   `json:"id"`
	TenantID           uuid.UUID   `json:"tenantId"`
	ComplexID          uuid.UUID   `json:"complexId"`
	POSTerminalID      *string     `json:"posTerminalId,omitempty"`
	OperatorID         *uuid.UUID  `json:"operatorId,omitempty"`
	CustomerID         *uuid.UUID  `json:"customerId,omitempty"`
	Status             string      `json:"status"` // pending | completed | canceled | refunded
	SubtotalTickets    money.Cents `json:"subtotalTickets"`
	SubtotalConcession money.Cents `json:"subtotalConcession"`
	DiscountAmount     money.Cents `json:"discountAmount"`
	TotalAmount        money.Cents `json:"totalAmount"`
	Notes              *string     `json:"notes,omitempty"`
	CreatedAt          time.Time   `json:"createdAt"`
	UpdatedAt          time.Time   `json:"updatedAt"`

	// Relacionamentos agregados
	Tickets  []Ticket   `json:"tickets,omitempty"`
	Items    []SaleItem `json:"items,omitempty"`
	Payments []Payment  `json:"payments,omitempty"`
}

func NewSale(
	tenantID, complexID uuid.UUID,
	posTerminalID *string,
	operatorID, customerID *uuid.UUID,
	subtotalTickets, subtotalConcession, discountAmount, totalAmount money.Cents,
	notes *string,
) (*Sale, error) {
	now := time.Now()

	// Validação de cálculo exata em centavos: Total == SubtotalTickets + SubtotalConcession - DiscountAmount
	if subtotalTickets+subtotalConcession-discountAmount != totalAmount {
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

// ValidatePayments verifica se a soma das formas de pagamento cobre com precisão (em centavos) o total da venda
func (s *Sale) ValidatePayments(payments []Payment) error {
	var sum money.Cents
	for _, p := range payments {
		sum += p.Amount
	}
	if sum != s.TotalAmount {
		return ErrInvalidPaymentAmount
	}
	return nil
}
