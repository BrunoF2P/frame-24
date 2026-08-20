package money

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCents_Parse(t *testing.T) {
	cases := []struct {
		in   string
		want int64
	}{
		{"12.50", 1250},
		{"12,50", 1250},
		{"12.5", 1250},
		{"12", 1200},
		{"0", 0},
		{"-3", -300},
		{"-0.01", -1},
		{"0.005", 1},
		{"1.234", 123},
		{"1.235", 124},
	}
	for _, tc := range cases {
		got, err := Parse(tc.in)
		require.NoError(t, err, tc.in)
		assert.Equal(t, Cents(tc.want), got, tc.in)
	}
}

func TestCents_FromFloat64(t *testing.T) {
	assert.Equal(t, Cents(1250), FromFloat64(12.50))
	assert.Equal(t, Cents(125), FromFloat64(1.249))
	assert.Equal(t, Cents(125), FromFloat64(1.25))
	assert.Equal(t, Cents(0), FromFloat64(0))
}

func TestCents_String(t *testing.T) {
	assert.Equal(t, "12.50", Cents(1250).String())
	assert.Equal(t, "-3.00", Cents(-300).String())
	assert.Equal(t, "0.01", Cents(1).String())
}

func TestCents_Percentage(t *testing.T) {
	assert.Equal(t, Cents(1359), Cents(10000).Percentage(1359))
	assert.Equal(t, Cents(2), Cents(3).Percentage(5000))
}

func TestCents_MulRate(t *testing.T) {
	assert.Equal(t, Cents(1359), Cents(10000).MulRate(135900))
	assert.Equal(t, Cents(2), Cents(3).MulRate(666667))
}

func TestSubcent_MulQuantityToCents(t *testing.T) {
	// custo unitário R$ 0,0132 x qtd 2,5 = R$ 0,033
	sc := SubcentFromFloat64(0.0132)
	assert.Equal(t, Cents(3), sc.MulQuantityToCents(2.5))
	// custo R$ 2,00 x qtd 3 = R$ 6,00
	assert.Equal(t, Cents(600), Subcent(20000).MulQuantityToCents(3))
}

func TestCents_MulQuantityToCents(t *testing.T) {
	// preço R$ 12,50 x qtd 2,5 = R$ 31,25
	assert.Equal(t, Cents(3125), Cents(1250).MulQuantityToCents(2.5))
	// preço R$ 5,00 x qtd 3 = R$ 15,00
	assert.Equal(t, Cents(1500), Cents(500).MulQuantityToCents(3))
}

func TestCents_JSON(t *testing.T) {
	b, err := json.Marshal(Cents(1250))
	require.NoError(t, err)
	assert.Equal(t, "12.5", string(b))

	var c Cents
	require.NoError(t, json.Unmarshal([]byte(`12.5`), &c))
	assert.Equal(t, Cents(1250), c)

	require.NoError(t, json.Unmarshal([]byte(`"12.50"`), &c))
	assert.Equal(t, Cents(1250), c)

	require.NoError(t, json.Unmarshal([]byte(`10`), &c))
	assert.Equal(t, Cents(1000), c)

	require.NoError(t, json.Unmarshal([]byte(`null`), &c))
	assert.Equal(t, Cents(0), c)
}

func TestSubcent_JSON(t *testing.T) {
	b, err := json.Marshal(Subcent(132))
	require.NoError(t, err)
	assert.Equal(t, "0.0132", string(b))

	var s Subcent
	require.NoError(t, json.Unmarshal([]byte(`0.0132`), &s))
	assert.Equal(t, Subcent(132), s)
}
