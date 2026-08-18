import type { SessionStatusResponse } from '../../shared/dto/session-status-response.dto';
import { SessionStatusService } from '../services/session-status.service';
import { SessionStatusController } from './session-status.controller';

describe('SessionStatusController', () => {
  it('deve listar status de sessao da empresa do usuario logado', async () => {
    const response: SessionStatusResponse[] = [
      {
        id: 'session-status-1',
        name: 'Agendada',
        description: null,
        allows_modification: true,
      },
    ];

    const service: Pick<SessionStatusService, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(response),
    };

    const controller = new SessionStatusController(
      service as SessionStatusService,
    );

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toEqual(response);
  });
});
