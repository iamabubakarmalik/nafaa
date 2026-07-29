import { cn } from '@/lib/cn';

export function NoiseTexture({ className, opacity = 0.03 }: { className?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      className={cn('absolute inset-0 pointer-events-none mix-blend-overlay', className)}
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
      }}
    />
  );
}
