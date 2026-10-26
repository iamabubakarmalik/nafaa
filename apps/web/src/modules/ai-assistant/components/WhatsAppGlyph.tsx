/** Simple WhatsApp-style chat glyph (lucide has no brand icons). Uses currentColor. */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
      <path d="M9 9.5c.3 1.6 1.9 3.6 3.6 4.4l1.2-1.1 2 .9c-.2 1.1-1 1.8-2 1.8-3 0-6.1-3.1-6.1-6.1 0-1 .7-1.8 1.8-2l.9 2z" />
    </svg>
  );
}
