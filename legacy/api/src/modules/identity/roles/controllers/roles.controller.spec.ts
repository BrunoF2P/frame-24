import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RolesService } from '../services/roles.service';
import { RolesController } from './roles.controller';

describe('RolesController', () => {
  it('deve criar role usando contexto do usuário apenas para auditoria/hierarquia', async () => {
    const dto = {
      name: 'Operador',
      permissions: ['users:read'],
    } as CreateRoleDto;
    const payload = { id: 'role-1' };

    const service: Pick<RolesService, 'create'> = {
      create: jest.fn().mockResolvedValue(payload as any),
    };

    const controller = new RolesController(service as RolesService);
    const result = await controller.createRole(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(payload);
  });

  it('deve listar, buscar e deletar sem repassar company_id explicitamente', async () => {
    const listPayload = [{ id: 'role-1' }];
    const rolePayload = { id: 'role-1' };

    const service: Pick<RolesService, 'findAll' | 'findOne' | 'delete'> = {
      findAll: jest.fn().mockResolvedValue(listPayload as any),
      findOne: jest.fn().mockResolvedValue(rolePayload as any),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const controller = new RolesController(service as RolesService);

    const list = await controller.listRoles();
    const role = await controller.getRole('role-1');
    await controller.deleteRole('role-1');

    expect(service.findAll).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith('role-1');
    expect(service.delete).toHaveBeenCalledWith('role-1');
    expect(list).toEqual(listPayload);
    expect(role).toEqual(rolePayload);
  });

  it('deve atualizar role usando contexto interno do serviço', async () => {
    const dto = {
      name: 'Operador Sênior',
    } as UpdateRoleDto;
    const payload = { id: 'role-1' };

    const service: Pick<RolesService, 'update'> = {
      update: jest.fn().mockResolvedValue(payload as any),
    };

    const controller = new RolesController(service as RolesService);
    const result = await controller.updateRole('role-1', dto);

    expect(service.update).toHaveBeenCalledWith('role-1', dto);
    expect(result).toEqual(payload);
  });
});
