/**
 * How a tenant sells (Tenant.businessModels), as small chips. An empty list
 * means the owner signed up before the question existed or never answered;
 * the app treats such a business as retail.
 */

export const BUSINESS_MODELS = [
  { id: 'RETAIL', label: 'Retail', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { id: 'WHOLESALE', label: 'Wholesale', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  { id: 'DISTRIBUTION', label: 'Distribution', className: 'bg-orange-50 text-orange-700 ring-orange-200' },
  { id: 'ONLINE', label: 'Online', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
] as const;

export function BusinessModelChips({ models, onDark }: { models?: string[] | null; onDark?: boolean }) {
  const list = BUSINESS_MODELS.filter((m) => models?.includes(m.id));
  if (!list.length) {
    return <span className={`text-[11px] ${onDark ? 'text-white/60' : 'text-slate-400'}`}>Not answered (retail)</span>;
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {list.map((m) => (
        <span key={m.id} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${m.className}`}>
          {m.label}
        </span>
      ))}
    </span>
  );
}
