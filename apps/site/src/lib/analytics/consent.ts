/**
 * Consent for third-party analytics (GTM/GA4, Clarity). First-party pageviews
 * and events go to Nafaa's own API and need no banner; third-party scripts
 * load only after the visitor accepts. The choice is kept per browser in
 * localStorage and shared between islands through a window event.
 */
import { STORAGE_KEYS } from './track';

export type ConsentChoice = 'granted' | 'denied';
export const CONSENT_EVENT = 'nafaa:consent';
/** Dispatch to reopen the banner (for example from a "Cookie settings" link). */
export const CONSENT_OPEN_EVENT = 'nafaa:consent-open';

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.consent);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.consent, choice);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }));
}
