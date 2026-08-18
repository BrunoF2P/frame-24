import { Test, TestingModule } from '@nestjs/testing';
import { MunicipalTaxParametersRepository } from './municipal-tax-parameters.repository';
import { PrismaService } from 'src/prisma/prisma.service';

describe('MunicipalTaxParametersRepository', () => {
  let repositorio: MunicipalTaxParametersRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    municipal_tax_parameters: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        MunicipalTaxParametersRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repositorio = modulo.get<MunicipalTaxParametersRepository>(
      MunicipalTaxParametersRepository,
    );
    prisma = modulo.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findActiveByCompanyAndIbge', () => {
    it('deve encontrar parâmetros tributários ativos para empresa e município', async () => {
      const empresaId = 'empresa-123';
      const codigoIbge = '2900108';
      const data = new Date('2025-11-17');

      const parametrosMock = {
        id: 'param-789',
        company_id: empresaId,
        ibge_municipality_code: codigoIbge,
        municipality_name: 'Alagoinhas',
        state: 'BA',
        iss_rate: 5.0,
        iss_service_code: '1301',
        active: true,
        validity_start: new Date('2025-01-01'),
        validity_end: new Date('2025-12-31'),
      };

      mockPrismaService.municipal_tax_parameters.findFirst.mockResolvedValue(
        parametrosMock,
      );

      const resultado = await repositorio.findActiveByCompanyAndIbge(
        empresaId,
        codigoIbge,
        data,
      );

      expect(resultado).toEqual(parametrosMock);
      expect(prisma.municipal_tax_parameters.findFirst).toHaveBeenCalledWith({
        where: {
          company_id: empresaId,
          ibge_municipality_code: codigoIbge,
          active: true,
          validity_start: { lte: data },
          OR: [{ validity_end: { gte: data } }, { validity_end: null }],
        },
        orderBy: { validity_start: 'desc' },
      });
    });

    it('deve retornar null quando nenhum parâmetro ativo for encontrado', async () => {
      mockPrismaService.municipal_tax_parameters.findFirst.mockResolvedValue(
        null,
      );

      const resultado = await repositorio.findActiveByCompanyAndIbge(
        'empresa-123',
        '2900108',
        new Date(),
      );

      expect(resultado).toBeNull();
    });

    it('deve encontrar parâmetros sem data de término', async () => {
      const parametrosMock = {
        id: 'param-789',
        company_id: 'empresa-123',
        ibge_municipality_code: '2900108',
        iss_rate: 5.0,
        validity_start: new Date('2025-01-01'),
        validity_end: null, // Sem data de término
        active: true,
      };

      mockPrismaService.municipal_tax_parameters.findFirst.mockResolvedValue(
        parametrosMock,
      );

      const resultado = await repositorio.findActiveByCompanyAndIbge(
        'empresa-123',
        '2900108',
        new Date('2025-11-17'),
      );

      expect(resultado).toEqual(parametrosMock);
    });

    it('deve retornar os parâmetros mais recentes quando existirem múltiplos', async () => {
      const parametrosRecentes = {
        id: 'param-novo',
        validity_start: new Date('2025-06-01'),
        iss_rate: 4.5,
      };

      mockPrismaService.municipal_tax_parameters.findFirst.mockResolvedValue(
        parametrosRecentes,
      );

      const resultado = await repositorio.findActiveByCompanyAndIbge(
        'empresa-123',
        '2900108',
        new Date('2025-11-17'),
      );

      expect(resultado).toEqual(parametrosRecentes);
      expect(prisma.municipal_tax_parameters.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { validity_start: 'desc' },
        }),
      );
    });
  });
});
