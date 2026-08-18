package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Movie struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenantId"`
	Title           string     `json:"title"`
	OriginalTitle   *string    `json:"originalTitle,omitempty"`
	DurationMinutes int        `json:"durationMinutes"`
	Rating          string     `json:"rating"` // L | 10 | 12 | 14 | 16 | 18
	Synopsis        *string    `json:"synopsis,omitempty"`
	PosterURL       *string    `json:"posterUrl,omitempty"`
	BackdropURL     *string    `json:"backdropUrl,omitempty"`
	TrailerURL      *string    `json:"trailerUrl,omitempty"`
	Distributor     *string    `json:"distributor,omitempty"`
	AncineCPBCRT    *string    `json:"ancineCpbCrt,omitempty"`
	ReleaseDate     *time.Time `json:"releaseDate,omitempty"`
	IsActive        bool       `json:"isActive"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func NewMovie(tenantID uuid.UUID, title string, durationMinutes int, rating string) (*Movie, error) {
	cleanTitle := strings.TrimSpace(title)
	if cleanTitle == "" {
		return nil, fmt.Errorf("titulo do filme obrigatorio")
	}
	if durationMinutes <= 0 {
		return nil, fmt.Errorf("duracao do filme deve ser maior que zero")
	}
	cleanRating := strings.ToUpper(strings.TrimSpace(rating))
	switch cleanRating {
	case "L", "10", "12", "14", "16", "18":
		// Rating válido
	case "":
		cleanRating = "L"
	default:
		return nil, fmt.Errorf("classificacao indicativa (rating) invalida: use L, 10, 12, 14, 16 ou 18")
	}

	now := time.Now()
	return &Movie{
		ID:              uuid.New(),
		TenantID:        tenantID,
		Title:           cleanTitle,
		DurationMinutes: durationMinutes,
		Rating:          cleanRating,
		IsActive:        true,
		CreatedAt:       now,
		UpdatedAt:       now,
	}, nil
}
