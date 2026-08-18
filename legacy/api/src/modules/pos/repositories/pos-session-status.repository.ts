import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { pos_session_status } from '@repo/db';

@Injectable()
export class PosSessionStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<pos_session_status | null> {
    return this.prisma.pos_session_status.findFirst({
      where: { id, company_id },
    });
  }

  async findByName(
    company_id: string,
    name: string,
  ): Promise<pos_session_status | null> {
    return this.prisma.pos_session_status.findFirst({
      where: { company_id, name },
    });
  }

  async findAll(company_id: string): Promise<pos_session_status[]> {
    return this.prisma.pos_session_status.findMany({
      where: { company_id },
      orderBy: { name: 'asc' },
    });
  }
}
