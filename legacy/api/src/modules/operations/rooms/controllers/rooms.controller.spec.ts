import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { RoomsService } from '../services/rooms.service';
import { RoomsController } from './rooms.controller';

describe('RoomsController', () => {
  it('deve criar sala com contexto do funcionario autenticado', async () => {
    const dto = { room_number: '1' } as CreateRoomDto;
    const file = { originalname: 'layout.png' } as Express.Multer.File;
    const payload = { id: 'room-1' };
    const service: Pick<RoomsService, 'create'> = {
      create: jest.fn().mockResolvedValue(payload),
    };
    const controller = new RoomsController(service as RoomsService);

    const result = await controller.create('complex-1', file, dto);

    expect(service.create).toHaveBeenCalledWith('complex-1', dto, file);
    expect(result).toEqual(payload);
  });

  it('deve atualizar sala com contexto do funcionario autenticado', async () => {
    const dto = { room_number: '2' } as UpdateRoomDto;
    const file = { originalname: 'layout-new.png' } as Express.Multer.File;
    const payload = { id: 'room-1', room_number: '2' };
    const service: Pick<RoomsService, 'update'> = {
      update: jest.fn().mockResolvedValue(payload),
    };
    const controller = new RoomsController(service as RoomsService);

    const result = await controller.update('room-1', file, dto);

    expect(service.update).toHaveBeenCalledWith('room-1', dto, file);
    expect(result).toEqual(payload);
  });

  it('deve remover sala com contexto do funcionario autenticado', async () => {
    const payload = { message: 'Sala deletada com sucesso.' };
    const service: Pick<RoomsService, 'delete'> = {
      delete: jest.fn().mockResolvedValue(payload),
    };
    const controller = new RoomsController(service as RoomsService);

    const result = await controller.delete('room-1');

    expect(service.delete).toHaveBeenCalledWith('room-1');
    expect(result).toEqual(payload);
  });
});
