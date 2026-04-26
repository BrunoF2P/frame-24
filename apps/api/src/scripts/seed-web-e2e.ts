import 'dotenv/config';
import { auth } from 'src/lib/auth';
import { createPrismaClient } from '@repo/db';
import { toTenantAuthEmail } from 'src/modules/crm/utils/tenant-auth-email';

const prisma = createPrismaClient();

const ids = {
  company: '11111111-1111-4111-8111-111111111111',
  complexSalvador: '22222222-2222-4222-8222-222222222222',
  complexFeira: '33333333-3333-4333-8333-333333333333',
  projection2d: '44444444-4444-4444-8444-444444444444',
  audioDub: '55555555-5555-4555-8555-555555555555',
  languageDub: '66666666-6666-4666-8666-666666666666',
  statusOpen: '77777777-7777-4777-8777-777777777777',
  roomSalvador: '88888888-8888-4888-8888-888888888888',
  roomFeira: '99999999-9999-4999-8999-999999999999',
  seatTypeStandard: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  seatStatusAvailable: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  seatStatusSold: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  seatStatusBlocked: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  seatStatusReserved: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  saleTypeOnline: 'f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1',
  saleStatusPending: 'f2f2f2f2-f2f2-42f2-82f2-f2f2f2f2f2f2',
  saleStatusConfirmed: 'f3f3f3f3-f3f3-43f3-83f3-f3f3f3f3f3f3',
  paymentPix: 'f4f4f4f4-f4f4-44f4-84f4-f4f4f4f4f4f4',
  paymentCard: 'f5f5f5f5-f5f5-45f5-85f5-f5f5f5f5f5f5',
  paymentWallet: 'f6f6f6f6-f6f6-46f6-86f6-f6f6f6f6f6f6',
  ticketInteira: 'f7f7f7f7-f7f7-47f7-87f7-f7f7f7f7f7f7',
  ticketMeia: 'f8f8f8f8-f8f8-48f8-88f8-f8f8f8f8f8f8',
  ticketCortesia: 'f9f9f9f9-f9f9-49f9-89f9-f9f9f9f9f9f9',
  productCategory: '12121212-1212-4212-8212-121212121212',
  productPipoca: '13131313-1313-4313-8313-131313131313',
  productRefri: '14141414-1414-4414-8414-141414141414',
  productStockPipoca: '15151515-1515-4515-8515-151515151515',
  productStockRefri: '16161616-1616-4616-8616-161616161616',
  pricePipoca: '17171717-1717-4717-8717-171717171717',
  priceRefri: '18181818-1818-4818-8818-181818181818',
  federalTaxRate: '18191919-1819-4819-8819-181919191819',
  municipalTaxSalvador: '18202020-1820-4820-8820-182020201820',
  supplierType: '19191919-1919-4919-8919-191919191919',
  supplier: '20202020-2020-4020-8020-202020202020',
  ageRating12: '21212121-2121-4121-8121-212121212121',
  movieCategoryAdventure: '22212121-2121-4121-8121-212121212122',
  mediaPoster: 'POSTER',
  mediaBackdrop: 'BACKDROP',
  movie: '23232323-2323-4232-8232-232323232323',
  moviePoster: '24242424-2424-4242-8242-242424242424',
  movieBackdrop: '25252525-2525-4252-8252-252525252525',
  showtimeSalvador: '26262626-2626-4262-8262-262626262626',
  showtimeFeira: '27272727-2727-4272-8272-272727272727',
  customerIdentity: '28282828-2828-4282-8282-282828282828',
  customer: '29292929-2929-4292-8292-292929292929',
  companyCustomer: '30303030-3030-4030-8030-303030303030',
  checkout: '31313131-3131-4131-8131-313131313131',
  checkoutTicket: '32323232-3232-4232-8232-323232323232',
  checkoutConcession: '33323232-3232-4232-8232-323232323233',
  paymentAttempt: '34343434-3434-4343-8343-343434343434',
  checkoutPaidDesktop: '35353535-3535-4353-8353-353535353535',
  checkoutPaidDesktopTicket: '36363636-3636-4363-8363-363636363636',
  checkoutPaidDesktopConcession: '37373737-3737-4373-8373-373737373737',
  checkoutFailedDesktop: '38383838-3838-4383-8383-383838383838',
  checkoutFailedDesktopTicket: '39393939-3939-4393-8393-393939393939',
  checkoutPaidMobile: '40404040-4040-4404-8404-404040404040',
  checkoutPaidMobileTicket: '41414141-4141-4414-8414-414141414141',
  checkoutPaidMobileConcession: '42424242-4242-4424-8424-424242424242',
  checkoutFailedMobile: '43434343-4343-4434-8434-434343434343',
  checkoutFailedMobileTicket: '45454545-4545-4454-8454-454545454545',
  checkoutPixDesktop: '46464646-4646-4464-8464-464646464646',
  checkoutPixDesktopTicket: '47474747-4747-4474-8474-474747474747',
  checkoutPixMobile: '48484848-4848-4484-8484-484848484848',
  checkoutPixMobileTicket: '49494949-4949-4494-8494-494949494949',
  checkoutStockDesktop: '50505050-5050-4505-8505-505050505050',
  checkoutStockDesktopTicket: '51515151-5151-4515-8515-515151515151',
  checkoutStockDesktopConcession: '52525252-5252-4525-8525-525252525252',
  checkoutStockMobile: '53535353-5353-4535-8535-535353535353',
  checkoutStockMobileTicket: '54545454-5454-4545-8545-545454545454',
  checkoutStockMobileConcession: '56565656-5656-4565-8565-565656565656',
  demoCompanyB: '57575757-5757-4575-8575-575757575757',
  demoCompanyBComplexCapital: '58585858-5858-4585-8585-585858585858',
  demoCompanyBComplexInterior: '59595959-5959-4595-8595-595959595959',
  bankAccount: '60606060-6060-4606-8606-606060606060',
  showcaseMovieDune: '61616161-6161-4616-8616-616161616161',
  showcaseMovieDunePoster: '61616161-6161-4616-8616-616161616162',
  showcaseMovieDuneBackdrop: '61616161-6161-4616-8616-616161616163',
  showcaseMovieSpiderMan: '62626262-6262-4626-8626-626262626261',
  showcaseMovieSpiderManPoster: '62626262-6262-4626-8626-626262626262',
  showcaseMovieSpiderManBackdrop: '62626262-6262-4626-8626-626262626263',
  showcaseMovieBatman: '63636363-6363-4636-8636-636363636361',
  showcaseMovieBatmanPoster: '63636363-6363-4636-8636-636363636362',
  showcaseMovieBatmanBackdrop: '63636363-6363-4636-8636-636363636363',
  showcaseMovieInsideOut: '64646464-6464-4646-8646-646464646461',
  showcaseMovieInsideOutPoster: '64646464-6464-4646-8646-646464646462',
  showcaseMovieInsideOutBackdrop: '64646464-6464-4646-8646-646464646463',
  showcaseMovieWakanda: '65656565-6565-4656-8656-656565656561',
  showcaseMovieWakandaPoster: '65656565-6565-4656-8656-656565656562',
  showcaseMovieWakandaBackdrop: '65656565-6565-4656-8656-656565656563',
  showcaseMovieGladiator: '66666666-6767-4666-8666-666666666661',
  showcaseMovieGladiatorPoster: '66666666-6767-4666-8666-666666666662',
  showcaseMovieGladiatorBackdrop: '66666666-6767-4666-8666-666666666663',
  showcaseMovieHungerGames: '67676767-6767-4676-8676-676767676761',
  showcaseMovieHungerGamesPoster: '67676767-6767-4676-8676-676767676762',
  showcaseMovieHungerGamesBackdrop: '67676767-6767-4676-8676-676767676763',
  showcaseShowtimeSalvadorDune: '68686868-6868-4686-8686-686868686861',
  showcaseShowtimeSalvadorSpiderMan: '68686868-6868-4686-8686-686868686862',
  showcaseShowtimeSalvadorBatman: '68686868-6868-4686-8686-686868686863',
  showcaseShowtimeSalvadorInsideOut: '68686868-6868-4686-8686-686868686864',
  showcaseShowtimeFeiraWakanda: '69696969-6969-4696-8696-696969696961',
  showcaseShowtimeFeiraGladiator: '69696969-6969-4696-8696-696969696962',
  showcaseShowtimeFeiraHungerGames: '69696969-6969-4696-8696-696969696963',
  showcaseShowtimeFeiraDune: '69696969-6969-4696-8696-696969696964',
  showcaseShowtimeSalvadorLateTonight: '69696969-6969-4696-8696-696969696965',
  showcaseShowtimeFeiraLateTonight: '69696969-6969-4696-8696-696969696966',
};

const FIXTURE = {
  tenantSlug: 'lawtrel-admin',
  tenantWebsite: 'http://lawtrel-admin.localhost:3000',
  citySlug: 'salvador',
  secondCitySlug: 'feira-de-santana',
  movieSlug: 'aventuras-no-atlantico',
  customerEmail: 'cliente.e2e@frame24.local',
  customerPassword: 'Frame24E2E#2026',
  customerName: 'Cliente E2E Frame24',
  customerCpf: '12345678901',
  customerPhone: '71999990000',
  reservationUuid: 'e2e-reservation-pending',
  reservationPaidDesktop: 'e2e-reservation-paid-desktop',
  reservationFailedDesktop: 'e2e-reservation-failed-desktop',
  reservationPaidMobile: 'e2e-reservation-paid-mobile',
  reservationFailedMobile: 'e2e-reservation-failed-mobile',
  reservationPixDesktop: 'e2e-reservation-pix-desktop',
  reservationPixMobile: 'e2e-reservation-pix-mobile',
  reservationStockDesktop: 'e2e-reservation-stock-desktop',
  reservationStockMobile: 'e2e-reservation-stock-mobile',
};

