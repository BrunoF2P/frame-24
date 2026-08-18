import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from '../services/accounts-receivable.service';

describe('AccountsReceivableController', () => {
  let controller: AccountsReceivableController;
  let service: jest.Mocked<AccountsReceivableService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<AccountsReceivableService>;

    controller = new AccountsReceivableController(service);
  });

  it('should delegate create to service', async () => {
    const dto = {
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 100,
    };

    service.create.mockResolvedValue({ id: 'ar-1' } as never);

    const result = await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'ar-1' });
  });

  it('should delegate findAll to service', async () => {
    const query = { page: 1, per_page: 20 };
    service.findAll.mockResolvedValue({
      data: [{ id: 'ar-1' }],
      meta: { total: 1, page: 1, per_page: 20, last_page: 1 },
    } as never);

    const result = await controller.findAll(query as any);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result.data).toHaveLength(1);
  });

  it('should delegate findOne to service', async () => {
    service.findOne.mockResolvedValue({ id: 'ar-1' } as never);

    const result = await controller.findOne('ar-1');

    expect(service.findOne).toHaveBeenCalledWith('ar-1');
    expect(result).toEqual({ id: 'ar-1' });
  });

  it('should delegate update to service', async () => {
    const dto = { description: 'ajuste' };
    service.update.mockResolvedValue({ id: 'ar-1' } as never);

    const result = await controller.update('ar-1', dto as any);

    expect(service.update).toHaveBeenCalledWith('ar-1', dto);
    expect(result).toEqual({ id: 'ar-1' });
  });
});
