import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { SalesRepository } from '../repositories/sales.repository';
import { TicketsRepository } from '../repositories/tickets.repository';
import { ConcessionSalesRepository } from '../repositories/concession-sales.repository';
import { TicketsService } from './tickets.service';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { ProductPricesRepository } from 'src/modules/catalog/products/repositories/product-prices.repository';
import { CombosRepository } from 'src/modules/catalog/products/repositories/combos.repository';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { LoggerService } from 'src/common/services/logger.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import { ProductPriceNotFoundException } from '../exceptions/sales.exceptions';
import { TaxCalculationService } from 'src/modules/tax/services/tax-calculation.service';
import { TaxEntriesRepository } from 'src/modules/tax/repositories/tax-entries.repository';
import { CampaignsService } from 'src/modules/marketing/services/campaigns.service';
import { AccountsReceivableService } from 'src/modules/finance/accounts-receivable/services/accounts-receivable.service';
import { TransactionsService } from 'src/modules/finance/transactions/services/transactions.service';
import { BankAccountsRepository } from 'src/modules/finance/cash-flow/repositories/bank-accounts.repository';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { TenantResourceService } from 'src/common/services/tenant-resource.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaService } from 'src/prisma/prisma.service';

describe('SalesService', () => {
  let testingModule: TestingModule;
  let service: SalesService;
  let salesRepository: jest.Mocked<SalesRepository>;
  let concessionSalesRepository: jest.Mocked<ConcessionSalesRepository>;
  let ticketsRepository: jest.Mocked<TicketsRepository>;
  let productPricesRepository: jest.Mocked<ProductPricesRepository>;
  let combosRepository: jest.Mocked<CombosRepository>;
  let cinemaComplexesRepository: jest.Mocked<CinemaComplexesRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let productRepository: jest.Mocked<ProductRepository>;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [
            new ClsPluginTransactional({
              imports: [
                // Import module with PrismaService
                {
                  module: class PrismaModule {},
                  providers: [
                    {
                      provide: PrismaService,
                      useValue: {
                        $transaction: jest
                          .fn()
                          .mockImplementation((cb) => cb()),
                      },
                    },
                  ],
                  exports: [PrismaService],
                },
              ],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
      ],
      providers: [
        SalesService,
        {
          provide: SalesRepository,
          useValue: {
            findById: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            generateSaleNumber: jest.fn(),
            findPaymentMethodById: jest.fn().mockResolvedValue({
              id: 'payment-1',
              company_id: 'company-1',
              auto_settle: true,
              name: 'Dinheiro',
            }),
            findSaleTypeById: jest.fn(),
            findSaleTypeByName: jest.fn().mockResolvedValue({
              id: 'sale-type-balcao',
              company_id: 'company-1',
              name: 'Balcão',
            }),
            createSaleType: jest.fn(),
            findSaleStatusByName: jest.fn().mockResolvedValue({
              id: 'sale-status-confirmada',
              company_id: 'company-1',
              name: 'Confirmada',
            }),
            createSaleStatus: jest.fn(),
          },
        },
        {
          provide: TicketsRepository,
          useValue: {
            create: jest.fn(),
            generateTicketNumber: jest.fn(),
          },
        },
        {
          provide: ConcessionSalesRepository,
          useValue: {
            create: jest.fn(),
            createItem: jest.fn(),
          },
        },
        {
          provide: TicketsService,
          useValue: {
            validateAndReserveSeats: jest.fn(),
            reserveSeats: jest.fn(),
            calculateTicketPrice: jest.fn(),
            seatsRepository: {
              findById: jest.fn(),
            },
          },
        },
        {
          provide: ProductRepository,
          useValue: {
            findById: jest.fn(),
            findAllByIds: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ProductPricesRepository,
          useValue: {
            findActivePrice: jest.fn(),
            findActivePricesByProductIds: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: CombosRepository,
          useValue: {
            getComboPrice: jest.fn(),
            countActiveByIdsForCompany: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: CinemaComplexesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: RabbitMQPublisherService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: TaxCalculationService,
          useValue: {
            calculateTaxes: jest.fn().mockResolvedValue({
              gross_amount: 100,
              deductions_amount: 0,
              calculation_base: 100,
              iss_rate: 0.05,
              iss_amount: 5,
              ibge_municipality_code: '123456',
              pis_cofins_regime: 'CUMULATIVE',
              pis_rate: 0.0065,
              pis_debit_amount: 0.65,
              pis_credit_amount: 0,
              pis_amount_payable: 0.65,
              cofins_rate: 0.03,
              cofins_debit_amount: 3,
              cofins_credit_amount: 0,
              cofins_amount_payable: 3,
            }),
          },
        },
        {
          provide: TaxEntriesRepository,
          useValue: {
            create: jest.fn(),
            findAllBySource: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: CampaignsService,
          useValue: {
            applyPromotion: jest.fn(),
            recordPromotionUsage: jest.fn(),
          },
        },
        {
          provide: AccountsReceivableService,
          useValue: {
            createForCompany: jest.fn().mockResolvedValue({ id: 'ar-1' }),
            cancelBySaleIdForCompany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        },
        {
          provide: TransactionsService,
          useValue: {
            settleReceivableForCompany: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: BankAccountsRepository,
          useValue: {
            findAll: jest
              .fn()
              .mockResolvedValue([{ id: 'bank-1', active: true }]),
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getCompanyId: jest.fn().mockReturnValue('company-1'),
            getUserId: jest.fn().mockReturnValue('user-1'),
            getCustomerId: jest.fn().mockReturnValue(undefined),
            getSessionContext: jest.fn().mockReturnValue('EMPLOYEE'),
          },
        },
        {
          provide: TenantResourceService,
          useValue: {
            assertCustomerLinkedToCompany: jest
              .fn()
              .mockResolvedValue(undefined),
            assertCinemaComplexBelongsToCompany: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: SnowflakeService,
          useValue: {
            generate: jest.fn(() => 'snowflake-test-id'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb()),
            journal_entries: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
            company_customers: {
              findFirst: jest.fn().mockResolvedValue(null),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = testingModule.get<SalesService>(SalesService);
    salesRepository = testingModule.get(SalesRepository);
    concessionSalesRepository = testingModule.get(ConcessionSalesRepository);
    ticketsRepository = testingModule.get(TicketsRepository);
    productPricesRepository = testingModule.get(ProductPricesRepository);
    combosRepository = testingModule.get(CombosRepository);
    cinemaComplexesRepository = testingModule.get(CinemaComplexesRepository);
    ticketsService = testingModule.get(TicketsService);
    productRepository = testingModule.get(ProductRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockContext = {
      companyId: 'company-1',
      userId: 'user-1',
      sessionContext: 'EMPLOYEE' as const,
    };

    const mockDto = {
      cinema_complex_id: 'complex-1',
      payment_method: 'payment-1',
      tickets: [
        {
          showtime_id: 'showtime-1',
          seat_id: 'seat-1',
        },
      ],
      concession_items: [
        {
          item_type: 'PRODUCT' as const,
          item_id: 'product-1',
          quantity: 2,
        },
      ],
    };

    it('should throw ProductPriceNotFoundException when product price not found', async () => {
      salesRepository.generateSaleNumber.mockResolvedValue('V202501000001');
      salesRepository.create.mockResolvedValue({
        id: 'sale-1',
        sale_number: 'V202501000001',
      } as any);

      cinemaComplexesRepository.findById.mockResolvedValue({
        id: 'complex-1',
        company_id: 'company-1',
      } as any);

      ticketsService.calculateTicketPrice.mockResolvedValue({
        total_amount: 10,
        face_value: 10,
        service_fee: 0,
      } as any);

      productRepository.findAllByIds.mockResolvedValue([
        {
          id: 'product-1',
          name: 'Pipoca',
        } as any,
      ]);

      productPricesRepository.findActivePrice.mockResolvedValue(null);

      await expect(service.create(mockDto, mockContext)).rejects.toThrow(
        ProductPriceNotFoundException,
      );
    });

    it('should create sale with concession items when prices are found', async () => {
      salesRepository.generateSaleNumber.mockResolvedValue('V202501000001');
      salesRepository.create.mockResolvedValue({
        id: 'sale-1',
        sale_number: 'V202501000001',
      } as any);
      concessionSalesRepository.create.mockResolvedValue({
        id: 'concession-sale-1',
      } as any);
      salesRepository.findById.mockResolvedValue({
        id: 'sale-1',
        sale_number: 'V202501000001',
        sale_date: new Date(),
        cinema_complex_id: 'complex-1',
        customer_id: 'customer-1',
        total_amount: 31, // 10 (ticket) + 21 (concession)
        discount_amount: 0,
        net_amount: 31,
        tickets: [
          {
            ticket_number: 'TKT-123',
            seat: 'A1',
            ticket_types: { name: 'Inteira' },
            face_value: 10,
            service_fee: 0,
            total_amount: 10,
          },
        ],
        concession_sales: [
          {
            items: [
              {
                item_type: 'PRODUCT',
                item_id: 'product-1',
                quantity: 2,
                unit_price: 10.5,
                total_price: 21,
              },
            ],
          },
        ],
      } as any);

      cinemaComplexesRepository.findById.mockResolvedValue({
        id: 'complex-1',
        company_id: 'company-1',
      } as any);

      ticketsService.calculateTicketPrice.mockResolvedValue({
        total_amount: 10,
        face_value: 10,
        service_fee: 0,
      } as any);

      productRepository.findAllByIds.mockResolvedValue([
        {
          id: 'product-1',
          name: 'Pipoca',
        } as any,
      ]);

      productPricesRepository.findActivePrice.mockResolvedValue({
        sale_price: 10.5,
      } as any);

      ticketsRepository.generateTicketNumber.mockReturnValue('TKT-123');
      ticketsRepository.create.mockResolvedValue({} as any);

      const result = await service.create(mockDto, mockContext);

      expect(result).toBeDefined();
      expect(salesRepository.create).toHaveBeenCalled();
    });

    it('should reject customer_id in body when session is CUSTOMER and ids mismatch', async () => {
      const tenant = testingModule.get(TenantContextService);
      (tenant.getSessionContext as jest.Mock).mockReturnValue('CUSTOMER');
      (tenant.getCustomerId as jest.Mock).mockReturnValue('customer-1');

      await expect(
        service.create(
          {
            ...mockDto,
            customer_id: 'other-customer',
          } as any,
          { companyId: 'company-1', sessionContext: 'CUSTOMER' },
        ),
      ).rejects.toThrow('customer_id');
    });
  });
});
