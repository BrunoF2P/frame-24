import {
  Controller,
  Get,
  Put,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import { TicketsRepository } from '../repositories/tickets.repository';

@ApiTags('Tickets')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'tickets', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class TicketsController {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  @Get(':id')
  @RequirePermission('tickets', 'read')
  @ApiOperation({ summary: 'Buscar ingresso por ID' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<Awaited<ReturnType<TicketsRepository['findById']>>> {
    const ticket = await this.ticketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado');
    }
    return ticket;
  }

  @Put(':id/use')
  @EmployeeWriteThrottle()
  @RequirePermission('tickets', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar ingresso como usado' })
  async markAsUsed(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<Awaited<ReturnType<TicketsRepository['markAsUsed']>>> {
    return this.ticketsRepository.markAsUsed(id, new Date());
  }
}
