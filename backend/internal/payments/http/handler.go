package http

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"frame-24/internal/payments/app"
	"frame-24/internal/payments/domain"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/httputil"
)

type Handler struct {
	svc *app.Service
}

func NewHandler(svc *app.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) CreatePix(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant context ausente", nil)
		return
	}

	var req CreatePixRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	attempt, err := h.svc.CreatePixPayment(r.Context(), tenantID, req.SaleID, req.IdempotencyKey, req.Amount, req.Description)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusCreated, attempt)
}

func (h *Handler) ProcessWebhook(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")

	// 1. Ler o body raw antes de qualquer decode (necessário para verificar assinatura HMAC sobre o payload original)
	rawBody, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1 MiB max
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Falha ao ler corpo do webhook", nil)
		return
	}

	// 2. Validar assinatura HMAC-SHA256 se fornecida (env WEBHOOK_SECRET_{PROVIDER})
	// Pattern idêntico ao usado por Stripe (X-Stripe-Signature), Mercado Pago e BACEN Webhook.
	secretEnvKey := "WEBHOOK_SECRET_" + strings.ToUpper(provider)
	webhookSecret := os.Getenv(secretEnvKey)
	if incomingSignature := r.Header.Get("X-Signature"); incomingSignature != "" {
		if webhookSecret == "" {
			// Secret não configurado mas assinatura foi enviada — rejeitar por segurança
			httputil.RespondDomainError(w, r, domain.ErrInvalidWebhookSignature)
			return
		}
		mac := hmac.New(sha256.New, []byte(webhookSecret))
		mac.Write(rawBody)
		expectedSig := hex.EncodeToString(mac.Sum(nil))
		// Aceitar "sha256=<hex>" ou apenas "<hex>" (variações entre provedores)
		cleanIncoming := strings.TrimPrefix(incomingSignature, "sha256=")
		if !hmac.Equal([]byte(expectedSig), []byte(cleanIncoming)) {
			httputil.RespondDomainError(w, r, domain.ErrInvalidWebhookSignature)
			return
		}
	}

	// 3. Desserializar payload
	var req WebhookRequest
	if err := json.Unmarshal(rawBody, &req); err != nil {
		httputil.RespondDomainError(w, r, domain.ErrWebhookPayloadMalformed)
		return
	}

	// 4. Resolver tenantID: JWT ctx → X-Tenant-ID header → tenant_id query → payload
	var tenantID uuid.UUID
	if tID, ok := auth.GetTenantID(r.Context()); ok {
		tenantID = tID
	} else if headerTenant := r.Header.Get("X-Tenant-ID"); headerTenant != "" {
		if parsed, err := uuid.Parse(headerTenant); err == nil {
			tenantID = parsed
		}
	} else if queryTenant := r.URL.Query().Get("tenant_id"); queryTenant != "" {
		if parsed, err := uuid.Parse(queryTenant); err == nil {
			tenantID = parsed
		}
	}
	if tenantID == uuid.Nil && req.TenantID != nil {
		tenantID = *req.TenantID
	}
	if tenantID == uuid.Nil {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant context ausente no webhook", nil)
		return
	}

	attempt, err := h.svc.ProcessWebhook(r.Context(), tenantID, req.IdempotencyKey, req.ExternalRef, req.Status, req.Amount, req.ErrorMessage)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, attempt)
}

func (h *Handler) InitiateTef(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant context ausente", nil)
		return
	}

	var req InitiateTefRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	tx, err := h.svc.InitiateTef(
		r.Context(), tenantID, req.SaleID, req.POSTerminalID, req.NSU,
		req.AuthorizationCode, req.CardBrand, domain.TefTransactionType(req.TransactionType),
		req.Installments, req.Amount, req.ReceiptMerchant, req.ReceiptCustomer,
	)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusCreated, tx)
}

func (h *Handler) ConfirmTef(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant context ausente", nil)
		return
	}

	var req TefActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	tx, err := h.svc.ConfirmTef(r.Context(), tenantID, req.POSTerminalID, req.NSU)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, tx)
}

func (h *Handler) ReverseTef(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant context ausente", nil)
		return
	}

	var req TefActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	tx, err := h.svc.ReverseTef(r.Context(), tenantID, req.POSTerminalID, req.NSU, req.Reason)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, tx)
}
