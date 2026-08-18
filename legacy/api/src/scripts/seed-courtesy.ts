import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';

const prisma = createPrismaClient();

async function main() {
  console.log('🎟️ Criando Tipo de Ingresso: Cortesia...');

  const company =
    (await prisma.companies.findUnique({
      where: { tenant_slug: 'lawtrel-admin' },
    })) ?? (await prisma.companies.findFirst({ where: { active: true } }));
  if (!company) return console.error('❌ Nenhuma empresa ativa encontrada.');

  await prisma.ticket_types.upsert({
    where: { company_id_name: { company_id: company.id, name: 'Cortesia' } },
    update: { discount_percentage: 100 }, // Garante 100% de desconto na atualização
    create: {
      id: randomUUID(),
      company_id: company.id,
      name: 'Cortesia',
      description: 'Ingresso gratuito promocional',
      discount_percentage: 100, // 100% OFF
      // price_modifier foi removido para corrigir o TSError
    },
  });

  console.log('✅ Cortesia criada com sucesso!');
}

main().finally(() => prisma.$disconnect());
