import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';

const prisma = createPrismaClient();

async function main() {
  console.log('🪑 Criando Status de Assentos...');

  const company = await prisma.companies.findFirst({ where: { active: true } });
  if (!company) return console.error('❌ Nenhuma empresa ativa encontrada.');

  const statuses = [
    {
      name: 'Livre',
      description: 'Assento disponível para venda',
      is_default: true, // <--- O sistema procura por ISSO
    },
    {
      name: 'Vendido',
      description: 'Assento já comprado',
      is_default: false,
    },
    {
      name: 'Bloqueado',
      description: 'Bloqueio administrativo ou técnico',
      is_default: false,
    },
    {
      name: 'Reservado',
      description: 'Em processo de compra',
      is_default: false,
    },
  ];

  for (const status of statuses) {
    await prisma.seat_status.upsert({
      where: { company_id_name: { company_id: company.id, name: status.name } },
      update: { is_default: status.is_default }, // Garante atualização se já existir
      create: {
        id: randomUUID(),
        company_id: company.id,
        name: status.name,
        description: status.description,
        is_default: status.is_default,
        allows_modification: true,
      },
    });
    console.log(
      `✅ Status de assento criado: ${status.name} (Padrão: ${status.is_default})`,
    );
  }

  console.log('🚀 Script finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
