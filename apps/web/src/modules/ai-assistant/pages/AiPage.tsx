/**
 * Full-page Nafaa AI (/ai): saved chats on the left, the chat in the
 * middle and reorder suggestions on the right on wide screens. The chat is
 * the same one the side panel shows, so a conversation carries over when
 * the user expands or collapses it.
 */

import { useEffect } from 'react';
import { AiChat } from '../components/AiChat';
import { AiHistory } from '../components/AiHistory';
import { ReorderSuggestions } from '../components/AiReorderPanel';
import { useAiStore } from '../store';
import { hasPermission, PERMISSIONS } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';

export default function AiPage() {
  const setOpen = useAiStore((s) => s.setOpen);
  const user = useAuthStore((s) => s.user);
  const canStock = hasPermission(user?.role, user?.permissions, PERMISSIONS.LOW_STOCK_VIEW);

  // The page replaces the side panel while it is open.
  useEffect(() => { setOpen(false); }, [setOpen]);
  useEffect(() => { document.title = 'Nafaa AI · Nafaa'; }, []);

  return (
    <div className="-m-3 flex h-[calc(100dvh-3.5rem)] min-h-0 sm:-m-5 sm:h-[calc(100dvh-4rem)] xl:-m-6">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:flex" aria-label="Purani chats">
        <div className="flex h-14 items-center border-b border-slate-200 px-4 text-[0.8125rem] font-semibold text-slate-700">Purani chats</div>
        <AiHistory className="flex-1" />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Nafaa AI chat">
        <AiChat variant="page" />
      </section>
      {canStock && (
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 2xl:block" aria-label="Reorder suggestions">
          <ReorderSuggestions />
        </aside>
      )}
    </div>
  );
}
