import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backTo, actions }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {backTo && (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
