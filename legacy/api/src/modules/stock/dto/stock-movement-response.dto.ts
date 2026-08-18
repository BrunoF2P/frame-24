import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StockMovementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  product_id!: string;

  @ApiProperty()
  complex_id!: string;

  @ApiProperty()
  movement_type!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  previous_quantity!: number;

  @ApiProperty()
  current_quantity!: number;

  @ApiPropertyOptional()
  unit_value?: string;

  @ApiPropertyOptional()
  total_value?: string;

  @ApiPropertyOptional()
  origin_type?: string;

  @ApiPropertyOptional()
  origin_id?: string;

  @ApiProperty()
  movement_date!: string;

  @ApiProperty()
  created_at!: string;
}
