package domain

import (
	"math"
	"time"

	"frame-24/internal/platform/money"
)

type TaxCalculationResult struct {
	ICMSAmount   money.Cents
	ISSAmount    money.Cents
	PISAmount    money.Cents
	COFINSAmount money.Cents
	CBSRate      float64
	CBSAmount    money.Cents
	IBSRate      float64
	IBSAmount    money.Cents
	CFOP         string
	CSTICMS      string
	CSTPISCOFINS string
	CSTCBSIBS    string
}

// CalculateItemTaxes calcula a tributação do item dependendo do tipo (Ingresso vs Mercadoria) e vigência legal
func CalculateItemTaxes(
	itemType string, // ticket, product, combo_item
	totalPrice money.Cents,
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
		res.CBSAmount = totalPrice.Percentage(90) // 0.90%
		res.IBSAmount = totalPrice.Percentage(10) // 0.10%
		res.CSTCBSIBS = "01"                      // Tributado integralmente
	}

	// 2. Tributos Clássicos
	if itemType == "ticket" {
		// Ingressos de Cinema: Prestação de Serviço (ISS - LC 116/03 item 12.01)
		res.CFOP = "0000" // NFS-e não utiliza CFOP de mercadorias
		if issRate <= 0 {
			issRate = 5.00
		}
		res.ISSAmount = totalPrice.Percentage(int64(math.Round(issRate * 100)))

		switch regime {
		case TaxRegimeSimplesNacional:
			res.CSTPISCOFINS = "49" // Outras Operações de Saída
		case TaxRegimeLucroPresumido:
			res.PISAmount = totalPrice.Percentage(65)     // 0.65%
			res.COFINSAmount = totalPrice.Percentage(300) // 3.00%
			res.CSTPISCOFINS = "01"
		case TaxRegimeLucroReal:
			res.PISAmount = totalPrice.Percentage(165)    // 1.65%
			res.COFINSAmount = totalPrice.Percentage(760) // 7.60%
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
			res.ICMSAmount = totalPrice.Percentage(1800)  // 18.00%
			res.PISAmount = totalPrice.Percentage(65)     // 0.65%
			res.COFINSAmount = totalPrice.Percentage(300) // 3.00%
			res.CSTPISCOFINS = "01"
		case TaxRegimeLucroReal:
			res.ICMSAmount = totalPrice.Percentage(1800)  // 18.00%
			res.PISAmount = totalPrice.Percentage(165)    // 1.65%
			res.COFINSAmount = totalPrice.Percentage(760) // 7.60%
			res.CSTPISCOFINS = "01"
		}
	}

	return res
}
