/**
 * A code panel: one or more highlighted tabs, a language label and a copy
 * button. Tabs are radio inputs switched by CSS (works with no JS); only the
 * copy button is an island. Always dark, in both site themes, so code reads
 * the same everywhere.
 */
import { CodeCopy } from '@/components/islands/CodeCopy';
import { highlight, normalizeLanguage } from '../rich-text/highlight';
import styles from '../blocks.module.css';

export interface CodeTab {
  label: string;
  language: string;
  code: string;
}

const LANGUAGE_LABEL: Record<string, string> = {
  bash: 'Shell',
  http: 'HTTP',
  json: 'JSON',
  js: 'JavaScript',
  ts: 'TypeScript',
  python: 'Python',
  php: 'PHP',
};

function Highlighted({ code, language }: { code: string; language: string }) {
  const tokens = highlight(code.replace(/\n+$/, ''), language);
  return (
    <code>
      {tokens.map((token, i) =>
        token.cls ? (
          <span key={i} className={styles[`tk${token.cls.toUpperCase()}`]}>
            {token.text}
          </span>
        ) : (
          token.text
        ),
      )}
    </code>
  );
}

export function CodePanel({
  id,
  tabs,
  copyLabel,
  copiedLabel,
  label,
}: {
  /** Unique per page (the radio group name). */
  id: string;
  tabs: readonly CodeTab[];
  copyLabel: string;
  copiedLabel: string;
  /** Accessible name for the tab group. */
  label: string;
}) {
  const many = tabs.length > 1;
  const first = tabs[0];
  if (!first) return null;
  return (
    <div className={styles.code} data-code-root="">
      <div className={styles.codeBar}>
        {many ? (
          <div role="radiogroup" aria-label={label} className={styles.codeTabs}>
            {tabs.map((tab, i) => (
              <label key={i} className={styles.codeTab}>
                <input type="radio" name={`code-${id}`} value={String(i)} defaultChecked={i === 0} data-code-tab="" className="sr-only" />
                <span>{tab.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <span className={styles.codeLang}>{first.label || LANGUAGE_LABEL[normalizeLanguage(first.language) ?? ''] || first.language}</span>
        )}
        <CodeCopy label={copyLabel} copiedLabel={copiedLabel} className={styles.codeCopy} />
      </div>
      {tabs.map((tab, i) => (
        <div key={i} data-code-panel={String(i)} className={styles.codePanel}>
          <pre tabIndex={0} aria-label={`${tab.label || label} (${LANGUAGE_LABEL[normalizeLanguage(tab.language) ?? ''] ?? tab.language})`}>
            <Highlighted code={tab.code} language={tab.language} />
          </pre>
        </div>
      ))}
    </div>
  );
}
