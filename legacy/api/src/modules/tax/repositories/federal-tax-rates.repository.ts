import { Injectable } from '@nestjs/common';
import { federal_tax_rates, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FederalTaxRatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCompany(
    companyId: string,
    date: Date,
    revenue_type?: string,
    pis_cofins_regime?: string,
  ): Promise<federal_tax_rates | null> {
    const where: Prisma.federal_tax_ratesWhereInput = {
      company_id: companyId,
      active: true,
      validity_start: { lte: date },
      OR: [{ validity_end: { gte: date } }, { validity_end: null }],
    };

    // Build AND conditions array
    const andConditions: Prisma.federal_tax_ratesWhereInput[] = [];

    // Handle revenue_type: match exact value OR null
    if (revenue_type) {
      andConditions.push({
        OR: [{ revenue_type }, { revenue_type: null }],
      });
    }

    // Handle pis_cofins_regime: match exact value OR null
    if (pis_cofins_regime) {
      andConditions.push({
        OR: [{ pis_cofins_regime }, { pis_cofins_regime: null }],
      });
    }

    // Add AND conditions if any exist
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return this.prisma.federal_tax_rates.findFirst({
      where,
      orderBy: { validity_start: 'desc' },
    });
  }

  async create(
    data: Prisma.federal_tax_ratesCreateInput,
  ): Promise<federal_tax_rates> {
    return this.prisma.federal_tax_rates.create({ data });
  }

  async findAllByCompany(companyId: string): Promise<federal_tax_rates[]> {
    return this.prisma.federal_tax_rates.findMany({
      where: { company_id: companyId },
      orderBy: [{ active: 'desc' }, { validity_start: 'desc' }],
    });
  }

  async findById(id: string): Promise<federal_tax_rates | null> {
    return this.prisma.federal_tax_rates.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: Prisma.federal_tax_ratesUpdateInput,
  ): Promise<federal_tax_rates> {
    return this.prisma.federal_tax_rates.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.federal_tax_rates.delete({ where: { id } });
  }
}
