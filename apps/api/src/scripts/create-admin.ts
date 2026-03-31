import { createPrismaClient } from '@repo/db';
import * as bcrypt from 'bcrypt';

const prisma = createPrismaClient();

async function main() {
  const email = 'admin@lawtrel.com';
  const password = 'lawtrel';

  // 1. Gerar hash da senha (bypassing da validação de complexidade da API)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log(`⏳ Criando administrador...`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Senha: ${password}`);

  // 2. Criar ou recuperar a Empresa (Tenant)
  const company = await prisma.companies.upsert({
    where: { tenant_slug: 'lawtrel-admin' },
    update: {},
    create: {
      corporate_name: 'Lawtrel Administração',
      trade_name: 'Lawtrel Admin',
      tenant_slug: 'lawtrel-admin',
      cnpj: '00000000000100', // CNPJ Fictício
      email: 'contato@lawtrel.com',
      tax_regime: 'SIMPLES_NACIONAL', // Enum obrigatório
      active: true,
    },
  });

  console.log(`✅ Empresa criada/encontrada: ${company.trade_name}`);

  // 3. Criar a Pessoa (Dados Pessoais)
  const existingPerson = await prisma.persons.findFirst({
    where: { email },
  });

  const person =
    existingPerson ??
    (await prisma.persons.create({
      data: {
        full_name: 'Super Admin',
        email: email,
        cpf: '00000000000', // CPF Fictício
      },
    }));

  // 4. Criar a Identidade (Login)
  const existingIdentity = await prisma.identities.findFirst({
    where: { email },
  });

  const identity =
    existingIdentity ??
    (await prisma.identities.create({
      data: {
        person_id: person.id,
        email: email,
        password_hash: hashedPassword,
        identity_type: 'EMPLOYEE', // Tipo de identidade
        active: true,
        email_verified: true,
      },
    }));

  console.log(`✅ Identidade de login criada.`);

  // 5. Criar Perfil de Acesso (Role)
  const role = await prisma.custom_roles.upsert({
    where: {
      company_id_name: {
        company_id: company.id,
        name: 'Super Admin',
      },
    },
    update: {},
    create: {
      company_id: company.id,
      name: 'Super Admin',
      description: 'Acesso total ao sistema',
      is_system_role: true,
      hierarchy_level: 1,
    },
  });

  // 6. Vincular Usuário à Empresa com o Perfil
  await prisma.company_users.upsert({
    where: {
      company_id_identity_id: {
        company_id: company.id,
        identity_id: identity.id,
      },
    },
    update: {
      role_id: role.id,
      active: true,
    },
    create: {
      company_id: company.id,
      identity_id: identity.id,
      role_id: role.id,
      employee_id: 'ADM-001', // Código interno
      active: true,
      start_date: new Date(),
    },
  });

  console.log(`\n🚀 Usuário Admin criado com sucesso!`);
  console.log(`Pode fazer login em: http://localhost:3005`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
