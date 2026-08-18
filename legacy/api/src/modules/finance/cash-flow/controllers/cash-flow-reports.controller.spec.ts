import { CashFlowReportsController } from './cash-flow-reports.controller';
import { CashFlowReportsService } from '../services/cash-flow-reports.service';

describe('CashFlowReportsController', () => {
  let controller: CashFlowReportsController;
  let service: jest.Mocked<CashFlowReportsService>;

  beforeEach(() => {
    service = {
      getDailyReport: jest.fn(),
      getPeriodReport: jest.fn(),
      getProjection: jest.fn(),
      getCategorySummary: jest.fn(),
    } as unknown as jest.Mocked<CashFlowReportsService>;

    controller = new CashFlowReportsController(service);
  });

  it('should delegate all report endpoints to service', async () => {
    service.getDailyReport.mockResolvedValue({} as never);
    service.getPeriodReport.mockResolvedValue({} as never);
    service.getProjection.mockResolvedValue({} as never);
    service.getCategorySummary.mockResolvedValue({} as never);

    await controller.getDailyReport({ date: '2026-03-22' } as any);
    await controller.getPeriodReport({ start_date: '2026-03-01' } as any);
    await controller.getProjection({ days: 30 } as any);
    await controller.getCategorySummary({ month: '2026-03' } as any);

    expect(service.getDailyReport).toHaveBeenCalledWith({ date: '2026-03-22' });
    expect(service.getPeriodReport).toHaveBeenCalledWith({
      start_date: '2026-03-01',
    });
    expect(service.getProjection).toHaveBeenCalledWith({ days: 30 });
    expect(service.getCategorySummary).toHaveBeenCalledWith({
      month: '2026-03',
    });
  });
});
