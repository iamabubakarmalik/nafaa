/**
 * One branch on the Branches page: type, main and on/off badges, address and
 * phone, then today's sales, the drawer, stock value and who is on duty.
 * Money shows only when the viewer may see reports; actions only with
 * `shops.manage`.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Boxes, MapPin, MessageCircle, Pencil, Phone, Power, ShoppingBag, Star, Trash2, Users, Wallet,
} from 'lucide-react';
import { cn } from '@core/lib/cn';
import { waNumber } from '@core/lib/whatsapp/templates';
import type { Shop, ShopAnalyticsRow } from '../api/shops.api';
import { SHOP_TYPES, since } from './meta';

export function BranchCard({ shop, f, money, cost, canManage, onToggle, onDelete }: {
  shop: Shop;
  /** Today's figures; missing when the branch is off or the viewer has no reports access. */
  f?: ShopAnalyticsRow;
  money: (n: number) => string;
  cost: (n: number | undefined) => string;
  canManage: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const t = SHOP_TYPES[shop.type];
  const wa = waNumber(shop.phone);
  const growth = f?.growthVsYesterday ?? 0;

  return (
    <li className={cn('flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 transition hover:shadow-md', shop.isMain ? 'ring-amber-300' : 'ring-slate-200/80', !shop.isActive && 'opacity-75')}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${t.color}17`, color: t.color }}>
          <t.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] font-semibold text-slate-900">{shop.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold" style={{ backgroundColor: `${t.color}14`, color: t.color }}>{t.label}</span>
            {shop.isMain && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800 ring-1 ring-amber-200"><Star className="h-3 w-3 fill-current" />Main</span>}
            {!shop.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600 ring-1 ring-slate-200">Band</span>}
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <Link to={`/shops/${shop.id}/edit`} title="Badlein" aria-label={`${shop.name} badlein`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></Link>
            <button type="button" onClick={onToggle} title={shop.isActive ? 'Band karein' : 'Chalu karein'} aria-label={shop.isActive ? 'Band karein' : 'Chalu karein'}
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100', shop.isActive ? 'text-emerald-600' : 'text-slate-400')}><Power className="h-4 w-4" /></button>
            {!shop.isMain && (
              <button type="button" onClick={onDelete} title="Mitayein" aria-label={`${shop.name} mitayein`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        )}
      </div>

      {(shop.address || shop.phone) && (
        <div className="mt-3 space-y-1 text-[0.8125rem] text-slate-600">
          {shop.address && <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="line-clamp-2">{shop.address}</span></p>}
          {shop.phone && (
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <a href={`tel:${shop.phone}`} className="hover:text-brand-700">{shop.phone}</a>
              {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp" className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
            </p>
          )}
        </div>
      )}

      {f ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <Metric icon={ShoppingBag} label="Aaj ki sale" value={money(f.todaySales)}
            hint={<>{f.todayOrders} bill{f.yesterdaySales > 0 || f.todaySales > 0 ? <span className={growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}> · kal se {growth >= 0 ? '+' : ''}{growth.toFixed(0)}%</span> : null}</>} />
          <Metric icon={Wallet} label="Drawer" value={f.registerOpen ? money(f.registerBalance) : 'Band'}
            hint={f.registerOpen ? `${f.openDrawers > 1 ? `${f.openDrawers} drawer · ` : ''}${since(f.registerOpenedAt)}` : shop.type === 'SHOP' ? 'Aaj abhi nahi khula' : 'Store — drawer nahi'} tone={f.registerOpen ? 'good' : undefined} />
          <Metric icon={Boxes} label="Stock (cost)" value={cost(f.stockValue)}
            hint={f.lowStockCount > 0 ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" />{f.lowStockCount} cheezein kam</span> : `${Math.round(f.totalStock).toLocaleString('en-PK')} pieces`} />
          <Metric icon={Users} label="Duty par" value={`${f.staffOnDuty} / ${f.staffCount}`}
            hint={f.onDutyNames.length ? f.onDutyNames.join(', ') : 'Abhi koi nahi'} tone={f.staffOnDuty > 0 ? 'good' : undefined} />
        </dl>
      ) : (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[0.75rem] text-slate-500">
          {!shop.isActive ? 'Branch band hai — is me sale nahi hoti. Chalu karne ke liye power ka button dabayein.' : `${shop._count?.users ?? 0} login · ${shop._count?.shopStocks ?? 0} cheezon ka stock record`}
        </p>
      )}

      {f && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem]">
          <span className="text-slate-500">Is mahine <span className="font-semibold text-slate-800">{money(f.monthSales)}</span></span>
          {f.outstandingCredit > 0 && <Link to="/khata" className="text-amber-700 hover:underline">Udhaar {money(f.outstandingCredit)}</Link>}
          <Link to={`/shops/overview?branch=${shop.id}`} className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><BarChart3 className="h-3.5 w-3.5" />Analytics</Link>
        </div>
      )}
    </li>
  );
}

function Metric({ icon: Icon, label, value, hint, tone }: { icon: typeof Wallet; label: string; value: string; hint: ReactNode; tone?: 'good' }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-slate-500"><Icon className={cn('h-3.5 w-3.5', tone === 'good' ? 'text-emerald-600' : 'text-slate-400')} />{label}</dt>
      <dd className="mt-0.5 truncate text-[0.9375rem] font-bold tabular-nums text-slate-900">{value}</dd>
      <dd className="truncate text-[0.6875rem] text-slate-500">{hint}</dd>
    </div>
  );
}
