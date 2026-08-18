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
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { SuppliersService } from '../services/suppliers.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Suppliers')
@EmployeeReadThrottle()
@Controller({ path: 'suppliers', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('suppliers', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastro de fornecedor',
    description:
      'Cria um novo fornecedor vinculado à empresa logada. Permite definir tipo, contatos e dados fiscais.',
  })
  @ApiResponse({
    status: 201,
    description: 'Fornecedor criado com sucesso.',
  })
  @ApiConflictResponse({
    description: 'CNPJ já cadastrado para esta empresa.',
  })
  @ApiBadRequestResponse({
    description: 'Erro de validação no payload enviado.',
  })
  async create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @RequirePermission('suppliers', 'read')
  @ApiOperation({
    summary: 'Listagem de fornecedores',
    description:
      'Retorna todos os fornecedores cadastrados da empresa logada. É possível filtrar apenas distribuidores via query param.',
  })
  @ApiQuery({
    name: 'distributors',
    required: false,
    type: Boolean,
    description: 'Filtra apenas fornecedores marcados como distribuidores',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de fornecedores retornada com sucesso.',
  })
  async findAll(@Query('distributors') onlyDistributors?: string) {
    return this.suppliersService.findAll(onlyDistributors === 'true');
  }

  @Get('types')
  @RequirePermission('suppliers', 'read')
  @ApiOperation({
    summary: 'Listagem de tipos de fornecedores',
    description:
      'Retorna todos os tipos de fornecedores disponíveis para a empresa logada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipos de fornecedores retornados com sucesso.',
  })
  async findTypes() {
    return this.suppliersService.findTypes();
  }

  @Get('distributors')
  @RequirePermission('suppliers', 'read')
  @ApiOperation({
    summary: 'Listagem de distribuidores de filmes',
    description: 'Retorna somente fornecedores marcados como distribuidores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribuidores retornados com sucesso.',
  })
  async findDistributors() {
    return this.suppliersService.findDistributors();
  }

  @Get(':id')
  @RequirePermission('suppliers', 'read')
  @ApiOperation({
    summary: 'Consulta detalhada de fornecedor',
    description: 'Retorna os dados completos de um fornecedor específico.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador único do fornecedor',
    example: 'f13df1e8-7c6b-4f12-bc2a-2e68f2e5f2b9',
  })
  @ApiResponse({
    status: 200,
    description: 'Fornecedor encontrado e retornado com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fornecedor não encontrado ou não pertence à empresa.',
  })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.suppliersService.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('suppliers', 'update')
  @ApiOperation({
    summary: 'Atualização de fornecedor',
    description:
      'Atualiza parcialmente os dados de um fornecedor já cadastrado.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador do fornecedor a ser atualizado',
    example: 'a11df2a1-9b7f-4b33-9c91-7a3a72b1329e',
  })
  @ApiResponse({
    status: 200,
    description: 'Fornecedor atualizado com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fornecedor não encontrado.',
  })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('suppliers', 'delete')
  @ApiOperation({
    summary: 'Exclusão de fornecedor',
    description:
      'Remove um fornecedor do cadastro. Esta operação é irreversível.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador do fornecedor a ser removido',
  })
  @ApiResponse({
    status: 204,
    description: 'Fornecedor removido com sucesso.',
  })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.suppliersService.delete(id);
  }
}
