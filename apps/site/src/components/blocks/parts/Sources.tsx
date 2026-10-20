/**
 * A list of outbound citations (sources block, comparison table footnotes).
 * Official domains are followed and every link stays in the same tab.
 */
import type { Source } from '@/lib/cms/contract/cms-contract';
import { formatDate, isoDate } from '../lib/format';
import { strings } from '../lib/i18n';
import { SmartLink } from './SmartLink';

export function SourceList({ items, locale, compact = false }: { items: readonly Source[]; locale: string; compact?: boolean }) {
  const t = strings(locale);
  return (
    <ol className={compact ? 'space-y-1.5 text-small' : 'space-y-3'}>
      {items.map((source, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-0.5 font-mono text-xs tabular-nums text-fg-subtle">
            [{i + 1}]
          </span>
          <span className="min-w-0">
            <SmartLink href={source.url} className="font-medium text-link underline decoration-link/30 underline-offset-[3px] hover:decoration-current">
              {source.title}
            </SmartLink>
            <span className="text-fg-subtle">
              {' '}
              · {source.publisher} · {t.accessed}{' '}
              <time dateTime={isoDate(source.accessedAt)}>{formatDate(source.accessedAt, locale)}</time>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
