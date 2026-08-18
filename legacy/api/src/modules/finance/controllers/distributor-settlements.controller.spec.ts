import { DistributorSettlementsController } from './distributor-settlements.controller';
import { DistributorSettlementsService } from '../services/distributor-settlements.service';

describe('DistributorSettlementsController', () => {
  let controller: DistributorSettlementsController;
  let service: jest.Mocked<DistributorSettlementsService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<DistributorSettlementsService>;

    controller = new DistributorSettlementsController(service);
  });

  it('should delegate findAll with optional cinema_complex_id filter', async () => {
    service.findAll.mockResolvedValue([{ id: 'sett-1' }] as never);

    const result = await controller.findAll('complex-1');

    expect(service.findAll).toHaveBeenCalledWith('complex-1');
    expect(result).toEqual([{ id: 'sett-1' }]);
  });

  it('should delegate create to service', async () => {
    const dto = {
      contract_id: 'contract-1',
      distributor_id: 'supplier-1',
      cinema_complex_id: 'complex-1',
      competence_start_date: '2026-03-01',
      competence_end_date: '2026-03-31',
      gross_box_office_revenue: 1000,
      distributor_percentage: 40,
    };
    service.create.mockResolvedValue({ id: 'sett-1' } as never);

    const result = await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'sett-1' });
  });
});
