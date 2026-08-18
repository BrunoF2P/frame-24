import { CreateTicketTypeDto } from '../dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from '../dto/update-ticket-type.dto';
import { TicketTypesService } from '../services/ticket-types.service';
import { TicketTypesController } from './ticket-types.controller';

describe('TicketTypesController', () => {
  it('deve criar tipo de ingresso usando contexto interno do serviço', async () => {
    const dto = {
      name: 'VIP',
      discount_percentage: 10,
    } as CreateTicketTypeDto;
    const payload = { id: 'type-1' };

    const service: Pick<TicketTypesService, 'create'> = {
      create: jest.fn().mockResolvedValue(payload as any),
    };

    const controller = new TicketTypesController(service as TicketTypesService);
    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(payload);
  });

  it('deve listar, buscar e deletar sem repassar company_id explicitamente', async () => {
    const listPayload = [{ id: 'type-1' }];
    const payload = { id: 'type-1' };

    const service: Pick<TicketTypesService, 'findAll' | 'findOne' | 'delete'> =
      {
        findAll: jest.fn().mockResolvedValue(listPayload as any),
        findOne: jest.fn().mockResolvedValue(payload as any),
        delete: jest.fn().mockResolvedValue(undefined),
      };

    const controller = new TicketTypesController(service as TicketTypesService);

    const list = await controller.findAll();
    const ticketType = await controller.findOne('type-1');
    await controller.delete('type-1');

    expect(service.findAll).toHaveBeenCalledWith();
    expect(service.findOne).toHaveBeenCalledWith('type-1');
    expect(service.delete).toHaveBeenCalledWith('type-1');
    expect(list).toEqual(listPayload);
    expect(ticketType).toEqual(payload);
  });

  it('deve atualizar tipo de ingresso usando contexto interno do serviço', async () => {
    const dto = {
      name: 'VIP Premium',
    } as UpdateTicketTypeDto;
    const payload = { id: 'type-1' };

    const service: Pick<TicketTypesService, 'update'> = {
      update: jest.fn().mockResolvedValue(payload as any),
    };

    const controller = new TicketTypesController(service as TicketTypesService);
    const result = await controller.update('type-1', dto);

    expect(service.update).toHaveBeenCalledWith('type-1', dto);
    expect(result).toEqual(payload);
  });
});
