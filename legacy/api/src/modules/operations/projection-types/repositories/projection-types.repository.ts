import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { projection_types as ProjectionType } from '@repo/db';
import type { OperationTypeResponse } from '../../shared/dto/operation-type-response.dto';

@Injectable()
export class ProjectionTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProjectionType | null> {
    return this.prisma.projection_types.findUnique({
      where: { id },
    });
  }

  async findAllByCompany(companyId: string): Promise<OperationTypeResponse[]> {
    const rows = await this.prisma.projection_types.findMany({
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
