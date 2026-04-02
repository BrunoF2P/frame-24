import { NotFoundException } from '@nestjs/common';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountsPayableService } from '../accounts-payable/services/accounts-payable.service';
import { DistributorSettlementsService } from './distributor-settlements.service';

describe('DistributorSettlementsService', () => {
  let service: DistributorSettlementsService;
  let prisma: any;
  let snowflake: jest.Mocked<SnowflakeService>;
  let accountsPayableService: jest.Mocked<AccountsPayableService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
      cinema_complexes: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      exhibition_contracts: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      suppliers: {
        findFirst: jest.fn(),
      },
      distributor_settlements: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    accountsPayableService = {
      createForCompany: jest.fn(),
    } as unknown as jest.Mocked<AccountsPayableService>;

    tenantContext = {
      getCompanyId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');
    snowflake.generate.mockReturnValue('sett-1');

    service = new DistributorSettlementsService(
      prisma,
      snowflake,
      accountsPayableService,
      tenantContext,
    );
  });

  it('should list settlements scoped by company complexes and contracts', async () => {
    prisma.cinema_complexes.findMany.mockResolvedValue([
      { id: 'complex-1' },
    ] as never);
    prisma.exhibition_contracts.findMany.mockResolvedValue([
      { id: 'contract-1' },
    ] as never);
    prisma.distributor_settlements.findMany.mockResolvedValue([
      { id: 'sett-1' },
    ] as never);

    const result = await service.findAll();

    expect(prisma.distributor_settlements.findMany).toHaveBeenCalledWith({
      where: {
        cinema_complex_id: { in: ['complex-1'] },
        contract_id: { in: ['contract-1'] },
      },
      orderBy: {
        competence_start_date: 'desc',
      },
    });
    expect(result).toEqual([{ id: 'sett-1' }]);
  });

  it('should throw when complex does not belong to company', async () => {
    prisma.exhibition_contracts.findFirst.mockResolvedValue({
      id: 'contract-1',
      cinema_complex_id: 'complex-1',
      movie_id: 'movie-1',
    } as never);
    prisma.suppliers.findFirst.mockResolvedValue({ id: 'supplier-1' } as never);
    prisma.cinema_complexes.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        contract_id: 'contract-1',
        distributor_id: 'supplier-1',
        cinema_complex_id: 'complex-1',
        competence_start_date: '2026-03-01',
        competence_end_date: '2026-03-31',
        gross_box_office_revenue: 1000,
        distributor_percentage: 50,
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create settlement, calculate net values and create payable when positive', async () => {
    prisma.exhibition_contracts.findFirst.mockResolvedValue({
      id: 'contract-1',
      cinema_complex_id: 'complex-1',
      movie_id: 'movie-1',
    } as never);
    prisma.suppliers.findFirst.mockResolvedValue({ id: 'supplier-1' } as never);
    prisma.cinema_complexes.findFirst.mockResolvedValue({
      id: 'complex-1',
    } as never);
    prisma.$queryRaw.mockResolvedValue([
      { gross_revenue: 1200, total_tickets_sold: 100 },
    ] as never);
    prisma.distributor_settlements.create.mockResolvedValue({
      id: 'sett-1',
    } as never);
    accountsPayableService.createForCompany.mockResolvedValue({
      id: 'ap-1',
    } as never);

    const result = await service.create({
      contract_id: 'contract-1',
      distributor_id: 'supplier-1',
      cinema_complex_id: 'complex-1',
      competence_start_date: '2026-03-01',
      competence_end_date: '2026-03-31',
      gross_box_office_revenue: 1000,
      distributor_percentage: 40,
      deductions_amount: 50,
      taxes_deducted_amount: 25,
    } as any);

    expect(prisma.distributor_settlements.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'sett-1',
        gross_box_office_revenue: 1200,
        total_tickets_sold: 100,
        calculated_settlement_amount: 480,
        final_settlement_amount: 430,
        net_payment_amount: 405,
        settlement_base_amount: 430,
        net_settlement_amount: 405,
      }),
    });
    expect(accountsPayableService.createForCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        dto: expect.objectContaining({
          source_type: 'distributor_settlement',
          source_id: 'sett-1',
          original_amount: 405,
        }),
      }),
    );
    expect(result).toEqual({ id: 'sett-1' });
  });

  it('should not fail settlement creation when payable creation throws', async () => {
    prisma.exhibition_contracts.findFirst.mockResolvedValue({
      id: 'contract-1',
      cinema_complex_id: 'complex-1',
      movie_id: 'movie-1',
    } as never);
    prisma.suppliers.findFirst.mockResolvedValue({ id: 'supplier-1' } as never);
    prisma.cinema_complexes.findFirst.mockResolvedValue({
      id: 'complex-1',
    } as never);
    prisma.$queryRaw.mockResolvedValue([
      { gross_revenue: 100, total_tickets_sold: 10 },
    ] as never);
    prisma.distributor_settlements.create.mockResolvedValue({
      id: 'sett-1',
    } as never);
    accountsPayableService.createForCompany.mockRejectedValue(
      new Error('ap error'),
    );

    const result = await service.create({
      contract_id: 'contract-1',
      distributor_id: 'supplier-1',
      cinema_complex_id: 'complex-1',
      competence_start_date: '2026-03-01',
      competence_end_date: '2026-03-31',
      gross_box_office_revenue: 100,
      distributor_percentage: 10,
    } as any);

    expect(result).toEqual({ id: 'sett-1' });
  });
});
