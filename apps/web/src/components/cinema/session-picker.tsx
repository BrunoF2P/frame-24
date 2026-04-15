import type { Cinema, SessionGroup } from "@/types/storefront";
import { ShowtimeCardV2 } from "@/components/cinema/showtime-card-v2";

export const SessionPicker = ({
  citySlug,
  sessions,
  cinemas,
}: {
  citySlug: string;
  sessions: SessionGroup[];
  cinemas: Cinema[];
}) => (
  <ul className="space-y-4" aria-label="Sessões disponíveis">
    {sessions.map((session) => {
      const cinema = cinemas.find((item) => item.id === session.cinemaId);

      if (!cinema) {
        return null;
      }

      return (
        <li key={session.id}>
          <ShowtimeCardV2 cinema={cinema} citySlug={citySlug} session={session} />
        </li>
      );
    })}
  </ul>
);
