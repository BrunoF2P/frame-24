import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { movie_categories, Prisma } from '@repo/db';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { SlugService } from 'src/common/services/slug.service';

@Injectable()
export class MovieCategoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly slugService: SlugService,
  ) {}

  async findAll(companyId: string): Promise<movie_categories[]> {
    return this.prisma.movie_categories.findMany({
      where: { company_id: companyId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<movie_categories | null> {
    return this.prisma.movie_categories.findUnique({
      where: { id },
    });
  }

  async create(
    data: Prisma.movie_categoriesCreateInput,
  ): Promise<movie_categories> {
    return this.prisma.movie_categories.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.movie_categoriesUpdateInput,
  ): Promise<movie_categories> {
    return this.prisma.movie_categories.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.movie_categories.delete({
      where: { id },
    });
  }

  async uniqueSlugForName(
    name: string,
    companyId: string,
    excludeId?: string,
  ): Promise<string> {
    return this.slugService.createUniqueSlug(
      this.prisma.movie_categories,
      name,
      excludeId,
      'slug',
      { company_id: companyId },
    );
  }
}
