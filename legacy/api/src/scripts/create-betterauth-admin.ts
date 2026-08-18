import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createPrismaClient } from '@repo/db';
import { randomUUID } from 'node:crypto';

const prisma = createPrismaClient();

const auth = betterAuth({
  appName: 'Frame24',
  secret:
    process.env.BETTER_AUTH_SECRET ||
    'frame24-better-auth-secret-change-in-prod-2026',
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.API_URL ||
    'http://localhost:4000',
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3004',
    'http://172.25.248.81:3000',
    'http://172.25.248.81:3004',
    'http://174.138.79.19:3000',
    'http://174.138.79.19:3004',
  ],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});

async function main() {
  const email = 'admin@lawtrel.com';
  const password = 'Admin@2026';

  console.log(`Creating admin via better-auth...`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log(
      'User already exists in better-auth user table. Deleting to recreate...',
    );
    await prisma.account.deleteMany({ where: { userId: existingUser.id } });
    await prisma.session.deleteMany({ where: { userId: existingUser.id } });
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: 'Super Admin',
      email,
      password,
    },
  });

  if (result) {
    console.log(
      `✅ Better-auth user created! ID: ${(result as any).user?.id || (result as any).id}`,
    );
  }

  const userId = (result as any).user?.id || (result as any).id;

  if (userId) {
    const company = await prisma.companies.findUnique({
      where: { tenant_slug: 'lawtrel-admin' },
    });

    if (company) {
      const existingIdentity = await prisma.identities.findFirst({
        where: { email },
      });

      if (existingIdentity) {
        await prisma.identities.update({
          where: { id: existingIdentity.id },
          data: { password_hash: 'better-auth-managed' },
        });
        console.log(`✅ Identity password_hash updated to better-auth-managed`);
      }

      const existingCompanyUser = await prisma.company_users.findFirst({
        where: {
          company_id: company.id,
          identity_id: existingIdentity?.id,
        },
      });

      if (!existingCompanyUser && existingIdentity) {
        const role = await prisma.custom_roles.findFirst({
          where: { company_id: company.id, name: 'Super Admin' },
        });

        if (role) {
          await prisma.company_users.create({
            data: {
              id: randomUUID(),
              company_id: company.id,
              identity_id: existingIdentity.id,
              role_id: role.id,
              employee_id: 'ADM-001',
              active: true,
            },
          });
          console.log(`✅ Company user link confirmed`);
        }
      }
    }
  }

  console.log(`\n🎉 Done! Login with:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
