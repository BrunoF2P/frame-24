import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FiltersState {
  currentTenantSlug: string | null;
  selectedCity: string | null;
  selectedComplexId: string | null;
  selectedDate: Date | null;
  setTenantSlug: (tenantSlug: string) => void;
  setCity: (city: string | null) => void;
  setComplex: (complexId: string | null) => void;
  setDate: (date: Date | null) => void;
  clearFilters: () => void;
}

export const useFilters = create<FiltersState>()(
  persist(
    (set) => ({
      currentTenantSlug: null,
      selectedCity: null,
      selectedComplexId: null,
      selectedDate: null,
      setTenantSlug: (tenantSlug) =>
        set((state) => {
          if (state.currentTenantSlug === tenantSlug) {
            return state;
          }

          return {
            currentTenantSlug: tenantSlug,
            selectedCity: null,
            selectedComplexId: null,
            selectedDate: null,
          };
        }),
      setCity: (city) => set({ selectedCity: city }),
      setComplex: (complexId) => set({ selectedComplexId: complexId }),
      setDate: (date) => set({ selectedDate: date }),
      clearFilters: () =>
        set({
          currentTenantSlug: null,
          selectedCity: null,
          selectedComplexId: null,
          selectedDate: null,
        }),
    }),
    {
      name: "filters-storage",
    },
  ),
);
