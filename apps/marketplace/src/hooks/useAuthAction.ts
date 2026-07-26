import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * Wraps any action so it requires authentication.
 * If not logged in → shows toast + redirects to /login with return path.
 *
 * Usage:
 *   const runAuthed = useAuthAction();
 *   const handleFollow = () => runAuthed(() => followMutation.mutate(), 'Follow the shop');
 */
export function useAuthAction() {
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  return useCallback(
    (fn: () => void, actionLabel = 'perform this action') => {
      if (!isAuth) {
        toast.error(`Please login to ${actionLabel}`);
        navigate('/login', {
          state: { from: { pathname: window.location.pathname } },
        });
        return;
      }
      fn();
    },
    [isAuth, navigate],
  );
}
