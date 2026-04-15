import type {
  Cinema,
  City,
  ConcessionProduct,
  LoyaltyState,
  MovieSummary,
  PurchaseHistoryItem,
  SeatNode,
  SessionGroup,
} from "@/types/storefront";

const buildSeats = (): SeatNode[] => {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const seats: SeatNode[] = [];

  rows.forEach((row, rowIndex) => {
    for (let number = 1; number <= 12; number += 1) {
      const id = `${row}${number}`;
      const isWheelchair = row === "D" && number === 1;
      const isCompanion = row === "D" && number === 2;
      const isReducedMobility = row === "D" && number === 3;
      const isGuideDog = row === "D" && number === 4;
      const isPremiumMotion = rowIndex >= 5 && number >= 4 && number <= 6;
      const isCoupleLeft = row === "B" && [7, 9].includes(number);
      const isCoupleRight = row === "B" && [8, 10].includes(number);
      const isObese = row === "A" && number === 1;
      const isVipRecliner = rowIndex >= 6 && number >= 7 && number <= 10;
      const isLounge = row === "H" && number >= 11;
      const sold = (row === "C" && number >= 5 && number <= 8) || (row === "G" && number === 6);
      const held = row === "E" && number >= 7 && number <= 8;
      const seatKind = isWheelchair
        ? "wheelchair"
        : isCompanion
          ? "companion"
          : isReducedMobility
            ? "reduced_mobility"
            : isGuideDog
              ? "guide_dog"
              : isPremiumMotion
                ? "premium_motion"
                : isCoupleLeft
                  ? "couple_left"
                  : isCoupleRight
                    ? "couple_right"
                    : isObese
                      ? "obese"
                      : isVipRecliner
                        ? "vip_recliner"
                        : isLounge
                          ? "lounge"
                          : "standard";

      seats.push({
        id,
        label: `${row}${number}`,
        row,
        number,
        status: sold ? "sold" : held ? "held" : "available",
        seatKind,
        tags: [seatKind !== "standard" ? seatKind : "standard"],
        isAccessible: ["wheelchair", "reduced_mobility", "guide_dog"].includes(seatKind),
        isCompanionOnly: seatKind === "companion",
        pricingZone:
          seatKind === "premium_motion"
            ? "premium"
            : seatKind === "vip_recliner" || seatKind === "lounge"
              ? "vip"
              : "standard",
        premium: ["premium_motion", "vip_recliner", "lounge"].includes(seatKind),
      });
    }
  });

  return seats;
};

export const cities: City[] = [
  {
    id: "city-salvador",
    slug: "salvador",
    name: "Salvador",
    state: "BA",
    heroLabel: "Estreias, em cartaz e independentes em uma busca só.",
    intro: "Compare sessões por bairro, formato e lotação em tempo real.",
    timezone: "America/Bahia",
  },
  {
    id: "city-sao-paulo",
    slug: "sao-paulo",
    name: "São Paulo",
    state: "SP",
    heroLabel: "Da Paulista ao Morumbi: compare horários, salas e benefícios.",
    intro: "Descoberta orientada por cidade para quem decide o rolê em minutos.",
    timezone: "America/Sao_Paulo",
  },
  {
    id: "city-recife",
    slug: "recife",
    name: "Recife",
    state: "PE",
    heroLabel: "Sessões de shopping e independentes lado a lado.",
    intro: "Frame24 reduz atrito em mobile e deixa a decisão mais clara.",
    timezone: "America/Recife",
  },
];

export const loyaltyState: LoyaltyState = {
  tier: "Premiere",
  points: 1820,
  perks: ["Troca flexível até 2h antes", "Retirada rápida de snacks", "1 upgrade de sala por mês"],
};

