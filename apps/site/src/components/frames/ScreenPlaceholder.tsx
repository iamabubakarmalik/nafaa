/**
 * Neutral stand-in for a screenshot, used only by the _dev gallery until
 * the capture script (F4) has uploaded real screenshots. Never shown on
 * public pages.
 */
import styles from './frames.module.css';

const RATIO = {
  desktop: styles.ratioDesktop,
  phone: styles.ratioPhone,
  tablet: styles.ratioTablet,
  receipt: styles.ratioReceipt,
} as const;

export function ScreenPlaceholder({ shape = 'desktop', label = 'Screenshot' }: { shape?: keyof typeof RATIO; label?: string }) {
  const tiles = shape === 'phone' || shape === 'receipt' ? 6 : 12;
  return (
    <div className={[styles.placeholder, RATIO[shape]].join(' ')} role="img" aria-label={label}>
      <span className={styles.phTop} />
      <span className={styles.phGrid}>
        {Array.from({ length: tiles }, (_, i) => (
          <span key={i} />
        ))}
      </span>
      <span className={styles.phLabel}>{label}</span>
    </div>
  );
}
