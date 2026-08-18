import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SalesService } from 'src/modules/sales/services/sales.service';
import { PublicCreateSaleDto } from '../dto/public-create-sale.dto';
import { SaleResponseDto } from 'src/modules/sales/dto/sale-response.dto';
import { CinemaComplexesRepository } from 'src/modules/operations/cinema-complexes/repositories/cinema-complexes.repository';
import { WriteThrottle } from 'src/common/decorators/auth-throttle.decorator';

@ApiTags('Public Sales')
@Controller({ path: 'public/sales', version: '1' })
export class PublicSalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova venda (Público)' })
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    description:
      'Obrigatório: chave opaca do cliente para deduplicar criação de venda (política pública). Header HTTP case-insensitive; envie como Idempotency-Key ou idempotency-key.',
  })
  @ApiResponse({
    status: 201,
    description: 'Venda criada com sucesso',
    type: SaleResponseDto,
  })
  @WriteThrottle()
  async create(
    @Body() dto: PublicCreateSaleDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<SaleResponseDto> {
    const trimmedKey = idempotencyKey?.trim();
    if (!trimmedKey) {
      throw new BadRequestException(
        'O cabeçalho Idempotency-Key é obrigatório para criar venda pelo endpoint público',
      );
    }

    const complex = await this.cinemaComplexesRepository.findById(
      dto.cinema_complex_id,
    );

    if (!complex) {
      throw new NotFoundException('Complexo de cinema não encontrado');
    }

    return this.salesService.create(dto, {
      companyId: complex.company_id,
      sessionContext: 'CUSTOMER',
      idempotencyKey: trimmedKey,
    });
  }
}
