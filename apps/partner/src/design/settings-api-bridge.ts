/**
 * Stand-in for the merchant settings API.
 *
 * apps/web/src/core/lib/business-day.ts imports it for a hook the partner
 * portal never calls. Only the pure date helpers of that file are used.
 */

export const settingsApi = {
  get: async () => ({ settings: { businessDayStartHour: 0 } }),
};
