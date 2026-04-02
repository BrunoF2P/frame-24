import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { ExhibitionContractsRepository } from '../repositories/exhibition-contracts.repository';
import { ExhibitionContractsService } from './exhibition-contracts.service';

describe('ExhibitionContractsService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    deactivate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<ExhibitionContractsRepository>;

  const movieRepository = {
    findById: jest.fn(),
  } as any;

  const cinemaComplexesRepository = {
    findById: jest.fn(),
    findAllByCompany: jest.fn(),
  } as any;

  const supplierRepository = {
    findById: jest.fn(),
  } as any;

  const contractTypesRepository = {
    findById: jest.fn(),
  } as any;

  const snowflake = {
    generate: jest.fn(),
  } as unknown as jest.Mocked<SnowflakeService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new ExhibitionContractsService(
    repository,
    movieRepository,
    cinemaComplexesRepository,
    supplierRepository,
    contractTypesRepository,
    snowflake,
    cls,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    cls.getCompanyId.mockReturnValue('company-123');
    snowflake.generate.mockReturnValue('id-1');
  });

  it('deve listar usando company_id do contexto', async () => {
    repository.findAll.mockResolvedValue([{ id: 'ec-1' }] as any);

    const result = await service.findAll({ active: true });

    expect(repository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        cinema_complexes: { company_id: 'company-123' },
        active: true,
      }),
    );
    expect(result).toEqual([{ id: 'ec-1' }]);
  });

  it('deve retornar vazio quando empresa não possui complexos', async () => {
    repository.findAll.mockResolvedValue([] as any);

    const result = await service.findAll({});

    expect(repository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        cinema_complexes: { company_id: 'company-123' },
      }),
    );
    expect(result).toEqual([]);
  });

  it('deve lançar erro quando contexto da empresa não existir', async () => {
    cls.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll({})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('deve criar contrato quando dados e relacionamentos são válidos', async () => {
    movieRepository.findById.mockResolvedValue({
      id: 'movie-1',
      company_id: 'company-123',
    });
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    });
    supplierRepository.findById.mockResolvedValue({
      id: 'supplier-1',
      company_id: 'company-123',
      is_film_distributor: true,
    });
    contractTypesRepository.findById.mockResolvedValue({
      id: 'ct-1',
      company_id: 'company-123',
    });
    repository.findAll.mockResolvedValue([]);
    repository.create.mockResolvedValue({ id: 'contract-1' } as any);

    const result = await service.create({
      movie_id: 'movie-1',
      cinema_complex_id: 'complex-1',
      distributor_id: 'supplier-1',
      contract_type_id: 'ct-1',
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-02-01'),
      distributor_percentage: 60,
      exhibitor_percentage: 40,
    } as any);

    expect(repository.create).toHaveBeenCalled();
    expect(result).toEqual({ id: 'contract-1' });
  });

  it('deve rejeitar create com soma de percentuais inválida', async () => {
    movieRepository.findById.mockResolvedValue({
      id: 'movie-1',
      company_id: 'company-123',
    });
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    });
    supplierRepository.findById.mockResolvedValue({
      id: 'supplier-1',
      company_id: 'company-123',
      is_film_distributor: true,
    });
    repository.findAll.mockResolvedValue([]);

    await expect(
      service.create({
        movie_id: 'movie-1',
        cinema_complex_id: 'complex-1',
        distributor_id: 'supplier-1',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-02-01'),
        distributor_percentage: 55,
        exhibitor_percentage: 40,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar create com sobreposição de contrato', async () => {
    movieRepository.findById.mockResolvedValue({
      id: 'movie-1',
      company_id: 'company-123',
    });
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    });
    supplierRepository.findById.mockResolvedValue({
      id: 'supplier-1',
      company_id: 'company-123',
      is_film_distributor: true,
    });
    repository.findAll.mockResolvedValue([{ id: 'existing' }] as any);

    await expect(
      service.create({
        movie_id: 'movie-1',
        cinema_complex_id: 'complex-1',
        distributor_id: 'supplier-1',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-02-01'),
        distributor_percentage: 60,
        exhibitor_percentage: 40,
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve rejeitar findOne quando contrato não existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('contract-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve atualizar contrato existente', async () => {
    repository.findById.mockResolvedValue({
      id: 'contract-1',
      movie_id: 'movie-1',
      cinema_complex_id: 'complex-1',
      distributor_id: 'supplier-1',
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-02-01'),
      distributor_percentage: 60,
      exhibitor_percentage: 40,
    } as any);
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    });
    repository.findAll.mockResolvedValue([]);
    repository.update.mockResolvedValue({
      id: 'contract-1',
      notes: 'novo',
    } as any);

    const result = await service.update('contract-1', { notes: 'novo' } as any);

    expect(repository.update).toHaveBeenCalled();
    expect(result).toEqual({ id: 'contract-1', notes: 'novo' });
  });

  it('deve desativar contrato no delete', async () => {
    repository.findById.mockResolvedValue({
      id: 'contract-1',
      cinema_complex_id: 'complex-1',
    } as any);
    cinemaComplexesRepository.findById.mockResolvedValue({
      id: 'complex-1',
      company_id: 'company-123',
    });

    await service.delete('contract-1');

    expect(repository.deactivate).toHaveBeenCalledWith('contract-1');
  });
});
