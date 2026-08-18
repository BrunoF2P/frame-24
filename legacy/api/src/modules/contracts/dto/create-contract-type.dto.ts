import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateContractTypeSchema } from './create-contract-type.schema';

export class CreateContractTypeDto extends createZodDto(
  CreateContractTypeSchema,
) {
  @ApiProperty({
    description: 'Nome do tipo de contrato',
    example: 'Percentual Fixo',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição breve do contrato',
    example: 'Alíquota fixa por toda a vigência',
  })
  description?: string;
}
