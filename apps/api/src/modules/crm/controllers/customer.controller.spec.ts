import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CompanyCustomersRepository } from '../repositories/company-customers.repository';
import { CustomersRepository } from '../repositories/customers.repository';
import { CustomerController } from './customer.controller';

describe('CustomerController', () => {
  let controller: CustomerController;
  let customersRepository: jest.Mocked<CustomersRepository>;
  let companyCustomersRepository: jest.Mocked<CompanyCustomersRepository>;
  let cls: jest.Mocked<ClsService>;

  beforeEach(() => {
    customersRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CustomersRepository>;

    companyCustomersRepository = {
      findByCompanyAndCustomer: jest.fn(),
    } as unknown as jest.Mocked<CompanyCustomersRepository>;

    cls = {
      get: jest.fn((key: string) => {
        if (key === 'companyId') return 'company-1';
        if (key === 'customerId') return 'customer-1';
        if (key === 'tenantSlug') return 'cinema-central';
        return undefined;
      }),
    } as unknown as jest.Mocked<ClsService>;

    controller = new CustomerController(
      customersRepository,
      companyCustomersRepository,
      cls,
    );
  });

  it('should return customer profile with loyalty data', async () => {
    customersRepository.findById.mockResolvedValue({
      id: 'customer-1',
      email: 'maria@x.com',
      full_name: 'Maria',
      phone: '11999999999',
      birth_date: null,
    } as never);
    companyCustomersRepository.findByCompanyAndCustomer.mockResolvedValue({
      loyalty_level: 'SILVER',
      accumulated_points: 120,
    } as never);

    const result = await controller.getProfile();

    expect(result).toEqual(
      expect.objectContaining({
        id: 'customer-1',
        loyalty_level: 'SILVER',
        accumulated_points: 120,
        tenant_slug: 'cinema-central',
      }),
    );
  });

  it('should throw when profile customer is missing', async () => {
    customersRepository.findById.mockResolvedValue(null);

    await expect(controller.getProfile()).rejects.toThrow(NotFoundException);
  });

  it('should update profile mapping optional birth_date', async () => {
    customersRepository.findById.mockResolvedValue({
      id: 'customer-1',
    } as never);
    customersRepository.update.mockResolvedValue({
      id: 'customer-1',
      email: 'maria@x.com',
      full_name: 'Maria Souza',
      phone: '11888888888',
      birth_date: new Date('1990-01-01'),
    } as never);

    const result = await controller.updateProfile({
      full_name: 'Maria Souza',
      phone: '11888888888',
      birth_date: '1990-01-01',
    } as any);

    expect(customersRepository.update).toHaveBeenCalledWith(
      'customer-1',
      expect.objectContaining({
        full_name: 'Maria Souza',
        phone: '11888888888',
        birth_date: new Date('1990-01-01'),
      }),
    );
    expect(result.id).toBe('customer-1');
  });

  it('should throw when customer context is absent', async () => {
    cls.get.mockReturnValue(undefined);

    await expect(controller.getPoints()).rejects.toThrow(ForbiddenException);
  });
});
