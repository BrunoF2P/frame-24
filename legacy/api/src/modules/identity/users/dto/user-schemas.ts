import { z } from 'zod';

export const UserPersonalDataSchema = z.object({
  full_name: z.string().min(3, 'Nome muito curto').max(200, 'Nome muito longo'),
  cpf: z.string().optional(),
  birth_date: z.string().datetime('Data de nascimento inválida').optional(),
  phone: z.string().max(20, 'Telefone muito longo').optional(),
  mobile: z.string().max(20, 'Celular muito longo').optional(),
  email: z.string().email('Email inválido').max(100, 'Email muito longo'),
});

export const UserAddressSchema = z.object({
  zip_code: z.string().max(10, 'CEP inválido').optional(),
  street_address: z.string().max(300, 'Endereço muito longo').optional(),
  address_number: z.string().max(20, 'Número muito longo').optional(),
  address_complement: z.string().max(100, 'Complemento muito longo').optional(),
  neighborhood: z.string().max(100, 'Bairro muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().length(2, 'Estado deve ter 2 letras (UF)').optional(),
  country: z.string().length(2, 'País deve ter 2 letras').default('BR'),
});

export const UserCompanyDataSchema = z.object({
  role_id: z.string().min(1, 'Role é obrigatória'),
  department: z.string().max(100, 'Departamento muito longo').optional(),
  job_level: z.string().max(50, 'Nível do cargo muito longo').optional(),
  location: z.string().max(100, 'Localização muito longa').optional(),
  allowed_complexes: z.array(z.string()).optional(),
  ip_whitelist: z
    .array(
      z
        .string()
        .regex(
          /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
          'Formato de IP inválido (IPv4)',
        )
        .or(
          z
            .string()
            .regex(
              /([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4})/,
              'Formato de IP inválido (IPv6)',
            ),
        ),
    )
    .optional(),
  start_date: z.string().datetime('Data de início inválida').optional(),
  end_date: z
    .string()
    .datetime('Data de término inválida')
    .nullable()
    .optional(),
  active: z.boolean().default(true),
});

export const UserPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter maiúscula, minúscula e número',
    ),
});

export const CreateUserSchema = UserPersonalDataSchema.merge(UserAddressSchema)
  .merge(UserCompanyDataSchema)
  .merge(UserPasswordSchema);

export const UpdateUserSchema = CreateUserSchema.omit({
  password: true,
}).partial();
