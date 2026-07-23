import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_MARKETPLACE_WS_URL || 'http://localhost:4000';

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('marketplace_token');
    socket = io(`${SOCKET_URL}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('🟢 WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('🔴 WebSocket disconnected');
    });

    socket.on('unauthorized', () => {
      console.warn('WebSocket auth failed');
      disconnectSocket();
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectWithToken() {
  disconnectSocket();
  return getSocket();
}
