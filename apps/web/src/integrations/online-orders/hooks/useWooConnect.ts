import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { onConnectMessage, openConnectPopup } from '../lib/connectPopup';
import { CHANNELS_KEY } from './useSalesChannels';

export type WooPhase = 'idle' | 'starting' | 'waiting' | 'manual' | 'connected' | 'denied' | 'error';

/**
 * WooCommerce ek click: URL → popup (WordPress login + Approve) → keys khud
 * Nafaa ko → yahan "connected". Popup ka message na aaye (browser ne roka)
 * to har 2 second channel check karte hain.
 */
export function useWooConnect(onConnected?: (channelId: string) => void) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<WooPhase>('idle');
  const [channelId, setChannelId] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<{ reason: string | null; fix: string | null } | null>(null);
  // API bahar se https par na dikhe to WooCommerce popup "callback_url needs SSL" deta hai —
  // pehle se pata ho to popup kholte hi nahi, seedha keys wala raasta
  const caps = useQuery({ queryKey: ['online-store-capabilities'], queryFn: onlineOrdersApi.capabilities, staleTime: 5 * 60_000 });
  const oneClickReady = caps.data?.publicApi.reachable ?? true;
  const popupRef = useRef<Window | null>(null);
  const doneRef = useRef(onConnected);
  doneRef.current = onConnected;

  const finish = useCallback((id: string) => {
    setPhase('connected');
    popupRef.current?.close();
    qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    qc.invalidateQueries({ queryKey: ['sales-channel', id] });
    toast.success('🎉 WooCommerce jur gaya!', { description: 'Webhooks khud lag gaye — ab orders seedhe Nafaa me aayenge' });
    doneRef.current?.(id);
  }, [qc]);

  // Popup se message
  useEffect(() => onConnectMessage((m) => {
    if (m.channelId !== channelId) return;
    if (m.success) finish(m.channelId);
    else { setPhase('denied'); popupRef.current?.close(); }
  }), [channelId, finish]);

  // Message na aaye to bhi pata chale
  useEffect(() => {
    if (phase !== 'waiting' || !channelId) return;
    const t = setInterval(async () => {
      try {
        const o = await onlineOrdersApi.channel(channelId);
        if (o.integration?.woo?.connected) finish(channelId);
      } catch { /* agli dafa */ }
    }, 2500);
    return () => clearInterval(t);
  }, [phase, channelId, finish]);

  const start = useCallback(async (body: { siteUrl: string; displayName?: string; shopId?: string; channelId?: string }) => {
    setError(null);
    setPhase('starting');
    // Popup click ke foran khulna chahiye warna browser block karta hai —
    // pehle khali window kholo, URL aane par us me bhejo
    const blank = oneClickReady ? openConnectPopup('about:blank') : null;
    try {
      const res = await onlineOrdersApi.wooStart(body);
      setChannelId(res.channelId);
      setAuthUrl(res.authUrl);
      if (!res.authUrl) {
        blank?.close();
        setHint({ reason: res.reason, fix: res.fix });
        setPhase('manual');
        return res;
      }
      if (blank) {
        blank.location.href = res.authUrl;
        popupRef.current = blank;
      } else {
        popupRef.current = openConnectPopup(res.authUrl);
      }
      setPhase('waiting');
      if (!popupRef.current) toast.message('Popup band tha — neeche "WordPress kholein" dabayein');
      return res;
    } catch (e) {
      blank?.close();
      const msg = apiErrorMessage(e, 'Shuru nahi ho saka');
      setError(msg);
      setPhase('error');
      return null;
    }
  }, [oneClickReady]);

  /** Popup band ho gaya ya khula hi nahi — dobara ya poore tab me */
  const reopen = useCallback((fullTab = false) => {
    if (!authUrl) return;
    if (fullTab) { window.location.href = authUrl; return; }
    popupRef.current = openConnectPopup(authUrl);
    if (!popupRef.current) window.location.href = authUrl;
  }, [authUrl]);

  const reset = useCallback(() => {
    popupRef.current?.close();
    setPhase('idle');
    setError(null);
  }, []);

  return { phase, channelId, authUrl, error, hint, oneClickReady, publicApi: caps.data?.publicApi, start, reopen, reset };
}
