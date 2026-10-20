/**
 * ApiHero: the opening panel of the /developers root page. A terminal with
 * the first request (GET /v1/me) and the shape of its response, taken from
 * apps/api/src/integrations/public-api (PublicApiService.me), plus three
 * quick-start tiles. Ids and names are placeholders, not real data.
 */
import Link from 'next/link';
import { CmsIcon } from '@/lib/icons';
import styles from './docs.module.css';

const TILES = [
  { icon: 'key-round', title: 'Authenticate', body: 'Create a key in Settings → Developer and send it as a bearer token.', href: '/developers/authentication' },
  { icon: 'database', title: 'Read your data', body: 'Products, stock, customers, sales and online orders, page by page.', href: '/developers/products' },
  { icon: 'webhook', title: 'Get webhooks', body: 'Signed events for sales, orders, customers and low stock.', href: '/developers/webhooks' },
];

export function ApiHero({ live }: { live: ReadonlySet<string> }) {
  return (
    <div className="mt-10 max-w-prose">
      <div className={styles.terminal}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.bar}>
          <span />
          <span />
          <span />
          <em>Your first request</em>
        </div>
        <pre className={styles.pre}>
          <code>
            <i className={styles.dim}>$</i> curl https://api.nafaa.pk/api/v1/me \{'\n'}
            {'    '}-H <i className={styles.str}>&quot;Authorization: Bearer nfk_your_key&quot;</i>
            {'\n\n'}
            <i className={styles.dim}>{'{'}</i>
            {'\n  '}<i className={styles.key}>&quot;business&quot;</i>: {'{ '}<i className={styles.key}>&quot;id&quot;</i>: <i className={styles.str}>&quot;…&quot;</i>, <i className={styles.key}>&quot;name&quot;</i>: <i className={styles.str}>&quot;Your business&quot;</i>{' },'}
            {'\n  '}<i className={styles.key}>&quot;shops&quot;</i>: [{'{ '}<i className={styles.key}>&quot;name&quot;</i>: <i className={styles.str}>&quot;Main branch&quot;</i>, <i className={styles.key}>&quot;isMain&quot;</i>: <i className={styles.num}>true</i>{' }'}],
            {'\n  '}<i className={styles.key}>&quot;key&quot;</i>: {'{ '}<i className={styles.key}>&quot;scope&quot;</i>: <i className={styles.str}>&quot;read&quot;</i>, <i className={styles.key}>&quot;shopId&quot;</i>: <i className={styles.num}>null</i>{' },'}
            {'\n  '}<i className={styles.key}>&quot;apiVersion&quot;</i>: <i className={styles.num}>1</i>
            {'\n'}<i className={styles.dim}>{'}'}</i>
          </code>
        </pre>
      </div>
      <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-3">
        {TILES.filter((t) => live.has(t.href)).map((t) => (
          <li key={t.href} className="group relative rounded-lg border border-line bg-surface p-4 transition-[border-color,box-shadow,transform] duration-fast hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-e2">
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-500/10 text-link">
              <CmsIcon name={t.icon} size={16} />
            </span>
            <Link href={t.href} className="mt-3 block font-medium text-fg-strong after:absolute after:inset-0 group-hover:text-link">
              {t.title}
            </Link>
            <p className="mt-1 text-small text-fg-muted">{t.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
