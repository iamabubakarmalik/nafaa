import { create } from 'zustand';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { MarketplaceCustomer } from '@/types';

interface AuthState {
  customer: MarketplaceCustomer | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setSession: (
    customer: MarketplaceCustomer,
    tokens: { accessToken: string; refreshToken: string },
  ) => void;
  updateCustomer: (partial: Partial<MarketplaceCustomer>) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  customer: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setSession: (customer, tokens) => {
    // Store under BOTH keys for backwards-compat
    localStorage.setItem('marketplace_access_token', tokens.accessToken);
    localStorage.setItem('marketplace_token', tokens.accessToken);
    localStorage.setItem('marketplace_refresh_token', tokens.refreshToken);
    localStorage.setItem('marketplace_customer', JSON.stringify(customer));
    set({
      customer,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isInitialized: true,
    });
    try {
      connectSocket();
    } catch {}
  },

  updateCustomer: (partial) =>
    set((s) => {
      if (!s.customer) return {};
      const merged = { ...s.customer, ...partial };
      localStorage.setItem('marketplace_customer', JSON.stringify(merged));
      return { customer: merged };
    }),

  logout: () => {
    localStorage.removeItem('marketplace_access_token');
    localStorage.removeItem('marketplace_token');
    localStorage.removeItem('marketplace_refresh_token');
    localStorage.removeItem('marketplace_customer');
    try {
      disconnectSocket();
    } catch {}
    set({
      customer: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  initialize: () => {
    const token =
      localStorage.getItem('marketplace_access_token') ||
      localStorage.getItem('marketplace_token');
    const refresh = localStorage.getItem('marketplace_refresh_token');
    const raw = localStorage.getItem('marketplace_customer');

    if (token && raw) {
      try {
        set({
          customer: JSON.parse(raw),
          token,
          refreshToken: refresh,
          isAuthenticated: true,
          isInitialized: true,
        });
        try {
          connectSocket();
        } catch {}
        return;
      } catch {}
    }
    set({ isInitialized: true });
  },
}));
