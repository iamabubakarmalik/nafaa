import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, User, Mail, Phone, Save, Sparkles, Calendar,
  CheckCircle2, AlertCircle, Bell, MessageCircle, Smartphone,
} from 'lucide-react';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input } from '@/ui';
import { AvatarUpload } from '@/components/AvatarUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const customer = useAuthStore((s) => s.customer);
  const updateCustomer = useAuthStore((s) => s.updateCustomer);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
    initialData: customer ?? undefined,
  });

  const u = (me || customer) as any;

  const [form, setForm] = useState({
    fullName: '',
    displayName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    dateOfBirth: '',
    gender: '' as '' | 'MALE' | 'FEMALE' | 'OTHER',
    language: 'ur' as 'ur' | 'en',
    marketingEmails: true,
    marketingSms: true,
    marketingPush: true,
    marketingWhatsapp: true,
  });

  useEffect(() => {
    if (u) {
      setForm({
        fullName: u.fullName || '',
        displayName: u.displayName || '',
        email: u.email || '',
        phone: u.phone || '',
        avatarUrl: u.avatarUrl || '',
        dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
        gender: u.gender || '',
        language: u.language || 'ur',
        marketingEmails: u.marketingEmails ?? true,
        marketingSms: u.marketingSms ?? true,
        marketingPush: u.marketingPush ?? true,
        marketingWhatsapp: u.marketingWhatsapp ?? true,
      });
    }
  }, [u]);

  const updateMutation = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        fullName: form.fullName.trim(),
        displayName: form.displayName.trim() || undefined,
        email: form.email.trim() || undefined,
        avatarUrl: form.avatarUrl || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        language: form.language,
        marketingEmails: form.marketingEmails,
        marketingSms: form.marketingSms,
        marketingPush: form.marketingPush,
        marketingWhatsapp: form.marketingWhatsapp,
      }),
    onSuccess: (data) => {
      updateCustomer(data);
      qc.invalidateQueries({ queryKey: ['auth-me'] });
      toast.success('Profile updated! ✨');
      navigate('/profile');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  if (!u) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-brand-600 animate-pulse" />
      </div>
    );
  }

  const emailVerified = u.emailVerified || u.isEmailVerified;
  const phoneVerified = u.phoneVerified;

  return (
    <>
      <Helmet><title>Edit Profile — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5 pb-24">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Hero */}
        <Card className="p-6 md:p-8 bg-gradient-brand text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-accent-400/20 blur-3xl translate-y-1/4 -translate-x-1/4" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <AvatarUpload
              value={form.avatarUrl}
              onChange={(url) => setForm({ ...form, avatarUrl: url || '' })}
              size="xl"
              fallbackText={form.fullName || u.fullName || 'U'}
              className="!flex-col"
            />
            <h1 className="text-2xl md:text-3xl font-black mt-4">Edit your profile</h1>
            <p className="text-brand-50 text-sm mt-1">Update your personal info</p>
          </div>
        </Card>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-5"
        >
          {/* Basic Info */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="font-black">Personal Info</h3>
                <p className="text-xs text-content-muted">Your basic details</p>
              </div>
            </div>

            <Input
              label="Full name"
              placeholder="Ahmad Khan"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              leftIcon={<User className="h-4 w-4" />}
              inputSize="lg"
              required
            />

            <Input
              label="Display name (optional)"
              placeholder="How you want to be shown"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              inputSize="lg"
              hint="Shown in reviews and comments"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                leftIcon={<Calendar className="h-4 w-4" />}
                inputSize="lg"
              />

              <div>
                <label className="block text-sm font-bold mb-1.5">Gender</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { code: 'MALE', label: 'Male', emoji: '👨' },
                    { code: 'FEMALE', label: 'Female', emoji: '👩' },
                    { code: 'OTHER', label: 'Other', emoji: '🌈' },
                  ].map((g) => (
                    <button
                      key={g.code}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g.code as any })}
                      className={cn(
                        'h-11 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-1 transition',
                        form.gender === g.code
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                          : 'border-border bg-surface hover:border-brand-300',
                      )}
                    >
                      <span>{g.emoji}</span>
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-10 w-10 rounded-xl bg-info/20 flex items-center justify-center">
                <Mail className="h-4 w-4 text-info" />
              </div>
              <div>
                <h3 className="font-black">Contact</h3>
                <p className="text-xs text-content-muted">Email & phone</p>
              </div>
            </div>

            <div>
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                leftIcon={<Mail className="h-4 w-4" />}
                inputSize="lg"
                rightIcon={
                  emailVerified ? (
                    <span className="inline-flex items-center gap-0.5 text-2xs font-black text-brand-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  ) : form.email ? (
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email')}
                      className="text-2xs font-black text-accent-600 hover:underline"
                    >
                      Verify
                    </button>
                  ) : undefined
                }
              />
              {!emailVerified && form.email && (
                <div className="text-2xs text-accent-700 dark:text-accent-400 font-bold mt-1 flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  Email verification pending
                </div>
              )}
            </div>

            <div>
              <Input
                label="Phone number"
                type="tel"
                placeholder="03001234567"
                value={form.phone}
                disabled
                leftIcon={<Phone className="h-4 w-4" />}
                inputSize="lg"
                rightIcon={
                  phoneVerified ? (
                    <span className="inline-flex items-center gap-0.5 text-2xs font-black text-brand-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  ) : undefined
                }
                hint="Phone change karne ke liye support contact karain"
              />
            </div>
          </Card>

          {/* Language */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-10 w-10 rounded-xl bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center">
                <span className="text-lg">🌍</span>
              </div>
              <div>
                <h3 className="font-black">Language</h3>
                <p className="text-xs text-content-muted">Preferred display language</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: 'ur', label: 'اردو (Urdu)', flag: '🇵🇰', desc: 'Roman/Urdu' },
                { code: 'en', label: 'English', flag: '🇬🇧', desc: 'Global' },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setForm({ ...form, language: l.code as any })}
                  className={cn(
                    'p-4 rounded-2xl border-2 text-left transition',
                    form.language === l.code
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                      : 'border-border bg-surface hover:border-brand-300',
                  )}
                >
                  <div className="text-2xl mb-1">{l.flag}</div>
                  <div className="font-black text-sm">{l.label}</div>
                  <div className="text-2xs text-content-muted">{l.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Marketing Prefs */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Bell className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-black">Marketing Preferences</h3>
                <p className="text-xs text-content-muted">Deals & promotions channels</p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { key: 'marketingPush', icon: Bell, label: 'Push notifications', color: 'from-brand-500 to-emerald-600' },
                { key: 'marketingEmails', icon: Mail, label: 'Email newsletters', color: 'from-info to-blue-700' },
                { key: 'marketingSms', icon: MessageCircle, label: 'SMS updates', color: 'from-purple-500 to-pink-600' },
                { key: 'marketingWhatsapp', icon: Smartphone, label: 'WhatsApp deals', color: 'from-emerald-500 to-green-600' },
              ].map((c) => {
                const Icon = c.icon;
                const enabled = (form as any)[c.key];
                return (
                  <label
                    key={c.key}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition',
                      enabled ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30' : 'border-border bg-surface',
                    )}
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="flex-1 text-sm font-black">{c.label}</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={cn(
                      'h-6 w-11 rounded-full relative transition shrink-0',
                      enabled ? 'bg-brand-500' : 'bg-surface-muted border border-border',
                    )}>
                      <div className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        enabled ? 'translate-x-5' : 'translate-x-0.5',
                      )} />
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            fullWidth
            loading={updateMutation.isPending}
            leftIcon={<Save className="h-5 w-5" />}
          >
            Save all changes
          </Button>
        </form>
      </div>
    </>
  );
}
