import type { Cinema, MovieSummary, SessionGroup } from "@/types/storefront";
import { ShowtimeCardV2 } from "@/components/cinema/showtime-card-v2";

export const SessionPicker = ({
  citySlug,
  sessions,
  cinemas,
  movies,
}: {
  citySlug: string;
  sessions: SessionGroup[];
  cinemas: Cinema[];
  movies: MovieSummary[];
}) => (
  <ul className="space-y-4" aria-label="Sessões disponíveis">
    {sessions.map((session) => {
      const cinema = cinemas.find((item) => item.id === session.cinemaId);
      const movie = movies.find((item) => item.id === session.movieId);

      if (!cinema || !movie) {
        return null;
      }

      return (
        <li key={session.id}>
          <ShowtimeCardV2 cinema={cinema} citySlug={citySlug} movie={movie} session={session} />
        </li>
      );
    })}
  </ul>
);
