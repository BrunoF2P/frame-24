import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PublicService } from '../services/public.service';
import { PublicController } from './public.controller';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const getJsonResponseSchema = (response: unknown): unknown => {
  if (!isRecord(response) || '$ref' in response) {
    return undefined;
  }

  const content = response.content;
  if (!isRecord(content)) {
    return undefined;
  }

  const jsonContent = content['application/json'];
  if (!isRecord(jsonContent)) {
    return undefined;
  }

  return jsonContent.schema;
};

const getSchemaProperties = (
  schema: unknown,
): Record<string, unknown> | undefined => {
  if (!isRecord(schema) || '$ref' in schema) {
    return undefined;
  }

  return isRecord(schema.properties) ? schema.properties : undefined;
};

describe('Public storefront OpenAPI contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [
        {
          provide: PublicService,
          useValue: {},
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should expose a typed storefront response schema', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').setVersion('1.0').build(),
    );

    const storefrontPath = Object.keys(document.paths).find((path) =>
      path.includes('/public/companies/{tenant_slug}/storefront'),
    );

    expect(storefrontPath).toBeDefined();

    const storefrontGet = document.paths[storefrontPath!]?.get;
    expect(storefrontGet).toBeDefined();

    const responseSchema = getJsonResponseSchema(
      storefrontGet?.responses?.['200'],
    );

    expect(responseSchema).toEqual(
      expect.objectContaining({
        $ref: expect.stringContaining('StorefrontResponseDto'),
      }),
    );

    const schemas = document.components?.schemas ?? {};

    expect(schemas.StorefrontResponseDto).toBeDefined();
    expect(schemas.StorefrontDataDto).toBeDefined();
    expect(schemas.StorefrontShowtimeDto).toBeDefined();

    const storefrontResponseProperties = getSchemaProperties(
      schemas.StorefrontResponseDto,
    );
    const storefrontDataProperties = getSchemaProperties(
      schemas.StorefrontDataDto,
    );
    const storefrontShowtimeProperties = getSchemaProperties(
      schemas.StorefrontShowtimeDto,
    );

    expect(storefrontResponseProperties).toEqual(
      expect.objectContaining({
        success: expect.any(Object),
        meta: expect.any(Object),
        data: expect.any(Object),
      }),
    );

    expect(storefrontDataProperties).toEqual(
      expect.objectContaining({
        company: expect.any(Object),
        complexes: expect.any(Object),
        movies: expect.any(Object),
        products: expect.any(Object),
        ticket_types: expect.any(Object),
        payment_methods: expect.any(Object),
        showtimes: expect.any(Object),
        showtimes_pagination: expect.any(Object),
      }),
    );

    expect(storefrontShowtimeProperties).toEqual(
      expect.objectContaining({
        id: expect.any(Object),
        movie_id: expect.any(Object),
        start_time: expect.any(Object),
        base_ticket_price: expect.any(Object),
        available_seats: expect.any(Object),
        sold_seats: expect.any(Object),
        blocked_seats: expect.any(Object),
        cinema_complexes: expect.any(Object),
        rooms: expect.any(Object),
        projection_types: expect.any(Object),
        audio_types: expect.any(Object),
        session_languages: expect.any(Object),
        session_status: expect.any(Object),
        movie: expect.any(Object),
      }),
    );
  });
});
