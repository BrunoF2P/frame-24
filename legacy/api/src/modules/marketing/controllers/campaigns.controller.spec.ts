import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CampaignsService } from '../services/campaigns.service';
import { CampaignsController } from './campaigns.controller';

describe('CampaignsController', () => {
  it('deve criar/listar sem repassar company_id explicitamente', async () => {
    const dto = {
      promotion_type_id: 'PROMO_PERCENT',
      campaign_code: 'WEEKEND50',
      name: 'Fim de semana 50% OFF',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-01-31T23:59:59.999Z'),
    } as CreateCampaignDto;

    const service: Pick<CampaignsService, 'create' | 'findAll'> = {
      create: jest.fn().mockResolvedValue({ id: 'camp-1' } as any),
      findAll: jest.fn().mockResolvedValue([{ id: 'camp-1' }] as any),
    };

    const controller = new CampaignsController(service as CampaignsService);

    await controller.create(dto);
    await controller.findAll();

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('deve buscar/ativar/pausar sem company_id explícito', async () => {
    const service: Pick<CampaignsService, 'findOne' | 'activate' | 'pause'> = {
      findOne: jest.fn().mockResolvedValue({ id: 'camp-1' } as any),
      activate: jest
        .fn()
        .mockResolvedValue({ id: 'camp-1', active: true } as any),
      pause: jest
        .fn()
        .mockResolvedValue({ id: 'camp-1', active: false } as any),
    };

    const controller = new CampaignsController(service as CampaignsService);

    await controller.findOne('camp-1');
    await controller.activate('camp-1');
    await controller.pause('camp-1');

    expect(service.findOne).toHaveBeenCalledWith('camp-1');
    expect(service.activate).toHaveBeenCalledWith('camp-1');
    expect(service.pause).toHaveBeenCalledWith('camp-1');
  });
});
