/**
 * @nafaa/core: pure business logic shared by apps/web and apps/mobile.
 * TypeScript only; no React, DOM or React Native imports. Each area lives in
 * its own folder, exported here as a namespace and as a subpath
 * (import { orderOptions } from '@nafaa/core/online-store').
 */

export * as inventory from './inventory';
export * as onlineStore from './online-store';
export * as pos from './pos';
export * as customers from './customers';
export * as bookings from './bookings';
export * as finance from './finance';
export * as restaurant from './restaurant';
export * as bakery from './bakery';
