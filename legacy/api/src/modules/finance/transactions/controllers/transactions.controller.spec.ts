import { TransactionsController } from './transactions.controller';
import { TransactionsService } from '../services/transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: jest.Mocked<TransactionsService>;

  beforeEach(() => {
    service = {
      settleReceivable: jest.fn(),
      settlePayable: jest.fn(),
    } as unknown as jest.Mocked<TransactionsService>;

    controller = new TransactionsController(service);
  });

  it('should delegate settleReceivable to service', async () => {
    const dto = {
      account_receivable_id: 'ar-1',
      transaction_date: '2026-03-20',
      amount: 30,
      bank_account_id: 'bank-1',
      payment_method: 'pix',
    };
    service.settleReceivable.mockResolvedValue({ id: 'tx-1' } as never);

    const result = await controller.settleReceivable(dto as any);

    expect(service.settleReceivable).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'tx-1' });
  });

  it('should delegate settlePayable to service', async () => {
    const dto = {
      account_payable_id: 'ap-1',
      transaction_date: '2026-03-20',
      amount: 60,
      bank_account_id: 'bank-1',
      payment_method: 'ted',
    };
    service.settlePayable.mockResolvedValue({ id: 'tx-2' } as never);

    const result = await controller.settlePayable(dto as any);

    expect(service.settlePayable).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'tx-2' });
  });
});
