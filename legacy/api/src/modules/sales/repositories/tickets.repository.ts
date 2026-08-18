import { Injectable } from '@nestjs/common';
import { Prisma, ticket_types, tickets } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class TicketsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(id: string): Promise<Prisma.ticketsGetPayload<{
    include: { sales: true };
  }> | null> {
    return this.prisma.tickets.findUnique({
      where: { id },
      include: {
        sales: true,
      },
    });
  }

  async findByTicketNumber(ticket_number: string): Promise<tickets | null> {
    return this.prisma.tickets.findUnique({
      where: { ticket_number },
    });
  }

  async findBySaleId(sale_id: string): Promise<tickets[]> {
    return this.prisma.tickets.findMany({
      where: { sale_id },
      include: {
        ticket_types: true,
      },
    });
  }

  async findByShowtimeId(showtime_id: string): Promise<tickets[]> {
    return this.prisma.tickets.findMany({
      where: { showtime_id },
    });
  }

  async findTicketTypeById(id: string): Promise<ticket_types | null> {
    return this.prisma.ticket_types.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.ticketsCreateInput): Promise<tickets> {
    return this.prisma.tickets.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
      include: {
        ticket_types: true,
      },
    });
  }

  async createMany(data: Prisma.ticketsCreateManyInput[]): Promise<void> {
    await this.prisma.tickets.createMany({
      data: data.map((item) => ({
        id: this.snowflake.generate(),
        ...item,
      })),
    });
  }

  async update(id: string, data: Prisma.ticketsUpdateInput): Promise<tickets> {
    return this.prisma.tickets.update({
      where: { id },
      data,
    });
  }

  async markAsUsed(id: string, usage_date: Date): Promise<tickets> {
    return this.prisma.tickets.update({
      where: { id },
      data: {
        used: true,
        usage_date,
      },
    });
  }

  generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  }
}
