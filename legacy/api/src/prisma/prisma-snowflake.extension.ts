import { Prisma } from '@repo/db';
import { SnowflakeService } from 'src/common/services/snowflake.service';

function isUuidDefault(field: Prisma.DMMF.Field): boolean {
  if (!field.hasDefaultValue) {
    return false;
  }

  const value = field.default;
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    (value as { name?: unknown }).name === 'uuid'
  );
}

const ENABLED_SNOWFLAKE_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) =>
      model.fields.some(
        (field) =>
          field.name === 'id' &&
          field.kind === 'scalar' &&
          field.type === 'String' &&
          !isUuidDefault(field),
      ),
    )
    .map((model) => model.name),
);

type CreateArgs = {
  data?: Record<string, unknown>;
};

type CreateManyArgs = {
  data?: Record<string, unknown> | Record<string, unknown>[];
};

function shouldAssignSnowflakeId(model: string | undefined): boolean {
  return !!model && ENABLED_SNOWFLAKE_MODELS.has(model);
}

function injectId(
  payload: Record<string, unknown>,
  generate: () => string,
): Record<string, unknown> {
  if (payload.id !== undefined && payload.id !== null && payload.id !== '') {
    return payload;
  }

  return {
    ...payload,
    id: generate(),
  };
}

export const snowflakeIdExtension = (snowflake: SnowflakeService) =>
  Prisma.defineExtension({
    name: 'snowflake-id-extension',
    query: {
      $allModels: {
        async create({ model, args, query }) {
          if (!shouldAssignSnowflakeId(model)) {
            return query(args);
          }

          const typedArgs = args as CreateArgs;
          if (!typedArgs.data || typeof typedArgs.data !== 'object') {
            return query(args);
          }

          typedArgs.data = injectId(typedArgs.data, () => snowflake.generate());
          return query(args);
        },

        async createMany({ model, args, query }) {
          if (!shouldAssignSnowflakeId(model)) {
            return query(args);
          }

          const typedArgs = args as CreateManyArgs;
          const { data } = typedArgs;

          if (!data) {
            return query(args);
          }

          if (Array.isArray(data)) {
            typedArgs.data = data.map((item) =>
              injectId(item, () => snowflake.generate()),
            );
            return query(args);
          }

          typedArgs.data = injectId(data, () => snowflake.generate());
          return query(args);
        },
      },
    },
  });
