/**
 * Platform settings: key/value rows grouped by category (bank details,
 * branding, limits). Search and category filter run on the server; edits from
 * several pages are kept and saved together.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lightbulb, Plus, RotateCcw, Save, Settings as SettingsIcon, Tag } from 'lucide-react';
import { Button, FilterBar, FilterChip, FilterMenu, Input, PageHero, PageShell, SearchField, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSettingsApi } from '@/api/admin-settings.api';
import { ListCard, statusLabel, useListParams } from '@/ui';
import { errMsg, num, Pill } from '@/features/shared/kit';

export default function SettingsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [edited, setEdited] = useState<Record<string, string>>({});
  const list = useListParams({ category: 'ALL' });
  const category = list.filters.category;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-settings', category, list.debouncedSearch, list.page, list.limit],
    queryFn: () => adminSettingsApi.paged({ search: list.debouncedSearch || undefined, category: category === 'ALL' ? undefined : category, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.items ?? [];
  const cats = data?.stats.categories ?? [];
  const changes = Object.keys(edited).length;

  const save = useMutation({
    mutationFn: () => adminSettingsApi.bulk(Object.entries(edited).map(([key, value]) => ({ key, value }))),
    onSuccess: () => { toast.success('Settings saved'); setEdited({}); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const seed = useMutation({
    mutationFn: adminSettingsApi.seedDefaults,
    onSuccess: () => { toast.success('Default settings added'); qc.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const none = !!data && data.stats.total === 0;

  return (
    <PageShell>
      <PageHero
        title="Settings"
        chip={changes ? `${changes} unsaved` : undefined}
        busy={isFetching || save.isPending}
        loading={isLoading}
        actions={
          <>
            {none && <button type="button" className={heroButton} onClick={() => seed.mutate()} disabled={seed.isPending}><Plus className="h-4 w-4" /> Add defaults</button>}
            {changes > 0 && <button type="button" className={heroButton} onClick={() => setEdited({})}><RotateCcw className="h-4 w-4" /> Undo changes</button>}
            <button type="button" className={heroPrimaryButton} onClick={() => save.mutate()} disabled={!changes || save.isPending}><Save className="h-4 w-4" /> Save{changes ? ` ${changes}` : ''}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={data ? [{ label: 'Settings', value: num(data.stats.total) }, { label: 'Categories', value: num(cats.length) }, { label: 'Unsaved', value: num(changes) }] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search key, description or value" />}
        chips={category !== 'ALL' ? [<FilterChip key="c" onRemove={() => list.setFilter('category', 'ALL')}>{statusLabel(category)}</FilterChip>] : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Category" value={category} active={category !== 'ALL'} onChange={(v) => list.setFilter('category', v)} align="right"
          options={[{ value: 'ALL', label: 'All categories' }, ...cats.map((c) => ({ value: c.category, label: `${statusLabel(c.category)} (${c.count})` }))]} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<SettingsIcon className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load settings' : none ? 'No settings yet' : 'No setting matches'}
        emptyText={error ? 'Try again in a moment.' : none ? 'Add the default settings to get started.' : 'Try another search or clear the filters.'}
        emptyAction={none ? <Button size="sm" variant="secondary" loading={seed.isPending} onClick={() => seed.mutate()}>Add default settings</Button> : undefined}
        page={list.page} limit={list.limit} total={data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <div className="divide-y divide-slate-100">
          {rows.map((s) => {
            const changed = edited[s.key] !== undefined && edited[s.key] !== s.value;
            return (
              <div key={s.id} className="grid items-center gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[1fr_2fr]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-[0.75rem] font-semibold text-slate-800">{s.key}</span>
                    <Pill>{statusLabel(s.category)}</Pill>
                    {s.isPublic && <Pill tone="indigo">Public</Pill>}
                  </div>
                  {s.description && <div className="mt-0.5 text-[0.75rem] text-slate-500">{s.description}</div>}
                </div>
                <Input aria-label={s.key} className={changed ? 'border-amber-400 bg-amber-50 font-mono' : 'font-mono'} value={edited[s.key] ?? s.value}
                  onChange={(e) => setEdited((prev) => (e.target.value === s.value ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== s.key)) : { ...prev, [s.key]: e.target.value }))} />
              </div>
            );
          })}
        </div>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Settings"
          description="Platform-wide values such as bank details and branding."
          flowTitle="Editing a setting"
          flow={[
            { label: 'Find it', hint: 'Search or category', icon: Tag, color: '#4f46e5' },
            { label: 'Edit value', hint: 'Turns amber', icon: SettingsIcon, color: '#d97706' },
            { label: 'Save', hint: 'All changes at once', icon: Save, color: '#059669' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Find a setting', text: 'Search by key, description or value, or open one category.' },
            { icon: SettingsIcon, color: '#d97706', title: 'Edit', text: 'Changed values turn amber. Your edits are kept when you change page or filter.' },
            { icon: Save, color: '#059669', title: 'Save', text: 'Save writes every changed value in one go. Undo changes clears them.' },
          ]}
          tips={['"Public" settings can be read by the website and apps.', 'Take care: some values are used by billing and sign-in.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
