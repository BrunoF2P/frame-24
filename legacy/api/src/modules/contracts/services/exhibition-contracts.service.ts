import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { Prisma } from '@repo/db';
import {
  ExhibitionContractWithRelations,
  ExhibitionContractsRepository,
} from '../repositories/exhibition-contracts.repository';
import { CreateExhibitionContractDto } from '../dto/create-exhibition-contract.dto';
import { UpdateExhibitionContractDto } from '../dto/update-exhibition-contract.dto';
import { SlidingScaleItemInput } from '../dto/create-exhibition-contract.schema';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { MovieRepository } from 'src/modules/catalog/movies/repositories/movie.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { SupplierRepository } from 'src/modules/inventory/suppliers/repositories/supplier.repository';
import { ContractTypesRepository } from '../repositories/contract-types.repository';
import { TenantResourceService } from 'src/common/services/tenant-resource.service';

interface ExhibitionContractFilters {
  movie_id?: string;
  cinema_complex_id?: string;
  distributor_id?: string;
  active?: boolean;
}

@Injectable()
export class ExhibitionContractsService {
  constructor(
    private readonly repository: ExhibitionContractsRepository,
    private readonly movieRepository: MovieRepository,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly contractTypesRepository: ContractTypesRepository,
    private readonly snowflake: SnowflakeService,
    private readonly tenantContext: TenantContextService,
    private readonly tenantResource: TenantResourceService,
  ) {}

  async create(
    dto: CreateExhibitionContractDto,
  ): Promise<ExhibitionContractWithRelations> {
    const companyId = this.tenantContext.getCompanyId();

    await Promise.all([
      this.validateMovie(dto.movie_id, companyId),
      this.validateCinemaComplex(dto.cinema_complex_id, companyId),
      this.validateDistributor(dto.distributor_id, companyId),
      dto.contract_type_id
        ? this.validateContractType(dto.contract_type_id, companyId)
        : Promise.resolve(),
    ]);

    this.ensureDateRange(dto.start_date, dto.end_date);
    this.ensurePercentages(
      dto.distributor_percentage,
      dto.exhibitor_percentage,
    );
    const normalizedSlidingScale = this.normalizeSlidingScale(
      dto.sliding_scale,
    );
    await this.ensureNoOverlap(
      dto.movie_id,
      dto.cinema_complex_id,
      dto.start_date,
      dto.end_date,
    );

    const contractId = this.snowflake.generate();

    const data: Prisma.exhibition_contractsCreateInput = {
      id: contractId,
      movies: { connect: { id: dto.movie_id } },
      cinema_complexes: { connect: { id: dto.cinema_complex_id } },
      distributors: { connect: { id: dto.distributor_id } },
      contract_number: dto.contract_number ?? undefined,
      start_date: dto.start_date,
      end_date: dto.end_date,
      distributor_percentage: dto.distributor_percentage,
      exhibitor_percentage: dto.exhibitor_percentage,
      guaranteed_minimum: dto.guaranteed_minimum ?? 0,
      minimum_guarantee: dto.minimum_guarantee ?? 0,
      contract_terms: dto.contract_terms,
      notes: dto.notes,
      active: dto.active ?? true,
      revenue_base: dto.settlement_base_id ?? undefined,
      ...(dto.contract_type_id && {
        contract_types: { connect: { id: dto.contract_type_id } },
      }),
      ...(normalizedSlidingScale &&
        normalizedSlidingScale.length > 0 && {
          sliding_scales: {
            create: normalizedSlidingScale.map((scale) => ({
              id: this.snowflake.generate(),
              week_number: scale.week_number,
              distributor_percentage: scale.distributor_percentage,
              exhibitor_percentage: scale.exhibitor_percentage,
            })),
          },
        }),
    };

    return this.repository.create(data);
  }

