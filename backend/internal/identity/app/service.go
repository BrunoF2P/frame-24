package app

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/identity/domain"
	"frame-24/internal/identity/repo"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/outbox"
)

// Service orquestra as regras de negócio do Bounded Context de Identidade
type Service struct {
	pool    *pgxpool.Pool
	repo    repo.Repository
	tokens  *auth.TokenManager
}

// NewService cria uma nova instância de Service
func NewService(pool *pgxpool.Pool, r repo.Repository, tokens *auth.TokenManager) *Service {
	return &Service{
		pool:   pool,
		repo:   r,
		tokens: tokens,
	}
}

// RegisterCommand payload para cadastrar um novo usuário global
type RegisterCommand struct {
	Email    string
	Password string
	FullName string
	CPF      *string
	Phone    *string
}

// CreateTenantCommand payload para criar uma nova empresa/cinema (Matriz ou Filial)
type CreateTenantCommand struct {
	ParentID              *uuid.UUID
	Name                  string
	TradeName             *string
	CNPJ                  string
	StateRegistration     *string
	MunicipalRegistration *string
	Timezone              string
	AdminUserID           uuid.UUID // Usuário que se tornará o primeiro admin da empresa
}

// AuthResult resultado da autenticação com suporte ao Tenant Switcher
type AuthResult struct {
	User        *domain.User                  `json:"user"`
	Memberships []domain.TenantMembershipView `json:"memberships"`
	ActiveToken *string                       `json:"accessToken,omitempty"`
	ActiveTenant *uuid.UUID                   `json:"activeTenantId,omitempty"`
}

// SwitchTenantResult resultado da troca de empresa ativa
type SwitchTenantResult struct {
	AccessToken string                      `json:"accessToken"`
	Tenant      *domain.TenantMembershipView `json:"tenant"`
}

// RegisterUser cria uma pessoa física global no sistema
func (s *Service) RegisterUser(ctx context.Context, cmd RegisterCommand) (*domain.User, error) {
	if len(cmd.Password) < 6 {
		return nil, domain.ErrInvalidPassword
	}

	hash, err := auth.HashPassword(cmd.Password)
	if err != nil {
		return nil, err
	}

	user, err := domain.NewUser(cmd.Email, hash, cmd.FullName, cmd.CPF, cmd.Phone)
	if err != nil {
		return nil, err
	}

	err = db.RunTx(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.repo.CreateUser(ctx, tx, user); err != nil {
			return err
		}

		// Emite evento no Outbox
		return outbox.InsertEvent(ctx, tx, uuid.Nil, "identity.user.registered", user.ID, map[string]any{
			"userId":   user.ID,
			"email":    user.Email,
			"fullName": user.FullName,
		})
	})

	if err != nil {
		return nil, err
	}

	return user, nil
}

// CreateTenant cadastra uma nova empresa (Cinema Matriz ou Filial) e vincula o administrador inicial
func (s *Service) CreateTenant(ctx context.Context, cmd CreateTenantCommand) (*domain.Tenant, error) {
	tenant, err := domain.NewTenant(
		cmd.ParentID, cmd.Name, cmd.TradeName, cmd.CNPJ,
		cmd.StateRegistration, cmd.MunicipalRegistration, cmd.Timezone,
	)
	if err != nil {
		return nil, err
	}

	err = db.RunTx(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.repo.CreateTenant(ctx, tx, tenant); err != nil {
			return err
		}

		// Se informado um admin inicial, cria a membership com role de admin
		if cmd.AdminUserID != uuid.Nil {
			membership := domain.NewMembership(cmd.AdminUserID, tenant.ID, []string{"admin"}, []string{"*"}, nil)
			if err := s.repo.CreateMembership(ctx, tx, membership); err != nil {
				return err
			}
		}

		// Grava evento no outbox
		return outbox.InsertEvent(ctx, tx, tenant.ID, "identity.tenant.created", tenant.ID, map[string]any{
			"tenantId": tenant.ID,
			"name":     tenant.Name,
			"cnpj":     tenant.CNPJ,
		})
	})

	if err != nil {
		return nil, err
	}

	return tenant, nil
}

