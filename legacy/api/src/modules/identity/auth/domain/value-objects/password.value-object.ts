import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export class Password {
  private readonly _hash: string;
  private static readonly SALT_ROUNDS = 10;
  private static readonly MIN_LENGTH = 8;

  private constructor(hash: string) {
    this._hash = hash;
  }

  static async create(plainPassword: string): Promise<Password> {
    if (!plainPassword || plainPassword.length < this.MIN_LENGTH) {
      throw new BadRequestException(
        `Senha deve ter no mínimo ${this.MIN_LENGTH} caracteres`,
      );
    }

    if (!/[A-Z]/.test(plainPassword)) {
      throw new BadRequestException(
        'Senha deve conter ao menos uma letra maiúscula',
      );
    }

    if (!/[a-z]/.test(plainPassword)) {
      throw new BadRequestException(
        'Senha deve conter ao menos uma letra minúscula',
      );
    }

    if (!/[0-9]/.test(plainPassword)) {
      throw new BadRequestException('Senha deve conter ao menos um número');
    }

    const hash = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
    return new Password(hash);
  }

  static fromHash(hash: string): Password {
    return new Password(hash);
  }

  async compare(plainPassword: string): Promise<boolean> {
    if (!plainPassword || plainPassword.trim() === '') {
      return false;
    }

    if (!this.hash || this.hash.trim() === '') {
      return false;
    }

    return bcrypt.compare(plainPassword, this.hash);
  }

  get hash(): string {
    return this._hash;
  }
}
