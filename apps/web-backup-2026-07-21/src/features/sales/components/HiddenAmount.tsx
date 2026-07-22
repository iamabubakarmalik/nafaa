import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface Props {
  value: string;
  hidden: boolean;
  className?: string;
}

export function HiddenAmount({ value, hidden, className = '' }: Props) {
  const [reveal, setReveal] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!hidden) return <span className={className}>{value}</span>;

  const handleEnter = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setReveal(true);
  };

  const handleLeave = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setReveal(false), 150);
  };

  const handleTap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReveal(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setReveal(false), 2500);
  };

  return (
    <span
      className={`inline-flex items-center gap-1 cursor-pointer select-none transition ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleTap}
      title="Hover to reveal"
    >
      {reveal ? (
        <span>{value}</span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <span className="tracking-wider">••••••</span>
          <Eye className="h-3 w-3 opacity-40" />
        </span>
      )}
    </span>
  );
}
