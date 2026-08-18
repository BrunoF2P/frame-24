import { Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { SessionLanguageResponseDto } from '../../shared/dto/session-language-response.dto';

import { SessionLanguagesService } from '../services/session-languages.service';

@ApiTags('Session Languages')
@EmployeeReadThrottle()
@SecuredController({ path: 'session-languages', version: '1' })
export class SessionLanguagesController {
  constructor(private readonly service: SessionLanguagesService) {}

  @Get()
  @RequirePermission('session_languages', 'read')
  @ApiOperation({
    summary: 'Listar todas as linguagens de sessão disponíveis para a empresa',
  })
  @ApiOkResponse({
    description: 'Lista de linguagens de sessão retornada com sucesso.',
    type: SessionLanguageResponseDto,
    isArray: true,
  })
  async findAll(): Promise<SessionLanguageResponseDto[]> {
    return this.service.findAll();
  }
}
