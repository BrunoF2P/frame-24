import { Injectable } from '@nestjs/common';
import { Prisma, rooms as Room } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.roomsCreateInput): Promise<Room> {
    return this.prisma.rooms.create({
      data,
    });
  }

  async update(id: string, data: Prisma.roomsUpdateInput): Promise<Room> {
    return this.prisma.rooms.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<Room> {
    return this.prisma.rooms.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<Room | null> {
    return this.prisma.rooms.findUnique({
      where: { id },
    });
  }

  async findByRoomNumber(
    cinema_complex_id: string,
    room_number: string,
  ): Promise<Room | null> {
    return this.prisma.rooms.findUnique({
      where: {
        cinema_complex_id_room_number: {
          cinema_complex_id,
          room_number,
        },
      },
    });
  }

  async findAllByComplex(cinema_complex_id: string): Promise<Room[]> {
    return this.prisma.rooms.findMany({
      where: { cinema_complex_id },
    });
  }
}
