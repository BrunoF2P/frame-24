import { Injectable } from '@nestjs/common';
import { Prisma, session_seat_status as SessionSeatStatus } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionSeatStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    data: Prisma.session_seat_statusCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.session_seat_status.createMany({
      data,
      skipDuplicates: false,
    });
  }

  async findByShowtimeId(showtime_id: string) {
    return this.prisma.session_seat_status.findMany({
      where: { showtime_id },
      include: {
        seats: true,
        seat_status: true,
      },
    });
  }

  async findBySeatAndShowtime(
    showtime_id: string,
    seat_id: string,
  ): Promise<SessionSeatStatus | null> {
    return this.prisma.session_seat_status.findUnique({
      where: {
        showtime_id_seat_id: {
          showtime_id,
          seat_id,
        },
      },
    });
  }

  async findByShowtimeAndSeat(
    showtime_id: string,
    seat_id: string,
  ): Promise<SessionSeatStatus | null> {
    return this.findBySeatAndShowtime(showtime_id, seat_id);
  }

  async updateStatus(
    showtime_id: string,
    seat_id: string,
    data: Prisma.session_seat_statusUpdateInput,
  ): Promise<SessionSeatStatus> {
    return this.prisma.session_seat_status.update({
      where: {
        showtime_id_seat_id: {
          showtime_id,
          seat_id,
        },
      },
      data,
    });
  }

  async updateMany(
    where: Prisma.session_seat_statusWhereInput,
    data: Prisma.XOR<
      Prisma.session_seat_statusUpdateManyMutationInput,
      Prisma.session_seat_statusUncheckedUpdateManyInput
    >,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.session_seat_status.updateMany({
      where,
      data,
    });
  }

  async countByStatus(showtime_id: string, status: string): Promise<number> {
    return this.prisma.session_seat_status.count({
      where: {
        showtime_id,
        status,
      },
    });
  }

  async deleteByShowtimeId(showtime_id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session_seat_status.deleteMany({
      where: { showtime_id },
    });
  }

  async findActiveReservationsByCompany(company_id: string) {
    const now = new Date();
    return this.prisma.session_seat_status.findMany({
      where: {
        reservation_uuid: { not: null },
        expiration_date: { gt: now },
        showtime_schedule: {
          cinema_complexes: {
            company_id,
          },
        },
      },
      include: {
        seats: true,
        seat_status: true,
        showtime_schedule: {
          include: {
            cinema_complexes: true,
            rooms: true,
          },
        },
      },
      orderBy: { reservation_date: 'desc' },
    });
  }

  async findByIdWithRelations(id: string) {
    return this.prisma.session_seat_status.findUnique({
      where: { id },
      include: {
        seats: true,
        seat_status: true,
        showtime_schedule: {
          include: {
            cinema_complexes: true,
            rooms: true,
          },
        },
      },
    });
  }

  async releaseReservation(id: string, seat_status_id: string) {
    return this.prisma.session_seat_status.update({
      where: { id },
      data: {
        reservation_uuid: null,
        reservation_date: null,
        expiration_date: null,
        seat_status: {
          connect: { id: seat_status_id },
        },
      },
      include: {
        seats: true,
        seat_status: true,
      },
    });
  }
}
