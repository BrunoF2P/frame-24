import { BadRequestException, NotFoundException } from '@nestjs/common';

export class InsufficientStockException extends BadRequestException {
  constructor(productName: string, requested: number, available: number) {
    super(
      `Estoque insuficiente para ${productName}. Solicitado: ${requested}, Disponível: ${available}`,
    );
  }
}

export class ProductNotFoundException extends NotFoundException {
  constructor(productId: string) {
    super(`Produto ${productId} não encontrado`);
  }
}

export class StockNotFoundException extends NotFoundException {
  constructor(productId: string, complexId: string) {
    super(
      `Estoque não encontrado para produto ${productId} no complexo ${complexId}`,
    );
  }
}

export class InvalidMovementTypeException extends BadRequestException {
  constructor(movementType: string) {
    super(`Tipo de movimentação inválido: ${movementType}`);
  }
}

export class MovementTypeNotFoundException extends NotFoundException {
  constructor(movementTypeId: string) {
    super(`Tipo de movimentação ${movementTypeId} não encontrado`);
  }
}
