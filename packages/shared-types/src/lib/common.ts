export type AppId = string;

export const APP_NAME = 'Nafaa';
export const APP_DOMAIN = 'nafaa.pk';

export enum AppLanguage {
  EN = 'en',
  UR = 'ur'
}

export enum CurrencyCode {
  PKR = 'PKR',
  USD = 'USD'
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL'
}

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  STAFF = 'STAFF'
}
