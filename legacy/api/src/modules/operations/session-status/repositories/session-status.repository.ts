import { Injectable } from '@nestjs/common';
import { Prisma, session_status as SessionStatus } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import type { SessionStatusResponse } from '../../shared/dto/session-status-response.dto';

@Injectable()
export class SessionStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByNameAndCompany(
    name: string,
    companyId: string,
  ): Promise<SessionStatus | null> {
    return this.prisma.session_status.findUnique({
      where: {
        company_id_name: {
          company_id: companyId,
          name,
        },
      },
    });
  }

  async findAllByCompany(companyId: string): Promise<SessionStatusResponse[]> {
    return this.prisma.session_status.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        name: true,
        description: true,
        allows_modification: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<SessionStatus | null> {
    return this.prisma.session_status.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.session_statusCreateInput): Promise<SessionStatus> {
    return this.prisma.session_status.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.session_statusUpdateInput,
  ): Promise<SessionStatus> {
    return this.prisma.session_status.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<SessionStatus> {
    return this.prisma.session_status.delete({
      where: { id },
    });
  }
}
