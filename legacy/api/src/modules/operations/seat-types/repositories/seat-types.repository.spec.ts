import { PrismaService } from 'src/prisma/prisma.service';
import { SeatTypesRepository } from './seat-types.repository';

describe('SeatTypesRepository', () => {
  it('deve converter additional_value para string no retorno', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'seat-type-1',
        name: 'VIP',
        description: 'Assento premium',
        additional_value: { toString: () => '8.00' },
      },
    ]);

    const prisma = {
      seat_types: {
        findMany,
      },
    } as unknown as PrismaService;

    const repository = new SeatTypesRepository(prisma);

    const result = await repository.findAllByCompany('company-123');

    expect(findMany).toHaveBeenCalledWith({
      where: { company_id: 'company-123' },
      select: {
        id: true,
        name: true,
        description: true,
        additional_value: true,
      },
    });

    expect(result).toEqual([
      {
        id: 'seat-type-1',
        name: 'VIP',
        description: 'Assento premium',
        additional_value: '8.00',
      },
    ]);
  });
});
