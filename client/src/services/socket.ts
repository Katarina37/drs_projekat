import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_WS_URL ||
  'https://moj-server-latest.onrender.com';

export const createSocket = (namespace: string): Socket => {
  const normalized = namespace.startsWith('/') ? namespace : `/${namespace}`;
  
  // Spajamo URL i namespace, ali dodajemo konfiguracioni objekat
  return io(`${SOCKET_URL}${normalized}`, {
    // OVO JE KLJUČNO: Isključuje polling i koristi direktno WebSocket
    transports: ['websocket'], 
    upgrade: false,
    // Osigurava da se koristi wss:// umesto ws:// na produkciji
    secure: true, 
    // Automatsko rekonektovanje ako pukne veza
    reconnection: true,
    reconnectionAttempts: 5
  });
};

