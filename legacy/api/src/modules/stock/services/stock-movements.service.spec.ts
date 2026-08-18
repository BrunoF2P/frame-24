jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
  TransactionHost: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementsRepository } from '../repositories/stock-movements.repository';
import { ProductStockRepository } from '../repositories/product-stock.repository';
import { StockMovementTypesRepository } from '../repositories/stock-movement-types.repository';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { LoggerService } from 'src/common/services/logger.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import {
  InsufficientStockException,
  ProductNotFoundException,
  MovementTypeNotFoundException,
} from '../exceptions/stock.exceptions';

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let stockMovementsRepository: jest.Mocked<StockMovementsRepository>;
  let productStockRepository: jest.Mocked<ProductStockRepository>;
  let stockMovementTypesRepository: jest.Mocked<StockMovementTypesRepository>;
  let productsRepository: jest.Mocked<ProductRepository>;
  let cinemaComplexesRepository: jest.Mocked<CinemaComplexesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        {
          provide: TenantContextService,
          useValue: {
            getCompanyId: jest.fn().mockReturnValue('company-1'),
            getUserId: jest.fn().mockReturnValue('user-1'),
          },
        },
        {
          provide: StockMovementsRepository,
          useValue: {
            findById: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: ProductStockRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: StockMovementTypesRepository,
          useValue: {
            findByIdOrName: jest.fn(),
          },
        },
        {
          provide: ProductRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: CinemaComplexesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: RabbitMQPublisherService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
    stockMovementsRepository = module.get(StockMovementsRepository);
    productStockRepository = module.get(ProductStockRepository);
    stockMovementTypesRepository = module.get(StockMovementTypesRepository);
    productsRepository = module.get(ProductRepository);
    cinemaComplexesRepository = module.get(CinemaComplexesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockDto = {
      product_id: 'product-1',
      complex_id: 'complex-1',
      movement_type: 'ENTRADA',
      quantity: 10,
    };

    beforeEach(() => {
      cinemaComplexesRepository.findById.mockResolvedValue({
        id: 'complex-1',
        company_id: 'company-1',
      } as any);
    });

    it('should throw ProductNotFoundException when product not found', async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.create(mockDto)).rejects.toThrow(
        ProductNotFoundException,
      );
    });

    it('should throw MovementTypeNotFoundException when movement type not found', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-1',
        name: 'Product 1',
      } as any);

      stockMovementTypesRepository.findByIdOrName.mockResolvedValue(null);

      await expect(service.create(mockDto)).rejects.toThrow(
        MovementTypeNotFoundException,
      );
    });

    it('should throw InsufficientStockException when stock is insufficient', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-1',
        name: 'Product 1',
      } as any);

      stockMovementTypesRepository.findByIdOrName.mockResolvedValue({
        id: 'type-1',
        operation_type: 'SAIDA',
        affects_stock: true,
      } as any);

      productStockRepository.findById.mockResolvedValue({
        id: 'stock-1',
        current_quantity: 5,
      } as any);

      await expect(
        service.create({ ...mockDto, quantity: 10 }),
      ).rejects.toThrow(InsufficientStockException);
    });

    it('should create movement for ENTRADA type', async () => {
      productsRepository.findById.mockResolvedValue({
        id: 'product-1',
        name: 'Product 1',
        minimum_stock: 10,
      } as any);

      stockMovementTypesRepository.findByIdOrName.mockResolvedValue({
        id: 'type-1',
        operation_type: 'ENTRADA',
        affects_stock: true,
      } as any);

      productStockRepository.findById.mockResolvedValue({
        id: 'stock-1',
        current_quantity: 5,
      } as any);

      stockMovementsRepository.create.mockResolvedValue({
        id: 'movement-1',
        quantity: 10,
        previous_quantity: 5,
        current_quantity: 15,
        movement_date: new Date('2026-01-01T00:00:00.000Z'),
      } as any);

      const result = await service.create(mockDto);

      expect(result).toBeDefined();
      expect(stockMovementsRepository.create).toHaveBeenCalled();
      expect(productStockRepository.update).toHaveBeenCalledWith(
        'product-1',
        'complex-1',
        expect.objectContaining({
          current_quantity: 15,
        }),
      );
    });
  });
});
