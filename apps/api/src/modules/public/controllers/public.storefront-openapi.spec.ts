import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PublicService } from '../services/public.service';
import { PublicController } from './public.controller';

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

    const responseSchema =
      storefrontGet?.responses?.['200']?.content?.['application/json']?.schema;

    expect(responseSchema).toEqual(
      expect.objectContaining({
        $ref: expect.stringContaining('StorefrontResponseDto'),
      }),
    );

    const schemas = document.components?.schemas ?? {};

    expect(schemas.StorefrontResponseDto).toBeDefined();
    expect(schemas.StorefrontDataDto).toBeDefined();
    expect(schemas.StorefrontShowtimeDto).toBeDefined();

    expect(
      schemas.StorefrontResponseDto?.properties,
    ).toEqual(
      expect.objectContaining({
        success: expect.any(Object),
        meta: expect.any(Object),
        data: expect.any(Object),
      }),
    );

    expect(schemas.StorefrontDataDto?.properties).toEqual(
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

    expect(schemas.StorefrontShowtimeDto?.properties).toEqual(
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
