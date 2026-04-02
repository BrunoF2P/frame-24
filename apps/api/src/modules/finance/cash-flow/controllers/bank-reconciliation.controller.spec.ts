import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from '../services/bank-reconciliation.service';

describe('BankReconciliationController', () => {
  let controller: BankReconciliationController;
  let service: jest.Mocked<BankReconciliationService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      complete: jest.fn(),
    } as unknown as jest.Mocked<BankReconciliationService>;

    controller = new BankReconciliationController(service);
  });

  it('should delegate create/findAll/findOne/update/complete', async () => {
    service.create.mockResolvedValue({ id: 'recon-1' } as never);
    service.findAll.mockResolvedValue([{ id: 'recon-1' }] as never);
    service.findOne.mockResolvedValue({ id: 'recon-1' } as never);
    service.update.mockResolvedValue({ id: 'recon-1', notes: 'ok' } as never);
    service.complete.mockResolvedValue({
      id: 'recon-1',
      status: 'completed',
    } as never);

    await controller.create({ bank_account_id: 'bank-1' } as any);
    await controller.findAll('bank-1');
    await controller.findOne('recon-1');
    await controller.update('recon-1', { notes: 'ok' } as any);
    await controller.complete('recon-1');

    expect(service.create).toHaveBeenCalledWith({ bank_account_id: 'bank-1' });
    expect(service.findAll).toHaveBeenCalledWith('bank-1');
    expect(service.findOne).toHaveBeenCalledWith('recon-1');
    expect(service.update).toHaveBeenCalledWith('recon-1', { notes: 'ok' });
    expect(service.complete).toHaveBeenCalledWith('recon-1');
  });
});
