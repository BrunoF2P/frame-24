import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SessionSeatStatusRepository } from 'src/modules/operations/session_seat_status/repositories/session-seat-status.repository';
import { SeatStatusRepository } from 'src/modules/operations/seat-status/repositories/seat-status.repository';
import { TicketsRepository } from 'src/modules/sales/repositories/tickets.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly sessionSeatStatusRepository: SessionSeatStatusRepository,
    private readonly seatStatusRepository: SeatStatusRepository,
    private readonly ticketsRepository: TicketsRepository,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async listActiveReservations() {
    const company_id = this.tenantContext.getCompanyId();
    const reservations =
      await this.sessionSeatStatusRepository.findActiveReservationsByCompany(
        company_id,
      );

    return reservations.map((reservation) => ({
      id: reservation.id,
      showtime_id: reservation.showtime_id,
      seat_id: reservation.seat_id,
      reservation_uuid: reservation.reservation_uuid,
      reservation_date: reservation.reservation_date,
      expiration_date: reservation.expiration_date,
      seat_code: reservation.seats?.seat_code,
      seat_row: reservation.seats?.row_code,
      seat_number: reservation.seats?.column_number,
      seat_status: reservation.seat_status?.name,
      cinema_complex_id: reservation.showtime_schedule?.cinema_complex_id,
      room_id: reservation.showtime_schedule?.room_id,
    }));
  }

  async cancelReservation(id: string) {
    const company_id = this.tenantContext.getCompanyId();
    const reservation =
      await this.sessionSeatStatusRepository.findByIdWithRelations(id);

    if (
      !reservation ||
      reservation.showtime_schedule?.cinema_complexes?.company_id !== company_id
    ) {
      throw new NotFoundException('Reserva não encontrada');
    }

    const availableStatus =
      (await this.seatStatusRepository.findByNameAndCompany(
        'Disponível',
        company_id,
      )) || (await this.seatStatusRepository.findDefaultByCompany(company_id));

    if (!availableStatus) {
      throw new NotFoundException(
        'Status de assento "Disponível" não configurado',
      );
    }

    await this.sessionSeatStatusRepository.releaseReservation(
      id,
      availableStatus.id,
    );
  }

  async getTicketQrCode(ticket_id: string) {
    const company_id = this.tenantContext.getCompanyId();
    const ticket = await this.ticketsRepository.findById(ticket_id);

    if (!ticket || !ticket.sales) {
      throw new NotFoundException('Ingresso não encontrado');
    }

    const saleComplex = await this.prisma.cinema_complexes.findFirst({
      where: {
        id: ticket.sales.cinema_complex_id,
        company_id,
      },
    });

    if (!saleComplex) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar este ingresso',
      );
    }

    const payload = JSON.stringify({
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      sale_id: ticket.sales.id,
      sale_number: ticket.sales.sale_number,
      cinema_complex_id: ticket.sales.cinema_complex_id,
      showtime_id: ticket.showtime_id,
    });

    return {
      payload,
      base64: Buffer.from(payload).toString('base64'),
    };
  }
}
