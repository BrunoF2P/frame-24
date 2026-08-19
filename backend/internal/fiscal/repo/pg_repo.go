package repo

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/fiscal/domain"
	"frame-24/internal/platform/db"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateFiscalProfile(ctx context.Context, tx pgx.Tx, p *domain.FiscalProfile) error {
	query := `
		INSERT INTO fiscal.fiscal_profiles (
			id, tenant_id, complex_id, certificate_a1_vault_id, certificate_password_encrypted,
			certificate_valid_until, environment, tax_regime, nfce_series, nfce_last_number,
			nfce_csc_id, nfce_csc_token, nfse_series, nfse_last_number, nfse_municipal_registration,
			nfe_devolution_series, nfe_devolution_last_number,
			cnae, aliquota_iss, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			p.ID, p.TenantID, p.ComplexID, p.CertificateA1VaultID, p.CertificatePasswordEncrypted,
			p.CertificateValidUntil, string(p.Environment), string(p.TaxRegime), p.NFCeSeries, p.NFCeLastNumber,
			p.NFCeCSCID, p.NFCeCSCToken, p.NFSeSeries, p.NFSeLastNumber, p.NFSeMunicipalRegistration,
			p.NFeDevolutionSeries, p.NFeDevolutionLastNumber,
			p.CNAE, p.AliquotaISS, p.CreatedAt, p.UpdatedAt,
		)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, p.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query,
				p.ID, p.TenantID, p.ComplexID, p.CertificateA1VaultID, p.CertificatePasswordEncrypted,
				p.CertificateValidUntil, string(p.Environment), string(p.TaxRegime), p.NFCeSeries, p.NFCeLastNumber,
				p.NFCeCSCID, p.NFCeCSCToken, p.NFSeSeries, p.NFSeLastNumber, p.NFSeMunicipalRegistration,
				p.NFeDevolutionSeries, p.NFeDevolutionLastNumber,
				p.CNAE, p.AliquotaISS, p.CreatedAt, p.UpdatedAt,
			)
			return e
		})
	}
	if err != nil {
		return fmt.Errorf("falha ao criar perfil fiscal: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetFiscalProfileByComplexID(ctx context.Context, tenantID, complexID uuid.UUID) (*domain.FiscalProfile, error) {
	var p domain.FiscalProfile
	var env, regime string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, certificate_a1_vault_id, certificate_password_encrypted,
			       certificate_valid_until, environment, tax_regime, nfce_series, nfce_last_number,
			       nfce_csc_id, nfce_csc_token, nfse_series, nfse_last_number, nfse_municipal_registration,
			       nfe_devolution_series, nfe_devolution_last_number,
			       cnae, aliquota_iss, created_at, updated_at
			FROM fiscal.fiscal_profiles
			WHERE complex_id = $1
		`
		return tx.QueryRow(ctx, query, complexID).Scan(
			&p.ID, &p.TenantID, &p.ComplexID, &p.CertificateA1VaultID, &p.CertificatePasswordEncrypted,
			&p.CertificateValidUntil, &env, &regime, &p.NFCeSeries, &p.NFCeLastNumber,
			&p.NFCeCSCID, &p.NFCeCSCToken, &p.NFSeSeries, &p.NFSeLastNumber, &p.NFSeMunicipalRegistration,
			&p.NFeDevolutionSeries, &p.NFeDevolutionLastNumber,
			&p.CNAE, &p.AliquotaISS, &p.CreatedAt, &p.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrFiscalProfileNotFound
		}
		return nil, fmt.Errorf("falha ao buscar perfil fiscal: %w", err)
	}
	p.Environment = domain.FiscalEnvironment(env)
	p.TaxRegime = domain.TaxRegime(regime)
	return &p, nil
}

