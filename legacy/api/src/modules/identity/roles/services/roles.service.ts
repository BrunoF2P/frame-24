import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { Transactional } from '@nestjs-cls/transactional';
import { Prisma, custom_roles } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { RedisService } from 'src/common/redis/redis.service';
import { CustomRoleRepository } from '../repositories/custom-role.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleResponseDto } from '../dto/role-response.dto';
import { LoggerService } from 'src/common/services/logger.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleRepo: CustomRoleRepository,
    private readonly logger: LoggerService,
    private readonly snowflake: SnowflakeService,
    private readonly tenantContext: TenantContextService,
    private readonly redis: RedisService,
  ) {}

  private getIdentityId(): string | undefined {
    return this.tenantContext.getIdentityId();
  }

  private getRoleHierarchy(): number | undefined {
    return this.tenantContext.getRoleHierarchy();
  }

  @Transactional()
  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const granted_by = this.getIdentityId();
    const currentUserHierarchy = this.getRoleHierarchy();
    const company_id = companyId;
    const existing = await this.roleRepo.findByName(company_id, dto.name);
    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    const hierarchyLevel = dto.hierarchy_level ?? 50;

    if (hierarchyLevel < 0 || hierarchyLevel > 99) {
      throw new BadRequestException('Hierarchy level deve estar entre 0 e 99');
    }

    if (hierarchyLevel <= 1) {
      if (!currentUserHierarchy || currentUserHierarchy > 0) {
        this.logger.warn(
          `SECURITY ALERT: User (hierarchy: ${currentUserHierarchy}) tentou criar role administrativo: ${dto.name} (hierarchy: ${hierarchyLevel})`,
          RolesService.name,
        );
        throw new ForbiddenException(
          'Apenas Super Admins podem criar roles administrativos (hierarchy <= 1)',
        );
      }
    }

    const permissionIds = await this.getPermissionIds(
      dto.permissions,
      company_id,
    );

    const role = await this.roleRepo.create({
      companies: { connect: { id: company_id } },
      name: dto.name,
      description: dto.description,
      is_system_role: false,
      hierarchy_level: hierarchyLevel,
    } as Prisma.custom_rolesCreateInput);

    await this.prisma.role_permissions.createMany({
      data: permissionIds.map((permId) => ({
        id: this.snowflake.generate(),
        role_id: role.id,
        permission_id: permId,
        granted_at: new Date(),
        granted_by: granted_by || null,
      })),
    });

    this.logger.log(
      `Role created: ${role.name} (hierarchy: ${hierarchyLevel}) with ${permissionIds.length} permissions by user (hierarchy: ${currentUserHierarchy})`,
      RolesService.name,
    );

    return this.mapToDto(role, dto.permissions);
  }

  async findAll(): Promise<RoleResponseDto[]> {
    const company_id = this.tenantContext.getCompanyId();
    const roles = await this.roleRepo.findAllByCompany(company_id);

    const result: RoleResponseDto[] = [];
    for (const role of roles) {
      const permissions = await this.roleRepo.getRolePermissions(role.id);
      result.push(this.mapToDto(role, permissions));
    }

    return result;
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const company_id = this.tenantContext.getCompanyId();
    const role = await this.roleRepo.findByIdAndCompany(id, company_id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.roleRepo.getRolePermissions(id);

    return this.mapToDto(role, permissions);
  }

  @Transactional()
  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const company_id = this.tenantContext.getCompanyId();
    const granted_by = this.getIdentityId();
    const currentUserHierarchy = this.getRoleHierarchy();
    const role = await this.roleRepo.findByIdAndCompany(id, company_id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system_role) {
      throw new BadRequestException('Cannot edit system role');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleRepo.findByName(company_id, dto.name);
      if (existing) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    // Security: Validate hierarchy changes
    if (dto.hierarchy_level !== undefined) {
      const newHierarchy = dto.hierarchy_level;
      const oldHierarchy = role.hierarchy_level ?? 50;

      // Validate range
      if (newHierarchy < 0 || newHierarchy > 99) {
        throw new BadRequestException(
          'Hierarchy level deve estar entre 0 e 99',
        );
      }

      // Security: Only Super Admins can set hierarchy <= 1
      if (newHierarchy <= 1) {
        if (!currentUserHierarchy || currentUserHierarchy > 0) {
          this.logger.warn(
            `SECURITY ALERT: User (hierarchy: ${currentUserHierarchy}) tentou alterar role ${role.name} para hierarchy ${newHierarchy}`,
            RolesService.name,
          );
          throw new ForbiddenException(
            'Apenas Super Admins podem definir hierarchy <= 1',
          );
        }
      }

      // Audit log for hierarchy changes
      if (newHierarchy !== oldHierarchy) {
        this.logger.warn(
          `AUDIT: Role ${role.name} hierarchy alterado de ${oldHierarchy} para ${newHierarchy} por user (hierarchy: ${currentUserHierarchy})`,
          RolesService.name,
        );
      }
    }

    const updated = await this.roleRepo.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.hierarchy_level !== undefined && {
        hierarchy_level: dto.hierarchy_level,
      }),
    });

    if (dto.permissions) {
      const permissionIds = await this.getPermissionIds(
        dto.permissions,
        company_id,
      );

      await this.prisma.role_permissions.deleteMany({
        where: { role_id: id },
      });

      await this.prisma.role_permissions.createMany({
        data: permissionIds.map((permId) => ({
          id: this.snowflake.generate(),
          role_id: id,
          permission_id: permId,
          granted_at: new Date(),
          granted_by: granted_by || null,
        })),
      });

      this.logger.log(
        `Role ${updated.name} permissions updated`,
        RolesService.name,
      );

      // Invalidate Redis cache for all users with this role so permissions take effect immediately
      try {
        const companyUsers = await this.prisma.company_users.findMany({
          where: { role_id: id, active: true },
          select: { identity_id: true },
        });

        if (companyUsers.length > 0) {
          const identities = await this.prisma.identities.findMany({
            where: {
              id: { in: companyUsers.map((u) => u.identity_id) },
            },
            select: { email: true },
          });

          const client = this.redis.getClient();
          for (const identity of identities) {
            let cursor = '0';
            do {
              const [nextCursor, keys] = await client.scan(
                cursor,
                'MATCH',
                `auth:user:${identity.email}:*`,
                'COUNT',
                100,
              );
              if (keys.length > 0) {
                await client.del(...keys);
              }
              cursor = nextCursor;
            } while (cursor !== '0');
          }

          this.logger.log(
            `Invalidated Redis cache for ${identities.length} user(s) of role ${updated.name}`,
            RolesService.name,
          );
        }
      } catch (cacheError) {
        this.logger.warn(
          `Failed to invalidate Redis cache for role ${updated.name}: ${cacheError instanceof Error ? cacheError.message : 'Unknown'}`,
          RolesService.name,
        );
      }
    }

    const permissions =
      dto.permissions || (await this.roleRepo.getRolePermissions(id));

    return this.mapToDto(updated, permissions);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const company_id = this.tenantContext.getCompanyId();
    const role = await this.roleRepo.findByIdAndCompany(id, company_id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system_role) {
      throw new BadRequestException('Cannot delete system role');
    }

    const usersCount = await this.prisma.company_users.count({
      where: { role_id: id },
    });

    if (usersCount > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${usersCount} users are using it`,
      );
    }

    await this.roleRepo.delete(id);

    this.logger.log(`Role deleted: ${role.name}`, RolesService.name);
  }

  private async getPermissionIds(
    codes: string[],
    company_id: string,
  ): Promise<string[]> {
    const permissions = await this.prisma.permissions.findMany({
      where: {
        company_id,
        code: { in: codes },
        active: true,
      },
      select: { id: true, code: true },
    });

    const foundCodes = new Set(permissions.map((p) => p.code));
    const missing = codes.filter((c) => !foundCodes.has(c));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${missing.join(', ')}. Use GET /admin/permissions to list available ones.`,
      );
    }

    return permissions.map((p) => p.id);
  }

  private mapToDto(role: custom_roles, permissions: string[]): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      is_system_role: role.is_system_role ?? false,
      hierarchy_level: role.hierarchy_level ?? null,
      permissions,
      created_at: role.created_at?.toISOString() ?? '',
      updated_at: role.updated_at?.toISOString() ?? '',
    };
  }

  async roleHasPermission(
    roleId: string,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'audit',
  ): Promise<boolean> {
    try {
      // ✅ Check if the role is a super admin or admin (hierarchy_level 0-10)
      const role = await this.prisma.custom_roles.findUnique({
        where: { id: roleId },
        select: { hierarchy_level: true },
      });

      // If super admin or admin, grant access to everything
      if (role && role.hierarchy_level !== null && role.hierarchy_level <= 10) {
        return true;
      }

      // ✅ Otherwise, check specific permission
      const hasPermission = await this.prisma.role_permissions.findFirst({
        where: {
          role_id: roleId,
          permissions: {
            code: `${resource}:${action}`,
            active: true,
          },
        },
      });

      return !!hasPermission;
    } catch (error) {
      this.logger.error(
        `Error checking role permission: ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : '',
        'RolesService',
      );
      return false;
    }
  }
  async userHasPermissionSimple(
    companyUserId: string,
    companyId: string,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'audit',
  ): Promise<boolean> {
    try {
      const companyUser = await this.prisma.company_users.findUnique({
        where: { id: companyUserId },
        select: { company_id: true },
      });

      if (!companyUser || companyUser.company_id !== companyId) {
        return false;
      }

      const hasPermission = await this.prisma.role_permissions.findFirst({
        where: {
          custom_roles: {
            company_users: {
              some: { id: companyUserId },
            },
          },
          permissions: {
            code: `${resource}:${action}`,
            active: true,
          },
        },
      });

      return !!hasPermission;
    } catch (error) {
      this.logger.error(
        `Error checking permission: ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : '',
        'RolesService',
      );
      return false;
    }
  }
}