// Authenticate valida as credenciais globais e lista todos os cinemas acessíveis (Tenant Switcher)
func (s *Service) Authenticate(ctx context.Context, email, password string, preferredTenantID *uuid.UUID) (*AuthResult, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, domain.ErrUserInactive
	}

	if !auth.CheckPassword(password, user.PasswordHash) {
		return nil, domain.ErrInvalidCredentials
	}

	// Busca todos os cinemas aos quais o usuário tem acesso ativo
	memberships, err := s.repo.ListMembershipsByUserID(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("falha ao carregar empresas do usuario: %w", err)
	}

	res := &AuthResult{
		User:        user,
		Memberships: memberships,
	}

	// Se o usuário especificou um tenant ou possui apenas 1 empresa ativa, já gera o token correspondente
	var targetMembership *domain.TenantMembershipView
	if preferredTenantID != nil && *preferredTenantID != uuid.Nil {
		for i := range memberships {
			if memberships[i].TenantID == *preferredTenantID && memberships[i].IsActive {
				targetMembership = &memberships[i]
				break
			}
		}
		if targetMembership == nil {
			return nil, domain.ErrMembershipNotFound
		}
	} else if len(memberships) == 1 && memberships[0].IsActive {
		targetMembership = &memberships[0]
	}

	if targetMembership != nil {
		token, err := s.tokens.GenerateToken(
			user.ID,
			targetMembership.TenantID,
			user.Email,
			user.FullName,
			targetMembership.Roles,
			targetMembership.Permissions,
			targetMembership.ComplexIDs,
		)
		if err != nil {
			return nil, fmt.Errorf("falha ao gerar JWT: %w", err)
		}
		res.ActiveToken = &token
		res.ActiveTenant = &targetMembership.TenantID
	}

	return res, nil
}

// SwitchTenantContext altera o contexto ativo de empresa (Tenant Switcher)
func (s *Service) SwitchTenantContext(ctx context.Context, userID, targetTenantID uuid.UUID) (*SwitchTenantResult, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, domain.ErrUserNotFound
	}
	if !user.IsActive {
		return nil, domain.ErrUserInactive
	}

	membership, err := s.repo.GetMembership(ctx, userID, targetTenantID)
	if err != nil {
		return nil, domain.ErrMembershipNotFound
	}
	if !membership.IsActive {
		return nil, domain.ErrMembershipInactive
	}

	tenant, err := s.repo.GetTenantByID(ctx, targetTenantID)
	if err != nil {
		return nil, domain.ErrTenantNotFound
	}
	if tenant.Status != "active" {
		return nil, domain.ErrTenantInactive
	}

	token, err := s.tokens.GenerateToken(
		user.ID,
		tenant.ID,
		user.Email,
		user.FullName,
		membership.Roles,
		membership.Permissions,
		membership.ComplexIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("falha ao gerar novo token de tenant: %w", err)
	}

	view := domain.TenantMembershipView{
		MembershipID: membership.ID,
		TenantID:     tenant.ID,
		TenantName:   tenant.Name,
		TradeName:    tenant.TradeName,
		CNPJ:         tenant.CNPJ,
		Roles:        membership.Roles,
		Permissions:  membership.Permissions,
		ComplexIDs:   membership.ComplexIDs,
		IsActive:     membership.IsActive,
	}

	return &SwitchTenantResult{
		AccessToken: token,
		Tenant:      &view,
	}, nil
}

// AddTenantMember vincula uma pessoa física a uma empresa com papéis definidos
func (s *Service) AddTenantMember(ctx context.Context, tenantID, userID uuid.UUID, roles []string, permissions []string, complexIDs []uuid.UUID) error {
	membership := domain.NewMembership(userID, tenantID, roles, permissions, complexIDs)
	return s.repo.CreateMembership(ctx, nil, membership)
}

// ListUserMemberships lista os cinemas acessíveis por um usuário
func (s *Service) ListUserMemberships(ctx context.Context, userID uuid.UUID) ([]domain.TenantMembershipView, error) {
	return s.repo.ListMembershipsByUserID(ctx, userID)
}
