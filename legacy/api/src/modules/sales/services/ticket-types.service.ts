import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ticket_types } from '@repo/db';
import { Transactional } from '@nestjs-cls/transactional';
import { LoggerService } from 'src/common/services/logger.service';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { CreateTicketTypeDto } from '../dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from '../dto/update-ticket-type.dto';
import { TicketTypeResponseDto } from '../dto/ticket-type-response.dto';
import { TicketTypesRepository } from '../repositories/ticket-types.repository';

@Injectable()
export class TicketTypesService {
  constructor(
    private readonly ticketTypesRepository: TicketTypesRepository,
    private readonly logger: LoggerService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateTicketTypeDto): Promise<TicketTypeResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const normalizedName = dto.name.trim();
    const description = dto.description?.trim() || undefined;
    const discountPercentage = dto.discount_percentage ?? 0;

    const existing = await this.ticketTypesRepository.findByName(
      companyId,
      normalizedName,
    );

    if (existing) {
      throw new ConflictException(
        'Já existe um tipo de ingresso com este nome',
      );
    }

    const ticketType = await this.ticketTypesRepository.create({
      company_id: companyId,
      name: normalizedName,
      description,
      discount_percentage: new Prisma.Decimal(discountPercentage),
    } as Prisma.ticket_typesCreateInput);

    this.logger.log(
      `Ticket type created: ${ticketType.name}`,
      TicketTypesService.name,
    );

    return this.mapToDto(ticketType);
  }

  async findAll(): Promise<TicketTypeResponseDto[]> {
    const companyId = this.tenantContext.getCompanyId();
    const ticketTypes = await this.ticketTypesRepository.findAll(companyId);

    return ticketTypes.map((ticketType) => this.mapToDto(ticketType));
  }

  async findOne(id: string): Promise<TicketTypeResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const ticketType = await this.ticketTypesRepository.findById(id, companyId);

    if (!ticketType) {
      throw new NotFoundException('Tipo de ingresso não encontrado');
    }

    const ticketCount = await this.ticketTypesRepository.countTickets(id);

    return this.mapToDto(ticketType, ticketCount);
  }

  @Transactional()
  async update(
    id: string,
    dto: UpdateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    const companyId = this.tenantContext.getCompanyId();
    const ticketType = await this.ticketTypesRepository.findById(id, companyId);

    if (!ticketType) {
      throw new NotFoundException('Tipo de ingresso não encontrado');
    }

    const nextName = dto.name?.trim();

    if (nextName && nextName !== ticketType.name) {
      const existing = await this.ticketTypesRepository.findByName(
        companyId,
        nextName,
      );

      if (existing) {
        throw new ConflictException(
          'Já existe um tipo de ingresso com este nome',
        );
      }
    }

    const updated = await this.ticketTypesRepository.update(id, {
      ...(nextName && { name: nextName }),
      ...(dto.description !== undefined && {
        description: dto.description?.trim() || null,
      }),
      ...(dto.discount_percentage !== undefined && {
        discount_percentage: new Prisma.Decimal(dto.discount_percentage),
      }),
    });

    this.logger.log(
      `Ticket type updated: ${updated.name}`,
      TicketTypesService.name,
    );

    return this.mapToDto(updated);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const companyId = this.tenantContext.getCompanyId();
    const ticketType = await this.ticketTypesRepository.findById(id, companyId);

    if (!ticketType) {
      throw new NotFoundException('Tipo de ingresso não encontrado');
    }

    const ticketCount = await this.ticketTypesRepository.countTickets(id);

    if (ticketCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir: ${ticketCount} ingressos já usam este tipo`,
      );
    }

    await this.ticketTypesRepository.delete(id);

    this.logger.log(
      `Ticket type deleted: ${ticketType.name}`,
      TicketTypesService.name,
    );
  }

  private mapToDto(
    ticketType: ticket_types,
    ticketCount?: number,
  ): TicketTypeResponseDto {
    const discountPercentage = Number(ticketType.discount_percentage ?? 0);

    return {
      id: ticketType.id,
      name: ticketType.name,
      description: ticketType.description ?? null,
      discount_percentage: discountPercentage,
      price_modifier: 1 - discountPercentage / 100,
      ...(ticketCount !== undefined && { ticket_count: ticketCount }),
    };
  }
}
