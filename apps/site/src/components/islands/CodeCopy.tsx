'use client';

/**
 * Copy button for code panels (codeSample block and fenced code in rich
 * text). The code itself is server-rendered; this island only reads the
 * visible panel's text from the DOM and writes it to the clipboard.
 *
 * Markup contract (parts/CodePanel.tsx): the button sits inside
 * `[data-code-root]`; panels carry `data-code-panel="<index>"`; tab radios
 * carry `data-code-tab` with value = index. Without tabs the first panel is
 * copied.
 */
import { useEffect, useRef, useState } from 'react';

export interface CodeCopyProps {
  label: string;
  copiedLabel: string;
  className?: string;
}

function visibleCode(button: HTMLElement): string {
  const root = button.closest<HTMLElement>('[data-code-root]');
  if (!root) return '';
  const checked = root.querySelector<HTMLInputElement>('input[data-code-tab]:checked');
  const index = checked?.value ?? '0';
  const panel = root.querySelector<HTMLElement>(`[data-code-panel="${index}"]`) ?? root.querySelector<HTMLElement>('[data-code-panel]');
  return panel?.querySelector('code')?.textContent ?? '';
}

export function CodeCopy({ label, copiedLabel, className }: CodeCopyProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy(event: React.MouseEvent<HTMLButtonElement>) {
    const text = visibleCode(event.currentTarget);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers: select-and-copy through a temporary textarea.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.className = 'sr-only';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button type="button" onClick={copy} className={className} data-copied={copied ? '' : undefined}>
      <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
