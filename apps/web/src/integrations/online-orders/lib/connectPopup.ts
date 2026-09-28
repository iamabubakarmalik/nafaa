/**
 * Shopify-jaisa "Connect" popup: beech me chhoti window, us me platform ka
 * apna login/approve safha. Kaam hote hi done-page `postMessage` bhejta hai
 * aur khud band ho jata hai. Popup block ho to poore tab me khol dete hain
 * (done-page wapas channel par le aata hai).
 */
export const CONNECT_MESSAGE = 'nafaa:channel-connected';

export interface ConnectMessage {
  type: typeof CONNECT_MESSAGE;
  channelId: string;
  success: boolean;
}

export function openConnectPopup(url: string): Window | null {
  const w = 560;
  const h = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
  const popup = window.open(url, 'nafaa-connect', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  if (!popup || popup.closed) return null;
  popup.focus();
  return popup;
}

/** Popup ka jawab suno — sirf apne origin se */
export function onConnectMessage(cb: (m: ConnectMessage) => void) {
  const handler = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    const d = e.data as ConnectMessage;
    if (d?.type === CONNECT_MESSAGE && typeof d.channelId === 'string') cb(d);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
