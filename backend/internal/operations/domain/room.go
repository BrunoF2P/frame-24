package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Room struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenantId"`
	ComplexID      uuid.UUID `json:"complexId"`
	Name           string    `json:"name"`
	RoomNumber     int       `json:"roomNumber"`
	AncineRoomCode *string   `json:"ancineRoomCode,omitempty"`
	Capacity       int       `json:"capacity"`
	SoundSystem    string    `json:"soundSystem"`
	ScreenType     string    `json:"screenType"`
	RowCount       int       `json:"rowCount"`
	ColumnCount    int       `json:"columnCount"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

func NewRoom(tenantID, complexID uuid.UUID, name string, roomNumber int, soundSystem, screenType string, rowCount, columnCount int) (*Room, error) {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return nil, ErrRoomNotFound
	}
	if roomNumber <= 0 {
		return nil, fmt.Errorf("numero da sala deve ser maior que zero")
	}
	if rowCount <= 0 || columnCount <= 0 {
		return nil, fmt.Errorf("dimensoes da sala invalidas (linhas e colunas devem ser > 0)")
	}

	now := time.Now()
	return &Room{
		ID:          uuid.New(),
		TenantID:    tenantID,
		ComplexID:   complexID,
		Name:        cleanName,
		RoomNumber:  roomNumber,
		Capacity:    rowCount * columnCount,
		SoundSystem: soundSystem,
		ScreenType:  screenType,
		RowCount:    rowCount,
		ColumnCount: columnCount,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

type Seat struct {
	ID           uuid.UUID `json:"id"`
	TenantID     uuid.UUID `json:"tenantId"`
	RoomID       uuid.UUID `json:"roomId"`
	RowCode      string    `json:"rowCode"`
	ColumnNumber int       `json:"columnNumber"`
	SeatType     string    `json:"seatType"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func NewSeat(tenantID, roomID uuid.UUID, rowCode string, columnNumber int, seatType string) (*Seat, error) {
	cleanRow := strings.ToUpper(strings.TrimSpace(rowCode))
	if cleanRow == "" {
		return nil, fmt.Errorf("codigo da fileira obrigatorio")
	}
	if columnNumber <= 0 {
		return nil, fmt.Errorf("numero da coluna invalido")
	}
	if seatType == "" {
		seatType = "standard"
	}

	now := time.Now()
	return &Seat{
		ID:           uuid.New(),
		TenantID:     tenantID,
		RoomID:       roomID,
		RowCode:      cleanRow,
		ColumnNumber: columnNumber,
		SeatType:     seatType,
		Status:       "active",
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}
