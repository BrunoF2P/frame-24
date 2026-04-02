import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { ShowtimesService } from './showtimes.service';
import { ShowtimesRepository } from '../repositories/showtime.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { SessionStatusRepository } from 'src/modules/operations/session-status/repositories/session-status.repository';
import { RoomsRepository } from '../../rooms/repositories/rooms.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { MovieRepository } from 'src/modules/catalog/movies/repositories/movie.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { SeatStatusRepository } from 'src/modules/operations/seat-status/repositories/seat-status.repository';
import { ExhibitionContractsRepository } from 'src/modules/contracts/repositories/exhibition-contracts.repository';
import { MunicipalTaxParametersRepository } from 'src/modules/tax/repositories/municipal-tax-parameters.repository';
import { FederalTaxRatesRepository } from 'src/modules/tax/repositories/federal-tax-rates.repository';
import { SeatTypesRepository } from 'src/modules/operations/seat-types/repositories/seat-types.repository';
import { ProjectionTypesRepository } from 'src/modules/operations/projection-types/repositories/projection-types.repository';
import { AudioTypesRepository } from 'src/modules/operations/audio-types/repositories/audio-types.repository';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import { CacheService } from 'src/common/cache/cache.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('ShowtimesService', () => {
  let service: ShowtimesService;
  let exhibitionContractsRepository: jest.Mocked<ExhibitionContractsRepository>;
  let municipalTaxParametersRepository: jest.Mocked<MunicipalTaxParametersRepository>;
  let federalTaxRatesRepository: jest.Mocked<FederalTaxRatesRepository>;
  let cinemaComplexesRepository: jest.Mocked<CinemaComplexesRepository>;
  let moviesRepository: jest.Mocked<MovieRepository>;
  let roomsRepository: jest.Mocked<RoomsRepository>;
  let seatsRepository: jest.Mocked<SeatsRepository>;
  let seatTypesRepository: jest.Mocked<SeatTypesRepository>;
  let projectionTypesRepository: jest.Mocked<ProjectionTypesRepository>;
  let audioTypesRepository: jest.Mocked<AudioTypesRepository>;
  let showtimesRepository: jest.Mocked<ShowtimesRepository>;
  let sessionSeatStatusRepository: jest.Mocked<SessionSeatStatusRepository>;
  let seatStatusRepository: jest.Mocked<SeatStatusRepository>;
  let sessionStatusRepository: jest.Mocked<SessionStatusRepository>;
  let rabbitmq: jest.Mocked<RabbitMQPublisherService>;
  let cls: jest.Mocked<TenantContextService>;
  const COMPANY_ID = 'company-123';
  const USER_ID = 'user-123';

  const mockMovie = {
    id: 'movie-123',
    company_id: 'company-123',
    duration_minutes: 120,
  };

  const mockRoom = {
    id: 'room-123',
    cinema_complex_id: 'complex-123',
    capacity: 100,
  };

  const mockComplex = {
    id: 'complex-123',
    company_id: 'company-123',
    ibge_municipality_code: '3550308',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowtimesService,
        {
          provide: ShowtimesRepository,
          useValue: {
            findById: jest.fn(),
            findAll: jest.fn(),
            findOverlappingSessions: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            blockSeatsCountersAtomically: jest.fn(),
            unblockSeatsCountersSafely: jest.fn(),
          },
        },
        {
          provide: SessionSeatStatusRepository,
          useValue: {
            createMany: jest.fn(),
            findByShowtimeId: jest.fn(),
            findBySeatAndShowtime: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: SessionStatusRepository,
          useValue: {
            findByNameAndCompany: jest.fn(),
          },
        },
        {
          provide: RoomsRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SeatsRepository,
          useValue: {
            findByRoomId: jest.fn(),
          },
        },
        {
          provide: MovieRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: CinemaComplexesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SeatStatusRepository,
          useValue: {
            findByNameAndCompany: jest.fn(),
            findDefaultByCompany: jest.fn(),
          },
        },
        {
          provide: ExhibitionContractsRepository,
          useValue: {
            findActiveContract: jest.fn(),
          },
        },
        {
          provide: MunicipalTaxParametersRepository,
          useValue: {
            findActiveByCompanyAndIbge: jest.fn(),
          },
        },
        {
          provide: FederalTaxRatesRepository,
          useValue: {
            findActiveByCompany: jest.fn(),
          },
        },
        {
          provide: SeatTypesRepository,
          useValue: {
            findByIds: jest.fn(),
          },
        },
        {
          provide: ProjectionTypesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: AudioTypesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SnowflakeService,
          useValue: {
            generate: jest.fn(() => 'snowflake-id'),
          },
        },
        {
          provide: RabbitMQPublisherService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            wrap: jest.fn((_key: string, fn: () => unknown) => fn()),
            getCompanyId: jest.fn(),
            getUserId: jest.fn(),
            getRequiredUserId: jest.fn(),
            getCustomerId: jest.fn(),
            getSessionContext: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getCompanyId: jest.fn(),
            getUserId: jest.fn(),
            getRequiredUserId: jest.fn(),
            getCustomerId: jest.fn(),
            getSessionContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShowtimesService>(ShowtimesService);
    exhibitionContractsRepository = module.get(ExhibitionContractsRepository);
    municipalTaxParametersRepository = module.get(
      MunicipalTaxParametersRepository,
    );
    federalTaxRatesRepository = module.get(FederalTaxRatesRepository);
    cinemaComplexesRepository = module.get(CinemaComplexesRepository);
    moviesRepository = module.get(MovieRepository);
    roomsRepository = module.get(RoomsRepository);
    seatsRepository = module.get(SeatsRepository);
    seatTypesRepository = module.get(SeatTypesRepository);
    projectionTypesRepository = module.get(ProjectionTypesRepository);
    audioTypesRepository = module.get(AudioTypesRepository);
    showtimesRepository = module.get(ShowtimesRepository);
    sessionSeatStatusRepository = module.get(SessionSeatStatusRepository);
    seatStatusRepository = module.get(SeatStatusRepository);
    sessionStatusRepository = module.get(SessionStatusRepository);
    rabbitmq = module.get(RabbitMQPublisherService);
    cls = module.get(TenantContextService);

    cls.getCompanyId.mockReturnValue(COMPANY_ID);
    cls.getUserId.mockReturnValue(USER_ID);
    cls.getRequiredUserId.mockReturnValue(USER_ID);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateShowtimeFinancials', () => {
    const baseTicketPrice = 25.0;
    const movieId = 'movie-123';
    const cinemaComplexId = 'complex-123';
    const sessionDate = new Date('2025-11-17T20:00:00Z');
    const companyId = 'company-123';

    it('deve calcular breakdown financeiro com contrato e impostos encontrados', async () => {
      const mockContract = {
        id: 'contract-123',
        distributor_percentage: 47.5,
        exhibitor_percentage: 52.5,
        start_date: new Date('2025-11-10T00:00:00Z'),
        sliding_scales: [],
      };

      const mockMunicipalTax = {
        id: 'municipal-tax-123',
        iss_rate: 5.0,
      };

      const mockFederalTax = {
        id: 'federal-tax-123',
        pis_rate: 1.65,
        cofins_rate: 7.6,
      };

      exhibitionContractsRepository.findActiveContract.mockResolvedValue(
        mockContract as any,
      );
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        mockMunicipalTax as any,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(
        mockFederalTax as any,
      );

      const result = await (service as any).calculateShowtimeFinancials(
        baseTicketPrice,
        movieId,
        cinemaComplexId,
        sessionDate,
        companyId,
      );

      expect(result).toMatchObject({
        baseTicketPrice: 25.0,
        distributorShare: 11.875, // 25 * 0.475
        exhibitorGross: 13.125, // 25 * 0.525
        issRate: 5.0,
        pisRate: 1.65,
        cofinsRate: 7.6,
        contractUsed: true,
        distributorPercentage: 47.5,
        exhibitorPercentage: 52.5,
      });

      expect(result.issAmount).toBeCloseTo(0.65625, 2); // 13.125 * 0.05
      expect(result.pisAmount).toBeCloseTo(0.2165625, 2); // 13.125 * 0.0165
      expect(result.cofinsAmount).toBeCloseTo(0.9975, 2); // 13.125 * 0.076
      expect(result.totalTaxes).toBeCloseTo(1.8703125, 2);
      expect(result.netRevenue).toBeCloseTo(11.2546875, 2);
    });

    it('deve usar fallback quando não há contrato específico', async () => {
      const mockMunicipalTax = {
        id: 'municipal-tax-123',
        iss_rate: 5.0,
      };

      const mockFederalTax = {
        id: 'federal-tax-123',
        pis_rate: 1.65,
        cofins_rate: 7.6,
      };

      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        mockMunicipalTax as any,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(
        mockFederalTax as any,
      );

      const result = await (service as any).calculateShowtimeFinancials(
        baseTicketPrice,
        movieId,
        cinemaComplexId,
        sessionDate,
        companyId,
      );

      expect(result).toMatchObject({
        baseTicketPrice: 25.0,
        distributorShare: 0,
        exhibitorGross: 25,
        contractUsed: false,
        distributorPercentage: 0,
        exhibitorPercentage: 100,
      });
    });

    it('deve usar valores zero quando não há impostos encontrados', async () => {
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        null,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(null);

      const result = await (service as any).calculateShowtimeFinancials(
        baseTicketPrice,
        movieId,
        cinemaComplexId,
        sessionDate,
        companyId,
      );

      expect(result).toMatchObject({
        baseTicketPrice: 25.0,
        issRate: 0,
        issAmount: 0,
        pisRate: 0,
        pisAmount: 0,
        cofinsRate: 0,
        cofinsAmount: 0,
        totalTaxes: 0,
        netRevenue: 25, // exhibitorGross sem impostos
      });
    });

    it('deve aplicar escala móvel quando disponível', async () => {
      const mockContract = {
        id: 'contract-123',
        distributor_percentage: 40,
        exhibitor_percentage: 60,
        start_date: new Date('2025-11-01T00:00:00Z'),
        sliding_scales: [
          {
            id: 'scale-1',
            week_number: 1,
            distributor_percentage: 60,
            exhibitor_percentage: 40,
          },
          {
            id: 'scale-3',
            week_number: 3,
            distributor_percentage: 45,
            exhibitor_percentage: 55,
          },
        ],
      };

      exhibitionContractsRepository.findActiveContract.mockResolvedValue(
        mockContract as any,
      );
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        null,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(null);

      const weekThreeDate = new Date('2025-11-20T00:00:00Z');

      const result = await (service as any).calculateShowtimeFinancials(
        baseTicketPrice,
        movieId,
        cinemaComplexId,
        weekThreeDate,
        companyId,
      );

      expect(result.distributorPercentage).toBe(45);
      expect(result.exhibitorPercentage).toBe(55);
      expect(result.distributorShare).toBeCloseTo(11.25);
      expect(result.exhibitorGross).toBeCloseTo(13.75);
    });

    it('deve lançar NotFoundException quando complexo não é encontrado', async () => {
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      cinemaComplexesRepository.findById.mockResolvedValue(null);

      await expect(
        (service as any).calculateShowtimeFinancials(
          baseTicketPrice,
          movieId,
          cinemaComplexId,
          sessionDate,
          companyId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('preview', () => {
    const mockDto = {
      movie_id: 'movie-123',
      room_id: 'room-123',
      start_time: new Date('2025-11-17T20:00:00Z'),
      base_ticket_price: 25.0,
      session_language: 'lang-123',
    };

    it('deve retornar projeção financeira calculada', async () => {
      const mockContract = {
        id: 'contract-123',
        distributor_percentage: 47.5,
        exhibitor_percentage: 52.5,
        start_date: new Date('2025-11-01T00:00:00Z'),
        sliding_scales: [],
      };

      const mockMunicipalTax = {
        id: 'municipal-tax-123',
        iss_rate: 5.0,
      };

      const mockFederalTax = {
        id: 'federal-tax-123',
        pis_rate: 1.65,
        cofins_rate: 7.6,
      };

      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(
        mockContract as any,
      );
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        mockMunicipalTax as any,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(
        mockFederalTax as any,
      );
      seatsRepository.findByRoomId.mockResolvedValue([
        { id: 'seat-1', seat_type: null, active: true },
      ] as any);
      seatTypesRepository.findByIds.mockResolvedValue([]);

      const result = await service.preview(mockDto as any);

      expect(result).toHaveProperty('baseTicketPrice', 25.0);
      expect(result).toHaveProperty('distributorShare');
      expect(result).toHaveProperty('exhibitorGross');
      expect(result).toHaveProperty('netRevenue');
      expect(result.ticketPricing).toMatchObject({
        requestedBasePrice: 25,
        basePriceWithModifiers: 25,
        averageSeatPrice: 25,
      });
      expect(result.ticketPricing?.seatTypes).toHaveLength(1);
    });

    it('deve considerar adicionais de áudio, projeção e tipos de assento', async () => {
      const dtoWithExtras = {
        ...mockDto,
        base_ticket_price: 20,
        projection_type: 'proj-123',
        audio_type: 'audio-123',
      };

      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        null,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(null);

      projectionTypesRepository.findById.mockResolvedValue({
        id: 'proj-123',
        company_id: COMPANY_ID,
        additional_value: 7,
      } as any);
      audioTypesRepository.findById.mockResolvedValue({
        id: 'audio-123',
        company_id: COMPANY_ID,
        additional_value: 3,
      } as any);

      const seatTypeId = 'seat-type-1';
      seatsRepository.findByRoomId.mockResolvedValue([
        { id: 'seat-1', seat_type: null, active: true },
        { id: 'seat-2', seat_type: seatTypeId, active: true },
      ] as any);
      seatTypesRepository.findByIds.mockResolvedValue([
        {
          id: seatTypeId,
          name: 'VIP',
          additional_value: 5,
        },
      ] as any);

      const result = await service.preview(dtoWithExtras as any);

      expect(result.baseTicketPrice).toBe(32.5); // média ponderada
      expect(result.ticketPricing).toMatchObject({
        requestedBasePrice: 20,
        projectionAdditional: 7,
        audioAdditional: 3,
        basePriceWithModifiers: 30,
        minSeatPrice: 30,
        maxSeatPrice: 35,
        averageSeatPrice: 32.5,
      });
      expect(result.ticketPricing?.seatTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            seat_type_id: null,
            final_price: 30,
          }),
          expect.objectContaining({
            seat_type_id: seatTypeId,
            final_price: 35,
          }),
        ]),
      );
    });

    it('deve lançar NotFoundException quando filme não é encontrado', async () => {
      moviesRepository.findById.mockResolvedValue(null);

      await expect(service.preview(mockDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar NotFoundException quando sala não é encontrada', async () => {
      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(null);

      await expect(service.preview(mockDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException quando sala não pertence à empresa', async () => {
      const wrongCompanyComplex = {
        ...mockComplex,
        company_id: 'wrong-company',
      };

      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      cinemaComplexesRepository.findById.mockResolvedValue(
        wrongCompanyComplex as any,
      );

      await expect(service.preview(mockDto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar ForbiddenException quando tipo de projeção é de outra empresa', async () => {
      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        null,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(null);
      seatsRepository.findByRoomId.mockResolvedValue([] as any);
      seatTypesRepository.findByIds.mockResolvedValue([] as any);
      projectionTypesRepository.findById.mockResolvedValue({
        id: 'proj-wrong',
        company_id: 'other-company',
        additional_value: 5,
      } as any);

      await expect(
        service.preview({ ...mockDto, projection_type: 'proj-wrong' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException quando tipo de áudio é de outra empresa', async () => {
      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        null,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(null);
      seatsRepository.findByRoomId.mockResolvedValue([] as any);
      seatTypesRepository.findByIds.mockResolvedValue([] as any);
      projectionTypesRepository.findById.mockResolvedValue({
        id: 'proj-ok',
        company_id: COMPANY_ID,
        additional_value: 1,
      } as any);
      audioTypesRepository.findById.mockResolvedValue({
        id: 'audio-wrong',
        company_id: 'other-company',
        additional_value: 5,
      } as any);

      await expect(
        service.preview({
          ...mockDto,
          projection_type: 'proj-ok',
          audio_type: 'audio-wrong',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('internal pricing and contract helpers', () => {
    it('deve usar fallback de assentos quando todos estão inativos e sem capacidade', () => {
      const result = (service as any).buildSeatPricingDetails(
        {
          activeSeats: [{ id: 'seat-1', active: false, seat_type: null }],
          seatTypeMeta: new Map(),
        },
        22,
        undefined,
      );

      expect(result).toEqual([
        {
          seat_type_id: null,
          seat_type_name: 'Padrão',
          seat_count: 1,
          additional_value: 0,
          final_price: 22,
        },
      ]);
    });

    it('deve escolher primeira escala quando semana calculada é antes da inicial', () => {
      const contract = {
        distributor_percentage: 40,
        exhibitor_percentage: 60,
        start_date: new Date('2026-01-10T00:00:00.000Z'),
        sliding_scales: [
          {
            week_number: 3,
            distributor_percentage: 35,
            exhibitor_percentage: 65,
          },
          {
            week_number: 1,
            distributor_percentage: 50,
            exhibitor_percentage: 50,
          },
        ],
      };

      const result = (service as any).resolveContractPercentages(
        contract,
        new Date('2026-01-05T00:00:00.000Z'),
      );

      expect(result).toEqual({ distributor: 50, exhibitor: 50 });
    });

    it('deve escolher última escala anterior quando não há semana exata', () => {
      const contract = {
        distributor_percentage: 40,
        exhibitor_percentage: 60,
        start_date: new Date('2026-01-01T00:00:00.000Z'),
        sliding_scales: [
          {
            week_number: 1,
            distributor_percentage: 60,
            exhibitor_percentage: 40,
          },
          {
            week_number: 3,
            distributor_percentage: 45,
            exhibitor_percentage: 55,
          },
        ],
      };

      const result = (service as any).resolveContractPercentages(
        contract,
        new Date('2026-01-12T00:00:00.000Z'),
      );

      expect(result).toEqual({ distributor: 60, exhibitor: 40 });
    });
  });

  describe('create', () => {
    const baseDto = {
      movie_id: 'movie-123',
      room_id: 'room-123',
      start_time: new Date(Date.now() + 60 * 60 * 1000),
      base_ticket_price: 25,
      session_language: 'lang-123',
    };

    it('deve rejeitar criação no passado', async () => {
      await expect(async () =>
        service.create({
          ...baseDto,
          start_time: new Date(Date.now() - 60 * 60 * 1000),
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('deve rejeitar quando filme não possui duração', async () => {
      moviesRepository.findById.mockResolvedValue({
        ...mockMovie,
        duration_minutes: null,
      } as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);

      await expect(async () => service.create(baseDto as any)).rejects.toThrow(
        'O filme selecionado não tem uma duração cadastrada.',
      );
    });

    it('deve rejeitar quando há conflito de horário', async () => {
      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      showtimesRepository.findOverlappingSessions.mockResolvedValue([
        { id: 'show-conflict' },
      ] as any);

      await expect(async () => service.create(baseDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve criar sessão, assentos e publicar auditoria', async () => {
      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      showtimesRepository.findOverlappingSessions.mockResolvedValue([] as any);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      showtimesRepository.create.mockResolvedValue({ id: 'show-1' } as any);
      seatsRepository.findByRoomId.mockResolvedValue([
        { id: 'seat-1', seat_type: null, active: true },
      ] as any);
      seatTypesRepository.findByIds.mockResolvedValue([] as any);
      seatStatusRepository.findDefaultByCompany.mockResolvedValue({
        id: 'status-available',
      } as any);
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        null,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(null);

      const result = await service.create(baseDto as any);

      expect(showtimesRepository.create).toHaveBeenCalled();
      expect(sessionSeatStatusRepository.createMany).toHaveBeenCalledTimes(1);
      expect(rabbitmq.publish).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'audit.showtime.created' }),
      );
      expect(result).toEqual({ id: 'show-1' });
    });

    it('deve considerar buffer operacional no cálculo de término', async () => {
      const startTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const dto = { ...baseDto, start_time: startTime };

      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      showtimesRepository.findOverlappingSessions.mockResolvedValue([] as any);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      showtimesRepository.create.mockResolvedValue({ id: 'show-1' } as any);
      seatsRepository.findByRoomId.mockResolvedValue([
        { id: 'seat-1', seat_type: null, active: true },
      ] as any);
      seatTypesRepository.findByIds.mockResolvedValue([] as any);
      seatStatusRepository.findDefaultByCompany.mockResolvedValue({
        id: 'status-available',
      } as any);
      exhibitionContractsRepository.findActiveContract.mockResolvedValue(null);
      municipalTaxParametersRepository.findActiveByCompanyAndIbge.mockResolvedValue(
        null,
      );
      federalTaxRatesRepository.findActiveByCompany.mockResolvedValue(null);

      await service.create(dto as any);

      const expectedEndTime = new Date(
        startTime.getTime() + (120 + 35) * 60 * 1000,
      );

      expect(showtimesRepository.findOverlappingSessions).toHaveBeenCalledWith(
        dto.room_id,
        startTime,
        expectedEndTime,
      );
    });

    it('deve rejeitar quando não há status padrão de assento', async () => {
      moviesRepository.findById.mockResolvedValue(mockMovie as any);
      roomsRepository.findById.mockResolvedValue(mockRoom as any);
      showtimesRepository.findOverlappingSessions.mockResolvedValue([] as any);
      cinemaComplexesRepository.findById.mockResolvedValue(mockComplex as any);
      showtimesRepository.create.mockResolvedValue({ id: 'show-1' } as any);
      seatsRepository.findByRoomId.mockResolvedValue([
        { id: 'seat-1', seat_type: null, active: true },
      ] as any);
      seatTypesRepository.findByIds.mockResolvedValue([] as any);
      seatStatusRepository.findDefaultByCompany.mockResolvedValue(null);

      await expect(async () => service.create(baseDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('deve lançar not found quando sessão não existe', async () => {
      showtimesRepository.findById.mockResolvedValue(null as any);

      await expect(service.findOne('show-404')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar forbidden para sessão de outra empresa', async () => {
      showtimesRepository.findById.mockResolvedValue({
        id: 'show-1',
        movie_id: 'movie-1',
        start_time: new Date(),
        end_time: new Date(),
        base_ticket_price: 10,
        available_seats: 1,
        sold_seats: 0,
        blocked_seats: 0,
        cinema_complexes: { company_id: 'other-company' },
      } as any);

      await expect(service.findOne('show-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve retornar sessão mapeada quando válida', async () => {
      showtimesRepository.findById.mockResolvedValue({
        id: 'show-1',
        movie_id: 'movie-1',
        start_time: new Date('2026-03-01T10:00:00.000Z'),
        end_time: new Date('2026-03-01T12:00:00.000Z'),
        base_ticket_price: 10,
        available_seats: 50,
        sold_seats: 10,
        blocked_seats: 5,
        rooms: { id: 'room-1', name: 'Sala 1', capacity: 100 },
        cinema_complexes: {
          id: 'cx-1',
          name: 'Complexo',
          company_id: COMPANY_ID,
        },
        projection_types: null,
        audio_types: null,
        session_languages: null,
        session_status: null,
      } as any);
      moviesRepository.findById.mockResolvedValue({ id: 'movie-1' } as any);

      const result = await service.findOne('show-1');

      expect(result.id).toBe('show-1');
      expect(result.movie).toEqual({ id: 'movie-1' });
    });
  });

  describe('findAll', () => {
    it('deve montar filtros e delegar para repository', async () => {
      showtimesRepository.findAll.mockResolvedValue([] as any);

      await service.findAll({
        cinema_complex_id: 'cx-1',
        room_id: 'room-1',
        movie_id: 'movie-1',
        start_time: new Date('2026-03-01T10:00:00.000Z'),
        status: 'status-1',
      });

      expect(showtimesRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          cinema_complexes: { company_id: COMPANY_ID },
          cinema_complex_id: 'cx-1',
          room_id: 'room-1',
          movie_id: 'movie-1',
          status: 'status-1',
        }),
      );
    });
  });

  describe('update', () => {
    const baseExisting = {
      id: 'show-1',
      start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      room: { id: 'room-1' },
      movie: { id: 'movie-1' },
    } as any;

    it('deve rejeitar update com data no passado', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(baseExisting);

      await expect(
        service.update('show-1', {
          start_time: new Date(Date.now() - 60 * 60 * 1000),
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar quando filme não possui duração no recálculo', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(baseExisting);
      moviesRepository.findById.mockResolvedValue({
        id: 'movie-1',
        duration_minutes: null,
      } as any);

      await expect(
        service.update('show-1', {
          start_time: new Date(Date.now() + 3 * 60 * 60 * 1000),
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar quando novo horário conflita', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(baseExisting);
      moviesRepository.findById.mockResolvedValue({
        id: 'movie-1',
        duration_minutes: 120,
      } as any);
      showtimesRepository.findOverlappingSessions.mockResolvedValue([
        { id: 'conflict' },
      ] as any);

      await expect(
        service.update('show-1', {
          start_time: new Date(Date.now() + 3 * 60 * 60 * 1000),
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('deve considerar buffer operacional no recálculo de conflito', async () => {
      const existing = {
        ...baseExisting,
        room: { id: 'room-1' },
        movie: { id: 'movie-1' },
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existing);
      moviesRepository.findById.mockResolvedValue({
        id: 'movie-1',
        duration_minutes: 120,
      } as any);
      showtimesRepository.findOverlappingSessions.mockResolvedValue([] as any);
      showtimesRepository.update.mockResolvedValue({ id: 'show-1' } as any);

      const nextStart = new Date(Date.now() + 4 * 60 * 60 * 1000);
      await service.update('show-1', { start_time: nextStart } as any);

      const expectedEndTime = new Date(
        nextStart.getTime() + (120 + 35) * 60 * 1000,
      );

      expect(showtimesRepository.findOverlappingSessions).toHaveBeenCalledWith(
        'room-1',
        nextStart,
        expectedEndTime,
        'show-1',
      );
    });

    it('deve atualizar e publicar auditoria', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(baseExisting);
      showtimesRepository.update.mockResolvedValue({ id: 'show-1' } as any);

      const result = await service.update('show-1', {
        base_ticket_price: 30,
      } as any);

      expect(showtimesRepository.update).toHaveBeenCalled();
      expect(rabbitmq.publish).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'audit.showtime.updated' }),
      );
      expect(result).toEqual({ id: 'show-1' });
    });

    it('deve enviar disconnect para projeção e áudio quando nulos', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(baseExisting);
      showtimesRepository.update.mockResolvedValue({ id: 'show-1' } as any);

      await service.update('show-1', {
        projection_type: null,
        audio_type: null,
      } as any);

      expect(showtimesRepository.update).toHaveBeenCalledWith(
        'show-1',
        expect.objectContaining({
          projection_types: { disconnect: true },
          audio_types: { disconnect: true },
        }),
      );
    });
  });

  describe('getSeatsMap', () => {
    it('deve mapear status dos assentos', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'show-1' } as any);
      sessionSeatStatusRepository.findByShowtimeId.mockResolvedValue([
        {
          seat_id: 'seat-1',
          seats: {
            row_code: 'A',
            column_number: 1,
            accessible: false,
            seat_type: 'type-1',
          },
          seat_status: { id: 'status-1', name: 'Disponível' },
        },
      ] as any);

      const result = await service.getSeatsMap('show-1');

      expect(result).toEqual([
        {
          seat_id: 'seat-1',
          row: 'A',
          number: 1,
          accessible: false,
          status: { id: 'status-1', name: 'Disponível' },
          seat_type_id: 'type-1',
        },
      ]);
    });
  });

  describe('remove', () => {
    it('deve rejeitar quando status Cancelada não existe', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'show-1' } as any);
      sessionStatusRepository.findByNameAndCompany.mockResolvedValue(
        null as any,
      );

      await expect(service.remove('show-1')).rejects.toThrow(NotFoundException);
    });

    it('deve cancelar sessão e publicar auditoria', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'show-1' } as any);
      sessionStatusRepository.findByNameAndCompany.mockResolvedValue({
        id: 'cancelled-1',
      } as any);
      showtimesRepository.update.mockResolvedValue({ id: 'show-1' } as any);

      const result = await service.remove('show-1');

      expect(showtimesRepository.update).toHaveBeenCalled();
      expect(rabbitmq.publish).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'audit.showtime.cancelled' }),
      );
      expect(result).toEqual({ message: 'Sessão cancelada com sucesso.' });
    });
  });

  describe('updateSeatStatus', () => {
    it('deve lançar not found quando sessão não existe', async () => {
      showtimesRepository.findById.mockResolvedValue(null as any);

      await expect(
        service.updateSeatStatus('show-1', 'seat-1', 'Bloqueado'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar not found quando status não configurado', async () => {
      showtimesRepository.findById.mockResolvedValue({
        id: 'show-1',
        cinema_complexes: { company_id: COMPANY_ID },
      } as any);
      seatStatusRepository.findByNameAndCompany.mockResolvedValue(null as any);
      seatStatusRepository.findDefaultByCompany.mockResolvedValue(null as any);

      await expect(
        service.updateSeatStatus('show-1', 'seat-1', 'Bloqueado'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve limpar reserva ao marcar como Disponível', async () => {
      showtimesRepository.findById.mockResolvedValue({
        id: 'show-1',
        cinema_complexes: { company_id: COMPANY_ID },
      } as any);
      seatStatusRepository.findByNameAndCompany
        .mockResolvedValueOnce({ id: 'status-blocked' } as any)
        .mockResolvedValueOnce({ id: 'status-available' } as any);
      sessionSeatStatusRepository.findBySeatAndShowtime.mockResolvedValue({
        status: 'status-blocked',
      } as any);
      showtimesRepository.unblockSeatsCountersSafely.mockResolvedValue(
        true as any,
      );

      await service.updateSeatStatus('show-1', 'seat-1', 'Disponível');

      expect(
        showtimesRepository.unblockSeatsCountersSafely,
      ).toHaveBeenCalledWith('show-1', 1);

      expect(sessionSeatStatusRepository.updateStatus).toHaveBeenCalledWith(
        'show-1',
        'seat-1',
        expect.objectContaining({
          reservation_uuid: null,
          reservation_date: null,
          expiration_date: null,
        }),
      );
    });

    it('deve usar status padrão quando nome não é encontrado', async () => {
      showtimesRepository.findById.mockResolvedValue({
        id: 'show-1',
        cinema_complexes: { company_id: COMPANY_ID },
      } as any);
      seatStatusRepository.findByNameAndCompany
        .mockResolvedValueOnce({ id: 'status-blocked' } as any)
        .mockResolvedValueOnce(null as any);
      seatStatusRepository.findDefaultByCompany.mockResolvedValue({
        id: 'status-default',
      } as any);
      sessionSeatStatusRepository.findBySeatAndShowtime.mockResolvedValue({
        status: 'status-default',
      } as any);
      showtimesRepository.blockSeatsCountersAtomically.mockResolvedValue(
        true as any,
      );

      await service.updateSeatStatus('show-1', 'seat-1', 'Bloqueado');

      expect(
        showtimesRepository.blockSeatsCountersAtomically,
      ).toHaveBeenCalledWith('show-1', 1);

      expect(sessionSeatStatusRepository.updateStatus).toHaveBeenCalledWith(
        'show-1',
        'seat-1',
        expect.objectContaining({
          seat_status: { connect: { id: 'status-blocked' } },
        }),
      );
    });

    it('deve lançar conflito ao bloquear sem assentos disponíveis', async () => {
      showtimesRepository.findById.mockResolvedValue({
        id: 'show-1',
        cinema_complexes: { company_id: COMPANY_ID },
      } as any);
      seatStatusRepository.findByNameAndCompany
        .mockResolvedValueOnce({ id: 'status-blocked' } as any)
        .mockResolvedValueOnce({ id: 'status-available' } as any);
      sessionSeatStatusRepository.findBySeatAndShowtime.mockResolvedValue({
        status: 'status-available',
      } as any);
      showtimesRepository.blockSeatsCountersAtomically.mockResolvedValue(
        false as any,
      );

      await expect(
        service.updateSeatStatus('show-1', 'seat-1', 'Bloqueado'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
