import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const types = await prisma.media_types.findMany();
  console.log('Media Types:', types);

  const movieMedia = await prisma.movie_media.findMany({
    where: {
      movie_id: '251135865252745324',
    },
    include: {
      media_types: true,
    },
  });
  console.log('Movie Media for Matrix:', movieMedia);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
