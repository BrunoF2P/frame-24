package domain

import "errors"

var (
	ErrAccountNotFound         = errors.New("conta contabil nao encontrada")
	ErrAccountAlreadyExists    = errors.New("codigo de conta contabil ja existente")
	ErrInvalidAccountType      = errors.New("tipo de conta contabil invalido")
	ErrUnbalancedTransaction   = errors.New("transacao contabil desbalanceada: a soma dos debitos diverge da soma dos creditos")
	ErrEmptyTransaction        = errors.New("a transacao deve conter ao menos dois lancamentos (um debito e um credito)")
	ErrCashSessionAlreadyOpen  = errors.New("ja existe uma sessao de caixa aberta para este terminal/operador")
	ErrCashSessionNotFound     = errors.New("sessao de caixa nao encontrada")
	ErrCashSessionClosed       = errors.New("a sessao de caixa ja se encontra encerrada")
	ErrInvalidAmount           = errors.New("o valor deve ser maior que zero")
	ErrInvalidCashMovementType = errors.New("tipo de movimentacao de caixa invalido")
)
