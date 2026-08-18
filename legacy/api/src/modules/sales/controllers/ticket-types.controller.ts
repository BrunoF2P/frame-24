import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { CreateTicketTypeDto } from '../dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from '../dto/update-ticket-type.dto';
import { TicketTypeResponseDto } from '../dto/ticket-type-response.dto';
import { TicketTypesService } from '../services/ticket-types.service';

@ApiTags('Ticket Types')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'ticket-types', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('ticket_types', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar tipo de ingresso' })
  async create(
    @Body() dto: CreateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypesService.create(dto);
  }

  @Get()
  @RequirePermission('ticket_types', 'read')
  @ApiOperation({ summary: 'Listar tipos de ingresso' })
  async findAll(): Promise<TicketTypeResponseDto[]> {
    return this.ticketTypesService.findAll();
  }

  @Get(':id')
  @RequirePermission('ticket_types', 'read')
  @ApiOperation({ summary: 'Buscar tipo de ingresso por ID' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypesService.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('ticket_types', 'update')
  @ApiOperation({ summary: 'Atualizar tipo de ingresso' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypesService.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('ticket_types', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir tipo de ingresso' })
  async delete(@Param('id', ParseEntityIdPipe) id: string): Promise<void> {
    return this.ticketTypesService.delete(id);
  }
}
