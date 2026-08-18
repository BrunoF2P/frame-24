package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword gera o hash seguro da senha usando bcrypt com custo 12
func HashPassword(password string) (string, error) {
	if len(password) < 6 {
		return "", fmt.Errorf("senha deve ter no minimo 6 caracteres")
	}
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", fmt.Errorf("falha ao criptografar senha: %w", err)
	}
	return string(bytes), nil
}

// CheckPassword compara a senha em texto claro com o hash bcrypt
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
