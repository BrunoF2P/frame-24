import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';

const prisma = createPrismaClient();

async function main() {
  console.log('🎬 Criando sessões (showtimes)...');

  const company = await prisma.companies.findUnique({
    where: { tenant_slug: 'lawtrel-admin' },
  });
  if (!company) throw new Error('Empresa não encontrada');

  const movies = await prisma.movies.findMany({
    where: { company_id: company.id, active: true },
  });

  const complex = await prisma.cinema_complexes.findFirst({
    where: { company_id: company.id },
  });
  if (!complex) throw new Error('Complexo não encontrado');

  const room = await prisma.rooms.findFirst({
    where: { cinema_complex_id: complex.id },
  });
  if (!room) throw new Error('Sala não encontrada');

  const statusAberta = await prisma.session_status.findFirst({
    where: { company_id: company.id, name: 'Aberta para Vendas' },
  });
  if (!statusAberta)
    throw new Error('Status "Aberta para Vendas" não encontrado');

  const projType = await prisma.projection_types.findFirst({
    where: { company_id: company.id },
  });
  const audioType = await prisma.audio_types.findFirst({
    where: { company_id: company.id },
  });
  const langDub = await prisma.session_languages.findFirst({
    where: { company_id: company.id, name: 'Dublado' },
  });
  const langLeg = await prisma.session_languages.findFirst({
    where: { company_id: company.id, name: 'Legendado' },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const showtimes: {
    movieIdx: number;
    hour: number;
    minute: number;
    lang: 'dub' | 'leg';
    price: number;
  }[] = [
    { movieIdx: 0, hour: 14, minute: 0, lang: 'dub', price: 32.0 },
    { movieIdx: 0, hour: 18, minute: 30, lang: 'leg', price: 36.0 },
    { movieIdx: 0, hour: 21, minute: 0, lang: 'leg', price: 36.0 },
    { movieIdx: 1, hour: 15, minute: 0, lang: 'dub', price: 32.0 },
    { movieIdx: 1, hour: 20, minute: 0, lang: 'leg', price: 36.0 },
    { movieIdx: 2, hour: 16, minute: 0, lang: 'dub', price: 30.0 },
    { movieIdx: 2, hour: 19, minute: 30, lang: 'leg', price: 34.0 },
    { movieIdx: 3, hour: 17, minute: 0, lang: 'leg', price: 38.0 },
    { movieIdx: 3, hour: 21, minute: 30, lang: 'leg', price: 38.0 },
    { movieIdx: 4, hour: 15, minute: 30, lang: 'dub', price: 34.0 },
    { movieIdx: 4, hour: 19, minute: 0, lang: 'leg', price: 38.0 },
  ];

  // Also add sessions for tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let created = 0;

  for (const day of [today, tomorrow]) {
    for (const s of showtimes) {
      const movie = movies[s.movieIdx];
      if (!movie) continue;

      const start = new Date(day);
      start.setHours(s.hour, s.minute, 0, 0);

      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (movie.duration_minutes ?? 120) + 15);

      if (start < now && day === today) continue;

      const lang = s.lang === 'dub' ? langDub : langLeg;

      const existing = await prisma.showtime_schedule.findFirst({
        where: {
          room_id: room.id,
          start_time: start,
        },
      });

      if (!existing) {
        await prisma.showtime_schedule.create({
          data: {
            id: randomUUID(),
            cinema_complex_id: complex.id,
            room_id: room.id,
            movie_id: movie.id,
            projection_type: projType?.id ?? null,
            audio_type: audioType?.id ?? null,
            session_language: lang?.id ?? null,
            status: statusAberta.id,
            available_seats: room.capacity ?? 50,
            sold_seats: 0,
            blocked_seats: 0,
            base_ticket_price: s.price,
            start_time: start,
            end_time: end,
          },
        });
        created++;
        console.log(
          `✅ Sessão: ${movie.brazil_title} — ${start.toLocaleString('pt-BR')} — ${s.lang === 'dub' ? 'Dublado' : 'Legendado'} — R$ ${s.price}`,
        );
      }
    }
  }

  console.log(`\n🎉 ${created} sessões criadas com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
