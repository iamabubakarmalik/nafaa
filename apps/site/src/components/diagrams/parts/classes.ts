/** Class helpers for diagram parts. */
import styles from '../diagrams.module.css';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Loop delay class, 0.4 s per step (0-19). */
export function delayClass(step: number): string | undefined {
  const clamped = Math.max(0, Math.min(19, Math.round(step)));
  return styles[`d${clamped}`];
}

/** Scroll reveal stagger class (0-9). Step 0 uses the base range. */
export function revealClass(step: number): string | undefined {
  const clamped = Math.max(0, Math.min(9, Math.round(step)));
  return clamped === 0 ? undefined : styles[`r${clamped}`];
}
