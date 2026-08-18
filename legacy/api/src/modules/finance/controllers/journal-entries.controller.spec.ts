import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesService } from '../services/journal-entries.service';

describe('JournalEntriesController', () => {
  let controller: JournalEntriesController;
  let service: jest.Mocked<JournalEntriesService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<JournalEntriesService>;

    controller = new JournalEntriesController(service);
  });

  it('should delegate create to service', async () => {
    const dto = {
      cinema_complex_id: 'complex-1',
      entry_date: '2026-03-20',
      description: 'Venda balcão',
      items: [
        { account_id: 'a1', movement_type: 'DEBIT', amount: 10 },
        { account_id: 'a2', movement_type: 'CREDIT', amount: 10 },
      ],
    };

    service.create.mockResolvedValue({ id: 'entry-1' } as never);

    const result = await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'entry-1' });
  });

  it('should delegate findAll with query filters', async () => {
    service.findAll.mockResolvedValue([{ id: 'entry-1' }] as never);
    const startDate = new Date('2026-03-01');
    const endDate = new Date('2026-03-31');

    const result = await controller.findAll('complex-1', startDate, endDate);

    expect(service.findAll).toHaveBeenCalledWith({
      cinema_complex_id: 'complex-1',
      start_date: startDate,
      end_date: endDate,
    });
    expect(result).toEqual([{ id: 'entry-1' }]);
  });
});
