import { Injectable } from '@nestjs/common';
import { Prisma, session_languages as SessionLanguage } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import type { SessionLanguageResponse } from '../../shared/dto/session-language-response.dto';

@Injectable()
export class SessionLanguagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByNameAndCompany(
    name: string,
    companyId: string,
  ): Promise<SessionLanguage | null> {
    return this.prisma.session_languages.findUnique({
      where: {
        company_id_name: {
          company_id: companyId,
          name,
        },
      },
    });
  }

  async findAllByCompany(
    companyId: string,
  ): Promise<SessionLanguageResponse[]> {
    return this.prisma.session_languages.findMany({
      where: { company_id: companyId },
      select: {
        id: true,
        name: true,
        description: true,
        abbreviation: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<SessionLanguage | null> {
    return this.prisma.session_languages.findUnique({
      where: { id },
    });
  }

  async create(
    data: Prisma.session_languagesCreateInput,
  ): Promise<SessionLanguage> {
    return this.prisma.session_languages.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.session_languagesUpdateInput,
  ): Promise<SessionLanguage> {
    return this.prisma.session_languages.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<SessionLanguage> {
    return this.prisma.session_languages.delete({
      where: { id },
    });
  }
}
