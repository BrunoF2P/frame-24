import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto'; // Importante para gerar IDs

const prisma = createPrismaClient();

async function main() {
  console.log('🧹 Limpando dados inválidos de execuções anteriores...');
  // Remove registros criados com ID vazio para evitar conflitos
  await prisma.seats.deleteMany({ where: { id: '' } });
  await prisma.rooms.deleteMany({ where: { id: '' } });
  await prisma.cinema_complexes.deleteMany({ where: { id: '' } });
  await prisma.projection_types.deleteMany({ where: { id: '' } });
  await prisma.audio_types.deleteMany({ where: { id: '' } });
  await prisma.seat_types.deleteMany({ where: { id: '' } });

  console.log('🎬 Iniciando criação de Sala de Cinema...');

  // 1. Buscar a primeira empresa (Tenant) disponível
  const company =
    (await prisma.companies.findUnique({
      where: { tenant_slug: 'lawtrel-admin' },
    })) ??
    (await prisma.companies.findFirst({
      where: { active: true },
    }));

  if (!company) {
    console.error(
      '❌ Nenhuma empresa encontrada. Crie uma empresa ou rode o seed inicial primeiro.',
    );
    return;
  }

  console.log(
    `🏢 Empresa encontrada: ${company.corporate_name} (ID: ${company.id})`,
  );

  // 2. Criar ou Buscar Complexo de Cinema
  let complex = await prisma.cinema_complexes.findFirst({
    where: { company_id: company.id },
  });

  if (!complex) {
    console.log('🏗️ Criando Complexo de Cinema padrão...');
    complex = await prisma.cinema_complexes.create({
      data: {
        id: randomUUID(), // <--- Gerando ID Manualmente
        company_id: company.id,
        name: 'Cineplex Central',
        code: 'CX-001',
        active: true,
        address: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        ibge_municipality_code: '3550308',
      },
    });
  }
  console.log(`✅ Complexo: ${complex.name} (ID: ${complex.id})`);

  // 3. Criar Tipos de Projeção e Áudio
  console.log('🔊 Verificando tipos técnicos...');

  const projType = await prisma.projection_types.upsert({
    where: { company_id_name: { company_id: company.id, name: '2D Digital' } },
    update: {},
    create: {
      id: randomUUID(), // <--- Gerando ID
      company_id: company.id,
      name: '2D Digital',
      description: 'Projeção Digital Padrão',
      additional_value: 0,
    },
  });

  const audioType = await prisma.audio_types.upsert({
    where: { company_id_name: { company_id: company.id, name: 'Dolby 5.1' } },
    update: {},
    create: {
      id: randomUUID(), // <--- Gerando ID
      company_id: company.id,
      name: 'Dolby 5.1',
      description: 'Som Surround 5.1',
      additional_value: 0,
    },
  });

  // 4. Criar Tipo de Assento
  const seatType = await prisma.seat_types.upsert({
    where: { company_id_name: { company_id: company.id, name: 'Padrão' } },
    update: {},
    create: {
      id: randomUUID(), // <--- Gerando ID
      company_id: company.id,
      name: 'Padrão',
      description: 'Poltrona comum',
      additional_value: 0,
    },
  });

  // 5. Criar a Sala
  console.log('🚪 Criando Sala 01...');

  let room = await prisma.rooms.findFirst({
    where: {
      cinema_complex_id: complex.id,
      room_number: '01',
    },
  });

  if (!room) {
    room = await prisma.rooms.create({
      data: {
        id: randomUUID(), // <--- Gerando ID
        cinema_complex_id: complex.id,
        room_number: '01',
        name: 'Sala Premier 01',
        capacity: 50,
        projection_type: projType.id,
        audio_type: audioType.id,
        active: true,
        total_rows: 5,
        total_columns: 10,
      },
    });
    console.log(`✅ Sala criada: ${room.name}`);
  } else {
    console.log(`ℹ️ Sala 01 já existe.`);
  }

  // 6. Gerar Assentos
  console.log('💺 Gerando assentos...');

  const rows = ['A', 'B', 'C', 'D', 'E'];
  let seatsCreated = 0;

  for (let r = 0; r < rows.length; r++) {
    const rowCode = rows[r];
    for (let c = 1; c <= 10; c++) {
      const seatCode = `${rowCode}${c}`;

      const exists = await prisma.seats.findUnique({
        where: {
          room_id_seat_code: {
            room_id: room.id,
            seat_code: seatCode,
          },
        },
      });

      if (!exists) {
        await prisma.seats.create({
          data: {
            id: randomUUID(), // <--- Gerando ID para cada assento!
            room_id: room.id,
            seat_code: seatCode,
            row_code: rowCode,
            column_number: c,
            seat_type: seatType.id,
            active: true,
            accessible: rowCode === 'A',
          },
        });
        seatsCreated++;
      }
    }
  }

  console.log(`✅ Total de ${seatsCreated} novos assentos criados.`);
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
