import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { SuppliersService } from '../services/suppliers.service';
import { SuppliersController } from './suppliers.controller';

describe('SuppliersController', () => {
  it('deve criar/listar sem repassar company_id explicitamente', async () => {
    const createDto = {
      corporate_name: 'Paris Filmes LTDA',
      cnpj: '12345678000190',
      phone: '1133345566',
    } as CreateSupplierDto;

    const service: Pick<SuppliersService, 'create' | 'findAll'> = {
      create: jest.fn().mockResolvedValue({ id: 'sup-1' } as any),
      findAll: jest.fn().mockResolvedValue([{ id: 'sup-1' }] as any),
    };

    const controller = new SuppliersController(service as SuppliersService);

    await controller.create(createDto);
    await controller.findAll('true');

    expect(service.create).toHaveBeenCalledWith(createDto);
    expect(service.findAll).toHaveBeenCalledWith(true);
  });

  it('deve buscar/atualizar/remover sem company_id explícito', async () => {
    const updateDto = { trade_name: 'Paris' } as UpdateSupplierDto;

    const service: Pick<
      SuppliersService,
      'findOne' | 'update' | 'delete' | 'findTypes' | 'findDistributors'
    > = {
      findOne: jest.fn().mockResolvedValue({ id: 'sup-1' } as any),
      update: jest.fn().mockResolvedValue({ id: 'sup-1' } as any),
      delete: jest.fn().mockResolvedValue({ id: 'sup-1' } as any),
      findTypes: jest.fn().mockResolvedValue([{ id: 'type-1' }] as any),
      findDistributors: jest.fn().mockResolvedValue([{ id: 'sup-1' }] as any),
    };

    const controller = new SuppliersController(service as SuppliersService);

    await controller.findTypes();
    await controller.findDistributors();
    await controller.findOne('sup-1');
    await controller.update('sup-1', updateDto);
    await controller.delete('sup-1');

    expect(service.findTypes).toHaveBeenCalledWith();
    expect(service.findDistributors).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith('sup-1');
    expect(service.update).toHaveBeenCalledWith('sup-1', updateDto);
    expect(service.delete).toHaveBeenCalledWith('sup-1');
  });
});
