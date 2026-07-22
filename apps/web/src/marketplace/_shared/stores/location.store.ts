import { create } from 'zustand';

interface LocationState {
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  setLocation: (lat: number, lng: number, address?: string, city?: string) => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  address: null,
  city: null,
  setLocation: (lat, lng, address, city) => set({ lat, lng, address: address ?? null, city: city ?? null }),
  clear: () => set({ lat: null, lng: null, address: null, city: null }),
}));
