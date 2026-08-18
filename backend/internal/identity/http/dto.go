package http

import (
	"errors"
	"strings"

	"github.com/google/uuid"
)

type RegisterRequest struct {
	Email    string  `json:"email"`
	Password string  `json:"password"`
	FullName string  `json:"fullName"`
	CPF      *string `json:"cpf,omitempty"`
	Phone    *string `json:"phone,omitempty"`
}

func (r RegisterRequest) Validate() error {
	if strings.TrimSpace(r.Email) == "" || !strings.Contains(r.Email, "@") {
		return errors.New("e-mail invalido")
	}
	if len(r.Password) < 6 {
		return errors.New("a senha deve ter no minimo 6 caracteres")
	}
	if strings.TrimSpace(r.FullName) == "" {
		return errors.New("o nome completo e obrigatorio")
	}
	return nil
}

type LoginRequest struct {
	Email             string     `json:"email"`
	Password          string     `json:"password"`
	PreferredTenantID *uuid.UUID `json:"preferredTenantId,omitempty"`
}

func (r LoginRequest) Validate() error {
	if strings.TrimSpace(r.Email) == "" {
		return errors.New("e-mail e obrigatorio")
	}
	if strings.TrimSpace(r.Password) == "" {
		return errors.New("senha e obrigatoria")
	}
	return nil
}

type SwitchTenantRequest struct {
	TargetTenantID string `json:"targetTenantId"`
}

func (r SwitchTenantRequest) Validate() (uuid.UUID, error) {
	id, err := uuid.Parse(r.TargetTenantID)
	if err != nil {
		return uuid.Nil, errors.New("targetTenantId invalido (deve ser UUID)")
	}
	return id, nil
}

type CreateTenantRequest struct {
	ParentID              *string `json:"parentId,omitempty"`
	Name                  string  `json:"name"`
	TradeName             *string `json:"tradeName,omitempty"`
	CNPJ                  string  `json:"cnpj"`
	StateRegistration     *string `json:"stateRegistration,omitempty"`
	MunicipalRegistration *string `json:"municipalRegistration,omitempty"`
	Timezone              string  `json:"timezone,omitempty"`
}

func (r CreateTenantRequest) Validate() error {
	if strings.TrimSpace(r.Name) == "" {
		return errors.New("o nome/razao social da empresa e obrigatorio")
	}
	cleanCNPJ := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(r.CNPJ), ".", ""), "-", ""), "/", "")
	if len(cleanCNPJ) != 14 {
		return errors.New("CNPJ deve conter 14 digitos")
	}
	return nil
}

type AddMemberRequest struct {
	UserID      string   `json:"userId"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions,omitempty"`
	ComplexIDs  []string `json:"complexIds,omitempty"`
}

func (r AddMemberRequest) Validate() (uuid.UUID, []uuid.UUID, error) {
	uID, err := uuid.Parse(r.UserID)
	if err != nil {
		return uuid.Nil, nil, errors.New("userId invalido (deve ser UUID)")
	}
	var complexUUIDs []uuid.UUID
	for _, cid := range r.ComplexIDs {
		cUUID, err := uuid.Parse(cid)
		if err != nil {
			return uuid.Nil, nil, errors.New("complexId invalido (deve ser UUID)")
		}
		complexUUIDs = append(complexUUIDs, cUUID)
	}
	if len(r.Roles) == 0 {
		return uuid.Nil, nil, errors.New("pelo menos uma role deve ser atribuida")
	}
	return uID, complexUUIDs, nil
}
