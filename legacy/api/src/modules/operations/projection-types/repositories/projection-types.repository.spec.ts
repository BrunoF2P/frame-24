import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectionTypesRepository } from './projection-types.repository';

describe('ProjectionTypesRepository', () => {
  it('deve converter additional_value para string no retorno', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'projection-1',
        name: 'IMAX',
        description: null,
        additional_value: { toString: () => '20.00' },
      },
    ]);

    const prisma = {
      projection_types: {
        findMany,
      },
    } as unknown as PrismaService;

    const repository = new ProjectionTypesRepository(prisma);

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
        id: 'projection-1',
        name: 'IMAX',
        description: null,
        additional_value: '20.00',
      },
    ]);
  });
});
