/**
 * Device and paper frames for real app screenshots (ARCH 4.6).
 *
 * Server components. Each frame wraps `children` (normally <CmsImage> from
 * lib/media.ts) in a `.screen` box; chrome is CSS and tiny inline SVG, and
 * is hidden from assistive tech. The image keeps its own width and height,
 * so frames never cause layout shift.
 */
import type { ReactNode } from 'react';
import styles from './frames.module.css';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export interface FrameProps {
  children: ReactNode;
  className?: string;
}

/** Browser window with traffic lights and an address bar. */
export function BrowserFrame({ children, className, url = 'app.nafaa.pk' }: FrameProps & { url?: string }) {
  return (
    <div className={cx(styles.browser, className)}>
      <div className={styles.browserBar} aria-hidden="true">
        <span className={styles.lights}>
          <span />
          <span />
          <span />
        </span>
        <span className={styles.address}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>{url}</span>
        </span>
        <span />
      </div>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}

/** Neutral Android phone: bezel, punch-hole camera, side keys. */
export function PhoneFrame({ children, className }: FrameProps) {
  return (
    <div className={cx(styles.phone, className)}>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}

/** Tablet with an even bezel. */
export function TabletFrame({ children, className }: FrameProps) {
  return (
    <div className={cx(styles.tablet, className)}>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}

/** Windows desktop app window: title bar with the Nafaa mark and window controls. */
export function DesktopFrame({ children, className, title = 'Nafaa' }: FrameProps & { title?: string }) {
  return (
    <div className={cx(styles.desktop, className)}>
      <div className={styles.titleBar} aria-hidden="true">
        <svg className={styles.appMark} viewBox="0 0 80 80">
          <rect x="4" y="4" width="72" height="72" rx="18" className={styles.appMarkBox} />
          <path d="M24 26V58L56 26M47 26H56V35M56 26V58" className={styles.appMarkStroke} strokeWidth="8" />
        </svg>
        <span className={styles.titleText}>{title}</span>
        <span className={styles.winControls}>
          <span>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M0 5.5h10" />
            </svg>
          </span>
          <span>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          </span>
          <span>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M0 0l10 10M10 0L0 10" />
            </svg>
          </span>
        </span>
      </div>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}

/** 80 mm thermal receipt with a torn bottom edge (for the FBR receipt screenshot). */
export function ReceiptFrame({ children, className }: FrameProps) {
  return (
    <div className={cx(styles.receipt, className)}>
      <div className={styles.paper}>
        <div className={styles.screen}>{children}</div>
      </div>
    </div>
  );
}

/** No device chrome: rounded corners, hairline border and shadow. */
export function PlainFrame({ children, className }: FrameProps) {
  return (
    <div className={cx(styles.plain, className)}>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}
