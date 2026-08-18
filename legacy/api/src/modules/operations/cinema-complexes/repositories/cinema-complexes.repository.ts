import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { CreateCinemaComplexDto } from '../dto/create-cinema-complex.dto';
import { UpdateCinemaComplexDto } from '../dto/update-cinema-complex.dto';
import { cinema_complexes } from '@repo/db';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class CinemaComplexesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async create(
    createCinemaComplexDto: CreateCinemaComplexDto & { company_id: string },
  ): Promise<cinema_complexes> {
    return this.prisma.cinema_complexes.create({
      data: {
        id: this.snowflake.generate(),
        created_at: new Date(),
        updated_at: new Date(),
        ...createCinemaComplexDto,
      },
    });
  }

  async findAll(): Promise<cinema_complexes[]> {
    return this.prisma.cinema_complexes.findMany();
  }

  async findById(id: string): Promise<cinema_complexes | null> {
    return this.prisma.cinema_complexes.findUnique({
      where: { id },
    });
  }

  async findByCode(
    code: string,
    company_id: string,
  ): Promise<cinema_complexes | null> {
    return this.prisma.cinema_complexes.findFirst({
      where: { code, company_id },
    });
  }

  async findAllByCompany(company_id: string): Promise<cinema_complexes[]> {
    return this.prisma.cinema_complexes.findMany({
      where: { company_id },
    });
  }

  async update(
    id: string,
    updateCinemaComplexDto: UpdateCinemaComplexDto,
  ): Promise<cinema_complexes> {
    return this.prisma.cinema_complexes.update({
      where: { id },
      data: {
        updated_at: new Date(),
        ...updateCinemaComplexDto,
      },
    });
  }

  async remove(id: string): Promise<cinema_complexes> {
    return this.prisma.cinema_complexes.delete({
      where: { id },
    });
  }
}
