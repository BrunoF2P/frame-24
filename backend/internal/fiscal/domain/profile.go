package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type TaxRegime string

const (
	TaxRegimeSimplesNacional TaxRegime = "simples_nacional"
	TaxRegimeLucroPresumido  TaxRegime = "lucro_presumido"
	TaxRegimeLucroReal       TaxRegime = "lucro_real"
)

type FiscalEnvironment string

const (
	FiscalEnvHomologation FiscalEnvironment = "homologation"
	FiscalEnvProduction   FiscalEnvironment = "production"
)

type FiscalProfile struct {
	ID                           uuid.UUID         `json:"id"`
	TenantID                     uuid.UUID         `json:"tenantId"`
	ComplexID                    uuid.UUID         `json:"complexId"`
	CertificateA1VaultID         *string           `json:"certificateA1VaultId,omitempty"`
	CertificatePasswordEncrypted *string           `json:"certificatePasswordEncrypted,omitempty"`
	CertificateValidUntil        *time.Time        `json:"certificateValidUntil,omitempty"`
	Environment                  FiscalEnvironment `json:"environment"`
	TaxRegime                    TaxRegime         `json:"taxRegime"`
	NFCeSeries                   int               `json:"nfceSeries"`
	NFCeLastNumber               int64             `json:"nfceLastNumber"`
	NFCeCSCID                    string            `json:"nfceCscId"`
	NFCeCSCToken                 *string           `json:"nfceCscToken,omitempty"`
	NFSeSeries                   string            `json:"nfseSeries"`
	NFSeLastNumber               int64             `json:"nfseLastNumber"`
	NFSeMunicipalRegistration    *string           `json:"nfseMunicipalRegistration,omitempty"`
	NFeDevolutionSeries          int               `json:"nfeDevolutionSeries"`
	NFeDevolutionLastNumber      int64             `json:"nfeDevolutionLastNumber"`
	CNAE                         string            `json:"cnae"`
	AliquotaISS                  float64           `json:"aliquotaIss"`
	CreatedAt                    time.Time         `json:"createdAt"`
	UpdatedAt                    time.Time         `json:"updatedAt"`
}

func NewFiscalProfile(
	tenantID, complexID uuid.UUID,
	environment FiscalEnvironment,
	regime TaxRegime,
	nfceSeries int,
	cscID string,
	cscToken *string,
	nfseSeries string,
	cnae string,
	issRate float64,
) (*FiscalProfile, error) {
	switch regime {
	case TaxRegimeSimplesNacional, TaxRegimeLucroPresumido, TaxRegimeLucroReal:
	default:
		return nil, ErrInvalidTaxRegime
	}

	if nfceSeries <= 0 {
		nfceSeries = 1
	}
	cleanCscID := strings.TrimSpace(cscID)
	if cleanCscID == "" {
		cleanCscID = "000001"
	}
	cleanCnae := strings.TrimSpace(cnae)
	if cleanCnae == "" {
		cleanCnae = "5914-6/00" // Cinema
	}
	if issRate < 0 {
		issRate = 5.00
	}

	now := time.Now()
	return &FiscalProfile{
		ID:                     uuid.New(),
		TenantID:               tenantID,
		ComplexID:              complexID,
		Environment:            environment,
		TaxRegime:              regime,
		NFCeSeries:             nfceSeries,
		NFCeLastNumber:         0,
		NFCeCSCID:              cleanCscID,
		NFCeCSCToken:           cscToken,
		NFSeSeries:             strings.TrimSpace(nfseSeries),
		NFSeLastNumber:         0,
		NFeDevolutionSeries:    1,
		NFeDevolutionLastNumber: 0,
		CNAE:                   cleanCnae,
		AliquotaISS:            issRate,
		CreatedAt:              now,
		UpdatedAt:              now,
	}, nil
}

func (p *FiscalProfile) NextNFCeNumber() int64 {
	p.NFCeLastNumber++
	p.UpdatedAt = time.Now()
	return p.NFCeLastNumber
}

func (p *FiscalProfile) NextNFSeNumber() int64 {
	p.NFSeLastNumber++
	p.UpdatedAt = time.Now()
	return p.NFSeLastNumber
}

func (p *FiscalProfile) NextNFeDevolutionNumber() int64 {
	p.NFeDevolutionLastNumber++
	p.UpdatedAt = time.Now()
	return p.NFeDevolutionLastNumber
}

