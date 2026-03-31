import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { ProductPriceNotFoundException } from '../exceptions/sales.exceptions';
import { Transactional } from '@nestjs-cls/transactional';
import {
  SaleWithBasicRelations,
  SaleWithFullRelations,
  SalesRepository,
} from '../repositories/sales.repository';
import { TicketsRepository } from '../repositories/tickets.repository';
import { ConcessionSalesRepository } from '../repositories/concession-sales.repository';
import { TicketsService } from './tickets.service';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { SaleResponseDto, TicketResponseDto } from '../dto/sale-response.dto';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { ProductRepository } from 'src/modules/catalog/products/repositories/product.repository';
import { ProductPricesRepository } from 'src/modules/catalog/products/repositories/product-prices.repository';
import { CombosRepository } from 'src/modules/catalog/products/repositories/combos.repository';
import { TaxCalculationService } from 'src/modules/tax/services/tax-calculation.service';
import { TaxEntriesRepository } from 'src/modules/tax/repositories/tax-entries.repository';
import { LoggerService } from 'src/common/services/logger.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import {
  CampaignsService,
  PromotionApplicationResult,
} from 'src/modules/marketing/services/campaigns.service';

import { todayISO } from 'src/common/utils/date.util';

import { AccountsReceivableService } from 'src/modules/finance/accounts-receivable/services/accounts-receivable.service';
import { TransactionsService } from 'src/modules/finance/transactions/services/transactions.service';
import { BankAccountsRepository } from 'src/modules/finance/cash-flow/repositories/bank-accounts.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { createHash } from 'crypto';

type ProductItem = Awaited<
  ReturnType<ProductRepository['findAllByIds']>
>[number];
type ProductPrice = Awaited<
  ReturnType<ProductPricesRepository['findActivePricesByProductIds']>
>[number];
type TicketPricing = Awaited<
  ReturnType<TicketsService['calculateTicketPrice']>
>;
type TicketInputWithPricing = CreateSaleDto['tickets'][number] & {
  pricing: TicketPricing;
};
type ConcessionItemData = {
  item_type: 'PRODUCT' | 'COMBO';
  item_id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};
type SaleForResponse = SaleWithBasicRelations | SaleWithFullRelations;
type SalesExecutionContext = {
  companyId?: string;
  userId?: string;
  customerId?: string;
  sessionContext?: 'EMPLOYEE' | 'CUSTOMER';
  idempotencyKey?: string;
};

