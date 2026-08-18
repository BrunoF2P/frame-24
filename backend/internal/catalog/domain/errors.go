package domain

import "errors"

var (
	ErrMovieNotFound       = errors.New("filme nao encontrado")
	ErrProductNotFound     = errors.New("produto nao encontrado")
	ErrUnitNotFound        = errors.New("unidade de medida nao encontrada")
	ErrUnitAlreadyExists   = errors.New("ja existe uma unidade de medida com esta sigla neste tenant")
	ErrBarcodeAlreadyExists = errors.New("codigo de barras ja cadastrado no sistema")
	ErrComboNotFound       = errors.New("combo nao encontrado")
	ErrInvalidConversion   = errors.New("fator de conversao de unidade invalido (deve ser > 0)")
	ErrInvalidNCM          = errors.New("NCM invalido (deve conter 8 digitos numericos)")
)
