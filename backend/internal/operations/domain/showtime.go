package domain

import (
	"fmt"
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type Showtime struct {
	ID              uuid.UUID   `json:"id"`
	TenantID        uuid.UUID   `json:"tenantId"`
	ComplexID       uuid.UUID   `json:"complexId"`
	RoomID          uuid.UUID   `json:"roomId"`
	MovieID         uuid.UUID   `json:"movieId"`
	AudioType       string      `json:"audioType"`      // DUB | LEG | ORIG | NAC
	ProjectionType  string      `json:"projectionType"` // 2D | 3D | IMAX | 4DX
	StartTime       time.Time   `json:"startTime"`
	EndTime         time.Time   `json:"endTime"`
	CleaningMinutes int         `json:"cleaningMinutes"`
	BaseTicketPrice money.Cents `json:"baseTicketPrice"`
	Status          string      `json:"status"` // scheduled | open_for_sale | in_progress | finished | canceled
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
}

// NewShowtime calcula o horário final com base na duração do filme + margem de limpeza
func NewShowtime(
	tenantID, complexID, roomID, movieID uuid.UUID,
	audioType, projectionType string,
	startTime time.Time,
	movieDurationMinutes int,
	cleaningMinutes int,
	baseTicketPrice money.Cents,
) (*Showtime, error) {
	if startTime.IsZero() {
		return nil, ErrInvalidShowtimeRange
	}
	if movieDurationMinutes <= 0 {
		return nil, ErrInvalidShowtimeRange
	}
	if cleaningMinutes < 0 {
		cleaningMinutes = 15
	}
	cleanAudio := strings.ToUpper(strings.TrimSpace(audioType))
	switch cleanAudio {
	case "DUB", "LEG", "ORIG", "NAC":
		// AudioType válido
	case "":
		cleanAudio = "DUB"
	default:
		return nil, fmt.Errorf("tipo de audio (audioType) invalido: use DUB, LEG, ORIG ou NAC")
	}

	cleanProj := strings.ToUpper(strings.TrimSpace(projectionType))
	switch cleanProj {
	case "2D", "3D", "IMAX", "4DX":
		// ProjectionType válido
	case "":
		cleanProj = "2D"
	default:
		return nil, fmt.Errorf("tipo de projecao (projectionType) invalido: use 2D, 3D, IMAX ou 4DX")
	}

	endTime := startTime.Add(time.Duration(movieDurationMinutes) * time.Minute)
	now := time.Now()

	return &Showtime{
		ID:              uuid.New(),
		TenantID:        tenantID,
		ComplexID:       complexID,
		RoomID:          roomID,
		MovieID:         movieID,
		AudioType:       cleanAudio,
		ProjectionType:  cleanProj,
		StartTime:       startTime,
		EndTime:         endTime,
		CleaningMinutes: cleaningMinutes,
		BaseTicketPrice: baseTicketPrice,
		Status:          "scheduled",
		CreatedAt:       now,
		UpdatedAt:       now,
	}, nil
}
