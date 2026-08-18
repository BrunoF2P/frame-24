import { CreateMovieCategoryDto } from '../dto/create-movie-category.dto';
import { UpdateMovieCategoryDto } from '../dto/update-movie-category.dto';
import { MovieCategoriesService } from '../services/movie-categories.service';
import { MovieCategoriesController } from './movie-categories.controller';

describe('MovieCategoriesController', () => {
  it('deve criar e listar sem repassar company_id explicitamente', async () => {
    const dto = { name: 'Ação' } as CreateMovieCategoryDto;

    const service: Pick<MovieCategoriesService, 'create' | 'findAll'> = {
      create: jest.fn().mockResolvedValue({ id: 'cat-1' } as any),
      findAll: jest.fn().mockResolvedValue([{ id: 'cat-1' }] as any),
    };

    const controller = new MovieCategoriesController(
      service as MovieCategoriesService,
    );

    await controller.create(dto);
    await controller.findAll();

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('deve buscar, atualizar e excluir sem usuário explícito', async () => {
    const dto = { description: 'Nova descrição' } as UpdateMovieCategoryDto;

    const service: Pick<
      MovieCategoriesService,
      'findOne' | 'update' | 'delete'
    > = {
      findOne: jest.fn().mockResolvedValue({ id: 'cat-1' } as any),
      update: jest.fn().mockResolvedValue({ id: 'cat-1' } as any),
      delete: jest.fn().mockResolvedValue({ message: 'ok' } as any),
    };

    const controller = new MovieCategoriesController(
      service as MovieCategoriesService,
    );

    await controller.findOne('cat-1');
    await controller.update('cat-1', dto);
    await controller.delete('cat-1');

    expect(service.findOne).toHaveBeenCalledWith('cat-1');
    expect(service.update).toHaveBeenCalledWith('cat-1', dto);
    expect(service.delete).toHaveBeenCalledWith('cat-1');
  });
});
