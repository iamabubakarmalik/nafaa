/**
 * Website → Menus (ARCH 13 screen 7): a tree editor for header, footer,
 * legal and mobile. Item kinds: entry link, URL, auto list and group header.
 * Reordering uses move/indent buttons (no drag library needed); the preview
 * shows the menu as the API resolves it after the last save.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CornerDownRight, CornerUpLeft, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  ALLOWED_ICONS, CMS_ENTRY_TYPES, ENTRY_TYPE_META, KNOWN_LOCALES, MENU_KEYS, MENU_KINDS, MENU_MAX_DEPTH, putMenuBodySchema,
  type CmsEntryType, type IconName, type MenuItem, type MenuItemResolved, type MenuKey,
} from '../contract/cms-contract';
import { PageHeader } from '../../_shared/components/PageHeader';
import { errorMessage, formatPkt, zodFieldErrors } from '../dashboard/shared/cms-http';
import { Card, Chip, EntryRefSelect, Field, HistoryList, Spinner, Tabs, Toggle, btn, inputCls, selectCls } from '../dashboard/shared/ui';
import { cn } from '../../../../lib/cn';
import { menusApi } from './menus.api';

const MENU_LABELS: Record<MenuKey, string> = { header: 'Header', footer: 'Footer', legal: 'Legal', mobile: 'Mobile' };
const KIND_LABELS: Record<MenuItem['kind'], string> = { entry: 'CMS page', url: 'URL', auto: 'Auto list', group: 'Group / column' };

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Tree helpers (immutable) ───

type Path = number[];

function updateList(items: MenuItem[], parent: Path, fn: (list: MenuItem[]) => MenuItem[]): MenuItem[] {
  if (!parent.length) return fn(items);
  const [head, ...rest] = parent;
  return items.map((it, i) => (i === head ? { ...it, children: updateList(it.children ?? [], rest, fn) } : it));
}

function depthOf(item: MenuItem): number {
  return 1 + Math.max(0, ...(item.children ?? []).map(depthOf));
}

export function MenusPage() {
  const qc = useQueryClient();
  const [key, setKey] = useState<MenuKey>('header');
  const [locale, setLocale] = useState<string>('en');
  const [tab, setTab] = useState<'edit' | 'history'>('edit');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const detail = useQuery({ queryKey: ['cms-menu', key, locale], queryFn: () => menusApi.get(key, locale), retry: false });

  useEffect(() => {
    setTitle(detail.data?.title ?? MENU_LABELS[key]);
    setItems(detail.data?.items ?? []);
    setDirty(false);
    setErrors([]);
  }, [detail.data, key, locale]);

  const resolvedById = useMemo(() => {
    const map = new Map<string, MenuItemResolved>();
    const walk = (list: MenuItemResolved[] | undefined) => list?.forEach((r) => { map.set(r.id, r); walk(r.children); });
    walk(detail.data?.resolved);
    return map;
  }, [detail.data]);

  const change = (next: MenuItem[]) => { setItems(next); setDirty(true); };

  const save = useMutation({
    mutationFn: () => {
      const parsed = putMenuBodySchema.safeParse({ locale, title, items });
      if (!parsed.success) throw { fieldErrors: Object.entries(zodFieldErrors(parsed.error)).map(([k, v]) => `${k}: ${v}`) };
      return menusApi.put(key, parsed.data);
    },
    onSuccess: () => {
      toast.success('Menu save ho gaya, site update ho rahi hai');
      setErrors([]);
      qc.invalidateQueries({ queryKey: ['cms-menu', key, locale] });
      qc.invalidateQueries({ queryKey: ['cms-history', 'MENU'] });
    },
    onError: (e: unknown) => {
      const fe = (e as { fieldErrors?: string[] }).fieldErrors;
      if (fe) { setErrors(fe); toast.error('Menu me ghaltiyan hain'); return; }
      toast.error(errorMessage(e));
    },
  });

  const switchMenu = (k: MenuKey) => {
    if (dirty && !confirm('Save nahi kiya. Phir bhi doosra menu kholein?')) return;
    setKey(k);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menus"
        subtitle="Website ke header, footer, legal aur mobile menu. Auto list me nayi industries khud aa jati hain."
        actions={
          <>
            <select className={selectCls} value={locale} onChange={(e) => setLocale(e.target.value)} aria-label="Zaban">
              {KNOWN_LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <button className={btn.primary} disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Save ho raha hai…' : 'Save'}
            </button>
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={MENU_KEYS.map((k) => ({ key: k, label: MENU_LABELS[k] }))} value={key} onChange={switchMenu} />
        <Tabs tabs={[{ key: 'edit', label: 'Edit' }, { key: 'history', label: 'History' }] as const} value={tab} onChange={setTab} />
      </div>

      {tab === 'history' ? (
        <Card title={`${MENU_LABELS[key]} history`}>
          <HistoryList subject="MENU" subjectKey={`${key}:${locale}`} />
        </Card>
      ) : detail.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card
            title="Items"
            actions={
              <>
                {detail.data?.updatedAt && <span className="text-xs text-neutral-500">Aakhri save: {formatPkt(detail.data.updatedAt)}</span>}
                <button className={btn.secondary} onClick={() => change([...items, { id: newId(), kind: 'entry' }])}>
                  <Plus className="h-4 w-4" /> Item
                </button>
              </>
            }
          >
            {detail.isError && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Ye menu abhi bana nahi ya load nahi hua ({errorMessage(detail.error)}). Save karne par ban jaye ga.</p>}
            <Field label="Menu ka naam" className="mb-4">
              <input className={inputCls} value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
            </Field>
            {errors.length > 0 && (
              <ul className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            )}
            {items.length ? (
              <ItemList items={items} root={items} parent={[]} onChange={change} resolvedById={resolvedById} />
            ) : (
              <p className="text-sm text-neutral-500">Menu khali hai.</p>
            )}
          </Card>
          <Card title="Preview (aakhri save)">
            <MenuPreview menuKey={key} items={detail.data?.resolved ?? []} />
            {dirty && <p className="mt-3 text-xs text-amber-700">Save karne ke baad preview update hoga.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}

function ItemList({ items, root, parent, onChange, resolvedById }: {
  items: MenuItem[]; root: MenuItem[]; parent: Path; onChange: (next: MenuItem[]) => void; resolvedById: Map<string, MenuItemResolved>;
}) {
  return (
    <ul className={cn('space-y-2', parent.length > 0 && 'ml-6 border-l border-neutral-200 pl-3')}>
      {items.map((item, i) => (
        <ItemRow key={item.id} item={item} index={i} siblings={items} root={root} parent={parent} onChange={onChange} resolvedById={resolvedById} />
      ))}
    </ul>
  );
}

function ItemRow({ item, index, siblings, root, parent, onChange, resolvedById }: {
  item: MenuItem; index: number; siblings: MenuItem[]; root: MenuItem[]; parent: Path; onChange: (next: MenuItem[]) => void; resolvedById: Map<string, MenuItemResolved>;
}) {
  const [open, setOpen] = useState(!item.label && !item.entryId && !item.url && !item.auto);
  const path = [...parent, index];
  const level = path.length;
  const resolved = resolvedById.get(item.id);

  const setItem = (p: Partial<MenuItem>) => onChange(updateList(root, parent, (list) => list.map((it, i) => (i === index ? { ...it, ...p } : it))));
  const remove = () => confirm('Ye item (aur iske andar wale) hatayein?') && onChange(updateList(root, parent, (list) => list.filter((_, i) => i !== index)));
  const move = (d: -1 | 1) =>
    onChange(updateList(root, parent, (list) => {
      const next = [...list];
      const j = index + d;
      if (j < 0 || j >= next.length) return list;
      [next[index], next[j]] = [next[j]!, next[index]!];
      return next;
    }));
  const indent = () => {
    if (index === 0) return;
    if (level + depthOf(item) > MENU_MAX_DEPTH) return toast.error(`Menu ${MENU_MAX_DEPTH} level se zyada gehra nahi ho sakta`);
    let next = updateList(root, parent, (list) => list.filter((_, i) => i !== index));
    next = updateList(next, [...parent, index - 1], (list) => [...list, item]);
    onChange(next);
  };
  const outdent = () => {
    if (!parent.length) return;
    const grand = parent.slice(0, -1);
    const parentIndex = parent[parent.length - 1]!;
    let next = updateList(root, parent, (list) => list.filter((_, i) => i !== index));
    next = updateList(next, grand, (list) => [...list.slice(0, parentIndex + 1), item, ...list.slice(parentIndex + 1)]);
    onChange(next);
  };
  const addChild = () => {
    if (level >= MENU_MAX_DEPTH) return toast.error(`Menu ${MENU_MAX_DEPTH} level se zyada gehra nahi ho sakta`);
    setItem({ children: [...(item.children ?? []), { id: newId(), kind: 'entry' }] });
  };

  const summary =
    item.label ||
    resolved?.label ||
    (item.kind === 'auto' && item.auto ? `${ENTRY_TYPE_META[item.auto.entryType].label} (${item.auto.limit})` : '') ||
    (item.kind === 'url' ? item.url : '') ||
    'Naya item';

  return (
    <li>
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center gap-2 px-3 py-2">
          <button className={btn.icon} onClick={() => setOpen(!open)} aria-label="Kholein">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">{summary}</span>
          <Chip tone={item.kind === 'auto' ? 'blue' : item.kind === 'group' ? 'amber' : 'neutral'}>{KIND_LABELS[item.kind]}</Chip>
          <button className={btn.icon} disabled={index === 0} onClick={() => move(-1)} aria-label="Upar"><ArrowUp className="h-4 w-4" /></button>
          <button className={btn.icon} disabled={index === siblings.length - 1} onClick={() => move(1)} aria-label="Neeche"><ArrowDown className="h-4 w-4" /></button>
          <button className={btn.icon} disabled={index === 0} onClick={indent} aria-label="Andar" title="Pichle item ke andar"><CornerDownRight className="h-4 w-4" /></button>
          <button className={btn.icon} disabled={!parent.length} onClick={outdent} aria-label="Bahar" title="Ek level bahar"><CornerUpLeft className="h-4 w-4" /></button>
          <button className={btn.icon} onClick={remove} aria-label="Hatayein"><Trash2 className="h-4 w-4" /></button>
        </div>
        {open && (
          <div className="grid gap-3 border-t border-neutral-100 p-3 sm:grid-cols-2">
            <Field label="Kism">
              <select
                className={selectCls + ' w-full'}
                value={item.kind}
                onChange={(e) => {
                  const kind = e.target.value as MenuItem['kind'];
                  setItem({ kind, entryId: undefined, url: undefined, auto: kind === 'auto' ? { entryType: 'INDUSTRY', limit: 12 } : undefined });
                }}
              >
                {MENU_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
            </Field>
            <Field label="Label" required={item.kind === 'url' || item.kind === 'group'} hint={item.kind === 'entry' ? 'Khali ho to page ka title' : undefined}>
              <input className={inputCls} value={item.label ?? ''} maxLength={80} onChange={(e) => setItem({ label: e.target.value || undefined })} />
            </Field>
            {item.kind === 'entry' && (
              <Field label="Page" required className="sm:col-span-2">
                <EntryRefSelect
                  value={item.entryId}
                  selected={resolved ? { title: resolved.label, path: resolved.href } : null}
                  onChange={(id) => setItem({ entryId: id ?? undefined })}
                />
              </Field>
            )}
            {item.kind === 'url' && (
              <Field label="URL" required className="sm:col-span-2" hint="/path, https://…, signup, demo ya whatsapp">
                <input className={inputCls} value={item.url ?? ''} onChange={(e) => setItem({ url: e.target.value || undefined })} />
              </Field>
            )}
            {item.kind === 'auto' && item.auto && (
              <>
                <Field label="Page type">
                  <select className={selectCls + ' w-full'} value={item.auto.entryType} onChange={(e) => setItem({ auto: { ...item.auto!, entryType: e.target.value as CmsEntryType } })}>
                    {CMS_ENTRY_TYPES.map((t) => <option key={t} value={t}>{ENTRY_TYPE_META[t].label}</option>)}
                  </select>
                </Field>
                <Field label="Group" hint="Industry group key (khali = sab)">
                  <input className={inputCls} value={item.auto.group ?? ''} onChange={(e) => setItem({ auto: { ...item.auto!, group: e.target.value || undefined } })} />
                </Field>
                <Field label="Kitne">
                  <input type="number" min={1} max={50} className={inputCls} value={item.auto.limit} onChange={(e) => setItem({ auto: { ...item.auto!, limit: Number(e.target.value) || 1 } })} />
                </Field>
                <Field label="Tarteeb">
                  <select className={selectCls + ' w-full'} value={item.auto.sort ?? 'order'} onChange={(e) => setItem({ auto: { ...item.auto!, sort: e.target.value as 'order' | 'title' } })}>
                    <option value="order">Sort order</option>
                    <option value="title">Title (A-Z)</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Toggle checked={!!item.auto.featured} onChange={(v) => setItem({ auto: { ...item.auto!, featured: v || undefined } })} label="Sirf featured pages" />
                </div>
              </>
            )}
            <Field label="Description" hint="Mega menu me label ke neeche">
              <input className={inputCls} value={item.description ?? ''} maxLength={160} onChange={(e) => setItem({ description: e.target.value || undefined })} />
            </Field>
            <Field label="Icon">
              <select className={selectCls + ' w-full'} value={item.icon ?? ''} onChange={(e) => setItem({ icon: (e.target.value || undefined) as IconName | undefined })}>
                <option value="">Koi nahi</option>
                {ALLOWED_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <button className={btn.ghost} disabled={level >= MENU_MAX_DEPTH} onClick={addChild}>
                <Plus className="h-4 w-4" /> Andar item
              </button>
            </div>
          </div>
        )}
      </div>
      {item.children && item.children.length > 0 && (
        <div className="mt-2">
          <ItemList items={item.children} root={root} parent={path} onChange={onChange} resolvedById={resolvedById} />
        </div>
      )}
    </li>
  );
}

/** Header renders as a mega menu (top items with columns); other menus as a nested list. */
function MenuPreview({ menuKey, items }: { menuKey: MenuKey; items: MenuItemResolved[] }) {
  const [active, setActive] = useState(0);
  if (!items.length) return <p className="text-sm text-neutral-500">Abhi kuch nahi.</p>;
  if (menuKey !== 'header') {
    const render = (list: MenuItemResolved[]) => (
      <ul className="space-y-1 pl-3">
        {list.map((r) => (
          <li key={r.id} className="text-sm">
            <span className="text-neutral-800">{r.label}</span> <span className="text-xs text-neutral-400">{r.href}</span>
            {r.external && <ExternalLink className="ml-1 inline h-3 w-3 text-neutral-400" />}
            {r.children?.length ? render(r.children) : null}
          </li>
        ))}
      </ul>
    );
    return render(items);
  }
  const current = items[active];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-neutral-200 pb-2">
        {items.map((r, i) => (
          <button key={r.id} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} className={cn('rounded-md px-2 py-1 text-sm', i === active ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-700')}>
            {r.label}
            {r.children?.length ? ' ▾' : ''}
          </button>
        ))}
      </div>
      {current?.children?.length ? (
        <div className="grid grid-cols-2 gap-4">
          {current.children.map((col) => (
            <div key={col.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{col.label}</p>
              {col.description && <p className="text-xs text-neutral-400">{col.description}</p>}
              <ul className="mt-1 space-y-0.5">
                {(col.children ?? []).map((l) => (
                  <li key={l.id} className="truncate text-sm text-neutral-800" title={l.href}>{l.label}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-neutral-500">{current?.href}</p>
      )}
    </div>
  );
}
