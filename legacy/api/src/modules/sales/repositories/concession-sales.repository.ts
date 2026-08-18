import { Injectable } from '@nestjs/common';
import { concession_sales, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class ConcessionSalesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async create(
    data: Prisma.concession_salesCreateInput,
  ): Promise<concession_sales> {
    return this.prisma.concession_sales.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
      include: {
        concession_sale_items: true,
        concession_status: true,
      },
    });
  }

  async createItem(
    data: Prisma.concession_sale_itemsCreateInput,
  ): Promise<void> {
    await this.prisma.concession_sale_items.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
    });
  }
}
