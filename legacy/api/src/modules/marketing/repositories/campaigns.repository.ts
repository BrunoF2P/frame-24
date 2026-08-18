import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  promotional_campaigns as Campaign,
  promotional_coupons as Coupon,
  Prisma,
} from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCampaign(
    data: Prisma.promotional_campaignsUncheckedCreateInput,
  ): Promise<Campaign> {
    return this.prisma.promotional_campaigns.create({ data });
  }

  async updateCampaign(
    id: string,
    data: Prisma.promotional_campaignsUpdateInput,
  ): Promise<Campaign> {
    return this.prisma.promotional_campaigns.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.prisma.promotional_campaigns.findUnique({
      where: { id },
      include: {
        promotion_types: true,
      },
    });
  }

  async findByCode(
    companyId: string,
    campaignCode: string,
  ): Promise<Campaign | null> {
    return this.prisma.promotional_campaigns.findFirst({
      where: { company_id: companyId, campaign_code: campaignCode },
      include: {
        promotion_types: true,
      },
    });
  }

  async findAllByCompany(companyId: string): Promise<Campaign[]> {
    return this.prisma.promotional_campaigns.findMany({
      where: { company_id: companyId },
      orderBy: { start_date: 'desc' },
      include: {
        promotion_types: true,
      },
    });
  }

  async createCoupon(
    data: Prisma.promotional_couponsCreateInput,
  ): Promise<Coupon> {
    return this.prisma.promotional_coupons.create({ data });
  }

  async findActiveCouponByCode(
    companyId: string,
    couponCode: string,
  ): Promise<(Coupon & { promotional_campaigns: Campaign }) | null> {
    const now = new Date();
    return this.prisma.promotional_coupons.findFirst({
      where: {
        coupon_code: couponCode,
        active: true,
        used: false,
        start_date: { lte: now },
        end_date: { gte: now },
        promotional_campaigns: {
          company_id: companyId,
          active: true,
        },
      },
      include: {
        promotional_campaigns: true,
      },
    });
  }

  async markCouponAsUsed(coupon_id: string): Promise<void> {
    await this.prisma.promotional_coupons.update({
      where: { id: coupon_id },
      data: {
        used: true,
        used_count: { increment: 1 },
        last_use_date: new Date(),
      },
    });
  }

  async incrementCampaignUsage(campaign_id: string): Promise<void> {
    await this.prisma.promotional_campaigns.update({
      where: { id: campaign_id },
      data: { used_count: { increment: 1 } },
    });
  }

  async createPromotionUsage(
    data: Prisma.promotions_usedUncheckedCreateInput,
  ): Promise<void> {
    await this.prisma.promotions_used.create({ data });
  }

  /**
   * Consolida cupom + contadores sob lock de transação (mesma transação da venda quando propagada pelo CLS).
   */
  async finalizePromotionForSale(params: {
    usageId: string;
    saleId: string;
    result: {
      campaign_id: string;
      coupon_id?: string;
      code: string;
      discount_amount: number;
      original_amount: number;
      final_amount: number;
    };
    customerId?: string;
  }): Promise<void> {
    const { usageId, saleId, result, customerId } = params;

    await this.prisma.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${result.campaign_id}::text))
    `;

    const campaign = await this.prisma.promotional_campaigns.findUnique({
      where: { id: result.campaign_id },
    });
    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    const usedCount = campaign.used_count ?? 0;
    if (
      campaign.max_total_uses != null &&
      usedCount >= campaign.max_total_uses
    ) {
      throw new BadRequestException(
        'Promoção esgotada durante a finalização do pedido',
      );
    }

    if (customerId && campaign.max_uses_per_customer) {
      const usageCnt = await this.prisma.promotions_used.count({
        where: {
          campaign_id: result.campaign_id,
          customer_id: customerId,
        },
      });
      if (usageCnt >= campaign.max_uses_per_customer) {
        throw new BadRequestException(
          'Limite de uso por cliente atingido para esta promoção',
        );
      }
    }

    if (result.coupon_id) {
      const couponUpdate = await this.prisma.promotional_coupons.updateMany({
        where: { id: result.coupon_id, used: false },
        data: {
          used: true,
          used_count: { increment: 1 },
          last_use_date: new Date(),
        },
      });
      if (couponUpdate.count !== 1) {
        throw new ConflictException(
          'Cupom já foi utilizado ou não está mais disponível',
        );
      }
    }

    await this.prisma.promotional_campaigns.update({
      where: { id: result.campaign_id },
      data: { used_count: { increment: 1 } },
    });

    await this.prisma.promotions_used.create({
      data: {
        id: usageId,
        sale_id: saleId,
        campaign_id: result.campaign_id,
        coupon_id: result.coupon_id,
        customer_id: customerId,
        promotion_type_code: result.code,
        discount_applied: result.discount_amount,
        original_value: result.original_amount,
        final_value: result.final_amount,
        usage_date: new Date(),
      },
    });
  }

  async countCustomerUsage(
    campaign_id: string,
    customer_id: string,
  ): Promise<number> {
    return this.prisma.promotions_used.count({
      where: {
        campaign_id,
        customer_id,
      },
    });
  }
}
