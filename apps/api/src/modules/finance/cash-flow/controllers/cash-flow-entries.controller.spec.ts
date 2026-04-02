import { CashFlowEntriesController } from './cash-flow-entries.controller';
import { CashFlowEntriesService } from '../services/cash-flow-entries.service';

describe('CashFlowEntriesController', () => {
  let controller: CashFlowEntriesController;
  let service: jest.Mocked<CashFlowEntriesService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      reconcile: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CashFlowEntriesService>;

    controller = new CashFlowEntriesController(service);
  });

  it('should delegate create to service', async () => {
    const dto = {
      bank_account_id: 'bank-1',
      entry_type: 'receipt',
      category: 'ticket_sale',
      amount: 100,
      entry_date: '2026-03-20',
    };
    service.create.mockResolvedValue({ id: 'cfe-1' } as never);

    const result = await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'cfe-1' });
  });

  it('should delegate list/detail/reconcile/delete methods', async () => {
    service.findAll.mockResolvedValue({
      entries: [],
      total: 0,
      skip: 0,
      take: 20,
    } as never);
    service.findOne.mockResolvedValue({ id: 'cfe-1' } as never);
    service.reconcile.mockResolvedValue({ message: 'ok' } as never);
    service.delete.mockResolvedValue({ message: 'deleted' } as never);

    await controller.findAll({} as any);
    await controller.findOne('cfe-1');
    await controller.reconcile('cfe-1');
    await controller.delete('cfe-1');

    expect(service.findAll).toHaveBeenCalledWith({});
    expect(service.findOne).toHaveBeenCalledWith('cfe-1');
    expect(service.reconcile).toHaveBeenCalledWith('cfe-1');
    expect(service.delete).toHaveBeenCalledWith('cfe-1');
  });
});
