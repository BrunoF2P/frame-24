"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookingStoreState {
  selectedSessionId: string | null;
  selectedSeatIds: string[];
  ticketQuantities: Record<string, number>;
  courtesyCode: string;
  fiscalCpf: string;
  productQuantities: Record<string, number>;
  holdExpiresAt: number | null;
  setSession: (sessionId: string) => void;
  toggleSeat: (seatId: string) => void;
  setTicketQuantity: (ticketCode: string, quantity: number) => void;
  setCourtesyCode: (value: string) => void;
  setFiscalCpf: (value: string) => void;
  setProductQuantity: (productId: string, quantity: number) => void;
  startHold: (minutes: number) => void;
  clearBooking: () => void;
}

export const useBookingStore = create<BookingStoreState>()(
  persist(
    (set, get) => ({
      selectedSessionId: null,
      selectedSeatIds: [],
      ticketQuantities: {},
      courtesyCode: "",
      fiscalCpf: "",
      productQuantities: {},
      holdExpiresAt: null,
      setSession: (sessionId) =>
        set((state) =>
          state.selectedSessionId === sessionId
            ? state
            : {
                selectedSessionId: sessionId,
                selectedSeatIds: [],
                ticketQuantities: {},
                courtesyCode: "",
                fiscalCpf: "",
                productQuantities: {},
                holdExpiresAt: null,
              },
        ),
      toggleSeat: (seatId) =>
        set((state) => ({
          selectedSeatIds: state.selectedSeatIds.includes(seatId)
            ? state.selectedSeatIds.filter((id) => id !== seatId)
            : [...state.selectedSeatIds, seatId],
        })),
      setTicketQuantity: (ticketCode, quantity) =>
        set((state) => ({
          ticketQuantities: {
            ...state.ticketQuantities,
            [ticketCode]: Math.max(0, quantity),
          },
        })),
      setCourtesyCode: (value) => set({ courtesyCode: value }),
      setFiscalCpf: (value) => set({ fiscalCpf: value }),
      setProductQuantity: (productId, quantity) =>
        set((state) => ({
          productQuantities: {
            ...state.productQuantities,
            [productId]: Math.max(0, quantity),
          },
        })),
      startHold: (minutes) =>
        set({
          holdExpiresAt: Date.now() + minutes * 60 * 1000,
        }),
      clearBooking: () => {
        const { selectedSessionId } = get();

        set({
          selectedSessionId,
          selectedSeatIds: [],
          ticketQuantities: {},
          courtesyCode: "",
          fiscalCpf: "",
          productQuantities: {},
          holdExpiresAt: null,
        });
      },
    }),
    { name: "frame24-booking" },
  ),
);
