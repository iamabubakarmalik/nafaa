export const formatPKR = (amount: number) => {
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(1)}K`;
  return `Rs ${amount.toFixed(0)}`;
};

export const formatPKRFull = (amount: number) => {
  return `Rs ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

export const formatTime = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatRelative = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};
