/** Sheets and overlays the shell mounts once for the whole signed-in app. */

import { CreateSheet } from './CreateSheet';
import { ProfileSheet } from './ProfileSheet';
import { ShopSheet, WorkspaceSheet } from './ShopSheet';
import { SyncSheet } from './SyncStatus';
import { SubscriptionGate } from './SubscriptionGate';
import { useSheetLink } from '../useSheetLink';

export function ShellSheets() {
  useSheetLink();
  return (
    <>
      <CreateSheet />
      <ProfileSheet />
      <ShopSheet />
      <WorkspaceSheet />
      <SyncSheet />
      <SubscriptionGate />
    </>
  );
}
