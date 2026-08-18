import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { pos_payment_methods } from '@repo/db';

@Injectable()
export class PosPaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<pos_payment_methods | null> {
    return this.prisma.pos_payment_methods.findFirst({
      where: { id, company_id },
    });
  }

  async findByName(
    company_id: string,
    name: string,
  ): Promise<pos_payment_methods | null> {
    return this.prisma.pos_payment_methods.findFirst({
      where: { company_id, name },
    });
  }

  async findAll(company_id: string): Promise<pos_payment_methods[]> {
    return this.prisma.pos_payment_methods.findMany({
      where: { company_id },
      orderBy: { name: 'asc' },
    });
  }
}
