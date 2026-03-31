import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';
import { MASTER_DATA } from '../common/constants/master-data.constant';

const prisma = createPrismaClient();

async function findTargetCompany() {
  return (
    (await prisma.companies.findUnique({
      where: { tenant_slug: 'lawtrel-admin' },
    })) ??
    (await prisma.companies.findFirst({
      where: { active: true },
    }))
  );
}

async function main() {
  console.log('🧾 Criando lookups de vendas...');

  const company = await findTargetCompany();
  if (!company) {
    console.error('❌ Nenhuma empresa encontrada.');
    process.exit(1);
  }

  console.log(`🏢 Empresa alvo: ${company.trade_name ?? company.tenant_slug}`);

  for (const type of MASTER_DATA.sales.sale_types) {
    await prisma.sale_types.upsert({
      where: { company_id_name: { company_id: company.id, name: type.name } },
      update: {
        description: type.description,
        convenience_fee: type.convenience_fee,
      },
      create: {
        id: randomUUID(),
        company_id: company.id,
        name: type.name,
        description: type.description,
        convenience_fee: type.convenience_fee,
      },
    });
  }

  for (const status of MASTER_DATA.sales.sale_status) {
    await prisma.sale_status.upsert({
      where: {
        company_id_name: { company_id: company.id, name: status.name },
      },
      update: {
        description: status.description,
        allows_modification: status.allows_modification,
      },
      create: {
        id: randomUUID(),
        company_id: company.id,
        name: status.name,
        description: status.description,
        allows_modification: status.allows_modification,
      },
    });
  }

  for (const type of MASTER_DATA.sales.ticket_types) {
    await prisma.ticket_types.upsert({
      where: { company_id_name: { company_id: company.id, name: type.name } },
      update: {
        description: type.description,
        discount_percentage: type.discount_percentage,
      },
      create: {
        id: randomUUID(),
        company_id: company.id,
        name: type.name,
        description: type.description,
        discount_percentage: type.discount_percentage,
      },
    });
  }

  console.log(
    '✅ Tipos de venda, status de venda e tipos de ingresso criados.',
  );
}

main()
  .catch((error) => {
    console.error('❌ Erro ao criar lookups de vendas:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
