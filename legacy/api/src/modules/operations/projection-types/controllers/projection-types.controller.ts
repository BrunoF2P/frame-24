import { Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { OperationTypeResponseDto } from '../../shared/dto/operation-type-response.dto';

import { ProjectionTypesService } from '../services/projection-types.service';

@ApiTags('Projection Types')
@EmployeeReadThrottle()
@SecuredController({ path: 'projection-types', version: '1' })
export class ProjectionTypesController {
  constructor(private readonly service: ProjectionTypesService) {}

  @Get()
  @RequirePermission('projection_types', 'read')
  @ApiOperation({ summary: 'Listar todos os tipos de projeção da empresa' })
  @ApiOkResponse({
    description: 'Lista de tipos de projeção retornada com sucesso.',
    type: OperationTypeResponseDto,
    isArray: true,
  })
  async findAll(): Promise<OperationTypeResponseDto[]> {
    return this.service.findAll();
  }
}
