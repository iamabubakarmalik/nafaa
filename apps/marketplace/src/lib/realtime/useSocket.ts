import { useEffect, useRef } from 'react';
import { getSocket } from './socket';
import { useCustomerAuthStore } from '@stores/customerAuth.store';

export function useSocket() {
  const isAuth = useCustomerAuthStore((s) => s.isAuthenticated);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    if (!isAuth) return;
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();
  }, [isAuth]);

  return socketRef.current;
}

/** Subscribe to a specific event */
export function useSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void,
  deps: any[] = [],
) {
  const socket = useSocket();
  useEffect(() => {
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, socket, ...deps]);
}

/** Join a room (bargain / auction / order / live-shop) */
export function useJoinRoom(type: 'bargain' | 'auction' | 'live-shop' | 'order', id?: string) {
  const socket = useSocket();
  useEffect(() => {
    if (!id) return;
    socket.emit(`join:${type}`, { [`${type === 'live-shop' ? 'liveShopId' : type + 'Id'}`]: id });
    return () => {
      socket.emit(`leave:${type}`, { [`${type === 'live-shop' ? 'liveShopId' : type + 'Id'}`]: id });
    };
  }, [type, id, socket]);
}
