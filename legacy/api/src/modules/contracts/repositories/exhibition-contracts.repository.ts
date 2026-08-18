import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

const EXHIBITION_CONTRACT_INCLUDE = {
  contract_types: true,
  sliding_scales: {
    orderBy: { week_number: 'asc' },
  },
} satisfies Prisma.exhibition_contractsInclude;

export type ExhibitionContractWithRelations =
  Prisma.exhibition_contractsGetPayload<{
    include: typeof EXHIBITION_CONTRACT_INCLUDE;
  }>;

@Injectable()
export class ExhibitionContractsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.exhibition_contractsCreateInput,
  ): Promise<ExhibitionContractWithRelations> {
    return this.prisma.exhibition_contracts.create({
      data,
      include: EXHIBITION_CONTRACT_INCLUDE,
    }) as Promise<ExhibitionContractWithRelations>;
  }

  async findActiveContract(
    movieId: string,
    cinemaComplexId: string,
    date: Date,
  ): Promise<ExhibitionContractWithRelations | null> {
    return this.prisma.exhibition_contracts.findFirst({
      where: {
        movie_id: movieId,
        cinema_complex_id: cinemaComplexId,
        active: true,
        start_date: { lte: date },
        end_date: { gte: date },
      },
      include: EXHIBITION_CONTRACT_INCLUDE,
    }) as Promise<ExhibitionContractWithRelations | null>;
  }

  async findById(id: string): Promise<ExhibitionContractWithRelations | null> {
    return this.prisma.exhibition_contracts.findUnique({
      where: { id },
      include: EXHIBITION_CONTRACT_INCLUDE,
    }) as Promise<ExhibitionContractWithRelations | null>;
  }

  async findAll(
    where: Prisma.exhibition_contractsWhereInput,
  ): Promise<ExhibitionContractWithRelations[]> {
    return this.prisma.exhibition_contracts.findMany({
      where,
      include: EXHIBITION_CONTRACT_INCLUDE,
      orderBy: { start_date: 'desc' },
    }) as Promise<ExhibitionContractWithRelations[]>;
  }

  async update(
    id: string,
    data: Prisma.exhibition_contractsUpdateInput,
  ): Promise<ExhibitionContractWithRelations> {
    return this.prisma.exhibition_contracts.update({
      where: { id },
      data,
      include: EXHIBITION_CONTRACT_INCLUDE,
    }) as Promise<ExhibitionContractWithRelations>;
  }

  async deactivate(id: string): Promise<ExhibitionContractWithRelations> {
    return this.prisma.exhibition_contracts.update({
      where: { id },
      data: { active: false },
      include: EXHIBITION_CONTRACT_INCLUDE,
    }) as Promise<ExhibitionContractWithRelations>;
  }
}
