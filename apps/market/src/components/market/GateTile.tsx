/** Home gate tile in the gate's industry colour. */
import Link from 'next/link';
import { pick } from '@/lib/i18n';
import { GATE_LOOK } from '@/lib/site';
import type { GateDef, Lang } from '@/lib/types';
import { GateIcon } from './GateIcon';

export function GateTile({ gate, lang, href }: { gate: GateDef; lang: Lang; href: string }) {
  const color = GATE_LOOK[gate.id]?.color ?? '#9333ea';
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3 shadow-card ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-card-lg md:p-4"
      style={{ background: `linear-gradient(150deg, ${color}1f 0%, ${color}0a 55%, ${color}29 100%)` }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-soft md:h-12 md:w-12" style={{ background: color }}>
        <GateIcon gate={gate.id} className="h-6 w-6" />
      </span>
      <span className="mt-3 block">
        <span className="block text-sm font-bold text-gray-900 md:text-base">{pick(gate.label, lang)}</span>
        <span className="mt-0.5 line-clamp-2 block text-2xs leading-snug text-gray-600 md:text-xs">{pick(gate.tagline, lang)}</span>
      </span>
      <span className="absolute -end-5 -top-5 h-20 w-20 rounded-full opacity-20 transition group-hover:scale-110" style={{ background: color }} aria-hidden />
    </Link>
  );
}