func (r *PostgresRepository) GetFiscalProfileByComplexIDForUpdate(ctx context.Context, tx pgx.Tx, tenantID, complexID uuid.UUID) (*domain.FiscalProfile, error) {
	var p domain.FiscalProfile
	var env, regime string
	query := `
		SELECT id, tenant_id, complex_id, certificate_a1_vault_id, certificate_password_encrypted,
		       certificate_valid_until, environment, tax_regime, nfce_series, nfce_last_number,
		       nfce_csc_id, nfce_csc_token, nfse_series, nfse_last_number, nfse_municipal_registration,
		       nfe_devolution_series, nfe_devolution_last_number,
		       cnae, aliquota_iss, created_at, updated_at
		FROM fiscal.fiscal_profiles
		WHERE complex_id = $1
		FOR UPDATE
	`
	err := tx.QueryRow(ctx, query, complexID).Scan(
		&p.ID, &p.TenantID, &p.ComplexID, &p.CertificateA1VaultID, &p.CertificatePasswordEncrypted,
		&p.CertificateValidUntil, &env, &regime, &p.NFCeSeries, &p.NFCeLastNumber,
		&p.NFCeCSCID, &p.NFCeCSCToken, &p.NFSeSeries, &p.NFSeLastNumber, &p.NFSeMunicipalRegistration,
		&p.NFeDevolutionSeries, &p.NFeDevolutionLastNumber,
		&p.CNAE, &p.AliquotaISS, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrFiscalProfileNotFound
		}
		return nil, fmt.Errorf("falha ao obter lock no perfil fiscal: %w", err)
	}
	p.Environment = domain.FiscalEnvironment(env)
	p.TaxRegime = domain.TaxRegime(regime)
	return &p, nil
}

