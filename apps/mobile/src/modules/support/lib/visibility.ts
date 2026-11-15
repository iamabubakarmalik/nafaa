/**
 * Whether the support chat is on screen. Kept free of imports so the push
 * set-up (notifications module) can read it without an import cycle.
 */

let visibleChats = 0;

/** Called by the chat screen while it is focused. Returns the undo. */
export function markChatVisible(): () => void {
  visibleChats += 1;
  return () => { visibleChats = Math.max(0, visibleChats - 1); };
}

/** True while the support chat is on screen (pushes for it are hidden then). */
export const isSupportChatVisible = () => visibleChats > 0;

/** Whether a received notification belongs to live support. */
export function isSupportNotification(data: unknown): boolean {
  const d = (data ?? {}) as { kind?: unknown; link?: unknown };
  return d.kind === 'support' || d.link === '/support';
}
