/**
 * Marketing kit from Nafaa: links, videos, PDFs and images to show or send
 * to shops, plus a demo login for showing the app at the counter.
 */

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Copy, ExternalLink, FileText, Image as ImageIcon, Link2, MonitorPlay, PlayCircle } from 'lucide-react';
import { EmptyState, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { partnerApi } from '@/api/partner.api';
import type { KitItem } from '@/api/types';
import { copyText } from '@/lib/clipboard';
import { Section } from '@/ui/Section';
import { QueryError } from '@/ui/QueryState';

function kindOf(item: KitItem): 'video' | 'pdf' | 'image' | 'link' {
  const t = (item.type ?? '').toLowerCase();
  const url = (item.url ?? '').toLowerCase();
  if (t.includes('video') || /youtube|youtu\.be|\.mp4/.test(url)) return 'video';
  if (t.includes('pdf') || url.endsWith('.pdf')) return 'pdf';
  if (t.includes('image') || /\.(png|jpe?g|webp|gif)$/.test(url)) return 'image';
  return 'link';
}

const LOOK = {
  video: { icon: PlayCircle, label: 'Video', tone: 'bg-rose-50 text-rose-600' },
  pdf: { icon: FileText, label: 'PDF', tone: 'bg-amber-50 text-amber-600' },
  image: { icon: ImageIcon, label: 'Tasveer', tone: 'bg-blue-50 text-blue-600' },
  link: { icon: Link2, label: 'Link', tone: 'bg-brand-50 text-brand-600' },
};

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <div className="min-w-0">
        <p className="text-[0.75rem] text-slate-500">{label}</p>
        <p className="truncate font-mono text-[0.9375rem] font-semibold text-slate-900">{value}</p>
      </div>
      <button type="button" aria-label={`${label} copy`} onClick={async () => { if (await copyText(value)) toast.success(`${label} copy ho gaya`); }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Copy className="h-4 w-4" /></button>
    </div>
  );
}

export default function KitPage() {
  const q = useQuery({ queryKey: ['kit'], queryFn: partnerApi.kit, staleTime: 10 * 60_000 });
  const items = (q.data?.items ?? []).filter((i) => i.url);
  const demo = q.data?.demo;
  const demoLogin = demo?.login ?? demo?.email ?? demo?.phone;

  return (
    <PageShell>
      <PageHero title="Marketing kit" subtitle="Dukaandar ko dikhane aur bhejne ke liye cheezein" />
      {q.isPending ? <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        : q.isError ? <QueryError error={q.error} onRetry={() => void q.refetch()} /> : (
          <>
            {demo && (demo.url || demoLogin) && (
              <section className="rounded-3xl bg-gradient-to-br from-brand-50 to-emerald-50 p-4 ring-1 ring-brand-200 sm:p-5">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="h-5 w-5 text-brand-600" />
                  <h2 className="font-bold text-brand-900">Demo account</h2>
                </div>
                <p className="mt-0.5 text-[0.875rem] text-brand-900/75">{demo.note || 'Dukaan par Nafaa chala kar dikhane ke liye. Asli bills mat banayein.'}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {demoLogin && <CopyRow label="Login" value={demoLogin} />}
                  {demo.password && <CopyRow label="Password" value={demo.password} />}
                </div>
                {demo.url && (
                  <a href={demo.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.9375rem] font-bold text-brand-fg shadow-sm">
                    <ExternalLink className="h-4 w-4" />Demo kholein
                  </a>
                )}
              </section>
            )}

            {items.length === 0 ? (
              <Section><EmptyState icon={<BookOpen className="h-6 w-6" />} title="Kit abhi khaali hai" description="Nafaa team jald videos, PDF aur tasveerein yahan daalegi." /></Section>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((it, i) => {
                  const k = kindOf(it);
                  const L = LOOK[k];
                  return (
                    <li key={it.id ?? i}>
                      <a href={it.url} target="_blank" rel="noreferrer" className="flex h-full gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 transition hover:ring-brand-300 active:scale-[0.99]">
                        {k === 'image' || it.thumbnail
                          ? <img src={it.thumbnail || it.url} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
                          : <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${L.tone}`}><L.icon className="h-7 w-7" /></span>}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.6875rem] font-bold uppercase tracking-wide text-slate-400">{L.label}</span>
                          <span className="block font-semibold leading-snug text-slate-900">{it.title || it.url}</span>
                          {it.description && <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] text-slate-500">{it.description}</span>}
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
    </PageShell>
  );
}
