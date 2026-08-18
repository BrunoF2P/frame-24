import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { Prisma, pos_sessions } from '@repo/db';

@Injectable()
export class PosSessionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(id: string, company_id: string): Promise<pos_sessions | null> {
    return this.prisma.pos_sessions.findFirst({
      where: { id, company_id },
    });
  }

  async findByIdWithStatus(id: string, company_id: string) {
    return this.prisma.pos_sessions.findFirst({
      where: { id, company_id },
      include: {
        pos_session_status: { select: { name: true } },
      },
    });
  }

  async findBySessionNumber(
    company_id: string,
    session_number: string,
  ): Promise<pos_sessions | null> {
    return this.prisma.pos_sessions.findFirst({
      where: { company_id, session_number },
    });
  }

  async findOpenSessionByComplex(
    cinema_complex_id: string,
    company_id: string,
  ): Promise<pos_sessions | null> {
    return this.prisma.pos_sessions.findFirst({
      where: {
        company_id,
        cinema_complex_id,
        pos_session_status: { name: { in: ['Aberta', 'Suspensa'] } },
      },
      orderBy: { opened_at: 'desc' },
    });
  }

  async findAll(
    company_id: string,
    filters?: { status?: string; cinema_complex_id?: string },
  ) {
    return this.prisma.pos_sessions.findMany({
      where: {
        company_id,
        ...(filters?.status && {
          pos_session_status: { name: filters.status },
        }),
        ...(filters?.cinema_complex_id && {
          cinema_complex_id: filters.cinema_complex_id,
        }),
      },
      include: {
        pos_session_status: { select: { name: true } },
      },
      orderBy: { opened_at: 'desc' },
    });
  }

  async create(data: Prisma.pos_sessionsCreateInput): Promise<pos_sessions> {
    return this.prisma.pos_sessions.create({
      data: { id: this.snowflake.generate(), ...data },
    });
  }

  async update(
    id: string,
    data: Prisma.pos_sessionsUpdateInput,
  ): Promise<pos_sessions> {
    return this.prisma.pos_sessions.update({
      where: { id },
      data,
    });
  }

  async countByCompanyAndStatus(
    company_id: string,
    statusName: string,
  ): Promise<number> {
    return this.prisma.pos_sessions.count({
      where: {
        company_id,
        pos_session_status: { name: statusName },
      },
    });
  }
}
