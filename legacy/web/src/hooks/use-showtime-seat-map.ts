"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { publicApi } from "@/lib/api-client";
import { mapSeatStatus, mapSeatKind } from "@/lib/storefront/api";
import { getSeatsSocket } from "@/lib/socket-client";
import type { SeatNode, SeatStatus } from "@/types/storefront";

interface RawSeat {
  id: string;
  seat_code: string;
  row_code: string;
  column_number: number;
  status: string;
  reserved: boolean;
  seat_type_name?: string;
  additional_value?: number | string;
  accessible?: boolean | null;
  seat_kind?: string;
  pricing_zone?: string;
}

interface ShowtimeDetails {
  showtime_id: string;
  room_id: string;
  available_seats: number;
  sold_seats: number;
  base_ticket_price: number;
  seats: RawSeat[];
  movie?: { title: string; poster_url?: string };
  cinema?: { id: string; name: string; timezone?: string | null };
  room?: { name: string };
  start_time?: string;
}

const toSeatNode = (seat: RawSeat): SeatNode => ({
  id: seat.id,
  label: seat.seat_code || `${seat.row_code}${seat.column_number}`,
  row: seat.row_code,
  number: seat.column_number,
  status: mapSeatStatus(seat),
  seatKind: mapSeatKind(seat),
  isAccessible: Boolean(seat.accessible),
  pricingZone: (seat.pricing_zone as SeatNode["pricingZone"]) ?? (Number(seat.additional_value || 0) > 0 ? "premium" : "standard"),
  premium: Number(seat.additional_value || 0) > 0,
});

export const useShowtimeSeatMap = (showtimeId: string) => {
  const queryClient = useQueryClient();
  const [liveOverrides, setLiveOverrides] = useState<Map<string, SeatStatus>>(new Map());
  const socketRef = useRef<ReturnType<typeof getSeatsSocket> extends Promise<infer T> ? T : never>(null);
  const joinedRef = useRef(false);

  const query = useQuery<ShowtimeDetails>({
    queryKey: ["seats-map", showtimeId],
    queryFn: async () => {
      const response = await publicApi.publicControllerGetSeatsMapV1({ id: showtimeId });
      return response.data as unknown as ShowtimeDetails;
    },
    enabled: !!showtimeId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5 * 1000,
    refetchInterval: 30 * 1000,
  });

  const seats: SeatNode[] = useMemo(() => {
    const raw = query.data?.seats ?? [];
    return raw.map((seat) => {
      const base = toSeatNode(seat);
      const override = liveOverrides.get(seat.id);
      if (override) {
        return { ...base, status: override };
      }
      return base;
    });
  }, [query.data?.seats, liveOverrides]);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      const sock = await getSeatsSocket();
      if (cancelled) return;
      socketRef.current = sock as typeof socketRef.current;

      const onSeatsReserved = (data: { seat_ids: string[] }) => {
        setLiveOverrides((prev) => {
          const next = new Map(prev);
          for (const id of data.seat_ids) {
            if (!next.has(id) || next.get(id) !== "sold") {
              next.set(id, "held");
            }
          }
          return next;
        });
      };

      const onSeatsReleased = (data: { seat_ids: string[] }) => {
        setLiveOverrides((prev) => {
          const next = new Map(prev);
          for (const id of data.seat_ids) {
            if (next.get(id) === "held") {
              next.delete(id);
            }
          }
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ["seats-map", showtimeId] });
      };

      const onSeatsConfirmed = (data: { seat_ids: string[] }) => {
        setLiveOverrides((prev) => {
          const next = new Map(prev);
          for (const id of data.seat_ids) {
            next.set(id, "sold");
          }
          return next;
        });
      };

      sock.on("seats-reserved", onSeatsReserved);
      sock.on("seats-released", onSeatsReleased);
      sock.on("seats-confirmed", onSeatsConfirmed);

      if (sock.connected && !joinedRef.current) {
        joinedRef.current = true;
        sock.emit("join-showtime", { showtime_id: showtimeId });
      } else if (!sock.connected) {
        sock.connect();
        const onConnect = () => {
          if (!joinedRef.current) {
            joinedRef.current = true;
            sock.emit("join-showtime", { showtime_id: showtimeId });
          }
        };
        sock.on("connect", onConnect);
      }

      return () => {
        sock.off("seats-reserved", onSeatsReserved);
        sock.off("seats-released", onSeatsReleased);
        sock.off("seats-confirmed", onSeatsConfirmed);
      };
    };

    const cleanup = connect();

    return () => {
      cancelled = true;
      joinedRef.current = false;
      void cleanup.then((fn) => fn?.());
    };
  }, [showtimeId, queryClient]);

  const refetch = useCallback(() => {
    setLiveOverrides(new Map());
    queryClient.invalidateQueries({ queryKey: ["seats-map", showtimeId] });
  }, [queryClient, showtimeId]);

  return {
    seats,
    showtimeDetails: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
    baseTicketPrice: query.data?.base_ticket_price ?? 0,
    availableSeats: query.data?.available_seats ?? 0,
    soldSeats: query.data?.sold_seats ?? 0,
  };
};
