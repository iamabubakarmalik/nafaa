/**
 * What a settings page shares with the Settings frame around it:
 *  - a slot in the frame's header for the save state and page actions
 *    (<HeaderActions>; outside the frame the content renders in place);
 *  - links that open a settings page and point at one card on it
 *    (<SettingLink find="…">; the frame scrolls to the card holding that text).
 */

import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

export const SettingsHeaderSlot = createContext<HTMLElement | null>(null);

/** Location state key read by the frame: the text of the card to scroll to. */
export const SETTING_FIND_KEY = 'settingFind';

export function HeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(SettingsHeaderSlot);
  return slot ? createPortal(children, slot) : <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function SettingLink({ to, find, className, children }: { to: string; find?: string; className?: string; children: ReactNode }) {
  return <Link to={to} state={find ? { [SETTING_FIND_KEY]: find } : undefined} className={className}>{children}</Link>;
}
