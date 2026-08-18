import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ClsModule.forFeature()],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
