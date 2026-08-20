package domain

import (
	"context"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type PixQRCodeResponse struct {
	QRCodePayload string `json:"qrCodePayload"` // EMVCo "Copia e Cola"
	QRCodeURL     string `json:"qrCodeUrl"`     // Link de renderização de imagem
	TxID          string `json:"txId"`
}

type PixGateway interface {
	GenerateDynamicPix(ctx context.Context, tenantID, saleID uuid.UUID, amount money.Cents, description string) (*PixQRCodeResponse, error)
	CheckPixStatus(ctx context.Context, tenantID uuid.UUID, txID string) (PaymentStatus, error)
}

type TefAdapter interface {
	ConfirmTransaction(ctx context.Context, tenantID uuid.UUID, terminalID, nsu string) error
	ReverseTransaction(ctx context.Context, tenantID uuid.UUID, terminalID, nsu, reason string) error
}
