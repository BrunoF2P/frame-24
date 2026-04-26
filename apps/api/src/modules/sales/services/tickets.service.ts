import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ClsService } from 'nestjs-cls';
import { TicketsRepository } from '../repositories/tickets.repository';
import { ShowtimesRepository } from 'src/modules/operations/showtime_schedule/repositories/showtime.repository';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { SeatStatusRepository } from 'src/modules/operations/seat-status/repositories/seat-status.repository';
import { SeatsRepository } from 'src/modules/operations/seats/repositories/seats.repository';
import { LoggerService } from 'src/common/services/logger.service';

type TicketsExecutionContext = {
  companyId?: string;
};

type ValidateAndReserveSeatsInput = {
  showtimeId: string;
  seatIds: string[];
  reservationUuid?: string;
  context?: TicketsExecutionContext;
};

type ReserveSeatsInput = {
  showtimeId: string;
  seatIds: string[];
  saleId: string;
  reservationUuid?: string;
  context?: TicketsExecutionContext;
};

type ReleaseSeatsInput = {
  showtimeId: string;
  seatIds: string[];
  context?: TicketsExecutionContext;
};

type CalculateTicketPriceInput = {
  showtimeId: string;
  seatId?: string;
  ticketTypeId?: string;
  context?: TicketsExecutionContext;
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly showtimesRepository: ShowtimesRepository,
    private readonly sessionSeatStatusRepository: SessionSeatStatusRepository,
    private readonly seatStatusRepository: SeatStatusRepository,
    public readonly seatsRepository: SeatsRepository,
    private readonly logger: LoggerService,
    private readonly cls: ClsService,
  ) {}

  private resolveCompanyId(context?: TicketsExecutionContext): string {
    const companyId = context?.companyId ?? this.cls.get<string>('companyId');
    if (!companyId) {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    }
    return companyId;
  }

  async validateAndReserveSeats(
    input: ValidateAndReserveSeatsInput,
  ): Promise<void> {
    const { showtimeId, seatIds, reservationUuid, context } = input;
    const companyId = this.resolveCompanyId(context);

    // Validar sessão
    const showtime = await this.showtimesRepository.findById(showtimeId);
    if (!showtime) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // Validar que a sessão pertence à empresa
    if (showtime.cinema_complexes?.company_id !== companyId) {
      throw new BadRequestException('A sessão não pertence à sua empresa');
    }

    // Validar que a sessão ainda não começou
    if (new Date(showtime.start_time) < new Date()) {
      throw new BadRequestException('A sessão já começou');
    }

    // Buscar status "vendido" ou "ocupado"
    const soldStatus = await this.seatStatusRepository.findByNameAndCompany(
      'Vendido',
      companyId,
    );
    const occupiedStatus = await this.seatStatusRepository.findByNameAndCompany(
      'Ocupado',
      companyId,
    );

    if (!soldStatus && !occupiedStatus) {
      throw new NotFoundException(
        'Status de assento "Vendido" ou "Ocupado" não configurado',
      );
    }

    const reservedStatusId = soldStatus?.id || occupiedStatus?.id;

    // Validar cada assento
    for (const seatId of seatIds) {
      const seat = await this.seatsRepository.findById(seatId);
      if (!seat) {
        throw new NotFoundException(`Assento não encontrado`);
      }

      const sessionSeatStatus =
        await this.sessionSeatStatusRepository.findBySeatAndShowtime(
          showtimeId,
          seatId,
        );

      if (!sessionSeatStatus) {
        throw new NotFoundException(
          `Assento ${seatId} não está disponível nesta sessão`,
        );
      }

      // Verificar se o assento já está vendido/ocupado
      const isSameActiveReservation =
        reservationUuid &&
        sessionSeatStatus.reservation_uuid === reservationUuid &&
        sessionSeatStatus.expiration_date &&
        sessionSeatStatus.expiration_date > new Date();

      if (
        !isSameActiveReservation &&
        (sessionSeatStatus.status === reservedStatusId ||
          sessionSeatStatus.sale_id ||
          (sessionSeatStatus.reservation_uuid &&
            sessionSeatStatus.expiration_date &&
            sessionSeatStatus.expiration_date > new Date()))
      ) {
        throw new ConflictException(
          `Assento ${seat.seat_code} já está ocupado`,
        );
      }
    }
  }

  @Transactional()
  async reserveSeats(input: ReserveSeatsInput): Promise<void> {
    const { showtimeId, seatIds, saleId, reservationUuid, context } = input;
    const companyId = this.resolveCompanyId(context);

    // Buscar status "vendido"
    const soldStatus = await this.seatStatusRepository.findByNameAndCompany(
      'Vendido',
      companyId,
    );

    if (!soldStatus) {
      throw new NotFoundException(
        'Status de assento "Vendido" não configurado',
      );
    }

    const now = new Date();
    const availabilityGuard = reservationUuid
      ? {
          reservation_uuid: reservationUuid,
          expiration_date: { gt: now },
        }
      : {
          OR: [
            { reservation_uuid: null },
            { expiration_date: null },
            { expiration_date: { lte: now } },
          ],
        };

    const seatUpdate = await this.sessionSeatStatusRepository.updateMany(
      {
        showtime_id: showtimeId,
        seat_id: { in: seatIds },
        sale_id: null,
        ...availabilityGuard,
      },
      {
        status: soldStatus.id,
        sale_id: saleId,
        reservation_uuid: null,
        reservation_date: null,
        expiration_date: null,
      },
    );

    if (seatUpdate.count !== seatIds.length) {
      throw new ConflictException(
        'Um ou mais assentos não estão mais disponíveis para venda (concorrência ou reserva ativa)',
      );
    }

    // Atualização atômica com guarda de limite evita contadores negativos.
    const countersUpdated =
      await this.showtimesRepository.reserveSeatsCountersAtomically(
        showtimeId,
        seatIds.length,
      );

    if (!countersUpdated) {
      throw new ConflictException(
        'Não foi possível atualizar lotação da sessão de forma segura',
      );
    }
  }

  @Transactional()
  async releaseSeats(input: ReleaseSeatsInput): Promise<void> {
    const { showtimeId, seatIds, context } = input;
    const companyId = this.resolveCompanyId(context);

    if (seatIds.length === 0) {
      return;
    }

    const availableStatus = await this.getAvailableSeatStatus(companyId);

    let releasedCount = 0;
    for (const seatId of seatIds) {
      const sessionSeatStatus =
        await this.sessionSeatStatusRepository.findBySeatAndShowtime(
          showtimeId,
          seatId,
        );

      if (!sessionSeatStatus?.sale_id) {
        continue;
      }

      await this.sessionSeatStatusRepository.updateStatus(showtimeId, seatId, {
        seat_status: { connect: { id: availableStatus.id } },
        sale_id: null,
        reservation_uuid: null,
        reservation_date: null,
        expiration_date: null,
      });

      releasedCount += 1;
    }

    if (releasedCount === 0) {
      return;
    }

    const countersUpdated =
      await this.showtimesRepository.releaseSeatsCountersSafely(
        showtimeId,
        releasedCount,
      );

    if (!countersUpdated) {
      this.logger.warn(
        `Falha ao atualizar contadores da sessão ${showtimeId} na liberação de assentos`,
        TicketsService.name,
      );
      return;
    }

    this.logger.log(
      `Assentos liberados na sessão ${showtimeId}: ${releasedCount}`,
      TicketsService.name,
    );
  }

  async calculateTicketPrice(input: CalculateTicketPriceInput): Promise<{
    face_value: number;
    service_fee: number;
    total_amount: number;
  }> {
    const { showtimeId, seatId, ticketTypeId, context } = input;
    const companyId = this.resolveCompanyId(context);

    const showtime = await this.showtimesRepository.findById(showtimeId);
    if (!showtime) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (showtime.cinema_complexes?.company_id !== companyId) {
      throw new BadRequestException('A sessão não pertence à sua empresa');
    }

    let basePrice = Number(showtime.base_ticket_price);

    // Adicionar valor adicional do tipo de assento (se houver)
    if (seatId) {
      const seat = await this.seatsRepository.findByIdWithSeatType(seatId);

      if (seat?.seat_types?.additional_value) {
        const additionalValue = Number(seat.seat_types.additional_value);
        basePrice += additionalValue;
      }
    }

    // Aplicar desconto do tipo de ingresso (se houver)
    let multiplier = 1;
    if (ticketTypeId) {
      const ticketType =
        await this.ticketsRepository.findTicketTypeById(ticketTypeId);

      if (ticketType?.discount_percentage) {
        multiplier = 1 - Number(ticketType.discount_percentage) / 100;
      }
    }

    const face_value = basePrice * multiplier;
    const service_fee = 0; // Fee não configurada para o tenant no momento
    const total_amount = face_value + service_fee;

    return {
      face_value,
      service_fee,
      total_amount,
    };
  }

  private async getAvailableSeatStatus(companyId: string): Promise<{
    id: string;
  }> {
    const statusCandidates = ['Disponível', 'Disponivel', 'Livre'];

    for (const statusName of statusCandidates) {
      const status = await this.seatStatusRepository.findByNameAndCompany(
        statusName,
        companyId,
      );

      if (status) {
        return status;
      }
    }

    throw new NotFoundException(
      'Status de assento "Disponível" não configurado',
    );
  }
}
