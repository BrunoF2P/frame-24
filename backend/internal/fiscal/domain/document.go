package domain

import (
	"fmt"
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type DocumentType string

const (
	DocTypeNFCe          DocumentType = "nfce"           // Modelo 65 - Bomboniere
	DocTypeNFSe          DocumentType = "nfse"           // Serviços - Ingressos (ISS)
	DocTypeNFeDevolution DocumentType = "nfe_devolution" // Modelo 55 - Estorno/Devolução (CFOP 1.202)
)

type DocumentStatus string

const (
	DocStatusDraft      DocumentStatus = "draft"
	DocStatusEmitted    DocumentStatus = "emitted"
	DocStatusAuthorized DocumentStatus = "authorized"
	DocStatusRejected   DocumentStatus = "rejected"
	DocStatusCancelled  DocumentStatus = "cancelled"
	DocStatusRefunded   DocumentStatus = "refunded"
)

type FiscalDocument struct {
	ID                  uuid.UUID            `json:"id"`
	TenantID            uuid.UUID            `json:"tenantId"`
	ComplexID           uuid.UUID            `json:"complexId"`
	SaleID              uuid.UUID            `json:"saleId"`
	DocType             DocumentType         `json:"docType"`
	Status              DocumentStatus       `json:"status"`
	Series              string               `json:"series"`
	Number              int64                `json:"number"`
	AccessKey           *string              `json:"accessKey,omitempty"`
	ProtocolNumber      *string              `json:"protocolNumber,omitempty"`
	ReferencedAccessKey *string              `json:"referencedAccessKey,omitempty"`
	XMLContent          *string              `json:"xmlContent,omitempty"`
	PDFDanfeURL         *string              `json:"pdfDanfeUrl,omitempty"`
	QRCodeURL           *string              `json:"qrCodeUrl,omitempty"`
	TotalAmount         money.Cents          `json:"totalAmount"`
	ICMSAmount          money.Cents          `json:"icmsAmount"`
	ISSAmount           money.Cents          `json:"issAmount"`
	PISAmount           money.Cents          `json:"pisAmount"`
	COFINSAmount        money.Cents          `json:"cofinsAmount"`
	CBSAliquot          float64              `json:"cbsAliquot"`
	CBSAmount           money.Cents          `json:"cbsAmount"`
	IBSAliquot          float64              `json:"ibsAliquot"`
	IBSAmount           money.Cents          `json:"ibsAmount"`
	RejectionReason     *string              `json:"rejectionReason,omitempty"`
	EmittedAt           *time.Time           `json:"emittedAt,omitempty"`
	CancelledAt         *time.Time           `json:"cancelledAt,omitempty"`
	Items               []FiscalDocumentItem `json:"items,omitempty"`
	CreatedAt           time.Time            `json:"createdAt"`
	UpdatedAt           time.Time            `json:"updatedAt"`
}

type FiscalDocumentItem struct {
	ID               uuid.UUID   `json:"id"`
	TenantID         uuid.UUID   `json:"tenantId"`
	FiscalDocumentID uuid.UUID   `json:"fiscalDocumentId"`
	ItemType         string      `json:"itemType"` // ticket, product, combo_item
	ReferenceID      *uuid.UUID  `json:"referenceId,omitempty"`
	Description      string      `json:"description"`
	NCM              *string     `json:"ncm,omitempty"`
	CEST             *string     `json:"cest,omitempty"`
	CFOP             string      `json:"cfop"`
	Unit             string      `json:"unit"`
	Quantity         float64     `json:"quantity"`
	UnitPrice        money.Cents `json:"unitPrice"`
	TotalPrice       money.Cents `json:"totalPrice"`
	CSTICMS          *string     `json:"cstIcms,omitempty"`
	CSTPISCOFINS     *string     `json:"cstPisCofins,omitempty"`
	CSTCBSIBS        *string     `json:"cstCbsIbs,omitempty"`
	CBSRate          float64     `json:"cbsRate"`
	CBSAmount        money.Cents `json:"cbsAmount"`
	IBSRate          float64     `json:"ibsRate"`
	IBSAmount        money.Cents `json:"ibsAmount"`
	CreatedAt        time.Time   `json:"createdAt"`
}

func NewFiscalDocument(
	tenantID, complexID, saleID uuid.UUID,
	docType DocumentType,
	series string,
	number int64,
) (*FiscalDocument, error) {
	now := time.Now()
	return &FiscalDocument{
		ID:          uuid.New(),
		TenantID:    tenantID,
		ComplexID:   complexID,
		SaleID:      saleID,
		DocType:     docType,
		Status:      DocStatusDraft,
		Series:      strings.TrimSpace(series),
		Number:      number,
		TotalAmount: 0,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func (d *FiscalDocument) AddItem(item FiscalDocumentItem) {
	item.FiscalDocumentID = d.ID
	item.TenantID = d.TenantID
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	if item.CreatedAt.IsZero() {
		item.CreatedAt = time.Now()
	}
	d.Items = append(d.Items, item)
	d.TotalAmount += item.TotalPrice
	d.CBSAmount += item.CBSAmount
	d.IBSAmount += item.IBSAmount
	d.UpdatedAt = time.Now()
}

func (d *FiscalDocument) Authorize(accessKey, protocol, xml, pdfURL, qrCodeURL string) {
	d.Status = DocStatusAuthorized
	d.AccessKey = &accessKey
	d.ProtocolNumber = &protocol
	d.XMLContent = &xml
	d.PDFDanfeURL = &pdfURL
	d.QRCodeURL = &qrCodeURL
	now := time.Now()
	d.EmittedAt = &now
	d.UpdatedAt = now
}

func (d *FiscalDocument) Reject(reason string) {
	d.Status = DocStatusRejected
	d.RejectionReason = &reason
	d.UpdatedAt = time.Now()
}

func (d *FiscalDocument) Cancel(reason string) error {
	if d.Status != DocStatusAuthorized {
		return fmt.Errorf("apenas documentos autorizados podem ser cancelados")
	}
	now := time.Now()
	d.Status = DocStatusCancelled
	d.RejectionReason = &reason
	d.CancelledAt = &now
	d.UpdatedAt = now
	return nil
}
