import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { CompanyCustomersRepository } from 'src/modules/crm/repositories/company-customers.repository';
import { RecommendationEventsRepository } from '../repositories/recommendation-events.repository';

export type RecommendationServingItem = {
  movieId: string;
  position: number;
  score?: number | null;
  showtimeId?: string | null;
};

export type RecordRecommendationBatchInput = {
  companyCustomerId?: string | null;
  algorithmVersion: string;
  modelName?: string | null;
  featureVersion?: string | null;
  context?: string | null;
  recommendedAt?: Date;
  items: RecommendationServingItem[];
};

@Injectable()
export class RecommendationEventsService {
  constructor(
    private readonly recommendationEventsRepository: RecommendationEventsRepository,
    private readonly companyCustomersRepository: CompanyCustomersRepository,
  ) {}

  async recordBatch(input: RecordRecommendationBatchInput) {
    if (input.items.length === 0) {
      return { count: 0 };
    }

    const recommendedAt = input.recommendedAt ?? new Date();

    const data: Prisma.recommendation_eventsCreateManyInput[] = input.items.map(
      (item) => ({
        company_customer_id: input.companyCustomerId ?? null,
        movie_id: item.movieId,
        showtime_id: item.showtimeId ?? null,
        algorithm_version: input.algorithmVersion,
        model_name: input.modelName ?? null,
        feature_version: input.featureVersion ?? null,
        score:
          item.score != null
            ? new Prisma.Decimal(Number(item.score).toFixed(6))
            : null,
        position: item.position,
        context: input.context ?? null,
        recommended_at: recommendedAt,
      }),
    );

    return this.recommendationEventsRepository.createMany(data);
  }

  async markClicked(eventId: string, clickedAt?: Date) {
    return this.recommendationEventsRepository.markClicked(
      eventId,
      clickedAt ?? new Date(),
    );
  }

  async markPurchased(params: {
    eventId: string;
    saleId: string;
    purchasedAt?: Date;
  }) {
    return this.recommendationEventsRepository.markPurchased(
      params.eventId,
      params.saleId,
      params.purchasedAt ?? new Date(),
    );
  }

  async markLatestMatchingRecommendationPurchased(params: {
    customerId: string;
    companyId: string;
    movieId: string;
    saleId: string;
    showtimeId?: string;
    algorithmVersion?: string;
    purchasedAt?: Date;
  }) {
    const companyCustomer =
      await this.companyCustomersRepository.findByCompanyAndCustomer(
        params.companyId,
        params.customerId,
      );

    if (!companyCustomer) {
      return null;
    }

    const event =
      await this.recommendationEventsRepository.findLatestCandidateForPurchase({
        companyCustomerId: companyCustomer.id,
        movieId: params.movieId,
        showtimeId: params.showtimeId,
        algorithmVersion: params.algorithmVersion,
      });

    if (!event) {
      return null;
    }

    return this.recommendationEventsRepository.markPurchased(
      event.id,
      params.saleId,
      params.purchasedAt ?? new Date(),
    );
  }
}
