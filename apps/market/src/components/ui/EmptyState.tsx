/** Friendly empty or error block with an icon, a line of help and an action. */
import type { ReactNode } from 'react';

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600 [&_svg]:h-8 [&_svg]:w-8">{icon}</div>
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {body && <p className="mt-1 max-w-sm text-sm text-gray-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
