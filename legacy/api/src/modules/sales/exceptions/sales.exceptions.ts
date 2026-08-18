import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

export class SeatAlreadyOccupiedException extends ConflictException {
  constructor(seatCode: string) {
    super(`Assento ${seatCode} já está ocupado`);
  }
}

export class ShowtimeNotFoundException extends NotFoundException {
  constructor(showtimeId: string) {
    super(`Sessão ${showtimeId} não encontrada`);
  }
}

export class ShowtimeAlreadyStartedException extends BadRequestException {
  constructor() {
    super('Não é possível vender ingressos para uma sessão que já começou');
  }
}

export class ProductPriceNotFoundException extends NotFoundException {
  constructor(productName: string) {
    super(`Preço não encontrado para o produto ${productName}`);
  }
}

export class ComboNotFoundException extends NotFoundException {
  constructor(comboId: string) {
    super(`Combo ${comboId} não encontrado`);
  }
}

export class InvalidSaleException extends BadRequestException {
  constructor(message: string) {
    super(`Venda inválida: ${message}`);
  }
}
