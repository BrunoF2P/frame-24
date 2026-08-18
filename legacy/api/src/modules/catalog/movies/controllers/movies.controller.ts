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
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import { MoviesService } from '../services/movies.service';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Movies')
@EmployeeReadThrottle()
@Controller({ path: 'movies', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class MoviesController {
  constructor(private readonly service: MoviesService) {}

  @Get('cast-types')
  @RequirePermission('movies', 'read')
  @ApiOperation({ summary: 'Listar tipos de elenco' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de elenco.' })
  async getCastTypes() {
    return this.service.getCastTypes();
  }

  @Get('media-types')
  @RequirePermission('movies', 'read')
  @ApiOperation({ summary: 'Listar tipos de mídia' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de mídia.' })
  async getMediaTypes() {
    return this.service.getMediaTypes();
  }

  @Get('age-ratings')
  @RequirePermission('movies', 'read')
  @ApiOperation({ summary: 'Listar classificações indicativas' })
  @ApiResponse({ status: 200, description: 'Lista de classificações.' })
  async getAgeRatings() {
    return this.service.getAgeRatings();
  }

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('movies', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar filme',
    description:
      'Cria um filme para a empresa do usuário. O slug único é gerado automaticamente a partir do título e categorias podem ser informadas por IDs.',
  })
  @ApiResponse({
    status: 201,
    description: 'Filme criado com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos ou distribuidor inativo/de outra empresa.',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT ausente ou inválido.',
  })
  async create(@Body() dto: CreateMovieDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('movies', 'read')
  @ApiOperation({
    summary: 'Listar filmes',
    description: 'Lista filmes ativos da empresa do usuário.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista retornada com sucesso.',
  })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('movies', 'read')
  @ApiOperation({
    summary: 'Buscar filme por ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Filme encontrado.',
  })
  @ApiNotFoundResponse({
    description: 'Filme não encontrado.',
  })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('movies', 'update')
  @ApiOperation({
    summary: 'Atualizar filme',
    description:
      'Atualiza dados do filme. Se o título for alterado, o slug é recalculado automaticamente para um valor único.',
  })
  @ApiResponse({
    status: 200,
    description: 'Filme atualizado com sucesso.',
  })
  @ApiBadRequestResponse({
    description: 'Distribuidor inválido/inativo ou payload inválido.',
  })
  @ApiNotFoundResponse({
    description: 'Filme não encontrado.',
  })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateMovieDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('movies', 'delete')
  @ApiOperation({
    summary: 'Excluir filme',
  })
  @ApiResponse({
    status: 200,
    description: 'Filme excluído com sucesso.',
  })
  @ApiNotFoundResponse({
    description: 'Filme não encontrado.',
  })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.delete(id);
  }
}
