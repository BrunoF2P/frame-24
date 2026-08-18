import { Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';

import { SessionStatusService } from '../services/session-status.service';
import { SessionStatusResponseDto } from '../../shared/dto/session-status-response.dto';

@ApiTags('Session Status')
@EmployeeReadThrottle()
@SecuredController({ path: 'session-status', version: '1' })
export class SessionStatusController {
  constructor(private readonly service: SessionStatusService) {}

  @Get()
  @RequirePermission('session_status', 'read')
  @ApiOperation({
    summary: 'Listar todos os status de sessão (ex: Agendada, Cancelada)',
  })
  @ApiOkResponse({
    description: 'Lista de status de sessão retornada com sucesso.',
    type: SessionStatusResponseDto,
    isArray: true,
  })
  async findAll(): Promise<SessionStatusResponseDto[]> {
    return this.service.findAll();
  }
}
