import { useEffect, useState, useCallback, useRef } from "react";
import { getSeatsSocket, SeatsSocket } from "@/lib/socket-client";
import { differenceInSeconds } from "date-fns";

const RESERVATION_TIMEOUT_MINUTES = 5;

interface UseSeatReservationParams {
  showtimeId: string;
  companyId: string;
  tenantSlug?: string;
  user?: { id: string } | null;
}

interface ReservationState {
  reservationUuid: string | null;
  expiresAt: Date | null;
  reservedSeatIds: string[];
  timeRemaining: number;
  isReserving: boolean;
  error: string | null;
}

interface ReservationEventData {
  reservation_uuid: string;
  expires_at: string;
  seat_ids: string[];
  message?: string;
}

interface SeatsReleasedEventData {
  reservation_uuid: string;
  seat_ids: string[];
}

interface ErrorEventData {
  message: string;
}

function getInitialReservation(showtimeId: string): ReservationState {
  const defaultState: ReservationState = {
    reservationUuid: null,
    expiresAt: null,
    reservedSeatIds: [],
    timeRemaining: 0,
    isReserving: false,
    error: null,
  };

  if (typeof window === "undefined") {
    return defaultState;
  }

  const savedReservationKey = `seat-reservation-${showtimeId}`;
  const savedReservation = localStorage.getItem(savedReservationKey);

  if (!savedReservation) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(savedReservation) as {
      reservationUuid?: string;
      expiresAt?: string;
      reservedSeatIds?: string[];
    };

    if (!parsed.expiresAt) {
      localStorage.removeItem(savedReservationKey);
      return defaultState;
    }

    const expiresAt = new Date(parsed.expiresAt);
    const maxExpiresAt = new Date(Date.now() + RESERVATION_TIMEOUT_MINUTES * 60 * 1000);
    const effectiveExpiresAt = expiresAt > maxExpiresAt ? maxExpiresAt : expiresAt;
    const now = new Date();

    if (effectiveExpiresAt <= now) {
      localStorage.removeItem(savedReservationKey);
      return defaultState;
    }

    return {
      reservationUuid: parsed.reservationUuid ?? null,
      expiresAt: effectiveExpiresAt,
      reservedSeatIds: Array.isArray(parsed.reservedSeatIds)
        ? parsed.reservedSeatIds
        : [],
      timeRemaining: 0,
      isReserving: false,
      error: null,
    };
  } catch {
    localStorage.removeItem(savedReservationKey);
    return defaultState;
  }
}

