import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TicketResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticket_number!: string;

  @ApiPropertyOptional()
  seat?: string | object;

  @ApiProperty()
  face_value!: string;

  @ApiPropertyOptional()
  service_fee?: string;

  @ApiProperty()
  total_amount!: string;

  @ApiProperty()
  used!: boolean;

  @ApiPropertyOptional()
  usage_date?: string;

  @ApiPropertyOptional()
  ticket_type?: string;
}

export class SaleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sale_number!: string;

  @ApiPropertyOptional({
    description: 'Referência pública opaca para recuperação/links de confirmação',
  })
  public_reference?: string;

  @ApiProperty()
  cinema_complex_id!: string;

  @ApiPropertyOptional()
  customer_id?: string;

  @ApiProperty()
  sale_date!: string;

  @ApiProperty()
  total_amount!: string;

  @ApiProperty()
  discount_amount!: string;

  @ApiProperty()
  net_amount!: string;

  @ApiPropertyOptional()
  sale_type?: string;

  @ApiPropertyOptional()
  payment_method?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Código promocional aplicado nesta venda',
  })
  promotion_code?: string;

  @ApiPropertyOptional({
    description: 'Valor de desconto aplicado pela promoção',
  })
  promotion_discount?: string;

  @ApiProperty({ type: [TicketResponseDto] })
  tickets!: TicketResponseDto[];

  @ApiProperty()
  created_at!: string;

  @ApiPropertyOptional({
    description: 'Informações da sessão (quando disponível)',
  })
  showtime?: {
    id: string;
    start_time: string;
    cinema: string;
    room: string | null;
    timezone?: string | null;
  };

  @ApiPropertyOptional({
    description: 'Informações do filme (quando disponível)',
  })
  movie?: {
    id: string;
    title: string;
    poster_url: string | null;
    duration_minutes: number;
    age_rating: string | null;
  } | null;
}
