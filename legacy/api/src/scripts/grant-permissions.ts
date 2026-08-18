import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';

const prisma = createPrismaClient();

async function main() {
  console.log(`🔐 Concedendo permissões ao Super Admin...`);

  // 1. Buscar a empresa
  const company = await prisma.companies.findFirst({
    where: { tenant_slug: 'lawtrel-admin' },
  });

  if (!company) throw new Error('Empresa não encontrada.');

  // 2. Buscar o Role de Super Admin
  const adminRole = await prisma.custom_roles.findFirst({
    where: {
      company_id: company.id,
      name: 'Super Admin',
    },
  });

  if (!adminRole) throw new Error("Role 'Super Admin' não encontrado.");

  // 3. Definir as permissões necessárias
  // Estes códigos devem bater com o @RequirePermission nos controllers
  const permissionsData = [
    // --- Catálogo: Filmes ---
    { resource: 'movies', action: 'read', name: 'Visualizar Filmes' },
    { resource: 'movies', action: 'create', name: 'Criar Filmes' },
    { resource: 'movies', action: 'update', name: 'Editar Filmes' },
    { resource: 'movies', action: 'delete', name: 'Excluir Filmes' },

    // --- Catálogo: Categorias ---
    {
      resource: 'movie_categories',
      action: 'read',
      name: 'Visualizar Categorias',
    },
    {
      resource: 'movie_categories',
      action: 'create',
      name: 'Criar Categorias',
    },
    {
      resource: 'movie_categories',
      action: 'update',
      name: 'Editar Categorias',
    },

    // --- Usuários ---
    { resource: 'users', action: 'read', name: 'Visualizar Usuários' },
    { resource: 'users', action: 'create', name: 'Criar Usuários' },
    { resource: 'users', action: 'update', name: 'Editar Usuários' },
    { resource: 'users', action: 'delete', name: 'Deletar Usuários' },

    // --- Fornecedores (Distribuidores) ---
    { resource: 'suppliers', action: 'read', name: 'Visualizar Fornecedores' },
    { resource: 'suppliers', action: 'create', name: 'Criar Fornecedores' },
  ];

  for (const p of permissionsData) {
    const code = `${p.resource}:${p.action}`; // Ex: movies:read

    // Criar a Permissão se não existir
    const permission = await prisma.permissions.upsert({
      where: { company_id_code: { company_id: company.id, code: code } },
      update: {},
      create: {
        id: randomUUID(),
        company_id: company.id,
        resource: p.resource,
        action: p.action,
        code: code,
        name: p.name,
        active: true,
      },
    });

    // Vincular Permissão ao Role (RolePermissions)
    // Verifica se já existe para não dar erro de unique constraint
    const rolePermExists = await prisma.role_permissions.findUnique({
      where: {
        role_id_permission_id: {
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      },
    });

    if (!rolePermExists) {
      await prisma.role_permissions.create({
        data: {
          id: randomUUID(),
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      });
      console.log(`✅ Permissão concedida: ${code}`);
    } else {
      console.log(`start_skip Permissão já existe: ${code}`);
    }
  }

  console.log(`\n🎉 Todas as permissões foram concedidas ao Super Admin!`);
  console.log(
    `⚠️ Nota: Para as novas permissões surtirem efeito, faça LOGOUT e LOGIN novamente.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
