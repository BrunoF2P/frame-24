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

  async findById(id: string): Promise<custom_roles | null> {
    return this.prisma.custom_roles.findUnique({
      where: { id },
    });
  }

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

  async create(data: Prisma.custom_rolesCreateInput): Promise<custom_roles> {
    return this.prisma.custom_roles.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
    });
  }

  async createAdminRole(companyId: string): Promise<custom_roles> {
    return this.prisma.custom_roles.create({
      data: {
        id: this.snowflake.generate(),
        company_id: companyId,
        name: 'Super Admin',
        description: 'Administrador com acesso total',
        is_system_role: true,
        hierarchy_level: 1,
      },
    });
  }

  async findDefaultRole(companyId: string): Promise<custom_roles | null> {
    return this.prisma.custom_roles.findFirst({
      where: {
        company_id: companyId,
        is_system_role: true,
      },
    });
  }
  async update(
    id: string,
    data: Prisma.custom_rolesUpdateInput,
  ): Promise<custom_roles> {
    return this.prisma.custom_roles.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<custom_roles> {
    return this.prisma.custom_roles.delete({
      where: { id },
    });
  }
}
