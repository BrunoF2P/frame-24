import { CustomerPurchasesController } from './customer-purchases.controller';
import { CustomerPurchasesService } from '../services/customer-purchases.service';

describe('CustomerPurchasesController', () => {
  let controller: CustomerPurchasesController;
  let service: jest.Mocked<CustomerPurchasesService>;

  beforeEach(() => {
    service = {
      purchase: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findTickets: jest.fn(),
      findTicketById: jest.fn(),
      getTicketQrCode: jest.fn(),
      getHistory: jest.fn(),
      cancelPurchase: jest.fn(),
    } as unknown as jest.Mocked<CustomerPurchasesService>;

    controller = new CustomerPurchasesController(service);
  });

  it('should delegate customer purchase flow endpoints', async () => {
    service.purchase.mockResolvedValue({ id: 'sale-1' } as never);
    service.findAll.mockResolvedValue([{ id: 'sale-1' }] as never);
    service.findOne.mockResolvedValue({ id: 'sale-1' } as never);
    service.findTickets.mockResolvedValue([{ id: 'ticket-1' }] as never);
    service.findTicketById.mockResolvedValue({ id: 'ticket-1' } as never);
    service.getTicketQrCode.mockResolvedValue({
      payload: 'x',
      base64: 'eA==',
    } as never);
    service.getHistory.mockResolvedValue({
      purchases: [],
      tickets: [],
    } as never);
    service.cancelPurchase.mockResolvedValue(undefined as never);

    await controller.purchase({ cinema_complex_id: 'complex-1' } as any);
    await controller.findAll();
    await controller.findOne('sale-1');
    await controller.findTickets();
    await controller.findTicketById('ticket-1');
    await controller.getTicketQrCode('ticket-1');
    await controller.getHistory();
    await controller.cancelPurchase('sale-1');

    expect(service.purchase).toHaveBeenCalled();
    expect(service.findAll).toHaveBeenCalled();
    expect(service.findOne).toHaveBeenCalledWith('sale-1');
    expect(service.findTickets).toHaveBeenCalled();
    expect(service.findTicketById).toHaveBeenCalledWith('ticket-1');
    expect(service.getTicketQrCode).toHaveBeenCalledWith('ticket-1');
    expect(service.getHistory).toHaveBeenCalled();
    expect(service.cancelPurchase).toHaveBeenCalledWith('sale-1');
  });
});
