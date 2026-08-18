import { TaxEntriesController } from './tax-entries.controller';
import { TaxEntriesService } from '../services/tax-entries.service';

describe('TaxEntriesController', () => {
  let controller: TaxEntriesController;
  let service: jest.Mocked<TaxEntriesService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<TaxEntriesService>;

    controller = new TaxEntriesController(service);
  });

  it('should delegate findOne', async () => {
    service.findOne.mockResolvedValue({ id: 'tax-1' } as never);

    const found = await controller.findOne('tax-1');

    expect(service.findOne).toHaveBeenCalledWith('tax-1');
    expect(found).toEqual({ id: 'tax-1' });
  });

  it('should parse query filters and delegate findAll', async () => {
    service.findAll.mockResolvedValue([] as never);

    await controller.findAll(
      'complex-1',
      'SALE',
      'sale-1',
      new Date('2026-03-01'),
      new Date('2026-03-31'),
      'true',
    );

    expect(service.findAll).toHaveBeenCalledWith({
      cinema_complex_id: 'complex-1',
      source_type: 'SALE',
      source_id: 'sale-1',
      start_date: new Date('2026-03-01'),
      end_date: new Date('2026-03-31'),
      processed: true,
    });
  });
});
