import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';
import {
  AuditLogResponseDto,
  AuditLogsListResponseDto,
} from '../dto/audit-log-response.dto';
import type { RequestUser } from 'src/modules/identity/auth/types/auth-user.types';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiForbiddenResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Audit Logs')
@Controller({ path: 'audit-logs', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @Get()
  @RequirePermission('audit', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar logs de auditoria',
    description:
      'Lista logs com filtros avançados. Usuário só vê o que tem permissão para acessar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoria retornada com sucesso',
    type: AuditLogsListResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissão para acessar esse recurso',
  })
  async getAuditLogs(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe()) query: AuditLogQueryDto,
  ) {
    return this.service.getAuditLogs(user.company_id, user.role_id, query);
  }

  @Get('resource/:resourceType/:resourceId')
  @RequirePermission('audit', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Histórico completo de um recurso',
    description:
      'Retorna todas as alterações (criação, atualizações, deleção) de um recurso específico',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Tipo do recurso (ex: movie_category)',
    example: 'movie_category',
  })
  @ApiParam({
    name: 'resourceId',
    description: 'ID do recurso específico',
    example: '244746749711749120',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico do recurso retornado com sucesso',
    type: [AuditLogResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Sem permissão para acessar histórico deste recurso',
  })
  async getResourceHistory(
    @CurrentUser() user: RequestUser,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.service.getResourceHistory(
      user.company_id,
      user.role_id,
      resourceType,
      resourceId,
    );
  }

  @Get('by-resource/:resourceType')
  @RequirePermission('audit', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Histórico de um tipo de recurso',
    description:
      'Retorna todas as alterações de todos os recursos de um tipo específico',
  })
  @ApiParam({
    name: 'resourceType',
    description: 'Tipo do recurso (ex: movie_category)',
    example: 'movie_category',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico do tipo de recurso retornado com sucesso',
    type: [AuditLogResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Sem permissão para acessar histórico deste tipo de recurso',
  })
  async getResourceTypeHistory(
    @CurrentUser() user: RequestUser,
    @Param('resourceType') resourceType: string,
    @Query(new ZodValidationPipe())
    query: AuditLogQueryDto,
  ) {
    return this.service.getResourceTypeHistory(
      user.company_id,
      user.role_id,
      resourceType,
      query.skip,
      query.take,
    );
  }
}
