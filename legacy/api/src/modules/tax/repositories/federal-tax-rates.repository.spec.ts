import { Test, TestingModule } from '@nestjs/testing';
import { FederalTaxRatesRepository } from './federal-tax-rates.repository';
import { PrismaService } from 'src/prisma/prisma.service';

describe('FederalTaxRatesRepository', () => {
  let repository: FederalTaxRatesRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    federal_tax_rates: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FederalTaxRatesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<FederalTaxRatesRepository>(
      FederalTaxRatesRepository,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findActiveByCompany', () => {
    it('should find active federal tax rates for company', async () => {
      const companyId = 'company-123';
      const date = new Date('2025-11-17');

      const mockRates = {
        id: 'rate-789',
        company_id: companyId,
        tax_regime: 'Lucro Real',
        pis_cofins_regime: 'Não-Cumulativo',
        pis_rate: 1.65,
        cofins_rate: 7.6,
        irpj_base_rate: 15.0,
        csll_rate: 9.0,
        active: true,
        validity_start: new Date('2025-01-01'),
        validity_end: new Date('2025-12-31'),
      };

      mockPrismaService.federal_tax_rates.findFirst.mockResolvedValue(
        mockRates,
      );

      const result = await repository.findActiveByCompany(companyId, date);

      expect(result).toEqual(mockRates);
      expect(prisma.federal_tax_rates.findFirst).toHaveBeenCalledWith({
        where: {
          company_id: companyId,
          active: true,
          validity_start: { lte: date },
          OR: [{ validity_end: { gte: date } }, { validity_end: null }],
        },
        orderBy: { validity_start: 'desc' },
      });
    });

    it('should return null when no active rates found', async () => {
      mockPrismaService.federal_tax_rates.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveByCompany(
        'company-123',
        new Date(),
      );

      expect(result).toBeNull();
    });

    it('should find rates with indefinite validity', async () => {
      const mockRates = {
        id: 'rate-789',
        company_id: 'company-123',
        pis_rate: 0.65,
        cofins_rate: 3.0,
        validity_start: new Date('2025-01-01'),
        validity_end: null,
        active: true,
      };

      mockPrismaService.federal_tax_rates.findFirst.mockResolvedValue(
        mockRates,
      );

      const result = await repository.findActiveByCompany(
        'company-123',
        new Date('2025-11-17'),
      );

      expect(result).toEqual(mockRates);
    });

    it('should return most recent rates when multiple exist', async () => {
      const recentRates = {
        id: 'rate-new',
        validity_start: new Date('2025-06-01'),
        pis_rate: 1.65,
        cofins_rate: 7.6,
      };

      mockPrismaService.federal_tax_rates.findFirst.mockResolvedValue(
        recentRates,
      );

      const result = await repository.findActiveByCompany(
        'company-123',
        new Date('2025-11-17'),
      );

      expect(result).toEqual(recentRates);
      expect(prisma.federal_tax_rates.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { validity_start: 'desc' },
        }),
      );
    });
  });
});
