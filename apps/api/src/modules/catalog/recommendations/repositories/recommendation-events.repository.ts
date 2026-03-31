import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RecommendationEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: Prisma.recommendation_eventsCreateManyInput[]) {
    return this.prisma.recommendation_events.createMany({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.recommendation_events.findUnique({
      where: { id },
    });
  }

  async markClicked(id: string, clickedAt: Date = new Date()) {
    return this.prisma.recommendation_events.update({
      where: { id },
      data: {
        clicked: true,
        clicked_at: clickedAt,
      },
    });
  }

  async markPurchased(
    id: string,
    saleId: string,
    purchasedAt: Date = new Date(),
  ) {
    return this.prisma.recommendation_events.update({
      where: { id },
      data: {
        purchased: true,
        purchased_at: purchasedAt,
        purchased_sale_id: saleId,
      },
    });
  }

  async findLatestCandidateForPurchase(params: {
    companyCustomerId: string;
    movieId: string;
    showtimeId?: string;
    algorithmVersion?: string;
  }) {
    const { companyCustomerId, movieId, showtimeId, algorithmVersion } = params;
    const where: Prisma.recommendation_eventsWhereInput = {
      company_customer_id: companyCustomerId,
      movie_id: movieId,
      purchased: false,
    };

    if (showtimeId !== undefined) {
      where.showtime_id = showtimeId;
    }

    if (algorithmVersion !== undefined) {
      where.algorithm_version = algorithmVersion;
    }

    return this.prisma.recommendation_events.findFirst({
      where,
      orderBy: {
        recommended_at: 'desc',
      },
    });
  }
}