export const useSeatReservation = ({
  showtimeId,
  companyId,
  tenantSlug,
  user,
}: UseSeatReservationParams) => {
  const [socket, setSocket] = useState<SeatsSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reservation, setReservation] = useState<ReservationState>(() =>
    getInitialReservation(showtimeId),
  );

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const releasedOnExpiryRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !companyId) {
      return;
    }

    let cancelled = false;

    const connectSocket = async () => {
      const seatsSocket = await getSeatsSocket();
      if (cancelled) {
        return;
      }

      setSocket(seatsSocket);

      const joinPayload = {
        showtime_id: showtimeId,
        user_id: user?.id,
        tenant_slug: tenantSlug,
      };

      if (seatsSocket.connected) {
        setConnected(true);
        seatsSocket.emit("join-showtime", joinPayload);
      } else {
        seatsSocket.connect();
      }

      const onConnect = () => {
        setConnected(true);
        seatsSocket.emit("join-showtime", joinPayload);
      };

      const onDisconnect = () => {
        setConnected(false);
      };

      seatsSocket.on("connect", onConnect);
      seatsSocket.on("disconnect", onDisconnect);

      return () => {
        seatsSocket.off("connect", onConnect);
        seatsSocket.off("disconnect", onDisconnect);
      };
    };

    let cleanup: (() => void) | undefined;
    void connectSocket().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [companyId, showtimeId, tenantSlug, user?.id]);

  const isInitialized = true;

  useEffect(() => {
    if (!reservation.expiresAt) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const secondsRemaining = differenceInSeconds(
        reservation.expiresAt!,
        now,
      );

      if (secondsRemaining <= 0) {
        if (socket && reservation.reservationUuid && !releasedOnExpiryRef.current) {
          releasedOnExpiryRef.current = true;
          socket.emit("release-seats", {
            reservation_uuid: reservation.reservationUuid,
            company_id: companyId,
            tenant_slug: tenantSlug,
          });
        }

        setReservation({
          reservationUuid: null,
          expiresAt: null,
          reservedSeatIds: [],
          timeRemaining: 0,
          isReserving: false,
          error: null,
        });
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        const savedReservationKey = `seat-reservation-${showtimeId}`;
        localStorage.removeItem(savedReservationKey);
      } else {
        setReservation((prev) => ({
          ...prev,
          timeRemaining: secondsRemaining,
        }));
      }
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [
    reservation.expiresAt,
    reservation.reservationUuid,
    socket,
    companyId,
    tenantSlug,
    showtimeId,
  ]);

  useEffect(() => {
    if (!socket) return;

    const onReservationSuccess = (data: ReservationEventData) => {
      const backendExpiresAt = new Date(data.expires_at);
      const maxExpiresAt = new Date(Date.now() + RESERVATION_TIMEOUT_MINUTES * 60 * 1000);
      const effectiveExpiresAt = backendExpiresAt > maxExpiresAt ? maxExpiresAt : backendExpiresAt;

      const reservationData: ReservationState = {
        reservationUuid: data.reservation_uuid,
        expiresAt: effectiveExpiresAt,
        reservedSeatIds: data.seat_ids,
        timeRemaining: 0,
        isReserving: false,
        error: null,
      };

      releasedOnExpiryRef.current = false;
      setReservation(reservationData);

      const savedReservationKey = `seat-reservation-${showtimeId}`;
      localStorage.setItem(
        savedReservationKey,
        JSON.stringify({
          reservationUuid: data.reservation_uuid,
          expiresAt: effectiveExpiresAt.toISOString(),
          reservedSeatIds: data.seat_ids,
        }),
      );
    };

    const onReservationError = (data: ErrorEventData) => {
      setReservation((prev) => ({
        ...prev,
        isReserving: false,
        error: data.message,
      }));
    };

    const onReservationConfirmed = () => {
      setReservation({
        reservationUuid: null,
        expiresAt: null,
        reservedSeatIds: [],
        timeRemaining: 0,
        isReserving: false,
        error: null,
      });
      const savedReservationKey = `seat-reservation-${showtimeId}`;
      localStorage.removeItem(savedReservationKey);
    };

    const onConfirmationError = (data: ErrorEventData) => {
      setReservation((prev) => ({
        ...prev,
        error: data.message,
      }));
    };

    const onReservationRestored = (data: ReservationEventData) => {
      const backendExpiresAt = new Date(data.expires_at);
      const maxExpiresAt = new Date(Date.now() + RESERVATION_TIMEOUT_MINUTES * 60 * 1000);
      const effectiveExpiresAt = backendExpiresAt > maxExpiresAt ? maxExpiresAt : backendExpiresAt;
      const now = new Date();

      if (effectiveExpiresAt <= now) {
        if (socket) {
          socket.emit("release-seats", {
            reservation_uuid: data.reservation_uuid,
            company_id: companyId,
            tenant_slug: tenantSlug,
          });
        }
        return;
      }

      const reservationData: ReservationState = {
        reservationUuid: data.reservation_uuid,
        expiresAt: effectiveExpiresAt,
        reservedSeatIds: data.seat_ids,
        timeRemaining: 0,
        isReserving: false,
        error: null,
      };

      releasedOnExpiryRef.current = false;
      setReservation(reservationData);

      const savedReservationKey = `seat-reservation-${showtimeId}`;
      localStorage.setItem(
        savedReservationKey,
        JSON.stringify({
          reservationUuid: data.reservation_uuid,
          expiresAt: effectiveExpiresAt.toISOString(),
          reservedSeatIds: data.seat_ids,
        }),
      );
    };

    const onSeatsReleased = (data: SeatsReleasedEventData) => {
      setReservation((prev) => {
        if (prev.reservationUuid === data.reservation_uuid) {
          const savedReservationKey = `seat-reservation-${showtimeId}`;
          localStorage.removeItem(savedReservationKey);
          return {
            reservationUuid: null,
            expiresAt: null,
            reservedSeatIds: [],
            timeRemaining: 0,
            isReserving: false,
            error: null,
          };
        }
        return prev;
      });
    };

    socket.on("reservation-success", onReservationSuccess);
    socket.on("reservation-error", onReservationError);
    socket.on("reservation-confirmed", onReservationConfirmed);
    socket.on("confirmation-error", onConfirmationError);
    socket.on("reservation-restored", onReservationRestored);
    socket.on("seats-released", onSeatsReleased);

    return () => {
      socket.off("reservation-success", onReservationSuccess);
      socket.off("reservation-error", onReservationError);
      socket.off("reservation-confirmed", onReservationConfirmed);
      socket.off("confirmation-error", onConfirmationError);
      socket.off("reservation-restored", onReservationRestored);
      socket.off("seats-released", onSeatsReleased);
    };
  }, [socket, showtimeId, companyId, tenantSlug]);

  const reserveSeats = useCallback(
    (seatIds: string[]) => {
      if (!socket || !connected) {
        setReservation((prev) => ({
          ...prev,
          error: "Socket não conectado. Tente novamente.",
        }));
        return;
      }

      releasedOnExpiryRef.current = false;
      setReservation((prev) => ({
        ...prev,
        isReserving: true,
        error: null,
      }));

      socket.emit("reserve-seats", {
        showtime_id: showtimeId,
        seat_ids: seatIds,
        company_id: companyId,
        user_id: user?.id,
        tenant_slug: tenantSlug,
      });
    },
    [socket, connected, showtimeId, companyId, tenantSlug, user?.id],
  );

  const releaseSeats = useCallback(() => {
    if (!socket || !connected || !reservation.reservationUuid) return;

    socket.emit("release-seats", {
      reservation_uuid: reservation.reservationUuid,
      company_id: companyId,
      tenant_slug: tenantSlug,
    });

    setReservation({
      reservationUuid: null,
      expiresAt: null,
      reservedSeatIds: [],
      timeRemaining: 0,
      isReserving: false,
      error: null,
    });

    const savedReservationKey = `seat-reservation-${showtimeId}`;
    localStorage.removeItem(savedReservationKey);
  }, [socket, connected, reservation.reservationUuid, companyId, tenantSlug, showtimeId]);

  const confirmReservation = useCallback(
    (saleId: string) => {
      if (!socket || !connected || !reservation.reservationUuid) return;

      socket.emit("confirm-reservation", {
        reservation_uuid: reservation.reservationUuid,
        sale_id: saleId,
        tenant_slug: tenantSlug,
      });
    },
    [socket, connected, reservation.reservationUuid, tenantSlug],
  );

  return {
    connected,
    reservation,
    reserveSeats,
    releaseSeats,
    confirmReservation,
    isInitialized,
  };
};
