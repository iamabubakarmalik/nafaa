/**
 * One child's birthday page: age and days left, the parent's number with a
 * ready WhatsApp message, toys and gift packs that fit the child's age and
 * budget (in stock only), and the gifts bought here before.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cake, Gift, MessageCircle, Package, Pencil, Phone, ShoppingCart, Sparkles } from 'lucide-react';
import { Button, Card, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { waLink } from '@core/lib/whatsapp/templates';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { toyBirthdaysApi } from '../api/birthday-reminders.api';
import { CATEGORIES, GENDERS, KEYS, apiError, labelOf } from '../lib/meta';
import { EmptyBox } from '../components/ui';
import { BirthdayForm, reminderText } from './BirthdayRemindersPage';

export default function BirthdayDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const { sales } = useMasked();
  const [editing, setEditing] = useState(false);
  const [gift, setGift] = useState(false);

  const q = useQuery({ queryKey: [KEYS.birthdays, 'one', id], queryFn: () => toyBirthdaysApi.getOne(id) });
  const ideas = useQuery({ queryKey: [KEYS.birthdays, 'ideas', id], queryFn: () => toyBirthdaysApi.giftSuggestions(id, 12), enabled: !!q.data });
  const refresh = () => qc.invalidateQueries({ queryKey: [KEYS.birthdays] });
  const sent = useMutation({ mutationFn: () => toyBirthdaysApi.markReminderSent(id), onSuccess: refresh });

  if (q.isLoading) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  const r = q.data;
  if (!r) return <PageShell><EmptyBox icon={Cake} title="Ye bacha nahi mila" text="Ho sakta hai record kisi aur branch ka ho." action={<Button variant="secondary" onClick={() => navigate('/toystore/birthdays')}>Saalgirah par wapas</Button>} /></PageShell>;
  const c = r.computed;
  const remind = () => {
    const link = waLink(r.customerPhone, reminderText(r));
    if (!link) { toast.error('Phone number sahi nahi'); return; }
    window.open(link, '_blank', 'noopener');
    if (canEdit) sent.mutate();
  };

  return (
    <PageShell>
      <PageHero
        title={r.childName}
        chip={<><Cake /> {c?.daysUntilBirthday === 0 ? 'Aaj saalgirah hai' : `${c?.daysUntilBirthday} din baad saalgirah`}</>}
        meta={`${r.customerName} · ${r.customerPhone}${r.isActive ? '' : ' · yaad dihani band'}`}
        actions={<>
          <a href={`tel:${r.customerPhone}`} className={heroButton}><Phone className="h-4 w-4" /><span className="hidden sm:inline">Call</span></a>
          {canEdit && <button type="button" onClick={() => setEditing(true)} className={heroButton}><Pencil className="h-4 w-4" /><span className="hidden sm:inline">Badlein</span></button>}
          <button type="button" onClick={remind} className={heroPrimaryButton}><MessageCircle className="h-4 w-4" /> WhatsApp</button>
        </>}
        stats={[{ label: 'Umar', value: `${Math.floor(c?.currentAge ?? 0)} saal` }, { label: 'Ho raha hai', value: `${c?.turningAge} saal` }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Cake} color="#db2777" label="Saalgirah" value={new Date(r.childBirthDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })} hint={labelOf(GENDERS, r.childGender) || undefined} />
        <KpiCard icon={Gift} color="#7c3aed" label="Gift liye" value={r.totalPurchases} hint={r.lastGiftGiven ?? undefined} />
        <KpiCard icon={ShoppingCart} color="#16a34a" label="Kul kharch" value={sales(r.totalSpent)} hint={c?.avgSpend ? `Ek gift ${sales(c.avgSpend)}` : undefined} />
        <KpiCard icon={MessageCircle} color="#0891b2" label="Aakhri message" value={r.lastReminderSent ? new Date(r.lastReminderSent).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'} hint={`${r.reminderDaysBefore} din pehle`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-600" />{c?.turningAge} saal ke liye khilone</span>}
          description={ideas.data?.budgetCeiling ? `Budget ${sales(ideas.data.budgetCeiling)} tak · sirf stock wale` : 'Sirf stock wale'}>
          {ideas.isLoading ? <Skeleton className="h-40 rounded-xl" /> : (ideas.data?.products ?? []).length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.8125rem] text-slate-500">Is umar ke khilone stock me nahi — khilonon par umar likhein ya naya maal mangwayein.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(ideas.data?.products ?? []).map((p: { productId: string; categoryType?: string; brand?: string; product: { name: string; price: number; stock: number } }) => (
                <li key={p.productId}>
                  <Link to={`/toystore-products/${p.productId}`} className="flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-slate-200 hover:bg-slate-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600"><Gift className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-slate-900">{p.product.name}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{[labelOf(CATEGORIES, p.categoryType), p.brand, `Stock ${p.product.stock}`].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums">{sales(p.product.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(ideas.data?.giftPacks ?? []).length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-700">Gift packs</p>
              <ul className="space-y-1.5">
                {(ideas.data?.giftPacks ?? []).map((g: { id: string; name: string; giftPackPrice: number }) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 rounded-xl bg-pink-50/60 px-3 py-2 text-[0.875rem]"><span className="truncate">🎁 {g.name}</span><span className="font-semibold tabular-nums">{sales(g.giftPackPrice)}</span></li>
                ))}
              </ul>
            </div>
          )}
          {canSell && <div className="mt-4"><Link to="/pos" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-brand-700"><ShoppingCart className="h-4 w-4" />POS par bechein</Link></div>}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-brand-600" />Pichle gift</span>}>
          {r.lastGiftGiven ? (
            <div className="text-[0.875rem]">
              <p className="font-medium text-slate-900">{r.lastGiftGiven}</p>
              <p className="text-[0.75rem] text-slate-500">{r.lastPurchaseDate ? new Date(r.lastPurchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
            </div>
          ) : <p className="text-[0.8125rem] text-slate-500">Abhi koi gift nahi likha.</p>}
          {canEdit && <Button className="mt-3" variant="secondary" size="sm" onClick={() => setGift(true)} leftIcon={<Gift className="h-4 w-4" />}>Gift likhein</Button>}
          <p className="mt-3 text-[0.75rem] text-slate-500">Ye sirf yaad ke liye hai — paisa POS ke bill se aata hai.</p>
          {r.notes && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">{r.notes}</p>}
        </Card>
      </div>

      {editing && <BirthdayForm value={r} onClose={() => setEditing(false)} onSaved={() => { refresh(); setEditing(false); }} />}
      {gift && <GiftModal id={r.id} onClose={() => setGift(false)} onSaved={() => { refresh(); setGift(false); }} />}
    </PageShell>
  );
}

/** Notes a gift bought for the child (for next year's ideas); money is on the POS bill. */
function GiftModal({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState('');
  const save = useMutation({
    mutationFn: () => {
      if (!what.trim()) throw new Error('Kya gift liya, likhein');
      if (!(Number(amount) >= 0)) throw new Error('Amount sahi likhein');
      return toyBirthdaysApi.recordPurchase(id, { giftDescription: what.trim(), amount: Number(amount) || 0 });
    },
    onSuccess: () => { toast.success('Gift likh liya'); onSaved(); },
    onError: (e) => toast.error(apiError(e, (e as Error).message || 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Gift likhein"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={() => save.mutate()} loading={save.isPending}>Save karein</Button></>}>
      <div className="space-y-3">
        <Input label="Kya liya" required value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Remote car" autoFocus />
        <Input label="Kitne ka (Rs)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} hint="Bill ka amount — sirf hisaab ke liye" />
      </div>
    </Modal>
  );
}
