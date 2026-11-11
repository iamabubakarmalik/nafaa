/** Partner leads as a table, with the stage, follow-up and a link to the shop once it signs up. */

import { Link } from 'react-router-dom';
import { Lock, MapPin } from 'lucide-react';
import { Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import type { PartnerLead } from '@/api/admin-partners.api';
import { formatDate, formatRelative, num } from '@/lib/format';
import { StatusBadge } from '@/ui';
import { STAGE_LABEL, STAGE_TONE, mapsLink } from '../lib/partner-text';

export function LeadsTable({ rows, showPartner = true }: { rows: PartnerLead[]; showPartner?: boolean }) {
  return (
    <Table minWidth={showPartner ? '62rem' : '52rem'}>
      <THead>
        <Tr>
          <Th>Shop</Th>
          {showPartner && <Th>Partner</Th>}
          <Th>Stage</Th>
          <Th align="right">Visits</Th>
          <Th>Follow-up</Th>
          <Th>Lock</Th>
          <Th align="right">Added</Th>
        </Tr>
      </THead>
      <TBody>
        {rows.map((l) => (
          <Tr key={l.id}>
            <Td className="max-w-[18rem]">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                {l.tenantId ? <Link to={`/tenants/${l.tenantId}`} className="truncate hover:text-brand-700">{l.shopName}</Link> : <span className="truncate">{l.shopName}</span>}
                {l.lat != null && l.lng != null && <a href={mapsLink(l.lat, l.lng)} target="_blank" rel="noreferrer" title="Open in Google Maps" className="text-slate-400 hover:text-brand-600"><MapPin className="h-3.5 w-3.5" /></a>}
              </div>
              <div className="truncate text-[0.75rem] text-slate-500">{[l.ownerName, l.phone, l.city, l.category].filter(Boolean).join(' · ')}</div>
            </Td>
            {showPartner && (
              <Td>
                <Link to={`/partners/${l.partner.id}`} className="font-medium text-slate-900 hover:text-brand-700">{l.partner.fullName}</Link>
                <div className="font-mono text-[0.6875rem] text-slate-500">{l.partner.code}</div>
              </Td>
            )}
            <Td>
              <StatusBadge value={l.stage} label={STAGE_LABEL[l.stage]} variant={STAGE_TONE[l.stage]} />
              {l.stage === 'LOST' && l.lostReason && <div className="mt-0.5 max-w-[12rem] truncate text-[0.6875rem] text-slate-500" title={l.lostReason}>{l.lostReason}</div>}
              {l.interest && l.stage !== 'LOST' && <div className="mt-0.5 text-[0.6875rem] text-slate-500">{l.interest.toLowerCase()} interest</div>}
            </Td>
            <Td align="right" className="tabular-nums">{num(l.visits)}</Td>
            <Td className="whitespace-nowrap text-[0.8125rem]">{l.followUpAt ? formatDate(l.followUpAt) : <span className="text-slate-400">—</span>}</Td>
            <Td className="whitespace-nowrap text-[0.75rem] text-slate-500">
              {l.locked ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />until {formatDate(l.lockedUntil)}</span> : 'Open'}
            </Td>
            <Td align="right" className="whitespace-nowrap text-[0.8125rem] text-slate-500">{formatRelative(l.createdAt)}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
