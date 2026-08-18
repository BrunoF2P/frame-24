import { Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { OperationTypeResponseDto } from '../../shared/dto/operation-type-response.dto';

import { AudioTypesService } from '../services/audio-types.service';

@ApiTags('Audio Types')
@EmployeeReadThrottle()
@SecuredController({ path: 'audio-types', version: '1' })
export class AudioTypesController {
  constructor(private readonly service: AudioTypesService) {}

  @Get()
  @RequirePermission('audio_types', 'read')
  @ApiOperation({ summary: 'Listar todos os tipos de áudio da empresa' })
  @ApiOkResponse({
    description: 'Lista de tipos de áudio retornada com sucesso.',
    type: OperationTypeResponseDto,
    isArray: true,
  })
  async findAll(): Promise<OperationTypeResponseDto[]> {
    return this.service.findAll();
  }
}