func (r *PostgresRepository) UpdateFiscalProfile(ctx context.Context, tx pgx.Tx, p *domain.FiscalProfile) error {
	query := `
		UPDATE fiscal.fiscal_profiles
		SET nfce_last_number = $1, nfse_last_number = $2, nfe_devolution_last_number = $3, certificate_a1_vault_id = $4,
		    certificate_password_encrypted = $5, certificate_valid_until = $6,
		    environment = $7, tax_regime = $8, aliquota_iss = $9, updated_at = $10
		WHERE id = $11
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			p.NFCeLastNumber, p.NFSeLastNumber, p.NFeDevolutionLastNumber, p.CertificateA1VaultID,
			p.CertificatePasswordEncrypted, p.CertificateValidUntil,
			string(p.Environment), string(p.TaxRegime), p.AliquotaISS, p.UpdatedAt, p.ID,
		)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, p.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query,
				p.NFCeLastNumber, p.NFSeLastNumber, p.NFeDevolutionLastNumber, p.CertificateA1VaultID,
				p.CertificatePasswordEncrypted, p.CertificateValidUntil,
				string(p.Environment), string(p.TaxRegime), p.AliquotaISS, p.UpdatedAt, p.ID,
			)
			return e
		})
	}
	if err != nil {
		return fmt.Errorf("falha ao atualizar perfil fiscal: %w", err)
	}
	return nil
}

func (r *PostgresRepository) CreateFiscalDocument(ctx context.Context, tx pgx.Tx, d *domain.FiscalDocument) error {
	docQuery := `
		INSERT INTO fiscal.fiscal_documents (
			id, tenant_id, complex_id, sale_id, doc_type, status, series, number,
			access_key, protocol_number, referenced_access_key, xml_content, pdf_danfe_url, qr_code_url,
			total_amount, icms_amount, iss_amount, pis_amount, cofins_amount,
			cbs_aliquot, cbs_amount, ibs_aliquot, ibs_amount, rejection_reason, emitted_at, cancelled_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, $19,
			$20, $21, $22, $23, $24, $25, $26, $27, $28
		)
		ON CONFLICT (tenant_id, sale_id, doc_type) DO NOTHING
	`
	tag, err := tx.Exec(ctx, docQuery,
		d.ID, d.TenantID, d.ComplexID, d.SaleID, string(d.DocType), string(d.Status), d.Series, d.Number,
		d.AccessKey, d.ProtocolNumber, d.ReferencedAccessKey, d.XMLContent, d.PDFDanfeURL, d.QRCodeURL,
		d.TotalAmount, d.ICMSAmount, d.ISSAmount, d.PISAmount, d.COFINSAmount,
		d.CBSAliquot, d.CBSAmount, d.IBSAliquot, d.IBSAmount, d.RejectionReason, d.EmittedAt, d.CancelledAt, d.CreatedAt, d.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("falha ao inserir documento fiscal: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil // Idempotência: documento já registrado
	}

	itemQuery := `
		INSERT INTO fiscal.fiscal_document_items (
			id, tenant_id, fiscal_document_id, item_type, reference_id, description,
			ncm, cest, cfop, unit, quantity, unit_price, total_price,
			cst_icms, cst_pis_cofins, cst_cbs_ibs, cbs_rate, cbs_amount, ibs_rate, ibs_amount, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`
	batch := &pgx.Batch{}
	for _, it := range d.Items {
		batch.Queue(itemQuery,
			it.ID, it.TenantID, d.ID, it.ItemType, it.ReferenceID, it.Description,
			it.NCM, it.CEST, it.CFOP, it.Unit, it.Quantity, it.UnitPrice, it.TotalPrice,
			it.CSTICMS, it.CSTPISCOFINS, it.CSTCBSIBS, it.CBSRate, it.CBSAmount, it.IBSRate, it.IBSAmount, it.CreatedAt,
		)
	}
	br := tx.SendBatch(ctx, batch)
	for i := 0; i < len(d.Items); i++ {
		if _, err := br.Exec(); err != nil {
			_ = br.Close()
			return fmt.Errorf("falha ao inserir item fiscal batch: %w", err)
		}
	}
	_ = br.Close()

	return nil
}

func (r *PostgresRepository) GetFiscalDocumentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FiscalDocument, error) {
	var d domain.FiscalDocument
	var docType, status string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, sale_id, doc_type, status, series, number,
			       access_key, protocol_number, referenced_access_key, xml_content, pdf_danfe_url, qr_code_url,
			       total_amount, icms_amount, iss_amount, pis_amount, cofins_amount,
			       cbs_aliquot, cbs_amount, ibs_aliquot, ibs_amount, rejection_reason, emitted_at, cancelled_at, created_at, updated_at
			FROM fiscal.fiscal_documents
			WHERE id = $1
		`
		return tx.QueryRow(ctx, query, id).Scan(
			&d.ID, &d.TenantID, &d.ComplexID, &d.SaleID, &docType, &status, &d.Series, &d.Number,
			&d.AccessKey, &d.ProtocolNumber, &d.ReferencedAccessKey, &d.XMLContent, &d.PDFDanfeURL, &d.QRCodeURL,
			&d.TotalAmount, &d.ICMSAmount, &d.ISSAmount, &d.PISAmount, &d.COFINSAmount,
			&d.CBSAliquot, &d.CBSAmount, &d.IBSAliquot, &d.IBSAmount, &d.RejectionReason, &d.EmittedAt, &d.CancelledAt, &d.CreatedAt, &d.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrFiscalDocumentNotFound
		}
		return nil, fmt.Errorf("falha ao buscar documento fiscal: %w", err)
	}
	d.DocType = domain.DocumentType(docType)
	d.Status = domain.DocumentStatus(status)
	return &d, nil
}

