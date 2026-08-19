package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"frame-24/internal/fiscal/domain"
)

type Repository interface {
	CreateFiscalProfile(ctx context.Context, tx pgx.Tx, p *domain.FiscalProfile) error
	GetFiscalProfileByComplexID(ctx context.Context, tenantID, complexID uuid.UUID) (*domain.FiscalProfile, error)
	GetFiscalProfileByComplexIDForUpdate(ctx context.Context, tx pgx.Tx, tenantID, complexID uuid.UUID) (*domain.FiscalProfile, error)
	UpdateFiscalProfile(ctx context.Context, tx pgx.Tx, p *domain.FiscalProfile) error

	CreateFiscalDocument(ctx context.Context, tx pgx.Tx, d *domain.FiscalDocument) error
	GetFiscalDocumentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FiscalDocument, error)
	GetFiscalDocumentBySaleAndType(ctx context.Context, tenantID, saleID uuid.UUID, docType domain.DocumentType) (*domain.FiscalDocument, error)
	ListFiscalDocumentsBySale(ctx context.Context, tenantID, saleID uuid.UUID) ([]domain.FiscalDocument, error)
	UpdateFiscalDocument(ctx context.Context, tx pgx.Tx, d *domain.FiscalDocument) error
}
