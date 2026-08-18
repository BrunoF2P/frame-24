import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsService } from '../services/chart-of-accounts.service';

describe('ChartOfAccountsController', () => {
  let controller: ChartOfAccountsController;
  let service: jest.Mocked<ChartOfAccountsService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ChartOfAccountsService>;

    controller = new ChartOfAccountsController(service);
  });

  it('should delegate create to service', async () => {
    const dto = {
      account_code: '1.1.01',
      account_name: 'Caixa',
      account_type: 'ASSET',
      account_nature: 'DEBIT',
    };
    service.create.mockResolvedValue({ id: 'acc-1' } as never);

    const result = await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'acc-1' });
  });

  it('should delegate findAll to service', async () => {
    service.findAll.mockResolvedValue([{ id: 'acc-1' }] as never);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toEqual([{ id: 'acc-1' }]);
  });

  it('should delegate update to service', async () => {
    const dto = { account_name: 'Banco' };
    service.update.mockResolvedValue({ id: 'acc-1' } as never);

    const result = await controller.update('acc-1', dto as any);

    expect(service.update).toHaveBeenCalledWith('acc-1', dto);
    expect(result).toEqual({ id: 'acc-1' });
  });

  it('should delegate remove to service', async () => {
    service.remove.mockResolvedValue({ id: 'acc-1', active: false } as never);

    const result = await controller.remove('acc-1');

    expect(service.remove).toHaveBeenCalledWith('acc-1');
    expect(result).toEqual({ id: 'acc-1', active: false });
  });
});
