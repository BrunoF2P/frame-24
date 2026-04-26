import { Injectable } from '@nestjs/common';
import { customers, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';

@Injectable()
export class CustomersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findByEmail(email: string): Promise<customers | null> {
    return this.prisma.customers.findFirst({
      where: { email },
    });
  }

  async findByCpf(cpf: string): Promise<customers | null> {
    return this.prisma.customers.findFirst({
      where: { cpf },
    });
  }

  async findById(id: string): Promise<customers | null> {
    return this.prisma.customers.findUnique({
      where: { id },
      include: {
        company_customers: true,
      },
    });
  }

  async findByIdentityId(identity_id: string): Promise<customers | null> {
    return this.prisma.customers.findUnique({
      where: { identity_id },
      include: {
        company_customers: true,
      },
    });
  }

  async create(data: Prisma.customersCreateInput): Promise<customers> {
    return this.prisma.customers.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.customersUpdateInput,
  ): Promise<customers> {
    return this.prisma.customers.update({
      where: { id },
      data,
    });
  }
}
