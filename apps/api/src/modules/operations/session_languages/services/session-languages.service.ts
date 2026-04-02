import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import type { SessionLanguageResponse } from '../../shared/dto/session-language-response.dto';
import { SessionLanguagesRepository } from '../repositories/session-languages.repository';

@Injectable()
export class SessionLanguagesService {
  constructor(
    private readonly repository: SessionLanguagesRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(): Promise<SessionLanguageResponse[]> {
    return this.repository.findAllByCompany(this.tenantContext.getCompanyId());
  }
}
