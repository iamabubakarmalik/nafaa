/**
 * Connection status for the whole app (kept tiny on purpose; the offline
 * engine in core/offline builds on it). Feeds React Query's onlineManager,
 * so queries pause offline and refetch when the connection returns.
 *
 *   const online = useOnlineStatus();   isOnline()   on('network:changed', …)
 */

import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';
import { create } from 'zustand';
import { emit } from '../events';

interface NetworkState {
  online: boolean;
  /** Connected to a network but the internet is not reachable. */
  limited: boolean;
}

export const useNetworkStore = create<NetworkState>(() => ({ online: true, limited: false }));

function apply(state: Network.NetworkState) {
  const online = state.isConnected !== false && state.isInternetReachable !== false;
  const prev = useNetworkStore.getState().online;
  useNetworkStore.setState({ online, limited: state.isConnected === true && state.isInternetReachable === false });
  if (prev !== online) emit('network:changed', { online });
}

let started = false;

/** Call once at startup. */
export function startNetworkWatch() {
  if (started) return;
  started = true;
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((state) => {
      apply(state);
      setOnline(useNetworkStore.getState().online);
    });
    Network.getNetworkStateAsync().then((state) => {
      apply(state);
      setOnline(useNetworkStore.getState().online);
    }).catch(() => undefined);
    return () => sub.remove();
  });
}

export const useOnlineStatus = () => useNetworkStore((s) => s.online);
export const isOnline = () => useNetworkStore.getState().online;
