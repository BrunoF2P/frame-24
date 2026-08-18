import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from '../services/accounts-payable.service';

describe('AccountsPayableController', () => {
  let controller: AccountsPayableController;
  let service: jest.Mocked<AccountsPayableService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<AccountsPayableService>;

    controller = new AccountsPayableController(service);
  });

  it('should delegate create to service', async () => {
    const dto = {
      issue_date: '2026-03-10',
      due_date: '2026-03-30',
      competence_date: '2026-03-01',
      original_amount: 100,
    };
    service.create.mockResolvedValue({ id: 'ap-1' } as never);

    const result = await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'ap-1' });
  });

  it('should delegate findAll to service', async () => {
    const query = { page: 1, per_page: 10 };
    service.findAll.mockResolvedValue({
      data: [{ id: 'ap-1' }],
      meta: { total: 1, page: 1, per_page: 10, last_page: 1 },
    } as never);

    const result = await controller.findAll(query as any);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result.data).toHaveLength(1);
  });

  it('should delegate findOne to service', async () => {
    service.findOne.mockResolvedValue({ id: 'ap-1' } as never);

    const result = await controller.findOne('ap-1');

    expect(service.findOne).toHaveBeenCalledWith('ap-1');
    expect(result).toEqual({ id: 'ap-1' });
  });

  it('should delegate update to service', async () => {
    const dto = { description: 'ajuste' };
    service.update.mockResolvedValue({ id: 'ap-1' } as never);

    const result = await controller.update('ap-1', dto as any);

    expect(service.update).toHaveBeenCalledWith('ap-1', dto);
    expect(result).toEqual({ id: 'ap-1' });
  });
});
