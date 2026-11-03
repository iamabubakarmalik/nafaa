/**
 * Opens a shell sheet from a link: nafaa://?sheet=create (also from home-screen
 * shortcuts and notifications). Values: create, profile, shop, workspace, sync.
 */

import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useShellUi } from './hooks/useShellUi';

const SHEETS = ['create', 'profile', 'shop', 'workspace', 'sync'] as const;
type SheetName = (typeof SHEETS)[number];

export function useSheetLink() {
  const url = Linking.useURL();
  const open = useShellUi((s) => s.open);
  useEffect(() => {
    if (!url) return;
    const sheet = Linking.parse(url).queryParams?.sheet;
    if (typeof sheet !== 'string' || !(SHEETS as readonly string[]).includes(sheet)) {
      // Any other link leads somewhere else: close what was open.
      useShellUi.getState().close();
      return;
    }
    // Not cleared on the next URL change: the router resets the URL right after handling it.
    // After the app is active again and the route has settled.
    setTimeout(() => {
      useShellUi.getState().close();
      setTimeout(() => open(sheet as SheetName), 120);
    }, 1200);
  }, [url, open]);
}
