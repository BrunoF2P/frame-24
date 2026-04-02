import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import {
  movies,
  Prisma,
  session_status,
  showtime_schedule as Showtime,
  seats as SeatEntity,
} from '@repo/db';

import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';

import { RoomsRepository } from '../../rooms/repositories/rooms.repository';

import { CreateShowtimeDto } from '../dto/create-showtime.dto';
import { Transactional } from '@nestjs-cls/transactional';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { MovieRepository } from 'src/modules/catalog/movies/repositories/movie.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { SeatStatusRepository } from 'src/modules/operations/seat-status/repositories/seat-status.repository';
import { UpdateShowtimeDto } from 'src/modules/operations/showtime_schedule/dto/update-showtime.dto';
import { SessionStatusRepository } from 'src/modules/operations/session-status/repositories/session-status.repository';
import {
  ExhibitionContractWithRelations,
  ExhibitionContractsRepository,
} from 'src/modules/contracts/repositories/exhibition-contracts.repository';
import { MunicipalTaxParametersRepository } from 'src/modules/tax/repositories/municipal-tax-parameters.repository';
import { FederalTaxRatesRepository } from 'src/modules/tax/repositories/federal-tax-rates.repository';
import { SeatTypesRepository } from 'src/modules/operations/seat-types/repositories/seat-types.repository';
import { ProjectionTypesRepository } from 'src/modules/operations/projection-types/repositories/projection-types.repository';
import { AudioTypesRepository } from 'src/modules/operations/audio-types/repositories/audio-types.repository';
import { CacheService } from 'src/common/cache/cache.service';

export interface ShowtimeDetailsDto {
  id: string;
  start_time: string;
  end_time: string;
  base_ticket_price: string;
  available_seats: number | null;
  sold_seats: number | null;
  blocked_seats: number | null;
  movie: movies | null;
  room: {
    id: string;
    name: string | null;
    capacity: number;
  } | null;
  complex: { id: string; name: string } | null;
  projection_type: NonNullable<
    Awaited<ReturnType<ShowtimesRepository['findById']>>
  >['projection_types'];
  audio_type: NonNullable<
    Awaited<ReturnType<ShowtimesRepository['findById']>>
  >['audio_types'];
  language: NonNullable<
    Awaited<ReturnType<ShowtimesRepository['findById']>>
  >['session_languages'];
  status: session_status | null;
}

export interface ShowtimeSeatDto {
  seat_id: string;
  row: string;
  number: number;
  accessible: boolean | null;
  status: { id: string; name: string };
  seat_type_id: string | null;
}

interface SeatPricingDetail {
  seat_type_id: string | null;
  seat_type_name: string;
  seat_count: number;
  additional_value: number;
  final_price: number;
}

export interface ShowtimeTicketPricingBreakdown {
  requestedBasePrice: number;
  projectionAdditional: number;
  audioAdditional: number;
  basePriceWithModifiers: number;
  minSeatAdditional: number;
  maxSeatAdditional: number;
  minSeatPrice: number;
  maxSeatPrice: number;
  averageSeatPrice: number;
  totalSeats: number;
  seatTypes: SeatPricingDetail[];
}

interface SeatTypeMeta {
  additionalValue: number;
  name: string;
}

interface SeatPricingContext {
  activeSeats: SeatEntity[];
  seatTypeMeta: Map<string, SeatTypeMeta>;
}

interface TicketPricingRoomInput {
  capacity: number;
  projection_type?: string | null;
  audio_type?: string | null;
}

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const TRAILER_BLOCK_MINUTES = 15;
const TURNAROUND_BLOCK_MINUTES = 20;
const SESSION_OPERATIONAL_BUFFER_MINUTES =
  TRAILER_BLOCK_MINUTES + TURNAROUND_BLOCK_MINUTES;
const DEFAULT_DISTRIBUTOR_PERCENTAGE = 0;
const DEFAULT_EXHIBITOR_PERCENTAGE = 100;