type ShowcaseMovieSeed = {
  id: string;
  posterId: string;
  backdropId: string;
  slug: string;
  tmdbId: string;
  originalTitle: string;
  brazilTitle: string;
  distributorName: string;
  distributorCnpj: string;
  durationMinutes: number;
  productionYear: number;
  ratingCode: string;
  synopsis: string;
  shortSynopsis: string;
  genres: string[];
  posterUrl: string;
  backdropUrl: string;
  originalLanguage: string;
  worldwideReleaseDate: string;
};

const SHOWCASE_MOVIES: ShowcaseMovieSeed[] = [
  {
    id: ids.showcaseMovieDune,
    posterId: ids.showcaseMovieDunePoster,
    backdropId: ids.showcaseMovieDuneBackdrop,
    slug: 'duna-parte-dois',
    tmdbId: '693134',
    originalTitle: 'Dune: Part Two',
    brazilTitle: 'Duna: Parte Dois',
    distributorName: 'Warner Bros. Pictures',
    distributorCnpj: '00000000001000',
    durationMinutes: 166,
    productionYear: 2024,
    ratingCode: '14',
    synopsis:
      'Paul Atreides se alia a Chani e aos Fremen enquanto busca vinganca contra os conspiradores que destruiram sua familia e tenta impedir o futuro devastador que so ele consegue prever.',
    shortSynopsis:
      'Paul retorna a Arrakis para guerra, profecia e destino.',
    genres: ['Ficcao Cientifica', 'Aventura', 'Drama'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/8LJJjLjAzAwXS40S5mx79PJ2jSs.jpg',
    backdropUrl:
      'https://image.tmdb.org/t/p/original/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    originalLanguage: 'en',
    worldwideReleaseDate: '2024-02-28T00:00:00.000Z',
  },
  {
    id: ids.showcaseMovieSpiderMan,
    posterId: ids.showcaseMovieSpiderManPoster,
    backdropId: ids.showcaseMovieSpiderManBackdrop,
    slug: 'homem-aranha-sem-volta-para-casa',
    tmdbId: '634649',
    originalTitle: 'Spider-Man: No Way Home',
    brazilTitle: 'Homem-Aranha: Sem Volta para Casa',
    distributorName: 'Sony Pictures',
    distributorCnpj: '00000000001100',
    durationMinutes: 148,
    productionYear: 2021,
    ratingCode: '12',
    synopsis:
      'Com sua identidade revelada, Peter Parker pede ajuda ao Doutor Estranho. O feitiço sai do controle e abre o multiverso, trazendo velhos inimigos e escolhas que vao redefinir seu futuro.',
    shortSynopsis:
      'Peter encara o multiverso quando tudo desanda em Nova York.',
    genres: ['Acao', 'Aventura', 'Fantasia'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/a9z2cmIBfx99dtzj8TaSFU50AnW.jpg',
    backdropUrl:
      'https://image.tmdb.org/t/p/original/zD5v1E4joAzFvmAEytt7fM3ivyT.jpg',
    originalLanguage: 'en',
    worldwideReleaseDate: '2021-12-15T00:00:00.000Z',
  },
  {
    id: ids.showcaseMovieBatman,
    posterId: ids.showcaseMovieBatmanPoster,
    backdropId: ids.showcaseMovieBatmanBackdrop,
    slug: 'batman',
    tmdbId: '414906',
    originalTitle: 'The Batman',
    brazilTitle: 'Batman',
    distributorName: 'Warner Bros. Pictures',
    distributorCnpj: '00000000001000',
    durationMinutes: 176,
    productionYear: 2022,
    ratingCode: '14',
    synopsis:
      'Nos primeiros anos como vigilante, Bruce Wayne investiga uma serie de assassinatos que expoe a corrupcao de Gotham e o obriga a enfrentar conexoes sombrias com sua propria familia.',
    shortSynopsis:
      'O Cavaleiro das Trevas mergulha no submundo de Gotham.',
    genres: ['Acao', 'Crime', 'Drama'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/xaKydnMw6wR1MBAjS5seGPVusbs.jpg',
    backdropUrl:
      'https://image.tmdb.org/t/p/original/rvtdN5XkWAfGX6xDuPL6yYS2seK.jpg',
    originalLanguage: 'en',
    worldwideReleaseDate: '2022-03-02T00:00:00.000Z',
  },
  {
    id: ids.showcaseMovieInsideOut,
    posterId: ids.showcaseMovieInsideOutPoster,
    backdropId: ids.showcaseMovieInsideOutBackdrop,
    slug: 'divertida-mente-2',
    tmdbId: '1022789',
    originalTitle: 'Inside Out 2',
    brazilTitle: 'Divertida Mente 2',
    distributorName: 'Disney',
    distributorCnpj: '00000000001200',
    durationMinutes: 96,
    productionYear: 2024,
    ratingCode: 'L',
    synopsis:
      'Riley entra na adolescencia e o quartel-general das emocoes precisa lidar com novas sensacoes, insegurancas e conflitos internos bem no momento em que tudo parecia sob controle.',
    shortSynopsis:
      'Riley cresce e ganha novas emocoes no comando.',
    genres: ['Animacao', 'Familia', 'Comedia'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/lHKNS35r4RTa9GO72vdadMLxoiV.jpg',
    backdropUrl:
      'https://image.tmdb.org/t/p/original/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg',
    originalLanguage: 'en',
    worldwideReleaseDate: '2024-06-14T00:00:00.000Z',
  },
  {
    id: ids.showcaseMovieWakanda,
    posterId: ids.showcaseMovieWakandaPoster,
    backdropId: ids.showcaseMovieWakandaBackdrop,
    slug: 'pantera-negra-wakanda-para-sempre',
    tmdbId: '505642',
    originalTitle: 'Black Panther: Wakanda Forever',
    brazilTitle: 'Pantera Negra: Wakanda Para Sempre',
    distributorName: 'Disney',
    distributorCnpj: '00000000001200',
    durationMinutes: 161,
    productionYear: 2022,
    ratingCode: '12',
    synopsis:
      'Depois da perda do rei T Challa, a familia real e as Dora Milaje lutam para proteger Wakanda diante de novas ameacas globais e de um poderoso reino oculto sob o mar.',
    shortSynopsis:
      'Wakanda reage ao luto enquanto uma nova guerra se aproxima.',
    genres: ['Acao', 'Aventura', 'Drama'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/6RB4JTvfeT3FVaZtWHySEryA6LV.jpg',
    backdropUrl:
      'https://image.tmdb.org/t/p/original/83H0C66AcvkwpG2738VCTHMY9uv.jpg',
    originalLanguage: 'en',
    worldwideReleaseDate: '2022-11-11T00:00:00.000Z',
  },
  {
    id: ids.showcaseMovieGladiator,
    posterId: ids.showcaseMovieGladiatorPoster,
    backdropId: ids.showcaseMovieGladiatorBackdrop,
    slug: 'gladiador-ii',
    tmdbId: '558449',
    originalTitle: 'Gladiator II',
    brazilTitle: 'Gladiador II',
    distributorName: 'Paramount Pictures',
    distributorCnpj: '00000000001300',
    durationMinutes: 148,
    productionYear: 2024,
    ratingCode: '16',
    synopsis:
      'Anos apos a morte de Maximus, Lucius e forçado a entrar no Coliseu e encarar o poder de Roma enquanto luta para recuperar a honra de seu povo e de sua familia.',
    shortSynopsis:
      'Lucius retorna a arena para enfrentar o destino de Roma.',
    genres: ['Acao', 'Aventura', 'Drama'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/342bly9MqveL65TnEFzx8TTUxcL.jpg',
    backdropUrl:
      'https://image.tmdb.org/t/p/original/4hvK1uenpT7VVClzoNqXanvgdjX.jpg',
    originalLanguage: 'en',
    worldwideReleaseDate: '2024-11-14T00:00:00.000Z',
  },
  {
    id: ids.showcaseMovieHungerGames,
    posterId: ids.showcaseMovieHungerGamesPoster,
    backdropId: ids.showcaseMovieHungerGamesBackdrop,
    slug: 'jogos-vorazes-a-cantiga-dos-passaros-e-das-serpentes',
    tmdbId: '695721',
    originalTitle: 'The Hunger Games: The Ballad of Songbirds & Snakes',
    brazilTitle: 'Jogos Vorazes: A Cantiga dos Passaros e das Serpentes',
    distributorName: 'Paris Filmes',
    distributorCnpj: '00000000001400',
    durationMinutes: 157,
    productionYear: 2023,
    ratingCode: '14',
    synopsis:
      'Antes de se tornar o tirano de Panem, Coriolanus Snow recebe a chance de recuperar o prestigio da familia ao orientar uma tributo do Distrito 12 em uma nova edicao dos Jogos Vorazes.',
    shortSynopsis:
      'Snow conhece Lucy Gray e inicia sua longa descida ao poder.',
    genres: ['Acao', 'Drama', 'Ficcao Cientifica'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/wd7b4Nv9QBHDTIjc2m7sr0IUMoh.jpg',
    backdropUrl:
      'https://image.tmdb.org/t/p/original/8GnWDLn2AhnmkQ7hlQ9NJUYobSS.jpg',
    originalLanguage: 'en',
    worldwideReleaseDate: '2023-11-15T00:00:00.000Z',
  },
];

const CHECKOUT_EXPIRATION_MS = 2 * 60 * 60 * 1000;

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function showtimeWindow(daysFromNow: number, hour: number) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start, end };
}

function showtimeAtHourMinute(daysFromNow: number, hour: number, minute: number) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start, end };
}

function showtimeTonightOrTomorrow(hour: number, minute: number) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(hour, minute, 0, 0);

  const start = today > now ? today : showtimeAtHourMinute(1, hour, minute).start;
  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  return { start, end };
}

async function ensureAgeRating(companyId: string, code: string) {
  const minimumAge =
    code === 'L' ? 0 : Number.parseInt(code.replace(/\D/g, ''), 10) || 0;

  return prisma.age_ratings.upsert({
    where: { company_id_code: { company_id: companyId, code } },
    update: { minimum_age: minimumAge },
    create: {
      company_id: companyId,
      code,
      name: code === 'L' ? 'Livre' : `${minimumAge} Anos`,
      minimum_age: minimumAge,
    },
  });
}

async function ensureMovieCategory(companyId: string, name: string) {
  const slug = slugify(name);

  return prisma.movie_categories.upsert({
    where: {
      company_id_slug: {
        company_id: companyId,
        slug,
      },
    },
    update: {
      name,
      active: true,
    },
    create: {
      company_id: companyId,
      name,
      slug,
      active: true,
    },
  });
}

async function ensureDistributor(
  companyId: string,
  supplierTypeId: string,
  tradeName: string,
  cnpj: string,
) {
  return prisma.suppliers.upsert({
    where: {
      company_id_cnpj: {
        company_id: companyId,
        cnpj,
      },
    },
    update: {
      trade_name: tradeName,
      corporate_name: tradeName,
      is_film_distributor: true,
      active: true,
      supplier_type_id: supplierTypeId,
    },
    create: {
      company_id: companyId,
      corporate_name: tradeName,
      trade_name: tradeName,
      cnpj,
      email: `${slugify(tradeName)}@frame24.local`,
      active: true,
      is_film_distributor: true,
      supplier_type_id: supplierTypeId,
    },
  });
}

async function upsertMovieMedia(
  mediaId: string,
  movieId: string,
  mediaTypeId: string,
  mediaUrl: string,
  title: string,
) {
  await prisma.movie_media.upsert({
    where: { id: mediaId },
    update: {
      movie_id: movieId,
      media_type: mediaTypeId,
      media_url: mediaUrl,
      title,
      active: true,
    },
    create: {
      id: mediaId,
      movie_id: movieId,
      media_type: mediaTypeId,
      media_url: mediaUrl,
      title,
      active: true,
    },
  });
}

async function ensureBetterAuthUser(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return existing;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      callbackURL: '/',
      rememberMe: false,
    },
  });

  if (!result?.user?.id) {
    throw new Error('Falha ao criar usuário Better Auth para E2E.');
  }

  return result.user;
}

