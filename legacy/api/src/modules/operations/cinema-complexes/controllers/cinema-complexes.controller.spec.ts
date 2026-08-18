import { CreateCinemaComplexDto } from '../dto/create-cinema-complex.dto';
import { UpdateCinemaComplexDto } from '../dto/update-cinema-complex.dto';
import { CinemaComplexesService } from '../service/cinema-complexes.service';
import { CinemaComplexesController } from './cinema-complexes.controller';

describe('CinemaComplexesController', () => {
  it('deve criar complexo usando contexto do funcionario autenticado', async () => {
    const dto = { name: 'Cine A', code: 'CINE-A' } as CreateCinemaComplexDto;
    const created = { id: 'complex-1', ...dto };
    const service: Pick<CinemaComplexesService, 'create'> = {
      create: jest.fn().mockResolvedValue(created),
    };

    const controller = new CinemaComplexesController(
      service as CinemaComplexesService,
    );
    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  it('deve atualizar complexo usando contexto do funcionario autenticado', async () => {
    const dto = { name: 'Cine Atualizado' } as UpdateCinemaComplexDto;
    const updated = { id: 'complex-1', ...dto };
    const service: Pick<CinemaComplexesService, 'update'> = {
      update: jest.fn().mockResolvedValue(updated),
    };

    const controller = new CinemaComplexesController(
      service as CinemaComplexesService,
    );
    const result = await controller.update('complex-1', dto);

    expect(service.update).toHaveBeenCalledWith('complex-1', dto);
    expect(result).toEqual(updated);
  });

  it('deve remover complexo usando contexto do funcionario autenticado', async () => {
    const payload = { message: 'Complexo de cinema deletado com sucesso.' };
    const service: Pick<CinemaComplexesService, 'delete'> = {
      delete: jest.fn().mockResolvedValue(payload),
    };

    const controller = new CinemaComplexesController(
      service as CinemaComplexesService,
    );
    const result = await controller.delete('complex-1');

    expect(service.delete).toHaveBeenCalledWith('complex-1');
    expect(result).toEqual(payload);
  });
});
