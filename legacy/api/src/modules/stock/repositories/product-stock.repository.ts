import { Injectable } from '@nestjs/common';
import { product_stock, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class ProductStockRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(
    product_id: string,
    complex_id: string,
  ): Promise<product_stock | null> {
    return this.prisma.product_stock.findUnique({
      where: {
        product_id_complex_id: {
          product_id,
          complex_id,
        },
      },
    });
  }

  async findByProductId(
    product_id: string,
    company_id: string,
  ): Promise<product_stock[]> {
    // Primeiro verificar se o produto pertence à empresa
    const product = await this.prisma.products.findFirst({
      where: {
        id: product_id,
        company_id,
      },
    });

    if (!product) {
      return [];
    }

    return this.prisma.product_stock.findMany({
      where: {
        product_id,
      },
    });
  }

  async findByComplexId(
    complex_id: string,
    company_id: string,
  ): Promise<product_stock[]> {
    // Buscar produtos da empresa
    const products = await this.prisma.products.findMany({
      where: { company_id },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    return this.prisma.product_stock.findMany({
      where: {
        complex_id,
        product_id: { in: productIds },
      },
    });
  }

  async findLowStock(
    company_id: string,
    complex_id?: string,
  ): Promise<product_stock[]> {
    // Buscar produtos da empresa
    const products = await this.prisma.products.findMany({
      where: { company_id },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    // Buscar todos os estoques e filtrar em memória
    const allStocks = await this.prisma.product_stock.findMany({
      where: {
        product_id: { in: productIds },
        active: true,
        ...(complex_id && { complex_id }),
      },
    });

    // Filtrar estoques baixos
    return allStocks.filter(
      (stock) => (stock.current_quantity || 0) <= (stock.minimum_quantity || 0),
    );
  }

  async create(data: Prisma.product_stockCreateInput): Promise<product_stock> {
    return this.prisma.product_stock.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
    });
  }

  async update(
    product_id: string,
    complex_id: string,
    data: Prisma.product_stockUpdateInput,
  ): Promise<product_stock> {
    return this.prisma.product_stock.update({
      where: {
        product_id_complex_id: {
          product_id,
          complex_id,
        },
      },
      data,
    });
  }

  async upsert(
    product_id: string,
    complex_id: string,
    data: Prisma.product_stockCreateInput,
  ): Promise<product_stock> {
    return this.prisma.product_stock.upsert({
      where: {
        product_id_complex_id: {
          product_id,
          complex_id,
        },
      },
      create: {
        id: this.snowflake.generate(),
        ...data,
      },
      update: data,
    });
  }
}