  async findAll(
    filters: ExhibitionContractFilters,
  ): Promise<ExhibitionContractWithRelations[]> {
    const companyId = this.tenantContext.getCompanyId();

    await Promise.all([
      filters.movie_id
        ? this.validateMovie(filters.movie_id, companyId)
        : Promise.resolve(),
      filters.cinema_complex_id
        ? this.validateCinemaComplex(filters.cinema_complex_id, companyId)
        : Promise.resolve(),
      filters.distributor_id
        ? this.assertSupplierInCompany(filters.distributor_id, companyId)
        : Promise.resolve(),
    ]);

    const where: Prisma.exhibition_contractsWhereInput = {
      cinema_complexes: { company_id: companyId },
      ...(filters.movie_id && { movie_id: filters.movie_id }),
      ...(filters.cinema_complex_id && {
        cinema_complex_id: filters.cinema_complex_id,
      }),
      ...(filters.distributor_id && { distributor_id: filters.distributor_id }),
      ...(filters.active !== undefined && { active: filters.active }),
    };

    return this.repository.findAll(where);
  }

  async findOne(id: string): Promise<ExhibitionContractWithRelations> {
    const companyId = this.tenantContext.getCompanyId();
    const contract = await this.repository.findById(id);
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }

    await this.validateCinemaComplex(contract.cinema_complex_id, companyId);
    return contract;
  }

  async update(
    id: string,
    dto: UpdateExhibitionContractDto,
  ): Promise<ExhibitionContractWithRelations> {
    const companyId = this.tenantContext.getCompanyId();
    const existing = await this.findOne(id);

    if (
      dto.movie_id ||
      dto.cinema_complex_id ||
      dto.distributor_id ||
      dto.contract_type_id !== undefined
    ) {
      await Promise.all([
        dto.movie_id
          ? this.validateMovie(dto.movie_id, companyId)
          : Promise.resolve(),
        dto.cinema_complex_id
          ? this.validateCinemaComplex(dto.cinema_complex_id, companyId)
          : Promise.resolve(),
        dto.distributor_id
          ? this.validateDistributor(dto.distributor_id, companyId)
          : Promise.resolve(),
        dto.contract_type_id
          ? this.validateContractType(dto.contract_type_id, companyId)
          : Promise.resolve(),
      ]);
    }

    const startDate = dto.start_date ?? existing.start_date;
    const endDate = dto.end_date ?? existing.end_date;
    this.ensureDateRange(startDate, endDate);

    const distributorPercentage =
      dto.distributor_percentage ?? Number(existing.distributor_percentage);
    const exhibitorPercentage =
      dto.exhibitor_percentage ?? Number(existing.exhibitor_percentage);
    this.ensurePercentages(distributorPercentage, exhibitorPercentage);

    if (
      dto.movie_id ||
      dto.cinema_complex_id ||
      dto.start_date ||
      dto.end_date
    ) {
      await this.ensureNoOverlap(
        dto.movie_id ?? existing.movie_id,
        dto.cinema_complex_id ?? existing.cinema_complex_id,
        startDate,
        endDate,
        id,
      );
    }

    const normalizedSlidingScale = this.normalizeSlidingScale(
      dto.sliding_scale,
    );

    const data: Prisma.exhibition_contractsUpdateInput = {
      ...(dto.movie_id && { movie_id: dto.movie_id }),
      ...(dto.cinema_complex_id && {
        cinema_complex_id: dto.cinema_complex_id,
      }),
      ...(dto.distributor_id && { distributor_id: dto.distributor_id }),
      ...(dto.contract_number !== undefined && {
        contract_number: dto.contract_number ?? null,
      }),
      ...(dto.start_date && { start_date: dto.start_date }),
      ...(dto.end_date && { end_date: dto.end_date }),
      ...(dto.distributor_percentage !== undefined && {
        distributor_percentage: dto.distributor_percentage,
      }),
      ...(dto.exhibitor_percentage !== undefined && {
        exhibitor_percentage: dto.exhibitor_percentage,
      }),
      ...(dto.guaranteed_minimum !== undefined && {
        guaranteed_minimum: dto.guaranteed_minimum,
      }),
      ...(dto.minimum_guarantee !== undefined && {
        minimum_guarantee: dto.minimum_guarantee,
      }),
      ...(dto.contract_terms !== undefined && {
        contract_terms: dto.contract_terms,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.active !== undefined && { active: dto.active }),
      ...(dto.settlement_base_id !== undefined && {
        revenue_base: dto.settlement_base_id ?? null,
      }),
      ...(dto.contract_type_id !== undefined && {
        contract_types: dto.contract_type_id
          ? { connect: { id: dto.contract_type_id } }
          : { disconnect: true },
      }),
      ...(normalizedSlidingScale !== undefined && {
        sliding_scales: normalizedSlidingScale.length
          ? {
              deleteMany: {},
              create: normalizedSlidingScale.map((scale) => ({
                id: this.snowflake.generate(),
                week_number: scale.week_number,
                distributor_percentage: scale.distributor_percentage,
                exhibitor_percentage: scale.exhibitor_percentage,
              })),
            }
          : { deleteMany: {} },
      }),
    };

    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.deactivate(id);
  }

  private async validateMovie(movieId: string, companyId: string) {
    const movie = await this.movieRepository.findById(movieId);
    if (!movie || movie.company_id !== companyId) {
      throw new NotFoundException('Filme não encontrado para esta empresa.');
    }
  }

  private async validateCinemaComplex(complexId: string, companyId: string) {
    await this.tenantResource.assertCinemaComplexBelongsToCompany(
      companyId,
      complexId,
    );
  }

  private async validateDistributor(distributorId: string, companyId: string) {
    const distributor = await this.supplierRepository.findById(distributorId);
    if (!distributor || distributor.company_id !== companyId) {
      throw new NotFoundException('Distribuidor não encontrado.');
    }
    if (!distributor.is_film_distributor) {
      throw new BadRequestException(
        'O fornecedor informado não está marcado como distribuidor de filmes.',
      );
    }
  }

  private async assertSupplierInCompany(
    supplierId: string,
    companyId: string,
  ): Promise<void> {
    const supplier = await this.supplierRepository.findById(supplierId);
    if (!supplier || supplier.company_id !== companyId) {
      throw new ForbiddenException(
        'O fornecedor informado não pertence à empresa atual.',
      );
    }
  }

  private async validateContractType(typeId: string, companyId: string) {
    const type = await this.contractTypesRepository.findById(typeId);
    if (!type || type.company_id !== companyId) {
      throw new NotFoundException('Tipo de contrato não encontrado.');
    }
  }

  private ensureDateRange(start: Date, end: Date) {
    if (start > end) {
      throw new BadRequestException(
        'Data de início não pode ser maior que a data final.',
      );
    }
  }

  private ensurePercentages(distributor: number, exhibitor: number) {
    const total = Number(distributor) + Number(exhibitor);
    if (Math.abs(total - 100) > 0.001) {
      throw new BadRequestException(
        'A soma das porcentagens de distribuidor e exibidor deve ser 100%.',
      );
    }
  }

  private normalizeSlidingScale(
    slidingScale?: SlidingScaleItemInput[],
  ): SlidingScaleItemInput[] | undefined {
    if (!slidingScale) {
      return undefined;
    }

    if (slidingScale.length === 0) {
      return [];
    }

    const uniqueWeeks = new Set<number>();
    const sorted = [...slidingScale].sort(
      (a, b) => a.week_number - b.week_number,
    );

    for (const entry of sorted) {
      if (uniqueWeeks.has(entry.week_number)) {
        throw new BadRequestException(
          `Semana ${entry.week_number} duplicada na escala móvel.`,
        );
      }
      uniqueWeeks.add(entry.week_number);
      this.ensurePercentages(
        entry.distributor_percentage,
        entry.exhibitor_percentage,
      );
    }

    return sorted;
  }

  private async ensureNoOverlap(
    movieId: string,
    cinemaComplexId: string,
    startDate: Date,
    endDate: Date,
    contractIdToIgnore?: string,
  ) {
    const overlaps = await this.repository.findAll({
      movie_id: movieId,
      cinema_complex_id: cinemaComplexId,
      active: true,
      ...(contractIdToIgnore && { NOT: { id: contractIdToIgnore } }),
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    });

    if (overlaps.length > 0) {
      throw new ConflictException(
        'Já existe um contrato ativo que cobre esse período para este filme e complexo.',
      );
    }
  }

  private async getCompanyComplexIds(companyId: string): Promise<string[]> {
    const complexes =
      await this.cinemaComplexesRepository.findAllByCompany(companyId);
    return complexes.map((complex) => complex.id);
  }
}
