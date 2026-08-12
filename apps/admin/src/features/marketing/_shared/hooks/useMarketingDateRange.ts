import { useState } from 'react';

export function useMarketingDateRange(defaultDays = 30) {
  const to = new Date().toISOString().slice(0, 10);
  const f = new Date();
  f.setDate(f.getDate() - defaultDays);
  const from = f.toISOString().slice(0, 10);

  const [range, setRange] = useState<{ from?: string; to?: string }>({ from, to });

  return {
    from: range.from,
    to: range.to,
    setRange: (from?: string, to?: string) => setRange({ from, to }),
  };
}
