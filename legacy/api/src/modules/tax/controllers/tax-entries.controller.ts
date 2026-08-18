import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ParseEntityIdPipe,
  ParseOptionalEntityIdPipe,
} from 'src/common/pipes/parse-entity-id.pipe';
import { ParseOptionalIsoDatePipe } from 'src/common/pipes/parse-optional-iso-date.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { EmployeeReadThrottle } from 'src/common/decorators/auth-throttle.decorator';

import { TaxEntriesService } from '../services/tax-entries.service';
import { TaxEntryResponseDto } from '../dto/tax-entry-response.dto';

@ApiTags('Tax')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'tax/entries', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class TaxEntriesController {
  constructor(private readonly taxEntriesService: TaxEntriesService) {}

  @Get()
  @RequirePermission('tax', 'read')
  @ApiOperation({ summary: 'Listar lançamentos fiscais' })
  @ApiResponse({ status: 400, description: 'Parâmetros de consulta inválidos' })
  @ApiResponse({
    status: 403,
    description: 'Filtro de complexo não pertence ao tenant atual',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async findAll(
    @Query('cinema_complex_id', new ParseOptionalEntityIdPipe())
    cinema_complex_id?: string,
    @Query('source_type') source_type?: string,
    @Query('source_id', new ParseOptionalEntityIdPipe()) source_id?: string,
    @Query('start_date', new ParseOptionalIsoDatePipe()) start_date?: Date,
    @Query('end_date', new ParseOptionalIsoDatePipe()) end_date?: Date,
    @Query('processed') processed?: string,
  ): Promise<TaxEntryResponseDto[]> {
    const filters: {
      cinema_complex_id?: string;
      source_type?: string;
      source_id?: string;
      start_date?: Date;
      end_date?: Date;
      processed?: boolean;
    } = {};
    if (cinema_complex_id) filters.cinema_complex_id = cinema_complex_id;
    if (source_type) filters.source_type = source_type;
    if (source_id) filters.source_id = source_id;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (processed !== undefined)
      filters.processed = processed === 'true' ? true : false;

    return await this.taxEntriesService.findAll(filters);
  }

  @Get(':id')
  @RequirePermission('tax', 'read')
  @ApiOperation({ summary: 'Buscar lançamento fiscal por ID' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<TaxEntryResponseDto> {
    return await this.taxEntriesService.findOne(id);
  }
}