async function ensureCompany() {
  return prisma.companies.upsert({
    where: { tenant_slug: FIXTURE.tenantSlug },
    update: {
      corporate_name: 'Lawtrel Administração',
      trade_name: 'Lawtrel Admin',
      website: FIXTURE.tenantWebsite,
      city: 'Salvador',
      state: 'BA',
      active: true,
      suspended: false,
    },
    create: {
      id: ids.company,
      corporate_name: 'Lawtrel Administração',
      trade_name: 'Lawtrel Admin',
      tenant_slug: FIXTURE.tenantSlug,
      cnpj: '00000000000100',
      email: 'contato@lawtrel.com',
      website: FIXTURE.tenantWebsite,
      city: 'Salvador',
      state: 'BA',
      tax_regime: 'SIMPLES_NACIONAL',
      active: true,
      suspended: false,
    },
  });
}

async function ensureDemoPeerCompany() {
  const tenantSlug = 'empresa-b';
  const company = await prisma.companies.upsert({
    where: { tenant_slug: tenantSlug },
    update: {
      corporate_name: 'Empresa B Cinemas',
      trade_name: 'Empresa B',
      website: 'http://empresa-b.lvh.me:3000',
      city: 'Aracaju',
      state: 'SE',
      active: true,
      suspended: false,
    },
    create: {
      id: ids.demoCompanyB,
      corporate_name: 'Empresa B Cinemas',
      trade_name: 'Empresa B',
      tenant_slug: tenantSlug,
      cnpj: '00000000009999',
      email: 'contato@empresa-b.demo',
      website: 'http://empresa-b.lvh.me:3000',
      city: 'Aracaju',
      state: 'SE',
      tax_regime: 'SIMPLES_NACIONAL',
      active: true,
      suspended: false,
    },
  });

  await prisma.cinema_complexes.upsert({
    where: { code: 'CX-E2E-B-AJU' },
    update: {
      company_id: company.id,
      slug: 'empresa-b-aracaju',
      city: 'Aracaju',
      city_slug: 'aracaju',
      state: 'SE',
      timezone: 'America/Maceio',
      active: true,
    },
    create: {
      id: ids.demoCompanyBComplexCapital,
      company_id: company.id,
      name: 'Empresa B Aracaju',
      slug: 'empresa-b-aracaju',
      code: 'CX-E2E-B-AJU',
      address: 'Av. Beira Mar, 1200',
      city: 'Aracaju',
      city_slug: 'aracaju',
      state: 'SE',
      timezone: 'America/Maceio',
      ibge_municipality_code: '2800308',
      active: true,
    },
  });

  await prisma.cinema_complexes.upsert({
    where: { code: 'CX-E2E-B-ITA' },
    update: {
      company_id: company.id,
      slug: 'empresa-b-itabaiana',
      city: 'Itabaiana',
      city_slug: 'itabaiana',
      state: 'SE',
      timezone: 'America/Maceio',
      active: true,
    },
    create: {
      id: ids.demoCompanyBComplexInterior,
      company_id: company.id,
      name: 'Empresa B Itabaiana',
      slug: 'empresa-b-itabaiana',
      code: 'CX-E2E-B-ITA',
      address: 'Rua das Laranjeiras, 410',
      city: 'Itabaiana',
      city_slug: 'itabaiana',
      state: 'SE',
      timezone: 'America/Maceio',
      ibge_municipality_code: '2802908',
      active: true,
    },
  });

  return company;
}

async function ensureTaxLookups(companyId: string) {
  await prisma.federal_tax_rates.upsert({
    where: { id: ids.federalTaxRate },
    update: {
      company_id: companyId,
      tax_regime: 'SIMPLES_NACIONAL',
      pis_cofins_regime: null,
      revenue_type: null,
      pis_rate: 0,
      cofins_rate: 0,
      credit_allowed: false,
      validity_start: new Date('2026-01-01T00:00:00.000Z'),
      validity_end: null,
      active: true,
    },
    create: {
      id: ids.federalTaxRate,
      company_id: companyId,
      tax_regime: 'SIMPLES_NACIONAL',
      pis_cofins_regime: null,
      revenue_type: null,
      pis_rate: 0,
      cofins_rate: 0,
      credit_allowed: false,
      validity_start: new Date('2026-01-01T00:00:00.000Z'),
      validity_end: null,
      active: true,
    },
  });

  await prisma.municipal_tax_parameters.upsert({
    where: {
      company_id_ibge_municipality_code_validity_start: {
        company_id: companyId,
        ibge_municipality_code: '2927408',
        validity_start: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: {
      municipality_name: 'Salvador',
      state: 'BA',
      iss_rate: 0,
      iss_service_code: '1201',
      validity_end: null,
      active: true,
    },
    create: {
      id: ids.municipalTaxSalvador,
      company_id: companyId,
      ibge_municipality_code: '2927408',
      municipality_name: 'Salvador',
      state: 'BA',
      iss_rate: 0,
      iss_service_code: '1201',
      validity_start: new Date('2026-01-01T00:00:00.000Z'),
      validity_end: null,
      active: true,
    },
  });
}

async function ensureFinanceLookups(companyId: string) {
  await prisma.bank_accounts.upsert({
    where: { id: ids.bankAccount },
    update: {
      company_id: companyId,
      bank_name: 'Banco Demo E2E',
      bank_code: '999',
      agency: '0001',
      account_number: '240000',
      account_digit: '1',
      account_type: 'checking',
      active: true,
      description: 'Conta padrão para baixa automática do fluxo web E2E',
    },
    create: {
      id: ids.bankAccount,
      company_id: companyId,
      bank_name: 'Banco Demo E2E',
      bank_code: '999',
      agency: '0001',
      account_number: '240000',
      account_digit: '1',
      account_type: 'checking',
      initial_balance: 0,
      current_balance: 0,
      active: true,
      description: 'Conta padrão para baixa automática do fluxo web E2E',
    },
  });
}

async function ensureSalesLookups(companyId: string) {
  await prisma.sale_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Venda Online' } },
    update: { convenience_fee: 0 },
    create: {
      id: ids.saleTypeOnline,
      company_id: companyId,
      name: 'Venda Online',
      description: 'Venda realizada pelo site',
      convenience_fee: 0,
    },
  });

  await prisma.sale_status.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Pendente' } },
    update: {},
    create: {
      id: ids.saleStatusPending,
      company_id: companyId,
      name: 'Pendente',
      description: 'Venda aguardando pagamento',
      allows_modification: true,
    },
  });

  await prisma.sale_status.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Confirmada' } },
    update: {},
    create: {
      id: ids.saleStatusConfirmed,
      company_id: companyId,
      name: 'Confirmada',
      description: 'Venda confirmada e paga',
      allows_modification: false,
    },
  });

  const paymentPix = await prisma.payment_methods.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Pix' } },
    update: {},
    create: {
      id: ids.paymentPix,
      company_id: companyId,
      name: 'Pix',
      description: 'Pagamento instantâneo',
      operator_fee: 0.9,
      settlement_days: 0,
      auto_settle: true,
    },
  });

  const paymentCard = await prisma.payment_methods.upsert({
    where: {
      company_id_name: { company_id: companyId, name: 'Cartão de Crédito' },
    },
    update: {},
    create: {
      id: ids.paymentCard,
      company_id: companyId,
      name: 'Cartão de Crédito',
      description: 'Pagamento com cartão',
      operator_fee: 3.5,
      settlement_days: 30,
      auto_settle: true,
    },
  });

  const paymentWallet = await prisma.payment_methods.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Wallet' } },
    update: {},
    create: {
      id: ids.paymentWallet,
      company_id: companyId,
      name: 'Wallet',
      description: 'Carteira digital',
      operator_fee: 1.2,
      settlement_days: 0,
      auto_settle: true,
    },
  });

  const ticketInteira = await prisma.ticket_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Inteira' } },
    update: { discount_percentage: 0 },
    create: {
      id: ids.ticketInteira,
      company_id: companyId,
      name: 'Inteira',
      description: 'Ingresso sem desconto',
      discount_percentage: 0,
    },
  });

  const ticketMeia = await prisma.ticket_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Meia-entrada' } },
    update: { discount_percentage: 50 },
    create: {
      id: ids.ticketMeia,
      company_id: companyId,
      name: 'Meia-entrada',
      description: 'Ingresso com 50% de desconto',
      discount_percentage: 50,
    },
  });

  const ticketCortesia = await prisma.ticket_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Cortesia' } },
    update: { discount_percentage: 100 },
    create: {
      id: ids.ticketCortesia,
      company_id: companyId,
      name: 'Cortesia',
      description: 'Ingresso cortesia',
      discount_percentage: 100,
    },
  });

  return {
    paymentPixId: paymentPix.id,
    paymentCardId: paymentCard.id,
    paymentWalletId: paymentWallet.id,
    ticketInteiraId: ticketInteira.id,
    ticketMeiaId: ticketMeia.id,
    ticketCortesiaId: ticketCortesia.id,
  };
}

