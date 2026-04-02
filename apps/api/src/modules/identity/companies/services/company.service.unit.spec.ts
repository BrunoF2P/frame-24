import { BadRequestException } from '@nestjs/common';
import { CompanyService } from './company.service';

describe('CompanyService', () => {
  const logger = {
    error: jest.fn(),
  };

  let service: CompanyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompanyService({} as any, {} as any, logger as any);
  });

  it('throws a clear bad request when a company field exceeds the column limit', () => {
    expect(() =>
      (service as any).assertColumnLengths({
        corporate_name: 'Empresa Teste LTDA',
        cnpj: '12345678000199',
        address_complement: 'a'.repeat(101),
      } as any),
    ).toThrow(BadRequestException);

    expect(() =>
      (service as any).assertColumnLengths({
        corporate_name: 'Empresa Teste LTDA',
        cnpj: '12345678000199',
        address_complement: 'a'.repeat(101),
      } as any),
    ).toThrow(
      'Os seguintes campos excedem o tamanho permitido: address_complement (101/100).',
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Company payload has oversized fields: address_complement (101/100)',
      undefined,
      CompanyService.name,
    );
  });

  it('accepts company data when all string fields are within limits', () => {
    expect(() =>
      (service as any).assertColumnLengths({
        corporate_name: 'CASH TIME PAY PRODUTOS E SERVICOS DIGITAIS LTDA',
        cnpj: '37202552000192',
        trade_name: 'Cash Time Pay',
        zip_code: '12345678',
        street_address: 'Rua Teste',
        address_number: '100',
        neighborhood: 'Centro',
        city: 'Salvador',
        state: 'BA',
        country: 'BR',
        phone: '71999999999',
        email: 'teste@example.com',
      } as any),
    ).not.toThrow();
  });

  it('generates a tenant slug capped at the database limit', () => {
    const tenantSlug = (service as any).generateTenantSlug(
      'CASH TIME PAY PRODUTOS E SERVICOS DIGITAIS LTDA',
      '37202552000192',
    );

    expect(tenantSlug).toBe(
      'cash-time-pay-produtos-e-servicos-digitais-lt-0192',
    );
    expect(tenantSlug).toHaveLength(50);
  });
});
