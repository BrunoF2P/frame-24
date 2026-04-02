import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { Prisma, rooms as Room } from '@repo/db';
import { Transactional } from '@nestjs-cls/transactional';

import { SnowflakeService } from 'src/common/services/snowflake.service';
import { RabbitMQPublisherService } from 'src/common/rabbitmq/rabbitmq-publisher.service';
import { StorageService } from 'src/modules/storage/storage.service';

import { CreateRoomDto } from '../dto/create-room.dto';
import { RoomsRepository } from '../repositories/rooms.repository';
import { SeatsRepository } from '../../seats/repositories/seats.repository';
import { CinemaComplexesRepository } from '../../cinema-complexes/repositories/cinema-complexes.repository';
import { AudioTypesRepository } from '../../audio-types/repositories/audio-types.repository';
import { ProjectionTypesRepository } from '../../projection-types/repositories/projection-types.repository';
import { SeatTypesRepository } from '../../seat-types/repositories/seat-types.repository';
import { UpdateRoomDto } from 'src/modules/operations/rooms/dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly cinemaComplexesRepository: CinemaComplexesRepository,
    private readonly audioTypesRepository: AudioTypesRepository,
    private readonly projectionTypesRepository: ProjectionTypesRepository,
    private readonly seatTypesRepository: SeatTypesRepository,
    private readonly snowflake: SnowflakeService,
    private readonly rabbitmq: RabbitMQPublisherService,
    private readonly storageService: StorageService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Transactional()
  async create(
    cinemaComplexId: string,
    dto: CreateRoomDto,
    file?: Express.Multer.File,
  ): Promise<Room> {
    const companyId = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getUserId();
    await this.validateDependencies(dto, cinemaComplexId, companyId);

    const roomId = this.snowflake.generate();

    const seatsToCreate: Prisma.seatsCreateManyInput[] = [];
    let calculatedCapacity = 0;

    for (const row of dto.seat_layout) {
      for (const seat of row.seats) {
        calculatedCapacity++;
        seatsToCreate.push({
          id: this.snowflake.generate(),
          room_id: roomId,
          seat_type: seat.seat_type_id,
          row_code: row.row_code,
          column_number: seat.column_number,
          seat_code: `${row.row_code}${seat.column_number}`,
          accessible: seat.accessible,
          active: true,
        });
      }
    }

    // Garantir que capacity é número (caso venha como string do multipart)
    const capacity = Number(dto.capacity);

    if (capacity !== calculatedCapacity) {
      throw new BadRequestException(
        `A capacidade informada (${capacity}) não corresponde ao número de assentos no layout (${calculatedCapacity}).`,
      );
    }

    // Upload layout image if provided
    let layout_image = dto.layout_image;
    if (file) {
      layout_image = await this.storageService.uploadFile(file, 'cinema-rooms');
    }

    const roomData: Prisma.roomsCreateInput = {
      id: roomId,
      cinema_complexes: {
        connect: {
          id: cinemaComplexId,
        },
      },
      room_number: dto.room_number,
      name: dto.name,
      capacity: calculatedCapacity,
      ...(dto.audio_type_id && {
        audio_types: {
          connect: { id: dto.audio_type_id },
        },
      }),
      ...(dto.projection_type_id && {
        projection_types: {
          connect: { id: dto.projection_type_id },
        },
      }),
      seat_layout: JSON.stringify(dto.seat_layout),
      room_design: dto.room_design,
      layout_image,
      active: dto.active,
    };

    const newRoom = await this.roomsRepository.create(roomData);
    if (seatsToCreate.length > 0) {
      await this.seatsRepository.createMany(seatsToCreate);
    }

    void this.rabbitmq.publish({
      pattern: 'audit.room.created',
      data: {
        id: newRoom.id,
        new_values: { ...newRoom, seat_layout: dto.seat_layout },
      },
      metadata: { companyId, userId },
    });

    return newRoom;
  }

  private async validateDependencies(
    dto: CreateRoomDto,
    cinemaComplexId: string,
    companyId: string,
  ): Promise<void> {
    const complex =
      await this.cinemaComplexesRepository.findById(cinemaComplexId);
    if (!complex || complex.company_id !== companyId) {
      throw new NotFoundException('Complexo de cinema não encontrado.');
    }

    const existingRoom = await this.roomsRepository.findByRoomNumber(
      cinemaComplexId,
      dto.room_number,
    );
    if (existingRoom) {
      throw new ConflictException(
        `Uma sala com o número '${dto.room_number}' já existe neste complexo.`,
      );
    }

    if (dto.audio_type_id) {
      const audioType = await this.audioTypesRepository.findById(
        dto.audio_type_id,
      );
      if (!audioType || audioType.company_id !== companyId)
        throw new BadRequestException('Tipo de áudio inválido.');
    }

    if (dto.projection_type_id) {
      const projectionType = await this.projectionTypesRepository.findById(
        dto.projection_type_id,
      );
      if (!projectionType || projectionType.company_id !== companyId)
        throw new BadRequestException('Tipo de projeção inválido.');
    }

    const seatTypeIds = [
      ...new Set(
        dto.seat_layout.flatMap((row) =>
          row.seats.map((seat) => seat.seat_type_id).filter(Boolean),
        ),
      ),
    ];

    if (seatTypeIds.length > 0) {
      const foundSeatTypes = await this.seatTypesRepository.findByIds(
        seatTypeIds as string[],
        companyId,
      );
      if (foundSeatTypes.length !== seatTypeIds.length) {
        throw new BadRequestException(
          'Um ou mais tipos de assento são inválidos.',
        );
      }
    }
  }

  async findAll(cinemaComplexId: string): Promise<Room[]> {
    const companyId = this.tenantContext.getCompanyId();
    const complex =
      await this.cinemaComplexesRepository.findById(cinemaComplexId);
    if (!complex || complex.company_id !== companyId) {
      throw new NotFoundException('Complexo de cinema não encontrado.');
    }
    return this.roomsRepository.findAllByComplex(cinemaComplexId);
  }

  async findOne(id: string): Promise<Room> {
    const companyId = this.tenantContext.getCompanyId();
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }
    const complex = await this.cinemaComplexesRepository.findById(
      room.cinema_complex_id,
    );
    if (!complex || complex.company_id !== companyId) {
      throw new NotFoundException('Sala não encontrada.');
    }
    return room;
  }

  @Transactional()
  async update(
    id: string,
    dto: UpdateRoomDto,
    file?: Express.Multer.File,
  ): Promise<Room> {
    const companyId = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getUserId();
    const existingRoom = await this.findOne(id);

    if (dto.room_number && dto.room_number !== existingRoom.room_number) {
      const conflict = await this.roomsRepository.findByRoomNumber(
        existingRoom.cinema_complex_id,
        dto.room_number,
      );
      if (conflict) {
        throw new ConflictException(
          `Uma sala com o número '${dto.room_number}' já existe neste complexo.`,
        );
      }
    }

    let calculatedCapacity: number | undefined;

    if (dto.seat_layout) {
      await this.seatsRepository.deleteMany({ room_id: id });

      const seatsToCreate: Prisma.seatsCreateManyInput[] = [];
      calculatedCapacity = 0;
      for (const row of dto.seat_layout) {
        for (const seat of row.seats) {
          calculatedCapacity++;
          seatsToCreate.push({
            id: this.snowflake.generate(),
            room_id: id,
            seat_type: seat.seat_type_id,
            row_code: row.row_code,
            column_number: seat.column_number,
            seat_code: `${row.row_code}${seat.column_number}`,
            accessible: seat.accessible,
            active: true,
          });
        }
      }

      const capacityForCheck = dto.capacity ?? existingRoom.capacity;
      if (capacityForCheck !== calculatedCapacity) {
        throw new BadRequestException(
          `A capacidade informada (${capacityForCheck}) não corresponde ao novo layout (${calculatedCapacity}).`,
        );
      }

      if (seatsToCreate.length > 0) {
        await this.seatsRepository.createMany(seatsToCreate);
      }
    }

    // Handle layout image upload
    let layout_image = dto.layout_image;
    if (file) {
      // Delete old image if exists
      if (existingRoom.layout_image) {
        await this.storageService.deleteFile(existingRoom.layout_image);
      }
      // Upload new image
      layout_image = await this.storageService.uploadFile(file, 'cinema-rooms');
    }

    const updateData: Prisma.roomsUpdateInput = {
      room_number: dto.room_number,
      name: dto.name,
      active: dto.active,
      room_design: dto.room_design,
      ...(layout_image !== undefined && { layout_image }),
      ...(dto.seat_layout && {
        seat_layout: JSON.stringify(dto.seat_layout),
        capacity: calculatedCapacity,
      }),
      ...(!dto.seat_layout && dto.capacity && { capacity: dto.capacity }),
      ...(dto.audio_type_id && {
        audio_types: { connect: { id: dto.audio_type_id } },
      }),
      ...(dto.projection_type_id && {
        projection_types: { connect: { id: dto.projection_type_id } },
      }),
    };

    const updatedRoom = await this.roomsRepository.update(id, updateData);

    void this.rabbitmq.publish({
      pattern: 'audit.room.updated',
      data: {
        id: updatedRoom.id,
        new_values: updatedRoom,
        old_values: existingRoom,
      },
      metadata: { companyId, userId },
    });

    return updatedRoom;
  }

  @Transactional()
  async delete(id: string): Promise<{ message: string }> {
    const companyId = this.tenantContext.getCompanyId();
    const userId = this.tenantContext.getUserId();
    const existingRoom = await this.findOne(id); // Valida a posse

    await this.roomsRepository.remove(id);

    void this.rabbitmq.publish({
      pattern: 'audit.room.deleted',
      data: { id: existingRoom.id, old_values: existingRoom },
      metadata: { companyId, userId },
    });

    return { message: 'Sala deletada com sucesso.' };
  }
}
