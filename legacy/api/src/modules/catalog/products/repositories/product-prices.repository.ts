import { Injectable } from '@nestjs/common';
import { product_prices } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductPricesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePrice(
    product_id: string,
    complex_id: string | null,
    company_id: string,
    date: Date = new Date(),
  ): Promise<product_prices | null> {
    // Primeiro tenta buscar preço específico do complexo
    if (complex_id) {
      const complexPrice = await this.prisma.product_prices.findFirst({
        where: {
          product_id,
          complex_id,
          company_id,
          active: true,
          valid_from: { lte: date },
          OR: [{ valid_to: null }, { valid_to: { gte: date } }],
        },
        orderBy: {
          valid_from: 'desc',
        },
      });

      if (complexPrice) {
        return complexPrice;
      }
    }

    // Se não encontrou preço específico, busca preço geral (complex_id = null)
    return this.prisma.product_prices.findFirst({
      where: {
        product_id,
        complex_id: null,
        company_id,
        active: true,
        valid_from: { lte: date },
        OR: [{ valid_to: null }, { valid_to: { gte: date } }],
      },
      orderBy: {
        valid_from: 'desc',
      },
    });
  }

  async findActivePricesByProductIds(
    product_ids: string[],
    complex_id: string | null,
    company_id: string,
    date: Date = new Date(),
  ): Promise<product_prices[]> {
    // Busca todos os preços ativos para os produtos
    const prices = await this.prisma.product_prices.findMany({
      where: {
        product_id: { in: product_ids },
        company_id,
        active: true,
        valid_from: { lte: date },
        OR: [{ valid_to: null }, { valid_to: { gte: date } }],
        // Filtra por complexo ou geral
        AND: [
          {
            OR: [{ complex_id: complex_id }, { complex_id: null }],
          },
        ],
      },
      orderBy: [
        { product_id: 'asc' },
        // Prioriza preço específico (com complex_id) sobre geral (null)
        // Como null vem por último ou primeiro dependendo do banco, melhor ordenar por valid_from
        { valid_from: 'desc' },
      ],
    });

    // Filtrar em memória para garantir prioridade (complexo > geral)
    const priceMap = new Map<string, product_prices>();

    for (const price of prices) {
      if (!priceMap.has(price.product_id)) {
        priceMap.set(price.product_id, price);
      } else {
        const existing = priceMap.get(price.product_id)!;
        // Se já temos um preço, só substituímos se o atual for específico e o existente for geral
        if (price.complex_id && !existing.complex_id) {
          priceMap.set(price.product_id, price);
        }
      }
    }

    return Array.from(priceMap.values());
  }
}
