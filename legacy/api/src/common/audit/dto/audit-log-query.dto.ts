import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

const AuditLogQuerySchema = z.object({
  eventType: z
    .string()
    .regex(/^audit\.[a-z_]+\.[a-z_]+$/)
    .optional(),

  resourceType: z
    .string()
    .regex(/^[a-z_]+$/)
    .optional(),

  resourceId: z
    .string()
    .regex(/^[0-9]+$/)
    .optional(),

  userId: z
    .string()
    .regex(/^[0-9]+$/)
    .optional(),

  action: z.enum(['created', 'updated', 'deleted']).optional(),

  startDate: z.string().datetime().optional(),

  endDate: z.string().datetime().optional(),

  skip: z.number().int().min(0).default(0),

  take: z.number().int().min(1).max(100).default(20),

  sortBy: z
    .enum(['company_id', 'event_type', 'resource_type', 'action', 'created_at'])
    .default('created_at'),

  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export class AuditLogQueryDto extends createZodDto(AuditLogQuerySchema) {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de evento',
    example: 'audit.movie_category.created',
  })
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de recurso',
    example: 'movie_category',
  })
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'ID do recurso específico',
    example: '244746749711749120',
  })
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que fez a alteração',
    example: '243244130430357508',
  })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ação',
    enum: ['created', 'updated', 'deleted'],
    example: 'deleted',
  })
  action?: 'created' | 'updated' | 'deleted';

  @ApiPropertyOptional({
    description: 'Data inicial (ISO 8601)',
    example: '2025-11-01T00:00:00Z',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final (ISO 8601)',
    example: '2025-11-06T23:59:59Z',
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Página (0-based)',
    example: 0,
    default: 0,
  })
  skip!: number;

  @ApiPropertyOptional({
    description: 'Itens por página (máximo 100)',
    example: 20,
    default: 20,
  })
  take!: number;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    enum: ['company_id', 'event_type', 'resource_type', 'action', 'created_at'],
    example: 'created_at',
    default: 'created_at',
  })
  sortBy!:
    | 'company_id'
    | 'event_type'
    | 'resource_type'
    | 'action'
    | 'created_at';

  @ApiPropertyOptional({
    description: 'Ordem de classificação',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  sortOrder!: 'asc' | 'desc';
}

export type AuditLogQueryType = z.infer<typeof AuditLogQuerySchema>;
