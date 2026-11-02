/**
 * One roll: size left, value, every movement (opening, bill cuts with their
 * bill, adjustments, waste, voids) and the pieces cut from it. Edit, adjust,
 * damage, finish and remove need their own permissions.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCircle2, GraduationCap, History, Layers, Pencil, Ruler, Scissors, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Card, EmptyState, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, heroButton, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { RollFormModal } from '../components/RollFormModal';
import { AdjustRollModal, RollActionModal } from '../components/RollActionModals';
import { usePageKeys } from '../hooks/usePageKeys';
import { MOVE_LABEL, PIECES_KEY, PIECE_STATUS, ROLLS_KEY, ROLL_STATUS, SUMMARY_KEY, ftIn, r2, realFt, shortDate } from '../lib/meta';
import { t } from '@core/i18n';

type Dialog = 'edit' | 'adjust' | 'damage' | 'finish' | 'remove' | null;

export default function CarpetRollDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money, cost } = useMasked();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canStock = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const { data: roll, isLoading, isError } = useQuery({ queryKey: [ROLLS_KEY, 'one', id], queryFn: () => carpetRollsApi.getOne(id), enabled: !!id });
  usePageKeys(null, { e: () => canEdit && setDialog('edit'), a: () => canStock && setDialog('adjust'), g: guide.open });

  const done = () => { setDialog(null); for (const k of [ROLLS_KEY, PIECES_KEY, SUMMARY_KEY]) void qc.invalidateQueries({ queryKey: [k] }); };

  if (isLoading) return <PageShell><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  if (isError || !roll) return <PageShell><EmptyState icon={<Layers className="h-6 w-6" />} title={t('Roll nahi mila')} description={t('Ho sakta hai link purana ho.')} action={<Link to="/carpet-rolls" className="font-semibold text-brand-700">{t('Rolls par wapas')}</Link>} /></PageShell>;

  const st = ROLL_STATUS[roll.status];
  const orig = realFt(roll.originalLengthFt, roll.originalLengthInch);
  const left = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
  const pct = orig > 0 ? Math.round((1 - left / orig) * 100) : 0;
  const open = roll.status === 'ACTIVE' || roll.status === 'RESERVED';
  const moves = roll.movements ?? [];
  const cuts = moves.filter((m) => m.type === 'CUT_FOR_SALE');
  const pieces = roll.cutPieces ?? [];

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Roll — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Scissors, color: '#7c3aed', title: t('Kaatna'), text: t('Roll counter (POS) se bill par kat-ta hai — yahan har cut apne bill ke saath dikhta hai.') },
            { icon: SlidersHorizontal, color: '#0891b2', title: t('Adjust'), text: t('Naap dobara li aur farq aaya to Adjust karein, wajah ke saath.') },
            { icon: CheckCircle2, color: '#475569', title: t('Khatam'), text: t('Aakhri bacha hissa bechne layak nahi to Khatam — woh waste me likha jata hai.') },
          ]}
          shortcuts={[['E', 'edit'], ['A', 'adjust'], ['G', 'guide']]} />
      )}

      <PageHero title={roll.rollNumber} chip={<><Layers />{st.label}</>}
        meta={[roll.product?.name, roll.variant?.name, roll.shop?.name, roll.rackNumber && `Rack ${roll.rackNumber}`].filter(Boolean).join(' · ')}
        actions={<>
          <button type="button" onClick={() => navigate(-1)} className={heroButton}><ArrowLeft className="h-4 w-4 rtl-flip" />{t('Wapas')}</button>
          {canEdit && <button type="button" onClick={() => setDialog('edit')} className={heroButton}><Pencil className="h-4 w-4" />{t('Edit')}</button>}
          {canStock && roll.status !== 'TRANSFERRED' && <button type="button" onClick={() => setDialog('adjust')} className={heroButton}><SlidersHorizontal className="h-4 w-4" />{t('Adjust')}</button>}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Bacha'), value: `${ftIn(roll.widthFt, roll.widthInch)} × ${ftIn(roll.remainingLengthFt, roll.remainingLengthInch)}` },
          { label: t('Sqft bacha'), value: String(r2(roll.remainingSqft)) },
          { label: t('Bechne par'), value: money(roll.remainingSqft * roll.salePricePerSqft) },
        ]} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-1" title={t('Roll ki details')}>
          <dl className="space-y-2 text-[0.875rem]">
            {([
              [t('Asal size'), `${ftIn(roll.widthFt, roll.widthInch)} × ${ftIn(roll.originalLengthFt, roll.originalLengthInch)} (${r2(roll.originalSqft)} sqft)`],
              [t('Istemal'), `${pct}% · ${cuts.length} cut`],
              [t('Cost / sqft'), cost(roll.costPerSqft)],
              [t('Rate / sqft'), money(roll.salePricePerSqft)],
              [t('Wholesale / sqft'), roll.wholesalePricePerSqft ? money(roll.wholesalePricePerSqft) : '—'],
              [t('Design code'), roll.designCode || '—'],
              [t('Quality'), [roll.quality, roll.pile].filter(Boolean).join(' · ') || '—'],
              [t('Kahan se'), roll.sourceType === 'PURCHASE' ? t('Purchase') : roll.sourceType === 'OPENING_STOCK' ? t('Opening stock') : roll.sourceType],
              [t('Aaya'), shortDate(roll.receivedAt)],
            ] as Array<[string, string]>).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-end font-medium text-slate-900">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', pct > 90 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} /></div>
          {roll.notes && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{roll.notes}</p>}
          {canStock && open && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setDialog('finish')} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><CheckCircle2 className="h-4 w-4" />{t('Khatam')}</button>
              <button type="button" onClick={() => setDialog('damage')} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"><Ban className="h-4 w-4" />{t('Damage')}</button>
              <button type="button" onClick={() => setDialog('remove')} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />{t('Stock se hatayein')}</button>
            </div>
          )}
        </Card>

        <Card className="rounded-3xl lg:col-span-2" flush title={t('History')} description={t('Har kami, zyadti aur bill ka cut')}>
          {moves.length === 0 ? <p className="px-5 py-6 text-[0.875rem] text-slate-500">{t('Koi record nahi.')}</p> : (
            <div className="overflow-x-auto">
              <Table>
                <THead><Tr><Th>{t('Tareekh')}</Th><Th>{t('Kaam')}</Th><Th className="text-end">{t('Lambai')}</Th><Th className="text-end">{t('Sqft')}</Th><Th className="text-end">{t('Baad me')}</Th><Th>{t('Note')}</Th></Tr></THead>
                <TBody>
                  {moves.map((m) => (
                    <Tr key={m.id}>
                      <Td className="whitespace-nowrap">{shortDate(m.createdAt)}</Td>
                      <Td><span className="inline-flex items-center gap-1 font-medium"><History className="h-3.5 w-3.5 text-slate-400" />{MOVE_LABEL[m.type] ?? m.type}</span></Td>
                      <Td className={cn('text-end tabular-nums', m.lengthFt < 0 ? 'text-rose-600' : 'text-emerald-700')}>{t('{{value}}{{lengthFt}} ft', { value: m.lengthFt > 0 ? '+' : '', lengthFt: r2(m.lengthFt) })}</Td>
                      <Td className="text-end tabular-nums">{r2(m.sqft)}</Td>
                      <Td className="text-end tabular-nums">{t('{{balanceLengthAfter}} ft', { balanceLengthAfter: r2(m.balanceLengthAfter) })}</Td>
                      <Td className="max-w-[16rem] truncate text-slate-600" title={m.note ?? ''}>{m.saleId ? <Link to={`/sales/${m.saleId}/receipt`} className="text-brand-700 hover:underline">{m.note}</Link> : m.note}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-3xl" flush title={t('Is roll ke tukre')} description={t('Cut ke baad bachi patti, ya wapas aaya hissa')}>
        {pieces.length === 0 ? <p className="flex items-center gap-2 px-5 py-6 text-[0.875rem] text-slate-500"><Ruler className="h-4 w-4" />{t('Abhi koi tukra nahi.')}</p> : (
          <ul className="divide-y divide-slate-100">
            {pieces.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.875rem]">
                <Link to={`/carpet-cut-pieces?search=${encodeURIComponent(p.pieceCode)}`} className="font-mono font-semibold text-slate-900 hover:underline">{p.pieceCode}</Link>
                <span className="tabular-nums text-slate-600">{t('{{widthFt}} × {{lengthFt}} · {{totalSqft}} sqft · {{salePrice}}', { widthFt: ftIn(p.widthFt, p.widthInch), lengthFt: ftIn(p.lengthFt, p.lengthInch), totalSqft: r2(p.totalSqft), salePrice: money(p.salePrice) })}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ring-1', PIECE_STATUS[p.status as keyof typeof PIECE_STATUS]?.tone)}>{PIECE_STATUS[p.status as keyof typeof PIECE_STATUS]?.label}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {dialog === 'edit' && <RollFormModal roll={roll} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog === 'adjust' && <AdjustRollModal roll={roll} onClose={() => setDialog(null)} onDone={done} />}
      {(dialog === 'damage' || dialog === 'finish' || dialog === 'remove') && <RollActionModal roll={roll} action={dialog} onClose={() => setDialog(null)} onDone={done} />}
    </PageShell>
  );
}
