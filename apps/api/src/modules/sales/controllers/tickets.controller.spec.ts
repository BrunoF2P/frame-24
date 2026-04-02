import { NotFoundException } from '@nestjs/common';
import { TicketsRepository } from '../repositories/tickets.repository';
import { TicketsController } from './tickets.controller';

describe('TicketsController', () => {
  let controller: TicketsController;
  let repository: jest.Mocked<TicketsRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      markAsUsed: jest.fn(),
    } as unknown as jest.Mocked<TicketsRepository>;

    controller = new TicketsController(repository);
  });

  it('should return ticket by id when found', async () => {
    repository.findById.mockResolvedValue({ id: 'ticket-1' } as never);

    const result = await controller.findOne('ticket-1');

    expect(repository.findById).toHaveBeenCalledWith('ticket-1');
    expect(result).toEqual({ id: 'ticket-1' });
  });

  it('should throw NotFoundException when ticket does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(controller.findOne('ticket-404')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should mark ticket as used', async () => {
    repository.markAsUsed.mockResolvedValue({
      id: 'ticket-1',
      used: true,
    } as never);

    const result = await controller.markAsUsed('ticket-1');

    expect(repository.markAsUsed).toHaveBeenCalledWith(
      'ticket-1',
      expect.any(Date),
    );
    expect(result).toEqual({ id: 'ticket-1', used: true });
  });
});
