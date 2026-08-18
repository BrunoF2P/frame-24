import { Injectable, ForbiddenException } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLogQueryType } from '../dto/audit-log-query.dto';
import { RolesService } from 'src/modules/identity/roles/services/roles.service';

@Injectable()
export class AuditLogService {
  constructor(
    private repository: AuditLogRepository,
    private rolesService: RolesService,
  ) {}

  async getAuditLogs(
    companyId: string,
    roleId: string,
    query: AuditLogQueryType,
  ) {
    const hasAccess = await this.rolesService.roleHasPermission(
      roleId,
      'audit',
      'read',
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar auditoria',
      );
    }

    const result = await this.repository.findByCompany(companyId, {
      eventType: query.eventType,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      userId: query.userId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      skip: (query.skip || 0) * (query.take || 20),
      take: query.take || 20,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const total = result.length;
    const pageSize = query.take || 20;
    const totalPages = Math.ceil(total / pageSize);
    const page = (query.skip || 0) + 1;

    return {
      logs: result,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async getResourceHistory(
    companyId: string,
    roleId: string,
    resourceType: string,
    resourceId: string,
  ) {
    const hasAccess = await this.rolesService.roleHasPermission(
      roleId,
      'audit',
      'read',
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar auditoria',
      );
    }

    return this.repository.findByResourceId(companyId, resourceId);
  }

  async getResourceTypeHistory(
    companyId: string,
    roleId: string,
    resourceType: string,
    skip?: number,
    take?: number,
  ) {
    const hasAccess = await this.rolesService.roleHasPermission(
      roleId,
      'audit',
      'read',
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar auditoria',
      );
    }

    return this.repository.findByResourceType(companyId, resourceType, {
      skip,
      take,
    });
  }

  private normalizeResource(resource: string): string {
    if (resource.endsWith('y') && !resource.endsWith('ies')) {
      return resource + 'ies';
    }
    return resource + 's';
  }
}
