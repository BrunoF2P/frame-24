import { Injectable } from '@nestjs/common';
import { stock_movements, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class StockMovementsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(id: string): Promise<stock_movements | null> {
    return this.prisma.stock_movements.findUnique({
      where: { id },
      include: {
        stock_movement_types: true,
      },
    });
  }

  async findAll(
    company_id: string,
    filters?: {
      product_id?: string;
      complex_id?: string;
      movement_type?: string;
      start_date?: Date;
      end_date?: Date;
    },
  ): Promise<stock_movements[]> {
    // Buscar produtos da empresa
    const products = await this.prisma.products.findMany({
      where: { company_id },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    const where: Prisma.stock_movementsWhereInput = {
      product_id: { in: productIds },
      ...(filters?.product_id && { product_id: filters.product_id }),
      ...(filters?.complex_id && { complex_id: filters.complex_id }),
      ...(filters?.movement_type && { movement_type: filters.movement_type }),
      ...(filters?.start_date &&
        filters?.end_date && {
          movement_date: {
            gte: filters.start_date,
            lte: filters.end_date,
          },
        }),
    };

    return this.prisma.stock_movements.findMany({
      where,
      include: {
        stock_movement_types: true,
      },
      orderBy: {
        movement_date: 'desc',
      },
    });
  }

  async create(
    data: Prisma.stock_movementsCreateInput,
  ): Promise<stock_movements> {
    return this.prisma.stock_movements.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
      include: {
        stock_movement_types: true,
      },
    });
  }
}
