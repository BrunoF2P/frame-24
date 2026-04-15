"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CityStoreState {
  activeCitySlug: string;
  setActiveCity: (citySlug: string) => void;
}

export const useCityStore = create<CityStoreState>()(
  persist(
    (set) => ({
      activeCitySlug: "salvador",
      setActiveCity: (citySlug) => set({ activeCitySlug: citySlug }),
    }),
    { name: "frame24-city" },
  ),
);
