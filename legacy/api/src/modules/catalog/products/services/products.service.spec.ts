import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from 'src/common/services/logger.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { StorageService } from 'src/modules/storage/storage.service';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductsService } from './products.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: jest.Mocked<ProductRepository>;
  let categoryRepo: jest.Mocked<ProductCategoryRepository>;
  let logger: jest.Mocked<LoggerService>;
  let storageService: jest.Mocked<StorageService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    productRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCategory: jest.fn(),
      search: jest.fn(),
      findByBarcode: jest.fn(),
      findByProductCode: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
      findLastByCategory: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    categoryRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ProductCategoryRepository>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');

    service = new ProductsService(
      productRepo,
      categoryRepo,
      logger,
      storageService,
      tenantContext,
    );
  });

  it('should throw when category does not exist on create', async () => {
    categoryRepo.findById.mockResolvedValue(null);

    await expect(
      service.create({
        category_id: 'cat-1',
        name: 'Pipoca',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw conflict when barcode already exists', async () => {
    categoryRepo.findById.mockResolvedValue({
      id: 'cat-1',
      name: 'Bebidas',
    } as never);
    productRepo.findLastByCategory.mockResolvedValue(null);
    productRepo.findByBarcode.mockResolvedValue({ id: 'prod-1' } as never);

    await expect(
      service.create({
        category_id: 'cat-1',
        name: 'Água',
        barcode: '123',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('should create product with generated code and uploaded image', async () => {
    categoryRepo.findById.mockResolvedValue({
      id: 'cat-1',
      name: 'Bebidas',
    } as never);
    productRepo.findLastByCategory.mockResolvedValue({
      product_code: 'BEB-0012',
    } as never);
    productRepo.findByBarcode.mockResolvedValue(null);
    storageService.uploadFile.mockResolvedValue('https://cdn/products/new.png');
    productRepo.create.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      category_id: 'cat-1',
      product_code: 'BEB-0013',
      name: 'Refrigerante',
      description: null,
      image_url: 'https://cdn/products/new.png',
      ncm_code: null,
      unit: 'UN',
      minimum_stock: 10,
      supplier_id: null,
      barcode: '789',
      is_available_online: true,
      active: true,
      created_at: new Date('2026-03-01T00:00:00.000Z'),
    } as never);

    const result = await service.create(
      {
        category_id: 'cat-1',
        name: 'Refrigerante',
        unit: 'UN',
        minimum_stock: 10,
        barcode: '789',
        is_available_online: true,
        active: true,
      } as any,
      { originalname: 'new.png' } as Express.Multer.File,
    );

    expect(productRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        product_code: 'BEB-0013',
        image_url: 'https://cdn/products/new.png',
      }),
    );
    expect(result.product_code).toBe('BEB-0013');
  });

  it('should throw not found on findOne when product does not exist', async () => {
    productRepo.findById.mockResolvedValue(null);

    await expect(service.findOne('prod-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return mapped product in findOne', async () => {
    productRepo.findById.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      category_id: 'cat-1',
      product_code: 'BEB-0001',
      name: 'Água',
      description: null,
      image_url: null,
      ncm_code: null,
      unit: 'UN',
      minimum_stock: 5,
      supplier_id: null,
      barcode: null,
      is_available_online: true,
      active: true,
      created_at: new Date('2026-03-01T00:00:00.000Z'),
      product_categories: { name: 'Bebidas' },
    } as never);

    const result = await service.findOne('prod-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'prod-1',
        category_name: 'Bebidas',
      }),
    );
  });

  it('should map list results in findAll', async () => {
    productRepo.findAll.mockResolvedValue([
      {
        id: 'prod-1',
        company_id: 'company-1',
        category_id: 'cat-1',
        product_code: 'BEB-0001',
        name: 'Água',
        description: null,
        image_url: null,
        ncm_code: null,
        unit: 'UN',
        minimum_stock: 5,
        supplier_id: null,
        barcode: null,
        is_available_online: true,
        active: true,
        created_at: new Date('2026-03-01T00:00:00.000Z'),
        product_categories: { name: 'Bebidas' },
      },
    ] as never);

    const result = await service.findAll(true);

    expect(productRepo.findAll).toHaveBeenCalledWith('company-1', true);
    expect(result[0].category_name).toBe('Bebidas');
  });

  it('should update product and replace old image when file is sent', async () => {
    productRepo.findById.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      category_id: 'cat-1',
      product_code: 'BEB-0013',
      name: 'Refrigerante',
      image_url: 'https://cdn/products/old.png',
      product_categories: { name: 'Bebidas' },
    } as never);
    storageService.uploadFile.mockResolvedValue('https://cdn/products/new.png');
    productRepo.update.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      category_id: 'cat-1',
      product_code: 'BEB-0013',
      name: 'Refrigerante Zero',
      description: null,
      image_url: 'https://cdn/products/new.png',
      ncm_code: null,
      unit: 'UN',
      minimum_stock: 10,
      supplier_id: null,
      barcode: '789',
      is_available_online: true,
      active: true,
      created_at: new Date('2026-03-01T00:00:00.000Z'),
    } as never);

    const result = await service.update(
      'prod-1',
      { name: 'Refrigerante Zero' } as any,
      { originalname: 'new.png' } as Express.Multer.File,
    );

    expect(storageService.deleteFile).toHaveBeenCalledWith(
      'https://cdn/products/old.png',
    );
    expect(storageService.uploadFile).toHaveBeenCalled();
    expect(productRepo.update).toHaveBeenCalled();
    expect(result.name).toBe('Refrigerante Zero');
  });

  it('should throw not found on update when product does not exist', async () => {
    productRepo.findById.mockResolvedValue(null);

    await expect(
      service.update('prod-404', { name: 'x' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw bad request on update when new category does not exist', async () => {
    productRepo.findById.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      category_id: 'cat-1',
      product_code: 'BEB-0010',
      barcode: '789',
      name: 'Produto',
      product_categories: { name: 'Bebidas' },
    } as never);
    categoryRepo.findById.mockResolvedValue(null);

    await expect(
      service.update('prod-1', { category_id: 'cat-2' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should support soft and hard delete paths', async () => {
    productRepo.findById.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      name: 'Produto',
    } as never);

    await service.delete('prod-1', true);
    await service.delete('prod-1', false);

    expect(productRepo.softDelete).toHaveBeenCalledWith('prod-1');
    expect(productRepo.delete).toHaveBeenCalledWith('prod-1');
  });

  it('should throw not found on delete when product does not exist', async () => {
    productRepo.findById.mockResolvedValue(null);

    await expect(service.delete('prod-404')).rejects.toThrow(NotFoundException);
  });

  it('should list products by category when category exists', async () => {
    categoryRepo.findById.mockResolvedValue({
      id: 'cat-1',
      name: 'Bebidas',
    } as never);
    productRepo.findByCategory.mockResolvedValue([
      {
        id: 'prod-1',
        company_id: 'company-1',
        category_id: 'cat-1',
        product_code: 'BEB-0001',
        name: 'Água',
        description: null,
        image_url: null,
        ncm_code: null,
        unit: 'UN',
        minimum_stock: 5,
        supplier_id: null,
        barcode: null,
        is_available_online: true,
        active: true,
        created_at: new Date('2026-03-01T00:00:00.000Z'),
      },
    ] as never);

    const result = await service.findByCategory('cat-1');

    expect(productRepo.findByCategory).toHaveBeenCalledWith(
      'cat-1',
      'company-1',
      undefined,
    );
    expect(result[0].category_name).toBe('Bebidas');
  });

  it('should throw when filtering by unknown category', async () => {
    categoryRepo.findById.mockResolvedValue(null);

    await expect(service.findByCategory('cat-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should search products and map category name from relation', async () => {
    productRepo.search.mockResolvedValue([
      {
        id: 'prod-1',
        company_id: 'company-1',
        category_id: 'cat-1',
        product_code: 'BEB-0001',
        name: 'Água',
        description: null,
        image_url: null,
        ncm_code: null,
        unit: 'UN',
        minimum_stock: 5,
        supplier_id: null,
        barcode: null,
        is_available_online: true,
        active: true,
        created_at: new Date('2026-03-01T00:00:00.000Z'),
        product_categories: { name: 'Bebidas' },
      },
    ] as never);

    const result = await service.search('agu');

    expect(productRepo.search).toHaveBeenCalledWith(
      'company-1',
      'agu',
      undefined,
    );
    expect(result[0].category_name).toBe('Bebidas');
  });

  it('should block update when new product code already exists', async () => {
    productRepo.findById.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      category_id: 'cat-1',
      product_code: 'BEB-0010',
      barcode: '789',
      name: 'Produto',
      product_categories: { name: 'Bebidas' },
    } as never);
    productRepo.findByProductCode.mockResolvedValue({ id: 'prod-2' } as never);

    await expect(
      service.update('prod-1', { product_code: 'BEB-0099' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('should block update when new barcode already exists', async () => {
    productRepo.findById.mockResolvedValue({
      id: 'prod-1',
      company_id: 'company-1',
      category_id: 'cat-1',
      product_code: 'BEB-0010',
      barcode: '789',
      name: 'Produto',
      product_categories: { name: 'Bebidas' },
    } as never);
    productRepo.findByBarcode.mockResolvedValue({ id: 'prod-2' } as never);

    await expect(
      service.update('prod-1', { barcode: '999' } as any),
    ).rejects.toThrow(ConflictException);
  });
});
