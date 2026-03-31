import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';

import { TaxEntriesService } from '../services/tax-entries.service';
import { TaxEntryResponseDto } from '../dto/tax-entry-response.dto';

@ApiTags('Tax')
@ApiBearerAuth()
@Controller({ path: 'tax/entries', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class TaxEntriesController {
  constructor(private readonly taxEntriesService: TaxEntriesService) {}

  @Get()
  @RequirePermission('tax', 'read')
  @ApiOperation({ summary: 'Listar lançamentos fiscais' })
  async findAll(
    @Query('cinema_complex_id') cinema_complex_id?: string,
    @Query('source_type') source_type?: string,
    @Query('source_id') source_id?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
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
    if (start_date) filters.start_date = new Date(start_date);
    if (end_date) filters.end_date = new Date(end_date);
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
