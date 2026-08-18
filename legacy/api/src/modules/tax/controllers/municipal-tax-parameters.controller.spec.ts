import { MunicipalTaxParametersController } from './municipal-tax-parameters.controller';
import { MunicipalTaxParametersService } from '../services/municipal-tax-parameters.service';

describe('MunicipalTaxParametersController', () => {
  let controller: MunicipalTaxParametersController;
  let service: jest.Mocked<MunicipalTaxParametersService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      listByCompany: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<MunicipalTaxParametersService>;

    controller = new MunicipalTaxParametersController(service);
  });

  it('should delegate create', async () => {
    const dto = { iss_rate: 5 } as any;
    service.create.mockResolvedValue({ id: 'mun-1' } as never);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'mun-1' });
  });

  it('should delegate list and findOne', async () => {
    service.listByCompany.mockResolvedValue([{ id: 'mun-1' }] as never);
    service.findById.mockResolvedValue({ id: 'mun-1' } as never);

    const list = await controller.list();
    const one = await controller.findOne('mun-1');

    expect(service.listByCompany).toHaveBeenCalled();
    expect(service.findById).toHaveBeenCalledWith('mun-1');
    expect(list).toEqual([{ id: 'mun-1' }]);
    expect(one).toEqual({ id: 'mun-1' });
  });

  it('should delegate update and delete', async () => {
    const dto = { municipality_name: 'São Paulo' } as any;
    service.update.mockResolvedValue({
      id: 'mun-1',
      municipality_name: 'São Paulo',
    } as never);
    service.delete.mockResolvedValue(undefined as never);

    const updated = await controller.update('mun-1', dto);
    await controller.delete('mun-1');

    expect(service.update).toHaveBeenCalledWith('mun-1', dto);
    expect(service.delete).toHaveBeenCalledWith('mun-1');
    expect(updated).toEqual({ id: 'mun-1', municipality_name: 'São Paulo' });
  });
});
