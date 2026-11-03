/**
 * Settings → Appearance → Mobile app: options only the Nafaa mobile app
 * reads (tab bar, start screen, POS product size, Home blocks, animations,
 * haptics). Saved in the same appearance layers, so a choice here shows up
 * on the phone, and a choice made on the phone shows up here.
 */

import { ArrowDown, ArrowUp, Home, LayoutGrid, List, ShoppingCart } from 'lucide-react';
import { MOBILE_AVAILABLE_HOME_WIDGETS, MOBILE_DEFAULT_HOME_WIDGETS, type MobileHomeWidget, type MobileTabBar } from '@/design-system';
import { Toggle } from '@modules/organization/settings/components/SettingsBlocks';
import { cn } from '@core/lib/cn';
import { ChoiceGrid } from './ChoiceGrid';
import type { AppearanceEditor } from '../hooks/useAppearanceEditor';
import { msg, t } from '@core/i18n';

type PosGrid = 'list' | 'small' | 'medium' | 'large';

const WIDGET_LABELS: Record<MobileHomeWidget, string> = {
  'sales-today': msg('Aaj ki sale'),
  'quick-actions': msg('Jaldi ke kaam'),
  'cash-register': msg('Galla (cash)'),
  'khata-due': msg('Udhaar baqi'),
  'low-stock': msg('Kam stock'),
  'recent-sales': msg('Recent sales'),
  'top-products': msg('Sab se zyada bikne wale'),
  'online-orders': msg('Online orders'),
  'ai-insights': msg('Nafaa AI'),
  'sales-trend': msg('Sale ka rujhan'),
  'peak-hours': msg('Rush ka waqt'),
  'payment-mix': msg('Paisa kaise aaya'),
  'profit-loss': msg('Nafa aur nuqsan'),
  'money-map': msg('Paisa kahan hai'),
  'category-mix': msg('Category ke hisaab se'),
  'staff-sales': msg('Staff ki sale'),
  'weekday': msg('Hafte ke din'),
  'top-customers': msg('Behtareen customers'),
  'monthly': msg('6 mahine ka muqabla'),
  'expenses-month': msg('Expense kahan gaya'),
  'purchases': msg('Maal ki purchase'),
  'slow-movers': msg('Atka hua maal'),
  'day-report': msg('Din ka hisaab'),
  'kpis': msg('Numbers'),
};

