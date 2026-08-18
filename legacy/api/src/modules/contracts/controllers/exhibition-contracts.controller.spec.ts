import { CreateExhibitionContractDto } from '../dto/create-exhibition-contract.dto';
import { UpdateExhibitionContractDto } from '../dto/update-exhibition-contract.dto';
import { ExhibitionContractsService } from '../services/exhibition-contracts.service';
import { ExhibitionContractsController } from './exhibition-contracts.controller';

describe('ExhibitionContractsController', () => {
  it('deve criar contrato sem repassar company_id explicitamente', async () => {
    const dto = { movie_id: 'm-1' } as CreateExhibitionContractDto;
    const payload = { id: 'ec-1' };

    const service: Pick<ExhibitionContractsService, 'create'> = {
      create: jest.fn().mockResolvedValue(payload as any),
    };

    const controller = new ExhibitionContractsController(
      service as ExhibitionContractsService,
    );
    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(payload);
  });

  it('deve listar, buscar, atualizar e deletar sem company_id explícito', async () => {
    const dto = { notes: 'Atualizado' } as UpdateExhibitionContractDto;

    const service: Pick<
      ExhibitionContractsService,
      'findAll' | 'findOne' | 'update' | 'delete'
    > = {
      findAll: jest.fn().mockResolvedValue([{ id: 'ec-1' }] as any),
      findOne: jest.fn().mockResolvedValue({ id: 'ec-1' } as any),
      update: jest.fn().mockResolvedValue({ id: 'ec-1' } as any),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const controller = new ExhibitionContractsController(
      service as ExhibitionContractsService,
    );

    const list = await controller.list('m-1', 'cc-1', 'd-1', 'true');
    const item = await controller.findOne('ec-1');
    const updated = await controller.update('ec-1', dto);
    await controller.delete('ec-1');

    expect(service.findAll).toHaveBeenCalledWith({
      movie_id: 'm-1',
      cinema_complex_id: 'cc-1',
      distributor_id: 'd-1',
      active: true,
    });
    expect(service.findOne).toHaveBeenCalledWith('ec-1');
    expect(service.update).toHaveBeenCalledWith('ec-1', dto);
    expect(service.delete).toHaveBeenCalledWith('ec-1');
    expect(list).toEqual([{ id: 'ec-1' }]);
    expect(item).toEqual({ id: 'ec-1' });
    expect(updated).toEqual({ id: 'ec-1' });
  });
});
