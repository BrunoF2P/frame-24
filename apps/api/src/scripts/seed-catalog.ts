import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto'; // Import para gerar IDs

const prisma = createPrismaClient();

async function main() {
  console.log(`🌱 Iniciando seed do catálogo...`);

  // 1. Recuperar a Empresa (Tenant) criada anteriormente
  const company = await prisma.companies.findUnique({
    where: { tenant_slug: 'lawtrel-admin' },
  });

  if (!company) {
    console.error(
      '❌ Empresa "lawtrel-admin" não encontrada. Rode o script create-admin.ts primeiro.',
    );
    process.exit(1);
  }

  const companyId = company.id;
  console.log(`🏢 Populando dados para a empresa: ${company.trade_name}`);

  // 2. Popular Classificações Indicativas (Padrão Brasil)
  const ratings = [
    {
      code: 'L',
      name: 'Livre',
      minAge: 0,
      desc: 'Exibição em qualquer horário',
    },
    {
      code: '10',
      name: '10 Anos',
      minAge: 10,
      desc: 'Não recomendado para menores de 10 anos',
    },
    {
      code: '12',
      name: '12 Anos',
      minAge: 12,
      desc: 'Não recomendado para menores de 12 anos',
    },
    {
      code: '14',
      name: '14 Anos',
      minAge: 14,
      desc: 'Não recomendado para menores de 14 anos',
    },
    {
      code: '16',
      name: '16 Anos',
      minAge: 16,
      desc: 'Não recomendado para menores de 16 anos',
    },
    {
      code: '18',
      name: '18 Anos',
      minAge: 18,
      desc: 'Não recomendado para menores de 18 anos',
    },
  ];

  console.log('🔞 Criando Classificações Indicativas...');
  for (const rating of ratings) {
    await prisma.age_ratings.upsert({
      where: { company_id_code: { company_id: companyId, code: rating.code } },
      update: {},
      create: {
        id: randomUUID(), // <--- ID Gerado manualmente
        company_id: companyId,
        code: rating.code,
        name: rating.name,
        minimum_age: rating.minAge,
        description: rating.desc,
      },
    });
  }

  // 3. Popular Categorias (Gêneros)
  const categories = [
    'Ação',
    'Aventura',
    'Comédia',
    'Drama',
    'Terror',
    'Ficção Científica',
    'Romance',
    'Animação',
    'Documentário',
    'Suspense',
    'Fantasia',
    'Musical',
  ];

  console.log('🎬 Criando Categorias de Filmes...');
  for (const catName of categories) {
    const slug = catName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');

    await prisma.movie_categories.upsert({
      where: { company_id_name: { company_id: companyId, name: catName } },
      update: {},
      create: {
        id: randomUUID(), // <--- ID Gerado manualmente
        company_id: companyId,
        name: catName,
        slug: slug,
        active: true,
      },
    });
  }

  // 4. Popular Tipos de Elenco
  console.log('🎭 Criando Tipos de Elenco...');
  const castTypes = [
    { name: 'Diretor', desc: 'Diretor do filme' },
    { name: 'Ator', desc: 'Ator/Atriz principal ou coadjuvante' },
    { name: 'Roteirista', desc: 'Escritor do roteiro' },
  ];

  for (const ct of castTypes) {
    await prisma.cast_types.upsert({
      where: { company_id_name: { company_id: companyId, name: ct.name } },
      update: {},
      create: {
        id: randomUUID(), // <--- ID Gerado manualmente
        company_id: companyId,
        name: ct.name,
        description: ct.desc,
      },
    });
  }

  // 5. Popular Tipos de Mídia
  console.log('🖼️ Criando Tipos de Mídia...');
  const mediaTypes = ['Poster', 'Backdrop', 'Trailer'];
  for (const mt of mediaTypes) {
    await prisma.media_types.upsert({
      where: { company_id_name: { company_id: companyId, name: mt } },
      update: {},
      create: {
        id: randomUUID(), // <--- ID Gerado manualmente
        company_id: companyId,
        name: mt,
      },
    });
  }

  // 6. Popular Distribuidores (Suppliers)
  const distributors = [
    { name: 'Warner Bros. Pictures', cnpj: '00000000000200' },
    { name: 'Universal Pictures', cnpj: '00000000000300' },
    { name: 'Disney', cnpj: '00000000000400' },
    { name: 'Sony Pictures', cnpj: '00000000000500' },
    { name: 'Paramount Pictures', cnpj: '00000000000600' },
  ];

  console.log('🚚 Criando Distribuidores...');
  for (const dist of distributors) {
    // Primeiro verificamos/criamos o tipo de fornecedor "Distribuidora"
    // Nota: Como estamos num loop e o upsert depende do nome, vamos buscar ou criar antes
    let supplierType = await prisma.supplier_types.findUnique({
      where: {
        company_id_name: { company_id: companyId, name: 'Distribuidora' },
      },
    });

    if (!supplierType) {
      supplierType = await prisma.supplier_types.create({
        data: {
          id: randomUUID(), // <--- ID Gerado manualmente
          company_id: companyId,
          name: 'Distribuidora',
          description: 'Distribuidora de filmes',
        },
      });
    }

    await prisma.suppliers.upsert({
      where: { company_id_cnpj: { company_id: companyId, cnpj: dist.cnpj } },
      update: { is_film_distributor: true },
      create: {
        id: randomUUID(), // <--- ID Gerado manualmente
        company_id: companyId,
        corporate_name: dist.name,
        trade_name: dist.name,
        cnpj: dist.cnpj,
        email: `contato@${dist.name.toLowerCase().replace(/\s+/g, '')}.com`,
        active: true,
        is_film_distributor: true,
        supplier_type_id: supplierType.id,
      },
    });
  }

  console.log(`\n✅ Seed do catálogo concluído com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
