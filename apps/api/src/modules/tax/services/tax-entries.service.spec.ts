import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LoggerService } from 'src/common/services/logger.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { BankAccountsRepository } from 'src/modules/finance/cash-flow/repositories/bank-accounts.repository';
import { CashFlowEntriesService } from 'src/modules/finance/cash-flow/services/cash-flow-entries.service';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { TaxEntriesRepository } from '../repositories/tax-entries.repository';
import { TaxCalculationService } from './tax-calculation.service';
import { TaxEntriesService } from './tax-entries.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('TaxEntriesService', () => {
  let service: TaxEntriesService;
  let taxEntriesRepository: jest.Mocked<TaxEntriesRepository>;
  let taxCalculationService: jest.Mocked<TaxCalculationService>;
  let cinemaComplexesRepository: jest.Mocked<CinemaComplexesRepository>;
  let logger: jest.Mocked<LoggerService>;
  let rabbitmq: jest.Mocked<RabbitMQPublisherService>;
  let cashFlowEntriesService: jest.Mocked<CashFlowEntriesService>;
  let bankAccountsRepository: jest.Mocked<BankAccountsRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    taxEntriesRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySource: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TaxEntriesRepository>;

    taxCalculationService = {
      calculateTaxes: jest.fn(),
    } as unknown as jest.Mocked<TaxCalculationService>;

    cinemaComplexesRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CinemaComplexesRepository>;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    rabbitmq = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<RabbitMQPublisherService>;

    cashFlowEntriesService = {
      createForCompany: jest.fn(),
    } as unknown as jest.Mocked<CashFlowEntriesService>;

    bankAccountsRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<BankAccountsRepository>;

    tenantContext = {
      getCompanyId: jest.fn(),
      getRequiredUserId: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    tenantContext.getCompanyId.mockReturnValue('company-1');
    tenantContext.getRequiredUserId.mockReturnValue('user-1');

    service = new TaxEntriesService(
      taxEntriesRepository,
      taxCalculationService,
      cinemaComplexesRepository,
      logger,
      rabbitmq,
      cashFlowEntriesService,
      bankAccountsRepository,
      tenantContext,
    );
  });

  it('should throw in findOne when entry does not exist', async () => {
    taxEntriesRepository.findById.mockResolvedValue(null);

    await expect(service.findOne('entry-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should block create when source already has tax entry', async () => {
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-1',
    } as never);
    taxEntriesRepository.findBySource.mockResolvedValue({
      id: 'existing',
    } as never);

    await expect(
      service.create({
        cinema_complex_id: 'complex-1',
        source_type: 'SALE',
        source_id: 'sale-1',
        gross_amount: 100,
        competence_date: new Date('2026-03-01'),
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create tax entry and projected cashflow when account exists', async () => {
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-1',
    } as never);
    taxEntriesRepository.findBySource.mockResolvedValue(null);
    taxCalculationService.calculateTaxes.mockResolvedValue({
      gross_amount: 1000,
      deductions_amount: 100,
      calculation_base: 900,
      iss_rate: 5,
      iss_amount: 45,
      pis_rate: 1.65,
      pis_debit_amount: 14.85,
      pis_credit_amount: 0,
      pis_amount_payable: 14.85,
      cofins_rate: 7.6,
      cofins_debit_amount: 68.4,
      cofins_credit_amount: 0,
      cofins_amount_payable: 68.4,
      total_taxes: 128.25,
      net_amount: 771.75,
      ibge_municipality_code: '3550308',
      pis_cofins_regime: 'Não Cumulativo',
    } as never);
    taxEntriesRepository.create.mockResolvedValue({
      id: 'tax-1',
      cinema_complex_id: 'complex-1',
      competence_date: new Date('2026-03-01'),
      gross_amount: 1000,
      deductions_amount: 100,
      calculation_base: 900,
      iss_rate: 5,
      iss_amount: 45,
      pis_rate: 1.65,
      pis_debit_amount: 14.85,
      pis_credit_amount: 0,
      pis_amount_payable: 14.85,
      cofins_rate: 7.6,
      cofins_debit_amount: 68.4,
      cofins_credit_amount: 0,
      cofins_amount_payable: 68.4,
      processed: false,
      created_at: new Date('2026-03-01'),
    } as never);
    bankAccountsRepository.findAll.mockResolvedValue([
      { id: 'bank-1', active: true },
    ] as never);
    rabbitmq.publish.mockResolvedValue(undefined as never);
    cashFlowEntriesService.createForCompany.mockResolvedValue({
      id: 'cf-1',
    } as never);

    const result = await service.create({
      cinema_complex_id: 'complex-1',
      source_type: 'SALE',
      source_id: 'sale-1',
      gross_amount: 1000,
      deductions_amount: 100,
      competence_date: new Date('2026-03-01'),
      apply_iss: true,
    } as any);

    expect(taxEntriesRepository.create).toHaveBeenCalled();
    expect(rabbitmq.publish).toHaveBeenCalled();
    expect(cashFlowEntriesService.createForCompany).toHaveBeenCalled();
    expect(result.id).toBe('tax-1');
  });
});
