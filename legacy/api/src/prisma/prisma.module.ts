import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { PrismaService } from './prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Module({
  imports: [ClsModule.forFeature()],
  providers: [PrismaService, SnowflakeService],
  exports: [PrismaService],
})
export class PrismaModule {}
