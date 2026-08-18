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
  Query,
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
import { CreatePosSessionDto } from '../dto/create-pos-session.dto';
import { UpdatePosSessionDto } from '../dto/update-pos-session.dto';
import { PosSessionResponseDto } from '../dto/pos-session-response.dto';
import { PosSessionsService } from '../services/pos-sessions.service';

@ApiTags('POS - Frente de Caixa')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'pos-sessions', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PosSessionsController {
  constructor(private readonly posSessionsService: PosSessionsService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('pos_sessions', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir nova sessão PDV (frente de caixa)' })
  async create(
    @Body() dto: CreatePosSessionDto,
  ): Promise<PosSessionResponseDto> {
    return this.posSessionsService.create(dto);
  }

  @Get()
  @RequirePermission('pos_sessions', 'read')
  @ApiOperation({ summary: 'Listar sessões PDV' })
  async findAll(
    @Query('status') status?: string,
    @Query('cinema_complex_id') cinema_complex_id?: string,
  ): Promise<PosSessionResponseDto[]> {
    return this.posSessionsService.findAll({
      status,
      cinema_complex_id,
    });
  }

  @Get('statuses')
  @RequirePermission('pos_sessions', 'read')
  @ApiOperation({ summary: 'Listar status disponíveis para sessão PDV' })
  async getStatuses() {
    return this.posSessionsService.getStatuses();
  }

  @Get(':id')
  @RequirePermission('pos_sessions', 'read')
  @ApiOperation({ summary: 'Buscar sessão PDV por ID com totais' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<PosSessionResponseDto> {
    return this.posSessionsService.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('pos_sessions', 'update')
  @ApiOperation({ summary: 'Atualizar sessão PDV (fechar, suspender etc.)' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdatePosSessionDto,
  ): Promise<PosSessionResponseDto> {
    return this.posSessionsService.update(id, dto);
  }
}
