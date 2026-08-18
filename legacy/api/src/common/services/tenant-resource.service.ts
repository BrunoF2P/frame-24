import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TenantResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCustomerLinkedToCompany(
    companyId: string,
    customerId: string,
  ): Promise<void> {
    const link = await this.prisma.company_customers.findUnique({
      where: {
        company_id_customer_id: {
          company_id: companyId,
          customer_id: customerId,
        },
      },
      select: { id: true },
    });
    if (!link) {
      throw new ForbiddenException(
        'Cliente não está vinculado à empresa atual ou não existe',
      );
    }
  }

  async assertCinemaComplexBelongsToCompany(
    companyId: string,
    cinemaComplexId: string,
  ): Promise<void> {
    const row = await this.prisma.cinema_complexes.findFirst({
      where: { id: cinemaComplexId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new ForbiddenException(
        'Complexo de cinema não pertence à empresa atual',
      );
    }
  }

  async assertMovieBelongsToCompany(
    companyId: string,
    movieId: string,
  ): Promise<void> {
    const row = await this.prisma.movies.findFirst({
      where: { id: movieId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new ForbiddenException('Filme não pertence à empresa atual');
    }
  }

  async assertRoomBelongsToCompany(
    companyId: string,
    roomId: string,
  ): Promise<void> {
    const row = await this.prisma.rooms.findFirst({
      where: {
        id: roomId,
        cinema_complexes: { company_id: companyId },
      },
      select: { id: true },
    });
    if (!row) {
      throw new ForbiddenException('Sala não pertence à empresa atual');
    }
  }
}