@Injectable()
export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly ticketsRepository: TicketsRepository,
    private readonly concessionSalesRepository: ConcessionSalesRepository,
    private readonly ticketsService: TicketsService,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly productsRepository: ProductRepository,
    private readonly productPricesRepository: ProductPricesRepository,
    private readonly combosRepository: CombosRepository,
    private readonly taxCalculationService: TaxCalculationService,
    private readonly taxEntriesRepository: TaxEntriesRepository,
    private readonly logger: LoggerService,
    private readonly rabbitmq: RabbitMQPublisherService,
    private readonly campaignsService: CampaignsService,
    private readonly accountsReceivableService: AccountsReceivableService,
    private readonly transactionsService: TransactionsService,
    private readonly bankAccountsRepository: BankAccountsRepository,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  private getCustomerId(): string | undefined {
    return this.tenantContext.getCustomerId();
  }

  private getSessionContext(): 'EMPLOYEE' | 'CUSTOMER' | undefined {
    return this.tenantContext.getSessionContext();
  }

  async findAll(filters?: {
    cinema_complex_id?: string;
    customer_id?: string;
    start_date?: Date;
    end_date?: Date;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<SaleResponseDto[]> {
    const sales = await this.salesRepository.findAll(
      this.tenantContext.getCompanyId(),
      filters,
    );

    return sales.map((sale) => this.mapToDto(sale));
  }

  async findOne(id: string): Promise<SaleResponseDto> {
    const sale = await this.salesRepository.findById(
      id,
      this.tenantContext.getCompanyId(),
    );

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    return this.mapToDto(sale);
  }

  @Transactional()
  async create(
    dto: CreateSaleDto,
    context?: SalesExecutionContext,
  ): Promise<SaleResponseDto> {
    const company_id = context?.companyId ?? this.tenantContext.getCompanyId();
    const user_id = context?.userId ?? this.tenantContext.getUserId();
    const sessionContext = context?.sessionContext ?? this.getSessionContext();
    const contextCustomerId = context?.customerId ?? this.getCustomerId();
    const resolvedCustomerId = dto.customer_id || contextCustomerId;
    const idempotencyReference = context?.idempotencyKey
      ? this.buildIdempotencyReference(company_id, context.idempotencyKey)
      : undefined;

    if (idempotencyReference) {
      const existingSale = await this.salesRepository.findByPublicReference(
        company_id,
        idempotencyReference,
      );

      if (existingSale) {
        return this.mapToDto(existingSale);
      }
    }

    // Validar complexo
    const complex = await this.cinemaComplexesRepository.findById(
      dto.cinema_complex_id,
    );
    if (!complex || complex.company_id !== company_id) {
      throw new NotFoundException('Complexo de cinema não encontrado');
    }

    const paymentMethod = await this.salesRepository.findPaymentMethodById(
      dto.payment_method,
      company_id,
    );
    if (!paymentMethod) {
      throw new NotFoundException('Método de pagamento inválido');
    }

    const resolvedSaleTypeId = await this.resolveSaleTypeId(
      company_id,
      dto.sale_type,
      sessionContext,
    );

    const initialStatusName = paymentMethod.auto_settle
      ? 'Confirmada'
      : 'Pendente';
    const resolvedInitialStatusId = await this.resolveSaleStatusId(
      company_id,
      initialStatusName,
    );

    // 1. Preparação de Dados em Lote
    // Coletar IDs para buscas em lote
    const seatIds = dto.tickets
      .map((t) => t.seat_id)
      .filter((id): id is string => Boolean(id));

    const productItemIds =
      dto.concession_items
        ?.filter((i) => i.item_type === 'PRODUCT')
        .map((i) => i.item_id) || [];

    // Buscas paralelas (Promise.all)
    const [productsMap, productPricesMap]: [
      Map<string, ProductItem>,
      Map<string, ProductPrice>,
    ] = await Promise.all([
      // Buscar produtos
      productItemIds.length > 0
        ? this.productsRepository
            .findAllByIds(productItemIds, company_id)
            .then(
              (items) => new Map(items.map((product) => [product.id, product])),
            )
        : Promise.resolve(new Map<string, ProductItem>()),

      // Buscar preços de produtos
      productItemIds.length > 0
        ? this.productPricesRepository
            .findActivePricesByProductIds(
              productItemIds,
              dto.cinema_complex_id,
              company_id,
            )
            .then((prices) => {
              // Mapear preço por produto_id
              const map = new Map<string, ProductPrice>();
              prices.forEach((p) => map.set(p.product_id, p));
              return map;
            })
        : Promise.resolve(new Map<string, ProductPrice>()),
    ]);

    // 2. Validação e Reserva de Assentos
    if (seatIds.length > 0) {
      const showtimeSeats = new Map<string, Set<string>>();
      for (const ticket of dto.tickets) {
        if (ticket.seat_id) {
          if (!showtimeSeats.has(ticket.showtime_id)) {
            showtimeSeats.set(ticket.showtime_id, new Set());
          }
          const seats = showtimeSeats.get(ticket.showtime_id)!;
          if (seats.has(ticket.seat_id)) {
            throw new ConflictException(
              'Não é possível vender o mesmo assento duas vezes na mesma sessão',
            );
          }
          seats.add(ticket.seat_id);
        }
      }

      // Paralelizar reservas por sessão
      await Promise.all(
        Array.from(showtimeSeats.entries()).map(([showtime_id, seats]) =>
          this.ticketsService.validateAndReserveSeats({
            showtimeId: showtime_id,
            seatIds: Array.from(seats),
            context: { companyId: company_id },
          }),
        ),
      );
    }

    // 3. Cálculo de Tickets (Otimizado)
    const ticketPromises: Promise<TicketInputWithPricing>[] = dto.tickets.map(
      async (ticketDto): Promise<TicketInputWithPricing> => {
        const pricing = await this.ticketsService.calculateTicketPrice({
          showtimeId: ticketDto.showtime_id,
          seatId: ticketDto.seat_id,
          ticketTypeId: ticketDto.ticket_type,
          context: { companyId: company_id },
        });
        return {
          ...ticketDto,
          pricing,
        };
      },
    );

    const ticketData = await Promise.all(ticketPromises);
    const ticketsTotal = ticketData.reduce(
      (sum, t) => sum + t.pricing.total_amount,
      0,
    );

    // 4. Cálculo de Concessão (Otimizado)
    let concessionTotal = 0;
    const concessionItemsData: ConcessionItemData[] = [];

    if (dto.concession_items && dto.concession_items.length > 0) {
      for (const item of dto.concession_items) {
        let unitPrice = 0;

        if (item.item_type === 'PRODUCT') {
          const product = productsMap.get(item.item_id);
          if (!product) {
            // Fallback se não veio no lote
            const found = await this.productsRepository.findById(
              item.item_id,
              company_id,
            );
            if (!found)
              throw new NotFoundException(
                `Produto ${item.item_id} não encontrado`,
              );
          }

          const price = productPricesMap.get(item.item_id);

          if (!price) {
            // Tentar buscar individualmente
            const foundPrice =
              await this.productPricesRepository.findActivePrice(
                item.item_id,
                dto.cinema_complex_id,
                company_id,
              );
            if (!foundPrice)
              throw new ProductPriceNotFoundException(
                product?.name ?? item.item_id,
              );
            unitPrice = Number(foundPrice.sale_price);
          } else {
            unitPrice = Number(price.sale_price);
          }
        } else if (item.item_type === 'COMBO') {
          unitPrice = await this.combosRepository.getComboPrice(
            item.item_id,
            company_id,
            new Date(),
          );
        }

        const totalPrice = unitPrice * item.quantity;
        concessionTotal += totalPrice;
        concessionItemsData.push({
          ...item,
          unitPrice,
          totalPrice,
        });
      }
    }

    const total_amount = ticketsTotal + concessionTotal;

    // 5. Promoções e Descontos
    const manualDiscount = dto.discount_amount || 0;
    let promotionResult: PromotionApplicationResult | null = null;

    if (dto.promotion_code) {
      promotionResult = await this.campaignsService.applyPromotion({
        company_id,
        promotion_code: dto.promotion_code,
        order_amount: total_amount,
        customer_id: resolvedCustomerId,
      });
    }

    const promotionDiscount = promotionResult?.discount_amount || 0;
    const discount_amount = manualDiscount + promotionDiscount;
    const net_amount = total_amount - discount_amount;

    if (net_amount < 0) {
      throw new BadRequestException(
        'O valor do desconto não pode ser maior que o total',
      );
    }

    // 6. Persistência (Transação)
    const sale_number =
      await this.salesRepository.generateSaleNumber(company_id);

    let sale;
    try {
      sale = await this.salesRepository.create({
        id: this.snowflake.generate(),
        sale_number,
        sale_date: new Date(),
        cinema_complex_id: dto.cinema_complex_id,
        ...(dto.customer_id && { customer_id: dto.customer_id }),
        sale_types: { connect: { id: resolvedSaleTypeId } },
        payment_methods: { connect: { id: dto.payment_method } },
        sale_status: { connect: { id: resolvedInitialStatusId } },
        total_amount,
        discount_amount,
        net_amount,
        ...(user_id && { user_id }),
        ...(idempotencyReference && {
          public_reference: idempotencyReference,
        }),
      });
    } catch (error) {
      if (idempotencyReference) {
        const duplicatedSale = await this.salesRepository.findByPublicReference(
          company_id,
          idempotencyReference,
        );
        if (duplicatedSale) {
          return this.mapToDto(duplicatedSale);
        }
      }
      throw error;
    }

    const seatsByShowtime = new Map<string, string[]>();

    // Criar tickets em paralelo
    await Promise.all(
      ticketData.map(async (ticketInfo) => {
        const ticket_number = this.ticketsRepository.generateTicketNumber();

        let seatCode: string | null = null;
        if (ticketInfo.seat_id) {
          const seat = await this.ticketsService.seatsRepository.findById(
            ticketInfo.seat_id,
          );
          seatCode = seat?.seat_code || null;
        }

        await this.ticketsRepository.create({
          id: this.snowflake.generate(),
          sales: { connect: { id: sale.id } },
          ticket_number,
          showtime_id: ticketInfo.showtime_id,
          ...(ticketInfo.seat_id && { seat_id: ticketInfo.seat_id }),
          ...(ticketInfo.ticket_type && {
            ticket_types: { connect: { id: ticketInfo.ticket_type } },
          }),
          face_value: ticketInfo.pricing.face_value,
          service_fee: ticketInfo.pricing.service_fee,
          total_amount: ticketInfo.pricing.total_amount,
          seat: seatCode,
        });

        if (ticketInfo.seat_id) {
          const current = seatsByShowtime.get(ticketInfo.showtime_id) || [];
          current.push(ticketInfo.seat_id);
          seatsByShowtime.set(ticketInfo.showtime_id, current);
        }
      }),
    );

    if (seatsByShowtime.size > 0) {
      await Promise.all(
        Array.from(seatsByShowtime.entries()).map(([showtimeId, seatIds]) =>
          this.ticketsService.reserveSeats({
            showtimeId,
            seatIds,
            saleId: sale.id,
            context: { companyId: company_id },
          }),
        ),
      );
    }

    // Criar concessão
    if (concessionItemsData.length > 0) {
      const concessionSale = await this.concessionSalesRepository.create({
        id: this.snowflake.generate(),
        sales: { connect: { id: sale.id } },
        sale_date: new Date(),
        total_amount: concessionTotal,
        discount_amount: 0,
        net_amount: concessionTotal,
      });

      await Promise.all(
        concessionItemsData.map((item) =>
          this.concessionSalesRepository.createItem({
            id: this.snowflake.generate(),
            concession_sales: { connect: { id: concessionSale.id } },
            item_type: item.item_type,
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
          }),
        ),
      );
    }

    // 7. Lançamentos Fiscais
    const competenceDate = new Date();
    competenceDate.setHours(0, 0, 0, 0);

    const taxPromises: Promise<void>[] = [];

    if (ticketsTotal > 0) {
      taxPromises.push(
        this.taxCalculationService
          .calculateTaxes(
            {
              gross_amount: ticketsTotal,
              deductions_amount: 0,
              cinema_complex_id: dto.cinema_complex_id,
              competence_date: competenceDate,
              revenue_type: 'BOX_OFFICE',
            },
            { companyId: company_id },
          )
          .then(async (calc) => {
            await this.taxEntriesRepository.create({
              cinema_complex_id: dto.cinema_complex_id,
              source_type: 'SALE',
              source_id: sale.id,
              competence_date: competenceDate,
              gross_amount: calc.gross_amount,
              deductions_amount: calc.deductions_amount,
              calculation_base: calc.calculation_base,
              apply_iss: true,
              iss_rate: calc.iss_rate,
              iss_amount: calc.iss_amount,
              ibge_municipality_code: calc.ibge_municipality_code,
              ...(calc.iss_service_code && {
                iss_service_code: calc.iss_service_code,
              }),
              pis_cofins_regime: calc.pis_cofins_regime,
              pis_rate: calc.pis_rate,
              pis_debit_amount: calc.pis_debit_amount,
              pis_credit_amount: calc.pis_credit_amount,
              pis_amount_payable: calc.pis_amount_payable,
              cofins_rate: calc.cofins_rate,
              cofins_debit_amount: calc.cofins_debit_amount,
              cofins_credit_amount: calc.cofins_credit_amount,
              cofins_amount_payable: calc.cofins_amount_payable,
              processing_user_id: user_id || null,
              processing_date: new Date(),
              processed: true,
            });
          }),
      );
    }

    if (concessionTotal > 0) {
      taxPromises.push(
        this.taxCalculationService
          .calculateTaxes(
            {
              gross_amount: concessionTotal,
              deductions_amount: 0,
              cinema_complex_id: dto.cinema_complex_id,
              competence_date: competenceDate,
              revenue_type: 'CONCESSION',
            },
            { companyId: company_id },
          )
          .then(async (calc) => {
            await this.taxEntriesRepository.create({
              cinema_complex_id: dto.cinema_complex_id,
              source_type: 'SALE',
              source_id: sale.id,
              competence_date: competenceDate,
              gross_amount: calc.gross_amount,
              deductions_amount: calc.deductions_amount,
              calculation_base: calc.calculation_base,
              apply_iss: true,
              iss_rate: calc.iss_rate,
              iss_amount: calc.iss_amount,
              ibge_municipality_code: calc.ibge_municipality_code,
              ...(calc.iss_service_code && {
                iss_service_code: calc.iss_service_code,
              }),
              pis_cofins_regime: calc.pis_cofins_regime,
              pis_rate: calc.pis_rate,
              pis_debit_amount: calc.pis_debit_amount,
              pis_credit_amount: calc.pis_credit_amount,
              pis_amount_payable: calc.pis_amount_payable,
              cofins_rate: calc.cofins_rate,
              cofins_debit_amount: calc.cofins_debit_amount,
              cofins_credit_amount: calc.cofins_credit_amount,
              cofins_amount_payable: calc.cofins_amount_payable,
              processing_user_id: user_id || null,
              processing_date: new Date(),
              processed: true,
            });
          }),
      );
    }

    await Promise.all(taxPromises);

    // 8. Finalização
    if (promotionResult) {
      await this.campaignsService.recordPromotionUsage(
        sale.id,
        promotionResult,
        resolvedCustomerId,
      );
    }

    const completeSale = await this.salesRepository.findById(
      sale.id,
      company_id,
    );

    if (!completeSale) {
      throw new NotFoundException('Erro ao buscar venda criada');
    }

    // Publicar evento
    const auditUserId =
      user_id || contextCustomerId || resolvedCustomerId || '';

    await this.rabbitmq.publish({
      pattern: 'audit.sale.created',
      data: {
        id: completeSale.id,
        values: completeSale,
      },
      metadata: { companyId: company_id, userId: auditUserId },
    });

    this.logger.log(
      `Venda criada: ${sale_number} - R$ ${net_amount.toFixed(2)}`,
      SalesService.name,
    );

    // 9. Contas a Receber (Automático)
    const receivable = await this.accountsReceivableService.createForCompany({
      companyId: company_id,
      dto: {
        cinema_complex_id: dto.cinema_complex_id,
        customer_id: resolvedCustomerId,
        sale_id: sale.id,
        document_number: sale_number,
        description: `Venda - Pedido ${sale_number}`,
        issue_date: todayISO(),
        due_date: todayISO(), // Vencimento hoje (ajustar se for crédito)
        competence_date: todayISO(),
        original_amount: net_amount,
        interest_amount: 0,
        penalty_amount: 0,
        discount_amount: 0,
      },
    });

    const paymentMethodName = completeSale.payment_methods?.name;
    const paymentMethodAutoSettle = completeSale.payment_methods?.auto_settle;
    const shouldAutoSettle =
      typeof paymentMethodAutoSettle === 'boolean'
        ? paymentMethodAutoSettle
        : this.isImmediatePaymentMethod(paymentMethodName);

    if (!shouldAutoSettle) {
      this.logger.log(
        `Conta a receber ${receivable.id} criada sem baixa automática (método: ${paymentMethodName || dto.payment_method})`,
        SalesService.name,
      );
      return this.mapToDto(completeSale);
    }

    // Buscar conta bancária padrão
    const bankAccounts = await this.bankAccountsRepository.findAll(company_id);
    const defaultAccount = bankAccounts.find((account) => account.active);

    if (defaultAccount) {
      await this.transactionsService.settleReceivableForCompany({
        companyId: company_id,
        userId: user_id || 'SYSTEM',
        dto: {
          account_receivable_id: receivable.id,
          amount: net_amount,
          transaction_date: todayISO(),
          bank_account_id: defaultAccount.id,
          payment_method: paymentMethodName || dto.payment_method || 'CASH',
          notes: `Baixa automática - Venda ${sale_number}`,
          interest_amount: 0,
          penalty_amount: 0,
          discount_amount: 0,
        },
      });
    } else {
      this.logger.warn(
        `Nenhuma conta bancária ativa encontrada para baixar venda ${sale_number}`,
        SalesService.name,
      );
    }

    return this.mapToDto(completeSale);
  }

  @Transactional()
  async cancel(
    id: string,
    reason: string,
    context?: SalesExecutionContext,
  ): Promise<void> {
    const companyId = context?.companyId ?? this.tenantContext.getCompanyId();
    const userId =
      context?.userId ??
      this.tenantContext.getUserId() ??
      context?.customerId ??
      this.getCustomerId();

    const sale = await this.salesRepository.findById(id, companyId);

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    // Verificar se já foi cancelada
    if (sale.cancellation_date) {
      throw new BadRequestException('Venda já foi cancelada');
    }

    const cancelledStatusId = await this.resolveSaleStatusId(
      companyId,
      'Cancelada',
    );

    // Cancelar venda
    await this.salesRepository.update(id, {
      sale_status: { connect: { id: cancelledStatusId } },
      cancellation_date: new Date(),
      cancellation_reason: reason,
    });

    // Reversões financeiras e fiscais
    await this.reverseTaxEntriesForCancellation(sale, userId || null);
    await this.accountsReceivableService.cancelBySaleIdForCompany({
      companyId,
      saleId: sale.id,
    });
    await this.reverseJournalEntriesForCancellation(sale, reason);
    await this.reverseLoyaltyPointsForCancellation(sale, companyId);

    // Liberar assentos
    if (sale.tickets) {
      const seatsByShowtime = new Map<string, string[]>();
      for (const ticket of sale.tickets) {
        if (ticket.seat_id && ticket.showtime_id) {
          const current = seatsByShowtime.get(ticket.showtime_id) || [];
          current.push(ticket.seat_id);
          seatsByShowtime.set(ticket.showtime_id, current);
        }
      }

      await Promise.all(
        Array.from(seatsByShowtime.entries()).map(([showtime_id, seat_ids]) =>
          this.ticketsService.releaseSeats({
            showtimeId: showtime_id,
            seatIds: seat_ids,
            context: { companyId },
          }),
        ),
      );
    }

    // Publicar evento
    await this.rabbitmq.publish({
      pattern: 'audit.sale.cancelled',
      data: {
        id: sale.id,
        reason,
        old_values: sale,
      },
      metadata: {
        companyId,
        userId,
      },
    });

    this.logger.log(`Venda cancelada: ${sale.sale_number}`, SalesService.name);
  }

  private async reverseTaxEntriesForCancellation(
    sale: SaleWithFullRelations,
    processingUserId: string | null,
  ): Promise<void> {
    const taxEntries = await this.taxEntriesRepository.findAllBySource(
      'SALE',
      sale.id,
    );

    for (const entry of taxEntries) {
      await this.taxEntriesRepository.create({
        cinema_complex_id: entry.cinema_complex_id,
        source_type: 'SALE_CANCELLATION',
        source_id: sale.id,
        competence_date: entry.competence_date,
        gross_amount: -Number(entry.gross_amount),
        deductions_amount: -Number(entry.deductions_amount || 0),
        calculation_base: -Number(entry.calculation_base),
        apply_iss: entry.apply_iss ?? true,
        iss_rate: Number(entry.iss_rate || 0),
        iss_amount: -Number(entry.iss_amount || 0),
        ibge_municipality_code: entry.ibge_municipality_code || undefined,
        ...(entry.iss_service_code && {
          iss_service_code: entry.iss_service_code,
        }),
        pis_cofins_regime: entry.pis_cofins_regime || undefined,
        pis_rate: Number(entry.pis_rate),
        pis_debit_amount: -Number(entry.pis_debit_amount),
        pis_credit_amount: -Number(entry.pis_credit_amount || 0),
        pis_amount_payable: -Number(entry.pis_amount_payable),
        cofins_rate: Number(entry.cofins_rate),
        cofins_debit_amount: -Number(entry.cofins_debit_amount),
        cofins_credit_amount: -Number(entry.cofins_credit_amount || 0),
        cofins_amount_payable: -Number(entry.cofins_amount_payable),
        processing_user_id: processingUserId,
        processing_date: new Date(),
        processed: true,
      });
    }
  }

  private async reverseJournalEntriesForCancellation(
    sale: SaleWithFullRelations,
    reason: string,
  ): Promise<void> {
    const originalEntries = await this.prisma.journal_entries.findMany({
      where: {
        origin_type: 'SALE',
        origin_id: sale.id,
      },
      include: {
        journal_entry_items: true,
      },
    });

    if (originalEntries.length === 0) {
      return;
    }

    for (const entry of originalEntries) {
      const reversalEntryNumber = `${entry.entry_number}-REV-${Date.now()}-${Math.floor(
        Math.random() * 1000,
      )}`;

      await this.prisma.journal_entries.create({
        data: {
          cinema_complex_id: entry.cinema_complex_id,
          entry_number: reversalEntryNumber,
          entry_date: new Date(),
          description: `Estorno de venda ${sale.sale_number}: ${reason}`,
          origin_type: 'SALE_CANCELLATION',
          origin_id: sale.id,
          total_amount: entry.total_amount,
          journal_entry_items: {
            create: entry.journal_entry_items.map((item) => ({
              account_id: item.account_id,
              movement_type:
                item.movement_type === 'DEBIT'
                  ? 'CREDIT'
                  : item.movement_type === 'CREDIT'
                    ? 'DEBIT'
                    : item.movement_type,
              amount: item.amount,
              item_description: `Estorno do item ${item.id}`,
            })),
          },
        },
      });
    }
  }

  private async reverseLoyaltyPointsForCancellation(
    sale: SaleWithFullRelations,
    companyId: string,
  ): Promise<void> {
    if (!sale.customer_id) {
      return;
    }

    const pointsEarned = (sale.promotions_used || []).reduce(
      (sum, usage) => sum + (usage.points_earned || 0),
      0,
    );

    if (pointsEarned <= 0) {
      return;
    }

    const companyCustomer = await this.prisma.company_customers.findFirst({
      where: {
        company_id: companyId,
        customer_id: sale.customer_id,
      },
      select: {
        id: true,
        accumulated_points: true,
      },
    });

    if (!companyCustomer) {
      return;
    }

    const currentPoints = companyCustomer.accumulated_points || 0;
    const newPoints = Math.max(0, currentPoints - pointsEarned);

    await this.prisma.company_customers.update({
      where: { id: companyCustomer.id },
      data: {
        accumulated_points: newPoints,
      },
    });
  }

  private mapToDto(sale: SaleForResponse): SaleResponseDto {
    const promotionUsage =
      sale.promotions_used && sale.promotions_used.length > 0
        ? sale.promotions_used[0]
        : null;

    return {
      id: sale.id,
      sale_number: sale.sale_number,
      cinema_complex_id: sale.cinema_complex_id,
      customer_id: sale.customer_id ?? undefined,
      sale_date: sale.sale_date.toISOString(),
      total_amount: sale.total_amount.toString(),
      discount_amount: (sale.discount_amount || 0).toString(),
      net_amount: sale.net_amount.toString(),
      sale_type: sale.sale_types?.name,
      payment_method: sale.payment_methods?.name,
      status: sale.sale_status?.name,
      promotion_code: promotionUsage?.promotion_type_code ?? undefined,
      promotion_discount: promotionUsage?.discount_applied
        ? promotionUsage.discount_applied.toString()
        : undefined,
      tickets: (sale.tickets || []).map(
        (ticket): TicketResponseDto => ({
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          seat: ticket.seat ?? undefined,
          face_value: ticket.face_value.toString(),
          service_fee: (ticket.service_fee || 0).toString(),
          total_amount: ticket.total_amount.toString(),
          used: ticket.used || false,
          usage_date: ticket.usage_date?.toISOString(),
        }),
      ),
      created_at: sale.created_at?.toISOString() || new Date().toISOString(),
    };
  }

  private isImmediatePaymentMethod(paymentMethodName?: string | null): boolean {
    if (!paymentMethodName) {
      return true;
    }

    const normalized = paymentMethodName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    const deferredKeywords = ['CREDITO', 'PRAZO', 'BOLETO', 'FATURADO'];

    return !deferredKeywords.some((keyword) => normalized.includes(keyword));
  }

  private buildIdempotencyReference(
    companyId: string,
    idempotencyKey: string,
  ): string {
    const normalizedKey = idempotencyKey.trim();
    const digest = createHash('sha256')
      .update(`${companyId}:${normalizedKey}`)
      .digest('hex');
    return `idem_${digest.slice(0, 59)}`;
  }

  private async resolveSaleTypeId(
    company_id: string,
    saleTypeIdFromDto: string | undefined,
    sessionContext?: 'EMPLOYEE' | 'CUSTOMER',
  ): Promise<string> {
    if (saleTypeIdFromDto) {
      const saleType = await this.salesRepository.findSaleTypeById(
        saleTypeIdFromDto,
        company_id,
      );

      if (!saleType) {
        throw new NotFoundException('Tipo de venda inválido');
      }

      return saleType.id;
    }

    const defaultName = sessionContext === 'CUSTOMER' ? 'Online' : 'Balcão';
    const existing = await this.salesRepository.findSaleTypeByName(
      company_id,
      defaultName,
    );

    if (existing) {
      return existing.id;
    }

    const created = await this.salesRepository.createSaleType({
      company_id,
      name: defaultName,
      description: 'Criado automaticamente para consistência de vendas',
      convenience_fee: 0,
    });

    return created.id;
  }

  private async resolveSaleStatusId(
    company_id: string,
    statusName: string,
  ): Promise<string> {
    const existing = await this.salesRepository.findSaleStatusByName(
      company_id,
      statusName,
    );

    if (existing) {
      return existing.id;
    }

    const created = await this.salesRepository.createSaleStatus({
      company_id,
      name: statusName,
      description: 'Criado automaticamente para consistência de vendas',
      allows_modification: statusName === 'Pendente',
    });

    return created.id;
  }
}
