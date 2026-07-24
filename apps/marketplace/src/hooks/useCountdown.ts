import { useEffect, useState } from 'react';

export function useCountdown(targetDate: string | Date | null | undefined) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const target = new Date(targetDate).getTime();
  const total = Math.max(0, target - now);

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);

  return { total, days, hours, minutes, seconds, expired: total <= 0 };
}

export function formatCountdown(cd: ReturnType<typeof useCountdown>): string {
  if (cd.expired) return 'Expired';
  if (cd.days > 0) return `${cd.days}d ${cd.hours}h ${cd.minutes}m`;
  if (cd.hours > 0) return `${cd.hours}h ${cd.minutes}m ${cd.seconds}s`;
  return `${cd.minutes}m ${cd.seconds}s`;
}
