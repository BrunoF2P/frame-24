import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ShowtimesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.showtime_scheduleCreateInput) {
    return this.prisma.showtime_schedule.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.showtime_schedule.findUnique({
      where: { id },
      select: {
        id: true,
        start_time: true,
        end_time: true,
        base_ticket_price: true,
        available_seats: true,
        sold_seats: true,
        blocked_seats: true,
        movie_id: true,
        room_id: true,
        rooms: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
        cinema_complexes: {
          select: {
            id: true,
            name: true,
            company_id: true,
          },
        },
        projection_types: true,
        audio_types: true,
        session_languages: true,
        session_status: true,
        movies: {
          select: {
            id: true,
            original_title: true,
            brazil_title: true,
            duration_minutes: true,
            movie_media: {
              where: { media_type: 'POSTER' },
              select: { media_url: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  async findAll(
    where: Prisma.showtime_scheduleWhereInput,
    page = 1,
    limit = 100,
  ) {
    const skip = (page - 1) * limit;
    return this.prisma.showtime_schedule.findMany({
      where,
      orderBy: { start_time: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        start_time: true,
        end_time: true,
        available_seats: true,
        sold_seats: true,
        blocked_seats: true,
        base_ticket_price: true,
        rooms: { select: { id: true, name: true } },
        cinema_complexes: { select: { id: true, name: true } },
        projection_types: true,
        audio_types: true,
        session_languages: true,
        session_status: true,
        movie_id: true,
        movies: {
          select: {
            id: true,
            original_title: true,
            brazil_title: true,
            duration_minutes: true,
            movie_media: {
              where: { media_type: 'POSTER' },
              select: { media_url: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  async update(id: string, data: Prisma.showtime_scheduleUpdateInput) {
    return this.prisma.showtime_schedule.update({
      where: { id },
      data,
    });
  }

  async reserveSeatsCountersAtomically(
    id: string,
    seatsToReserve: number,
  ): Promise<boolean> {
    if (seatsToReserve <= 0) {
      return true;
    }

    const affectedRows = await this.prisma.$executeRaw`
      UPDATE "operations"."showtime_schedule"
      SET
        "sold_seats" = COALESCE("sold_seats", 0) + ${seatsToReserve},
        "available_seats" = COALESCE("available_seats", 0) - ${seatsToReserve}
      WHERE
        "id" = ${id}
        AND COALESCE("available_seats", 0) >= ${seatsToReserve}
    `;

    return Number(affectedRows) === 1;
  }

  async releaseSeatsCountersSafely(
    id: string,
    seatsToRelease: number,
  ): Promise<boolean> {
    if (seatsToRelease <= 0) {
      return true;
    }

    const affectedRows = await this.prisma.$executeRaw`
      UPDATE "operations"."showtime_schedule"
      SET
        "sold_seats" = GREATEST(
          0,
          COALESCE("sold_seats", 0) - LEAST(${seatsToRelease}, COALESCE("sold_seats", 0))
        ),
        "available_seats" = COALESCE("available_seats", 0) + LEAST(${seatsToRelease}, COALESCE("sold_seats", 0))
      WHERE "id" = ${id}
    `;

    return Number(affectedRows) === 1;
  }

  async blockSeatsCountersAtomically(
    id: string,
    seatsToBlock: number,
  ): Promise<boolean> {
    if (seatsToBlock <= 0) {
      return true;
    }

    const affectedRows = await this.prisma.$executeRaw`
      UPDATE "operations"."showtime_schedule"
      SET
        "blocked_seats" = COALESCE("blocked_seats", 0) + ${seatsToBlock},
        "available_seats" = COALESCE("available_seats", 0) - ${seatsToBlock}
      WHERE
        "id" = ${id}
        AND COALESCE("available_seats", 0) >= ${seatsToBlock}
    `;

    return Number(affectedRows) === 1;
  }

  async unblockSeatsCountersSafely(
    id: string,
    seatsToUnblock: number,
  ): Promise<boolean> {
    if (seatsToUnblock <= 0) {
      return true;
    }

    const affectedRows = await this.prisma.$executeRaw`
      UPDATE "operations"."showtime_schedule"
      SET
        "blocked_seats" = GREATEST(
          0,
          COALESCE("blocked_seats", 0) - LEAST(${seatsToUnblock}, COALESCE("blocked_seats", 0))
        ),
        "available_seats" = COALESCE("available_seats", 0) + LEAST(${seatsToUnblock}, COALESCE("blocked_seats", 0))
      WHERE "id" = ${id}
    `;

    return Number(affectedRows) === 1;
  }

  async remove(id: string) {
    return this.prisma.showtime_schedule.delete({
      where: { id },
    });
  }

  async findByRoomId(room_id: string) {
    return this.prisma.showtime_schedule.findMany({
      where: { room_id },
      orderBy: { start_time: 'asc' }, // NOVO
    });
  }

  async findOverlappingSessions(
    room_id: string,
    start_time: Date,
    end_time: Date,
    showtimeToExcludeId?: string,
  ) {
    const where: Prisma.showtime_scheduleWhereInput = {
      room_id,
      start_time: { lt: end_time },
      end_time: { gt: start_time },
      // Ignorar sessões canceladas
      session_status: {
        name: { not: 'Cancelada' },
      },
    };

    if (showtimeToExcludeId) {
      where.id = { not: showtimeToExcludeId };
    }

    return this.prisma.showtime_schedule.findMany({ where });
  }

  async findByMovieId(movie_id: string) {
    return this.prisma.showtime_schedule.findMany({
      where: { movie_id },
      orderBy: { start_time: 'asc' }, // NOVO
    });
  }
}
