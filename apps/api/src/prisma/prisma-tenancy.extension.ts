import { Prisma } from '@repo/db';
import { ClsService } from 'nestjs-cls';

const COMPANY_SCOPED_MODELS = new Set<string>([
  'account_natures',
  'account_types',
  'accounting_movement_types',
  'accounts_payable',
  'accounts_receivable',
  'age_ratings',
  'audio_types',
  'audit_logs',
  'bank_accounts',
  'cash_flow_entries',
  'cast_types',
  'chart_of_accounts',
  'cinema_complexes',
  'combos',
  'company_customers',
  'company_users',
  'concession_status',
  'contingency_status',
  'contingency_types',
  'contract_types',
  'credit_types',
  'custom_roles',
  'departments',
  'distributor_settlement_status',
  'employees',
  'employment_contract_types',
  'federal_tax_rates',
  'journal_entry_status',
  'journal_entry_types',
  'media_types',
  'movie_categories',
  'movies',
  'municipal_tax_parameters',
  'payment_methods',
  'permissions',
  'positions',
  'product_categories',
  'product_prices',
  'products',
  'projection_types',
  'promotion_types',
  'promotional_campaigns',
  'recine_acquisition_types',
  'recine_deadline_types',
  'recine_item_types',
  'recine_project_status',
  'recine_project_types',
  'revenue_types',
  'sale_status',
  'sale_types',
  'seat_status',
  'seat_types',
  'session_languages',
  'session_status',
  'settlement_bases',
  'settlement_status',
  'simple_national_brackets',
  'state_icms_parameters',
  'stock_movement_types',
  'supplier_types',
  'suppliers',
  'tax_types',
  'ticket_types',
  'user_sessions',
]);

const WHERE_SCOPED_OPERATIONS = new Set<string>([
  'findFirst',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

const CREATE_SCOPED_OPERATIONS = new Set<string>(['create', 'createMany']);

type TenancyWhere = Record<string, unknown>;
type TenancyData = Record<string, unknown> | Array<Record<string, unknown>>;

interface TenancyArgs {
  where?: TenancyWhere;
  data?: TenancyData;
  [key: string]: unknown;
}

interface TenancyParams {
  model: string;
  operation: string;
  args?: TenancyArgs;
  query: (args: TenancyArgs) => Promise<unknown>;
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function objectHasCompanyId(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value))
    return value.some((item) => objectHasCompanyId(item));
  if (typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  if (record.company_id !== undefined && record.company_id !== null)
    return true;

  for (const relationKey of ['company', 'companies']) {
    const relation = record[relationKey];
    if (!relation || typeof relation !== 'object' || Array.isArray(relation)) {
      continue;
    }

    const relationRecord = relation as Record<string, unknown>;
    const connect = relationRecord.connect;

    if (
      connect &&
      typeof connect === 'object' &&
      !Array.isArray(connect) &&
      (connect as Record<string, unknown>).id !== undefined
    ) {
      return true;
    }
  }

  return Object.values(record).some((item) => objectHasCompanyId(item));
}

function objectHasKey(value: unknown, key: string): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value))
    return value.some((item) => objectHasKey(item, key));
  if (typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;

  if (record[key] !== undefined && record[key] !== null) {
    return true;
  }

  return Object.values(record).some((item) => objectHasKey(item, key));
}

export const tenancyLogic = (
  cls: ClsService,
  { model, operation, args, query }: TenancyParams,
) => {
  const companyId = cls.get<string>('companyId');
  const modelIsCompanyScoped = COMPANY_SCOPED_MODELS.has(model);
  const normalizedArgs: TenancyArgs = args ?? {};

  if (!companyId) {
    if (modelIsCompanyScoped) {
      const hasExplicitCompanyScope =
        objectHasCompanyId(normalizedArgs.where) ||
        objectHasCompanyId(normalizedArgs.data);
      const hasExplicitIdentityScopeForCompanyUsers =
        model === 'company_users' &&
        WHERE_SCOPED_OPERATIONS.has(operation) &&
        objectHasKey(normalizedArgs.where, 'identity_id');

      if (
        (WHERE_SCOPED_OPERATIONS.has(operation) ||
          CREATE_SCOPED_OPERATIONS.has(operation)) &&
        !hasExplicitCompanyScope &&
        !hasExplicitIdentityScopeForCompanyUsers
      ) {
        throw new Error(
          `[TENANCY] Missing company scope for ${model}.${operation}`,
        );
      }
    }
    return query(normalizedArgs);
  }

  if (model === 'companies' && WHERE_SCOPED_OPERATIONS.has(operation)) {
    const where = ensureRecord(normalizedArgs.where);
    normalizedArgs.where = where;
    if (where.id === undefined) {
      where.id = companyId;
    }
  }

  if (modelIsCompanyScoped && WHERE_SCOPED_OPERATIONS.has(operation)) {
    const where = ensureRecord(normalizedArgs.where);
    normalizedArgs.where = where;
    if (where.company_id === undefined) {
      where.company_id = companyId;
    }
  }

  if (modelIsCompanyScoped && CREATE_SCOPED_OPERATIONS.has(operation)) {
    if (operation === 'create') {
      const data = ensureRecord(normalizedArgs.data);
      normalizedArgs.data = data;
      if (!data.company_id) {
        data.company_id = companyId;
      }
    }
    if (operation === 'createMany') {
      if (Array.isArray(normalizedArgs.data)) {
        normalizedArgs.data.forEach((item) => {
          if (!item.company_id) {
            item.company_id = companyId;
          }
        });
      } else {
        const data = ensureRecord(normalizedArgs.data);
        normalizedArgs.data = data;
        if (!data.company_id) {
          data.company_id = companyId;
        }
      }
    }
  }

  return query(normalizedArgs);
};

export const tenancyExtension = (cls: ClsService) => {
  return Prisma.defineExtension({
    name: 'tenancy-extension',
    query: {
      $allModels: {
        async $allOperations(params) {
          return tenancyLogic(cls, params as TenancyParams);
        },
      },
    },
  });
};