export const movies: MovieSummary[] = [
  {
    id: "movie-echoes",
    slug: "ecos-da-mare",
    title: "Ecos da Maré",
    originalTitle: "Echoes of the Tide",
    tagline: "Suspense costeiro com fotografia de incêndio e neblina.",
    synopsis:
      "Uma restauradora volta a Salvador para vender o cinema do avô e acaba encontrando rolos inéditos que reescrevem a história da família.",
    runtimeMinutes: 128,
    ageRating: "14",
    genres: ["Drama", "Mistério"],
    formats: ["Dolby Atmos", "Laser"],
    exhibitionMode: "ambos",
    ancineRating: "ANCINE 4.7",
    status: "em-cartaz",
    recommendationScore: 96,
    citySlugs: ["salvador", "sao-paulo"],
    cast: ["Maeve Jinkings", "Ícaro Silva", "Malu Galli"],
    posterUrl:
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80",
    backdropUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/ScMzIvxBSi4",
    editorialNote: "Para quem quer um filme de conversa longa depois da sessão.",
  },
  {
    id: "movie-orbita",
    slug: "orbita-24",
    title: "Órbita 24",
    originalTitle: "Orbit 24",
    tagline: "Sci-fi brasileiro em IMAX, feito para sala cheia.",
    synopsis:
      "Uma engenheira de satélites descobre um padrão vindo da órbita geoestacionária e precisa convencer o país inteiro antes que a transmissão desapareça.",
    runtimeMinutes: 141,
    ageRating: "12",
    genres: ["Ficção Científica", "Aventura"],
    formats: ["IMAX", "4DX", "Dolby Atmos"],
    exhibitionMode: "ambos",
    ancineRating: "ANCINE 4.5",
    status: "em-cartaz",
    recommendationScore: 93,
    citySlugs: ["salvador", "sao-paulo", "recife"],
    cast: ["Alice Carvalho", "Bruno Gagliasso", "Renata Sorrah"],
    posterUrl:
      "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=900&q=80",
    backdropUrl:
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/sY1S34973zA",
    editorialNote: "A recomendação certa para decidir com grupo grande.",
  },
  {
    id: "movie-noite",
    slug: "noite-de-vidro",
    title: "Noite de Vidro",
    originalTitle: "Glass Night",
    tagline: "Thriller urbano com montagem nervosa e assentos VIP disputados.",
    synopsis:
      "Durante uma pane elétrica em um shopping, cinco desconhecidos ficam presos entre corredores e descobrem que estão ligados por um mesmo crime.",
    runtimeMinutes: 109,
    ageRating: "16",
    genres: ["Thriller", "Crime"],
    formats: ["VIP", "Laser"],
    exhibitionMode: "legendado",
    ancineRating: "ANCINE 4.2",
    status: "em-cartaz",
    recommendationScore: 88,
    citySlugs: ["salvador", "recife"],
    cast: ["Débora Nascimento", "Jesuíta Barbosa", "Babu Santana"],
    posterUrl:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
    backdropUrl:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
    editorialNote: "Escolha segura para quem quer tensão sem enrolação.",
  },
  {
    id: "movie-jardim",
    slug: "jardim-das-luzes",
    title: "Jardim das Luzes",
    originalTitle: "Garden of Lights",
    tagline: "Romance adulto com textura de revista de cinema.",
    synopsis:
      "Uma curadora e um projecionista se reencontram durante a reabertura de um cinema de rua e precisam decidir se o passado ainda merece replay.",
    runtimeMinutes: 117,
    ageRating: "12",
    genres: ["Romance", "Drama"],
    formats: ["VIP", "Dolby Atmos"],
    exhibitionMode: "dublado",
    ancineRating: "ANCINE 4.8",
    status: "em-breve",
    recommendationScore: 91,
    citySlugs: ["salvador", "sao-paulo"],
    cast: ["Sophie Charlotte", "Humberto Carrão", "Grace Passô"],
    releaseDate: "2026-05-02",
    posterUrl:
      "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=900&q=80",
    backdropUrl:
      "https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/tgbNymZ7vqY",
    editorialNote: "Um título de prestígio para cinéfilos recorrentes.",
  },
];

