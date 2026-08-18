import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import type { OperationTypeResponse } from '../../shared/dto/operation-type-response.dto';
import { AudioTypesRepository } from '../repositories/audio-types.repository';

@Injectable()
export class AudioTypesService {
  constructor(
    private readonly repository: AudioTypesRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<OperationTypeResponse[]> {
    return this.repository.findAllByCompany(this.tenantContext.getCompanyId());
  }
}
