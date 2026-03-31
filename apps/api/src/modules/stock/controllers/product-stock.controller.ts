import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';

import { ProductStockService } from '../services/product-stock.service';
import { ProductStockResponseDto } from '../dto/product-stock-response.dto';

@ApiTags('Product Stock')
@ApiBearerAuth()
@Controller({ path: 'stock/products', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ProductStockController {
  constructor(private readonly productStockService: ProductStockService) {}

  @Get()
  @RequirePermission('stock', 'read')
  @ApiOperation({ summary: 'Listar estoque de produtos' })
  async findAll(
    @Query('complex_id') complex_id?: string,
  ): Promise<ProductStockResponseDto[]> {
    return await this.productStockService.findAll(complex_id);
  }

  @Get('low-stock')
  @RequirePermission('stock', 'read')
  @ApiOperation({ summary: 'Listar produtos com estoque baixo' })
  async findLowStock(
    @Query('complex_id') complex_id?: string,
  ): Promise<ProductStockResponseDto[]> {
    return await this.productStockService.findLowStock(complex_id);
  }

  @Get(':product_id/:complex_id')
  @RequirePermission('stock', 'read')
  @ApiOperation({ summary: 'Buscar estoque de produto específico' })
  async findOne(
    @Param('product_id', ParseEntityIdPipe) product_id: string,
    @Param('complex_id', ParseEntityIdPipe) complex_id: string,
  ): Promise<ProductStockResponseDto> {
    return await this.productStockService.findOne(product_id, complex_id);
  }
}
