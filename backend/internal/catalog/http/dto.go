package http

import (
	"errors"
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type CreateMovieRequest struct {
	Title           string     `json:"title"`
	OriginalTitle   *string    `json:"originalTitle,omitempty"`
	DurationMinutes int        `json:"durationMinutes"`
	Rating          string     `json:"rating,omitempty"` // L | 10 | 12 | 14 | 16 | 18
	Synopsis        *string    `json:"synopsis,omitempty"`
	PosterURL       *string    `json:"posterUrl,omitempty"`
	BackdropURL     *string    `json:"backdropUrl,omitempty"`
	TrailerURL      *string    `json:"trailerUrl,omitempty"`
	Distributor     *string    `json:"distributor,omitempty"`
	AncineCPBCRT    *string    `json:"ancineCpbCrt,omitempty"`
	ReleaseDate     *time.Time `json:"releaseDate,omitempty"`
}

func (r CreateMovieRequest) Validate() error {
	if strings.TrimSpace(r.Title) == "" {
		return errors.New("titulo do filme e obrigatorio")
	}
	if r.DurationMinutes <= 0 {
		return errors.New("duracao do filme deve ser maior que zero")
	}
	return nil
}

type CreateUnitRequest struct {
	Name             string  `json:"name"`
	Acronym          string  `json:"acronym"`
	IsBaseUnit       bool    `json:"isBaseUnit"`
	BaseUnitID       *string `json:"baseUnitId,omitempty"`
	ConversionFactor float64 `json:"conversionFactor"`
}

func (r CreateUnitRequest) Validate() (*uuid.UUID, error) {
	if strings.TrimSpace(r.Name) == "" || strings.TrimSpace(r.Acronym) == "" {
		return nil, errors.New("nome e sigla da unidade sao obrigatorios")
	}
	var baseUUID *uuid.UUID
	if r.BaseUnitID != nil && *r.BaseUnitID != "" {
		id, err := uuid.Parse(*r.BaseUnitID)
		if err != nil {
			return nil, errors.New("baseUnitId invalido")
		}
		baseUUID = &id
	}
	return baseUUID, nil
}

type CreateProductRequest struct {
	Name        string        `json:"name"`
	Description *string       `json:"description,omitempty"`
	Category    string        `json:"category,omitempty"` // popcorn | beverage | candy | combo | merch | service
	BaseUnitID  string        `json:"baseUnitId"`
	NCM         *string       `json:"ncm,omitempty"`
	CEST        *string       `json:"cest,omitempty"`
	CostPrice   money.Subcent `json:"costPrice"`
	SalePrice   money.Cents   `json:"salePrice"`
}

func (r CreateProductRequest) Validate() (uuid.UUID, error) {
	if strings.TrimSpace(r.Name) == "" {
		return uuid.Nil, errors.New("nome do produto e obrigatorio")
	}
	uID, err := uuid.Parse(r.BaseUnitID)
	if err != nil {
		return uuid.Nil, errors.New("baseUnitId invalido")
	}
	return uID, nil
}

type AddBarcodeRequest struct {
	ProductID string `json:"productId"`
	UnitID    string `json:"unitId"`
	Barcode   string `json:"barcode"`
	IsPrimary bool   `json:"isPrimary"`
}

func (r AddBarcodeRequest) Validate() (pID, uID uuid.UUID, err error) {
	pID, err = uuid.Parse(r.ProductID)
	if err != nil {
		return uuid.Nil, uuid.Nil, errors.New("productId invalido")
	}
	uID, err = uuid.Parse(r.UnitID)
	if err != nil {
		return uuid.Nil, uuid.Nil, errors.New("unitId invalido")
	}
	if strings.TrimSpace(r.Barcode) == "" {
		return uuid.Nil, uuid.Nil, errors.New("codigo de barras obrigatorio")
	}
	return pID, uID, nil
}

type CreateComboRequest struct {
	Name       string            `json:"name"`
	BaseUnitID string            `json:"baseUnitId"`
	ComboPrice money.Cents       `json:"comboPrice"`
	Items      []ComboItemDetail `json:"items"`
}

func (r CreateComboRequest) Validate() (uuid.UUID, error) {
	if strings.TrimSpace(r.Name) == "" {
		return uuid.Nil, errors.New("nome do combo obrigatorio")
	}
	uID, err := uuid.Parse(r.BaseUnitID)
	if err != nil {
		return uuid.Nil, errors.New("baseUnitId invalido")
	}
	if r.ComboPrice < 0 {
		return uuid.Nil, errors.New("preco do combo invalido")
	}
	return uID, nil
}

type ComboItemDetail struct {
	GroupName       string      `json:"groupName"`
	ProductID       string      `json:"productId"`
	UnitID          string      `json:"unitId"`
	Quantity        float64     `json:"quantity"`
	AdditionalPrice money.Cents `json:"additionalPrice"`
}
