import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductStockResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  product_id!: string;

  @ApiProperty()
  complex_id!: string;

  @ApiProperty()
  current_quantity!: number;

  @ApiProperty()
  minimum_quantity!: number;

  @ApiProperty()
  maximum_quantity!: number;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;

  @ApiProperty()
  is_low_stock!: boolean;
}
