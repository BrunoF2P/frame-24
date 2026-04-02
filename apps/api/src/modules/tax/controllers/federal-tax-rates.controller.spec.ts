import { FederalTaxRatesController } from './federal-tax-rates.controller';
import { FederalTaxRatesService } from '../services/federal-tax-rates.service';

describe('FederalTaxRatesController', () => {
  let controller: FederalTaxRatesController;
  let service: jest.Mocked<FederalTaxRatesService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<FederalTaxRatesService>;

    controller = new FederalTaxRatesController(service);
  });

  it('should delegate create', async () => {
    const dto = { pis_rate: 1.65 } as any;
    service.create.mockResolvedValue({ id: 'fed-1' } as never);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'fed-1' });
  });

  it('should delegate list and findOne', async () => {
    service.list.mockResolvedValue([{ id: 'fed-1' }] as never);
    service.findById.mockResolvedValue({ id: 'fed-1' } as never);

    const list = await controller.list();
    const one = await controller.findOne('fed-1');

    expect(service.list).toHaveBeenCalled();
    expect(service.findById).toHaveBeenCalledWith('fed-1');
    expect(list).toEqual([{ id: 'fed-1' }]);
    expect(one).toEqual({ id: 'fed-1' });
  });

  it('should delegate update and delete', async () => {
    const dto = { cofins_rate: 7.6 } as any;
    service.update.mockResolvedValue({
      id: 'fed-1',
      cofins_rate: 7.6,
    } as never);
    service.delete.mockResolvedValue(undefined as never);

    const updated = await controller.update('fed-1', dto);
    await controller.delete('fed-1');

    expect(service.update).toHaveBeenCalledWith('fed-1', dto);
    expect(service.delete).toHaveBeenCalledWith('fed-1');
    expect(updated).toEqual({ id: 'fed-1', cofins_rate: 7.6 });
  });
});
