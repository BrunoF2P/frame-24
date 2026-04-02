import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { products } from '@repo/db';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductResponseDto } from '../dto/product-response.dto';
import { LoggerService } from 'src/common/services/logger.service';
import { StorageService } from 'src/modules/storage/storage.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: ProductCategoryRepository,
    private readonly logger: LoggerService,
    private readonly storageService: StorageService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Transactional()
  async create(
    dto: CreateProductDto,
    file?: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    const companyId = this.tenantContext.getCompanyId();

    const category = await this.categoryRepo.findById(
      dto.category_id,
      companyId,
    );
    if (!category) {
      throw new BadRequestException('Product category not found');
    }

    const product_code = await this.generateProductCode(
      dto.category_id,
      companyId,
    );

    if (dto.barcode) {
      const existingBarcode = await this.productRepo.findByBarcode(
        dto.barcode,
        companyId,
      );
      if (existingBarcode) {
        throw new ConflictException('Barcode already exists');
      }
    }

    // Upload image if provided
    let image_url = dto.image_url;
    if (file) {
      image_url = await this.storageService.uploadFile(file, 'products');
    }

    const product = await this.productRepo.create({
      company_id: companyId,
      product_categories: { connect: { id: dto.category_id } },
      product_code,
      name: dto.name,
      description: dto.description,
      image_url,
      ncm_code: dto.ncm_code,
      unit: dto.unit,
      minimum_stock: dto.minimum_stock,
      supplier_id: dto.supplier_id,
      barcode: dto.barcode,
      is_available_online: dto.is_available_online,
      active: dto.active,
    });

    this.logger.log(
      `Product created: ${product.name} (${product_code})`,
      ProductsService.name,
    );

    return this.mapToDto(product, category.name);
  }

  async findAll(active?: boolean): Promise<ProductResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    const products = await this.productRepo.findAll(companyId, active);

    return products.map((product) =>
      this.mapToDto(product, product.product_categories?.name),
    );
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const product = await this.productRepo.findById(id, companyId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.mapToDto(product, product.product_categories?.name);
  }

  async findByCategory(
    category_id: string,
    active?: boolean,
  ): Promise<ProductResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    const category = await this.categoryRepo.findById(category_id, companyId);
    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    const products = await this.productRepo.findByCategory(
      category_id,
      companyId,
      active,
    );

    return products.map((product) => this.mapToDto(product, category.name));
  }

  async search(
    searchTerm: string,
    active?: boolean,
  ): Promise<ProductResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    const products = await this.productRepo.search(
      companyId,
      searchTerm,
      active,
    );

    return products.map((product) =>
      this.mapToDto(product, product.product_categories?.name),
    );
  }

  @Transactional()
  async update(
    id: string,
    dto: UpdateProductDto,
    file?: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const product = await this.productRepo.findById(id, companyId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.category_id && dto.category_id !== product.category_id) {
      const category = await this.categoryRepo.findById(
        dto.category_id,
        companyId,
      );
      if (!category) {
        throw new BadRequestException('Product category not found');
      }
    }

    if (dto.product_code && dto.product_code !== product.product_code) {
      const existingCode = await this.productRepo.findByProductCode(
        dto.product_code,
        companyId,
      );
      if (existingCode) {
        throw new ConflictException('Product code already exists');
      }
    }

    if (dto.barcode && dto.barcode !== product.barcode) {
      const existingBarcode = await this.productRepo.findByBarcode(
        dto.barcode,
        companyId,
      );
      if (existingBarcode) {
        throw new ConflictException('Barcode already exists');
      }
    }

    // Handle image upload
    let image_url = dto.image_url;
    if (file) {
      // Delete old image if exists
      if (product.image_url) {
        await this.storageService.deleteFile(product.image_url);
      }
      // Upload new image
      image_url = await this.storageService.uploadFile(file, 'products');
    }

    const updated = await this.productRepo.update(id, {
      ...(dto.category_id && {
        product_categories: { connect: { id: dto.category_id } },
      }),
      ...(dto.product_code && { product_code: dto.product_code }),
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(image_url !== undefined && { image_url }),
      ...(dto.ncm_code !== undefined && { ncm_code: dto.ncm_code }),
      ...(dto.unit !== undefined && { unit: dto.unit }),
      ...(dto.minimum_stock !== undefined && {
        minimum_stock: dto.minimum_stock,
      }),
      ...(dto.supplier_id !== undefined && { supplier_id: dto.supplier_id }),
      ...(dto.barcode !== undefined && { barcode: dto.barcode }),
      ...(dto.is_available_online !== undefined && {
        is_available_online: dto.is_available_online,
      }),
      ...(dto.active !== undefined && { active: dto.active }),
    });

    this.logger.log(`Product updated: ${updated.name}`, ProductsService.name);

    const categoryName =
      dto.category_id && dto.category_id !== product.category_id
        ? (await this.categoryRepo.findById(dto.category_id, companyId))?.name
        : product.product_categories?.name;

    return this.mapToDto(updated, categoryName);
  }

  @Transactional()
  async delete(id: string, soft = true): Promise<void> {
    const companyId = this.tenantContext.getCompanyId();
    const product = await this.productRepo.findById(id, companyId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (soft) {
      await this.productRepo.softDelete(id);
      this.logger.log(
        `Product soft deleted: ${product.name}`,
        ProductsService.name,
      );
    } else {
      await this.productRepo.delete(id);
      this.logger.log(`Product deleted: ${product.name}`, ProductsService.name);
    }
  }

  /**
   * Exemplo: BEB-0001, BEB-0002, SAL-0001
   */
  private async generateProductCode(
    category_id: string,
    company_id: string,
  ): Promise<string> {
    const category = await this.categoryRepo.findById(category_id, company_id);

    if (!category) {
      throw new BadRequestException('Product category not found');
    }

    // Gerar prefix (3 primeiras letras em maiúscula)
    const prefix = category.name.substring(0, 3).toUpperCase();

    // Buscar último produto da categoria
    const lastProduct = await this.productRepo.findLastByCategory(category_id);

    // Calcular próximo número
    let nextNumber = 1;
    if (lastProduct && lastProduct.product_code) {
      const parts = lastProduct.product_code.split('-');
      if (parts.length === 2) {
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  private mapToDto(
    product: products & { product_categories?: { name: string } | null },
    categoryName?: string,
  ): ProductResponseDto {
    return {
      id: product.id,
      company_id: product.company_id,
      category_id: product.category_id,
      category_name: categoryName ?? product.product_categories?.name,
      product_code: product.product_code,
      name: product.name,
      description: product.description ?? null,
      image_url: product.image_url ?? null,
      ncm_code: product.ncm_code ?? null,
      unit: product.unit ?? null,
      minimum_stock: product.minimum_stock ?? null,
      supplier_id: product.supplier_id ?? null,
      barcode: product.barcode ?? null,
      is_available_online: product.is_available_online ?? null,
      active: product.active ?? null,
      created_at: product.created_at?.toISOString() ?? '',
    };
  }
}
