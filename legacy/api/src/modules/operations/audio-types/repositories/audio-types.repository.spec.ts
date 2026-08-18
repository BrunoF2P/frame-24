import { PrismaService } from 'src/prisma/prisma.service';
import { AudioTypesRepository } from './audio-types.repository';

describe('AudioTypesRepository', () => {
  it('deve converter additional_value para string no retorno', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'audio-1',
        name: 'Dolby Atmos',
        description: null,
        additional_value: { toString: () => '12.50' },
      },
      {
        id: 'audio-2',
        name: 'Stereo',
        description: 'Padrao',
        additional_value: null,
      },
    ]);

    const prisma = {
      audio_types: {
        findMany,
      },
    } as unknown as PrismaService;

    const repository = new AudioTypesRepository(prisma);

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
        id: 'audio-1',
        name: 'Dolby Atmos',
        description: null,
        additional_value: '12.50',
      },
      {
        id: 'audio-2',
        name: 'Stereo',
        description: 'Padrao',
        additional_value: null,
      },
    ]);
  });
});
