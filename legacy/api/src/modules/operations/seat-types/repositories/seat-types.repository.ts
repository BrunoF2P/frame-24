import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { seat_types as SeatType } from '@repo/db';
import type { OperationTypeResponse } from '../../shared/dto/operation-type-response.dto';

@Injectable()
export class SeatTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SeatType | null> {
    return this.prisma.seat_types.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[], companyId: string): Promise<SeatType[]> {
    return this.prisma.seat_types.findMany({
      where: {
        id: {
          in: ids,
        },
        company_id: companyId,
      },
    });
  }

  async findAllByCompany(companyId: string): Promise<OperationTypeResponse[]> {
    const rows = await this.prisma.seat_types.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        name: true,
        description: true,
        additional_value: true,
      },
    });

    return rows.map((row) => ({
      ...row,
      additional_value: row.additional_value?.toString() ?? null,
    }));
  }
}
