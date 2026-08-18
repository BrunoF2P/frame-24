import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from 'src/common/services/tenant-context.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CampaignsRepository } from '../repositories/campaigns.repository';
import { CampaignsService } from './campaigns.service';

describe('CampaignsService', () => {
  const campaignsRepository = {
    findByCode: jest.fn(),
    createCampaign: jest.fn(),
    findAllByCompany: jest.fn(),
    findById: jest.fn(),
    updateCampaign: jest.fn(),
  } as unknown as jest.Mocked<CampaignsRepository>;

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

  const service = new CampaignsService(campaignsRepository, snowflake, cls);

  beforeEach(() => {
    jest.clearAllMocks();
    snowflake.generate.mockReturnValue('camp-1');
    cls.getCompanyId.mockReturnValue('company-123');
  });

  it('deve criar campanha usando company_id do contexto', async () => {
    const dto = {
      promotion_type_id: 'PROMO_PERCENT',
      campaign_code: 'WEEKEND50',
      name: 'Fim de semana 50% OFF',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-01-31T23:59:59.999Z'),
    } as CreateCampaignDto;

    campaignsRepository.findByCode.mockResolvedValue(null);
    campaignsRepository.createCampaign.mockResolvedValue({
      id: 'camp-1',
    } as any);

    await service.create(dto);

    expect(campaignsRepository.findByCode).toHaveBeenCalledWith(
      'company-123',
      'WEEKEND50',
    );
    expect(campaignsRepository.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'camp-1',
        company_id: 'company-123',
      }),
    );
  });

  it('deve validar data final maior que inicial', async () => {
    const dto = {
      promotion_type_id: 'PROMO_PERCENT',
      campaign_code: 'WEEKEND50',
      name: 'Fim de semana 50% OFF',
      start_date: new Date('2026-01-31T23:59:59.999Z'),
      end_date: new Date('2026-01-01T00:00:00.000Z'),
    } as CreateCampaignDto;

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deve listar campanhas da empresa do contexto', async () => {
    campaignsRepository.findAllByCompany.mockResolvedValue([
      { id: 'camp-1' },
    ] as any);

    const result = await service.findAll();

    expect(campaignsRepository.findAllByCompany).toHaveBeenCalledWith(
      'company-123',
    );
    expect(result).toEqual([{ id: 'camp-1' }]);
  });

  it('deve lançar not found para campanha de outra empresa', async () => {
    campaignsRepository.findById.mockResolvedValue({
      id: 'camp-1',
      company_id: 'company-999',
    } as any);

    await expect(service.findOne('camp-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve lançar erro quando company_id não existe no contexto', async () => {
    cls.getCompanyId.mockImplementation(() => {
      throw new ForbiddenException('Contexto da empresa não encontrado.');
    });

    await expect(service.findAll()).rejects.toBeInstanceOf(ForbiddenException);
  });
});
