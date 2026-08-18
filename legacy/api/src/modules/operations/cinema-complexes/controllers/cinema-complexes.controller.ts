import {
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import { CreateCinemaComplexDto } from '../dto/create-cinema-complex.dto';
import { UpdateCinemaComplexDto } from '../dto/update-cinema-complex.dto';
import { CinemaComplexesService } from '../service/cinema-complexes.service';

@ApiTags('Cinema Complexes')
@EmployeeReadThrottle()
@SecuredController({ path: 'cinema-complexes', version: '1' })
export class CinemaComplexesController {
  constructor(private readonly service: CinemaComplexesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('cinema_complexes', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar um novo complexo de cinema',
    description:
      'Cria um novo complexo de cinema associado à empresa do usuário autenticado.',
  })
  @ApiResponse({ status: 201, description: 'Complexo criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Dados de entrada inválidos.' })
  @ApiConflictResponse({
    description: 'Um complexo com o mesmo código já existe.',
  })
  async create(@Body() dto: CreateCinemaComplexDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('cinema_complexes', 'read')
  @ApiOperation({ summary: 'Listar todos os complexos de cinema da empresa' })
  @ApiOkResponse({
    description: 'Lista de complexos retornada com sucesso.',
  })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('cinema_complexes', 'read')
  @ApiOperation({ summary: 'Buscar um complexo de cinema por ID' })
  @ApiResponse({ status: 200, description: 'Complexo encontrado.' })
  @ApiNotFoundResponse({ description: 'Complexo não encontrado.' })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('cinema_complexes', 'update')
  @ApiOperation({ summary: 'Atualizar um complexo de cinema' })
  @ApiResponse({ status: 200, description: 'Complexo atualizado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Complexo não encontrado.' })
  @ApiConflictResponse({ description: 'O código fornecido já está em uso.' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateCinemaComplexDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('cinema_complexes', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir um complexo de cinema' })
  @ApiResponse({ status: 200, description: 'Complexo excluído com sucesso.' })
  @ApiNotFoundResponse({ description: 'Complexo não encontrado.' })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.delete(id);
  }
}
