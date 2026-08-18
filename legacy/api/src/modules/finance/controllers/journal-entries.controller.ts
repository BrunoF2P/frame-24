import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ParseOptionalEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { ParseOptionalIsoDatePipe } from 'src/common/pipes/parse-optional-iso-date.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { JournalEntriesService } from '../services/journal-entries.service';
import { CreateJournalEntryDto } from '../dto/create-journal-entry.dto';

@ApiTags('Lançamentos Contábeis')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'finance/journal-entries', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class JournalEntriesController {
  constructor(private readonly journalEntries: JournalEntriesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('finance_entries', 'create')
  @ApiOperation({ summary: 'Criar lançamento contábil' })
  async create(@Body() dto: CreateJournalEntryDto) {
    return this.journalEntries.create(dto);
  }

  @Get()
  @RequirePermission('finance_entries', 'read')
  @ApiOperation({ summary: 'Listar lançamentos contábeis' })
  @ApiQuery({
    name: 'cinema_complex_id',
    required: false,
    description: 'Filtrar por complexo (UUID ou Snowflake)',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Data inicial do intervalo (ISO-8601)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Data final do intervalo (ISO-8601)',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos' })
  @ApiResponse({
    status: 403,
    description: 'Complexo informado não pertence ao tenant atual',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async findAll(
    @Query('cinema_complex_id', new ParseOptionalEntityIdPipe())
    cinema_complex_id?: string,
    @Query('start_date', new ParseOptionalIsoDatePipe()) start_date?: Date,
    @Query('end_date', new ParseOptionalIsoDatePipe()) end_date?: Date,
  ) {
    return this.journalEntries.findAll({
      cinema_complex_id,
      start_date,
      end_date,
    });
  }
}
