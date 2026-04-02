import { SlugService } from './slug.service';

describe('SlugService', () => {
  let service: SlugService;

  beforeEach(() => {
    service = new SlugService();
  });

  it('should normalize accents, spaces and special chars in generateBase', () => {
    const slug = service.generateBase('  Açaí   com  Leite!!!  ');

    expect(slug).toBe('acai-com-leite');
  });

  it('should return empty slug when text has no alphanumeric chars', () => {
    const slug = service.generateBase('@@@ ### !!!');

    expect(slug).toBe('');
  });

  it('should return base slug when it is unique', async () => {
    const model = {
      findFirst: jest.fn().mockResolvedValue(null),
    };

    const slug = await service.createUniqueSlug(model, 'Meu Produto');

    expect(slug).toBe('meu-produto');
    expect(model.findFirst).toHaveBeenCalledWith({
      where: { slug: 'meu-produto' },
      select: { id: true },
    });
  });

  it('should append incremental suffix when collisions happen', async () => {
    const model = {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce({ id: 'existing-base' })
        .mockResolvedValueOnce({ id: 'existing-1' })
        .mockResolvedValueOnce(null),
    };

    const slug = await service.createUniqueSlug(model, 'Meu Produto');

    expect(slug).toBe('meu-produto-2');
    expect(model.findFirst).toHaveBeenNthCalledWith(1, {
      where: { slug: 'meu-produto' },
      select: { id: true },
    });
    expect(model.findFirst).toHaveBeenNthCalledWith(2, {
      where: { slug: 'meu-produto-1' },
      select: { id: true },
    });
    expect(model.findFirst).toHaveBeenNthCalledWith(3, {
      where: { slug: 'meu-produto-2' },
      select: { id: true },
    });
  });

  it('should include excludeId and extraCriteria in uniqueness checks', async () => {
    const model = {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce({ id: 'existing-base' })
        .mockResolvedValueOnce(null),
    };

    await service.createUniqueSlug(model, 'Cinema Central', 'movie-1', 'slug', {
      company_id: 'company-1',
    });

    expect(model.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        slug: 'cinema-central',
        id: { not: 'movie-1' },
        company_id: 'company-1',
      },
      select: { id: true },
    });
    expect(model.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        slug: 'cinema-central-1',
        id: { not: 'movie-1' },
        company_id: 'company-1',
      },
      select: { id: true },
    });
  });

  it('should throw when unique slug cannot be generated after max attempts', async () => {
    const model = {
      findFirst: jest.fn().mockResolvedValue({ id: 'exists' }),
    };

    await expect(service.createUniqueSlug(model, 'Produto')).rejects.toThrow(
      'Não foi possível gerar um slug único após várias tentativas.',
    );
    expect(model.findFirst).toHaveBeenCalledTimes(1001);
  });
});
