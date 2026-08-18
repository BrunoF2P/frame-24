import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { audio_types as AudioType } from '@repo/db';
import type { OperationTypeResponse } from '../../shared/dto/operation-type-response.dto';

@Injectable()
export class AudioTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AudioType | null> {
    return this.prisma.audio_types.findUnique({
      where: { id },
    });
  }

  async findAllByCompany(companyId: string): Promise<OperationTypeResponse[]> {
    const rows = await this.prisma.audio_types.findMany({
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
