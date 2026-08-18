import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { Prisma, ticket_types } from '@repo/db';

@Injectable()
export class TicketTypesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(id: string, company_id: string): Promise<ticket_types | null> {
    return this.prisma.ticket_types.findFirst({
      where: { id, company_id },
    });
  }

  async findByName(
    company_id: string,
    name: string,
  ): Promise<ticket_types | null> {
    return this.prisma.ticket_types.findFirst({
      where: { company_id, name },
    });
  }

  async findAll(company_id: string): Promise<ticket_types[]> {
    return this.prisma.ticket_types.findMany({
      where: { company_id },
      orderBy: [{ discount_percentage: 'desc' }, { name: 'asc' }],
    });
  }

  async create(data: Prisma.ticket_typesCreateInput): Promise<ticket_types> {
    return this.prisma.ticket_types.create({
      data: { id: this.snowflake.generate(), ...data },
    });
  }

  async update(
    id: string,
    data: Prisma.ticket_typesUpdateInput,
  ): Promise<ticket_types> {
    return this.prisma.ticket_types.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ticket_types.delete({ where: { id } });
  }

  async countTickets(ticket_type_id: string): Promise<number> {
    return this.prisma.tickets.count({
      where: { ticket_type: ticket_type_id },
    });
  }
}
