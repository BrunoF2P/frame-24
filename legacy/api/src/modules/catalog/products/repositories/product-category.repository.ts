import { Injectable } from '@nestjs/common';
import { product_categories, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class ProductCategoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<product_categories | null> {
    return this.prisma.product_categories.findFirst({
      where: { id, company_id },
    });
  }

  async findByName(
    company_id: string,
    name: string,
  ): Promise<product_categories | null> {
    return this.prisma.product_categories.findFirst({
      where: { company_id, name },
    });
  }

  async findAll(company_id: string): Promise<product_categories[]> {
    return this.prisma.product_categories.findMany({
      where: { company_id },
      orderBy: { name: 'asc' },
    });
  }

  async findAllWithProductCount(
    company_id: string,
  ): Promise<(product_categories & { product_count: number })[]> {
    const categories = await this.prisma.product_categories.findMany({
      where: { company_id },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      ...cat,
      product_count: cat._count.products,
    }));
  }

  async create(
    data: Prisma.product_categoriesCreateInput,
  ): Promise<product_categories> {
    return this.prisma.product_categories.create({
      data: { id: this.snowflake.generate(), ...data },
    });
  }

  async update(
    id: string,
    data: Prisma.product_categoriesUpdateInput,
  ): Promise<product_categories> {
    return this.prisma.product_categories.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product_categories.delete({ where: { id } });
  }

  async countProducts(category_id: string): Promise<number> {
    return this.prisma.products.count({
      where: { category_id },
    });
  }
}
