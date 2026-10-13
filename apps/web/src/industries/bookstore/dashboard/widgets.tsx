/** Bookstore-only dashboard widgets. */

import { AlertCircle, BookMarked, BookOpen, Building2, ClipboardList, GraduationCap, Palette, PenTool, School, Sparkles, Star } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useBookstoreOps } from './useBookstoreOps';

const fmtDay = (iso: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(iso));

/** Bookstore headline numbers, offered next to the common ones. */
export const bookstoreKpis: KpiDef[] = [
  {
    id: 'bookstore-rentals', label: 'Kiraye ki kitaben', icon: BookMarked, tone: 'info',
    useValue: () => {
      const { rentals, loading } = useBookstoreOps();
      return {
        loading, to: '/bookstore/rentals', value: rentals.active, alert: rentals.overdue > 0,
        hint: rentals.overdue > 0 ? `${rentals.overdue} late!` : 'sab waqt par',
      };
    },
  },
  {
    id: 'bookstore-school-lists', label: 'School lists', icon: ClipboardList, tone: 'brand',
    useValue: () => {
      const { school, loading } = useBookstoreOps();
      return { loading, to: '/bookstore/school-lists', value: school.lists, hint: `${school.schools} schools` };
    },
  },
  {
    id: 'bookstore-books', label: 'Kitaben', icon: BookOpen, tone: 'neutral',
    useValue: () => {
      const { totals, catalog, loading } = useBookstoreOps();
      return { loading, to: '/bookstore/books', value: totals.books, hint: catalog.newArrivals ? `${catalog.newArrivals} nayi aayi` : `${totals.stationery} stationery` };
    },
  },
];

export function useBookstoreAttention(): AttentionItem[] {
  const { rentals, school } = useBookstoreOps();
  const items: AttentionItem[] = [];
  if (rentals.weekLate) items.push({ icon: AlertCircle, level: 'danger', text: `${rentals.weekLate} kitaben ek hafte se zyada late hain — customer ko call karein`, to: '/bookstore/rentals?filter=overdue', cta: 'Rentals dekhein' });
  else if (rentals.overdue) items.push({ icon: BookMarked, level: 'warning', text: `${rentals.overdue} kiraye ki kitaben wapas nahi aayin`, to: '/bookstore/rentals?filter=overdue', cta: 'Rentals dekhein' });
  if (school.lists) items.push({ icon: ClipboardList, level: 'info', text: `${school.lists} school list chaalu hain — set ke liye stock check kar lein`, to: '/bookstore/school-lists', cta: 'Lists dekhein' });
  else if (school.schools) items.push({ icon: School, level: 'neutral', text: 'Koi school list chaalu nahi — season se pehle list bana lein, set jaldi bikte hain', to: '/bookstore/school-lists', cta: 'List banayein' });
  return items;
}

export function BookstoreRentals() {
  const { rentals } = useBookstoreOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Late kitaben"
      icon={BookMarked}
      description={rentals.fine > 0 && !costHidden ? `${cost(rentals.fine)} jurmana banta hai` : `${rentals.active} kiraye par · ${rentals.overdue} late`}
      to="/bookstore/rentals"
      flush
    >
      <RowList empty="Koi kitaab late nahi" emptyIcon={BookMarked}>
        {rentals.list.slice(0, 6).map((r) => (
          <ListRow
            key={r.id}
            leading={<IconBubble icon={BookMarked} tone={r.daysLate >= 7 ? 'danger' : 'warning'} />}
            title={r.customerName || 'Customer'}
            meta={<span><span className="font-mono">{r.rentalNumber}</span>{r.customerPhone ? ` · ${r.customerPhone}` : ''} · return {fmtDay(r.dueDate)}</span>}
            value={<Badge variant={r.daysLate >= 7 ? 'danger' : 'warning'} size="xs">{r.daysLate} din late</Badge>}
            valueHint={r.fine > 0 ? <span className="text-slate-500">{cost(r.fine)}</span> : undefined}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function BookstoreSchool() {
  const { school } = useBookstoreOps();
  const top = school.grades.slice(0, 8);
  const max = Math.max(...top.map((g) => g.count), 1);
  return (
    <WidgetCard title="School aur textbooks" icon={GraduationCap} description={`${school.lists} list chaalu · ${school.schools} schools`} to="/bookstore/school-lists">
      {top.length === 0 ? (
        <EmptyHint icon={GraduationCap} text="Textbook par class (grade) likhein — yahan class ke hisaab se nazar aayega" />
      ) : (
        <ul className="space-y-2">
          {top.map((g) => (
            <li key={g.grade} className="flex items-center gap-3 text-[0.8125rem]">
              <span className="w-20 shrink-0 truncate text-slate-600">{g.grade}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(g.count / max) * 100}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-slate-900">{g.count}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function BookstoreCatalog() {
  const { totals, catalog, publishers } = useBookstoreOps();
  return (
    <WidgetCard title="Maal ki details" icon={BookOpen} description="Kitaben, stationery, art aur publishers" to="/bookstore/books">
      <div className="grid grid-cols-3 gap-2">
        <MetricTile icon={BookOpen} tone="brand" label="Kitaben" value={totals.books} to="/bookstore/books" />
        <MetricTile icon={PenTool} tone="info" label="Stationery" value={totals.stationery} to="/bookstore/stationery" />
        <MetricTile icon={Palette} tone="warning" label="Art" value={totals.artSupplies} to="/bookstore/art-supplies" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.75rem]">
        <Badge variant="success" size="xs"><Star className="h-3 w-3" /> {catalog.bestSellers} best seller</Badge>
        <Badge variant="info" size="xs"><Sparkles className="h-3 w-3" /> {catalog.newArrivals} nayi</Badge>
        <Badge variant="default" size="xs">{catalog.featuredBooks} featured</Badge>
      </div>
      {publishers.length > 0 && (
        <div className="-mx-4 mt-3 border-t border-slate-100 pt-1 sm:-mx-5">
          {publishers.slice(0, 4).map((p) => (
            <ListRow
              key={p.publisher!.id}
              icon={Building2}
              title={p.publisher!.name}
              meta={p.publisher!.country ?? undefined}
              value={p.count}
              valueHint={<span className="text-slate-500">kitaben</span>}
            />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
