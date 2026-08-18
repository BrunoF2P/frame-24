import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { FileUpload } from 'src/common/decorators/file-upload.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductResponseDto } from '../dto/product-response.dto';

@ApiTags('Products')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'products', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @EmployeeWriteThrottle()
  @FileUpload('image', false)
  @RequirePermission('products', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar produto' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return await this.productsService.create(dto, file);
  }

  @Get()
  @RequirePermission('products', 'read')
  @ApiOperation({ summary: 'Listar produtos' })
  async findAll(
    @Query('active') active?: string,
  ): Promise<ProductResponseDto[]> {
    const activeFilter =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return await this.productsService.findAll(activeFilter);
  }

  @Get('category/:category_id')
  @RequirePermission('products', 'read')
  @ApiOperation({ summary: 'Listar produtos por categoria' })
  async findByCategory(
    @Param('category_id') category_id: string,
    @Query('active') active?: string,
  ): Promise<ProductResponseDto[]> {
    const activeFilter =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return await this.productsService.findByCategory(category_id, activeFilter);
  }

  @Get('search/:term')
  @RequirePermission('products', 'read')
  @ApiOperation({ summary: 'Buscar produtos por nome/código/barcode' })
  async search(
    @Param('term') searchTerm: string,
    @Query('active') active?: string,
  ): Promise<ProductResponseDto[]> {
    const activeFilter =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return await this.productsService.search(searchTerm, activeFilter);
  }

  @Get(':id')
  @RequirePermission('products', 'read')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<ProductResponseDto> {
    return await this.productsService.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @FileUpload('image', false)
  @RequirePermission('products', 'update')
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return await this.productsService.update(id, dto, file);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('products', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar produto (soft delete)' })
  async delete(@Param('id', ParseEntityIdPipe) id: string): Promise<void> {
    return await this.productsService.delete(id, true);
  }
}
