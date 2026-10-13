/**
 * Help centre: searchable questions and answers, short step-by-step guides
 * that open the right page, and support by WhatsApp, phone or email with the
 * shop and user already filled into the message.
 *
 * Keys: / search · 1-3 tabs · W WhatsApp · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronDown, Globe, GraduationCap, HelpCircle, LayoutGrid, Lightbulb, Mail, MessageCircle, Phone, Search } from 'lucide-react';
import {
  Button, EmptyState, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useAuthStore } from '@core/stores/auth.store';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { FAQS, GUIDES, TOPICS, type HelpTopic } from '../content';
import { SUPPORT, supportWhatsapp } from '../support';

type Tab = 'faq' | 'guides' | 'contact';

export default function HelpPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const [tab, setTab] = useState<Tab>('faq');
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState<'all' | HelpTopic>('all');
  const [open, setOpen] = useState<string | null>(null);

  const waMessage = `Assalam-o-Alaikum, mujhe Nafaa me madad chahiye.\nDukaan: ${tenant?.name ?? ''}\nNaam: ${user?.fullName ?? ''}\nEmail: ${user?.email ?? ''}\n\nMasla: `;
  const wa = supportWhatsapp(waMessage);

  const q = search.trim().toLowerCase();
  const { faqs, guides } = useMemo(() => {
    const hit = (...parts: string[]) => !q || parts.some((p) => p.toLowerCase().includes(q));
    const inTopic = (t: HelpTopic) => topic === 'all' || t === topic;
    return {
      faqs: FAQS.filter((f) => inTopic(f.topic) && hit(f.q, f.a)),
      guides: GUIDES.filter((g) => inTopic(g.topic) && hit(g.title, g.text, ...g.steps)),
    };
  }, [topic, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === '1') setTab('faq');
      if (e.key === '2') setTab('guides');
      if (e.key === '3') setTab('contact');
      if (e.key === 'w' || e.key === 'W') window.open(wa, '_blank', 'noopener');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const filtered = topic !== 'all' || !!q;
  const topicMeta = TOPICS.find((t) => t.id === topic);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Madad — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Search, color: '#2563eb', title: 'Search', text: 'Upar likhein — sawal aur guides dono me se jawab aa jata hai.' },
            { icon: LayoutGrid, color: '#7c3aed', title: 'Mauzoo chunein', text: 'Sale, stock, khata, paisa, reports ya account — sirf usi ke sawal.' },
            { icon: BookOpen, color: '#16a34a', title: 'Guide kholein', text: 'Har guide 4 qadam ki hai aur "Kholein" se seedha us page par le jati hai.' },
            { icon: MessageCircle, color: '#d97706', title: 'WhatsApp karein', text: 'Jawab na mile to WhatsApp dabayein — dukaan aur naam pehle se likha hota hai.' },
          ]}
          tips={['Har bare page par G dabane se us page ki apni guide khulti hai.']}
          shortcuts={[['/', 'dhoondein'], ['1-3', 'tabs'], ['W', 'WhatsApp'], ['G', 'guide']]} />
      )}

      <PageHero
        title="Madad"
        chip={<><HelpCircle />Sawal, guide aur support</>}
        meta={`${FAQS.length} sawal · ${GUIDES.length} guides`}
        actions={<>
          <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp (W)" className={heroPrimaryButton}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          <a href={`tel:${SUPPORT.phoneIntl}`} className={heroButton}><Phone className="h-4 w-4" /> <span className="hidden sm:inline">Call</span></a>
          <button type="button" onClick={guide.open} aria-label="Guide" title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
      />

      <KpiRow cols={4}>
        <KpiCard icon={MessageCircle} color="#16a34a" label="WhatsApp" value={SUPPORT.phone} hint="Sab se jaldi jawab · dabayein" onClick={() => window.open(wa, '_blank', 'noopener')} />
        <KpiCard icon={Phone} color="#2563eb" label="Call" value={SUPPORT.phone} hint="Dabayein" onClick={() => { window.location.href = `tel:${SUPPORT.phoneIntl}`; }} />
        <KpiCard icon={Mail} color="#7c3aed" label="Email" value={SUPPORT.email} hint="Lambi baat ya screenshot" onClick={() => { window.location.href = `mailto:${SUPPORT.email}?subject=${encodeURIComponent('Nafaa madad')}`; }} />
        <KpiCard icon={Globe} color="#0891b2" label="Website" value="nafaa.pk" hint="Kholein" onClick={() => window.open(SUPPORT.website, '_blank', 'noopener')} />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Kya poochna hai? Jaise: udhaar, return, backup…" label="Madad search" />}
        chips={filtered ? <>
          {topicMeta && <FilterChip onRemove={() => setTopic('all')}>{topicMeta.label}</FilterChip>}
          {q && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setTopic('all'); }}>
        <FilterMenu icon={LayoutGrid} label="Mauzoo" value={topic} active={topic !== 'all'} onChange={setTopic}
          options={[{ value: 'all' as const, label: 'Sab mauzoo' }, ...TOPICS.map((t) => ({ value: t.id, label: t.label, icon: t.icon, color: t.color }))]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>3</Kbd> se badlein</>}
        tabs={[
          { id: 'faq', label: 'Sawal jawab', icon: HelpCircle, count: faqs.length },
          { id: 'guides', label: 'Guides', icon: BookOpen, count: guides.length },
          { id: 'contact', label: 'Rabta', icon: MessageCircle },
        ]} />

      {tab === 'faq' && (faqs.length === 0 ? <NoMatch onClear={() => { setSearch(''); setTopic('all'); }} wa={wa} /> : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <ul className="divide-y divide-slate-100">
            {faqs.map((f) => {
              const t = TOPICS.find((x) => x.id === f.topic)!;
              const isOpen = open === f.id || (!!q && faqs.length <= 3);
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : f.id)} aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:px-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.color}17`, color: t.color }}><t.icon className="h-4 w-4" /></span>
                    <span className="flex-1 text-[0.875rem] font-semibold text-slate-900">{f.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && <p className="px-4 pb-4 pl-16 text-[0.875rem] leading-relaxed text-slate-600 sm:px-5 sm:pl-[4.25rem]">{f.a}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {tab === 'guides' && (guides.length === 0 ? <NoMatch onClear={() => { setSearch(''); setTopic('all'); }} wa={wa} /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {guides.map((g) => {
            const t = TOPICS.find((x) => x.id === g.topic)!;
            return (
              <section key={g.id} className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.color}17`, color: t.color }}><g.icon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h3 className="text-[0.9375rem] font-semibold text-slate-900">{g.title}</h3>
                    <p className="truncate text-[0.75rem] text-slate-500">{g.text}</p>
                  </div>
                </div>
                <ol className="mt-3 flex-1 space-y-1.5">
                  {g.steps.map((s, i) => (
                    <li key={s} className="flex items-start gap-2 text-[0.8125rem] text-slate-700">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>{s}
                    </li>
                  ))}
                </ol>
                <Button className="mt-3" variant="secondary" size="sm" onClick={() => navigate(g.to)}>Kholein <ArrowRight className="h-4 w-4" /></Button>
              </section>
            );
          })}
        </div>
      ))}

      {tab === 'contact' && (
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Nafaa support se baat karein</h2>
            <p className="mt-1 text-[0.8125rem] text-slate-500">WhatsApp par aap ki dukaan aur naam pehle se likha hota hai — bas masla likh dein.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <a href={wa} target="_blank" rel="noreferrer"><Button fullWidth><MessageCircle className="h-4 w-4" /> WhatsApp</Button></a>
              <a href={`tel:${SUPPORT.phoneIntl}`}><Button fullWidth variant="secondary"><Phone className="h-4 w-4" /> {SUPPORT.phone}</Button></a>
              <a href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent('Nafaa madad')}`}><Button fullWidth variant="secondary"><Mail className="h-4 w-4" /> {SUPPORT.email}</Button></a>
              <a href={SUPPORT.website} target="_blank" rel="noreferrer"><Button fullWidth variant="ghost"><Globe className="h-4 w-4" /> nafaa.pk</Button></a>
            </div>
          </section>
          <section className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-amber-950"><Lightbulb className="h-4 w-4" /> Jaldi hal ke liye</h2>
            <ul className="mt-2 space-y-1.5 text-[0.8125rem] text-amber-900">
              <li>• Kis page par masla hai, wo batayein.</li>
              <li>• Screen ka screenshot bhejein.</li>
              <li>• Bill ya product ka number likhein.</li>
              <li>• Password ya PIN kabhi kisi ko na bhejein — Nafaa team bhi nahi maangti.</li>
            </ul>
            <Link to="/legal" className="mt-3 inline-block text-[0.8125rem] font-semibold text-amber-900 underline-offset-4 hover:underline">Terms aur privacy →</Link>
          </section>
        </div>
      )}
    </PageShell>
  );
}

function NoMatch({ onClear, wa }: { onClear: () => void; wa: string }) {
  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-200/80">
      <EmptyState icon={<Search className="h-6 w-6" />} title="Is ka jawab yahan nahi mila" description="Doosre lafz se search, ya seedha support se poochein"
        action={<><Button variant="secondary" onClick={onClear}>Filter hatayein</Button><a href={wa} target="_blank" rel="noreferrer"><Button><MessageCircle className="h-4 w-4" /> WhatsApp</Button></a></>} />
    </div>
  );
}
