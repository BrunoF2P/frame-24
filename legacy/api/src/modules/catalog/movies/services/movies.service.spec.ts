import { ForbiddenException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SupplierRepository } from 'src/modules/inventory/suppliers/repositories/supplier.repository';
import { MovieRepository } from '../repositories/movie.repository';
import { MoviesService } from './movies.service';

describe('MoviesService', () => {
  const repository = {
    findByCompanyLite: jest.fn(),
    findCastTypes: jest.fn(),
    findMediaTypes: jest.fn(),
    findAgeRatings: jest.fn(),
  } as unknown as jest.Mocked<MovieRepository>;

  const suppliers = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<SupplierRepository>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new MoviesService(repository, suppliers, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve listar filmes da empresa do contexto', async () => {
    repository.findByCompanyLite.mockResolvedValue([{ id: 'movie-1' }] as any);

    const result = await service.findAll();

    expect(repository.findByCompanyLite).toHaveBeenCalledWith('company-123');
    expect(result).toEqual([{ id: 'movie-1' }]);
  });

  it('deve buscar catálogos auxiliares usando company_id do contexto', async () => {
    repository.findCastTypes.mockResolvedValue([{ id: 'cast-1' }] as any);
    repository.findMediaTypes.mockResolvedValue([{ id: 'media-1' }] as any);
    repository.findAgeRatings.mockResolvedValue([{ id: 'age-1' }] as any);

    await service.getCastTypes();
    await service.getMediaTypes();
    await service.getAgeRatings();

    expect(repository.findCastTypes).toHaveBeenCalledWith('company-123');
    expect(repository.findMediaTypes).toHaveBeenCalledWith('company-123');
    expect(repository.findAgeRatings).toHaveBeenCalledWith('company-123');
  });

  it('deve lançar erro quando company_id não existe no contexto', async () => {
    cls.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
