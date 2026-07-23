import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  area: string | null;
  address: string | null;
  setLocation: (data: Partial<Omit<LocationState, 'setLocation' | 'clear' | 'requestGeolocation'>>) => void;
  clear: () => void;
  requestGeolocation: () => Promise<boolean>;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      lat: null,
      lng: null,
      city: null,
      area: null,
      address: null,
      setLocation: (data) => set(data as any),
      clear: () => set({ lat: null, lng: null, city: null, area: null, address: null }),
      requestGeolocation: async () => {
        if (!navigator.geolocation) return false;
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              resolve(true);
            },
            () => resolve(false),
            { timeout: 8000 },
          );
        });
      },
    }),
    { name: 'marketplace-location' },
  ),
);
