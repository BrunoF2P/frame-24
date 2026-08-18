import { Injectable } from '@nestjs/common';
import { custom_roles, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class CustomRoleRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findByIdAndCompany(
    id: string,
    company_id: string,
  ): Promise<custom_roles | null> {
    return this.prisma.custom_roles.findFirst({
      where: { id, company_id },
    });
  }

  async findByName(
    company_id: string,
    name: string,
  ): Promise<custom_roles | null> {
    return this.prisma.custom_roles.findFirst({
      where: { company_id, name },
    });
  }

  async findAllByCompany(company_id: string): Promise<custom_roles[]> {
    return this.prisma.custom_roles.findMany({
      where: { company_id },
      orderBy: { hierarchy_level: 'asc' },
    });
  }

  async getRolePermissions(role_id: string): Promise<string[]> {
    const rolePerms = await this.prisma.role_permissions.findMany({
      where: { role_id },
      include: {
        permissions: {
          select: { code: true },
        },
      },
    });

    return rolePerms.map((rp) => rp.permissions.code);
  }

  async create(data: Prisma.custom_rolesCreateInput): Promise<custom_roles> {
    return this.prisma.custom_roles.create({
      data: { id: this.snowflake.generate(), ...data },
    });
  }

  async update(
    id: string,
    data: Prisma.custom_rolesUpdateInput,
  ): Promise<custom_roles> {
    return this.prisma.custom_roles.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.custom_roles.delete({ where: { id } });
  }
}