async function ensureOperationsLookups(companyId: string) {
  const projection2d = await prisma.projection_types.upsert({
    where: { company_id_name: { company_id: companyId, name: '2D Digital' } },
    update: {},
    create: {
      id: ids.projection2d,
      company_id: companyId,
      name: '2D Digital',
      description: 'Projeção digital 2D',
      additional_value: 0,
    },
  });

  const audioDub = await prisma.audio_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Dublado' } },
    update: {},
    create: {
      id: ids.audioDub,
      company_id: companyId,
      name: 'Dublado',
      description: 'Áudio dublado',
      additional_value: 0,
    },
  });

  const languageDub = await prisma.session_languages.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Dublado' } },
    update: {},
    create: {
      id: ids.languageDub,
      company_id: companyId,
      name: 'Dublado',
      abbreviation: 'DUB',
      description: 'Áudio dublado',
    },
  });

  const statusOpen = await prisma.session_status.upsert({
    where: {
      company_id_name: {
        company_id: companyId,
        name: 'Aberta para Vendas',
      },
    },
    update: {},
    create: {
      id: ids.statusOpen,
      company_id: companyId,
      name: 'Aberta para Vendas',
      description: 'Sessão disponível para vendas',
      allows_modification: true,
    },
  });

  const seatTypeStandard = await prisma.seat_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Padrão' } },
    update: {},
    create: {
      id: ids.seatTypeStandard,
      company_id: companyId,
      name: 'Padrão',
      description: 'Poltrona padrão',
      additional_value: 0,
    },
  });

  const seatStatuses = [
    {
      id: ids.seatStatusAvailable,
      name: 'Disponível',
      description: 'Assento disponível para venda',
      is_default: true,
    },
    {
      id: ids.seatStatusSold,
      name: 'Vendido',
      description: 'Assento vendido',
      is_default: false,
    },
    {
      id: ids.seatStatusBlocked,
      name: 'Bloqueado',
      description: 'Assento bloqueado',
      is_default: false,
    },
    {
      id: ids.seatStatusReserved,
      name: 'Reservado',
      description: 'Assento reservado em checkout',
      is_default: false,
    },
  ];

  const resolvedSeatStatuses: Record<string, string> = {};

  for (const seatStatus of seatStatuses) {
    const record = await prisma.seat_status.upsert({
      where: {
        company_id_name: { company_id: companyId, name: seatStatus.name },
      },
      update: { is_default: seatStatus.is_default },
      create: {
        id: seatStatus.id,
        company_id: companyId,
        name: seatStatus.name,
        description: seatStatus.description,
        is_default: seatStatus.is_default,
        allows_modification: true,
      },
    });
    resolvedSeatStatuses[seatStatus.name] = record.id;
  }

  return {
    projectionId: projection2d.id,
    audioId: audioDub.id,
    languageId: languageDub.id,
    statusOpenId: statusOpen.id,
    seatTypeId: seatTypeStandard.id,
    seatStatusAvailableId: resolvedSeatStatuses['Disponível'],
    seatStatusReservedId: resolvedSeatStatuses['Reservado'],
  };
}

async function ensureCatalog(companyId: string) {
  const supplierType = await prisma.supplier_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Distribuidora' } },
    update: {},
    create: {
      id: ids.supplierType,
      company_id: companyId,
      name: 'Distribuidora',
      description: 'Distribuidora de filmes',
    },
  });

  const existingSupplier = await prisma.suppliers.findFirst({
    where: {
      company_id: companyId,
      cnpj: '00000000000200',
    },
  });

  if (existingSupplier) {
    await prisma.suppliers.update({
      where: { id: existingSupplier.id },
      data: {
        corporate_name: 'Atlântico Filmes Distribuição LTDA',
        trade_name: 'Atlântico Filmes',
        email: 'distribuidora@atlantico.local',
        active: true,
        is_film_distributor: true,
        supplier_type_id: supplierType.id,
      },
    });
  } else {
    await prisma.suppliers.create({
      data: {
        id: ids.supplier,
        company_id: companyId,
        corporate_name: 'Atlântico Filmes Distribuição LTDA',
        trade_name: 'Atlântico Filmes',
        cnpj: '00000000000200',
        email: 'distribuidora@atlantico.local',
        active: true,
        is_film_distributor: true,
        supplier_type_id: supplierType.id,
      },
    });
  }

  const ageRating = await prisma.age_ratings.upsert({
    where: { company_id_code: { company_id: companyId, code: '12' } },
    update: {},
    create: {
      id: ids.ageRating12,
      company_id: companyId,
      code: '12',
      name: '12 Anos',
      minimum_age: 12,
    },
  });

  const movieCategory = await prisma.movie_categories.upsert({
    where: {
      company_id_slug: { company_id: companyId, slug: 'aventura' },
    },
    update: { active: true },
    create: {
      id: ids.movieCategoryAdventure,
      company_id: companyId,
      name: 'Aventura',
      description: 'Filmes de aventura',
      minimum_age: 10,
      slug: 'aventura',
      active: true,
    },
  });

  const mediaPoster = await prisma.media_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Poster' } },
    update: {},
    create: {
      id: ids.mediaPoster,
      company_id: companyId,
      name: 'Poster',
      description: 'Imagem vertical do filme',
    },
  });

  const mediaBackdrop = await prisma.media_types.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Backdrop' } },
    update: {},
    create: {
      id: ids.mediaBackdrop,
      company_id: companyId,
      name: 'Backdrop',
      description: 'Imagem de fundo do filme',
    },
  });

  const movie = await prisma.movies.upsert({
    where: {
      company_id_slug: { company_id: companyId, slug: FIXTURE.movieSlug },
    },
    update: {
      active: true,
      synopsis:
        'Uma jornada costeira cheia de pistas secretas, humor e ação para testar a nova vitrine tenant-aware.',
      short_synopsis:
        'Uma aventura marítima criada para os testes E2E do Frame24.',
      tmdb_genres_json: JSON.stringify(['Aventura']),
    },
    create: {
      id: ids.movie,
      company_id: companyId,
      distributor_id: existingSupplier?.id ?? ids.supplier,
      original_title: 'Atlantic Adventures',
      brazil_title: 'Aventuras no Atlântico',
      duration_minutes: 118,
      production_year: 2026,
      national: true,
      active: true,
      synopsis:
        'Uma jornada costeira cheia de pistas secretas, humor e ação para testar a nova vitrine tenant-aware.',
      short_synopsis:
        'Uma aventura marítima criada para os testes E2E do Frame24.',
      age_rating_id: ageRating.id,
      movie_categoriesId: movieCategory.id,
      slug: FIXTURE.movieSlug,
      original_language: 'pt-BR',
      worldwide_release_date: new Date('2026-04-01T00:00:00.000Z'),
      tmdb_genres_json: JSON.stringify(['Aventura']),
    },
  });

  await prisma.movies_on_categories.upsert({
    where: {
      movie_id_category_id: {
        movie_id: movie.id,
        category_id: movieCategory.id,
      },
    },
    update: { age_ratingsId: ageRating.id },
    create: {
      movie_id: movie.id,
      category_id: movieCategory.id,
      age_ratingsId: ageRating.id,
    },
  });

  await prisma.movie_media.upsert({
    where: { id: ids.moviePoster },
    update: {
      media_url:
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
      active: true,
    },
    create: {
      id: ids.moviePoster,
      movie_id: movie.id,
      media_type: mediaPoster.id,
      media_url:
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
      title: 'Poster E2E',
      active: true,
    },
  });

  await prisma.movie_media.upsert({
    where: { id: ids.movieBackdrop },
    update: {
      media_url:
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80',
      active: true,
    },
    create: {
      id: ids.movieBackdrop,
      movie_id: movie.id,
      media_type: mediaBackdrop.id,
      media_url:
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80',
      title: 'Backdrop E2E',
      active: true,
    },
  });

  return {
    movieId: movie.id,
  };
}

