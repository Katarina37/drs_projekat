import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createSocket } from '../services/socket';
import { authApi } from '../services/api';
import type { Ticket } from '../types';

export function RealtimeListener() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) return;

    const socket = createSocket('/user');

    const refreshUser = async () => {
      try {
        const response = await authApi.getProfile();
        if (response.success && response.data) {
          updateUser(response.data);
        }
      } catch {
        // Ignore refresh errors; user can reload later.
      }
    };

    const handleSuccess = (payload: { ticket?: Ticket; user_id?: number }) => {
      if (payload.user_id && payload.user_id !== user.id) return;
      const naziv = payload.ticket?.let?.naziv || 'let';
      addToast({
        type: 'success',
        title: 'Kupovina uspešna',
        message: `Karta za ${naziv} je uspešno kupljena.`,
      });
      void refreshUser();
    };

    const handleFailed = (payload: { reason?: string; user_id?: number }) => {
      if (payload.user_id && payload.user_id !== user.id) return;
      addToast({
        type: 'error',
        title: 'Kupovina neuspešna',
        message: payload.reason || 'Došlo je do greške prilikom kupovine.',
      });
    };

    socket.on('connect', () => {
      socket.emit('join_room', { user_id: user.id });
    });
    socket.on('purchase_success', handleSuccess);
    socket.on('purchase_failed', handleFailed);

    return () => {
      socket.off('purchase_success', handleSuccess);
      socket.off('purchase_failed', handleFailed);
      socket.disconnect();
    };
  }, [addToast, updateUser, user]);

  return null;
}
