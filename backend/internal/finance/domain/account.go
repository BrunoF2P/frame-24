package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type AccountType string

const (
	AccountTypeAsset     AccountType = "asset"     // Ativo (1.x)
	AccountTypeLiability AccountType = "liability" // Passivo (2.x)
	AccountTypeEquity    AccountType = "equity"    // Patrimônio Líquido (3.x)
	AccountTypeRevenue   AccountType = "revenue"   // Receitas (4.x)
	AccountTypeExpense   AccountType = "expense"   // Despesas e Custos (5.x)
)

// Códigos do Plano de Contas Padrão
const (
	CodeCaixaPDV              = "1.1.1.01"
	CodeAdquirentesCartao     = "1.1.2.01"
	CodeRecebiveisPIX         = "1.1.2.02"
	CodeEstoqueMercadorias    = "1.1.3.01"
	CodeCBSRetencaoSplit      = "2.1.2.01" // Split Payment CBS (2027)
	CodeIBSRetencaoSplit      = "2.1.2.02" // Split Payment IBS (2027)
	CodeReceitaBilheteria     = "4.1.1.01"
	CodeReceitaBomboniere     = "4.1.2.01"
	CodeReceitaSobrasCaixa    = "4.1.9.01"
	CodeCMV                   = "5.1.1.01" // Custo das Mercadorias Vendidas
	CodeTaxasAdquirencia      = "5.2.1.01" // Taxas de Cartão/MDR
	CodeDespesaQuebraCaixa    = "5.2.9.01"
)

func IsValidAccountType(t string) bool {
	switch AccountType(strings.ToLower(strings.TrimSpace(t))) {
	case AccountTypeAsset, AccountTypeLiability, AccountTypeEquity, AccountTypeRevenue, AccountTypeExpense:
		return true
	default:
		return false
	}
}

type Account struct {
	ID          uuid.UUID   `json:"id"`
	TenantID    uuid.UUID   `json:"tenantId"`
	Code        string      `json:"code"`
	Name        string      `json:"name"`
	AccountType AccountType `json:"accountType"`
	IsSystem    bool        `json:"isSystem"`
	CreatedAt   time.Time   `json:"createdAt"`
}

func NewAccount(tenantID uuid.UUID, code, name, accType string, isSystem bool) (*Account, error) {
	cleanCode := strings.TrimSpace(code)
	cleanName := strings.TrimSpace(name)
	if cleanCode == "" || cleanName == "" {
		return nil, ErrInvalidAmount
	}
	if !IsValidAccountType(accType) {
		return nil, ErrInvalidAccountType
	}

	return &Account{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Code:        cleanCode,
		Name:        cleanName,
		AccountType: AccountType(strings.ToLower(strings.TrimSpace(accType))),
		IsSystem:    isSystem,
		CreatedAt:   time.Now(),
	}, nil
}

// GetStandardAccountsTemplate retorna o plano de contas padrão para provisionamento de um novo tenant
func GetStandardAccountsTemplate(tenantID uuid.UUID) []Account {
	now := time.Now()
	return []Account{
		{ID: uuid.New(), TenantID: tenantID, Code: CodeCaixaPDV, Name: "Caixa Geral de PDV", AccountType: AccountTypeAsset, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeAdquirentesCartao, Name: "Adquirentes de Cartão a Receber", AccountType: AccountTypeAsset, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeRecebiveisPIX, Name: "Recebíveis PIX em Conta Transitória", AccountType: AccountTypeAsset, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeEstoqueMercadorias, Name: "Estoque de Mercadorias (Bomboniere)", AccountType: AccountTypeAsset, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeCBSRetencaoSplit, Name: "CBS Retida na Fonte (Split Payment)", AccountType: AccountTypeLiability, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeIBSRetencaoSplit, Name: "IBS Retida na Fonte (Split Payment)", AccountType: AccountTypeLiability, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeReceitaBilheteria, Name: "Receita de Venda de Ingressos", AccountType: AccountTypeRevenue, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeReceitaBomboniere, Name: "Receita de Venda de Bomboniere", AccountType: AccountTypeRevenue, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeReceitaSobrasCaixa, Name: "Receita de Sobras de Caixa", AccountType: AccountTypeRevenue, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeCMV, Name: "Custo das Mercadorias Vendidas (CMV)", AccountType: AccountTypeExpense, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeTaxasAdquirencia, Name: "Taxas de Adquirência (MDR)", AccountType: AccountTypeExpense, IsSystem: true, CreatedAt: now},
		{ID: uuid.New(), TenantID: tenantID, Code: CodeDespesaQuebraCaixa, Name: "Despesa com Quebras de Caixa", AccountType: AccountTypeExpense, IsSystem: true, CreatedAt: now},
	}
}
