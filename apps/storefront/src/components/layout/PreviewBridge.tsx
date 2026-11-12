'use client';

/**
 * Theme editor link (draft preview only). The editor in the Nafaa web app
 * shows the storefront in an iframe and talks to it with postMessage:
 *   { type: 'nafaa:refresh' }                 re-render with the saved draft
 *   { type: 'nafaa:select', sectionId }       scroll to and outline a section
 *   { type: 'nafaa:hover', sectionId | null } light outline while hovering
 * The storefront answers { type: 'nafaa:ready', path } on load and on every
 * navigation, and { type: 'nafaa:clicked', sectionId } when a section is
 * clicked, so the editor can open its settings.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function PreviewBridge({ label }: { label: string }) {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: 'nafaa:ready', path }, '*');
  }, [path]);

  useEffect(() => {
    const outline = (id: string | null, cls: string) => {
      document.querySelectorAll(`.${cls}`).forEach((n) => n.classList.remove(cls));
      if (!id) return null;
      const el = document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(id)}"]`);
      el?.classList.add(cls);
      return el;
    };
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; sectionId?: string | null } | null;
      if (!d || typeof d.type !== 'string') return;
      if (d.type === 'nafaa:refresh') router.refresh();
      if (d.type === 'nafaa:select') outline(d.sectionId ?? null, 'nf-selected')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (d.type === 'nafaa:hover') outline(d.sectionId ?? null, 'nf-hover');
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-section-id]');
      if (el && window.parent !== window) window.parent.postMessage({ type: 'nafaa:clicked', sectionId: el.dataset.sectionId }, '*');
    };
    window.addEventListener('message', onMsg);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('message', onMsg);
      document.removeEventListener('click', onClick, true);
    };
  }, [router]);

  return (
    <>
      <style>{`[data-section-id]{scroll-margin-top:88px}.nf-selected{outline:2px solid #2563eb;outline-offset:-2px}.nf-hover{outline:2px dashed #60a5fa;outline-offset:-2px}`}</style>
      <div className="pointer-events-none fixed bottom-3 start-1/2 z-[80] -translate-x-1/2 rounded-full bg-neutral-900/90 px-3 py-1.5 text-[12px] font-medium text-white shadow-pop rtl:translate-x-1/2">{label}</div>
    </>
  );
}
