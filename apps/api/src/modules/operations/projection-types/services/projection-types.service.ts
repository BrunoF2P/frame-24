import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import type { OperationTypeResponse } from '../../shared/dto/operation-type-response.dto';
import { ProjectionTypesRepository } from '../repositories/projection-types.repository';

@Injectable()
export class ProjectionTypesService {
  constructor(
    private readonly repository: ProjectionTypesRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<OperationTypeResponse[]> {
    return this.repository.findAllByCompany(this.tenantContext.getCompanyId());
  }
}
