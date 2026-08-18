import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';
import { MASTER_DATA } from '../common/constants/master-data.constant';

const prisma = createPrismaClient();

async function main() {
  console.log('🖥️ Criando lookups do POS...');

  const company =
    (await prisma.companies.findUnique({
      where: { tenant_slug: 'lawtrel-admin' },
    })) ?? (await prisma.companies.findFirst({ where: { active: true } }));
  if (!company) return console.error('❌ Nenhuma empresa ativa encontrada.');

  console.log(`🏢 Empresa alvo: ${company.trade_name ?? company.tenant_slug}`);

  for (const status of MASTER_DATA.pos.session_status) {
    await prisma.pos_session_status.upsert({
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
    console.log(`✅ Status de caixa: ${status.name}`);
  }

  for (const method of MASTER_DATA.pos.payment_methods) {
    await prisma.pos_payment_methods.upsert({
      where: {
        company_id_name: { company_id: company.id, name: method.name },
      },
      update: {
        description: method.description,
        requires_change: method.requires_change,
        auto_settle: method.auto_settle,
        settlement_days: method.settlement_days,
        active: method.active,
      },
      create: {
        id: randomUUID(),
        company_id: company.id,
        name: method.name,
        description: method.description,
        requires_change: method.requires_change,
        auto_settle: method.auto_settle,
        settlement_days: method.settlement_days,
        active: method.active,
      },
    });
    console.log(`✅ Método de pagamento POS: ${method.name}`);
  }

  console.log('✅ Lookups do POS criados com sucesso!');
}

main().finally(() => prisma.$disconnect());
