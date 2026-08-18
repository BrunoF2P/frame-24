import { Injectable } from '@nestjs/common';
import { combos, Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

type ComboWithProducts = Prisma.combosGetPayload<{
  include: {
    combo_products: {
      include: {
        products: true;
      };
    };
  };
}>;

@Injectable()
export class CombosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    company_id: string,
  ): Promise<ComboWithProducts | null> {
    return this.prisma.combos.findFirst({
      where: {
        id,
        company_id,
        active: true,
      },
      include: {
        combo_products: {
          include: {
            products: true,
          },
        },
      },
    });
  }

  async findByComboCode(
    combo_code: string,
    company_id: string,
  ): Promise<combos | null> {
    return this.prisma.combos.findFirst({
      where: {
        combo_code,
        company_id,
        active: true,
      },
    });
  }

  async countActiveByIdsForCompany(
    company_id: string,
    ids: string[],
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    return this.prisma.combos.count({
      where: {
        company_id,
        id: { in: ids },
        active: true,
      },
    });
  }

  async getComboPrice(
    combo_id: string,
    company_id: string,
    date: Date = new Date(),
  ): Promise<number> {
    const combo = await this.findById(combo_id, company_id);

    if (!combo) {
      throw new Error('Combo não encontrado');
    }

    // Verificar se está em promoção
    if (
      combo.promotional_price &&
      combo.promotion_start_date &&
      combo.promotion_end_date &&
      date >= combo.promotion_start_date &&
      date <= combo.promotion_end_date
    ) {
      return Number(combo.promotional_price);
    }

    return Number(combo.sale_price);
  }
}
