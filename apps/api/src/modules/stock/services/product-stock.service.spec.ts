import { NotFoundException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { ProductStockRepository } from '../repositories/product-stock.repository';
import { ProductStockService } from './product-stock.service';

describe('ProductStockService', () => {
  let service: ProductStockService;
  let productStockRepository: jest.Mocked<ProductStockRepository>;
  let productsRepository: jest.Mocked<ProductRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    productStockRepository = {
      findByComplexId: jest.fn(),
      findById: jest.fn(),
      findLowStock: jest.fn(),
    } as unknown as jest.Mocked<ProductStockRepository>;

    productsRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');

    service = new ProductStockService(
      productStockRepository,
      productsRepository,
      tenantContext,
    );
  });

  it('should return empty list when findAll is called without complex_id', async () => {
    const result = await service.findAll();

    expect(result).toEqual([]);
    expect(productStockRepository.findByComplexId).not.toHaveBeenCalled();
  });

  it('should list stock by complex and map low-stock flag', async () => {
    productStockRepository.findByComplexId.mockResolvedValue([
      {
        id: 'ps-1',
        product_id: 'p-1',
        complex_id: 'c-1',
        current_quantity: 5,
        minimum_quantity: 10,
        maximum_quantity: 100,
        active: true,
        created_at: new Date('2026-03-01'),
        updated_at: new Date('2026-03-02'),
      },
    ] as never);

    const result = await service.findAll('c-1');

    expect(productStockRepository.findByComplexId).toHaveBeenCalledWith(
      'c-1',
      'company-1',
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'ps-1',
        is_low_stock: true,
      }),
    );
  });

  it('should return stock with fallback defaults when stock row does not exist but product exists', async () => {
    productStockRepository.findById.mockResolvedValue(null);
    productsRepository.findById.mockResolvedValue({
      minimum_stock: 12,
    } as never);

    const result = await service.findOne('p-1', 'c-1');

    expect(result).toEqual(
      expect.objectContaining({
        product_id: 'p-1',
        complex_id: 'c-1',
        current_quantity: 0,
        minimum_quantity: 12,
        is_low_stock: true,
      }),
    );
  });

  it('should throw not found when product does not exist and stock row is absent', async () => {
    productStockRepository.findById.mockResolvedValue(null);
    productsRepository.findById.mockResolvedValue(null);

    await expect(service.findOne('p-404', 'c-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should list low stock from repository mapping response shape', async () => {
    productStockRepository.findLowStock.mockResolvedValue([
      {
        id: 'ps-2',
        product_id: 'p-2',
        complex_id: 'c-2',
        current_quantity: 1,
        minimum_quantity: 1,
        maximum_quantity: 50,
        active: true,
        created_at: new Date('2026-03-01'),
        updated_at: new Date('2026-03-02'),
      },
    ] as never);

    const result = await service.findLowStock('c-2');

    expect(productStockRepository.findLowStock).toHaveBeenCalledWith(
      'company-1',
      'c-2',
    );
    expect(result).toHaveLength(1);
    expect(result[0].is_low_stock).toBe(true);
  });
});
