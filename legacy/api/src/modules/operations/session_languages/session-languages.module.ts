import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SessionLanguagesController } from './controllers/session-languages.controller';
import { SessionLanguagesRepository } from './repositories/session-languages.repository';
import { SessionLanguagesService } from './services/session-languages.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SessionLanguagesController],
  providers: [SessionLanguagesService, SessionLanguagesRepository],
  exports: [SessionLanguagesRepository],
})
export class SessionLanguagesModule {}
