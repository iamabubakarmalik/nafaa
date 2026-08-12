import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { exportsApi, type ExportEntity } from '../../../../api/marketing/marketing-exports.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { useCsvDownload } from '../../_shared/hooks/useCsvDownload';

const ENTITIES: { key: ExportEntity; label: string; description: string }[] = [
  { key: 'subscribers', label: 'Newsletter Subscribers', description: 'Emails, tags, engagement scores' },
  { key: 'leads', label: 'Marketing Leads', description: 'All leads with scores + temperature' },
  { key: 'contact-forms', label: 'Contact Forms', description: 'All submissions + status' },
  { key: 'demos', label: 'Demo Bookings', description: 'Requested + completed demos' },
  { key: 'campaigns', label: 'Campaigns', description: 'Sent campaigns + open/click stats' },
];

export function ExportsPage() {
  const download = useCsvDownload();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader title="Data Exports" subtitle="Download CSV data for analysis" />

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-neutral-800">Date Range (optional)</h3>
        <div className="flex flex-wrap gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ENTITIES.map((e) => (
          <div key={e.key} className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-neutral-900">{e.label}</h4>
              <p className="mt-0.5 text-xs text-neutral-500">{e.description}</p>
              <button
                onClick={() => download(exportsApi.url(e.key, from || undefined, to || undefined), `${e.key}-${Date.now()}.csv`)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                <Download className="h-3 w-3" /> Download CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
