/**
 * Stand-in for the merchant settings API.
 *
 * apps/web/src/core/lib/business-day.ts imports it for a hook the admin panel
 * never calls (admin works in calendar days). Only the pure date helpers of
 * that file are used here.
 */

export const settingsApi = {
  get: async () => ({ settings: { businessDayStartHour: 0 } }),
};
