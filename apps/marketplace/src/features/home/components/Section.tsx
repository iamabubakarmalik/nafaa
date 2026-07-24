import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  seeAllLink?: string;
  seeAllLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, subtitle, icon, seeAllLink, seeAllLabel = 'See all', children, className }: SectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-black text-content flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs md:text-sm text-content-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="shrink-0 text-xs md:text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
          >
            {seeAllLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
