import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  area: string | null;
  address: string | null;
  isDetecting: boolean;

  setLocation: (data: Partial<LocationState>) => void;
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
      isDetecting: false,

      setLocation: (data) => set(data),
      clear: () => set({ lat: null, lng: null, city: null, area: null, address: null }),

      requestGeolocation: async () => {
        if (!navigator.geolocation) return false;
        set({ isDetecting: true });
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              set({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                isDetecting: false,
              });

              // Reverse geocode (using OpenStreetMap Nominatim — free)
              try {
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14`,
                );
                const data = await res.json();
                const city = data.address?.city || data.address?.town || data.address?.village;
                const area = data.address?.suburb || data.address?.neighbourhood;
                set({
                  city: city || null,
                  area: area || null,
                  address: data.display_name || null,
                });
              } catch {}
              resolve(true);
            },
            () => {
              set({ isDetecting: false });
              resolve(false);
            },
            { timeout: 8000, enableHighAccuracy: true },
          );
        });
      },
    }),
    { name: 'marketplace-location' },
  ),
);