export const cinemas: Cinema[] = [
  {
    id: "cin-salvador-barra",
    slug: "cinemark-salvador-barra",
    name: "Cinemark Barra",
    network: "Cinemark",
    citySlug: "salvador",
    neighborhood: "Barra",
    address: "Av. Centenário, 2992 - Barra, Salvador",
    features: ["Retirada de snacks", "Assentos reclináveis", "Ingresso digital"],
    formats: ["IMAX", "Dolby Atmos", "Laser"],
    accessibility: ["Rampa", "Assento PCD", "Audiodescrição sob demanda"],
    loyaltyBlurb: "Combine vantagens de rede e histórico unificado no Frame24.",
  },
  {
    id: "cin-salvador-rio",
    slug: "cinepolis-salvador-norte",
    name: "Cinépolis Salvador Norte",
    network: "Cinépolis",
    citySlug: "salvador",
    neighborhood: "São Cristóvão",
    address: "Travessa São Cristóvão, 13 - Salvador Norte Shopping",
    features: ["Sala VIP", "Retirada de snacks", "Estacionamento integrado"],
    formats: ["VIP", "4DX", "Laser"],
    accessibility: ["Elevador", "Legenda descritiva", "Banheiro acessível"],
    loyaltyBlurb: "Premium sem atrito: escolha formato, assento e horário em menos passos.",
  },
  {
    id: "cin-salvador-vitoria",
    slug: "cinema-do-corredor-vitoria",
    name: "Cinema do Corredor",
    network: "Independente",
    citySlug: "salvador",
    neighborhood: "Vitória",
    address: "Rua do Passeio, 42 - Vitória, Salvador",
    features: ["Curadoria de catálogo", "Debates pós-filme", "Programação especial"],
    formats: ["Laser"],
    accessibility: ["Rampa", "Sessões inclusivas"],
    loyaltyBlurb: "O lado editorial do Frame24 encontra o circuito independente.",
  },
  {
    id: "cin-sp-paulista",
    slug: "uci-paulista",
    name: "UCI Paulista",
    network: "UCI",
    citySlug: "sao-paulo",
    neighborhood: "Bela Vista",
    address: "Av. Paulista, 900 - Bela Vista, São Paulo",
    features: ["Retirada de snacks", "Lounge VIP"],
    formats: ["IMAX", "XPlus", "Dolby Atmos"],
    accessibility: ["Assento PCD", "Banheiro acessível"],
    loyaltyBlurb: "Ideal para comparar sessão premium e tempo de deslocamento.",
  },
  {
    id: "cin-recife-riomar",
    slug: "cinemark-riomar-recife",
    name: "Cinemark RioMar Recife",
    network: "Cinemark",
    citySlug: "recife",
    neighborhood: "Pina",
    address: "Av. República do Líbano, 251 - Pina, Recife",
    features: ["Retirada de snacks", "Poltronas VIP", "Acesso digital"],
    formats: ["IMAX", "VIP", "Laser"],
    accessibility: ["Elevador", "Assento PCD", "Sessão amigável"],
    loyaltyBlurb: "Compra unificada, loyalty centralizado e mapa de assentos claro.",
  },
];

