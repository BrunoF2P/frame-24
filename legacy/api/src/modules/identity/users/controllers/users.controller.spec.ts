import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersService } from '../services/users.service';
import { UserManagementController } from './users.controller';

describe('UserManagementController', () => {
  it('deve criar usuário sem repassar company_id explicitamente', async () => {
    const dto = { email: 'john@acme.com' } as CreateUserDto;
    const payload = { employee_id: 'CE-0001' };
    const service: Pick<UsersService, 'create'> = {
      create: jest.fn().mockResolvedValue(payload as any),
    };
    const controller = new UserManagementController(service as UsersService);

    const result = await controller.createUser(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(payload);
  });

  it('deve listar usuários sem repassar company_id explicitamente', async () => {
    const payload = [{ employee_id: 'CE-0001' }];
    const service: Pick<UsersService, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(payload as any),
    };
    const controller = new UserManagementController(service as UsersService);

    const result = await controller.listUsers();

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toEqual(payload);
  });

  it('deve atualizar e remover usuário sem repassar company_id explicitamente', async () => {
    const dto = { full_name: 'John Doe' } as UpdateUserDto;
    const updated = { employee_id: 'CE-0001' };
    const service: Pick<UsersService, 'update' | 'softDelete'> = {
      update: jest.fn().mockResolvedValue(updated as any),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new UserManagementController(service as UsersService);

    const updateResult = await controller.updateUser('CE-0001', dto);
    await controller.deleteUser('CE-0001');

    expect(service.update).toHaveBeenCalledWith('CE-0001', dto);
    expect(service.softDelete).toHaveBeenCalledWith('CE-0001');
    expect(updateResult).toEqual(updated);
  });
});
