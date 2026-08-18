import { Injectable } from '@nestjs/common';
import { stock_movement_types } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StockMovementTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<stock_movement_types | null> {
    return this.prisma.stock_movement_types.findFirst({
      where: {
        id,
        company_id,
      },
    });
  }

  async findByCompany(company_id: string): Promise<stock_movement_types[]> {
    return this.prisma.stock_movement_types.findMany({
      where: { company_id },
      orderBy: { name: 'asc' },
    });
  }

  async findByIdOrName(
    idOrName: string,
    company_id: string,
  ): Promise<stock_movement_types | null> {
    // Primeiro tenta buscar por ID
    const byId = await this.prisma.stock_movement_types.findFirst({
      where: {
        id: idOrName,
        company_id,
      },
    });

    if (byId) {
      return byId;
    }

    // Se não encontrou, busca por nome
    return this.prisma.stock_movement_types.findUnique({
      where: {
        company_id_name: {
          company_id,
          name: idOrName,
        },
      },
    });
  }
}
