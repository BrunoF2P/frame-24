import { LoggerService } from 'src/common/services/logger.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MasterDataSetupService } from './master-data-setup.service';

describe('MasterDataSetupService', () => {
  let service: MasterDataSetupService;
  let prisma: jest.Mocked<PrismaService>;
  let snowflake: jest.Mocked<SnowflakeService>;
  let logger: jest.Mocked<LoggerService>;
  let createMock: jest.Mock;

  beforeEach(() => {
    createMock = jest.fn().mockResolvedValue({});
    const upsert = jest.fn().mockResolvedValue({});
    const createMany = jest.fn().mockResolvedValue({ count: 1 });

    prisma = {
      custom_roles: { upsert },
      employment_contract_types: { create: createMock },
      projection_types: { create: createMock },
      audio_types: { create: createMock },
      session_languages: { create: createMock },
      session_status: { create: createMock },
      seat_status: { create: createMock },
      seat_types: { create: createMock },
      account_types: { create: createMock },
      account_natures: { create: createMock },
      settlement_bases: { create: createMock },
      distributor_settlement_status: { create: createMock },
      journal_entry_status: { create: createMock },
      journal_entry_types: { create: createMock },
      age_ratings: { create: createMock },
      movie_categories: { upsert },
      cast_types: { create: createMock },
      media_types: { create: createMock },
      payment_methods: { create: createMock },
      sale_types: { create: createMock },
      sale_status: { create: createMock },
      ticket_types: { create: createMock },
      revenue_types: { create: createMock },
      supplier_types: { createMany },
    } as unknown as jest.Mocked<PrismaService>;

    snowflake = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<SnowflakeService>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    snowflake.generate.mockReturnValue('id-1');

    service = new MasterDataSetupService(prisma, snowflake, logger);
  });

  it('should run complete master data setup for a company', async () => {
    await service.setupCompanyMasterData('company-1');

    expect(prisma.custom_roles.upsert).toHaveBeenCalled();
    expect(prisma.movie_categories.upsert).toHaveBeenCalled();
    expect(prisma.payment_methods.create).toHaveBeenCalled();
    expect(prisma.supplier_types.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(logger.log).toHaveBeenCalledWith(
      'Setup completo: company-1 (categorias criadas)',
      'MasterDataSetupService',
    );
  });

  it('should log and rethrow when setup fails', async () => {
    createMock.mockRejectedValue(new Error('db error'));

    await expect(service.setupCompanyMasterData('company-1')).rejects.toThrow(
      'db error',
    );

    expect(logger.error).toHaveBeenCalled();
  });
});
