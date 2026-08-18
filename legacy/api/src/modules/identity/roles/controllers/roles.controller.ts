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

import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleResponseDto } from '../dto/role-response.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'roles', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('roles', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar role customizada',
    description:
      'Cria uma nova role para a empresa com permissões específicas. Use GET /admin/permissions para listar permissões disponíveis.',
  })
  async createRole(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return await this.rolesService.create(dto);
  }

  @Get()
  @RequirePermission('roles', 'read')
  @ApiOperation({
    summary: 'Listar todas as roles',
    description:
      'Retorna todas as roles (customizadas e do sistema) da empresa, ordenadas por nível hierárquico.',
  })
  async listRoles(): Promise<RoleResponseDto[]> {
    return await this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('roles', 'read')
  @ApiOperation({
    summary: 'Buscar role por ID',
    description:
      'Retorna os detalhes de uma role específica, incluindo suas permissões.',
  })
  async getRole(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<RoleResponseDto> {
    return await this.rolesService.findOne(id);
  }

  @Put(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('roles', 'update')
  @ApiOperation({
    summary: 'Atualizar role',
    description:
      'Atualiza uma role customizada. Roles do sistema não podem ser editadas. Ao atualizar permissões, a lista completa substitui as anteriores.',
  })
  async updateRole(
    @Param('id', ParseEntityIdPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return await this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @EmployeeWriteThrottle()
  @RequirePermission('roles', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar role',
    description:
      'Deleta uma role customizada permanentemente. Roles do sistema ou que estão sendo usadas por usuários não podem ser deletadas.',
  })
  async deleteRole(@Param('id', ParseEntityIdPipe) id: string): Promise<void> {
    return await this.rolesService.delete(id);
  }
}
