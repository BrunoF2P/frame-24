import { ProductStockController } from './product-stock.controller';
import { ProductStockService } from '../services/product-stock.service';

describe('ProductStockController', () => {
  let controller: ProductStockController;
  let service: jest.Mocked<ProductStockService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findLowStock: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ProductStockService>;

    controller = new ProductStockController(service);
  });

  it('should delegate listing endpoints', async () => {
    service.findAll.mockResolvedValue([{ id: 'ps-1' }] as never);
    service.findLowStock.mockResolvedValue([{ id: 'ps-2' }] as never);

    const all = await controller.findAll('complex-1');
    const low = await controller.findLowStock('complex-1');

    expect(service.findAll).toHaveBeenCalledWith('complex-1');
    expect(service.findLowStock).toHaveBeenCalledWith('complex-1');
    expect(all).toEqual([{ id: 'ps-1' }]);
    expect(low).toEqual([{ id: 'ps-2' }]);
  });

  it('should delegate findOne with route params', async () => {
    service.findOne.mockResolvedValue({ id: 'ps-1' } as never);

    const result = await controller.findOne('product-1', 'complex-1');

    expect(service.findOne).toHaveBeenCalledWith('product-1', 'complex-1');
    expect(result).toEqual({ id: 'ps-1' });
  });
});
