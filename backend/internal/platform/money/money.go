package money

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Cents é um valor monetário exato em centavos (int64).
// Nunca use float64 para dinheiro: aritmética binária de ponto flutuante
// introduz erros de arredondamento que quebram conciliação financeira.
type Cents int64

const (
	Zero    Cents = 0
	OneCent Cents = 1
)

// Add soma dois valores em centavos.
func (c Cents) Add(o Cents) Cents { return c + o }

// Sub subtrai o valor informado.
func (c Cents) Sub(o Cents) Cents { return c - o }

// Neg inverte o sinal do valor.
func (c Cents) Neg() Cents { return -c }

// Abs retorna o valor absoluto.
func (c Cents) Abs() Cents {
	if c < 0 {
		return -c
	}
	return c
}

// Mul multiplica por um inteiro.
func (c Cents) Mul(n int64) Cents { return c * Cents(n) }

// Div divide por um inteiro (divisão truncada; use Allocate para rateios).
func (c Cents) Div(n int64) Cents {
	if n == 0 {
		return 0
	}
	return c / Cents(n)
}

// MulQuantityToCents computa o total em centavos a partir de um preço unitário
// e uma quantidade (float64, ex: 2.5), usando aritmética inteira exata com
// arredondamento half-up no resultado final.
func (c Cents) MulQuantityToCents(q float64) Cents {
	q4 := int64(math.Round(q * 10000))
	return Cents((int64(c)*q4 + 5000) / 10000)
}

// Percentage calcula c * percent / 10000, onde percent é a porcentagem em
// pontos-base (ex: 13.59% = 1359), com arredondamento half-up.
func (c Cents) Percentage(percentBps int64) Cents {
	if c == 0 {
		return 0
	}
	return Cents((int64(c)*percentBps + 5000) / 10000)
}

// MulRate multiplica por uma taxa decimal expressa em partes por milhão
// (ex: 13.59% = 135900), com arredondamento half-up para o centavo.
func (c Cents) MulRate(ratePPM int64) Cents {
	if c == 0 {
		return 0
	}
	return Cents((int64(c)*ratePPM + 500000) / 1000000)
}

// ToFloat64 converte para o equivalente decimal em reais (apenas apresentação).
func (c Cents) ToFloat64() float64 { return float64(c) / 100 }

// Float64 é um alias de ToFloat64 para uso em marshaling de exibição.
func (c Cents) Float64() float64 { return c.ToFloat64() }

// IsPositive indica valor maior que zero.
func (c Cents) IsPositive() bool { return c > 0 }

// IsNegative indica valor menor que zero.
func (c Cents) IsNegative() bool { return c < 0 }

// IsZero indica valor igual a zero.
func (c Cents) IsZero() bool { return c == 0 }

// String formata como decimal de 2 casas ("12.50").
func (c Cents) String() string {
	neg := c < 0
	v := int64(c)
	if neg {
		v = -v
	}
	s := fmt.Sprintf("%d.%02d", v/100, v%100)
	if neg {
		return "-" + s
	}
	return s
}

// MarshalJSON serializa como número decimal ("12.5") preservando o contrato da API.
func (c Cents) MarshalJSON() ([]byte, error) {
	return json.Marshal(c.ToFloat64())
}

// UnmarshalJSON aceita número decimal ou string decimal; o resultado é sempre em centavos.
func (c *Cents) UnmarshalJSON(data []byte) error {
	s := strings.TrimSpace(string(data))
	if s == "" || s == "null" {
		*c = 0
		return nil
	}
	if s[0] == '"' {
		var str string
		if err := json.Unmarshal(data, &str); err != nil {
			return err
		}
		v, err := Parse(str)
		if err != nil {
			return err
		}
		*c = v
		return nil
	}
	var f float64
	if err := json.Unmarshal(data, &f); err != nil {
		return err
	}
	*c = FromFloat64(f)
	return nil
}

