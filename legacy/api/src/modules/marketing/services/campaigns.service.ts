import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { CampaignsRepository } from '../repositories/campaigns.repository';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';

export interface PromotionApplicationParams {
  company_id: string;
  promotion_code: string;
  order_amount: number;
  customer_id?: string;
}

export interface PromotionApplicationResult {
  campaign_id: string;
  coupon_id?: string;
  code: string;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly campaignsRepository: CampaignsRepository,
    private readonly snowflake: SnowflakeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(input: CreateCampaignDto) {
    const companyId = this.tenantContext.getCompanyId();
    if (input.end_date <= input.start_date) {
      throw new BadRequestException(
        'Data de término deve ser maior que a data de início',
      );
    }

    const existing = await this.campaignsRepository.findByCode(
      companyId,
      input.campaign_code,
    );
    if (existing) {
      throw new BadRequestException('Código de campanha já utilizado');
    }

    const data = {
      id: this.snowflake.generate(),
      company_id: companyId,
      promotion_type_id: input.promotion_type_id,
      campaign_code: input.campaign_code,
      name: input.name,
      description: input.description,
      start_date: input.start_date,
      end_date: input.end_date,
      active: true,
    };

    return this.campaignsRepository.createCampaign(data);
  }

  async findAll() {
    const companyId = this.tenantContext.getCompanyId();
    return this.campaignsRepository.findAllByCompany(companyId);
  }

  async findOne(id: string) {
    const companyId = this.tenantContext.getCompanyId();
    const campaign = await this.campaignsRepository.findById(id);
    if (!campaign || campaign.company_id !== companyId) {
      throw new NotFoundException('Campanha não encontrada');
    }
    return campaign;
  }

  async activate(id: string) {
    const campaign = await this.findOne(id);
    if (campaign.active) {
      return campaign;
    }
    return this.campaignsRepository.updateCampaign(id, { active: true });
  }

  async pause(id: string) {
    const campaign = await this.findOne(id);
    if (!campaign.active) {
      return campaign;
    }
    return this.campaignsRepository.updateCampaign(id, { active: false });
  }

  async applyPromotion(
    params: PromotionApplicationParams,
  ): Promise<PromotionApplicationResult> {
    const { company_id, promotion_code, order_amount, customer_id } = params;
    const now = new Date();

    const coupon = await this.campaignsRepository.findActiveCouponByCode(
      company_id,
      promotion_code,
    );
    const campaignFromCoupon = coupon?.promotional_campaigns;

    const campaign =
      campaignFromCoupon ??
      (await this.campaignsRepository.findByCode(company_id, promotion_code));

    if (!campaign || !campaign.active) {
      throw new NotFoundException('Promoção não encontrada ou inativa');
    }

    if (now < campaign.start_date || now > campaign.end_date) {
      throw new BadRequestException('Promoção fora do período válido');
    }

    if (campaign.requires_coupon && !coupon) {
      throw new BadRequestException('Esta promoção exige um cupom válido');
    }

    if (
      campaign.min_purchase_value &&
      order_amount < Number(campaign.min_purchase_value)
    ) {
      throw new BadRequestException(
        `Valor mínimo para esta promoção: R$ ${Number(
          campaign.min_purchase_value,
        ).toFixed(2)}`,
      );
    }

    const totalUses = campaign.used_count || 0;
    if (campaign.max_total_uses && totalUses >= campaign.max_total_uses) {
      throw new BadRequestException('Promoção esgotada');
    }

    if (campaign.max_uses_per_customer && customer_id) {
      const usageCount = await this.campaignsRepository.countCustomerUsage(
        campaign.id,
        customer_id,
      );
      if (usageCount >= campaign.max_uses_per_customer) {
        throw new BadRequestException(
          'Limite de uso por cliente atingido para esta promoção',
        );
      }
    }

    let discount = 0;
    if (campaign.discount_value) {
      discount = Number(campaign.discount_value);
    } else if (campaign.discount_percentage) {
      discount = order_amount * (Number(campaign.discount_percentage) / 100);
    } else if (campaign.fixed_price) {
      discount = Math.max(0, order_amount - Number(campaign.fixed_price));
    }

    if (discount <= 0) {
      throw new BadRequestException(
        'Não foi possível calcular o desconto desta promoção',
      );
    }

    discount = Math.min(discount, order_amount);

    return {
      campaign_id: campaign.id,
      coupon_id: coupon?.id,
      code: promotion_code,
      discount_amount: discount,
      original_amount: order_amount,
      final_amount: order_amount - discount,
    };
  }

  async recordPromotionUsage(
    sale_id: string,
    result: PromotionApplicationResult,
    customer_id?: string,
  ): Promise<void> {
    await this.campaignsRepository.finalizePromotionForSale({
      usageId: this.snowflake.generate(),
      saleId: sale_id,
      result,
      customerId: customer_id,
    });
  }
}
