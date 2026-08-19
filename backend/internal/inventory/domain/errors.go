package domain

import "errors"

var (
	ErrWarehouseNotFound      = errors.New("almoxarifado/local de estoque nao encontrado")
	ErrWarehouseAlreadyExists = errors.New("codigo de almoxarifado ja cadastrado para este complexo")
	ErrInsufficientStock      = errors.New("saldo insuficiente em estoque para a saida solicitada")
	ErrInvalidQuantity        = errors.New("a quantidade movimentada deve ser maior que zero")
	ErrInvalidMovementType    = errors.New("tipo de movimentacao de estoque invalido")
	ErrStockItemNotFound      = errors.New("item de estoque nao encontrado no almoxarifado")
)
