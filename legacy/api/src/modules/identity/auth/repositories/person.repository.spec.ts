import { Test, TestingModule } from '@nestjs/testing';
import { PersonRepository } from './person.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { Person } from '../domain/entities/person.entity';
import { PersonMapper } from 'src/modules/identity/auth/infraestructure/mappers/person.mapper';

type MockPrismaService = {
  persons: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const mockRawPerson = {
  id: '123456789',
  full_name: 'João Silva',
  cpf: '12345678900',
  passport_number: 'AB123456',
  birth_date: new Date('1990-01-01'),
  phone: '1133334444',
  mobile: '11999999999',
  email: 'joao@example.com',
  zip_code: '01310100',
  street_address: 'Av. Paulista',
  address_number: '1578',
  address_complement: 'Apto 101',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  country: 'BR',
  external_id: null,
  picture_url: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockDomainPerson: Person = {
  id: '123456789',
  fullName: 'João Silva',
  cpf: '12345678900',
  passportNumber: 'AB123456',
  birthDate: new Date('1990-01-01'),
  phone: '1133334444',
  mobile: '11999999999',
  email: 'joao@example.com',
  zipCode: '01310100',
  streetAddress: 'Av. Paulista',
  addressNumber: '1578',
  addressComplement: 'Apto 101',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  country: 'BR',
  externalId: null,
  pictureUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Person;

describe('PersonRepository', () => {
  let repository: PersonRepository;
  let prismaService: MockPrismaService;
  let snowflakeService: jest.Mocked<SnowflakeService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonRepository,
        {
          provide: PrismaService,
          useValue: {
            persons: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: SnowflakeService,
          useValue: {
            generate: jest.fn().mockReturnValue('123456789'),
          },
        },
      ],
    }).compile();

    repository = module.get<PersonRepository>(PersonRepository);
    prismaService = module.get(PrismaService);
    snowflakeService = module.get(SnowflakeService);

    jest.spyOn(PersonMapper, 'toDomain').mockReturnValue(mockDomainPerson);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar Person do domínio quando encontrada', async () => {
      prismaService.persons.findUnique.mockResolvedValue(mockRawPerson);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockDomainPerson);
      expect(prismaService.persons.findUnique).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });

    it('deve retornar null quando não encontrar', async () => {
      prismaService.persons.findUnique.mockResolvedValue(null);

      const result = await repository.findById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('findByCpf', () => {
    it('deve retornar Person do domínio quando encontrada por CPF', async () => {
      prismaService.persons.findUnique.mockResolvedValue(mockRawPerson);

      const result = await repository.findByCpf('12345678900');

      expect(result).toEqual(mockDomainPerson);
      expect(prismaService.persons.findUnique).toHaveBeenCalledWith({
        where: { cpf: '12345678900' },
      });
    });

    it('deve retornar null quando não encontrar por CPF', async () => {
      prismaService.persons.findUnique.mockResolvedValue(null);

      const result = await repository.findByCpf('00000000000');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('deve criar uma nova pessoa com nome obrigatório', async () => {
      prismaService.persons.create.mockResolvedValue(mockRawPerson);

      const result = await repository.create('João Silva');

      expect(result).toEqual(mockDomainPerson);
      expect(snowflakeService.generate).toHaveBeenCalled();
      expect(prismaService.persons.create).toHaveBeenCalledWith({
        data: {
          id: '123456789',
          full_name: 'João Silva',
          email: undefined,
          mobile: undefined,
        },
      });
    });

    it('deve criar pessoa com email e mobile', async () => {
      prismaService.persons.create.mockResolvedValue(mockRawPerson);

      const result = await repository.create(
        'João Silva',
        'joao@example.com',
        '11999999999',
      );

      expect(result).toEqual(mockDomainPerson);
      expect(prismaService.persons.create).toHaveBeenCalledWith({
        data: {
          id: '123456789',
          full_name: 'João Silva',
          email: 'joao@example.com',
          mobile: '11999999999',
        },
      });
    });
  });

  describe('createPerson', () => {
    it('deve criar pessoa com todos os dados', async () => {
      prismaService.persons.create.mockResolvedValue(mockRawPerson);

      const result = await repository.createPerson({
        fullName: 'Maria',
        cpf: '11122233344',
        birthDate: '1991-12-12',
        phone: '1133334444',
        mobile: '11999999999',
        email: 'maria@example.com',
        zipCode: '11122233',
        streetAddress: 'Rua 2',
        addressNumber: '99',
        addressComplement: 'Casa',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        country: 'BR',
      });

      expect(result).toEqual(mockDomainPerson);
      expect(prismaService.persons.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cpf: '11122233344',
          birth_date: new Date('1991-12-12'),
          phone: '1133334444',
          mobile: '11999999999',
          email: 'maria@example.com',
          city: 'Campinas',
          state: 'SP',
        }),
      });
    });
  });

  describe('updatePersonData', () => {
    it('deve atualizar pelo id, alterando qualquer campo', async () => {
      prismaService.persons.update.mockResolvedValue(mockRawPerson);

      await repository.updatePersonData('123456789', {
        fullName: 'Nome Novo',
        email: 'novo@email.com',
        zipCode: '99999999',
        state: 'RJ',
      });

      expect(prismaService.persons.update).toHaveBeenCalledWith({
        where: { id: '123456789' },
        data: expect.objectContaining({
          full_name: 'Nome Novo',
          email: 'novo@email.com',
          zip_code: '99999999',
          state: 'RJ',
        }),
      });
    });
  });

  describe('delete', () => {
    it('deve deletar e retornar a pessoa do domínio', async () => {
      prismaService.persons.delete.mockResolvedValue(mockRawPerson);

      const result = await repository.delete('123456789');

      expect(result).toEqual(mockDomainPerson);
      expect(prismaService.persons.delete).toHaveBeenCalledWith({
        where: { id: '123456789' },
      });
    });
  });
});
