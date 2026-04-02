import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { stock_movements } from '@repo/db';
import { StockMovementsRepository } from '../repositories/stock-movements.repository';
import { ProductStockRepository } from '../repositories/product-stock.repository';
import { StockMovementTypesRepository } from '../repositories/stock-movement-types.repository';
import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { StockMovementResponseDto } from '../dto/stock-movement-response.dto';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { LoggerService } from 'src/common/services/logger.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import {
  InsufficientStockException,
  ProductNotFoundException,
  MovementTypeNotFoundException,
} from '../exceptions/stock.exceptions';

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly productStockRepository: ProductStockRepository,
    private readonly stockMovementTypesRepository: StockMovementTypesRepository,
    private readonly productsRepository: ProductRepository,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly logger: LoggerService,
    private readonly rabbitmq: RabbitMQPublisherService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(filters?: {
    product_id?: string;
    complex_id?: string;
    movement_type?: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<StockMovementResponseDto[]> {
    const movements = await this.stockMovementsRepository.findAll(
      this.tenantContext.getCompanyId(),
      filters,
    );

    return movements.map((movement) => this.mapToDto(movement));
  }

  async findOne(id: string): Promise<StockMovementResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const movement = await this.stockMovementsRepository.findById(id);

    if (!movement) {
      throw new NotFoundException('Movimentação não encontrada');
    }

    // Validar que o produto pertence à empresa
    const product = await this.productsRepository.findById(
      movement.product_id,
      companyId,
    );
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.mapToDto(movement);
  }

  @Transactional()
  async create(dto: CreateStockMovementDto): Promise<StockMovementResponseDto> {
    const company_id = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getUserId();

    // Validar produto
    const product = await this.productsRepository.findById(
      dto.product_id,
      company_id,
    );
    if (!product) {
      throw new ProductNotFoundException(dto.product_id);
    }

    // Validar complexo
    const complex = await this.cinemaComplexesRepository.findById(
      dto.complex_id,
    );
    if (!complex || complex.company_id !== company_id) {
      throw new NotFoundException('Complexo de cinema não encontrado');
    }

    // Buscar tipo de movimentação
    const movementType = await this.stockMovementTypesRepository.findByIdOrName(
      dto.movement_type,
      company_id,
    );

    if (!movementType) {
      throw new MovementTypeNotFoundException(dto.movement_type);
    }

    // Verificar se o tipo de movimentação afeta estoque
    if (movementType.affects_stock === false) {
      // Se não afeta estoque, apenas registra a movimentação sem alterar quantidade
      const movement = await this.stockMovementsRepository.create({
        product_id: dto.product_id,
        complex_id: dto.complex_id,
        stock_movement_types: { connect: { id: movementType.id } },
        quantity: dto.quantity,
        previous_quantity: 0,
        current_quantity: 0,
        ...(dto.unit_value && { unit_value: dto.unit_value }),
        ...(dto.origin_type && { origin_type: dto.origin_type }),
        ...(dto.origin_id && { origin_id: dto.origin_id }),
        user_id: userId,
        observations: dto.observations,
        movement_date: new Date(),
      });

      return this.mapToDto(movement);
    }

    // Buscar ou criar estoque do produto
    let stock = await this.productStockRepository.findById(
      dto.product_id,
      dto.complex_id,
    );

    if (!stock) {
      stock = await this.productStockRepository.create({
        product_id: dto.product_id,
        complex_id: dto.complex_id,
        current_quantity: 0,
        minimum_quantity: product.minimum_stock || 10,
        maximum_quantity: 100,
        active: true,
      });
    }

    const previousQuantity = stock.current_quantity || 0;
    let newQuantity = previousQuantity;

    // Determinar se é ENTRADA ou SAÍDA baseado no operation_type
    const operationType = movementType.operation_type?.toUpperCase();

    if (operationType === 'ENTRADA' || operationType === 'IN') {
      // Movimentação de entrada - sempre soma
      newQuantity = previousQuantity + Math.abs(dto.quantity);
    } else if (operationType === 'SAIDA' || operationType === 'OUT') {
      // Movimentação de saída - sempre subtrai
      const quantityToSubtract = Math.abs(dto.quantity);
      if (previousQuantity < quantityToSubtract) {
        throw new InsufficientStockException(
          product.name,
          quantityToSubtract,
          previousQuantity,
        );
      }
      newQuantity = previousQuantity - quantityToSubtract;
    } else {
      // Se não especificado, usa o sinal do quantity
      // Positivo = entrada, Negativo = saída
      newQuantity = previousQuantity + dto.quantity;
      if (newQuantity < 0) {
        throw new InsufficientStockException(
          product.name,
          Math.abs(dto.quantity),
          previousQuantity,
        );
      }
    }

    // Criar movimentação
    const totalValue = dto.unit_value
      ? dto.unit_value * Math.abs(dto.quantity)
      : null;

    const movement = await this.stockMovementsRepository.create({
      product_id: dto.product_id,
      complex_id: dto.complex_id,
      stock_movement_types: { connect: { id: movementType.id } },
      quantity: dto.quantity,
      previous_quantity: previousQuantity,
      current_quantity: newQuantity,
      ...(dto.unit_value && { unit_value: dto.unit_value }),
      ...(totalValue && { total_value: totalValue }),
      ...(dto.origin_type && { origin_type: dto.origin_type }),
      ...(dto.origin_id && { origin_id: dto.origin_id }),
      user_id: userId,
      observations: dto.observations,
      movement_date: new Date(),
    });

    // Atualizar estoque
    await this.productStockRepository.update(dto.product_id, dto.complex_id, {
      current_quantity: newQuantity,
    });

    // Verificar se está abaixo do mínimo
    if (newQuantity <= (stock.minimum_quantity || 0)) {
      await this.rabbitmq.publish({
        pattern: 'stock.low_stock_alert',
        data: {
          product_id: dto.product_id,
          complex_id: dto.complex_id,
          current_quantity: newQuantity,
          minimum_quantity: stock.minimum_quantity,
        },
        metadata: { companyId: company_id },
      });

      this.logger.warn(
        `Estoque baixo: Produto ${product.name} - ${newQuantity} unidades (mínimo: ${stock.minimum_quantity})`,
        StockMovementsService.name,
      );
    }

    // Publicar evento
    await this.rabbitmq.publish({
      pattern: 'audit.stock.movement.created',
      data: {
        id: movement.id,
        values: movement,
      },
      metadata: { companyId: company_id, userId },
    });

    this.logger.log(
      `Movimentação de estoque: ${product.name} - ${dto.quantity > 0 ? '+' : ''}${dto.quantity} unidades`,
      StockMovementsService.name,
    );

    return this.mapToDto(movement);
  }

  private mapToDto(movement: stock_movements): StockMovementResponseDto {
    return {
      id: movement.id,
      product_id: movement.product_id,
      complex_id: movement.complex_id,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      previous_quantity: movement.previous_quantity,
      current_quantity: movement.current_quantity,
      unit_value: movement.unit_value?.toString(),
      total_value: movement.total_value?.toString(),
      origin_type: movement.origin_type ?? undefined,
      origin_id: movement.origin_id ?? undefined,
      movement_date:
        movement.movement_date?.toISOString() || new Date().toISOString(),
      created_at:
        movement.created_at?.toISOString() || new Date().toISOString(),
    };
  }
}
