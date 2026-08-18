import { Prisma } from '@repo/db';

/**
 * Models that support soft-delete via the `active` boolean column.
 * Queries for these models automatically inject `active: true` in where clauses
 * unless explicitly overridden with `{ where: { active: undefined } }` or by
 * setting the CLS flag `withInactive` to true.
 */
const SOFT_DELETE_MODELS = new Set<string>([
  'companies',
  'identities',
  'company_users',
  'custom_roles',
  'permissions',
  'user_sessions',
  'employees',
  'departments',
  'positions',
  'suppliers',
  'products',
  'combos',
  'movies',
  'rooms',
  'cinema_complexes',
  'seats',
  'customers',
  'promotional_campaigns',
  'promotional_coupons',
  'chart_of_accounts',
  'bank_accounts',
  'product_stock',
  'federal_tax_rates',
  'municipal_tax_parameters',
  'simple_national_brackets',
  'state_icms_parameters',
  'movie_categories',
  'exhibition_contracts',
  'promotion_types',
  'pos_payment_methods',
]);

const READ_OPERATIONS = new Set<string>([
  'findFirst',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

interface SoftDeleteArgs {
  where?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SoftDeleteParams {
  model: string;
  operation: string;
  args?: SoftDeleteArgs;
  query: (args: SoftDeleteArgs) => Promise<unknown>;
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export const softDeleteExtension = () => {
  return Prisma.defineExtension({
    name: 'soft-delete-extension',
    query: {
      $allModels: {
        async $allOperations(params) {
          const { model, operation, args, query } =
            params as unknown as SoftDeleteParams;

          if (!SOFT_DELETE_MODELS.has(model)) {
            return query(args ?? {});
          }

          if (!READ_OPERATIONS.has(operation)) {
            return query(args ?? {});
          }

          const normalizedArgs: SoftDeleteArgs = args ?? {};
          const where = ensureRecord(normalizedArgs.where);

          // Only inject active: true if the caller didn't explicitly set it.
          // Setting `active: undefined` or `active: false` opts out of the filter.
          if (!('active' in where)) {
            where.active = true;
          }

          normalizedArgs.where = where;
          return query(normalizedArgs);
        },
      },
    },
  });
};
