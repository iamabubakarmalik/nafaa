import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, User, Mail, Phone, Camera, Globe, Calendar, Save,
} from 'lucide-react';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input, Avatar } from '@/ui';
import { toast } from 'sonner';

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const customer = useAuthStore((s) => s.customer);
  const updateCustomer = useAuthStore((s) => s.updateCustomer);

  const [form, setForm] = useState({
    fullName: customer?.fullName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    language: customer?.language || 'ur',
    avatarUrl: customer?.avatarUrl || '',
  });

  const updateMutation = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: (data) => {
      updateCustomer(data);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profile updated!');
      navigate('/profile');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  if (!customer) return null;

  return (
    <>
      <Helmet><title>Edit Profile — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={form.avatarUrl} name={form.fullName} size="xl" ring />
              <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h1 className="text-xl font-black">Edit profile</h1>
              <p className="text-xs text-content-muted mt-0.5">Change your info anytime</p>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="space-y-4"
          >
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              leftIcon={<User className="h-4 w-4" />}
              inputSize="lg"
              required
            />

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              leftIcon={<Mail className="h-4 w-4" />}
              inputSize="lg"
            />

            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              leftIcon={<Phone className="h-4 w-4" />}
              inputSize="lg"
              disabled
              hint="Contact support to change phone number"
            />

            <div>
              <label className="block text-sm font-bold mb-1.5">Preferred language</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'en', label: 'English', flag: '🇬🇧' },
                  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setForm({ ...form, language: l.code as any })}
                    className={`h-12 rounded-2xl border-2 text-sm font-black flex items-center justify-center gap-2 transition ${
                      form.language === l.code
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              loading={updateMutation.isPending}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save changes
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
