import { BadRequestException } from '@nestjs/common';

export class Cpf {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(cpf: string): Cpf {
    const normalized = cpf.replace(/\D/g, '');

    if (normalized.length !== 11) {
      throw new BadRequestException('CPF deve conter 11 dígitos');
    }

    if (!this.isValid(normalized)) {
      throw new BadRequestException('CPF inválido');
    }

    return new Cpf(normalized);
  }

  private static isValid(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    // Validação do dígito verificador
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.substring(10, 11));
  }

  get value(): string {
    return this._value;
  }

  formatted(): string {
    return this._value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  toString(): string {
    return this._value;
  }
}
