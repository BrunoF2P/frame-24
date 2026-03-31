import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CustomerGuard } from 'src/common/guards/customer.guard';
import { CustomerPurchasesService } from '../services/customer-purchases.service';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { SaleResponseDto } from 'src/modules/sales/dto/sale-response.dto';

@ApiTags('Customer')
@ApiBearerAuth()
@Controller({ path: 'customer', version: '1' })
@UseGuards(JwtAuthGuard, CustomerGuard)
export class CustomerPurchasesController {
  constructor(
    private readonly customerPurchasesService: CustomerPurchasesService,
  ) {}

  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Comprar ingressos',
    description:
      'Realiza a compra de ingressos e produtos de concessão. Acumula pontos de fidelidade automaticamente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Compra realizada com sucesso',
    type: SaleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou pontos insuficientes',
  })
  async purchase(@Body() dto: CreatePurchaseDto): Promise<SaleResponseDto> {
    return this.customerPurchasesService.purchase(dto);
  }

  @Get('purchases')
  @ApiOperation({
    summary: 'Listar minhas compras',
    description:
      'Retorna o histórico completo de compras do cliente autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de compras retornada com sucesso',
    type: [SaleResponseDto],
  })
  async findAll(): Promise<SaleResponseDto[]> {
    return this.customerPurchasesService.findAll();
  }

  @Get('purchases/:id')
  @ApiOperation({
    summary: 'Ver detalhes de uma compra',
    description: 'Retorna os detalhes de uma compra específica do cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da compra retornados com sucesso',
    type: SaleResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Você não tem permissão para ver esta compra',
  })
  @ApiResponse({
    status: 404,
    description: 'Compra não encontrada',
  })
  async findOne(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<SaleResponseDto> {
    return this.customerPurchasesService.findOne(id);
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'Listar meus ingressos',
    description: 'Retorna todos os ingressos do cliente autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ingressos retornada com sucesso',
  })
  async findTickets(): Promise<Array<Record<string, unknown>>> {
    return this.customerPurchasesService.findTickets();
  }

  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Ver detalhes de um ingresso',
    description: 'Retorna os detalhes de um ingresso específico do cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do ingresso retornados com sucesso',
  })
  async findTicketById(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<Record<string, unknown>> {
    return this.customerPurchasesService.findTicketById(id);
  }

  @Get('tickets/:id/qr-code')
  @ApiOperation({
    summary: 'Obter QR Code de um ingresso',
    description:
      'Retorna o payload e a representação base64 que podem ser usados para gerar um QR Code do ingresso',
  })
  @ApiResponse({
    status: 200,
    description: 'QR Code retornado com sucesso',
  })
  async getTicketQrCode(@Param('id', ParseEntityIdPipe) id: string) {
    return this.customerPurchasesService.getTicketQrCode(id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Histórico completo',
    description:
      'Retorna histórico completo de compras e ingressos do cliente autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso',
  })
  async getHistory(): Promise<{
    purchases: SaleResponseDto[];
    tickets: Array<Record<string, unknown>>;
  }> {
    return this.customerPurchasesService.getHistory();
  }

  @Delete('purchases/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancelar minha compra',
    description: 'Permite que o cliente cancele uma compra própria',
  })
  @ApiResponse({
    status: 204,
    description: 'Compra cancelada com sucesso',
  })
  async cancelPurchase(
    @Param('id', ParseEntityIdPipe) id: string,
  ): Promise<void> {
    return this.customerPurchasesService.cancelPurchase(id);
  }
}
