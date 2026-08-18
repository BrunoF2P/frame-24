import { Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { SeatStatusResponseDto } from '../../shared/dto/seat-status-response.dto';

import { SeatStatusService } from '../services/seat-status.service';

@ApiTags('Seat Status')
@EmployeeReadThrottle()
@SecuredController({ path: 'seat-status', version: '1' })
export class SeatStatusController {
  constructor(private readonly service: SeatStatusService) {}

  @Get()
  @RequirePermission('seat_status', 'read')
  @ApiOperation({
    summary: 'Listar todos os status de assento disponíveis para a empresa',
  })
  @ApiOkResponse({
    description: 'Lista de status de assento retornada com sucesso.',
    type: SeatStatusResponseDto,
    isArray: true,
  })
  async findAll(): Promise<SeatStatusResponseDto[]> {
    return this.service.findAll();
  }
}