/** A tiny phone with the chosen tab bar. */
function TabBarVisual({ style }: { style: MobileTabBar }) {
  return (
    <div className="flex h-20 justify-center pt-2">
      <div className="relative flex w-16 flex-col overflow-hidden rounded-t-lg border border-b-0 border-slate-300 bg-white">
        <div className="mx-1.5 mt-1.5 h-4 rounded bg-brand-500" />
        <div className="mx-1.5 mt-1 h-2 rounded bg-slate-200" />
        <div className={cn('absolute flex justify-around bg-white',
          style === 'floating' ? 'bottom-1.5 left-1 right-1 rounded-full py-1 shadow ring-1 ring-black/10' : 'bottom-0 left-0 right-0 border-t border-slate-200 py-1')}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <span className={cn('h-1.5 w-1.5 rounded-sm', i === 0 ? 'bg-brand-600' : 'bg-slate-400')} />
              {style !== 'icons' && <span className={cn('h-0.5 w-2 rounded', i === 0 ? 'bg-brand-600' : 'bg-slate-300')} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridVisual({ size }: { size: PosGrid }) {
  if (size === 'list') {
    return <div className="flex h-14 flex-col justify-center gap-1 px-4">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 rounded bg-white ring-1 ring-slate-200" />)}</div>;
  }
  const cols = size === 'small' ? 4 : size === 'medium' ? 3 : 2;
  return (
    <div className="grid h-14 content-center gap-1 px-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols * 2 }, (_, i) => <span key={i} className="h-4 rounded bg-white ring-1 ring-slate-200" />)}
    </div>
  );
}

export function MobileAppSettings({ ed }: { ed: AppearanceEditor }) {
  const a = ed.resolved;
  const widgets = (a.mobileHomeWidgets ?? MOBILE_DEFAULT_HOME_WIDGETS).filter((w) => MOBILE_AVAILABLE_HOME_WIDGETS.includes(w));
  const all = [...widgets, ...MOBILE_AVAILABLE_HOME_WIDGETS.filter((w) => !widgets.includes(w))];

  const move = (id: MobileHomeWidget, dir: -1 | 1) => {
    const list = [...widgets];
    const i = list.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    ed.set('mobileHomeWidgets', list);
  };
  const toggle = (id: MobileHomeWidget) =>
    ed.set('mobileHomeWidgets', widgets.includes(id) ? widgets.filter((w) => w !== id) : [...widgets, id]);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{t('Neeche ki tab bar')}</div>
        <ChoiceGrid<MobileTabBar> label={t('Tab bar')} value={a.mobileTabBar ?? 'floating'} onChange={(v) => ed.set('mobileTabBar', v)} options={[
          { value: 'floating', label: t('Floating'), description: t('Tairti hui, gol kone'), visual: <TabBarVisual style="floating" /> },
          { value: 'labels', label: t('Labels'), description: t('Poori chaurai, naam ke saath'), visual: <TabBarVisual style="labels" /> },
          { value: 'icons', label: t('Icons'), description: t('Sirf nishaan'), visual: <TabBarVisual style="icons" /> },
        ]} />
      </div>

      <div>
        <div className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{t('Header ka size')}</div>
        <ChoiceGrid<'compact' | 'standard' | 'large'> label={t('Header ka size')} value={a.mobileHeader ?? 'compact'} onChange={(v) => ed.set('mobileHeader', v)} options={[
          { value: 'compact', label: t('Chhota'), description: t('Patla header, zyada jagah kaam ko') },
          { value: 'standard', label: t('Darmiyana'), description: t('Bara title, scroll par chhota') },
          { value: 'large', label: t('Bara'), description: t('Bare number aur title') },
        ]} />
      </div>

      <div>
        <div className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{t('App khulte hi')}</div>
        <ChoiceGrid<'home' | 'pos'> label={t('Start screen')} columns={2} value={a.mobileStartScreen ?? 'home'} onChange={(v) => ed.set('mobileStartScreen', v)} options={[
          { value: 'home', label: t('Home'), description: t('Aaj ka hisaab pehle'), icon: <Home className="h-4 w-4" /> },
          { value: 'pos', label: t('POS counter'), description: t('Seedha bill banana'), icon: <ShoppingCart className="h-4 w-4" /> },
        ]} />
      </div>

      <div>
        <div className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{t('POS me products ka size')}</div>
        <ChoiceGrid<PosGrid> label={t('POS grid')} columns={4} value={a.mobilePosGrid ?? 'medium'} onChange={(v) => ed.set('mobilePosGrid', v)} options={[
          { value: 'list', label: t('List'), icon: <List className="h-4 w-4" />, visual: <GridVisual size="list" /> },
          { value: 'small', label: t('Chhote'), icon: <LayoutGrid className="h-4 w-4" />, visual: <GridVisual size="small" /> },
          { value: 'medium', label: t('Darmiyane'), icon: <LayoutGrid className="h-4 w-4" />, visual: <GridVisual size="medium" /> },
          { value: 'large', label: t('Bare'), icon: <LayoutGrid className="h-4 w-4" />, visual: <GridVisual size="large" /> },
        ]} />
      </div>

      <div>
        <div className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{t('Home par kya dikhe')}</div>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {all.map((id) => {
            const on = widgets.includes(id);
            const i = widgets.indexOf(id);
            return (
              <li key={id} className="flex items-center gap-2 px-3 py-2">
                <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-[0.84375rem] font-medium text-slate-800">
                  <input type="checkbox" checked={on} onChange={() => toggle(id)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                  {t(WIDGET_LABELS[id])}
                </label>
                <button type="button" aria-label={t('Upar')} disabled={!on || i === 0} onClick={() => move(id, -1)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label={t('Neeche')} disabled={!on || i === widgets.length - 1} onClick={() => move(id, 1)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <Toggle label={t('Animations')} desc={t('Band karein to screens bina harkat ke badlengi.')}
          checked={a.mobileAnimations ?? true} onChange={(v) => ed.set('mobileAnimations', v)} />
        <Toggle label={t('Haptics (halki thar-thar)')} desc={t('Button dabane par halka sa jhatka.')}
          checked={a.mobileHaptics ?? true} onChange={(v) => ed.set('mobileHaptics', v)} />
      </div>
    </div>
  );
}
