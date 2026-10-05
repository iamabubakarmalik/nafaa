/** Dukaan ko is order se kitna milna hai — bahar ka rider apni delivery khud rakhe to wo minus */
export const shopDue = (o: { total: unknown; metadata?: unknown }) =>
  Math.max(0, Number(o.total) - Number(((o.metadata ?? {}) as any).riderDelivery ?? 0));
