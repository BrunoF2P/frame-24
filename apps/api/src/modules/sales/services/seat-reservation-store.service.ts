import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/redis/redis.service';

interface StoredSeatReservation {
  showtime_id: string;
  seat_ids: string[];
  expires_at: string;
  socket_id: string;
  reservation_uuid: string;
  user_id?: string;
  company_id: string;
}

@Injectable()
export class SeatReservationStoreService {
  constructor(private readonly redisService: RedisService) {}

  private readonly acquireSeatLocksScript = `
    local reservationUuid = ARGV[1]
    local ttlMs = tonumber(ARGV[2])

    for index, key in ipairs(KEYS) do
      local current = redis.call("GET", key)
      if current and current ~= reservationUuid then
        return {0, index}
      end
    end

    for _, key in ipairs(KEYS) do
      redis.call("SET", key, reservationUuid, "PX", ttlMs)
    end

    return {1}
  `;

  private readonly compareAndDeleteScript = `
    local current = redis.call("GET", KEYS[1])
    if current == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    end
    return 0
  `;

  private getReservationKey(reservationUuid: string) {
    return `seat-reservation:${reservationUuid}`;
  }

  private getUserShowtimeKey(userId: string, showtimeId: string) {
    return `seat-reservation:user:${userId}:showtime:${showtimeId}`;
  }

  private getSeatLockKey(showtimeId: string, seatId: string) {
    return `seat-lock:${showtimeId}:${seatId}`;
  }

  private getTtlMilliseconds(expiresAt: Date) {
    return Math.max(1, expiresAt.getTime() - Date.now());
  }

  private getTtlSeconds(expiresAt: Date) {
    return Math.max(1, Math.ceil(this.getTtlMilliseconds(expiresAt) / 1000));
  }

  async saveReservation(reservation: {
    showtime_id: string;
    seat_ids: string[];
    expires_at: Date;
    socket_id: string;
    reservation_uuid: string;
    user_id?: string;
    company_id: string;
  }): Promise<void> {
    const ttlSeconds = this.getTtlSeconds(reservation.expires_at);
    const payload: StoredSeatReservation = {
      ...reservation,
      expires_at: reservation.expires_at.toISOString(),
    };

    await this.redisService.set(
      this.getReservationKey(reservation.reservation_uuid),
      JSON.stringify(payload),
      ttlSeconds,
    );

    if (reservation.user_id) {
      await this.redisService.set(
        this.getUserShowtimeKey(reservation.user_id, reservation.showtime_id),
        reservation.reservation_uuid,
        ttlSeconds,
      );
    }
  }

  async tryAcquireSeatLocks(params: {
    showtimeId: string;
    seatIds: string[];
    reservationUuid: string;
    expiresAt: Date;
  }): Promise<{ acquired: true } | { acquired: false; conflictingSeatIds: string[] }> {
    const ttlMs = this.getTtlMilliseconds(params.expiresAt);
    const redis = this.redisService.getClient();
    await this.redisService.ensureConnection();
    const lockKeys = params.seatIds.map((seatId) =>
      this.getSeatLockKey(params.showtimeId, seatId),
    );

    const result = (await redis.eval(
      this.acquireSeatLocksScript,
      lockKeys.length,
      ...lockKeys,
      params.reservationUuid,
      ttlMs.toString(),
    )) as [number, number?];

    if (result[0] === 1) {
      return { acquired: true };
    }
    const conflictingIndex = result[1] ? result[1] - 1 : -1;

    return {
      acquired: false,
      conflictingSeatIds:
        conflictingIndex >= 0
          ? [params.seatIds[conflictingIndex]]
          : params.seatIds,
    };
  }

  async syncSeatLocks(reservation: {
    showtime_id: string;
    seat_ids: string[];
    expires_at: Date;
    reservation_uuid: string;
  }): Promise<void> {
    const ttlMs = this.getTtlMilliseconds(reservation.expires_at);
    const redis = this.redisService.getClient();
    await this.redisService.ensureConnection();

    const pipeline = redis.multi();

    for (const seatId of reservation.seat_ids) {
      pipeline.set(
        this.getSeatLockKey(reservation.showtime_id, seatId),
        reservation.reservation_uuid,
        'PX',
        ttlMs,
      );
    }

    await pipeline.exec();
  }

  async releaseSeatLocks(
    showtimeId: string,
    seatIds: string[],
    reservationUuid?: string,
  ): Promise<void> {
    if (seatIds.length === 0) {
      return;
    }

    const redis = this.redisService.getClient();
    await this.redisService.ensureConnection();

    if (!reservationUuid) {
      await redis.del(
        ...seatIds.map((seatId) => this.getSeatLockKey(showtimeId, seatId)),
      );
      return;
    }

    const pipeline = redis.multi();

    for (const seatId of seatIds) {
      pipeline.eval(
        this.compareAndDeleteScript,
        1,
        this.getSeatLockKey(showtimeId, seatId),
        reservationUuid,
      );
    }

    await pipeline.exec();
  }

  async removeReservation(params: {
    reservationUuid: string;
    userId?: string;
    showtimeId?: string;
  }): Promise<void> {
    await this.redisService.del(this.getReservationKey(params.reservationUuid));

    if (params.userId && params.showtimeId) {
      await this.redisService.del(
        this.getUserShowtimeKey(params.userId, params.showtimeId),
      );
    }
  }

  async findUserReservation(userId: string, showtimeId: string): Promise<{
    showtime_id: string;
    seat_ids: string[];
    expires_at: Date;
    socket_id: string;
    reservation_uuid: string;
    user_id?: string;
    company_id: string;
  } | null> {
    const reservationUuid = await this.redisService.get(
      this.getUserShowtimeKey(userId, showtimeId),
    );

    if (!reservationUuid) {
      return null;
    }

    const serializedReservation = await this.redisService.get(
      this.getReservationKey(reservationUuid),
    );

    if (!serializedReservation) {
      await this.redisService.del(this.getUserShowtimeKey(userId, showtimeId));
      return null;
    }

    const parsed = JSON.parse(serializedReservation) as StoredSeatReservation;

    return {
      ...parsed,
      expires_at: new Date(parsed.expires_at),
    };
  }
}
