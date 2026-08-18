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
import { MovieCategoriesService } from '../services/movie-categories.service';
import { CreateMovieCategoryDto } from '../dto/create-movie-category.dto';
import { UpdateMovieCategoryDto } from '../dto/update-movie-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

@ApiTags('Movie Categories')
@EmployeeReadThrottle()
@Controller({ path: 'movie-categories', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class MovieCategoriesController {
  constructor(private readonly service: MovieCategoriesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('movie_categories', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar categoria de filme',
    description:
      'Cria uma nova categoria de filme com slug único gerado automaticamente.',
  })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async create(@Body() dto: CreateMovieCategoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('movie_categories', 'read')
  @ApiOperation({ summary: 'Listar categorias de filmes' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('movie_categories', 'read')
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada.' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada.' })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('movie_categories', 'update')
  @ApiOperation({
    summary: 'Atualizar categoria',
    description:
      'Se o nome for alterado, o slug é recalculado automaticamente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoria atualizada com sucesso.',
  })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada.' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateMovieCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('movie_categories', 'delete')
  @ApiOperation({ summary: 'Excluir categoria' })
  @ApiResponse({ status: 200, description: 'Categoria excluída com sucesso.' })
  @ApiNotFoundResponse({ description: 'Categoria não encontrada.' })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.delete(id);
  }
}
