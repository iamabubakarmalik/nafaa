export const formatPKR = (amount: number) => {
  if (!amount && amount !== 0) return 'Rs 0';
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(1)}K`;
  return `Rs ${Math.round(amount)}`;
};

export const formatPKRFull = (amount: number) => {
  if (!amount && amount !== 0) return 'Rs 0';
  return `Rs ${Math.round(amount).toLocaleString('en-PK')}`;
};

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(d);
};

export const formatTime = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit', minute: '2-digit',
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

export const formatNumber = (n: number) => {
  if (!n && n !== 0) return '0';
  return n.toLocaleString('en-PK');
};
