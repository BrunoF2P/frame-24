package domain

import "errors"

var (
	ErrComplexNotFound     = errors.New("complexo de cinema nao encontrado")
	ErrComplexAlreadyExists = errors.New("ja existe um complexo cadastrado com este CNPJ filial")
	ErrRoomNotFound        = errors.New("sala de cinema nao encontrada")
	ErrRoomAlreadyExists    = errors.New("ja existe uma sala com este numero neste complexo")
	ErrShowtimeNotFound    = errors.New("sessao nao encontrada")
	ErrShowtimeOverlap     = errors.New("conflito de horario: a sala ja possui uma sessao agendada ou em limpeza neste intervalo")
	ErrInvalidTimezone     = errors.New("fuso horario IANA invalido")
	ErrInvalidShowtimeRange = errors.New("o horario de termino deve ser posterior ao horario de inicio")
	ErrInvalidSeatType     = errors.New("tipo de assento invalido")
)
