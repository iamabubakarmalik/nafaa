/**
 * Floating WhatsApp button on every page (site shell). Server component, no
 * JavaScript: CSS handles the entrance, the hover/focus label and the
 * online dot. The Noon mark sits in the button with a small WhatsApp badge.
 *
 * Number: site settings `whatsapp` first, then the entity contact phone
 * (digits only). Without either, nothing renders. Clicks are recorded by
 * the Analytics island through data-track="whatsapp_click".
 */
import { LOGO_BOWL, LOGO_DOT } from '@/lib/brand/logo';
import { whatsappHref } from '@/components/blocks/lib/links';
import styles from './whatsapp-fab.module.css';

export function WhatsAppFab({ whatsapp, phone }: { whatsapp?: { number: string; message: string } | null; phone?: string | null }) {
  const digits = phone?.replace(/\D/g, '') ?? '';
  const href = whatsappHref(whatsapp) ?? (digits.length >= 8 ? `https://wa.me/${digits.replace(/^0/, '92')}` : null);
  if (!href) return null;
  return (
    <>
      <a
        href={href}
        rel="noopener"
        className={styles.fab}
        data-track="whatsapp_click"
        data-track-label="Floating WhatsApp button"
        aria-label="Chat with Nafaa on WhatsApp"
      >
        <span aria-hidden className={styles.mark}>
          <svg viewBox="112 112 288 288" className={styles.noon}>
            <path d={LOGO_BOWL} fill="currentColor" />
            <path d={LOGO_DOT} fill="#fbbf24" />
          </svg>
          <span className={styles.wa}>
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.7l4.8-1.3A9.8 9.8 0 1 0 12 2.2zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2c0 1.2.9 2.3 1 2.5.1.2 1.7 2.6 4.1 3.6 1.5.7 2.1.7 2.9.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.3z"
              />
            </svg>
          </span>
          <span className={styles.online} />
        </span>
        <span className={styles.label}>
          <span className={styles.labelTitle}>Chat on WhatsApp</span>
          <span className={styles.labelNote}>English ya Roman Urdu me</span>
        </span>
      </a>
      <span aria-hidden className={styles.spacer} />
    </>
  );
}
