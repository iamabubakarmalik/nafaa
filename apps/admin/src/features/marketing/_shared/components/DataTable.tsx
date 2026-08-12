import { cn } from '../../../../lib/cn';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  empty?: React.ReactNode;
}

export function DataTable<T>({
  columns, data, loading, onRowClick, keyExtractor, empty,
}: Props<T>) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return <div className="rounded-2xl border border-neutral-200 bg-white">{empty ?? (
      <div className="p-8 text-center text-sm text-neutral-500">No data available.</div>
    )}</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500',
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition',
                  onRowClick && 'cursor-pointer hover:bg-neutral-50',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={String(c.key)}
                    className={cn('px-4 py-3 text-sm text-neutral-700', c.className)}
                  >
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
