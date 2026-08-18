package domain

import "errors"

var (
	ErrUserNotFound          = errors.New("usuario nao encontrado")
	ErrUserAlreadyExists     = errors.New("ja existe um usuario cadastrado com este e-mail")
	ErrInvalidCredentials    = errors.New("e-mail ou senha incorretos")
	ErrUserInactive          = errors.New("usuario inativo no sistema")
	ErrTenantNotFound        = errors.New("tenant/empresa nao encontrado")
	ErrTenantInactive        = errors.New("tenant/empresa inativo ou suspenso")
	ErrTenantAlreadyExists   = errors.New("ja existe um tenant cadastrado com este CNPJ")
	ErrMembershipNotFound    = errors.New("o usuario nao possui vinculo ou permissao para acessar esta empresa")
	ErrMembershipInactive    = errors.New("vinculo do usuario com esta empresa esta inativo")
	ErrInvalidEmail          = errors.New("formato de e-mail invalido")
	ErrInvalidPassword       = errors.New("senha invalida: minimo de 6 caracteres obrigatorio")
	ErrInvalidCNPJ           = errors.New("CNPJ invalido")
)
