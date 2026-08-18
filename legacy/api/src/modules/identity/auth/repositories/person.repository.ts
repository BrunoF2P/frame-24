import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { Person } from '../domain/entities/person.entity';
import { PersonMapper } from 'src/modules/identity/auth/infraestructure/mappers/person.mapper';

@Injectable()
export class PersonRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(id: string): Promise<Person | null> {
    const raw = await this.prisma.persons.findUnique({
      where: { id },
    });

    return raw ? PersonMapper.toDomain(raw) : null;
  }

  async findByCpf(cpf: string): Promise<Person | null> {
    const raw = await this.prisma.persons.findUnique({
      where: { cpf },
    });

    return raw ? PersonMapper.toDomain(raw) : null;
  }

  async create(
    fullName: string,
    email?: string,
    mobile?: string,
  ): Promise<Person> {
    const raw = await this.prisma.persons.create({
      data: {
        id: this.snowflake.generate(),
        full_name: fullName,
        email,
        mobile,
      },
    });

    return PersonMapper.toDomain(raw);
  }

  async createPerson(data: {
    fullName: string;
    cpf?: string;
    birthDate?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    zipCode?: string;
    streetAddress?: string;
    addressNumber?: string;
    addressComplement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
  }): Promise<Person> {
    const raw = await this.prisma.persons.create({
      data: {
        id: this.snowflake.generate(),
        full_name: data.fullName,
        cpf: data.cpf,
        birth_date: data.birthDate ? new Date(data.birthDate) : undefined,
        phone: data.phone,
        mobile: data.mobile,
        email: data.email,
        zip_code: data.zipCode,
        street_address: data.streetAddress,
        address_number: data.addressNumber,
        address_complement: data.addressComplement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        country: data.country,
      },
    });

    return PersonMapper.toDomain(raw);
  }

  async updatePersonData(
    id: string,
    data: {
      fullName?: string;
      cpf?: string;
      birthDate?: string;
      phone?: string;
      mobile?: string;
      email?: string;
      zipCode?: string;
      streetAddress?: string;
      addressNumber?: string;
      addressComplement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      country?: string;
    },
  ): Promise<Person> {
    const raw = await this.prisma.persons.update({
      where: { id },
      data: {
        ...(data.fullName && { full_name: data.fullName }),
        ...(data.cpf && { cpf: data.cpf }),
        ...(data.birthDate && { birth_date: new Date(data.birthDate) }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.zipCode !== undefined && { zip_code: data.zipCode }),
        ...(data.streetAddress !== undefined && {
          street_address: data.streetAddress,
        }),
        ...(data.addressNumber !== undefined && {
          address_number: data.addressNumber,
        }),
        ...(data.addressComplement !== undefined && {
          address_complement: data.addressComplement,
        }),
        ...(data.neighborhood !== undefined && {
          neighborhood: data.neighborhood,
        }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.country !== undefined && { country: data.country }),
      },
    });

    return PersonMapper.toDomain(raw);
  }

  async delete(id: string): Promise<Person> {
    const raw = await this.prisma.persons.delete({
      where: { id },
    });

    return PersonMapper.toDomain(raw);
  }
}
