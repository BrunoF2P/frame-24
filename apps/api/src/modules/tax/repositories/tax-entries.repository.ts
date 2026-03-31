import { Injectable } from '@nestjs/common';
import { tax_entries, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class TaxEntriesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(id: string): Promise<tax_entries | null> {
    return this.prisma.tax_entries.findUnique({
      where: { id },
    });
  }

  async findAll(
    company_id: string,
    filters?: {
      cinema_complex_id?: string;
      source_type?: string;
      source_id?: string;
      start_date?: Date;
      end_date?: Date;
      processed?: boolean;
    },
  ): Promise<tax_entries[]> {
    // Buscar complexos da empresa
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id },
      select: { id: true },
    });
    const complexIds = complexes.map((c) => c.id);

    const where: Prisma.tax_entriesWhereInput = {
      cinema_complex_id: { in: complexIds },
      ...(filters?.cinema_complex_id && {
        cinema_complex_id: filters.cinema_complex_id,
      }),
      ...(filters?.source_type && { source_type: filters.source_type }),
      ...(filters?.source_id && { source_id: filters.source_id }),
      ...(filters?.start_date &&
        filters?.end_date && {
          competence_date: {
            gte: filters.start_date,
            lte: filters.end_date,
          },
        }),
      ...(filters?.processed !== undefined && { processed: filters.processed }),
    };

    return this.prisma.tax_entries.findMany({
      where,
      orderBy: {
        competence_date: 'desc',
      },
    });
  }

  async findBySource(
    source_type: string,
    source_id: string,
  ): Promise<tax_entries | null> {
    return this.prisma.tax_entries.findFirst({
      where: {
        source_type,
        source_id,
      },
    });
  }

  async findAllBySource(
    source_type: string,
    source_id: string,
  ): Promise<tax_entries[]> {
    return this.prisma.tax_entries.findMany({
      where: {
        source_type,
        source_id,
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async create(data: Prisma.tax_entriesCreateInput): Promise<tax_entries> {
    return this.prisma.tax_entries.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.tax_entriesUpdateInput,
  ): Promise<tax_entries> {
    return this.prisma.tax_entries.update({
      where: { id },
      data,
    });
  }

  async getTotalByCompetence(
    cinema_complex_id: string,
    year: number,
    month: number,
  ): Promise<{
    total_gross: number;
    total_deductions: number;
    total_iss: number;
    total_pis: number;
    total_cofins: number;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const entries = await this.prisma.tax_entries.findMany({
      where: {
        cinema_complex_id,
        competence_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      total_gross: entries.reduce((sum, e) => sum + Number(e.gross_amount), 0),
      total_deductions: entries.reduce(
        (sum, e) => sum + Number(e.deductions_amount || 0),
        0,
      ),
      total_iss: entries.reduce((sum, e) => sum + Number(e.iss_amount || 0), 0),
      total_pis: entries.reduce(
        (sum, e) => sum + Number(e.pis_amount_payable),
        0,
      ),
      total_cofins: entries.reduce(
        (sum, e) => sum + Number(e.cofins_amount_payable),
        0,
      ),
    };
  }
}
