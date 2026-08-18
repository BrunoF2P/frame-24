import type { OperationTypeResponse } from '../../shared/dto/operation-type-response.dto';
import { ProjectionTypesService } from '../services/projection-types.service';
import { ProjectionTypesController } from './projection-types.controller';

describe('ProjectionTypesController', () => {
  it('deve listar tipos de projecao da empresa do usuario logado', async () => {
    const response: OperationTypeResponse[] = [
      {
        id: 'projection-1',
        name: 'IMAX',
        description: 'Tela gigante',
        additional_value: '20.00',
      },
    ];

    const service: Pick<ProjectionTypesService, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(response),
    };

    const controller = new ProjectionTypesController(
      service as ProjectionTypesService,
    );

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toEqual(response);
  });
});
