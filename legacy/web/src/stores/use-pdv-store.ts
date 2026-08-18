"use client";

import { create } from "zustand";

export interface CartTicket {
  showtimeId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  seatId: string;
  seatLabel: string;
  rowCode: string;
  price: number;
}

export interface CartProduct {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export type PdvStep =
  | "session"
  | "showtime"
  | "tickets"
  | "products"
  | "payment"
  | "confirmation";

interface PdvStoreState {
  posSessionId: string | null;
  posSessionNumber: string | null;
  cinemaComplexId: string | null;
  selectedShowtimeId: string | null;
  cartTickets: CartTicket[];
  cartProducts: CartProduct[];
  selectedPaymentMethodId: string | null;
  cashReceived: number;
  step: PdvStep;
  lastSaleId: string | null;
  lastSaleReference: string | null;
  setPosSession: (id: string, number_: string, complexId: string) => void;
  setSelectedShowtime: (showtimeId: string) => void;
  addCartTicket: (ticket: CartTicket) => void;
  removeCartTicket: (seatId: string) => void;
  clearCartTickets: () => void;
  setCartProduct: (productId: string, name: string, price: number, qty: number) => void;
  removeCartProduct: (productId: string) => void;
  clearCartProducts: () => void;
  setPaymentMethod: (methodId: string) => void;
  setCashReceived: (amount: number) => void;
  setStep: (step: PdvStep) => void;
  setLastSale: (saleId: string, reference: string) => void;
  resetSale: () => void;
  resetAll: () => void;
  closePosSession: () => void;
}

export const usePdvStore = create<PdvStoreState>()((set) => ({
  posSessionId: null,
  posSessionNumber: null,
  cinemaComplexId: null,
  selectedShowtimeId: null,
  cartTickets: [],
  cartProducts: [],
  selectedPaymentMethodId: null,
  cashReceived: 0,
  step: "session",
  lastSaleId: null,
  lastSaleReference: null,

  setPosSession: (id, number_, complexId) =>
    set({
      posSessionId: id,
      posSessionNumber: number_,
      cinemaComplexId: complexId,
      selectedShowtimeId: null,
      cartTickets: [],
      cartProducts: [],
      step: "showtime",
    }),

  setSelectedShowtime: (showtimeId) =>
    set({ selectedShowtimeId: showtimeId, cartTickets: [], step: "tickets" }),

  addCartTicket: (ticket) =>
    set((state) => {
      const filtered = state.cartTickets.filter((t) => t.seatId !== ticket.seatId);
      return { cartTickets: [...filtered, ticket] };
    }),

  removeCartTicket: (seatId) =>
    set((state) => ({
      cartTickets: state.cartTickets.filter((t) => t.seatId !== seatId),
    })),

  clearCartTickets: () => set({ cartTickets: [] }),

  setCartProduct: (productId, name, price, qty) =>
    set((state) => {
      if (qty <= 0) {
        return { cartProducts: state.cartProducts.filter((p) => p.productId !== productId) };
      }
      const filtered = state.cartProducts.filter((p) => p.productId !== productId);
      return { cartProducts: [...filtered, { productId, productName: name, unitPrice: price, quantity: qty }] };
    }),

  removeCartProduct: (productId) =>
    set((state) => ({
      cartProducts: state.cartProducts.filter((p) => p.productId !== productId),
    })),

  clearCartProducts: () => set({ cartProducts: [] }),

  setPaymentMethod: (methodId) => set({ selectedPaymentMethodId: methodId }),

  setCashReceived: (amount) => set({ cashReceived: amount }),

  setStep: (step) => set({ step }),

  setLastSale: (saleId, reference) =>
    set({ lastSaleId: saleId, lastSaleReference: reference }),

  resetSale: () =>
    set({
      selectedShowtimeId: null,
      cartTickets: [],
      cartProducts: [],
      selectedPaymentMethodId: null,
      cashReceived: 0,
      step: "showtime",
      lastSaleId: null,
      lastSaleReference: null,
    }),

  resetAll: () =>
    set({
      posSessionId: null,
      posSessionNumber: null,
      cinemaComplexId: null,
      selectedShowtimeId: null,
      cartTickets: [],
      cartProducts: [],
      selectedPaymentMethodId: null,
      cashReceived: 0,
      step: "session",
      lastSaleId: null,
      lastSaleReference: null,
    }),

  closePosSession: () =>
    set({
      posSessionId: null,
      posSessionNumber: null,
      cinemaComplexId: null,
      selectedShowtimeId: null,
      cartTickets: [],
      cartProducts: [],
      selectedPaymentMethodId: null,
      cashReceived: 0,
      step: "session",
      lastSaleId: null,
      lastSaleReference: null,
    }),
}));
