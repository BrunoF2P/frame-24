package domain

import "errors"

var (
	ErrFiscalProfileNotFound        = errors.New("perfil fiscal do complexo nao configurado")
	ErrFiscalDocumentNotFound       = errors.New("documento fiscal nao encontrado")
	ErrFiscalDocumentAlreadyEmitted = errors.New("documento fiscal ja emitido")
	ErrFiscalDocumentCancelled      = errors.New("documento fiscal ja cancelado")
	ErrCancellationWindowExceeded   = errors.New("janela de cancelamento de 30 minutos excedida na SEFAZ; deve ser emitida NF-e de devolucao/estorno (CFOP 1.202)")
	ErrInvalidAccessKey             = errors.New("chave de acesso do documento fiscal invalida")
	ErrInvalidTaxRegime             = errors.New("regime tributario invalido")
	ErrFiscalItemsEmpty             = errors.New("documento fiscal sem itens para emissao")
)
