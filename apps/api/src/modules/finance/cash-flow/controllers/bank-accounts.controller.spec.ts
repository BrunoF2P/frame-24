import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from '../services/bank-accounts.service';

describe('BankAccountsController', () => {
  let controller: BankAccountsController;
  let service: jest.Mocked<BankAccountsService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getBalance: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<BankAccountsService>;

    controller = new BankAccountsController(service);
  });

  it('should delegate create/findOne/getBalance/update/delete', async () => {
    service.create.mockResolvedValue({ id: 'bank-1' } as never);
    service.findOne.mockResolvedValue({ id: 'bank-1' } as never);
    service.getBalance.mockResolvedValue({
      bank_account_id: 'bank-1',
      current_balance: 100,
    } as never);
    service.update.mockResolvedValue({
      id: 'bank-1',
      bank_name: 'Banco X',
    } as never);
    service.delete.mockResolvedValue({ count: 1 } as never);

    await controller.create({ bank_name: 'Banco X' } as any);
    await controller.findOne('bank-1');
    await controller.getBalance('bank-1');
    await controller.update('bank-1', { bank_name: 'Banco X' } as any);
    await controller.delete('bank-1');

    expect(service.create).toHaveBeenCalled();
    expect(service.findOne).toHaveBeenCalledWith('bank-1');
    expect(service.getBalance).toHaveBeenCalledWith('bank-1');
    expect(service.update).toHaveBeenCalledWith('bank-1', {
      bank_name: 'Banco X',
    });
    expect(service.delete).toHaveBeenCalledWith('bank-1');
  });

  it('should use active_only query to control findAll filter', async () => {
    service.findAll.mockResolvedValue([{ id: 'bank-1' }] as never);

    await controller.findAll(undefined);
    await controller.findAll(false as never);

    expect(service.findAll).toHaveBeenNthCalledWith(1, true);
    expect(service.findAll).toHaveBeenNthCalledWith(2, false);
  });
});
