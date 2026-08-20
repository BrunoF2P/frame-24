package domain

import "errors"

var (
	ErrSaleNotFound           = errors.New("venda nao encontrada")
	ErrInvalidSaleTotal       = errors.New("total da venda diverge da soma dos itens e ingressos")
	ErrEmptySale              = errors.New("a venda deve conter ao menos um ingresso ou item de bomboniere")
	ErrHalfPriceLimitExceeded = errors.New("cota legal de 40% de meia-entrada esgotada para esta sessao (Lei Federal 12.933/2013)")
	ErrSeatAlreadySold        = errors.New("um ou mais assentos selecionados ja foram vendidos")
	ErrSeatLockFailed         = errors.New("nao foi possivel bloquear um ou mais assentos (conflito de reserva concorrente)")
	ErrSeatLockExpired        = errors.New("o tempo limite de reserva dos assentos expirou")
	ErrInvalidPaymentAmount   = errors.New("valor total dos pagamentos diverge do valor total da venda")
	ErrInvalidPaymentMethod   = errors.New("forma de pagamento invalida")
	ErrInvalidTicketType      = errors.New("tipo de ingresso invalido")
	ErrTicketNotFound         = errors.New("ingresso nao encontrado")
	ErrTicketAlreadyUsed      = errors.New("ingresso ja utilizado na portaria")
	// Preço de ingresso não configurado na sessão — o operador deve definir base_ticket_price
	// antes de liberar a sessão para venda. Ingresso tipo 'cortesia' é isento (preço = 0 esperado).
	ErrInvalidShowtimePrice = errors.New("preco base da sessao nao configurado (base_ticket_price = 0); configure o preco antes de liberar para venda")
)
