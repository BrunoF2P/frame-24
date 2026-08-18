import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { EmployeeIdGeneratorService } from 'src/modules/identity/auth/services/employee-id-generator';

type MockPrismaService = {
  companies: {
    findUnique: jest.Mock;
  };
  company_users: {
    count: jest.Mock;
    findFirst: jest.Mock;
  };
};

describe('EmployeeIdGeneratorService', () => {
  let service: EmployeeIdGeneratorService;
  let prisma: MockPrismaService;

  const companyId = 'company-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeIdGeneratorService,
        {
          provide: PrismaService,
          useValue: {
            companies: {
              findUnique: jest.fn(),
            },
            company_users: {
              count: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(EmployeeIdGeneratorService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('deve gerar employee_id no formato CODE-0001', async () => {
      prisma.companies.findUnique.mockResolvedValue({
        corporate_name: 'Cinema Estrela LTDA',
        trade_name: 'Cinema Estrela',
        tenant_slug: 'cinema-estrela',
      });

      prisma.company_users.count.mockResolvedValue(0);

      const id = await service.generate(companyId);

      expect(id).toMatch(/^[A-Z]{2,3}-\d{4}$/);
      expect(id.endsWith('-0001')).toBe(true);
    });

    it('deve incrementar o número sequencial baseado na contagem', async () => {
      prisma.companies.findUnique.mockResolvedValue({
        corporate_name: 'Cinema Estrela LTDA',
        trade_name: 'Cinema Estrela',
        tenant_slug: 'cinema-estrela',
      });

      prisma.company_users.count.mockResolvedValueOnce(9);
      const id = await service.generate(companyId);

      expect(id.endsWith('-0010')).toBe(true);
      expect(prisma.company_users.count).toHaveBeenCalledWith({
        where: { company_id: companyId },
      });
    });

    it('deve lançar BadRequestException quando empresa não existir', async () => {
      prisma.companies.findUnique.mockResolvedValue(null);

      await expect(service.generate(companyId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateCompanyCode (via generate)', () => {
    it('deve usar iniciais de palavras significativas (estratégia 1)', async () => {
      prisma.companies.findUnique.mockResolvedValue({
        corporate_name: 'Cinema Centro',
        trade_name: 'Cinema Centro Shopping',
        tenant_slug: 'cinema-centro',
      });
      prisma.company_users.count.mockResolvedValue(0);

      const id = await service.generate(companyId);

      expect(id).toBe('CEN-0001');
    });

    it('deve usar parte única do tenant_slug quando aplicável (estratégia 2)', async () => {
      prisma.companies.findUnique.mockResolvedValue({
        corporate_name: 'AB', // Forçar falha na Estratégia 1
        trade_name: null,
        tenant_slug: 'cinema-estrela',
      });
      prisma.company_users.count.mockResolvedValue(3);

      const id = await service.generate(companyId);

      // Agora sim usa a Estratégia 2
      expect(id).toBe('EST-0004');
    });

    it('deve usar primeiras letras do nome quando necessário (estratégia 3)', async () => {
      prisma.companies.findUnique.mockResolvedValue({
        corporate_name: 'CE',
        trade_name: null,
        tenant_slug: 'ce',
      });
      prisma.company_users.count.mockResolvedValue(1);

      const id = await service.generate(companyId);

      // Usa primeiras letras do corporate_name "CE" -> "CE"
      expect(id.startsWith('CE')).toBe(true);
    });

    it('deve ignorar palavras comuns como ltda/sa/me/epp nas iniciais', async () => {
      prisma.companies.findUnique.mockResolvedValue({
        corporate_name: 'CineFrame Entretenimento LTDA',
        trade_name: 'CineFrame Cinemas SA',
        tenant_slug: 'cineframe',
      });
      prisma.company_users.count.mockResolvedValue(0);

      const id = await service.generate(companyId);

      // Deve pegar "CC" de "CineFrame Cinemas"
      expect(id.startsWith('CC')).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('deve retornar true quando employee_id não existir na empresa', async () => {
      prisma.company_users.findFirst.mockResolvedValue(null);

      const ok = await service.isAvailable('CE-0001', companyId);

      expect(ok).toBe(true);
      expect(prisma.company_users.findFirst).toHaveBeenCalledWith({
        where: { employee_id: 'CE-0001', company_id: companyId },
      });
    });

    it('deve retornar false quando employee_id já existir na empresa', async () => {
      prisma.company_users.findFirst.mockResolvedValue({ id: 'cu-1' });

      const ok = await service.isAvailable('CE-0001', companyId);

      expect(ok).toBe(false);
    });
  });

  describe('parseEmployeeId', () => {
    it('deve parsear corretamente um employee_id válido', () => {
      const result = service.parseEmployeeId('CE-0042');
      expect(result).toEqual({ code: 'CE', number: 42 });
    });

    it('deve retornar null para formato inválido', () => {
      expect(service.parseEmployeeId('C-42')).toBeNull();
      expect(service.parseEmployeeId('CE0042')).toBeNull();
      expect(service.parseEmployeeId('123-0001')).toBeNull();
    });
  });

  describe('isValidFormat', () => {
    it('deve validar formatos corretos', () => {
      expect(service.isValidFormat('CE-0001')).toBe(true);
      expect(service.isValidFormat('CIN-1234')).toBe(true);
    });

    it('deve invalidar formatos incorretos', () => {
      expect(service.isValidFormat('C-0001')).toBe(false);
      expect(service.isValidFormat('CE-01')).toBe(false);
      expect(service.isValidFormat('ce-0001')).toBe(false);
      expect(service.isValidFormat('CE0001')).toBe(false);
    });
  });
});