export const sessions: SessionGroup[] = [
  {
    id: "session-echoes-salvador-1",
    citySlug: "salvador",
    movieId: "movie-echoes",
    cinemaId: "cin-salvador-vitoria",
    date: "2026-04-14",
    time: "19:10",
    room: "Sala 02",
    language: "Dublado",
    subtitle: "Sem legenda",
    format: "Laser",
    occupancy: "medium",
    priceFrom: 29.9,
    seats: buildSeats(),
  },
  {
    id: "session-echoes-salvador-2",
    citySlug: "salvador",
    movieId: "movie-echoes",
    cinemaId: "cin-salvador-barra",
    date: "2026-04-14",
    time: "21:25",
    room: "Sala Atmos",
    language: "Original",
    subtitle: "PT-BR",
    format: "Dolby Atmos",
    occupancy: "high",
    priceFrom: 41.9,
    seats: buildSeats(),
  },
  {
    id: "session-echoes-salvador-3",
    citySlug: "salvador",
    movieId: "movie-echoes",
    cinemaId: "cin-salvador-barra",
    date: "2026-04-14",
    time: "16:40",
    room: "Sala Atmos",
    language: "Dublado",
    subtitle: "Sem legenda",
    format: "Dolby Atmos",
    occupancy: "low",
    priceFrom: 34.9,
    seats: buildSeats(),
  },
  {
    id: "session-echoes-salvador-4",
    citySlug: "salvador",
    movieId: "movie-echoes",
    cinemaId: "cin-salvador-vitoria",
    date: "2026-04-14",
    time: "20:35",
    room: "Sala 01",
    language: "Original",
    subtitle: "PT-BR",
    format: "Laser",
    occupancy: "medium",
    priceFrom: 31.9,
    seats: buildSeats(),
  },
  {
    id: "session-echoes-salvador-5",
    citySlug: "salvador",
    movieId: "movie-echoes",
    cinemaId: "cin-salvador-rio",
    date: "2026-04-14",
    time: "22:10",
    room: "VIP 4",
    language: "Original",
    subtitle: "PT-BR",
    format: "VIP",
    occupancy: "high",
    priceFrom: 49.9,
    seats: buildSeats(),
  },
  {
    id: "session-orbita-salvador-1",
    citySlug: "salvador",
    movieId: "movie-orbita",
    cinemaId: "cin-salvador-barra",
    date: "2026-04-14",
    time: "20:00",
    room: "IMAX 1",
    language: "Dublado",
    subtitle: "Sem legenda",
    format: "IMAX",
    occupancy: "high",
    priceFrom: 47.9,
    seats: buildSeats(),
  },
  {
    id: "session-orbita-salvador-2",
    citySlug: "salvador",
    movieId: "movie-orbita",
    cinemaId: "cin-salvador-rio",
    date: "2026-04-14",
    time: "22:30",
    room: "4DX 3",
    language: "Original",
    subtitle: "PT-BR",
    format: "4DX",
    occupancy: "medium",
    priceFrom: 53.9,
    seats: buildSeats(),
  },
  {
    id: "session-orbita-salvador-3",
    citySlug: "salvador",
    movieId: "movie-orbita",
    cinemaId: "cin-salvador-barra",
    date: "2026-04-14",
    time: "17:50",
    room: "IMAX 1",
    language: "Original",
    subtitle: "PT-BR",
    format: "IMAX",
    occupancy: "medium",
    priceFrom: 44.9,
    seats: buildSeats(),
  },
  {
    id: "session-orbita-salvador-4",
    citySlug: "salvador",
    movieId: "movie-orbita",
    cinemaId: "cin-salvador-rio",
    date: "2026-04-14",
    time: "19:40",
    room: "4DX 3",
    language: "Dublado",
    subtitle: "Sem legenda",
    format: "4DX",
    occupancy: "high",
    priceFrom: 55.9,
    seats: buildSeats(),
  },
  {
    id: "session-noite-salvador-1",
    citySlug: "salvador",
    movieId: "movie-noite",
    cinemaId: "cin-salvador-rio",
    date: "2026-04-14",
    time: "18:45",
    room: "VIP 5",
    language: "Original",
    subtitle: "PT-BR",
    format: "VIP",
    occupancy: "low",
    priceFrom: 45.0,
    seats: buildSeats(),
  },
  {
    id: "session-orbita-sp-1",
    citySlug: "sao-paulo",
    movieId: "movie-orbita",
    cinemaId: "cin-sp-paulista",
    date: "2026-04-14",
    time: "20:20",
    room: "XPlus 4",
    language: "Original",
    subtitle: "PT-BR",
    format: "XPlus",
    occupancy: "medium",
    priceFrom: 48.5,
    seats: buildSeats(),
  },
  {
    id: "session-orbita-recife-1",
    citySlug: "recife",
    movieId: "movie-orbita",
    cinemaId: "cin-recife-riomar",
    date: "2026-04-14",
    time: "19:35",
    room: "IMAX 2",
    language: "Dublado",
    subtitle: "Sem legenda",
    format: "IMAX",
    occupancy: "medium",
    priceFrom: 46.0,
    seats: buildSeats(),
  },
];

export const concessions: ConcessionProduct[] = [
  {
    id: "snack-popcorn",
    name: "Combo Premiere",
    price: 34.9,
    description: "Pipoca grande, bebida 700ml e refill rápido no pickup.",
    imageUrl:
      "https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "snack-wine",
    name: "Taça & Trufa",
    price: 28.0,
    description: "Kit premium para sessões VIP com vinho e chocolate.",
    imageUrl:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "snack-family",
    name: "Combo Família",
    price: 42.9,
    description: "2 bebidas, pipoca extra grande e mini bites compartilháveis.",
    imageUrl: null,
  },
];

export const purchaseHistory: PurchaseHistoryItem[] = [
  {
    id: "order-21984",
    movieTitle: "Cidade das Sombras",
    cityName: "Salvador",
    cinemaName: "Cinemark Barra",
    showtimeLabel: "11 abr • 20:40 • IMAX",
    amount: 89.8,
    status: "used",
  },
  {
    id: "order-21912",
    movieTitle: "Mapas para Partir",
    cityName: "São Paulo",
    cinemaName: "UCI Paulista",
    showtimeLabel: "03 abr • 21:10 • Atmos",
    amount: 54.5,
    status: "refundable",
  },
];
