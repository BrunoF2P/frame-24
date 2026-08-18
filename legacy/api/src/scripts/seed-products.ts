import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';

const prisma = createPrismaClient();

async function main() {
  console.log('🍿 Iniciando criação de Produtos de Bombonière...');

  // 1. Buscar empresa ativa
  const company = await prisma.companies.findFirst({ where: { active: true } });
  if (!company) return console.error('❌ Nenhuma empresa ativa encontrada.');

  console.log(`🏢 Empresa: ${company.corporate_name}`);

  // 2. Buscar o Complexo de Cinema (Preços são por complexo)
  const complex = await prisma.cinema_complexes.findFirst({
    where: { company_id: company.id },
  });

  if (!complex) {
    console.error(
      '⚠️ Atenção: Nenhum complexo de cinema encontrado. Os preços não serão criados.',
    );
  } else {
    console.log(`asd Complexo alvo para preços: ${complex.name}`);
  }

  // 3. Criar Categorias
  const categories = [
    { name: 'Pipoca', description: 'Pipocas salgadas e doces' },
    { name: 'Bebidas', description: 'Refrigerantes, águas e sucos' },
    { name: 'Doces', description: 'Chocolates e balas' },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categories) {
    const created = await prisma.product_categories.upsert({
      where: { company_id_name: { company_id: company.id, name: cat.name } },
      update: {},
      create: {
        id: randomUUID(),
        company_id: company.id,
        name: cat.name,
        description: cat.description,
      },
    });
    categoryMap.set(cat.name, created.id);
    console.log(`✅ Categoria: ${cat.name}`);
  }

  // 4. Criar Produtos e Preços
  const products = [
    {
      name: 'Pipoca Grande',
      code: 'PIP-G',
      cat: 'Pipoca',
      price: 22.0,
      image:
        'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&q=80&w=300&h=300',
    },
    {
      name: 'Pipoca Média',
      code: 'PIP-M',
      cat: 'Pipoca',
      price: 18.0,
      image:
        'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&q=80&w=300&h=300',
    },
    {
      name: 'Refrigerante 500ml',
      code: 'REF-500',
      cat: 'Bebidas',
      price: 12.0,
      image:
        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=300&h=300',
    },
    {
      name: 'Água Mineral',
      code: 'AGUA',
      cat: 'Bebidas',
      price: 6.0,
      image:
        'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&q=80&w=300&h=300',
    },
    {
      name: 'Chocolate',
      code: 'CHOC',
      cat: 'Doces',
      price: 8.0,
      image:
        'https://images.unsplash.com/photo-1511381978029-18b029a99b49?auto=format&fit=crop&q=80&w=300&h=300',
    },
  ];

  for (const prod of products) {
    const categoryId = categoryMap.get(prod.cat);
    if (!categoryId) continue;

    // A. Criar o Produto
    const product = await prisma.products.upsert({
      where: {
        company_id_product_code: {
          company_id: company.id,
          product_code: prod.code,
        },
      },
      update: {
        is_available_online: true, // Garante que apareça no site
        image_url: prod.image,
      },
      create: {
        id: randomUUID(),
        company_id: company.id,
        category_id: categoryId,
        product_code: prod.code,
        name: prod.name,
        description: `Delicioso ${prod.name}`,
        image_url: prod.image,
        active: true,
        is_available_online: true,
        unit: 'UN',
      },
    });

    // B. Criar o Preço (Se existir complexo)
    if (complex) {
      // Verifica se já existe preço ativo para este produto neste complexo
      const priceExists = await prisma.product_prices.findFirst({
        where: {
          product_id: product.id,
          complex_id: complex.id,
          active: true,
        },
      });

      if (!priceExists) {
        await prisma.product_prices.create({
          data: {
            id: randomUUID(),
            company_id: company.id,
            product_id: product.id,
            complex_id: complex.id,
            sale_price: prod.price,
            cost_price: prod.price * 0.4, // Custo estimado
            active: true,
            valid_from: new Date(), // Válido a partir de agora
          },
        });
        console.log(`   💲 Preço criado: R$ ${prod.price}`);
      }
    }

    console.log(`✅ Produto processado: ${prod.name}`);
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
