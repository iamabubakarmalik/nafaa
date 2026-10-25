/**
 * BuildArt: a code-drawn illustration for the build services (custom
 * software, websites, stores, apps) whose heroes have no screenshot. A
 * browser window with a skeleton page, a phone with a skeleton app and a code
 * card, layered on the hero stage, with the stack the team builds with as
 * labels. Purely decorative: no product data, no numbers, aria-hidden.
 */
import { BrowserFrame, PhoneFrame } from '@/components/frames';
import { cx } from '@/components/ui/cx';
import styles from './art.module.css';

const STACK = ['React', 'Next.js', 'React Native', 'NestJS', 'PostgreSQL'];

function Bar({ w, tone = 'muted', className }: { w: string; tone?: 'muted' | 'strong' | 'brand'; className?: string }) {
  return <span className={cx(styles.bar, styles[tone], className)} style={{ '--w': w }} />;
}

export function BuildArt({ variant = 'web' }: { variant?: 'web' | 'app' }) {
  return (
    <div aria-hidden dir="ltr" className={styles.wrap}>
      <div className={styles.glow} />
      <div className={cx(styles.browser, variant === 'app' && styles.browserBack)}>
        <BrowserFrame url="your-business.com">
          <div className={styles.page}>
            <div className={styles.nav}>
              <span className={styles.logo} />
              <Bar w="12%" />
              <Bar w="10%" />
              <Bar w="11%" />
              <span className={styles.navCta} />
            </div>
            <div className={styles.heroRow}>
              <div className={styles.heroText}>
                <Bar w="38%" tone="brand" className={styles.thin} />
                <Bar w="86%" tone="strong" className={styles.thick} />
                <Bar w="70%" tone="strong" className={styles.thick} />
                <Bar w="92%" />
                <Bar w="80%" />
                <div className={styles.ctas}>
                  <span className={styles.btn} />
                  <span className={styles.btnGhost} />
                </div>
              </div>
              <div className={styles.heroImage}>
                <span className={styles.shine} />
              </div>
            </div>
            <div className={styles.cards}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.card}>
                  <span className={styles.cardIcon} />
                  <Bar w="60%" tone="strong" />
                  <Bar w="90%" />
                  <Bar w="75%" />
                </div>
              ))}
            </div>
          </div>
        </BrowserFrame>
      </div>

      <div className={styles.code}>
        <div className={styles.codeHead}>
          <span />
          <span />
          <span />
          <em>orders.ts</em>
        </div>
        <pre>
          <code>
            <i className={styles.k}>export async function</i> <i className={styles.f}>createOrder</i>(req) {'{'}
            {'\n'}  <i className={styles.k}>const</i> order = <i className={styles.k}>await</i> db.order.<i className={styles.f}>create</i>({'{'} data: req.body {'}'});
            {'\n'}  <i className={styles.k}>await</i> stock.<i className={styles.f}>reserve</i>(order.items);
            {'\n'}  <i className={styles.k}>await</i> notify.<i className={styles.f}>whatsapp</i>(order.customer, <i className={styles.s}>&apos;confirmed&apos;</i>);
            {'\n'}  <i className={styles.k}>return</i> order;
            {'\n'}{'}'}
            <span className={styles.caret} />
          </code>
        </pre>
      </div>

      <div className={styles.phone}>
        <PhoneFrame>
          <div className={styles.app}>
            <div className={styles.appTop}>
              <Bar w="45%" tone="strong" />
              <span className={styles.avatar} />
            </div>
            <div className={styles.appHero}>
              <Bar w="50%" className={styles.onBrand} />
              <Bar w="70%" className={cx(styles.onBrand, styles.thick)} />
            </div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.appRow}>
                <span className={styles.appDot} />
                <div className={styles.appRowText}>
                  <Bar w="70%" tone="strong" />
                  <Bar w="45%" />
                </div>
              </div>
            ))}
            <span className={styles.appCta} />
          </div>
        </PhoneFrame>
      </div>

      <ul className={styles.stack}>
        {STACK.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
