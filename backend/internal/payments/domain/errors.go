package domain

import "errors"

var (
	ErrPaymentNotFound           = errors.New("tentativa de pagamento nao encontrada")
	ErrDuplicateIdempotencyKey   = errors.New("chave de idempotencia ja utilizada")
	ErrInvalidPaymentMethod      = errors.New("metodo de pagamento invalido")
	ErrInvalidAmount             = errors.New("valor de pagamento invalido")
	ErrPaymentAlreadyFinalized   = errors.New("pagamento ja finalizado")
	ErrTefTransactionNotFound    = errors.New("transacao TEF nao encontrada")
	ErrTefAlreadyConfirmed       = errors.New("transacao TEF ja confirmada")
	ErrTefAlreadyReversed        = errors.New("transacao TEF ja desfeita")
	ErrTefInvalidStateTransition = errors.New("transicao de estado TEF invalida")
	ErrInvalidWebhookSignature   = errors.New("assinatura de webhook invalida")
	ErrWebhookPayloadMalformed   = errors.New("payload de webhook malformado")
)