func (r *PostgresRepository) GetFiscalDocumentBySaleAndType(ctx context.Context, tenantID, saleID uuid.UUID, docType domain.DocumentType) (*domain.FiscalDocument, error) {
	var d domain.FiscalDocument
	var docTypeStr, status string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, sale_id, doc_type, status, series, number,
			       access_key, protocol_number, referenced_access_key, xml_content, pdf_danfe_url, qr_code_url,
			       total_amount, icms_amount, iss_amount, pis_amount, cofins_amount,
			       cbs_aliquot, cbs_amount, ibs_aliquot, ibs_amount, rejection_reason, emitted_at, cancelled_at, created_at, updated_at
			FROM fiscal.fiscal_documents
			WHERE sale_id = $1 AND doc_type = $2
		`
		return tx.QueryRow(ctx, query, saleID, string(docType)).Scan(
			&d.ID, &d.TenantID, &d.ComplexID, &d.SaleID, &docTypeStr, &status, &d.Series, &d.Number,
			&d.AccessKey, &d.ProtocolNumber, &d.ReferencedAccessKey, &d.XMLContent, &d.PDFDanfeURL, &d.QRCodeURL,
			&d.TotalAmount, &d.ICMSAmount, &d.ISSAmount, &d.PISAmount, &d.COFINSAmount,
			&d.CBSAliquot, &d.CBSAmount, &d.IBSAliquot, &d.IBSAmount, &d.RejectionReason, &d.EmittedAt, &d.CancelledAt, &d.CreatedAt, &d.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrFiscalDocumentNotFound
		}
		return nil, fmt.Errorf("falha ao consultar documento fiscal da venda: %w", err)
	}
	d.DocType = domain.DocumentType(docTypeStr)
	d.Status = domain.DocumentStatus(status)
	return &d, nil
}

func (r *PostgresRepository) ListFiscalDocumentsBySale(ctx context.Context, tenantID, saleID uuid.UUID) ([]domain.FiscalDocument, error) {
	var list []domain.FiscalDocument
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, sale_id, doc_type, status, series, number,
			       access_key, protocol_number, referenced_access_key, xml_content, pdf_danfe_url, qr_code_url,
			       total_amount, icms_amount, iss_amount, pis_amount, cofins_amount,
			       cbs_aliquot, cbs_amount, ibs_aliquot, ibs_amount, rejection_reason, emitted_at, cancelled_at, created_at, updated_at
			FROM fiscal.fiscal_documents
			WHERE sale_id = $1
			ORDER BY created_at ASC
		`
		rows, err := tx.Query(ctx, query, saleID)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var d domain.FiscalDocument
			var dt, st string
			err := rows.Scan(
				&d.ID, &d.TenantID, &d.ComplexID, &d.SaleID, &dt, &st, &d.Series, &d.Number,
				&d.AccessKey, &d.ProtocolNumber, &d.ReferencedAccessKey, &d.XMLContent, &d.PDFDanfeURL, &d.QRCodeURL,
				&d.TotalAmount, &d.ICMSAmount, &d.ISSAmount, &d.PISAmount, &d.COFINSAmount,
				&d.CBSAliquot, &d.CBSAmount, &d.IBSAliquot, &d.IBSAmount, &d.RejectionReason, &d.EmittedAt, &d.CancelledAt, &d.CreatedAt, &d.UpdatedAt,
			)
			if err != nil {
				return err
			}
			d.DocType = domain.DocumentType(dt)
			d.Status = domain.DocumentStatus(st)
			list = append(list, d)
		}
		return rows.Err()
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar documentos fiscais: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) UpdateFiscalDocument(ctx context.Context, tx pgx.Tx, d *domain.FiscalDocument) error {
	query := `
		UPDATE fiscal.fiscal_documents
		SET status = $1, access_key = $2, protocol_number = $3, referenced_access_key = $4,
		    xml_content = $5, pdf_danfe_url = $6, qr_code_url = $7, rejection_reason = $8,
		    emitted_at = $9, cancelled_at = $10, updated_at = $11
		WHERE id = $12
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			string(d.Status), d.AccessKey, d.ProtocolNumber, d.ReferencedAccessKey,
			d.XMLContent, d.PDFDanfeURL, d.QRCodeURL, d.RejectionReason,
			d.EmittedAt, d.CancelledAt, d.UpdatedAt, d.ID,
		)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, d.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query,
				string(d.Status), d.AccessKey, d.ProtocolNumber, d.ReferencedAccessKey,
				d.XMLContent, d.PDFDanfeURL, d.QRCodeURL, d.RejectionReason,
				d.EmittedAt, d.CancelledAt, d.UpdatedAt, d.ID,
			)
			return e
		})
	}
	if err != nil {
		return fmt.Errorf("falha ao atualizar documento fiscal: %w", err)
	}
	return nil
}
