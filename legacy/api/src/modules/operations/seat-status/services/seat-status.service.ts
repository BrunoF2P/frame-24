import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import type { SeatStatusResponse } from '../../shared/dto/seat-status-response.dto';
import { SeatStatusRepository } from '../repositories/seat-status.repository';

@Injectable()
export class SeatStatusService {
  constructor(
    private readonly repository: SeatStatusRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<SeatStatusResponse[]> {
    return this.repository.findAllByCompany(this.tenantContext.getCompanyId());
  }
}
