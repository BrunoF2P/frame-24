import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from 'src/common/common.module';
import { CinemaComplexesModule } from 'src/modules/operations/cinema-complexes/cinema-complexes.module';

import { PosSessionsController } from './controllers/pos-sessions.controller';
import { PosTransactionsController } from './controllers/pos-transactions.controller';
import { PosPaymentMethodsController } from './controllers/pos-payment-methods.controller';
import { PosSessionsService } from './services/pos-sessions.service';
import { PosTransactionsService } from './services/pos-transactions.service';
import { PosSessionsRepository } from './repositories/pos-sessions.repository';
import { PosTransactionsRepository } from './repositories/pos-transactions.repository';
import { PosSessionStatusRepository } from './repositories/pos-session-status.repository';
import { PosPaymentMethodsRepository } from './repositories/pos-payment-methods.repository';

@Module({
  imports: [PrismaModule, CommonModule, CinemaComplexesModule],
  controllers: [
    PosSessionsController,
    PosTransactionsController,
    PosPaymentMethodsController,
  ],
  providers: [
    PosSessionsService,
    PosTransactionsService,
    PosSessionsRepository,
    PosTransactionsRepository,
    PosSessionStatusRepository,
    PosPaymentMethodsRepository,
  ],
  exports: [
    PosSessionsService,
    PosTransactionsService,
    PosSessionsRepository,
    PosTransactionsRepository,
  ],
})
export class PosModule {}
