import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
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

import { ProductCategoriesService } from '../services/product-categories.service';
import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
import { ProductCategoryResponseDto } from '../dto/product-category-response.dto';

@ApiTags('Product Categories')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'product-categories', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('product_categories', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar categoria de produto' })
  async create(
    @Body() dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    return await this.categoriesService.create(dto);
  }

  @Get()
  @RequirePermission('product_categories', 'read')
  @ApiOperation({ summary: 'Listar categorias de produtos' })
  async findAll(): Promise<ProductCategoryResponseDto[]> {
    return await this.categoriesService.findAll(true);
  }

  @Get(':id')
  @RequirePermission('product_categories', 'read')
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<ProductCategoryResponseDto> {
    return await this.categoriesService.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('product_categories', 'update')
  @ApiOperation({ summary: 'Atualizar categoria' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    return await this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('product_categories', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar categoria' })
  async delete(@Param('id', ParseEntityIdPipe) id: string): Promise<void> {
    return await this.categoriesService.delete(id);
  }
}
