import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Lock, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';

export function SetPasswordCard() {
  const customer = useAuthStore((s) => s.customer) as any;
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const setPasswordMutation = useMutation({
    mutationFn: () => authApi.setPassword(newPassword),
    onSuccess: () => {
      toast.success('Password set! You can now login with password too.');
      setShowForm(false);
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Failed to set password'),
  });

  // Only show if user doesn't have password (Google-only user)
  if (!customer || customer.hasPassword) return null;

  if (!showForm) {
    return (
      <Card className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-black text-sm">Add a password</div>
            <div className="text-2xs text-content-muted">
              For extra security & easier access
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            Add
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between">
        <h3 className="font-black text-lg flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Set your password
        </h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-content-subtle hover:text-content"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
          }
          if (newPassword.length < 6) {
            toast.error('Min 6 characters');
            return;
          }
          setPasswordMutation.mutate();
        }}
        className="space-y-3"
      >
        <Input
          type={showPassword ? 'text' : 'password'}
          label="New password"
          placeholder="At least 6 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          required
          minLength={6}
        />
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Confirm password"
          placeholder="Same password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />
        <Button
          type="submit"
          variant="gradient"
          fullWidth
          loading={setPasswordMutation.isPending}
          leftIcon={<ShieldCheck className="h-4 w-4" />}
        >
          Set password
        </Button>
      </form>
    </Card>
  );
}
