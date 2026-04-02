import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { CinemaComplexesModule } from 'src/modules/operations/cinema-complexes/cinema-complexes.module';
import { ShowtimesModule } from 'src/modules/operations/showtime_schedule/showtime.module';
import { SeatsModule } from 'src/modules/operations/seats/seats.module';
import { SeatStatusModule } from 'src/modules/operations/seat-status/seat-status.module';
import { SessionSeatStatusModule } from 'src/modules/operations/session_seat_status/session-seat-status.module';
import { ProductsModule } from 'src/modules/catalog/products/products.module';
import { ProductPricesRepository } from 'src/modules/catalog/products/repositories/product-prices.repository';
import { CombosRepository } from 'src/modules/catalog/products/repositories/combos.repository';
import { TaxModule } from 'src/modules/tax/tax.module';
import { MarketingModule } from 'src/modules/marketing/marketing.module';

import { SalesController } from './controllers/sales.controller';
import { TicketTypesController } from './controllers/ticket-types.controller';
import { TicketsController } from './controllers/tickets.controller';
import { SalesService } from './services/sales.service';
import { TicketTypesService } from './services/ticket-types.service';
import { TicketsService } from './services/tickets.service';
import { SeatReservationStoreService } from './services/seat-reservation-store.service';
import { SalesRepository } from './repositories/sales.repository';
import { TicketTypesRepository } from './repositories/ticket-types.repository';
import { TicketsRepository } from './repositories/tickets.repository';
import { ConcessionSalesRepository } from './repositories/concession-sales.repository';
import { SeatsReservationGateway } from './gateways/seats-reservation.gateway';

import { CashFlowModule } from '../finance/cash-flow/cash-flow.module';
import { AccountsReceivableModule } from '../finance/accounts-receivable/accounts-receivable.module';
import { TransactionsModule } from '../finance/transactions/transactions.module';
import { AuthModule } from '../identity/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    CinemaComplexesModule,
    ShowtimesModule,
    SeatsModule,
    SeatStatusModule,
    SessionSeatStatusModule,
    ProductsModule,
    TaxModule,
    MarketingModule,
    CashFlowModule,
    AccountsReceivableModule,
    TransactionsModule,
    AuthModule,
  ],
  controllers: [SalesController, TicketsController, TicketTypesController],
  providers: [
    SalesService,
    TicketTypesService,
    TicketsService,
    SalesRepository,
    TicketTypesRepository,
    TicketsRepository,
    ConcessionSalesRepository,
    SeatReservationStoreService,
    ProductPricesRepository,
    CombosRepository,
    SeatsReservationGateway,
  ],
  exports: [
    SalesService,
    TicketTypesService,
    TicketsService,
    SalesRepository,
    TicketTypesRepository,
    TicketsRepository,
    ConcessionSalesRepository,
  ],
})
export class SalesModule {}
