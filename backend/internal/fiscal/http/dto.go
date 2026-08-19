package http

import "github.com/google/uuid"

type ConfigureProfileRequest struct {
	ComplexID   uuid.UUID `json:"complexId"`
	Environment string    `json:"environment"` // homologation, production
	TaxRegime   string    `json:"taxRegime"`   // simples_nacional, lucro_presumido, lucro_real
	NFCeSeries  int       `json:"nfceSeries"`
	NFCeCSCID   string    `json:"nfceCscId"`
	NFCeCSCToken *string  `json:"nfceCscToken,omitempty"`
	NFSeSeries  string    `json:"nfseSeries"`
	CNAE        string    `json:"cnae"`
	AliquotaISS float64   `json:"aliquotaIss"`
}

type CancelSaleFiscalRequest struct {
	ComplexID uuid.UUID `json:"complexId"`
	Reason    string    `json:"reason"`
}
