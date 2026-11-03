/** Date fields: a picked Date as YYYY-MM-DD in the device's calendar (birthdays, deadlines). */

export const keyOfDateLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