async function ensureShowcaseCatalog(companyId: string) {
  const supplierType = await prisma.supplier_types.findUnique({
    where: {
      company_id_name: { company_id: companyId, name: 'Distribuidora' },
    },
  });

  if (!supplierType) {
    throw new Error('Tipo de fornecedor Distribuidora nao encontrado.');
  }

  const mediaPoster = await prisma.media_types.findUnique({
    where: { company_id_name: { company_id: companyId, name: 'Poster' } },
  });
  const mediaBackdrop = await prisma.media_types.findUnique({
    where: { company_id_name: { company_id: companyId, name: 'Backdrop' } },
  });

  if (!mediaPoster || !mediaBackdrop) {
    throw new Error('Tipos de midia de filme nao encontrados para o showcase.');
  }

  const movies = [];

  for (const definition of SHOWCASE_MOVIES) {
    const distributor = await ensureDistributor(
      companyId,
      supplierType.id,
      definition.distributorName,
      definition.distributorCnpj,
    );
    const ageRating = await ensureAgeRating(companyId, definition.ratingCode);
    const categories = await Promise.all(
      definition.genres.map((genre) => ensureMovieCategory(companyId, genre)),
    );

    const movie = await prisma.movies.upsert({
      where: {
        company_id_slug: {
          company_id: companyId,
          slug: definition.slug,
        },
      },
      update: {
        distributor_id: distributor.id,
        original_title: definition.originalTitle,
        brazil_title: definition.brazilTitle,
        duration_minutes: definition.durationMinutes,
        production_year: definition.productionYear,
        age_rating_id: ageRating.id,
        movie_categoriesId: categories[0]?.id ?? null,
        synopsis: definition.synopsis,
        short_synopsis: definition.shortSynopsis,
        worldwide_release_date: new Date(definition.worldwideReleaseDate),
        original_language: definition.originalLanguage,
        tmdb_id: definition.tmdbId,
        tmdb_genres_json: JSON.stringify(definition.genres),
        active: true,
      },
      create: {
        id: definition.id,
        company_id: companyId,
        distributor_id: distributor.id,
        original_title: definition.originalTitle,
        brazil_title: definition.brazilTitle,
        duration_minutes: definition.durationMinutes,
        production_year: definition.productionYear,
        age_rating_id: ageRating.id,
        movie_categoriesId: categories[0]?.id ?? null,
        synopsis: definition.synopsis,
        short_synopsis: definition.shortSynopsis,
        worldwide_release_date: new Date(definition.worldwideReleaseDate),
        original_language: definition.originalLanguage,
        tmdb_id: definition.tmdbId,
        slug: definition.slug,
        active: true,
        national: false,
        tmdb_genres_json: JSON.stringify(definition.genres),
      },
    });

    for (const category of categories) {
      await prisma.movies_on_categories.upsert({
        where: {
          movie_id_category_id: {
            movie_id: movie.id,
            category_id: category.id,
          },
        },
        update: { age_ratingsId: ageRating.id },
        create: {
          movie_id: movie.id,
          category_id: category.id,
          age_ratingsId: ageRating.id,
        },
      });
    }

    await upsertMovieMedia(
      definition.posterId,
      movie.id,
      mediaPoster.id,
      definition.posterUrl,
      `${definition.brazilTitle} Poster`,
    );
    await upsertMovieMedia(
      definition.backdropId,
      movie.id,
      mediaBackdrop.id,
      definition.backdropUrl,
      `${definition.brazilTitle} Backdrop`,
    );

    movies.push({
      id: movie.id,
      slug: definition.slug,
      title: definition.brazilTitle,
    });
  }

  return movies;
}

async function ensureComplexes(
  companyId: string,
  operations: Awaited<ReturnType<typeof ensureOperationsLookups>>,
) {
  const complexSalvador = await prisma.cinema_complexes.upsert({
    where: { code: 'CX-E2E-SAL' },
    update: {
      company_id: companyId,
      slug: 'cine-litoral-salvador',
      city: 'Salvador',
      city_slug: FIXTURE.citySlug,
      state: 'BA',
      timezone: 'America/Bahia',
      active: true,
    },
    create: {
      id: ids.complexSalvador,
      company_id: companyId,
      name: 'Cine Litoral Salvador',
      slug: 'cine-litoral-salvador',
      code: 'CX-E2E-SAL',
      address: 'Av. Oceânica, 2400',
      city: 'Salvador',
      city_slug: FIXTURE.citySlug,
      state: 'BA',
      timezone: 'America/Bahia',
      ibge_municipality_code: '2927408',
      active: true,
    },
  });

  const complexFeira = await prisma.cinema_complexes.upsert({
    where: { code: 'CX-E2E-FSA' },
    update: {
      company_id: companyId,
      slug: 'cine-sertao-feira',
      city: 'Feira de Santana',
      city_slug: FIXTURE.secondCitySlug,
      state: 'BA',
      timezone: 'America/Bahia',
      active: true,
    },
    create: {
      id: ids.complexFeira,
      company_id: companyId,
      name: 'Cine Sertão Feira',
      slug: 'cine-sertao-feira',
      code: 'CX-E2E-FSA',
      address: 'Av. Getúlio Vargas, 500',
      city: 'Feira de Santana',
      city_slug: FIXTURE.secondCitySlug,
      state: 'BA',
      timezone: 'America/Bahia',
      ibge_municipality_code: '2910800',
      active: true,
    },
  });

  const roomSalvador = await prisma.rooms.upsert({
    where: {
      cinema_complex_id_room_number: {
        cinema_complex_id: complexSalvador.id,
        room_number: '01',
      },
    },
    update: {
      name: 'Sala Mar',
      capacity: 50,
      active: true,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      total_rows: 5,
      total_columns: 10,
    },
    create: {
      id: ids.roomSalvador,
      cinema_complex_id: complexSalvador.id,
      room_number: '01',
      name: 'Sala Mar',
      capacity: 50,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      active: true,
      total_rows: 5,
      total_columns: 10,
    },
  });

  const roomFeira = await prisma.rooms.upsert({
    where: {
      cinema_complex_id_room_number: {
        cinema_complex_id: complexFeira.id,
        room_number: '01',
      },
    },
    update: {
      name: 'Sala Sertão',
      capacity: 24,
      active: true,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      total_rows: 4,
      total_columns: 6,
    },
    create: {
      id: ids.roomFeira,
      cinema_complex_id: complexFeira.id,
      room_number: '01',
      name: 'Sala Sertão',
      capacity: 24,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      active: true,
      total_rows: 4,
      total_columns: 6,
    },
  });

  return {
    complexSalvadorId: complexSalvador.id,
    complexFeiraId: complexFeira.id,
    roomSalvadorId: roomSalvador.id,
    roomFeiraId: roomFeira.id,
  };
}

async function ensureSeats(
  complexes: Awaited<ReturnType<typeof ensureComplexes>>,
  operations: Awaited<ReturnType<typeof ensureOperationsLookups>>,
) {
  const seatTargets = [
    {
      roomId: complexes.roomSalvadorId,
      rows: ['A', 'B', 'C', 'D', 'E'],
      cols: 10,
    },
    { roomId: complexes.roomFeiraId, rows: ['A', 'B', 'C', 'D'], cols: 6 },
  ];

  for (const target of seatTargets) {
    for (const row of target.rows) {
      for (let column = 1; column <= target.cols; column += 1) {
        const seatCode = `${row}${column}`;
        await prisma.seats.upsert({
          where: {
            room_id_seat_code: {
              room_id: target.roomId,
              seat_code: seatCode,
            },
          },
          update: {
            row_code: row,
            column_number: column,
            active: true,
            accessible: row === 'A' && column <= 2,
            seat_type: operations.seatTypeId,
          },
          create: {
            room_id: target.roomId,
            seat_code: seatCode,
            row_code: row,
            column_number: column,
            active: true,
            accessible: row === 'A' && column <= 2,
            seat_type: operations.seatTypeId,
          },
        });
      }
    }
  }
}

