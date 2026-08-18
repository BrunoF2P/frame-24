import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreatePromotionTypeDto } from '../dto/create-promotion-type.dto';
import { PromotionTypesRepository } from '../repositories/promotion-types.repository';
import { PromotionTypesService } from './promotion-types.service';

describe('PromotionTypesService', () => {
  const promotionTypesRepository = {
    findAllByCompany: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<PromotionTypesRepository>;

  const snowflake = {
    generate: jest.fn(),
  } as unknown as jest.Mocked<SnowflakeService>;

  const cls = {
    getCompanyId: jest.fn(),
    getUserId: jest.fn(),
    getRequiredUserId: jest.fn(),
    getCustomerId: jest.fn(),
    getSessionContext: jest.fn(),
    getIdentityId: jest.fn(),
    getRoleHierarchy: jest.fn(),
  } as unknown as jest.Mocked<TenantContextService>;

  const service = new PromotionTypesService(
    promotionTypesRepository,
    snowflake,
    cls,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    snowflake.generate.mockReturnValue('pt-1');
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve listar tipos da empresa do contexto', async () => {
    promotionTypesRepository.findAllByCompany.mockResolvedValue([
      { id: 'pt-1' },
    ] as any);

    const result = await service.findAll();

    expect(promotionTypesRepository.findAllByCompany).toHaveBeenCalledWith(
      'company-123',
    );
    expect(result).toEqual([{ id: 'pt-1' }]);
  });

  it('deve criar tipo normalizando código/nome', async () => {
    const dto = {
      code: ' percentual ',
      name: ' Desconto percentual ',
      description: ' teste ',
    } as CreatePromotionTypeDto;

    promotionTypesRepository.findByCode.mockResolvedValue(null);
    promotionTypesRepository.create.mockResolvedValue({ id: 'pt-1' } as any);

    await service.create(dto);

    expect(promotionTypesRepository.findByCode).toHaveBeenCalledWith(
      'company-123',
      'PERCENTUAL',
    );
    expect(promotionTypesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pt-1',
        company_id: 'company-123',
        code: 'PERCENTUAL',
        name: 'Desconto percentual',
        description: 'teste',
      }),
    );
  });

  it('deve lançar conflito de código quando já existir', async () => {
    const dto = {
      code: 'PERCENTUAL',
      name: 'Desconto percentual',
    } as CreatePromotionTypeDto;

    promotionTypesRepository.findByCode.mockResolvedValue({
      id: 'pt-1',
    } as any);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deve lançar erro quando company_id não existe no contexto', async () => {
    cls.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
