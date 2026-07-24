import { useEffect, useRef } from 'react';
import { getSocket } from './socket';

export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const wrapper = (data: T) => handlerRef.current(data);
    socket.on(event, wrapper);
    return () => { socket.off(event, wrapper); };
  }, [event]);
}

export function useJoinRoom(room: 'bargain' | 'auction' | 'live-shop' | 'order', id?: string) {
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit(`join:${room}`, { [`${room}Id`]: id, orderId: room === 'order' ? id : undefined });
    return () => {
      socket.emit(`leave:${room}`, { [`${room}Id`]: id });
    };
  }, [room, id]);
}
