import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaxEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  cinema_complex_id!: string;

  @ApiPropertyOptional()
  source_type?: string;

  @ApiPropertyOptional()
  source_id?: string;

  @ApiProperty()
  competence_date!: string;

  @ApiProperty()
  gross_amount!: string;

  @ApiProperty()
  deductions_amount!: string;

  @ApiProperty()
  calculation_base!: string;

  @ApiProperty()
  iss_rate!: string;

  @ApiProperty()
  iss_amount!: string;

  @ApiProperty()
  pis_rate!: string;

  @ApiProperty()
  pis_debit_amount!: string;

  @ApiProperty()
  pis_credit_amount!: string;

  @ApiProperty()
  pis_amount_payable!: string;

  @ApiProperty()
  cofins_rate!: string;

  @ApiProperty()
  cofins_debit_amount!: string;

  @ApiProperty()
  cofins_credit_amount!: string;

  @ApiProperty()
  cofins_amount_payable!: string;

  @ApiProperty()
  total_taxes!: string;

  @ApiProperty()
  net_amount!: string;

  @ApiProperty()
  processed!: boolean;

  @ApiProperty()
  created_at!: string;
}
