import { Injectable } from '@nestjs/common';
import { Prisma, contract_types } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ContractTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.contract_typesCreateInput,
  ): Promise<contract_types> {
    return this.prisma.contract_types.create({ data });
  }

  async findAllByCompany(companyId: string): Promise<contract_types[]> {
    return this.prisma.contract_types.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<contract_types | null> {
    return this.prisma.contract_types.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.contract_typesUpdateInput,
  ): Promise<contract_types> {
    return this.prisma.contract_types.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contract_types.delete({ where: { id } });
  }
}
