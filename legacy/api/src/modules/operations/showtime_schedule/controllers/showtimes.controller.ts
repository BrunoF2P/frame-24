import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  Put,
} from '@nestjs/common';
import {
  ParseEntityIdPipe,
  ParseOptionalEntityIdPipe,
} from 'src/common/pipes/parse-entity-id.pipe';
import { ParseOptionalIsoDatePipe } from 'src/common/pipes/parse-optional-iso-date.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import { CreateShowtimeDto } from '../dto/create-showtime.dto';
import { UpdateShowtimeDto } from '../dto/update-showtime.dto';
import { UpdateShowtimeSeatStatusDto } from '../dto/update-showtime-seat-status.dto';
import {
  ShowtimeDetailsDto,
  ShowtimesService,
} from 'src/modules/operations/showtime_schedule/services/showtimes.service';

@ApiTags('Showtimes')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'showtimes', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ShowtimesController {
  constructor(private readonly service: ShowtimesService) {}

  @Post('preview')
  @EmployeeWriteThrottle()
  @RequirePermission('showtimes', 'create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview da projeção financeira de uma sessão',
    description:
      'Retorna o breakdown financeiro calculado sem salvar a sessão no banco.',
  })
  @ApiResponse({
    status: 200,
    description: 'Projeção financeira calculada com sucesso.',
  })
  @ApiNotFoundResponse({ description: 'Filme ou sala não encontrado.' })
  @ApiForbiddenResponse({
    description: 'Acesso negado. A sala não pertence à sua empresa.',
  })
  async preview(@Body() dto: CreateShowtimeDto) {
    return this.service.preview(dto);
  }

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('showtimes', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar uma nova sessão de cinema' })
  @ApiResponse({ status: 201, description: 'Sessão criada com sucesso.' })
  @ApiNotFoundResponse({ description: 'Filme, sala ou status não encontrado.' })
  @ApiConflictResponse({
    description: 'Já existe uma sessão agendada nesta sala neste horário.',
  })
  @ApiForbiddenResponse({
    description: 'Acesso negado. A sala não pertence à sua empresa.',
  })
  async create(@Body() dto: CreateShowtimeDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('showtimes', 'read')
  @ApiOperation({ summary: 'Listar todas as sessões' })
  @ApiQuery({
    name: 'cinema_complex_id',
    required: false,
    description: 'UUID ou Snowflake do complexo (deve pertencer ao tenant)',
  })
  @ApiQuery({
    name: 'room_id',
    required: false,
    description:
      'Sala (UUID/Snowflake) — deve pertencer a um complexo do tenant',
  })
  @ApiQuery({
    name: 'movie_id',
    required: false,
    description:
      'Filme (UUID/Snowflake) — deve pertencer ao catálogo do tenant',
  })
  @ApiQuery({
    name: 'start_time',
    required: false,
    description: 'Filtrar sessões a partir deste instante (ISO-8601)',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos' })
  @ApiForbiddenResponse({
    description: 'Filtro referencia recurso de outro tenant.',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página da listagem (padrão: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão: 100, máximo: 100)',
    example: 100,
  })
  async findAll(
    @Query('cinema_complex_id', new ParseOptionalEntityIdPipe())
    cinema_complex_id?: string,
    @Query('room_id', new ParseOptionalEntityIdPipe()) room_id?: string,
    @Query('movie_id', new ParseOptionalEntityIdPipe()) movie_id?: string,
    @Query('start_time', new ParseOptionalIsoDatePipe()) start_time?: Date,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      cinema_complex_id,
      room_id,
      movie_id,
      start_time,
      status,
      ...(page &&
        Number.isFinite(Number(page)) && { page: Math.max(1, Number(page)) }),
      ...(limit &&
        Number.isFinite(Number(limit)) && {
          limit: Math.min(100, Math.max(1, Number(limit))),
        }),
    });
  }

  @Get(':id')
  @RequirePermission('showtimes', 'read')
  @ApiOperation({ summary: 'Buscar uma sessão específica por ID' })
  @ApiNotFoundResponse({ description: 'Sessão não encontrada.' })
  @ApiForbiddenResponse({ description: 'Acesso negado a esta sessão.' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<ShowtimeDetailsDto> {
    return this.service.findOne(id);
  }

  @Get(':id/seats')
  @RequirePermission('showtimes', 'read')
  @ApiOperation({ summary: 'Obter o mapa de assentos de uma sessão' })
  @ApiNotFoundResponse({ description: 'Sessão não encontrada.' })
  @ApiForbiddenResponse({ description: 'Acesso negado a esta sessão.' })
  async getSeatsMap(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.getSeatsMap(id);
  }

  @Patch(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('showtimes', 'update')
  @ApiOperation({ summary: 'Atualizar uma sessão existente' })
  @ApiNotFoundResponse({ description: 'Sessão não encontrada.' })
  @ApiForbiddenResponse({ description: 'Acesso negado a esta sessão.' })
  @ApiConflictResponse({ description: 'Conflito de horário com outra sessão.' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('showtimes', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar uma sessão' })
  @ApiResponse({ status: 200, description: 'Sessão cancelada com sucesso.' })
  @ApiNotFoundResponse({ description: 'Sessão não encontrada.' })
  @ApiForbiddenResponse({ description: 'Acesso negado a esta sessão.' })
  async remove(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.remove(id);
  }

  @Put(':id/seats/:seatId/status')
  @EmployeeWriteThrottle()
  @RequirePermission('showtimes', 'update')
  @ApiOperation({
    summary: 'Atualizar o status manual de um assento em uma sessão',
  })
  async updateSeatStatus(
    @Param('id', ParseEntityIdPipe) id: string,
    @Param('seatId') seatId: string,
    @Body() dto: UpdateShowtimeSeatStatusDto,
  ) {
    await this.service.updateSeatStatus(id, seatId, dto.status);
    return { success: true };
  }
}
