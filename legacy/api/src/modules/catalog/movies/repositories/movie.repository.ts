import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { movies, Prisma } from '@repo/db';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { SlugService } from 'src/common/services/slug.service';

@Injectable()
export class MovieRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly slugService: SlugService,
  ) {}

  async findById(id: string): Promise<movies | null> {
    return this.prisma.movies.findUnique({
      where: { id },
      include: {
        age_rating: true,
        category_links: { include: { category: true } },
        movie_media: true,
        movie_cast: true,
      },
    });
  }

  async findByIds(ids: string[]): Promise<movies[]> {
    return this.prisma.movies.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        age_rating: true,
        category_links: { include: { category: true } },
        movie_media: {
          where: {
            active: true,
            media_types: {
              name: 'Poster',
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        movie_cast: {
          include: {
            cast_types: true,
          },
          orderBy: { credit_order: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByCompany(company_id: string): Promise<movies[]> {
    return this.prisma.movies.findMany({
      where: { company_id, active: true },
      include: {
        age_rating: true,
        category_links: { include: { category: true } },
        movie_media: {
          where: {
            active: true,
            media_types: {
              name: 'Poster',
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: Prisma.moviesCreateInput): Promise<movies> {
    return this.prisma.movies.create({
      data: { id: this.snowflake.generate(), ...data },
      include: {
        age_rating: true,
        category_links: { include: { category: true } },
        movie_cast: true,
        movie_media: true,
      },
    });
  }

  async findByCompanyLite(company_id: string) {
    const rows = await this.prisma.movies.findMany({
      where: { company_id, active: true },
      select: {
        id: true,
        original_title: true,
        brazil_title: true,
        duration_minutes: true,
        national: true,
        slug: true,
        created_at: true,
        age_rating: { select: { id: true, code: true, name: true } },
        category_links: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((r) => ({
      ...r,
      categories: r.category_links.map((l) => l.category),
      category_links: undefined,
    }));
  }

  async findByIdLite(id: string) {
    const row = await this.prisma.movies.findUnique({
      where: { id },
      select: {
        id: true,
        distributor_id: true,
        company_id: true,
        original_title: true,
        brazil_title: true,
        duration_minutes: true,
        country_of_origin: true,
        production_year: true,
        national: true,
        synopsis: true,
        short_synopsis: true,
        website: true,
        original_language: true,
        worldwide_release_date: true,
        slug: true,
        age_rating: {
          select: { id: true, code: true, name: true, minimum_age: true },
        },
        category_links: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        movie_cast: {
          select: {
            id: true,
            cast_type: true,
            artist_name: true,
            character_name: true,
            credit_order: true,
            photo_url: true,
            active: true,
          },
          orderBy: [{ credit_order: 'asc' }, { artist_name: 'asc' }],
        },
        movie_media: {
          select: {
            id: true,
            media_type: true,
            media_url: true,
            title: true,
            description: true,
            width: true,
            height: true,
            active: true,
            media_types: {
              select: { name: true },
            },
          },
          orderBy: [{ created_at: 'desc' }],
        },
      },
    });

    if (!row) return null;

    return {
      ...row,
      categories: row.category_links.map((l) => l.category),
      category_links: undefined,
    };
  }

  async update(id: string, data: Prisma.moviesUpdateInput): Promise<movies> {
    return this.prisma.movies.update({
      where: { id },
      data,
      include: {
        age_rating: true,
        category_links: { include: { category: true } },
        movie_cast: true,
        movie_media: true,
      },
    });
  }

  async delete(id: string): Promise<movies> {
    return this.prisma.movies.delete({ where: { id } });
  }

  async getCategoryIds(movie_id: string): Promise<string[]> {
    const rows = await this.prisma.movies_on_categories.findMany({
      where: { movie_id },
      select: { category_id: true },
    });
    return rows.map((r) => r.category_id);
  }

  async setCategories(movie_id: string, nextIds: string[]): Promise<void> {
    const currentIds = await this.getCategoryIds(movie_id);
    const currentSet = new Set(currentIds);
    const nextSet = new Set(nextIds);

    const toAdd = [...nextSet].filter((x) => !currentSet.has(x));
    const toRemove = [...currentSet].filter((x) => !nextSet.has(x));

    if (toRemove.length) {
      await this.prisma.movies_on_categories.deleteMany({
        where: { movie_id, category_id: { in: toRemove } },
      });
    }

    if (toAdd.length) {
      await this.prisma.movies_on_categories.createMany({
        data: toAdd.map((cid) => ({ movie_id, category_id: cid })),
        skipDuplicates: true,
      });
    }
  }

  async replaceCast(
    movie_id: string,
    items: Array<{
      cast_type: string;
      artist_name: string;
      character_name?: string;
      credit_order?: number;
      photo_url?: string;
    }>,
  ) {
    await this.prisma.movie_cast.deleteMany({ where: { movie_id } });
    if (items.length) {
      await this.prisma.movie_cast.createMany({
        data: items.map((c) => ({
          id: this.snowflake.generate(),
          movie_id,
          cast_type: c.cast_type,
          artist_name: c.artist_name,
          character_name: c.character_name,
          credit_order: c.credit_order ?? 0,
          photo_url: c.photo_url,
          active: true,
        })),
        skipDuplicates: true,
      });
    }
  }

  async replaceMedia(
    movie_id: string,
    items: Array<{
      media_type: string;
      media_url: string;
      title?: string;
      description?: string;
      width?: number;
      height?: number;
    }>,
  ) {
    await this.prisma.movie_media.deleteMany({ where: { movie_id } });
    if (items.length) {
      await this.prisma.movie_media.createMany({
        data: items.map((m) => ({
          id: this.snowflake.generate(),
          movie_id,
          media_type: m.media_type,
          media_url: m.media_url,
          title: m.title,
          description: m.description,
          width: m.width,
          height: m.height,
          active: true,
        })),
        skipDuplicates: true,
      });
    }
  }

  async uniqueSlugForTitle(
    title: string,
    companyId: string,
    excludeId?: string,
  ): Promise<string> {
    return this.slugService.createUniqueSlug(
      this.prisma.movies,
      title,
      excludeId,
      'slug',
      { company_id: companyId },
    );
  }

  async findCastTypes(company_id: string) {
    return this.prisma.cast_types.findMany({
      where: { company_id },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  async findMediaTypes(company_id: string) {
    return this.prisma.media_types.findMany({
      where: { company_id },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAgeRatings(company_id: string) {
    return this.prisma.age_ratings.findMany({
      where: { company_id },
      select: {
        id: true,
        code: true,
        name: true,
        minimum_age: true,
        description: true,
      },
      orderBy: { minimum_age: 'asc' },
    });
  }
}
