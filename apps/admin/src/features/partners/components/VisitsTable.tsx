/**
 * Field visits for review: photo, location link, the checks that flagged
 * the visit, and OK / Fake buttons for admins who can change partners.
 */

import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, Camera, Check, MapPin, Undo2 } from 'lucide-react';
import { Button, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { adminPartnersApi, type PartnerVisit } from '@/api/admin-partners.api';
import { apiError } from '@/lib/errors';
import { formatDateTime, formatRelative } from '@/lib/format';
import { StatusBadge } from '@/ui';
import { FLAG_TEXT, mapsLink } from '../lib/partner-text';

function ReviewCell({ v, canManage }: { v: PartnerVisit; canManage: boolean }) {
  const qc = useQueryClient();
  const review = useMutation({
    mutationFn: (r: 'ok' | 'fake' | null) => adminPartnersApi.reviewVisit(v.id, r),
    onSuccess: (_, r) => {
      toast.success(r === 'ok' ? 'Marked as checked' : r === 'fake' ? 'Marked as fake' : 'Review removed');
      qc.invalidateQueries({ queryKey: ['admin', 'partners', 'visits'] });
      qc.invalidateQueries({ queryKey: ['admin', 'partners', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'partner'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  if (v.review) {
    return (
      <div className="flex items-center gap-2">
        <div>
          <StatusBadge value={v.review} label={v.review === 'ok' ? 'Checked' : 'Fake'} variant={v.review === 'ok' ? 'success' : 'danger'} />
          {v.reviewedAt && <div className="mt-0.5 text-[0.6875rem] text-slate-500">{v.reviewedBy ?? 'Admin'} · {formatRelative(v.reviewedAt)}</div>}
        </div>
        {canManage && <Button size="xs" variant="ghost" leftIcon={<Undo2 className="h-3.5 w-3.5" />} loading={review.isPending} onClick={() => review.mutate(null)}>Undo</Button>}
      </div>
    );
  }
  if (!canManage) return <span className="text-[0.75rem] text-slate-400">Not reviewed</span>;
  return (
    <div className="flex gap-1.5">
      <Button size="xs" variant="outline" leftIcon={<Check className="h-3.5 w-3.5" />} disabled={review.isPending} onClick={() => review.mutate('ok')}>OK</Button>
      <Button size="xs" variant="outline" className="text-rose-700" leftIcon={<Ban className="h-3.5 w-3.5" />} disabled={review.isPending} onClick={() => review.mutate('fake')}>Fake</Button>
    </div>
  );
}

export function VisitsTable({ rows, canManage, showPartner = true }: { rows: PartnerVisit[]; canManage: boolean; showPartner?: boolean }) {
  return (
    <Table minWidth="60rem">
      <THead>
        <Tr>
          <Th>Photo</Th>
          <Th>Shop</Th>
          {showPartner && <Th>Partner</Th>}
          <Th>When</Th>
          <Th>Location</Th>
          <Th>Checks</Th>
          <Th>Review</Th>
        </Tr>
      </THead>
      <TBody>
        {rows.map((v) => (
          <Tr key={v.id}>
            <Td>
              {v.photoUrl ? (
                <a href={v.photoUrl} target="_blank" rel="noreferrer" title="Open photo">
                  <img src={v.photoUrl} alt={`Visit to ${v.lead.shopName}`} loading="lazy" className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
                </a>
              ) : <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-400" title="No photo"><Camera className="h-4 w-4" /></span>}
            </Td>
            <Td className="max-w-[14rem]">
              <div className="truncate font-semibold text-slate-900">{v.lead.shopName}</div>
              <div className="truncate text-[0.75rem] text-slate-500">{[v.lead.phone, v.lead.city].filter(Boolean).join(' · ')}</div>
              {v.note && <div className="mt-0.5 line-clamp-2 text-[0.75rem] text-slate-600" title={v.note}>{v.note}</div>}
            </Td>
            {showPartner && (
              <Td>
                <Link to={`/partners/${v.partner.id}`} className="font-medium text-slate-900 hover:text-brand-700">{v.partner.fullName}</Link>
                <div className="font-mono text-[0.6875rem] text-slate-500">{v.partner.code}</div>
              </Td>
            )}
            <Td className="whitespace-nowrap text-[0.8125rem]" title={formatDateTime(v.visitedAt)}>
              {formatDateTime(v.visitedAt)}
              {Math.abs(new Date(v.createdAt).getTime() - new Date(v.visitedAt).getTime()) > 30 * 60_000 && (
                <div className="text-[0.6875rem] text-slate-400">sent {formatRelative(v.createdAt)}</div>
              )}
            </Td>
            <Td className="whitespace-nowrap text-[0.8125rem]">
              {v.lat != null && v.lng != null ? (
                <a href={mapsLink(v.lat, v.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                  <MapPin className="h-3.5 w-3.5" /> Map
                </a>
              ) : <span className="text-slate-400">None</span>}
              {v.accuracy != null && <div className="text-[0.6875rem] text-slate-500">± {Math.round(v.accuracy)} m</div>}
            </Td>
            <Td className="max-w-[16rem]">
              {v.flags.length ? (
                <ul className="space-y-0.5">
                  {v.flags.map((f) => (
                    <li key={f} className="flex items-start gap-1 text-[0.75rem] text-amber-800"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />{FLAG_TEXT[f] ?? f}</li>
                  ))}
                </ul>
              ) : <span className="text-[0.75rem] text-emerald-700">No flags</span>}
            </Td>
            <Td><ReviewCell v={v} canManage={canManage} /></Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