export interface ShowtimeFinancialBreakdown {
  baseTicketPrice: number;
  distributorShare: number;
  exhibitorGross: number;
  issRate: number;
  issAmount: number;
  pisRate: number;
  pisAmount: number;
  cofinsRate: number;
  cofinsAmount: number;
  totalTaxes: number;
  netRevenue: number;
  contractUsed: boolean;
  distributorPercentage: number;
  exhibitorPercentage: number;
  ticketPricing?: ShowtimeTicketPricingBreakdown;
}

@Injectable()
export class ShowtimesService {
  constructor(
    private readonly showtimesRepository: ShowtimesRepository,
    private readonly sessionSeatStatusRepository: SessionSeatStatusRepository,
    private readonly sessionStatusRepository: SessionStatusRepository,
    private readonly roomsRepository: RoomsRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly moviesRepository: MovieRepository,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly snowflake: SnowflakeService,
    private readonly rabbitmq: RabbitMQPublisherService,
    private readonly seatStatusRepository: SeatStatusRepository,
    private readonly exhibitionContractsRepository: ExhibitionContractsRepository,
    private readonly municipalTaxParametersRepository: MunicipalTaxParametersRepository,
    private readonly federalTaxRatesRepository: FederalTaxRatesRepository,
    private readonly seatTypesRepository: SeatTypesRepository,
    private readonly projectionTypesRepository: ProjectionTypesRepository,
    private readonly audioTypesRepository: AudioTypesRepository,
    private readonly cacheService: CacheService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findOne(id: string): Promise<ShowtimeDetailsDto> {
    const companyId = this.tenantContext.getCompanyId();
    const showtime = await this.showtimesRepository.findById(id);

    if (!showtime) {
      throw new NotFoundException('Sessão não encontrada.');
    }

    if (
      !showtime.cinema_complexes ||
      showtime.cinema_complexes.company_id !== companyId
    ) {
      throw new ForbiddenException('Acesso negado a esta sessão.');
    }

    const movie = await this.moviesRepository.findById(showtime.movie_id);

    return {
      id: showtime.id,
      start_time: new Date(showtime.start_time).toISOString(),
      end_time: new Date(showtime.end_time).toISOString(),
      base_ticket_price: showtime.base_ticket_price.toString(),
      available_seats: showtime.available_seats,
      sold_seats: showtime.sold_seats,
      blocked_seats: showtime.blocked_seats,
      movie,
      room: showtime.rooms,
      complex: showtime.cinema_complexes,
      projection_type: showtime.projection_types,
      audio_type: showtime.audio_types,
      language: showtime.session_languages,
      status: showtime.session_status,
    };
  }

  async findAll(filters?: {
    cinema_complex_id?: string;
    room_id?: string;
    movie_id?: string;
    start_time?: Date;
    status?: string;
  }): Promise<Awaited<ReturnType<ShowtimesRepository['findAll']>>> {
    const companyId = this.tenantContext.getCompanyId();

    const where: Prisma.showtime_scheduleWhereInput = {
      cinema_complexes: { company_id: companyId },
      ...(filters?.cinema_complex_id && {
        cinema_complex_id: filters.cinema_complex_id,
      }),
      ...(filters?.room_id && { room_id: filters.room_id }),
      ...(filters?.movie_id && { movie_id: filters.movie_id }),
      ...(filters?.start_time && { start_time: filters.start_time }),
      ...(filters?.status && { status: filters.status }),
    };

    return this.showtimesRepository.findAll(where);
  }

  async preview(dto: CreateShowtimeDto): Promise<ShowtimeFinancialBreakdown> {
    const companyId = this.tenantContext.getCompanyId();

    const { room } = await this.loadMovieAndRoom(
      dto.movie_id,
      dto.room_id,
      companyId,
    );
    await this.assertRoomComplexOwnership(room.cinema_complex_id, companyId);

    const seatPricingContext = await this.loadSeatPricingContext(
      dto.room_id,
      companyId,
    );

    const ticketPricing = await this.buildTicketPricingBreakdown(
      dto,
      room,
      companyId,
      seatPricingContext,
    );

    const financialBreakdown = await this.calculateShowtimeFinancials(
      ticketPricing.averageSeatPrice,
      dto.movie_id,
      room.cinema_complex_id,
      dto.start_time,
      companyId,
    );

    return {
      ...financialBreakdown,
      ticketPricing,
    };
  }

  private async buildTicketPricingBreakdown(
    dto: CreateShowtimeDto,
    room: TicketPricingRoomInput,
    companyId: string,
    seatContext?: SeatPricingContext,
  ): Promise<ShowtimeTicketPricingBreakdown> {
    const context =
      seatContext ??
      (await this.loadSeatPricingContext(dto.room_id, companyId));

    const projectionAdditional = await this.resolveProjectionAdditional(
      dto.projection_type ?? room.projection_type ?? null,
      companyId,
    );
    const audioAdditional = await this.resolveAudioAdditional(
      dto.audio_type ?? room.audio_type ?? null,
      companyId,
    );

    const basePriceWithModifiers =
      dto.base_ticket_price + projectionAdditional + audioAdditional;

    const seatPricingDetails = this.buildSeatPricingDetails(
      context,
      basePriceWithModifiers,
      room.capacity,
    );

    const additionalValues = seatPricingDetails.map(
      (item) => item.additional_value,
    );
    const seatPrices = seatPricingDetails.map((item) => item.final_price);

    const minSeatAdditional =
      additionalValues.length > 0 ? Math.min(...additionalValues) : 0;
    const maxSeatAdditional =
      additionalValues.length > 0 ? Math.max(...additionalValues) : 0;
    const minSeatPrice =
      seatPrices.length > 0 ? Math.min(...seatPrices) : basePriceWithModifiers;
    const maxSeatPrice =
      seatPrices.length > 0 ? Math.max(...seatPrices) : basePriceWithModifiers;

    const totalSeats = seatPricingDetails.reduce(
      (sum, seat) => sum + seat.seat_count,
      0,
    );

    const averageSeatPrice =
      totalSeats > 0
        ? seatPricingDetails.reduce(
            (sum, seat) => sum + seat.final_price * seat.seat_count,
            0,
          ) / totalSeats
        : basePriceWithModifiers;

    return {
      requestedBasePrice: dto.base_ticket_price,
      projectionAdditional,
      audioAdditional,
      basePriceWithModifiers,
      minSeatAdditional,
      maxSeatAdditional,
      minSeatPrice,
      maxSeatPrice,
      averageSeatPrice,
      totalSeats,
      seatTypes: seatPricingDetails,
    };
  }

  private buildSeatPricingDetails(
    context: SeatPricingContext,
    basePriceWithModifiers: number,
    roomCapacity?: number,
  ): SeatPricingDetail[] {
    const seatsByType = new Map<string | null, number>();

    for (const seat of context.activeSeats) {
      const isActive = seat.active !== false;
      if (!isActive) {
        continue;
      }
      const seatType = seat.seat_type ?? null;
      seatsByType.set(seatType, (seatsByType.get(seatType) ?? 0) + 1);
    }

    if (seatsByType.size === 0) {
      const fallbackCount = roomCapacity ?? context.activeSeats.length ?? 0;
      seatsByType.set(null, fallbackCount);
    }

    const details: SeatPricingDetail[] = [];

    for (const [seatTypeId, seat_count] of seatsByType.entries()) {
      const meta = seatTypeId ? context.seatTypeMeta.get(seatTypeId) : null;
      const additional_value = meta ? meta.additionalValue : 0;
      const seat_type_name = seatTypeId
        ? (meta?.name ?? 'Tipo de assento')
        : 'Padrão';

      details.push({
        seat_type_id: seatTypeId,
        seat_type_name,
        seat_count,
        additional_value,
        final_price: basePriceWithModifiers + additional_value,
      });
    }

    return details;
  }

  private async loadSeatPricingContext(
    roomId: string,
    companyId: string,
  ): Promise<SeatPricingContext> {
    const seats = await this.seatsRepository.findByRoomId(roomId);
    const activeSeats = seats.filter((seat) => seat.active !== false);

    const seatTypeIds = [
      ...new Set(
        activeSeats
          .map((seat) => seat.seat_type)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const seatTypes =
      seatTypeIds.length > 0
        ? await this.seatTypesRepository.findByIds(seatTypeIds, companyId)
        : [];

    const seatTypeMeta = new Map<string, SeatTypeMeta>(
      seatTypes.map((seatType) => [
        seatType.id,
        {
          additionalValue: Number(seatType.additional_value ?? 0),
          name: seatType.name,
        },
      ]),
    );

    return { activeSeats, seatTypeMeta };
  }

  private async resolveProjectionAdditional(
    projectionTypeId: string | null,
    companyId: string,
  ): Promise<number> {
    if (!projectionTypeId) {
      return 0;
    }

    const projectionType = await this.cacheService.wrap(
      `projection_type:${projectionTypeId}`,
      () => this.projectionTypesRepository.findById(projectionTypeId),
      3600000,
    );

    if (!projectionType) {
      return 0;
    }

    if (projectionType.company_id !== companyId) {
      throw new ForbiddenException(
        'Tipo de projeção não pertence à empresa atual.',
      );
    }

    return Number(projectionType.additional_value ?? 0);
  }

  private async resolveAudioAdditional(
    audioTypeId: string | null,
    companyId: string,
  ): Promise<number> {
    if (!audioTypeId) {
      return 0;
    }

    const audioType = await this.cacheService.wrap(
      `audio_type:${audioTypeId}`,
      () => this.audioTypesRepository.findById(audioTypeId),
      3600000,
    );

    if (!audioType) {
      return 0;
    }

    if (audioType.company_id !== companyId) {
      throw new ForbiddenException(
        'Tipo de áudio não pertence à empresa atual.',
      );
    }

    return Number(audioType.additional_value ?? 0);
  }

  private async calculateShowtimeFinancials(
    baseTicketPrice: number,
    movieId: string,
    cinemaComplexId: string,
    sessionDate: Date,
    companyId: string,
  ): Promise<ShowtimeFinancialBreakdown> {
    // Buscar contrato ativo
    const contract =
      await this.exhibitionContractsRepository.findActiveContract(
        movieId,
        cinemaComplexId,
        sessionDate,
      );

    const {
      distributor: distributorPercentage,
      exhibitor: exhibitorPercentage,
    } = this.resolveContractPercentages(contract, sessionDate);

    // Calcular divisão
    const distributorShare = (baseTicketPrice * distributorPercentage) / 100;
    const exhibitorGross = (baseTicketPrice * exhibitorPercentage) / 100;

    // Buscar complexo para obter IBGE code
    const complex =
      await this.cinemaComplexesRepository.findById(cinemaComplexId);
    if (!complex) {
      throw new NotFoundException('Complexo de cinema não encontrado.');
    }

    // Buscar impostos municipais
    const municipalTax =
      await this.municipalTaxParametersRepository.findActiveByCompanyAndIbge(
        companyId,
        complex.ibge_municipality_code,
        sessionDate,
      );

    // Buscar impostos federais
    const federalTax = await this.federalTaxRatesRepository.findActiveByCompany(
      companyId,
      sessionDate,
    );

    // Calcular ISS sobre a parte do exibidor
    const issRate = municipalTax ? Number(municipalTax.iss_rate) : 0;
    const issAmount = (exhibitorGross * issRate) / 100;

    // Calcular PIS e COFINS sobre a parte do exibidor
    const pisRate = federalTax ? Number(federalTax.pis_rate) : 0;
    const pisAmount = (exhibitorGross * pisRate) / 100;

    const cofinsRate = federalTax ? Number(federalTax.cofins_rate) : 0;
    const cofinsAmount = (exhibitorGross * cofinsRate) / 100;

    // Calcular totais
    const totalTaxes = issAmount + pisAmount + cofinsAmount;
    const netRevenue = exhibitorGross - totalTaxes;

    return {
      baseTicketPrice,
      distributorShare,
      exhibitorGross,
      issRate,
      issAmount,
      pisRate,
      pisAmount,
      cofinsRate,
      cofinsAmount,
      totalTaxes,
      netRevenue,
      contractUsed: !!contract,
      distributorPercentage,
      exhibitorPercentage,
    };
  }

  private resolveContractPercentages(
    contract: ExhibitionContractWithRelations | null,
    sessionDate: Date,
  ) {
    if (!contract) {
      return {
        distributor: DEFAULT_DISTRIBUTOR_PERCENTAGE,
        exhibitor: DEFAULT_EXHIBITOR_PERCENTAGE,
      };
    }

    if (!contract.sliding_scales || contract.sliding_scales.length === 0) {
      return {
        distributor: Number(contract.distributor_percentage),
        exhibitor: Number(contract.exhibitor_percentage),
      };
    }

    const sorted = [...contract.sliding_scales].sort(
      (a, b) => a.week_number - b.week_number,
    );

    const weekNumber =
      Math.floor(
        (sessionDate.getTime() - contract.start_date.getTime()) / WEEK_IN_MS,
      ) + 1;

    const matched =
      sorted.find((entry) => entry.week_number === weekNumber) ??
      [...sorted].reverse().find((entry) => entry.week_number < weekNumber) ??
      sorted[0];

    return {
      distributor: Number(matched.distributor_percentage),
      exhibitor: Number(matched.exhibitor_percentage),
    };
  }

  private calculateSessionEndTime(
    startTime: Date,
    movieDurationMinutes: number,
  ): Date {
    return new Date(
      startTime.getTime() +
        (movieDurationMinutes + SESSION_OPERATIONAL_BUFFER_MINUTES) * 60000,
    );
  }

  @Transactional()
  async create(dto: CreateShowtimeDto): Promise<Showtime> {
    const companyId = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getUserId();

    this.assertShowtimeDateInFuture(dto.start_time);

    const { movie, room } = await this.loadMovieAndRoom(
      dto.movie_id,
      dto.room_id,
      companyId,
      true,
    );

    const startTime = dto.start_time;
    const endTime = this.calculateSessionEndTime(
      startTime,
      movie.duration_minutes,
    );
    const overlappingSessions =
      await this.showtimesRepository.findOverlappingSessions(
        dto.room_id,
        startTime,
        endTime,
      );

    if (overlappingSessions.length > 0) {
      throw new ConflictException(
        'Já existe uma sessão agendada que conflita com este horário.',
      );
    }

    await this.assertRoomComplexOwnership(room.cinema_complex_id, companyId);

    const showtimeId = this.snowflake.generate();
    const newShowtime = await this.showtimesRepository.create({
      id: showtimeId,
      cinema_complexes: { connect: { id: room.cinema_complex_id } },
      rooms: { connect: { id: dto.room_id } },
      movie_id: dto.movie_id,
      start_time: startTime,
      end_time: endTime,
      base_ticket_price: dto.base_ticket_price,
      available_seats: room.capacity,
      sold_seats: 0,
      blocked_seats: 0,
      ...(dto.projection_type && {
        projection_types: { connect: { id: dto.projection_type } },
      }),
      ...(dto.audio_type && {
        audio_types: { connect: { id: dto.audio_type } },
      }),
      ...(dto.session_language && {
        session_languages: { connect: { id: dto.session_language } },
      }),
      ...(dto.status && {
        session_status: { connect: { id: dto.status } },
      }),
    });

    const seatPricingContext = await this.loadSeatPricingContext(
      dto.room_id,
      companyId,
    );
    const activeSeats = seatPricingContext.activeSeats;

    const availableStatus = await this.cacheService.wrap(
      `seat_status_default:${companyId}`,
      () => this.seatStatusRepository.findDefaultByCompany(companyId),
      3600000,
    );

    if (!availableStatus) {
      throw new NotFoundException(
        'Nenhum status de assento padrão foi configurado para esta empresa.',
      );
    }

    // Calcular preços dos assentos e criar dados de status
    const seatStatusData = activeSeats.map((seat) => ({
      id: this.snowflake.generate(),
      showtime_id: showtimeId,
      seat_id: seat.id,
      status: availableStatus.id,
      // Nota: O schema atual não tem campo de preço em session_seat_status
      // O preço pode ser calculado dinamicamente quando necessário
    }));

    await this.sessionSeatStatusRepository.createMany(seatStatusData);

    // Calcular breakdown financeiro
    const ticketPricing = await this.buildTicketPricingBreakdown(
      dto,
      room,
      companyId,
      seatPricingContext,
    );

    const financialBreakdown = await this.calculateShowtimeFinancials(
      ticketPricing.averageSeatPrice,
      dto.movie_id,
      room.cinema_complex_id,
      startTime,
      companyId,
    );

    // Publicar dados financeiros no RabbitMQ
    await this.rabbitmq.publish({
      pattern: 'audit.showtime.created',
      data: {
        id: newShowtime.id,
        values: newShowtime,
        financialBreakdown,
      },
      metadata: { companyId, userId },
    });

    return newShowtime;
  }

  private assertShowtimeDateInFuture(startTime: Date): void {
    if (startTime < new Date()) {
      throw new ConflictException(
        'Não é possível criar uma sessão para uma data no passado.',
      );
    }
  }

  private async loadMovieAndRoom(
    movieId: string,
    roomId: string,
    companyId: string,
    requireMovieDuration = false,
  ) {
    const [movie, room] = await Promise.all([
      this.moviesRepository.findById(movieId),
      this.roomsRepository.findById(roomId),
    ]);

    if (!movie || movie.company_id !== companyId) {
      throw new NotFoundException('Filme não encontrado.');
    }

    if (requireMovieDuration && !movie.duration_minutes) {
      throw new BadRequestException(
        'O filme selecionado não tem uma duração cadastrada.',
      );
    }

    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }

    return { movie, room };
  }

  private async assertRoomComplexOwnership(
    cinemaComplexId: string,
    companyId: string,
  ): Promise<void> {
    const complex = await this.cacheService.wrap(
      `complex:${cinemaComplexId}`,
      () => this.cinemaComplexesRepository.findById(cinemaComplexId),
      3600000,
    );

    if (!complex || complex.company_id !== companyId) {
      throw new ForbiddenException(
        'Acesso negado. Esta sala não pertence à sua empresa.',
      );
    }
  }

  @Transactional()
  async update(id: string, dto: UpdateShowtimeDto): Promise<Showtime> {
    const companyId = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getUserId();

    const existingShowtime = await this.findOne(id);
    let newStartTime = new Date(existingShowtime.start_time);
    let newEndTime = new Date(existingShowtime.end_time);

    if (dto.start_time) {
      if (dto.start_time < new Date()) {
        throw new BadRequestException(
          'Não é possível mover uma sessão para uma data ou hora no passado.',
        );
      }
      newStartTime = dto.start_time;

      const movie = await this.moviesRepository.findById(
        existingShowtime.movie!.id,
      );
      if (!movie || !movie.duration_minutes) {
        throw new NotFoundException('Filme ou sua duração não encontrados.');
      }
      newEndTime = this.calculateSessionEndTime(
        newStartTime,
        movie.duration_minutes,
      );

      const overlappingSessions =
        await this.showtimesRepository.findOverlappingSessions(
          existingShowtime.room!.id,
          newStartTime,
          newEndTime,
          id,
        );

      if (overlappingSessions.length > 0) {
        throw new ConflictException(
          'A alteração de horário conflita com outra sessão já agendada.',
        );
      }
    }
    const updateData: Prisma.showtime_scheduleUpdateInput = {
      start_time: newStartTime,
      end_time: newEndTime,
      ...(dto.base_ticket_price && {
        base_ticket_price: dto.base_ticket_price,
      }),
      ...(dto.projection_type !== undefined && {
        projection_types: dto.projection_type
          ? { connect: { id: dto.projection_type } }
          : { disconnect: true },
      }),
      ...(dto.audio_type !== undefined && {
        audio_types: dto.audio_type
          ? { connect: { id: dto.audio_type } }
          : { disconnect: true },
      }),
      ...(dto.session_language !== undefined && {
        session_languages: dto.session_language
          ? { connect: { id: dto.session_language } }
          : { disconnect: true },
      }),
      ...(dto.status && {
        session_status: { connect: { id: dto.status } },
      }),
    };

    const updatedShowtime = await this.showtimesRepository.update(
      id,
      updateData,
    );

    await this.rabbitmq.publish({
      pattern: 'audit.showtime.updated',
      data: {
        id: updatedShowtime.id,
        new_values: updatedShowtime,
        old_values: existingShowtime,
      },
      metadata: { companyId, userId },
    });

    return updatedShowtime;
  }

  async getSeatsMap(id: string): Promise<ShowtimeSeatDto[]> {
    await this.findOne(id);

    const seatStatusList =
      await this.sessionSeatStatusRepository.findByShowtimeId(id);

    return seatStatusList.map((item) => ({
      seat_id: item.seat_id,
      row: item.seats.row_code,
      number: item.seats.column_number,
      accessible: item.seats.accessible ?? null,
      status: {
        id: item.seat_status.id,
        name: item.seat_status.name,
      },
      seat_type_id: item.seats.seat_type ?? null,
    }));
  }

  @Transactional()
  async remove(id: string): Promise<{ message: string }> {
    const companyId = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getUserId();
    const showtime = await this.findOne(id);

    const cancelledStatus =
      await this.sessionStatusRepository.findByNameAndCompany(
        'Cancelada',
        companyId,
      );

    if (!cancelledStatus) {
      throw new NotFoundException(
        'Status "Cancelada" não configurado para esta empresa. Não é possível cancelar a sessão.',
      );
    }

    await this.showtimesRepository.update(id, {
      session_status: { connect: { id: cancelledStatus.id } },
    });

    await this.rabbitmq.publish({
      pattern: 'audit.showtime.cancelled',
      data: { id: showtime.id, old_values: showtime },
      metadata: { companyId, userId },
    });

    return { message: 'Sessão cancelada com sucesso.' };
  }

  @Transactional()
  async updateSeatStatus(
    showtime_id: string,
    seat_id: string,
    status: 'Bloqueado' | 'Disponível',
  ): Promise<void> {
    const companyId = this.tenantContext.getCompanyId();
    const showtime = await this.showtimesRepository.findById(showtime_id);

    if (!showtime || showtime.cinema_complexes?.company_id !== companyId) {
      throw new NotFoundException('Sessão não encontrada.');
    }

    const blockedStatus = await this.seatStatusRepository.findByNameAndCompany(
      'Bloqueado',
      companyId,
    );
    const availableStatus =
      (await this.seatStatusRepository.findByNameAndCompany(
        'Disponível',
        companyId,
      )) || (await this.seatStatusRepository.findDefaultByCompany(companyId));

    if (!availableStatus) {
      throw new NotFoundException(
        'Status de assento "Disponível" não configurado',
      );
    }

    if (status === 'Bloqueado' && !blockedStatus) {
      throw new NotFoundException(
        'Status de assento "Bloqueado" não configurado',
      );
    }

    const currentSeatStatus =
      await this.sessionSeatStatusRepository.findBySeatAndShowtime(
        showtime_id,
        seat_id,
      );

    if (!currentSeatStatus) {
      throw new NotFoundException('Assento não encontrado para esta sessão.');
    }

    const targetSeatStatusId =
      status === 'Bloqueado' ? blockedStatus!.id : availableStatus.id;

    if (currentSeatStatus.status === targetSeatStatusId) {
      return;
    }

    if (
      status === 'Bloqueado' &&
      currentSeatStatus.status === availableStatus.id
    ) {
      const didBlock =
        await this.showtimesRepository.blockSeatsCountersAtomically(
          showtime_id,
          1,
        );
      if (!didBlock) {
        throw new ConflictException(
          'Não foi possível bloquear assento: não há assentos disponíveis suficientes.',
        );
      }
    }

    if (
      status === 'Disponível' &&
      blockedStatus &&
      currentSeatStatus.status === blockedStatus.id
    ) {
      await this.showtimesRepository.unblockSeatsCountersSafely(showtime_id, 1);
    }

    const updateData: Prisma.session_seat_statusUpdateInput = {
      seat_status: { connect: { id: targetSeatStatusId } },
    };

    if (status === 'Disponível') {
      updateData.reservation_uuid = null;
      updateData.reservation_date = null;
      updateData.expiration_date = null;
    }

    await this.sessionSeatStatusRepository.updateStatus(
      showtime_id,
      seat_id,
      updateData,
    );
  }
}
