import { Injectable } from '@nestjs/common';
import { sales, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { randomUUID } from 'crypto';

export type SaleWithBasicRelations = Prisma.salesGetPayload<{
  include: {
    tickets: true;
    sale_types: true;
    payment_methods: true;
    sale_status: true;
    promotions_used: true;
  };
}>;

export type SaleWithFullRelations = Prisma.salesGetPayload<{
  include: {
    tickets: true;
    concession_sales: {
      include: {
        concession_sale_items: true;
      };
    };
    promotions_used: true;
    sale_types: true;
    payment_methods: true;
    sale_status: true;
  };
}>;

export type SaleWithCreateRelations = Prisma.salesGetPayload<{
  include: {
    tickets: true;
    concession_sales: {
      include: {
        concession_sale_items: true;
      };
    };
    promotions_used: true;
  };
}>;

type CreateSaleInput = Omit<Prisma.salesCreateInput, 'public_reference'> & {
  public_reference?: string;
};

@Injectable()
export class SalesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
  ) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<SaleWithFullRelations | null> {
    // Buscar complexos da empresa
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id },
      select: { id: true },
    });
    const complexIds = complexes.map((c) => c.id);

    return this.prisma.sales.findFirst({
      where: {
        id,
        cinema_complex_id: { in: complexIds },
      },
      include: {
        tickets: true,
        concession_sales: {
          include: {
            concession_sale_items: true,
          },
        },
        promotions_used: true,
        sale_types: true,
        payment_methods: true,
        sale_status: true,
      },
    });
  }

  async findBySaleNumber(
    sale_number: string,
    company_id: string,
  ): Promise<sales | null> {
    // Buscar complexos da empresa
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id },
      select: { id: true },
    });
    const complexIds = complexes.map((c) => c.id);

    return this.prisma.sales.findFirst({
      where: {
        sale_number,
        cinema_complex_id: { in: complexIds },
      },
    });
  }

  async findAll(
    company_id: string,
    filters?: {
      cinema_complex_id?: string;
      customer_id?: string;
      start_date?: Date;
      end_date?: Date;
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<SaleWithBasicRelations[]> {
    // Buscar complexos da empresa
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id },
      select: { id: true },
    });
    const complexIds = complexes.map((c) => c.id);

    const where: Prisma.salesWhereInput = {
      cinema_complex_id: { in: complexIds },
      ...(filters?.cinema_complex_id && {
        cinema_complex_id: filters.cinema_complex_id,
      }),
      ...(filters?.customer_id && { customer_id: filters.customer_id }),
      ...(filters?.start_date &&
        filters?.end_date && {
          sale_date: {
            gte: filters.start_date,
            lte: filters.end_date,
          },
        }),
      ...(filters?.status && { status: filters.status }),
    };

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    return this.prisma.sales.findMany({
      where,
      skip,
      take: limit,
      include: {
        tickets: true,
        sale_types: true,
        payment_methods: true,
        sale_status: true,
        promotions_used: true,
      },
      orderBy: {
        sale_date: 'desc',
      },
    });
  }

  async findByPublicReference(
    company_id: string,
    public_reference: string,
  ): Promise<SaleWithFullRelations | null> {
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id },
      select: { id: true },
    });
    const complexIds = complexes.map((c) => c.id);

    return this.prisma.sales.findFirst({
      where: {
        public_reference,
        cinema_complex_id: { in: complexIds },
      },
      include: {
        tickets: true,
        concession_sales: {
          include: {
            concession_sale_items: true,
          },
        },
        promotions_used: true,
        sale_types: true,
        payment_methods: true,
        sale_status: true,
      },
    });
  }

  async create(data: CreateSaleInput): Promise<SaleWithCreateRelations> {
    return this.prisma.sales.create({
      data: {
        id: this.snowflake.generate(),
        ...data,
        public_reference: data.public_reference ?? randomUUID(),
      },
      include: {
        tickets: true,
        concession_sales: {
          include: {
            concession_sale_items: true,
          },
        },
        promotions_used: true,
      },
    });
  }

  async findPaymentMethodById(id: string, company_id: string) {
    return this.prisma.payment_methods.findFirst({
      where: {
        id,
        company_id,
      },
    });
  }

  async findSaleTypeById(id: string, company_id: string) {
    return this.prisma.sale_types.findFirst({
      where: {
        id,
        company_id,
      },
    });
  }

  async findSaleTypeByName(company_id: string, name: string) {
    return this.prisma.sale_types.findFirst({
      where: {
        company_id,
        name,
      },
    });
  }

  async createSaleType(data: {
    company_id: string;
    name: string;
    description?: string;
    convenience_fee?: number;
  }) {
    return this.prisma.sale_types.create({
      data: {
        id: this.snowflake.generate(),
        company_id: data.company_id,
        name: data.name,
        description: data.description,
        convenience_fee: data.convenience_fee ?? 0,
      },
    });
  }

  async findSaleStatusByName(company_id: string, name: string) {
    return this.prisma.sale_status.findFirst({
      where: {
        company_id,
        name,
      },
    });
  }

  async createSaleStatus(data: {
    company_id: string;
    name: string;
    description?: string;
    allows_modification?: boolean;
  }) {
    return this.prisma.sale_status.create({
      data: {
        id: this.snowflake.generate(),
        company_id: data.company_id,
        name: data.name,
        description: data.description,
        allows_modification: data.allows_modification ?? false,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.salesUpdateInput,
  ): Promise<SaleWithCreateRelations> {
    return this.prisma.sales.update({
      where: { id },
      data,
      include: {
        tickets: true,
        concession_sales: {
          include: {
            concession_sale_items: true,
          },
        },
        promotions_used: true,
      },
    });
  }

  async generateSaleNumber(company_id: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `V${year}${month}`;

    // Buscar complexos da empresa
    const complexes = await this.prisma.cinema_complexes.findMany({
      where: { company_id },
      select: { id: true },
    });
    const complexIds = complexes.map((c) => c.id);

    const lastSale = await this.prisma.sales.findFirst({
      where: {
        sale_number: {
          startsWith: prefix,
        },
        cinema_complex_id: { in: complexIds },
      },
      orderBy: {
        sale_number: 'desc',
      },
    });

    let sequence = 1;
    if (lastSale?.sale_number) {
      const lastSequence = parseInt(
        lastSale.sale_number.substring(prefix.length),
        10,
      );
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }
}
