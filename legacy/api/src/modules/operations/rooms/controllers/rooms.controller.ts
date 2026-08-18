import {
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UploadedFile,
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
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { FileUpload } from 'src/common/decorators/file-upload.decorator';
import { SecuredController } from 'src/common/decorators/secured-controller.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import { RoomsService } from '../services/rooms.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';

@ApiTags('Operations', 'Rooms')
@ApiParam({
  name: 'cinemaComplexId',
  required: true,
  description: 'ID do complexo de cinema',
})
@EmployeeReadThrottle()
@SecuredController({
  path: 'cinema-complexes/:cinemaComplexId/rooms',
  version: '1',
})
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @EmployeeWriteThrottle()
  @FileUpload('layout_image', false)
  @RequirePermission('rooms', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar uma nova sala em um complexo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dados da sala e layout de assentos',
    type: CreateRoomDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Sala e assentos criados com sucesso.',
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou inconsistentes.' })
  @ApiNotFoundResponse({ description: 'Complexo de cinema não encontrado.' })
  @ApiConflictResponse({
    description: 'Número de sala já em uso neste complexo.',
  })
  async create(
    @Param('cinemaComplexId') cinemaComplexId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateRoomDto,
  ) {
    return this.service.create(cinemaComplexId, dto, file);
  }

  @Get()
  @RequirePermission('rooms', 'read')
  @ApiOperation({ summary: 'Listar todas as salas de um complexo' })
  @ApiOkResponse({ description: 'Lista de salas retornada.' })
  @ApiNotFoundResponse({ description: 'Complexo de cinema não encontrado.' })
  async findAll(@Param('cinemaComplexId') cinemaComplexId: string) {
    return this.service.findAll(cinemaComplexId);
  }

  @Get(':id')
  @RequirePermission('rooms', 'read')
  @ApiOperation({ summary: 'Buscar uma sala específica por ID' })
  @ApiResponse({ status: 200, description: 'Sala encontrada.' })
  @ApiNotFoundResponse({ description: 'Sala não encontrada.' })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @FileUpload('layout_image', false)
  @RequirePermission('rooms', 'update')
  @ApiOperation({ summary: 'Atualizar uma sala' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dados para atualização da sala',
    type: UpdateRoomDto,
  })
  @ApiResponse({ status: 200, description: 'Sala atualizada com sucesso.' })
  @ApiNotFoundResponse({ description: 'Sala não encontrada.' })
  async update(
    @Param('id', ParseEntityIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.update(id, dto, file);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('rooms', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir uma sala' })
  @ApiResponse({ status: 200, description: 'Sala excluída com sucesso.' })
  @ApiNotFoundResponse({ description: 'Sala não encontrada.' })
  async delete(@Param('id', ParseEntityIdPipe) id: string) {
    return this.service.delete(id);
  }
}
