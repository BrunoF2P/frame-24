package domain

import (
	"math"
	"time"
)

type TaxCalculationResult struct {
	ICMSAmount   float64
	ISSAmount    float64
	PISAmount    float64
	COFINSAmount float64
	CBSRate      float64
	CBSAmount    float64
	IBSRate      float64
	IBSAmount    float64
	CFOP         string
	CSTICMS      string
	CSTPISCOFINS string
	CSTCBSIBS    string
}

// CalculateItemTaxes calcula a tributação do item dependendo do tipo (Ingresso vs Mercadoria) e vigência legal
func CalculateItemTaxes(
	itemType string, // ticket, product, combo_item
	totalPrice float64,
	regime TaxRegime,
	referenceDate time.Time,
	issRate float64,
) TaxCalculationResult {
	res := TaxCalculationResult{}

	// 1. Reforma Tributária (CBS/IBS)
	// A partir de Agosto/2026: Ato Conjunto RFB/CGIBS nº 4/2026 - Destaque informativo de CBS 0.90% e IBS 0.10%
	if referenceDate.After(time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)) {
		res.CBSRate = 0.90
		res.IBSRate = 0.10
		res.CBSAmount = math.Round((totalPrice*(res.CBSRate/100.0))*100) / 100
		res.IBSAmount = math.Round((totalPrice*(res.IBSRate/100.0))*100) / 100
		res.CSTCBSIBS = "01" // Tributado integralmente
	}

	// 2. Tributos Clássicos
	if itemType == "ticket" {
		// Ingressos de Cinema: Prestação de Serviço (ISS - LC 116/03 item 12.01)
		res.CFOP = "0000" // NFS-e não utiliza CFOP de mercadorias
		if issRate <= 0 {
			issRate = 5.00
		}
		res.ISSAmount = math.Round((totalPrice*(issRate/100.0))*100) / 100

		switch regime {
		case TaxRegimeSimplesNacional:
			res.CSTPISCOFINS = "49" // Outras Operações de Saída
		case TaxRegimeLucroPresumido:
			res.PISAmount = math.Round((totalPrice*(0.65/100.0))*100) / 100
			res.COFINSAmount = math.Round((totalPrice*(3.00/100.0))*100) / 100
			res.CSTPISCOFINS = "01"
		case TaxRegimeLucroReal:
			res.PISAmount = math.Round((totalPrice*(1.65/100.0))*100) / 100
			res.COFINSAmount = math.Round((totalPrice*(7.60/100.0))*100) / 100
			res.CSTPISCOFINS = "01"
		}
	} else {
		// Mercadorias da Bomboniere: Venda no Varejo (NFC-e - ICMS)
		res.CFOP = "5.102" // Venda de mercadoria adquirida de terceiros
		res.CSTICMS = "00" // Tributada integralmente (ou 102 no Simples)

		switch regime {
		case TaxRegimeSimplesNacional:
			res.CSTICMS = "102"
			res.CSTPISCOFINS = "49"
		case TaxRegimeLucroPresumido:
			res.ICMSAmount = math.Round((totalPrice*(18.00/100.0))*100) / 100
			res.PISAmount = math.Round((totalPrice*(0.65/100.0))*100) / 100
			res.COFINSAmount = math.Round((totalPrice*(3.00/100.0))*100) / 100
			res.CSTPISCOFINS = "01"
		case TaxRegimeLucroReal:
			res.ICMSAmount = math.Round((totalPrice*(18.00/100.0))*100) / 100
			res.PISAmount = math.Round((totalPrice*(1.65/100.0))*100) / 100
			res.COFINSAmount = math.Round((totalPrice*(7.60/100.0))*100) / 100
			res.CSTPISCOFINS = "01"
		}
	}

	return res
}
