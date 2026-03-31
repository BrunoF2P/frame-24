import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

interface GroupedPermissionItem {
  id: string;
  permission: string;
  resource: string;
  action: string;
  name: string;
  description: string | null;
}

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller({ path: 'permissions', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class PermissionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private getCompanyId(): string {
    const companyId = this.cls.get<string>('companyId');
    if (!companyId) {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    }
    return companyId;
  }

  @Get()
  @RequirePermission('permissions', 'read')
  @ApiOperation({
    summary: 'Listar todas as permissões',
    description:
      'Retorna todas as permissões disponíveis no sistema, agrupadas por recurso. Use essas permissões ao criar roles.',
  })
  async listPermissions(): Promise<Record<string, GroupedPermissionItem[]>> {
    const companyId = this.getCompanyId();
    const permissions = await this.prisma.permissions.findMany({
      where: {
        company_id: companyId,
        active: true,
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    return permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.resource]) {
          acc[perm.resource] = [];
        }
        acc[perm.resource].push({
          id: perm.id,
          permission: perm.code,
          resource: perm.resource,
          action: perm.action,
          name: perm.name,
          description: perm.description,
        });
        return acc;
      },
      {} as Record<string, GroupedPermissionItem[]>,
    );
  }
}
