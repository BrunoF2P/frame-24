import { Injectable } from '@nestjs/common';
import { products, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class ProductRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<
    (products & { product_categories: { name: string } | null }) | null
  > {
    return this.prisma.products.findFirst({
      where: { id, company_id },
      include: {
        product_categories: {
          select: { name: true },
        },
      },
    });
  }

  async findByProductCode(
    product_code: string,
    company_id: string,
  ): Promise<products | null> {
    return this.prisma.products.findFirst({
      where: { product_code, company_id },
    });
  }

  async findByBarcode(
    barcode: string,
    company_id: string,
  ): Promise<products | null> {
    return this.prisma.products.findFirst({
      where: { barcode, company_id },
    });
  }

  async findLastByCategory(category_id: string): Promise<products | null> {
    return this.prisma.products.findFirst({
      where: { category_id },
      orderBy: { product_code: 'desc' },
      take: 1,
    });
  }

  async findAll(
    company_id: string,
    active?: boolean,
  ): Promise<(products & { product_categories: { name: string } | null })[]> {
    return this.prisma.products.findMany({
      where: {
        company_id,
        ...(active !== undefined && { active }),
      },
      include: {
        product_categories: {
          select: { name: true },
        },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findByCategory(
    category_id: string,
    company_id: string,
    active?: boolean,
  ): Promise<(products & { product_categories: { name: string } | null })[]> {
    return this.prisma.products.findMany({
      where: {
        company_id,
        category_id,
        ...(active !== undefined && { active }),
      },
      include: {
        product_categories: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async search(
    company_id: string,
    searchTerm: string,
    active?: boolean,
  ): Promise<(products & { product_categories: { name: string } | null })[]> {
    return this.prisma.products.findMany({
      where: {
        company_id,
        ...(active !== undefined && { active }),
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { product_code: { contains: searchTerm, mode: 'insensitive' } },
          { barcode: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        product_categories: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllByIds(
    ids: string[],
    company_id: string,
  ): Promise<(products & { product_categories: { name: string } | null })[]> {
    return this.prisma.products.findMany({
      where: {
        id: { in: ids },
        company_id,
      },
      include: {
        product_categories: {
          select: { name: true },
        },
      },
    });
  }

  async create(
    data: Prisma.productsCreateInput,
  ): Promise<products & { product_categories: { name: string } | null }> {
    return this.prisma.products.create({
      data: { id: this.snowflake.generate(), ...data },
      include: {
        product_categories: {
          select: { name: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.productsUpdateInput,
  ): Promise<products & { product_categories: { name: string } | null }> {
    return this.prisma.products.update({
      where: { id },
      data,
      include: {
        product_categories: {
          select: { name: true },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.products.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<products> {
    return this.prisma.products.update({
      where: { id },
      data: { active: false },
    });
  }
}
