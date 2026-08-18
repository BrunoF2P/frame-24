import { ApiProperty } from '@nestjs/swagger';

class MovieDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  poster_url!: string | null;

  @ApiProperty()
  duration_minutes!: number;

  @ApiProperty({ required: false, nullable: true })
  age_rating!: string | null;
}

class SeatDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  row!: string;

  @ApiProperty()
  column!: string;

  @ApiProperty()
  room_id!: string;
}

class TicketTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;
}

class TicketDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticket_number!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  seat_id!: string;

  @ApiProperty()
  showtime_id!: string;

  @ApiProperty({ type: SeatDto, required: false, nullable: true })
  seats!: SeatDto | null;

  @ApiProperty({ type: TicketTypeDto, required: false, nullable: true })
  ticket_types!: TicketTypeDto | null;
}

class ProductDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty({ required: false, nullable: true })
  image_url!: string | null;
}

class ConcessionSaleItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit_price!: number;

  @ApiProperty()
  item_type!: string;

  @ApiProperty()
  item_id!: string;

  @ApiProperty({ type: ProductDto, required: false, nullable: true })
  products!: ProductDto | null;

  @ApiProperty()
  price!: number;
}

class ConcessionSaleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  total_amount!: number;

  @ApiProperty({ type: [ConcessionSaleItemDto] })
  concession_sale_items!: ConcessionSaleItemDto[];
}

class CinemaComplexDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class RoomDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class ShowtimeScheduleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  start_time!: Date;

  @ApiProperty({ type: CinemaComplexDto })
  cinema_complexes!: CinemaComplexDto;

  @ApiProperty({ type: RoomDto })
  rooms!: RoomDto;
}

export class CustomerSalesResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  total_amount!: number;

  @ApiProperty()
  sale_date!: Date;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [TicketDto] })
  tickets!: TicketDto[];

  @ApiProperty({ type: [ConcessionSaleDto] })
  concession_sales!: ConcessionSaleDto[];

  @ApiProperty({ type: ShowtimeScheduleDto, required: false, nullable: true })
  showtime_schedule!: ShowtimeScheduleDto | null;

  @ApiProperty({ type: MovieDetailsDto, required: false, nullable: true })
  movie!: MovieDetailsDto | null;
}
