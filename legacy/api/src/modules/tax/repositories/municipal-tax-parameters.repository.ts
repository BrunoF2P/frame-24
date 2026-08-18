import { Injectable } from '@nestjs/common';
import { municipal_tax_parameters, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MunicipalTaxParametersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCompanyAndIbge(
    companyId: string,
    ibgeCode: string,
    date: Date,
  ): Promise<municipal_tax_parameters | null> {
    return this.prisma.municipal_tax_parameters.findFirst({
      where: {
        company_id: companyId,
        ibge_municipality_code: ibgeCode,
        active: true,
        validity_start: { lte: date },
        OR: [{ validity_end: { gte: date } }, { validity_end: null }],
      },
      orderBy: { validity_start: 'desc' },
    });
  }

  async create(
    data: Prisma.municipal_tax_parametersCreateInput,
  ): Promise<municipal_tax_parameters> {
    return this.prisma.municipal_tax_parameters.create({ data });
  }

  async findById(id: string): Promise<municipal_tax_parameters | null> {
    return this.prisma.municipal_tax_parameters.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: Prisma.municipal_tax_parametersUpdateInput,
  ): Promise<municipal_tax_parameters> {
    return this.prisma.municipal_tax_parameters.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.municipal_tax_parameters.delete({ where: { id } });
  }

  async findAllByCompany(
    companyId: string,
  ): Promise<municipal_tax_parameters[]> {
    return this.prisma.municipal_tax_parameters.findMany({
      where: { company_id: companyId },
      orderBy: [{ active: 'desc' }, { validity_start: 'desc' }],
    });
  }
}
