import { create } from 'zustand';
import type { MarketplaceCustomer } from '../types/customer.types';

interface CustomerAuthState {
  customer: MarketplaceCustomer | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (customer: MarketplaceCustomer, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>((set) => ({
  customer: null,
  token: null,
  isAuthenticated: false,
  setSession: (customer, token) => {
    localStorage.setItem('marketplace_token', token);
    localStorage.setItem('marketplace_customer', JSON.stringify(customer));
    set({ customer, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('marketplace_token');
    localStorage.removeItem('marketplace_customer');
    set({ customer: null, token: null, isAuthenticated: false });
  },
  initialize: () => {
    const token = localStorage.getItem('marketplace_token');
    const rawCustomer = localStorage.getItem('marketplace_customer');
    if (token && rawCustomer) {
      try {
        set({ customer: JSON.parse(rawCustomer), token, isAuthenticated: true });
      } catch {}
    }
  },
}));