async function ensureShowtimes(
  catalog: Awaited<ReturnType<typeof ensureCatalog>>,
  complexes: Awaited<ReturnType<typeof ensureComplexes>>,
  operations: Awaited<ReturnType<typeof ensureOperationsLookups>>,
) {
  const salvadorWindow = showtimeWindow(1, 20);
  const feiraWindow = showtimeWindow(2, 19);

  await prisma.showtime_schedule.upsert({
    where: { id: ids.showtimeSalvador },
    update: {
      cinema_complex_id: complexes.complexSalvadorId,
      room_id: complexes.roomSalvadorId,
      movie_id: catalog.movieId,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      session_language: operations.languageId,
      status: operations.statusOpenId,
      start_time: salvadorWindow.start,
      end_time: salvadorWindow.end,
      base_ticket_price: 32,
      available_seats: 49,
      sold_seats: 0,
      blocked_seats: 0,
    },
    create: {
      id: ids.showtimeSalvador,
      cinema_complex_id: complexes.complexSalvadorId,
      room_id: complexes.roomSalvadorId,
      movie_id: catalog.movieId,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      session_language: operations.languageId,
      status: operations.statusOpenId,
      start_time: salvadorWindow.start,
      end_time: salvadorWindow.end,
      base_ticket_price: 32,
      available_seats: 49,
      sold_seats: 0,
      blocked_seats: 0,
    },
  });

  await prisma.showtime_schedule.upsert({
    where: { id: ids.showtimeFeira },
    update: {
      cinema_complex_id: complexes.complexFeiraId,
      room_id: complexes.roomFeiraId,
      movie_id: catalog.movieId,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      session_language: operations.languageId,
      status: operations.statusOpenId,
      start_time: feiraWindow.start,
      end_time: feiraWindow.end,
      base_ticket_price: 28,
      available_seats: 24,
      sold_seats: 0,
      blocked_seats: 0,
    },
    create: {
      id: ids.showtimeFeira,
      cinema_complex_id: complexes.complexFeiraId,
      room_id: complexes.roomFeiraId,
      movie_id: catalog.movieId,
      projection_type: operations.projectionId,
      audio_type: operations.audioId,
      session_language: operations.languageId,
      status: operations.statusOpenId,
      start_time: feiraWindow.start,
      end_time: feiraWindow.end,
      base_ticket_price: 28,
      available_seats: 24,
      sold_seats: 0,
      blocked_seats: 0,
    },
  });

  const salvadorSeats = await prisma.seats.findMany({
    where: { room_id: complexes.roomSalvadorId },
    orderBy: [{ row_code: 'asc' }, { column_number: 'asc' }],
  });

  for (const seat of salvadorSeats) {
    const isReservedSeat = seat.seat_code === 'A1';
    await prisma.session_seat_status.upsert({
      where: {
        showtime_id_seat_id: {
          showtime_id: ids.showtimeSalvador,
          seat_id: seat.id,
        },
      },
      update: {
        status: isReservedSeat
          ? operations.seatStatusReservedId
          : operations.seatStatusAvailableId,
        sale_id: null,
        reservation_uuid: isReservedSeat ? FIXTURE.reservationUuid : null,
        reservation_date: isReservedSeat ? new Date() : null,
        expiration_date: isReservedSeat
          ? new Date(Date.now() + CHECKOUT_EXPIRATION_MS)
          : null,
      },
      create: {
        showtime_id: ids.showtimeSalvador,
        seat_id: seat.id,
        status: isReservedSeat
          ? operations.seatStatusReservedId
          : operations.seatStatusAvailableId,
        sale_id: null,
        reservation_uuid: isReservedSeat ? FIXTURE.reservationUuid : null,
        reservation_date: isReservedSeat ? new Date() : null,
        expiration_date: isReservedSeat
          ? new Date(Date.now() + CHECKOUT_EXPIRATION_MS)
          : null,
      },
    });
  }

  const feiraSeats = await prisma.seats.findMany({
    where: { room_id: complexes.roomFeiraId },
    orderBy: [{ row_code: 'asc' }, { column_number: 'asc' }],
  });

  for (const seat of feiraSeats) {
    await prisma.session_seat_status.upsert({
      where: {
        showtime_id_seat_id: {
          showtime_id: ids.showtimeFeira,
          seat_id: seat.id,
        },
      },
      update: {
        status: operations.seatStatusAvailableId,
        sale_id: null,
        reservation_uuid: null,
        reservation_date: null,
        expiration_date: null,
      },
      create: {
        showtime_id: ids.showtimeFeira,
        seat_id: seat.id,
        status: operations.seatStatusAvailableId,
        sale_id: null,
      },
    });
  }
}

async function ensureShowcaseShowtimes(
  movies: Awaited<ReturnType<typeof ensureShowcaseCatalog>>,
  complexes: Awaited<ReturnType<typeof ensureComplexes>>,
  operations: Awaited<ReturnType<typeof ensureOperationsLookups>>,
) {
  const movieBySlug = new Map(movies.map((movie) => [movie.slug, movie.id]));

  const showcaseShowtimes = [
    {
      id: ids.showcaseShowtimeSalvadorDune,
      movieSlug: 'duna-parte-dois',
      complexId: complexes.complexSalvadorId,
      roomId: complexes.roomSalvadorId,
      start: showtimeWindow(1, 17),
      price: 34,
      seats: 50,
    },
    {
      id: ids.showcaseShowtimeSalvadorSpiderMan,
      movieSlug: 'homem-aranha-sem-volta-para-casa',
      complexId: complexes.complexSalvadorId,
      roomId: complexes.roomSalvadorId,
      start: showtimeWindow(2, 21),
      price: 36,
      seats: 50,
    },
    {
      id: ids.showcaseShowtimeSalvadorBatman,
      movieSlug: 'batman',
      complexId: complexes.complexSalvadorId,
      roomId: complexes.roomSalvadorId,
      start: showtimeWindow(4, 19),
      price: 35,
      seats: 50,
    },
    {
      id: ids.showcaseShowtimeSalvadorInsideOut,
      movieSlug: 'divertida-mente-2',
      complexId: complexes.complexSalvadorId,
      roomId: complexes.roomSalvadorId,
      start: showtimeWindow(6, 16),
      price: 29,
      seats: 50,
    },
    {
      id: ids.showcaseShowtimeSalvadorLateTonight,
      movieSlug: 'duna-parte-dois',
      complexId: complexes.complexSalvadorId,
      roomId: complexes.roomSalvadorId,
      start: showtimeTonightOrTomorrow(23, 0),
      price: 37,
      seats: 50,
    },
    {
      id: ids.showcaseShowtimeFeiraWakanda,
      movieSlug: 'pantera-negra-wakanda-para-sempre',
      complexId: complexes.complexFeiraId,
      roomId: complexes.roomFeiraId,
      start: showtimeWindow(3, 18),
      price: 30,
      seats: 24,
    },
    {
      id: ids.showcaseShowtimeFeiraGladiator,
      movieSlug: 'gladiador-ii',
      complexId: complexes.complexFeiraId,
      roomId: complexes.roomFeiraId,
      start: showtimeWindow(5, 20),
      price: 32,
      seats: 24,
    },
    {
      id: ids.showcaseShowtimeFeiraHungerGames,
      movieSlug:
        'jogos-vorazes-a-cantiga-dos-passaros-e-das-serpentes',
      complexId: complexes.complexFeiraId,
      roomId: complexes.roomFeiraId,
      start: showtimeWindow(7, 21),
      price: 31,
      seats: 24,
    },
    {
      id: ids.showcaseShowtimeFeiraDune,
      movieSlug: 'duna-parte-dois',
      complexId: complexes.complexFeiraId,
      roomId: complexes.roomFeiraId,
      start: showtimeWindow(8, 17),
      price: 30,
      seats: 24,
    },
    {
      id: ids.showcaseShowtimeFeiraLateTonight,
      movieSlug: 'batman',
      complexId: complexes.complexFeiraId,
      roomId: complexes.roomFeiraId,
      start: showtimeTonightOrTomorrow(23, 30),
      price: 33,
      seats: 24,
    },
  ];

  for (const showtime of showcaseShowtimes) {
    const movieId = movieBySlug.get(showtime.movieSlug);

    if (!movieId) {
      throw new Error(
        `Filme de showcase nao encontrado para slug ${showtime.movieSlug}.`,
      );
    }

    await prisma.showtime_schedule.upsert({
      where: { id: showtime.id },
      update: {
        cinema_complex_id: showtime.complexId,
        room_id: showtime.roomId,
        movie_id: movieId,
        projection_type: operations.projectionId,
        audio_type: operations.audioId,
        session_language: operations.languageId,
        status: operations.statusOpenId,
        start_time: showtime.start.start,
        end_time: showtime.start.end,
        base_ticket_price: showtime.price,
        available_seats: showtime.seats,
        sold_seats: 0,
        blocked_seats: 0,
      },
      create: {
        id: showtime.id,
        cinema_complex_id: showtime.complexId,
        room_id: showtime.roomId,
        movie_id: movieId,
        projection_type: operations.projectionId,
        audio_type: operations.audioId,
        session_language: operations.languageId,
        status: operations.statusOpenId,
        start_time: showtime.start.start,
        end_time: showtime.start.end,
        base_ticket_price: showtime.price,
        available_seats: showtime.seats,
        sold_seats: 0,
        blocked_seats: 0,
      },
    });

    const seats = await prisma.seats.findMany({
      where: { room_id: showtime.roomId },
      orderBy: [{ row_code: 'asc' }, { column_number: 'asc' }],
    });

    for (const seat of seats) {
      await prisma.session_seat_status.upsert({
        where: {
          showtime_id_seat_id: {
            showtime_id: showtime.id,
            seat_id: seat.id,
          },
        },
        update: {
          status: operations.seatStatusAvailableId,
          sale_id: null,
          reservation_uuid: null,
          reservation_date: null,
          expiration_date: null,
        },
        create: {
          showtime_id: showtime.id,
          seat_id: seat.id,
          status: operations.seatStatusAvailableId,
          sale_id: null,
          reservation_uuid: null,
          reservation_date: null,
          expiration_date: null,
        },
      });
    }
  }
}

