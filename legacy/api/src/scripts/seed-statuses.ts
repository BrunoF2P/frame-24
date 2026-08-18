import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';

const prisma = createPrismaClient();

async function main() {
  console.log('📊 Criando Status de Sessão...');

  const company =
    (await prisma.companies.findUnique({
      where: { tenant_slug: 'lawtrel-admin' },
    })) ?? (await prisma.companies.findFirst({ where: { active: true } }));
  if (!company) return console.error('❌ Nenhuma empresa ativa encontrada.');

  const statuses = [
    { name: 'Aberta para Vendas', description: 'Ingressos disponíveis' },
    { name: 'Esgotada', description: 'Sem assentos disponíveis' },
    { name: 'Cancelada', description: 'Sessão cancelada' },
    { name: 'Fechada', description: 'Vendas encerradas' },
    { name: 'Em Breve', description: 'Vendas futuras' },
  ];

  for (const status of statuses) {
    await prisma.session_status.upsert({
      where: { company_id_name: { company_id: company.id, name: status.name } },
      update: {},
      create: {
        id: randomUUID(),
        company_id: company.id,
        name: status.name,
        description: status.description,
        allows_modification: true,
      },
    });
  }
  console.log('✅ Status criados com sucesso!');
}

main().finally(() => prisma.$disconnect());
