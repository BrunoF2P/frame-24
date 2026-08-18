import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CompanyUser } from '../domain/entities/company-user.entity';
import { CompanyUserMapper } from '../infraestructure/mappers/company-user.mapper';

export type CompanyUserWithRelations = Prisma.company_usersGetPayload<{
  include: {
    identities: {
      include: {
        persons: true;
      };
    };
    custom_roles: true;
  };
}>;

@Injectable()
export class CompanyUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(id: string): Promise<CompanyUser | null> {
    const raw = await this.prisma.company_users.findUnique({
      where: { id },
    });
    return raw ? CompanyUserMapper.toDomain(raw) : null;
  }

  async findByIdentityAndCompany(
    identityId: string,
    companyId?: string,
  ): Promise<CompanyUser | null> {
    const raw = await this.prisma.company_users.findFirst({
      where: {
        identity_id: identityId,
        ...(companyId && { company_id: companyId }),
        active: true,
      },
    });
    return raw ? CompanyUserMapper.toDomain(raw) : null;
  }

  async findAllByIdentity(identityId: string): Promise<CompanyUser[]> {
    const rawList = await this.prisma.company_users.findMany({
      where: {
        identity_id: identityId,
        active: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return rawList.map((raw) => CompanyUserMapper.toDomain(raw));
  }

  async findByEmployeeIdAndCompany(
    employeeId: string,
    companyId: string,
  ): Promise<CompanyUser | null> {
    const raw = await this.prisma.company_users.findFirst({
      where: {
        employee_id: employeeId,
        company_id: companyId,
        identities: {
          identity_type: 'EMPLOYEE',
        },
      },
    });
    return raw ? CompanyUserMapper.toDomain(raw) : null;
  }

  async findAllByCompany(companyId: string): Promise<CompanyUser[]> {
    const rawList = await this.prisma.company_users.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
    return rawList.map((raw) => CompanyUserMapper.toDomain(raw));
  }

  async create(
    identityId: string,
    companyId: string,
    roleId: string,
    employeeId: string,
  ): Promise<CompanyUser> {
    const raw = await this.prisma.company_users.create({
      data: {
        id: this.snowflake.generate(),
        identity_id: identityId,
        company_id: companyId,
        role_id: roleId,
        employee_id: employeeId,
        active: true,
        start_date: new Date(),
      },
    });
    return CompanyUserMapper.toDomain(raw);
  }

  async createUser(data: {
    identityId: string;
    companyId: string;
    roleId: string;
    employeeId: string;
    department?: string;
    jobLevel?: string;
    location?: string;
    allowedComplexes?: string[];
    ipWhitelist?: string[];
    active: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<CompanyUser> {
    const raw = await this.prisma.company_users.create({
      data: {
        id: this.snowflake.generate(),
        identity_id: data.identityId,
        company_id: data.companyId,
        role_id: data.roleId,
        employee_id: data.employeeId,
        department: data.department,
        job_level: data.jobLevel,
        location: data.location,
        allowed_complexes: data.allowedComplexes
          ? JSON.stringify(data.allowedComplexes)
          : undefined,
        ip_whitelist: data.ipWhitelist
          ? JSON.stringify(data.ipWhitelist)
          : undefined,
        active: data.active,
        start_date: data.startDate ? new Date(data.startDate) : new Date(),
        end_date: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    return CompanyUserMapper.toDomain(raw);
  }

  async updateUserData(
    id: string,
    data: {
      roleId?: string;
      department?: string;
      jobLevel?: string;
      location?: string;
      allowedComplexes?: string[];
      ipWhitelist?: string[];
      active?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<CompanyUser> {
    const raw = await this.prisma.company_users.update({
      where: { id },
      data: {
        ...(data.roleId && { custom_roles: { connect: { id: data.roleId } } }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.jobLevel !== undefined && { job_level: data.jobLevel }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.allowedComplexes && {
          allowed_complexes: JSON.stringify(data.allowedComplexes),
        }),
        ...(data.ipWhitelist && {
          ip_whitelist: JSON.stringify(data.ipWhitelist),
        }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.startDate && { start_date: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          end_date: data.endDate ? new Date(data.endDate) : null,
        }),
      },
    });
    return CompanyUserMapper.toDomain(raw);
  }

  async updateAccessTracking(
    id: string,
    data: {
      lastAccess: Date;
      accessCount: number;
    },
  ): Promise<CompanyUser> {
    const raw = await this.prisma.company_users.update({
      where: { id },
      data: {
        last_access: data.lastAccess,
        access_count: data.accessCount,
      },
    });
    return CompanyUserMapper.toDomain(raw);
  }

  async softDelete(id: string): Promise<CompanyUser> {
    const raw = await this.prisma.company_users.update({
      where: { id },
      data: {
        active: false,
        end_date: new Date(),
      },
    });
    return CompanyUserMapper.toDomain(raw);
  }

  async delete(id: string): Promise<CompanyUser> {
    const raw = await this.prisma.company_users.delete({
      where: { id },
    });
    return CompanyUserMapper.toDomain(raw);
  }

  async findByIdWithRelations(
    id: string,
  ): Promise<CompanyUserWithRelations | null> {
    return this.prisma.company_users.findUnique({
      where: { id },
      include: {
        custom_roles: true,
        identities: {
          include: {
            persons: true,
          },
        },
      },
    });
  }

  async findByEmployeeIdAndCompanyWithRelations(
    employeeId: string,
    companyId: string,
  ): Promise<CompanyUserWithRelations | null> {
    return this.prisma.company_users.findFirst({
      where: {
        employee_id: employeeId,
        company_id: companyId,
        identities: {
          identity_type: 'EMPLOYEE',
        },
      },
      include: {
        custom_roles: true,
        identities: {
          include: {
            persons: true,
          },
        },
      },
    });
  }

  async findAllByCompanyWithRelations(
    companyId: string,
  ): Promise<CompanyUserWithRelations[]> {
    return this.prisma.company_users.findMany({
      where: { company_id: companyId },
      include: {
        custom_roles: true,
        identities: {
          include: {
            persons: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