async function ensureProducts(
  companyId: string,
  complexes: Awaited<ReturnType<typeof ensureComplexes>>,
) {
  await prisma.product_categories.upsert({
    where: { company_id_name: { company_id: companyId, name: 'Bomboniere' } },
    update: {},
    create: {
      id: ids.productCategory,
      company_id: companyId,
      name: 'Bomboniere',
      description: 'Produtos do cinema para venda online',
    },
  });

  await prisma.products.upsert({
    where: {
      company_id_product_code: {
        company_id: companyId,
        product_code: 'PIP-E2E',
      },
    },
    update: {
      active: true,
      is_available_online: true,
      image_url:
        'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80',
    },
    create: {
      id: ids.productPipoca,
      company_id: companyId,
      category_id: ids.productCategory,
      product_code: 'PIP-E2E',
      name: 'Pipoca Grande E2E',
      description: 'Pipoca grande usada nos testes E2E',
      unit: 'UN',
      active: true,
      is_available_online: true,
      image_url:
        'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80',
    },
  });

  await prisma.products.upsert({
    where: {
      company_id_product_code: {
        company_id: companyId,
        product_code: 'REF-E2E',
      },
    },
    update: {
      active: true,
      is_available_online: true,
      image_url:
        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    },
    create: {
      id: ids.productRefri,
      company_id: companyId,
      category_id: ids.productCategory,
      product_code: 'REF-E2E',
      name: 'Refrigerante E2E',
      description: 'Refrigerante usado nos testes E2E',
      unit: 'UN',
      active: true,
      is_available_online: true,
      image_url:
        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    },
  });

  await prisma.product_prices.upsert({
    where: {
      product_id_complex_id_valid_from: {
      product_id: ids.productPipoca,
        complex_id: complexes.complexSalvadorId,
        valid_from: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: {
      sale_price: 22,
      cost_price: 8,
      active: true,
    },
    create: {
      id: ids.pricePipoca,
      product_id: ids.productPipoca,
      complex_id: complexes.complexSalvadorId,
      company_id: companyId,
      sale_price: 22,
      cost_price: 8,
      valid_from: new Date('2026-01-01T00:00:00.000Z'),
      active: true,
    },
  });

  await prisma.product_prices.upsert({
    where: {
      product_id_complex_id_valid_from: {
      product_id: ids.productRefri,
        complex_id: complexes.complexSalvadorId,
        valid_from: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: {
      sale_price: 12,
      cost_price: 4,
      active: true,
    },
    create: {
      id: ids.priceRefri,
      product_id: ids.productRefri,
      complex_id: complexes.complexSalvadorId,
      company_id: companyId,
      sale_price: 12,
      cost_price: 4,
      valid_from: new Date('2026-01-01T00:00:00.000Z'),
      active: true,
    },
  });

  await prisma.product_stock.upsert({
    where: {
      product_id_complex_id: {
        product_id: ids.productPipoca,
        complex_id: complexes.complexSalvadorId,
      },
    },
    update: {
      current_quantity: 50,
      minimum_quantity: 5,
      maximum_quantity: 100,
      active: true,
    },
    create: {
      id: ids.productStockPipoca,
      product_id: ids.productPipoca,
      complex_id: complexes.complexSalvadorId,
      current_quantity: 50,
      minimum_quantity: 5,
      maximum_quantity: 100,
      active: true,
    },
  });

  await prisma.product_stock.upsert({
    where: {
      product_id_complex_id: {
        product_id: ids.productRefri,
        complex_id: complexes.complexSalvadorId,
      },
    },
    update: {
      current_quantity: 50,
      minimum_quantity: 5,
      maximum_quantity: 100,
      active: true,
    },
    create: {
      id: ids.productStockRefri,
      product_id: ids.productRefri,
      complex_id: complexes.complexSalvadorId,
      current_quantity: 50,
      minimum_quantity: 5,
      maximum_quantity: 100,
      active: true,
    },
  });

  return {
    productPipocaId: ids.productPipoca,
  };
}

async function ensureCustomer(companyId: string) {
  const authEmail = toTenantAuthEmail(FIXTURE.tenantSlug, FIXTURE.customerEmail);
  const authUser = await ensureBetterAuthUser(
    authEmail,
    FIXTURE.customerPassword,
    FIXTURE.customerName,
  );

  const identity = await prisma.identities.upsert({
    where: { id: ids.customerIdentity },
    update: {
      email: authEmail,
      identity_type: 'CUSTOMER',
      active: true,
      email_verified: true,
    },
    create: {
      id: ids.customerIdentity,
      email: authEmail,
      external_id: authUser.id,
      identity_type: 'CUSTOMER',
      active: true,
      email_verified: true,
    },
  });

  const customer = await prisma.customers.upsert({
    where: { identity_id: identity.id },
    update: {
      full_name: FIXTURE.customerName,
      email: FIXTURE.customerEmail,
      cpf: FIXTURE.customerCpf,
      phone: FIXTURE.customerPhone,
      active: true,
      blocked: false,
      terms_accepted: true,
      terms_acceptance_date: new Date(),
    },
    create: {
      id: ids.customer,
      identity_id: identity.id,
      cpf: FIXTURE.customerCpf,
      full_name: FIXTURE.customerName,
      email: FIXTURE.customerEmail,
      phone: FIXTURE.customerPhone,
      accepts_email: true,
      accepts_marketing: true,
      accepts_sms: true,
      terms_accepted: true,
      terms_acceptance_date: new Date(),
      active: true,
      blocked: false,
      registration_source: 'E2E_SEED',
    },
  });

  await prisma.company_customers.upsert({
    where: {
      company_id_customer_id: {
        company_id: companyId,
        customer_id: customer.id,
      },
    },
    update: {
      is_active_in_loyalty: true,
      loyalty_level: 'BRONZE',
      accumulated_points: 0,
    },
    create: {
      id: ids.companyCustomer,
      company_id: companyId,
      customer_id: customer.id,
      is_active_in_loyalty: true,
      loyalty_level: 'BRONZE',
      accumulated_points: 0,
      loyalty_join_date: new Date(),
    },
  });

  return customer;
}

async function ensurePendingCheckout(
  companyId: string,
  customerId: string,
  sales: Awaited<ReturnType<typeof ensureSalesLookups>>,
  complexes: Awaited<ReturnType<typeof ensureComplexes>>,
  products: Awaited<ReturnType<typeof ensureProducts>>,
) {
  const reservedSeat = await prisma.seats.findUnique({
    where: {
      room_id_seat_code: {
        room_id: complexes.roomSalvadorId,
        seat_code: 'A1',
      },
    },
  });

  if (!reservedSeat) {
    throw new Error('Assento A1 não encontrado para o checkout E2E.');
  }

  await prisma.checkout_sessions.upsert({
    where: { id: ids.checkout },
    update: {
      company_id: companyId,
      customer_id: customerId,
      tenant_slug: FIXTURE.tenantSlug,
      showtime_id: ids.showtimeSalvador,
      cinema_complex_id: complexes.complexSalvadorId,
      reservation_uuid: FIXTURE.reservationUuid,
      status: 'payment_pending',
      subtotal_amount: 54,
      discount_amount: 0,
      total_amount: 54,
      currency: 'BRL',
      expires_at: new Date(Date.now() + CHECKOUT_EXPIRATION_MS),
    },
    create: {
      id: ids.checkout,
      company_id: companyId,
      customer_id: customerId,
      tenant_slug: FIXTURE.tenantSlug,
      showtime_id: ids.showtimeSalvador,
      cinema_complex_id: complexes.complexSalvadorId,
      reservation_uuid: FIXTURE.reservationUuid,
      status: 'payment_pending',
      subtotal_amount: 54,
      discount_amount: 0,
      total_amount: 54,
      currency: 'BRL',
      expires_at: new Date(Date.now() + CHECKOUT_EXPIRATION_MS),
    },
  });

  await prisma.checkout_session_tickets.upsert({
    where: {
      checkout_session_id_seat_id: {
        checkout_session_id: ids.checkout,
        seat_id: reservedSeat.id,
      },
    },
    update: {
      showtime_id: ids.showtimeSalvador,
      ticket_type: sales.ticketInteiraId,
      face_value: 32,
      service_fee: 0,
      total_amount: 32,
    },
    create: {
      id: ids.checkoutTicket,
      checkout_session_id: ids.checkout,
      showtime_id: ids.showtimeSalvador,
      seat_id: reservedSeat.id,
      ticket_type: sales.ticketInteiraId,
      face_value: 32,
      service_fee: 0,
      total_amount: 32,
    },
  });

  await prisma.checkout_session_concessions.upsert({
    where: { id: ids.checkoutConcession },
    update: {
      complex_id: complexes.complexSalvadorId,
      item_type: 'PRODUCT',
      item_id: products.productPipocaId,
      quantity: 1,
      unit_price: 22,
      total_price: 22,
    },
    create: {
      id: ids.checkoutConcession,
      checkout_session_id: ids.checkout,
      complex_id: complexes.complexSalvadorId,
      item_type: 'PRODUCT',
      item_id: products.productPipocaId,
      quantity: 1,
      unit_price: 22,
      total_price: 22,
    },
  });

  await prisma.payment_attempts.upsert({
    where: { id: ids.paymentAttempt },
    update: {
      checkout_session_id: ids.checkout,
      provider: 'internal',
      method: 'Pix',
      status: 'pending',
      amount: 54,
      currency: 'BRL',
      provider_reference: 'internal_e2e_pending',
      payment_data_json: JSON.stringify({
        pix_qr_code: 'FRAME24-PIX-E2E',
        pix_copy_paste: '000201FRAME24PIXE2E',
      }),
      expires_at: new Date(Date.now() + CHECKOUT_EXPIRATION_MS),
      paid_at: null,
      sale_id: null,
    },
    create: {
      id: ids.paymentAttempt,
      checkout_session_id: ids.checkout,
      provider: 'internal',
      method: 'Pix',
      status: 'pending',
      amount: 54,
      currency: 'BRL',
      provider_reference: 'internal_e2e_pending',
      payment_data_json: JSON.stringify({
        pix_qr_code: 'FRAME24-PIX-E2E',
        pix_copy_paste: '000201FRAME24PIXE2E',
      }),
      expires_at: new Date(Date.now() + CHECKOUT_EXPIRATION_MS),
    },
  });
}

async function resetMutableCheckouts() {
  const checkoutIds = [
    ids.checkoutPaidDesktop,
    ids.checkoutFailedDesktop,
    ids.checkoutPaidMobile,
    ids.checkoutFailedMobile,
    ids.checkoutPixDesktop,
    ids.checkoutPixMobile,
    ids.checkoutStockDesktop,
    ids.checkoutStockMobile,
  ];

  await prisma.payment_attempts.deleteMany({
    where: { checkout_session_id: { in: checkoutIds } },
  });
  await prisma.checkout_session_concessions.deleteMany({
    where: { checkout_session_id: { in: checkoutIds } },
  });
  await prisma.checkout_session_tickets.deleteMany({
    where: { checkout_session_id: { in: checkoutIds } },
  });
  await prisma.checkout_sessions.deleteMany({
    where: { id: { in: checkoutIds } },
  });
}

async function ensureReadyCheckoutFixture({
  checkoutId,
  checkoutTicketId,
  checkoutConcessionId,
  companyId,
  customerId,
  sales,
  complexes,
  products,
  operations,
  seatCode,
  reservationUuid,
  includeConcession,
}: {
  checkoutId: string;
  checkoutTicketId: string;
  checkoutConcessionId?: string;
  companyId: string;
  customerId: string;
  sales: Awaited<ReturnType<typeof ensureSalesLookups>>;
  complexes: Awaited<ReturnType<typeof ensureComplexes>>;
  products: Awaited<ReturnType<typeof ensureProducts>>;
  operations: Awaited<ReturnType<typeof ensureOperationsLookups>>;
  seatCode: string;
  reservationUuid: string;
  includeConcession: boolean;
}) {
  const reservedSeat = await prisma.seats.findUnique({
    where: {
      room_id_seat_code: {
        room_id: complexes.roomSalvadorId,
        seat_code: seatCode,
      },
    },
  });

  if (!reservedSeat) {
    throw new Error(`Assento ${seatCode} não encontrado para o checkout E2E.`);
  }

  const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRATION_MS);
  const concessionAmount = includeConcession ? 22 : 0;
  const totalAmount = 32 + concessionAmount;

  await prisma.session_seat_status.upsert({
    where: {
      showtime_id_seat_id: {
        showtime_id: ids.showtimeSalvador,
        seat_id: reservedSeat.id,
      },
    },
    update: {
      status: operations.seatStatusReservedId,
      sale_id: null,
      reservation_uuid: reservationUuid,
      reservation_date: new Date(),
      expiration_date: expiresAt,
    },
    create: {
      showtime_id: ids.showtimeSalvador,
      seat_id: reservedSeat.id,
      status: operations.seatStatusReservedId,
      sale_id: null,
      reservation_uuid: reservationUuid,
      reservation_date: new Date(),
      expiration_date: expiresAt,
    },
  });

  await prisma.checkout_sessions.create({
    data: {
      id: checkoutId,
      company_id: companyId,
      customer_id: customerId,
      tenant_slug: FIXTURE.tenantSlug,
      showtime_id: ids.showtimeSalvador,
      cinema_complex_id: complexes.complexSalvadorId,
      reservation_uuid: reservationUuid,
      status: 'ready',
      subtotal_amount: totalAmount,
      discount_amount: 0,
      total_amount: totalAmount,
      currency: 'BRL',
      expires_at: expiresAt,
    },
  });

  await prisma.checkout_session_tickets.create({
    data: {
      id: checkoutTicketId,
      checkout_session_id: checkoutId,
      showtime_id: ids.showtimeSalvador,
      seat_id: reservedSeat.id,
      ticket_type: sales.ticketInteiraId,
      face_value: 32,
      service_fee: 0,
      total_amount: 32,
    },
  });

  if (includeConcession && checkoutConcessionId) {
    await prisma.checkout_session_concessions.create({
      data: {
        id: checkoutConcessionId,
        checkout_session_id: checkoutId,
        complex_id: complexes.complexSalvadorId,
        item_type: 'PRODUCT',
        item_id: products.productPipocaId,
        quantity: 1,
        unit_price: 22,
        total_price: 22,
      },
    });
  }
}

async function main() {
  const company = await ensureCompany();
  const demoPeerCompany = await ensureDemoPeerCompany();
  await ensureTaxLookups(company.id);
  await ensureFinanceLookups(company.id);
  const sales = await ensureSalesLookups(company.id);
  const operations = await ensureOperationsLookups(company.id);
  const catalog = await ensureCatalog(company.id);
  const showcaseCatalog = await ensureShowcaseCatalog(company.id);
  const complexes = await ensureComplexes(company.id, operations);
  await ensureSeats(complexes, operations);
  await ensureShowtimes(catalog, complexes, operations);
  await ensureShowcaseShowtimes(showcaseCatalog, complexes, operations);
  const products = await ensureProducts(company.id, complexes);
  const customer = await ensureCustomer(company.id);
  await resetMutableCheckouts();
  await ensurePendingCheckout(
    company.id,
    customer.id,
    sales,
    complexes,
    products,
  );
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutPaidDesktop,
    checkoutTicketId: ids.checkoutPaidDesktopTicket,
    checkoutConcessionId: ids.checkoutPaidDesktopConcession,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'B1',
    reservationUuid: FIXTURE.reservationPaidDesktop,
    includeConcession: true,
  });
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutFailedDesktop,
    checkoutTicketId: ids.checkoutFailedDesktopTicket,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'B2',
    reservationUuid: FIXTURE.reservationFailedDesktop,
    includeConcession: false,
  });
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutPaidMobile,
    checkoutTicketId: ids.checkoutPaidMobileTicket,
    checkoutConcessionId: ids.checkoutPaidMobileConcession,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'C1',
    reservationUuid: FIXTURE.reservationPaidMobile,
    includeConcession: true,
  });
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutFailedMobile,
    checkoutTicketId: ids.checkoutFailedMobileTicket,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'C2',
    reservationUuid: FIXTURE.reservationFailedMobile,
    includeConcession: false,
  });
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutPixDesktop,
    checkoutTicketId: ids.checkoutPixDesktopTicket,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'D1',
    reservationUuid: FIXTURE.reservationPixDesktop,
    includeConcession: false,
  });
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutPixMobile,
    checkoutTicketId: ids.checkoutPixMobileTicket,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'D2',
    reservationUuid: FIXTURE.reservationPixMobile,
    includeConcession: false,
  });
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutStockDesktop,
    checkoutTicketId: ids.checkoutStockDesktopTicket,
    checkoutConcessionId: ids.checkoutStockDesktopConcession,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'E1',
    reservationUuid: FIXTURE.reservationStockDesktop,
    includeConcession: true,
  });
  await ensureReadyCheckoutFixture({
    checkoutId: ids.checkoutStockMobile,
    checkoutTicketId: ids.checkoutStockMobileTicket,
    checkoutConcessionId: ids.checkoutStockMobileConcession,
    companyId: company.id,
    customerId: customer.id,
    sales,
    complexes,
    products,
    operations,
    seatCode: 'E2',
    reservationUuid: FIXTURE.reservationStockMobile,
    includeConcession: true,
  });

  console.log('✅ Seed web E2E concluído.');
  console.log(
    JSON.stringify(
      {
        tenantSlug: FIXTURE.tenantSlug,
        demoPeerTenantSlug: demoPeerCompany.tenant_slug,
        citySlug: FIXTURE.citySlug,
        movieSlug: FIXTURE.movieSlug,
        showcaseMovies: SHOWCASE_MOVIES.map((movie) => ({
          slug: movie.slug,
          title: movie.brazilTitle,
        })),
        checkoutId: ids.checkout,
        paidCheckoutDesktopId: ids.checkoutPaidDesktop,
        failedCheckoutDesktopId: ids.checkoutFailedDesktop,
        paidCheckoutMobileId: ids.checkoutPaidMobile,
        failedCheckoutMobileId: ids.checkoutFailedMobile,
        pixCheckoutDesktopId: ids.checkoutPixDesktop,
        pixCheckoutMobileId: ids.checkoutPixMobile,
        stockCheckoutDesktopId: ids.checkoutStockDesktop,
        stockCheckoutMobileId: ids.checkoutStockMobile,
        customerEmail: FIXTURE.customerEmail,
        customerPassword: FIXTURE.customerPassword,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('❌ Erro ao seedar web E2E:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
