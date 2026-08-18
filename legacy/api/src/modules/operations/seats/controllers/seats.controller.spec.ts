import { UpdateSeatStatusDto } from '../dto/update-seat-status.dto';
import { UpdateSeatsStatusBatchDto } from '../dto/update-seats-status-batch.dto';
import { SeatsService } from '../services/seats.service';
import { SeatsController } from './seats.controller';

describe('SeatsController', () => {
  it('deve atualizar status de assento com contexto do funcionario autenticado', async () => {
    const dto = { active: false } as UpdateSeatStatusDto;
    const payload = { id: 'seat-1', active: false };
    const service: Pick<SeatsService, 'updateStatus'> = {
      updateStatus: jest.fn().mockResolvedValue(payload as any),
    };
    const controller = new SeatsController(service as SeatsService);

    const result = await controller.updateSeatStatus('seat-1', dto);

    expect(service.updateStatus).toHaveBeenCalledWith('seat-1', false);
    expect(result).toEqual(payload);
  });

  it('deve atualizar status em lote com contexto do funcionario autenticado', async () => {
    const dto = {
      seats: [{ seat_id: 'seat-1', active: true }],
    } as UpdateSeatsStatusBatchDto;
    const payload = { updated: 1 };
    const service: Pick<SeatsService, 'updateStatusBatch'> = {
      updateStatusBatch: jest.fn().mockResolvedValue(payload),
    };
    const controller = new SeatsController(service as SeatsService);

    const result = await controller.updateStatusBatch(dto);

    expect(service.updateStatusBatch).toHaveBeenCalledWith(dto);
    expect(result).toEqual(payload);
  });
});
