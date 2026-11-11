/**
 * Feature keys as grouped checkboxes (Core, Business, Growth, Advanced and,
 * separately, the add-on features). Used by the plan editor, the add-on
 * editor and the shop's extra features in Shop 360.
 */

import { useQuery } from '@tanstack/react-query';
import { Checkbox, Skeleton } from '@/design-system/components';
import { adminBillingCatalogApi, type FeatureDef, type FeatureGroup } from '@/api/admin-billing-catalog.api';
import { cn } from '@/lib/cn';

export const FEATURE_GROUPS: FeatureGroup[] = ['Core', 'Business', 'Growth', 'Advanced'];

/** The feature catalog from the API (changes only with a server release). */
export function useFeatureCatalog() {
  return useQuery({ queryKey: ['admin', 'billing', 'features'], queryFn: adminBillingCatalogApi.features, staleTime: 60 * 60_000 });
}

export function FeatureChecklist({ value, onChange, groups = FEATURE_GROUPS, disabled, locked, catalog, columns = 3 }: {
  value: string[];
  onChange: (next: string[]) => void;
  groups?: FeatureGroup[];
  disabled?: boolean;
  /** Keys shown ticked and greyed out (already given by something else, e.g. the plan). */
  locked?: string[];
  /** Pass the list when the caller already has it; otherwise it is loaded. */
  catalog?: FeatureDef[];
  columns?: 2 | 3;
}) {
  const q = useFeatureCatalog();
  const features = catalog ?? q.data?.features;
  if (!features) return <Skeleton className="h-40 rounded-2xl" />;

  const toggle = (key: string, on: boolean) => onChange(on ? [...new Set([...value, key])] : value.filter((k) => k !== key));
  const setGroup = (keys: string[], on: boolean) => onChange(on ? [...new Set([...value, ...keys])] : value.filter((k) => !keys.includes(k)));

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = features.filter((f) => f.group === g);
        if (!items.length) return null;
        const keys = items.map((f) => f.key);
        const all = keys.every((k) => value.includes(k) || locked?.includes(k));
        return (
          <section key={g}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-[0.8125rem] font-semibold text-slate-900">{g === 'Add-on' ? 'Add-on features' : g}</h4>
              {!disabled && (
                <button type="button" className="text-[0.75rem] font-medium text-brand-700 hover:underline" onClick={() => setGroup(keys, !all)}>
                  {all ? 'Clear all' : 'Tick all'}
                </button>
              )}
            </div>
            <div className={cn('grid grid-cols-1 gap-2', columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')}>
              {items.map((f) => {
                const isLocked = !!locked?.includes(f.key);
                return (
                  <Checkbox key={f.key} label={f.label} description={isLocked ? 'Already included' : f.hint}
                    checked={isLocked || value.includes(f.key)} disabled={disabled || isLocked}
                    onChange={(e) => toggle(f.key, e.target.checked)} />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** "12 features" with the add-on ones counted apart. */
export function featureSummary(keys: string[], features: FeatureDef[] | undefined) {
  if (!features) return `${keys.length} features`;
  const addOn = new Set(features.filter((f) => f.group === 'Add-on').map((f) => f.key));
  const core = keys.filter((k) => !addOn.has(k)).length;
  const extra = keys.filter((k) => addOn.has(k)).length;
  return `${core} feature${core === 1 ? '' : 's'}${extra ? ` + ${extra} add-on feature${extra === 1 ? '' : 's'}` : ''}`;
}
