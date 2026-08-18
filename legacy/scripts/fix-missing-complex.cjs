const path = require('path');
const fs = require('fs');

process.chdir(path.join(__dirname, '..', 'apps', 'api'));

const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.companies.findFirst({
    where: { tenant_slug: 'lawtrel-admin' }
  });
  if (!company) {
    console.log('Company lawtrel-admin not found');
    return;
  }
  console.log('Company:', company.id, company.corporate_name, 'city:', company.city);

  if (!company.city || !company.state) {
    console.log('Updating company city/state');
    await prisma.companies.update({
      where: { id: company.id },
      data: { city: 'Salvador', state: 'BA' }
    });
  }

  const existing = await prisma.cinema_complexes.findFirst({
    where: { company_id: company.id }
  });
  if (existing) {
    console.log('Cinema complex already exists:', existing.id, existing.name);
    return;
  }

  const complex = await prisma.cinema_complexes.create({
    data: {
      company_id: company.id,
      name: company.trade_name || company.corporate_name,
      code: 'CX-MAIN-001',
      slug: 'cine-litoral-salvador',
      city: 'Salvador',
      city_slug: 'salvador',
      state: 'BA',
      timezone: 'America/Bahia',
      ibge_municipality_code: '2927408',
      active: true,
    }
  });
  console.log('Created cinema complex:', complex.id, complex.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
