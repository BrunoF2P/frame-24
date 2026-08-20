package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type TicketType string

const (
	TicketTypeInteira             TicketType = "inteira"
	TicketTypeMeiaEstudante       TicketType = "meia_estudante"
	TicketTypeMeiaIdoso           TicketType = "meia_idoso"
	TicketTypeMeiaPCD             TicketType = "meia_pcd"
	TicketTypeMeiaJovemBaixaRenda TicketType = "meia_jovem_baixa_renda"
	TicketTypeCortesia            TicketType = "cortesia"
)

func IsValidTicketType(t string) bool {
	switch TicketType(strings.ToLower(strings.TrimSpace(t))) {
	case TicketTypeInteira, TicketTypeMeiaEstudante, TicketTypeMeiaIdoso,
		TicketTypeMeiaPCD, TicketTypeMeiaJovemBaixaRenda, TicketTypeCortesia:
		return true
	default:
		return false
	}
}

func IsHalfPriceTicket(t string) bool {
	switch TicketType(strings.ToLower(strings.TrimSpace(t))) {
	case TicketTypeMeiaEstudante, TicketTypeMeiaIdoso, TicketTypeMeiaPCD, TicketTypeMeiaJovemBaixaRenda:
		return true
	default:
		return false
	}
}

// CalculateHalfPriceQuota calcula o número máximo permitido de meias-entradas (40% da capacidade da sala)
func CalculateHalfPriceQuota(roomCapacity int) int {
	if roomCapacity <= 0 {
		return 0
	}
	return int(math.Floor(float64(roomCapacity) * 0.40))
}

type Ticket struct {
	ID             uuid.UUID   `json:"id"`
	TenantID       uuid.UUID   `json:"tenantId"`
	SaleID         uuid.UUID   `json:"saleId"`
	ShowtimeID     uuid.UUID   `json:"showtimeId"`
	SeatID         uuid.UUID   `json:"seatId"`
	TicketType     string      `json:"ticketType"`
	Price          money.Cents `json:"price"`
	DocumentNumber *string     `json:"documentNumber,omitempty"`
	QRCodeHash     string      `json:"qrCodeHash"`
	Status         string      `json:"status"` // active | used | canceled
	UsedAt         *time.Time  `json:"usedAt,omitempty"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
}

func NewTicket(tenantID, saleID, showtimeID, seatID uuid.UUID, ticketType string, price money.Cents, docNumber *string) (*Ticket, error) {
	cleanType := strings.ToLower(strings.TrimSpace(ticketType))
	if !IsValidTicketType(cleanType) {
		return nil, ErrInvalidTicketType
	}
	if price < 0 {
		return nil, fmt.Errorf("preco do ingresso invalido")
	}

	id := uuid.New()
	qrHash := GenerateTicketQRHash(id, tenantID, showtimeID, seatID)
	now := time.Now()

	return &Ticket{
		ID:             id,
		TenantID:       tenantID,
		SaleID:         saleID,
		ShowtimeID:     showtimeID,
		SeatID:         seatID,
		TicketType:     cleanType,
		Price:          price,
		DocumentNumber: docNumber,
		QRCodeHash:     qrHash,
		Status:         "active",
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

// GenerateTicketQRHash cria um hash criptográfico SHA-256 único e seguro para o QR Code do ingresso
func GenerateTicketQRHash(ticketID, tenantID, showtimeID, seatID uuid.UUID) string {
	payload := fmt.Sprintf("FRAME24:TICKET:%s:%s:%s:%s:%d", tenantID, showtimeID, seatID, ticketID, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(hash[:])
}
