import { Test, TestingModule } from '@nestjs/testing';
import { ExhibitionContractsRepository } from './exhibition-contracts.repository';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ExhibitionContractsRepository', () => {
  let repositorio: ExhibitionContractsRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    exhibition_contracts: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        ExhibitionContractsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repositorio = modulo.get<ExhibitionContractsRepository>(
      ExhibitionContractsRepository,
    );
    prisma = modulo.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findActiveContract', () => {
    it('deve encontrar um contrato ativo para o filme e complexo informados', async () => {
      const filmeId = 'filme-123';
      const complexoId = 'complexo-456';
      const data = new Date('2025-11-17');

      const contratoMock = {
        id: 'contrato-789',
        movie_id: filmeId,
        cinema_complex_id: complexoId,
        distributor_percentage: 47.5,
        exhibitor_percentage: 52.5,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        active: true,
        contract_types: { id: 'tipo-1', name: 'Padrão' },
      };

      mockPrismaService.exhibition_contracts.findFirst.mockResolvedValue(
        contratoMock,
      );

      const resultado = await repositorio.findActiveContract(
        filmeId,
        complexoId,
        data,
      );

      expect(resultado).toEqual(contratoMock);
      expect(prisma.exhibition_contracts.findFirst).toHaveBeenCalledWith({
        where: {
          movie_id: filmeId,
          cinema_complex_id: complexoId,
          active: true,
          start_date: { lte: data },
          end_date: { gte: data },
        },
        include: {
          contract_types: true,
          sliding_scales: { orderBy: { week_number: 'asc' } },
        },
      });
    });

    it('deve retornar null quando nenhum contrato ativo for encontrado', async () => {
      mockPrismaService.exhibition_contracts.findFirst.mockResolvedValue(null);

      const resultado = await repositorio.findActiveContract(
        'filme-123',
        'complexo-456',
        new Date(),
      );

      expect(resultado).toBeNull();
    });

    it('deve usar filtro de data final maior/igual à data informada', async () => {
      const contratoMock = {
        id: 'contrato-789',
        movie_id: 'filme-123',
        cinema_complex_id: 'complexo-456',
        distributor_percentage: 50.0,
        exhibitor_percentage: 50.0,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
        active: true,
      };

      mockPrismaService.exhibition_contracts.findFirst.mockResolvedValue(
        contratoMock,
      );

      const resultado = await repositorio.findActiveContract(
        'filme-123',
        'complexo-456',
        new Date('2025-11-17T00:00:00.000Z'),
      );

      expect(resultado).toEqual(contratoMock);
      expect(prisma.exhibition_contracts.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            end_date: { gte: new Date('2025-11-17T00:00:00.000Z') },
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('deve encontrar contrato pelo id', async () => {
      const contratoId = 'contrato-789';
      const contratoMock = {
        id: contratoId,
        movie_id: 'filme-123',
        cinema_complex_id: 'complexo-456',
        distributor_percentage: 47.5,
        exhibitor_percentage: 52.5,
      };

      mockPrismaService.exhibition_contracts.findUnique.mockResolvedValue(
        contratoMock,
      );

      const resultado = await repositorio.findById(contratoId);

      expect(resultado).toEqual(contratoMock);
      expect(prisma.exhibition_contracts.findUnique).toHaveBeenCalledWith({
        where: { id: contratoId },
        include: {
          contract_types: true,
          sliding_scales: { orderBy: { week_number: 'asc' } },
        },
      });
    });

    it('deve retornar null quando contrato não for encontrado', async () => {
      mockPrismaService.exhibition_contracts.findUnique.mockResolvedValue(null);

      const resultado = await repositorio.findById('id-invalido');

      expect(resultado).toBeNull();
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os contratos que correspondem ao filtro', async () => {
      const contratosMock = [
        { id: 'contrato-1', movie_id: 'filme-123' },
        { id: 'contrato-2', movie_id: 'filme-123' },
      ];

      mockPrismaService.exhibition_contracts.findMany.mockResolvedValue(
        contratosMock,
      );

      const resultado = await repositorio.findAll({ movie_id: 'filme-123' });

      expect(resultado).toEqual(contratosMock);
      expect(prisma.exhibition_contracts.findMany).toHaveBeenCalledWith({
        where: { movie_id: 'filme-123' },
        include: {
          contract_types: true,
          sliding_scales: { orderBy: { week_number: 'asc' } },
        },
        orderBy: { start_date: 'desc' },
      });
    });
  });
});
