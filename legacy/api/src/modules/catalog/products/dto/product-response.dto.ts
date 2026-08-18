import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ProductResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  category_id: z.string(),
  category_name: z.string().optional(),
  product_code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  ncm_code: z.string().nullable(),
  unit: z.string().nullable(),
  minimum_stock: z.number().nullable(),
  supplier_id: z.string().nullable(),
  barcode: z.string().nullable(),
  is_available_online: z.boolean().nullable(),
  active: z.boolean().nullable(),
  created_at: z.string().datetime(),
});

export class ProductResponseDto extends createZodDto(ProductResponseSchema) {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  category_id!: string;

  @ApiPropertyOptional()
  category_name?: string;

  @ApiProperty()
  product_code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  image_url!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ncm_code!: string | null;

  @ApiPropertyOptional({ nullable: true })
  unit!: string | null;

  @ApiPropertyOptional({ nullable: true })
  minimum_stock!: number | null;

  @ApiPropertyOptional({ nullable: true })
  supplier_id!: string | null;

  @ApiPropertyOptional({ nullable: true })
  barcode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  is_available_online!: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  active!: boolean | null;

  @ApiProperty()
  created_at!: string;
}
