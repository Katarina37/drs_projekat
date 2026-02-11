import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_WS_URL ||
  'https://moj-server-latest.onrender.com';

export const createSocket = (namespace: string): Socket => {
  const normalized = namespace.startsWith('/') ? namespace : `/${namespace}`;
  return io(`${SOCKET_URL}${normalized}`);
};
