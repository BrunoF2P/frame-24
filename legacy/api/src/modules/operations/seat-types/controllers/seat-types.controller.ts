import { Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { OperationTypeResponseDto } from '../../shared/dto/operation-type-response.dto';

import { SeatTypesService } from '../services/seat-types.service';

@ApiTags('Seat Types')
@EmployeeReadThrottle()
@SecuredController({ path: 'seat-types', version: '1' })
export class SeatTypesController {
  constructor(private readonly service: SeatTypesService) {}

  @Get()
  @RequirePermission('seat_types', 'read')
  @ApiOperation({ summary: 'Listar todos os tipos de assento da empresa' })
  @ApiOkResponse({
    description: 'Lista de tipos de assento retornada com sucesso.',
    type: OperationTypeResponseDto,
    isArray: true,
  })
  async findAll(): Promise<OperationTypeResponseDto[]> {
    return this.service.findAll();
  }
}
