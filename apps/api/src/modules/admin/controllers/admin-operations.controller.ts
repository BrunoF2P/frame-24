import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { AdminOperationsService } from '../services/admin-operations.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class AdminOperationsController {
  constructor(private readonly adminService: AdminOperationsService) {}

  @Get('reservations')
  @RequirePermission('showtimes', 'read')
  @ApiOperation({
    summary: 'Listar reservas pendentes de assentos',
  })
  async listReservations() {
    return this.adminService.listActiveReservations();
  }

  @Delete('reservations/:id')
  @RequirePermission('showtimes', 'delete')
  @ApiOperation({
    summary: 'Liberar/cancelar reserva pendente',
  })
  async cancelReservation(@Param('id', ParseEntityIdPipe) id: string) {
    await this.adminService.cancelReservation(id);
    return { success: true };
  }

  @Get('tickets/:id/qr-code')
  @RequirePermission('tickets', 'read')
  @ApiOperation({
    summary: 'Obter QR Code de um ingresso (uso administrativo)',
  })
  async getTicketQrCode(@Param('id', ParseEntityIdPipe) id: string) {
    return this.adminService.getTicketQrCode(id);
  }
}
