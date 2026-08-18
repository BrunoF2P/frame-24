import { tenancyLogic } from './prisma-tenancy.extension';

describe('tenancyLogic', () => {
  const clsWithoutCompany = {
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts explicit company_id for create without CLS company context', async () => {
    const query = jest.fn().mockResolvedValue('ok');

    await expect(
      tenancyLogic(clsWithoutCompany as any, {
        model: 'custom_roles',
        operation: 'create',
        args: {
          data: {
            company_id: 'company-123',
            name: 'Super Admin',
          },
        },
        query,
      }),
    ).resolves.toBe('ok');

    expect(query).toHaveBeenCalledWith({
      data: {
        company_id: 'company-123',
        name: 'Super Admin',
      },
    });
  });

  it('accepts companies.connect.id as explicit scope for create without CLS company context', async () => {
    const query = jest.fn().mockResolvedValue('ok');

    await expect(
      tenancyLogic(clsWithoutCompany as any, {
        model: 'custom_roles',
        operation: 'create',
        args: {
          data: {
            companies: {
              connect: { id: 'company-123' },
            },
            name: 'Super Admin',
          },
        },
        query,
      }),
    ).resolves.toBe('ok');

    expect(query).toHaveBeenCalledWith({
      data: {
        companies: {
          connect: { id: 'company-123' },
        },
        name: 'Super Admin',
      },
    });
  });

  it('accepts identity_id scope for company_users reads without CLS company context', async () => {
    const query = jest.fn().mockResolvedValue('ok');

    await expect(
      tenancyLogic(clsWithoutCompany as any, {
        model: 'company_users',
        operation: 'findMany',
        args: {
          where: {
            identity_id: 'identity-123',
            active: true,
          },
        },
        query,
      }),
    ).resolves.toBe('ok');

    expect(query).toHaveBeenCalledWith({
      where: {
        identity_id: 'identity-123',
        active: true,
      },
    });
  });

  it('throws when a company-scoped create has no explicit scope and no CLS company context', () => {
    const query = jest.fn();

    expect(() =>
      tenancyLogic(clsWithoutCompany as any, {
        model: 'custom_roles',
        operation: 'create',
        args: {
          data: {
            name: 'Super Admin',
          },
        },
        query,
      }),
    ).toThrow('[TENANCY] Missing company scope for custom_roles.create');

    expect(query).not.toHaveBeenCalled();
  });
});
