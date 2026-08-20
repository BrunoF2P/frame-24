package http

import (
	"errors"
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type CreateComplexRequest struct {
	Name                string  `json:"name"`
	CNPJFilial          string  `json:"cnpjFilial"`
	StateRegistration   *string `json:"stateRegistration,omitempty"`
	AncineCode          *string `json:"ancineCode,omitempty"`
	Timezone            string  `json:"timezone,omitempty"`
	AddressStreet       *string `json:"addressStreet,omitempty"`
	AddressNumber       *string `json:"addressNumber,omitempty"`
	AddressNeighborhood *string `json:"addressNeighborhood,omitempty"`
	AddressCity         *string `json:"addressCity,omitempty"`
	AddressState        *string `json:"addressState,omitempty"`
	AddressZipCode      *string `json:"addressZipCode,omitempty"`
}

func (r CreateComplexRequest) Validate() error {
	if strings.TrimSpace(r.Name) == "" {
		return errors.New("nome do complexo e obrigatorio")
	}
	cleanCNPJ := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(r.CNPJFilial), ".", ""), "-", ""), "/", "")
	if len(cleanCNPJ) != 14 {
		return errors.New("CNPJ filial deve conter 14 digitos")
	}
	return nil
}

type CreateRoomRequest struct {
	ComplexID      string  `json:"complexId"`
	Name           string  `json:"name"`
	RoomNumber     int     `json:"roomNumber"`
	AncineRoomCode *string `json:"ancineRoomCode,omitempty"`
	SoundSystem    string  `json:"soundSystem,omitempty"`
	ScreenType     string  `json:"screenType,omitempty"`
	RowCount       int     `json:"rowCount"`
	ColumnCount    int     `json:"columnCount"`
}

func (r CreateRoomRequest) Validate() (uuid.UUID, error) {
	cID, err := uuid.Parse(r.ComplexID)
	if err != nil {
		return uuid.Nil, errors.New("complexId invalido")
	}
	if strings.TrimSpace(r.Name) == "" {
		return uuid.Nil, errors.New("nome da sala e obrigatorio")
	}
	if r.RoomNumber <= 0 {
		return uuid.Nil, errors.New("numero da sala deve ser maior que zero")
	}
	if r.RowCount <= 0 || r.ColumnCount <= 0 {
		return uuid.Nil, errors.New("rowCount e columnCount devem ser maiores que zero")
	}
	return cID, nil
}

type ScheduleShowtimeRequest struct {
	ComplexID            string      `json:"complexId"`
	RoomID               string      `json:"roomId"`
	MovieID              string      `json:"movieId"`
	AudioType            string      `json:"audioType,omitempty"`      // DUB | LEG | ORIG | NAC
	ProjectionType       string      `json:"projectionType,omitempty"` // 2D | 3D | IMAX | 4DX
	StartTime            time.Time   `json:"startTime"`
	MovieDurationMinutes int         `json:"movieDurationMinutes"`
	CleaningMinutes      int         `json:"cleaningMinutes,omitempty"`
	BaseTicketPrice      money.Cents `json:"baseTicketPrice"`
}

func (r ScheduleShowtimeRequest) Validate() (cID, rmID, mvID uuid.UUID, err error) {
	cID, err = uuid.Parse(r.ComplexID)
	if err != nil {
		return uuid.Nil, uuid.Nil, uuid.Nil, errors.New("complexId invalido")
	}
	rmID, err = uuid.Parse(r.RoomID)
	if err != nil {
		return uuid.Nil, uuid.Nil, uuid.Nil, errors.New("roomId invalido")
	}
	mvID, err = uuid.Parse(r.MovieID)
	if err != nil {
		return uuid.Nil, uuid.Nil, uuid.Nil, errors.New("movieId invalido")
	}
	if r.StartTime.IsZero() {
		return uuid.Nil, uuid.Nil, uuid.Nil, errors.New("startTime obrigatorio")
	}
	if r.MovieDurationMinutes <= 0 {
		return uuid.Nil, uuid.Nil, uuid.Nil, errors.New("movieDurationMinutes invalido")
	}
	return cID, rmID, mvID, nil
}
