import { CreateContractTypeDto } from '../dto/create-contract-type.dto';
import { UpdateContractTypeDto } from '../dto/update-contract-type.dto';
import { ContractTypesService } from '../services/contract-types.service';
import { ContractTypesController } from './contract-types.controller';

describe('ContractTypesController', () => {
  it('deve criar sem repassar company_id explicitamente', async () => {
    const dto = { name: 'Percentual Fixo' } as CreateContractTypeDto;
    const payload = { id: 'ct-1' };

    const service: Pick<ContractTypesService, 'create'> = {
      create: jest.fn().mockResolvedValue(payload as any),
    };

    const controller = new ContractTypesController(
      service as ContractTypesService,
    );
    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(payload);
  });

  it('deve listar, buscar, atualizar e deletar sem company_id explícito', async () => {
    const dto = { name: 'Percentual Variável' } as UpdateContractTypeDto;
    const listPayload = [{ id: 'ct-1' }];
    const itemPayload = { id: 'ct-1' };

    const service: Pick<
      ContractTypesService,
      'findAll' | 'findOne' | 'update' | 'delete'
    > = {
      findAll: jest.fn().mockResolvedValue(listPayload as any),
      findOne: jest.fn().mockResolvedValue(itemPayload as any),
      update: jest.fn().mockResolvedValue(itemPayload as any),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const controller = new ContractTypesController(
      service as ContractTypesService,
    );

    const list = await controller.list();
    const item = await controller.findOne('ct-1');
    const updated = await controller.update('ct-1', dto);
    await controller.delete('ct-1');

    expect(service.findAll).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith('ct-1');
    expect(service.update).toHaveBeenCalledWith('ct-1', dto);
    expect(service.delete).toHaveBeenCalledWith('ct-1');
    expect(list).toEqual(listPayload);
    expect(item).toEqual(itemPayload);
    expect(updated).toEqual(itemPayload);
  });
});
