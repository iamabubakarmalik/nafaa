import { cn } from '@/lib/cn';

export function GridBackground({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute inset-0 bg-grid mask-radial pointer-events-none',
        animate && 'animate-grid-move',
        className,
      )}
    />
  );
}
