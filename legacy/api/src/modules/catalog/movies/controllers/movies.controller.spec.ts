import { CreateMovieDto } from '../dto/create-movie.dto';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { MoviesService } from '../services/movies.service';
import { MoviesController } from './movies.controller';

describe('MoviesController', () => {
  it('deve chamar reads sem repassar company_id explicitamente', async () => {
    const service: Pick<
      MoviesService,
      'getCastTypes' | 'getMediaTypes' | 'getAgeRatings' | 'findAll'
    > = {
      getCastTypes: jest.fn().mockResolvedValue([{ id: 'c-1' }] as any),
      getMediaTypes: jest.fn().mockResolvedValue([{ id: 'm-1' }] as any),
      getAgeRatings: jest.fn().mockResolvedValue([{ id: 'a-1' }] as any),
      findAll: jest.fn().mockResolvedValue([{ id: 'movie-1' }] as any),
    };

    const controller = new MoviesController(service as MoviesService);

    await controller.getCastTypes();
    await controller.getMediaTypes();
    await controller.getAgeRatings();
    await controller.findAll();

    expect(service.getCastTypes).toHaveBeenCalledWith();
    expect(service.getMediaTypes).toHaveBeenCalledWith();
    expect(service.getAgeRatings).toHaveBeenCalledWith();
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('deve criar e atualizar sem repassar company_id explicitamente', async () => {
    const createDto = { original_title: 'Filme X' } as CreateMovieDto;
    const updateDto = { brazil_title: 'Filme X BR' } as UpdateMovieDto;

    const service: Pick<MoviesService, 'create' | 'update'> = {
      create: jest.fn().mockResolvedValue({ id: 'movie-1' } as any),
      update: jest.fn().mockResolvedValue({ id: 'movie-1' } as any),
    };

    const controller = new MoviesController(service as MoviesService);

    await controller.create(createDto);
    await controller.update('movie-1', updateDto);

    expect(service.create).toHaveBeenCalledWith(createDto);
    expect(service.update).toHaveBeenCalledWith('movie-1', updateDto);
  });
});
