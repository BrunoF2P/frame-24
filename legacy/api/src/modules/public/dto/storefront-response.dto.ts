import { ApiProperty } from '@nestjs/swagger';

export class StorefrontMetaDto {
  @ApiProperty({ example: '2026-03-31T14:35:12.000Z' })
  generated_at!: string;

  @ApiProperty({ example: true })
  include_showtimes!: boolean;
}

export class StorefrontCompanyDto {
  @ApiProperty({ example: 'cmp_123' })
  id!: string;

  @ApiProperty({ example: 'Cinema Exemplo LTDA' })
  corporate_name!: string;

  @ApiProperty({ example: 'Cinema Exemplo' })
  trade_name!: string;

  @ApiProperty({ example: 'cinema-exemplo' })
  tenant_slug!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/logo.png',
  })
  logo_url!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Sao Paulo' })
  city!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'SP' })
  state!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '+55 11 99999-9999',
  })
  phone!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'contato@cinemaexemplo.com',
  })
  email!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cinemaexemplo.com',
  })
  website!: string | null;
}

export class StorefrontComplexDto {
  @ApiProperty({ example: 'cpx_1' })
  id!: string;

  @ApiProperty({ example: 'Shopping Centro' })
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Rua Exemplo, 123' })
  address!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Sao Paulo' })
  city!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'SP' })
  state!: string | null;
}

export class StorefrontMovieDto {
  @ApiProperty({ example: 'mov_1' })
  id!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Filme Exemplo' })
  brazil_title!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Movie Example' })
  original_title!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 120 })
  duration_minutes!: number | null;

  @ApiProperty({ required: false, nullable: true, example: '14' })
  age_rating!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/poster.jpg',
  })
  poster_url!: string | null;
}

export class StorefrontProductDto {
  @ApiProperty({ example: 'prd_1' })
  id!: string;

  @ApiProperty({ example: 'Combo Pipoca' })
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Pipoca + Refrigerante',
  })
  description!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/product.png',
  })
  image_url!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 29.9 })
  price!: number | null;
}

export class StorefrontTicketTypeDto {
  @ApiProperty({ example: 'tt_1' })
  id!: string;

  @ApiProperty({ example: 'Inteira' })
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Ingresso sem desconto',
  })
  description!: string | null;

  @ApiProperty({ example: 1 })
  price_modifier!: number;
}

export class StorefrontPaymentMethodDto {
  @ApiProperty({ example: 'pm_1' })
  id!: string;

  @ApiProperty({ example: 'PIX' })
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Pagamento instantaneo',
  })
  description!: string | null;
}

export class StorefrontShowtimeMovieDto {
  @ApiProperty({ example: 'mov_1' })
  id!: string;

  @ApiProperty({ example: 'Filme Exemplo' })
  title!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/poster.jpg',
  })
  poster_url!: string | null;

  @ApiProperty({ required: false, nullable: true, example: 120 })
  duration_minutes!: number | null;

  @ApiProperty({ required: false, nullable: true, example: '14' })
  age_rating!: string | null;
}

export class StorefrontShowtimeComplexDto {
  @ApiProperty({ example: 'cpx_1' })
  id!: string;

  @ApiProperty({ example: 'Shopping Centro' })
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 'Rua Exemplo, 123' })
  address!: string | null;
}

export class StorefrontShowtimeRoomDto {
  @ApiProperty({ example: 'room_1' })
  id!: string;

  @ApiProperty({ example: 'Sala 1' })
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: 1 })
  room_number!: number | null;
}

export class StorefrontNamedRefDto {
  @ApiProperty({ example: 'ref_1' })
  id!: string;

  @ApiProperty({ example: '2D' })
  name!: string;
}

export class StorefrontShowtimeDto {
  @ApiProperty({ example: 'shw_1' })
  id!: string;

  @ApiProperty({ example: 'mov_1' })
  movie_id!: string;

  @ApiProperty({ example: '2026-03-31T21:00:00.000Z' })
  start_time!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '2026-03-31T23:00:00.000Z',
  })
  end_time!: string | null;

  @ApiProperty({ example: 35 })
  base_ticket_price!: number;

  @ApiProperty({ example: 120 })
  available_seats!: number;

  @ApiProperty({ example: 10 })
  sold_seats!: number;

  @ApiProperty({ example: 0 })
  blocked_seats!: number;

  @ApiProperty({ type: StorefrontShowtimeComplexDto, nullable: true })
  cinema_complexes!: StorefrontShowtimeComplexDto | null;

  @ApiProperty({ type: StorefrontShowtimeRoomDto, nullable: true })
  rooms!: StorefrontShowtimeRoomDto | null;

  @ApiProperty({ type: StorefrontNamedRefDto, nullable: true })
  projection_types!: StorefrontNamedRefDto | null;

  @ApiProperty({ type: StorefrontNamedRefDto, nullable: true })
  audio_types!: StorefrontNamedRefDto | null;

  @ApiProperty({ type: StorefrontNamedRefDto, nullable: true })
  session_languages!: StorefrontNamedRefDto | null;

  @ApiProperty({ type: StorefrontNamedRefDto, nullable: true })
  session_status!: StorefrontNamedRefDto | null;

  @ApiProperty({
    type: StorefrontShowtimeMovieDto,
    required: false,
    nullable: true,
  })
  movie!: StorefrontShowtimeMovieDto | null;
}

export class StorefrontShowtimesPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 64 })
  total!: number;

  @ApiProperty({ example: 4 })
  total_pages!: number;
}

export class StorefrontDataDto {
  @ApiProperty({ type: StorefrontCompanyDto })
  company!: StorefrontCompanyDto;

  @ApiProperty({ type: [StorefrontComplexDto] })
  complexes!: StorefrontComplexDto[];

  @ApiProperty({ type: [StorefrontMovieDto] })
  movies!: StorefrontMovieDto[];

  @ApiProperty({ type: [StorefrontProductDto] })
  products!: StorefrontProductDto[];

  @ApiProperty({ type: [StorefrontTicketTypeDto] })
  ticket_types!: StorefrontTicketTypeDto[];

  @ApiProperty({ type: [StorefrontPaymentMethodDto] })
  payment_methods!: StorefrontPaymentMethodDto[];

  @ApiProperty({
    type: [StorefrontShowtimeDto],
    required: false,
    nullable: true,
  })
  showtimes!: StorefrontShowtimeDto[] | null;

  @ApiProperty({
    type: StorefrontShowtimesPaginationDto,
    required: false,
    nullable: true,
  })
  showtimes_pagination!: StorefrontShowtimesPaginationDto | null;
}

export class StorefrontResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: StorefrontMetaDto })
  meta!: StorefrontMetaDto;

  @ApiProperty({ type: StorefrontDataDto })
  data!: StorefrontDataDto;
}
