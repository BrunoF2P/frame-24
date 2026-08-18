import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@repo/db';

@Injectable()
export class AuditLogRepository {
  constructor(private prisma: PrismaService) {}

  async findByCompany(
    companyId: string,
    filters?: {
      eventType?: string;
      resourceType?: string;
      resourceId?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      skip?: number;
      take?: number;
      sortBy?:
        | 'company_id'
        | 'event_type'
        | 'resource_type'
        | 'action'
        | 'created_at';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const where: Prisma.audit_logsWhereInput = {
      company_id: companyId,
    };

    if (filters?.eventType) {
      where.event_type = filters.eventType;
    }
    if (filters?.resourceType) {
      where.resource_type = filters.resourceType;
    }
    if (filters?.resourceId) {
      where.resource_id = filters.resourceId;
    }
    if (filters?.userId) {
      where.user_id = filters.userId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.created_at = {};
      if (filters?.startDate) {
        where.created_at.gte = filters.startDate;
      }
      if (filters?.endDate) {
        where.created_at.lte = filters.endDate;
      }
    }

    // Map sortBy field to actual database field
    let orderByField: keyof Prisma.audit_logsOrderByWithRelationInput =
      'created_at';
    if (filters?.sortBy && filters.sortBy !== 'created_at') {
      orderByField =
        filters.sortBy as keyof Prisma.audit_logsOrderByWithRelationInput;
    }

    const orderBy: Prisma.audit_logsOrderByWithRelationInput = {
      [orderByField]: filters?.sortOrder || 'desc',
    };

    const results = await this.prisma.audit_logs.findMany({
      where,
      orderBy,
      skip: filters?.skip || 0,
      take: filters?.take || 20,
    });

    // Transform to match the expected return format
    return results.map((log) => ({
      id: log.id,
      event_type: log.event_type,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      action: log.action,
      company_id: log.company_id,
      user_id: log.user_id,
      correlation_id: log.correlation_id,
      old_values: log.old_values,
      new_values: log.new_values,
      '@timestamp': log.created_at.toISOString(),
    }));
  }

  async findByResourceId(
    companyId: string,
    resourceId: string,
    filters?: {
      skip?: number;
      take?: number;
    },
  ) {
    const results = await this.prisma.audit_logs.findMany({
      where: {
        company_id: companyId,
        resource_id: resourceId,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip: filters?.skip || 0,
      take: filters?.take || 20,
    });

    // Transform to match the expected return format
    return results.map((log) => ({
      id: log.id,
      event_type: log.event_type,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      action: log.action,
      company_id: log.company_id,
      user_id: log.user_id,
      correlation_id: log.correlation_id,
      old_values: log.old_values,
      new_values: log.new_values,
      '@timestamp': log.created_at.toISOString(),
    }));
  }

  async findByResourceType(
    companyId: string,
    resourceType: string,
    filters?: {
      skip?: number;
      take?: number;
    },
  ) {
    const results = await this.prisma.audit_logs.findMany({
      where: {
        company_id: companyId,
        resource_type: resourceType,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip: filters?.skip || 0,
      take: filters?.take || 20,
    });

    // Transform to match the expected return format
    return results.map((log) => ({
      id: log.id,
      event_type: log.event_type,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      action: log.action,
      company_id: log.company_id,
      user_id: log.user_id,
      correlation_id: log.correlation_id,
      old_values: log.old_values,
      new_values: log.new_values,
      '@timestamp': log.created_at.toISOString(),
    }));
  }
}
