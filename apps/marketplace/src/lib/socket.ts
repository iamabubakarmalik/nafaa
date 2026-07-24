import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_MARKETPLACE_WS_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('marketplace_token');
    socket = io(`${WS_URL}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: !!token,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  const token = localStorage.getItem('marketplace_token');
  if (token) {
    s.auth = { token };
    if (!s.connected) s.connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
