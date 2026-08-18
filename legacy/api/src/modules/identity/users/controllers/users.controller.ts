import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';

import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('User Management')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class UserManagementController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('users', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar novo usuário',
    description:
      'Administrador cria um novo usuário na empresa. O sistema gera um ID de funcionário automaticamente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Role inválida, CPF duplicado ou dados inválidos',
  })
  @ApiConflictResponse({
    description: 'Email ou CPF já cadastrado nesta empresa',
  })
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return await this.usersService.create(dto);
  }

  @Get()
  @RequirePermission('users', 'read')
  @ApiOperation({
    summary: 'Listar usuários',
    description: 'Lista todos os usuários da empresa do usuário autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso',
    type: [UserResponseDto],
  })
  async listUsers(): Promise<UserResponseDto[]> {
    return await this.usersService.findAll();
  }

  @Get(':employee_id')
  @RequirePermission('users', 'read')
  @ApiOperation({
    summary: 'Buscar usuário por employee_id',
    description:
      'Retorna os detalhes de um usuário específico pelo seu employee_id.',
  })
  async getUser(
    @Param('employee_id') employee_id: string,
  ): Promise<UserResponseDto> {
    return await this.usersService.findOne(employee_id);
  }

  @Put(':employee_id')
  @EmployeeWriteThrottle()
  @RequirePermission('users', 'update')
  @ApiOperation({
    summary: 'Atualizar usuário',
    description:
      'Atualiza os dados de um usuário existente. Use o employee_id (ex: CE-0001) para identificar o usuário.',
  })
  async updateUser(
    @Param('employee_id') employee_id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.update(employee_id, dto);
  }

  @Delete(':employee_id')
  @EmployeeWriteThrottle()
  @RequirePermission('users', 'delete')
  @ApiOperation({
    summary: 'Deletar usuário',
    description:
      'Desativa um usuário (soft delete). O usuário permanece no banco mas fica inativo e não pode mais fazer login.',
  })
  async deleteUser(@Param('employee_id') employee_id: string): Promise<void> {
    return await this.usersService.softDelete(employee_id);
  }
}