// FromFloat64 converte um decimal em centavos com arredondamento half-up.
func FromFloat64(f float64) Cents {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}
	return Cents(math.Round(f * 100))
}

// Parse interpreta uma string decimal ("12.50", "12,50" ou "-3") em centavos,
// arredondando half-up quando houver mais de 2 casas decimais.
func Parse(s string) (Cents, error) {
	whole, frac, err := parseFixed(s, 2)
	if err != nil {
		return 0, err
	}
	cents := whole*100 + frac
	if cents < 0 {
		return Cents(cents), nil
	}
	return Cents(cents), nil
}

// Subcent é um valor exato em décimos de milésimo de real (1e-4), usado para
// custos unitários e rateios que exigem precisão sub-centavo.
type Subcent int64

// SubcentFromFloat64 converte um decimal em décimos de milésimo com half-up.
func SubcentFromFloat64(f float64) Subcent {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}
	return Subcent(math.Round(f * 10000))
}

func (s Subcent) Add(o Subcent) Subcent { return s + o }
func (s Subcent) Sub(o Subcent) Subcent { return s - o }
func (s Subcent) Mul(n int64) Subcent   { return s * Subcent(n) }

// ToFloat64 converte para o equivalente decimal em reais.
func (s Subcent) ToFloat64() float64 { return float64(s) / 10000 }

// MulQuantityToCents computa custo total em centavos a partir de uma quantidade
// (float64, ex: 2.5), usando aritmética inteira exata com arredondamento final.
func (s Subcent) MulQuantityToCents(q float64) Cents {
	q4 := int64(math.Round(q * 10000))
	return Cents((int64(s)*q4 + 500000) / 1000000)
}

// MarshalJSON serializa como número decimal de 4 casas.
func (s Subcent) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.ToFloat64())
}

// UnmarshalJSON aceita número decimal ou string decimal.
func (s *Subcent) UnmarshalJSON(data []byte) error {
	raw := strings.TrimSpace(string(data))
	if raw == "" || raw == "null" {
		*s = 0
		return nil
	}
	if raw[0] == '"' {
		var str string
		if err := json.Unmarshal(data, &str); err != nil {
			return err
		}
		whole, frac, err := parseFixed(str, 4)
		if err != nil {
			return err
		}
		*s = Subcent(whole*10000 + frac)
		return nil
	}
	var f float64
	if err := json.Unmarshal(data, &f); err != nil {
		return err
	}
	*s = SubcentFromFloat64(f)
	return nil
}

// parseFixed interpreta uma string decimal em (parte inteira, parte fracionária
// na escala informada) com arredondamento half-up no dígito seguinte à escala.
func parseFixed(s string, scale int64) (whole int64, frac int64, err error) {
	s = strings.TrimSpace(strings.ReplaceAll(s, ",", "."))
	if s == "" || s == "." {
		return 0, 0, fmt.Errorf("valor monetario invalido: %q", s)
	}
	neg := false
	if s[0] == '-' {
		neg = true
		s = s[1:]
	}
	parts := strings.SplitN(s, ".", 2)
	whole, err = strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("valor monetario invalido: %q", s)
	}
	frac = 0
	if len(parts) == 2 {
		fr := parts[1]
		digits := 0
		for i := 0; i < len(fr) && digits < int(scale); i++ {
			ch := fr[i]
			if ch < '0' || ch > '9' {
				return 0, 0, fmt.Errorf("valor monetario invalido: %q", s)
			}
			frac = frac*10 + int64(ch-'0')
			digits++
		}
		for digits < int(scale) {
			frac *= 10
			digits++
		}
		if len(fr) > int(scale) && fr[int(scale)] >= '5' {
			frac++
			if frac >= int64(math.Pow10(int(scale))) {
				frac = 0
				whole++
			}
		}
	}
	if neg {
		whole = -whole
		frac = -frac
	}
	return whole, frac, nil
}
