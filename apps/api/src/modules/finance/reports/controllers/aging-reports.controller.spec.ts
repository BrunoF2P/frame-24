import { AgingReportsController } from './aging-reports.controller';
import { AgingReportsService } from '../services/aging-reports.service';
import { PositionReportsService } from '../services/position-reports.service';
import { FinanceReportsService } from '../../services/finance-reports.service';

describe('AgingReportsController', () => {
  let controller: AgingReportsController;
  let agingService: jest.Mocked<AgingReportsService>;
  let positionService: jest.Mocked<PositionReportsService>;
  let financeService: jest.Mocked<FinanceReportsService>;

  beforeEach(() => {
    agingService = {
      getReceivablesAging: jest.fn(),
      getPayablesAging: jest.fn(),
    } as unknown as jest.Mocked<AgingReportsService>;

    positionService = {
      getCustomerPosition: jest.fn(),
      getCustomerPositionById: jest.fn(),
      getSupplierPosition: jest.fn(),
      getSupplierPositionById: jest.fn(),
    } as unknown as jest.Mocked<PositionReportsService>;

    financeService = {
      getIncomeStatement: jest.fn(),
    } as unknown as jest.Mocked<FinanceReportsService>;

    controller = new AgingReportsController(
      agingService,
      positionService,
      financeService,
    );
  });

  it('should delegate aging endpoints', async () => {
    agingService.getReceivablesAging.mockResolvedValue({} as never);
    agingService.getPayablesAging.mockResolvedValue({} as never);

    await controller.getReceivablesAging({ base_date: '2026-03-01' } as any);
    await controller.getPayablesAging({ base_date: '2026-03-01' } as any);

    expect(agingService.getReceivablesAging).toHaveBeenCalledWith({
      base_date: '2026-03-01',
    });
    expect(agingService.getPayablesAging).toHaveBeenCalledWith({
      base_date: '2026-03-01',
    });
  });

  it('should delegate position and income statement endpoints', async () => {
    positionService.getCustomerPosition.mockResolvedValue([] as never);
    positionService.getCustomerPositionById.mockResolvedValue(null as never);
    positionService.getSupplierPosition.mockResolvedValue([] as never);
    positionService.getSupplierPositionById.mockResolvedValue(null as never);
    financeService.getIncomeStatement.mockResolvedValue({
      period: '2026-03',
    } as never);

    await controller.getCustomerPosition({} as any);
    await controller.getCustomerPositionById('cust-1');
    await controller.getSupplierPosition({} as any);
    await controller.getSupplierPositionById('sup-1');
    await controller.getIncomeStatement('2026-03');

    expect(positionService.getCustomerPosition).toHaveBeenCalledWith({});
    expect(positionService.getCustomerPositionById).toHaveBeenCalledWith(
      'cust-1',
    );
    expect(positionService.getSupplierPosition).toHaveBeenCalledWith({});
    expect(positionService.getSupplierPositionById).toHaveBeenCalledWith(
      'sup-1',
    );
    expect(financeService.getIncomeStatement).toHaveBeenCalledWith('2026-03');
  });
});
