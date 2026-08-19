package http

import (
	"errors"
	"strings"

	"github.com/google/uuid"
)

type LockSeatsRequest struct {
	ShowtimeID string   `json:"showtimeId"`
	SeatIDs    []string `json:"seatIds"`
	SessionID  string   `json:"sessionId"` // Identificador da sessão do cliente no checkout
	TTLSeconds int      `json:"ttlSeconds"` // Opcional (default 300)
}

func (r LockSeatsRequest) Validate() (uuid.UUID, []uuid.UUID, error) {
	stID, err := uuid.Parse(r.ShowtimeID)
	if err != nil {
		return uuid.Nil, nil, errors.New("showtimeId invalido")
	}
	if len(r.SeatIDs) == 0 {
		return uuid.Nil, nil, errors.New("ao menos um seatId deve ser informado")
	}
	if strings.TrimSpace(r.SessionID) == "" {
		return uuid.Nil, nil, errors.New("sessionId obrigatorio para lock de assentos")
	}

	var seatUUIDs []uuid.UUID
	for _, s := range r.SeatIDs {
		u, err := uuid.Parse(s)
		if err != nil {
			return uuid.Nil, nil, errors.New("seatId invalido: " + s)
		}
		seatUUIDs = append(seatUUIDs, u)
	}

	return stID, seatUUIDs, nil
}

type RenewHeartbeatRequest struct {
	ShowtimeID string   `json:"showtimeId"`
	SeatIDs    []string `json:"seatIds"`
	SessionID  string   `json:"sessionId"`
	TTLSeconds int      `json:"ttlSeconds"`
}

func (r RenewHeartbeatRequest) Validate() (uuid.UUID, []uuid.UUID, error) {
	stID, err := uuid.Parse(r.ShowtimeID)
	if err != nil {
		return uuid.Nil, nil, errors.New("showtimeId invalido")
	}
	if len(r.SeatIDs) == 0 {
		return uuid.Nil, nil, errors.New("ao menos um seatId deve ser informado")
	}
	if strings.TrimSpace(r.SessionID) == "" {
		return uuid.Nil, nil, errors.New("sessionId obrigatorio")
	}

	var seatUUIDs []uuid.UUID
	for _, s := range r.SeatIDs {
		u, err := uuid.Parse(s)
		if err != nil {
			return uuid.Nil, nil, errors.New("seatId invalido: " + s)
		}
		seatUUIDs = append(seatUUIDs, u)
	}

	return stID, seatUUIDs, nil
}

type ReleaseSeatsRequest struct {
	ShowtimeID string   `json:"showtimeId"`
	SeatIDs    []string `json:"seatIds"`
	SessionID  string   `json:"sessionId"`
}

func (r ReleaseSeatsRequest) Validate() (uuid.UUID, []uuid.UUID, error) {
	stID, err := uuid.Parse(r.ShowtimeID)
	if err != nil {
		return uuid.Nil, nil, errors.New("showtimeId invalido")
	}
	if len(r.SeatIDs) == 0 {
		return uuid.Nil, nil, errors.New("ao menos um seatId deve ser informado")
	}
	if strings.TrimSpace(r.SessionID) == "" {
		return uuid.Nil, nil, errors.New("sessionId obrigatorio")
	}

	var seatUUIDs []uuid.UUID
	for _, s := range r.SeatIDs {
		u, err := uuid.Parse(s)
		if err != nil {
			return uuid.Nil, nil, errors.New("seatId invalido: " + s)
		}
		seatUUIDs = append(seatUUIDs, u)
	}

	return stID, seatUUIDs, nil
}

type TicketItemRequest struct {
	ShowtimeID     string  `json:"showtimeId"`
	SeatID         string  `json:"seatId"`
	TicketType     string  `json:"ticketType"`
	Price          float64 `json:"price"`
	DocumentNumber *string `json:"documentNumber,omitempty"`
}

type ConcessionItemRequest struct {
	ItemType  string  `json:"itemType"` // product | combo
	ProductID *string `json:"productId,omitempty"`
	ComboID   *string `json:"comboId,omitempty"`
	UnitID    string  `json:"unitId"`
	Quantity  float64 `json:"quantity"`
	UnitPrice float64 `json:"unitPrice"`
}

type PaymentItemRequest struct {
	PaymentMethod     string  `json:"paymentMethod"`
	Amount            float64 `json:"amount"`
	ExternalReference *string `json:"externalReference,omitempty"`
}

type CheckoutSaleRequest struct {
	ComplexID       string                  `json:"complexId"`
	POSTerminalID   *string                 `json:"posTerminalId,omitempty"`
	CustomerID      *string                 `json:"customerId,omitempty"`
	LockSessionID   string                  `json:"lockSessionId"`
	Tickets         []TicketItemRequest     `json:"tickets"`
	ConcessionItems []ConcessionItemRequest `json:"concessionItems"`
	Payments        []PaymentItemRequest    `json:"payments"`
	DiscountAmount  float64                 `json:"discountAmount"`
	Notes           *string                 `json:"notes,omitempty"`
}

func (r CheckoutSaleRequest) Validate() (uuid.UUID, error) {
	cID, err := uuid.Parse(r.ComplexID)
	if err != nil {
		return uuid.Nil, errors.New("complexId invalido")
	}
	if len(r.Tickets) == 0 && len(r.ConcessionItems) == 0 {
		return uuid.Nil, errors.New("a venda deve conter ao menos um ingresso ou item de bomboniere")
	}
	if len(r.Payments) == 0 {
		return uuid.Nil, errors.New("ao menos uma forma de pagamento deve ser informada")
	}
	return cID, nil
}
