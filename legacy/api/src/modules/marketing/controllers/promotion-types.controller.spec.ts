import { CreatePromotionTypeDto } from '../dto/create-promotion-type.dto';
import { PromotionTypesService } from '../services/promotion-types.service';
import { PromotionTypesController } from './promotion-types.controller';

describe('PromotionTypesController', () => {
  it('deve listar sem repassar company_id explicitamente', async () => {
    const service: Pick<PromotionTypesService, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([{ id: 'pt-1' }] as any),
    };

    const controller = new PromotionTypesController(
      service as PromotionTypesService,
    );

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toEqual([{ id: 'pt-1' }]);
  });

  it('deve criar sem repassar company_id explicitamente', async () => {
    const dto = {
      code: 'PERCENTUAL',
      name: 'Desconto percentual',
    } as CreatePromotionTypeDto;

    const service: Pick<PromotionTypesService, 'create'> = {
      create: jest.fn().mockResolvedValue({ id: 'pt-1' } as any),
    };

    const controller = new PromotionTypesController(
      service as PromotionTypesService,
    );

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'pt-1' });
  });
});
