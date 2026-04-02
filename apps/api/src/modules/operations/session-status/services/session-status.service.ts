import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import type { SessionStatusResponse } from '../../shared/dto/session-status-response.dto';
import { SessionStatusRepository } from '../repositories/session-status.repository';

@Injectable()
export class SessionStatusService {
  constructor(
    private readonly repository: SessionStatusRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<SessionStatusResponse[]> {
    return this.repository.findAllByCompany(this.tenantContext.getCompanyId());
  }
}
