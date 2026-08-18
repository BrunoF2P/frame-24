import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const AuditValuesSchema = z.object({}).catchall(z.unknown());

const AuditLogSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  event_type: z.string(),
  resource_type: z.string(),
  resource_id: z.string(),
  action: z.string(),
  user_id: z.string().optional(),
  correlation_id: z.string().optional(),
  old_values: AuditValuesSchema.optional(),
  new_values: AuditValuesSchema.optional(),
  created_at: z.string().datetime(), // ✅ String em vez de Date
});

const AuditLogsListSchema = z.object({
  logs: z.array(AuditLogSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export class AuditLogResponseDto extends createZodDto(AuditLogSchema) {
  @ApiProperty({
    description: 'ID único do log',
    example: '244756540177780751',
  })
  id!: string;

  @ApiProperty({
    description: 'ID da empresa',
    example: '243244130317111296',
  })
  company_id!: string;

  @ApiProperty({
    description: 'Tipo de evento',
    example: 'audit.movie_category.deleted',
  })
  event_type!: string;

  @ApiProperty({
    description: 'Tipo do recurso',
    example: 'movie_category',
  })
  resource_type!: string;

  @ApiProperty({
    description: 'ID do recurso alterado',
    example: '244746749711749120',
  })
  resource_id!: string;

  @ApiProperty({
    description: 'Ação realizada',
    example: 'deleted',
  })
  action!: string;

  @ApiPropertyOptional({
    description: 'ID do usuário',
    example: '243244130430357508',
  })
  user_id?: string;

  @ApiPropertyOptional({
    description: 'ID de correlação',
    example: '1762421706532-hjlr7sozb',
  })
  correlation_id?: string;

  @ApiPropertyOptional({
    description: 'Valores anteriores',
    example: { id: '244746749711749120', name: '17', slug: '17' },
  })
  old_values?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Novos valores',
    example: null,
  })
  new_values?: Record<string, unknown>;

  @ApiProperty({
    description: 'Timestamp da alteração',
    example: '2025-11-06T09:35:06.536Z',
  })
  created_at!: string;
}

export class AuditLogsListResponseDto extends createZodDto(
  AuditLogsListSchema,
) {
  @ApiProperty({
    description: 'Lista de logs',
    type: [AuditLogResponseDto],
  })
  logs!: AuditLogResponseDto[];

  @ApiProperty({
    description: 'Total de logs encontrados',
    example: 150,
  })
  total!: number;

  @ApiProperty({
    description: 'Página atual',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Itens por página',
    example: 20,
  })
  pageSize!: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 8,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Existe próxima página?',
    example: true,
  })
  hasNextPage!: boolean;

  @ApiProperty({
    description: 'Existe página anterior?',
    example: false,
  })
  hasPreviousPage!: boolean;
}

export type AuditLogType = z.infer<typeof AuditLogSchema>;
export type AuditLogsListType = z.infer<typeof AuditLogsListSchema>;
