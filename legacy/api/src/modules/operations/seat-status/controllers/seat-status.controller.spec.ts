import type { SeatStatusResponse } from '../../shared/dto/seat-status-response.dto';
import { SeatStatusService } from '../services/seat-status.service';
import { SeatStatusController } from './seat-status.controller';

describe('SeatStatusController', () => {
  it('deve listar status de assento da empresa do usuario logado', async () => {
    const response: SeatStatusResponse[] = [
      {
        id: 'status-1',
        name: 'Disponivel',
        description: null,
        allows_modification: true,
        is_default: true,
      },
    ];

    const service: Pick<SeatStatusService, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(response),
    };

    const controller = new SeatStatusController(service as SeatStatusService);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toEqual(response);
  });
});
