import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import type { OperationTypeResponse } from '../../shared/dto/operation-type-response.dto';
import { SeatTypesRepository } from '../repositories/seat-types.repository';

@Injectable()
export class SeatTypesService {
  constructor(
    private readonly repository: SeatTypesRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<OperationTypeResponse[]> {
    return this.repository.findAllByCompany(this.tenantContext.getCompanyId());
  }
}
