/**
 * Turns "from" and "to" business-day keys (yyyy-MM-dd) from an admin list
 * filter into a UTC range. Days follow the business time zone (Pakistan),
 * not the server's UTC clock.
 */

import { addDaysTz, startOfDayTz } from '../../common/helpers/business-time.helper';

const KEY = /^\d{4}-\d{2}-\d{2}$/;

export function dayRange(from?: string, to?: string): { gte?: Date; lt?: Date } | undefined {
  const range: { gte?: Date; lt?: Date } = {};
  if (from && KEY.test(from)) range.gte = startOfDayTz(new Date(`${from}T12:00:00+05:00`));
  if (to && KEY.test(to)) range.lt = addDaysTz(startOfDayTz(new Date(`${to}T12:00:00+05:00`)), 1);
  return range.gte || range.lt ? range : undefined;
}
