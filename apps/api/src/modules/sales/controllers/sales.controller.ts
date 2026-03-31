import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';

import { SalesService } from '../services/sales.service';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { SaleResponseDto } from '../dto/sale-response.dto';
import { WriteThrottle } from 'src/common/decorators/auth-throttle.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller({ path: 'sales', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @RequirePermission('sales', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova venda' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Chave de idempotência para evitar criação duplicada de venda em retries',
  })
  @WriteThrottle()
  async create(
    @Body() dto: CreateSaleDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<SaleResponseDto> {
    return await this.salesService.create(dto, { idempotencyKey });
  }

  @Get()
  @RequirePermission('sales', 'read')
  @ApiOperation({ summary: 'Listar vendas' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página da listagem (padrão: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão: 50, máximo: 100)',
    example: 50,
  })
  async findAll(
    @Query('cinema_complex_id') cinema_complex_id?: string,
    @Query('customer_id') customer_id?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SaleResponseDto[]> {
    const filters: {
      cinema_complex_id?: string;
      customer_id?: string;
      start_date?: Date;
      end_date?: Date;
      status?: string;
      page?: number;
      limit?: number;
    } = {};
    if (cinema_complex_id) filters.cinema_complex_id = cinema_complex_id;
    if (customer_id) filters.customer_id = customer_id;
    if (start_date) filters.start_date = new Date(start_date);
    if (end_date) filters.end_date = new Date(end_date);
    if (status) filters.status = status;
    if (page && Number.isFinite(Number(page))) {
      filters.page = Math.max(1, Number(page));
    }
    if (limit && Number.isFinite(Number(limit))) {
      filters.limit = Math.min(100, Math.max(1, Number(limit)));
    }

    return await this.salesService.findAll(filters);
  }

  @Get(':id')
  @RequirePermission('sales', 'read')
  @ApiOperation({ summary: 'Buscar venda por ID' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<SaleResponseDto> {
    return await this.salesService.findOne(id);
  }

  @Delete(':id/cancel')
  @RequirePermission('sales', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar venda' })
  @WriteThrottle()
  async cancel(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<void> {
    return await this.salesService.cancel(id, reason);
  }
}
