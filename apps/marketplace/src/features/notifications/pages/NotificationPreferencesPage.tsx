import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Bell, Mail, MessageCircle, Smartphone, Package,
  Tag, MessageSquare, Sparkles, ShieldCheck, TrendingUp, Users,
} from 'lucide-react';
import { notificationsApi } from '../api/notifications.api';
import { profileApi } from '@/features/profile/api/profile.api';
import { Button, Card, Badge } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const CHANNELS = [
  { key: 'push',     icon: Smartphone,     label: 'Push',     color: 'from-brand-500 to-emerald-600' },
  { key: 'email',    icon: Mail,           label: 'Email',    color: 'from-info to-blue-700' },
  { key: 'sms',      icon: MessageCircle,  label: 'SMS',      color: 'from-purple-500 to-pink-500' },
  { key: 'whatsapp', icon: MessageSquare,  label: 'WhatsApp', color: 'from-emerald-500 to-green-600' },
];

const NOTIFICATION_TYPES = [
  { key: 'ORDER_UPDATES',  icon: Package,      label: 'Order updates',       desc: 'Delivery status, tracking' },
  { key: 'PROMOTIONS',     icon: Tag,          label: 'Promotions & deals',  desc: 'Flash sales, discounts' },
  { key: 'BARGAIN',        icon: MessageCircle, label: 'Bargain responses',  desc: 'Counter-offers, accepted' },
  { key: 'RECOMMENDATIONS', icon: Sparkles,    label: 'Recommendations',     desc: 'Personalized picks' },
  { key: 'SECURITY',       icon: ShieldCheck,  label: 'Security alerts',     desc: 'Login attempts (always on)' },
  { key: 'PRICE_DROPS',    icon: TrendingUp,   label: 'Price drops',         desc: 'Wishlist items on sale' },
  { key: 'GROUP_BUY',      icon: Users,        label: 'Group buy updates',   desc: 'Progress, expiring' },
  { key: 'REVIEWS',        icon: Sparkles,     label: 'Review reminders',    desc: 'Rate delivered orders' },
];

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: notificationsApi.preferences,
  });

  const [state, setState] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (prefs) setState(prefs);
  }, [prefs]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => notificationsApi.updatePreferences(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
      toast.success('Preferences saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const toggle = (type: string, channel: string) => {
    if (type === 'SECURITY') return;
    const next = { ...state, [type]: { ...(state[type] || {}), [channel]: !state[type]?.[channel] } };
    setState(next);
    updateMutation.mutate(next);
  };

  const toggleAll = (channel: string, enable: boolean) => {
    const next = { ...state };
    NOTIFICATION_TYPES.forEach((t) => {
      if (t.key !== 'SECURITY') {
        next[t.key] = { ...(next[t.key] || {}), [channel]: enable };
      }
    });
    setState(next);
    updateMutation.mutate(next);
  };

  return (
    <>
      <Helmet><title>Notification Preferences — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <Bell className="h-7 w-7 text-brand-600" />
            Notification Preferences
          </h1>
          <p className="text-sm text-content-muted mt-0.5">
            Control what you hear from us and how
          </p>
        </div>

        {/* Channel headers */}
        <Card className="p-4">
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-3">
            Enable/disable channels
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const allEnabled = NOTIFICATION_TYPES.every((t) => state[t.key]?.[ch.key]);
              return (
                <button
                  key={ch.key}
                  onClick={() => toggleAll(ch.key, !allEnabled)}
                  className={cn(
                    'p-3 rounded-2xl border-2 transition text-center',
                    allEnabled ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-border bg-surface',
                  )}
                >
                  <div className={`h-9 w-9 mx-auto rounded-xl bg-gradient-to-br ${ch.color} flex items-center justify-center mb-1`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-xs font-black">{ch.label}</div>
                  <div className={cn(
                    'text-2xs mt-0.5 font-bold',
                    allEnabled ? 'text-brand-600' : 'text-content-muted',
                  )}>
                    {allEnabled ? 'All on' : 'Some off'}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Preferences matrix */}
        {isLoading ? (
          <div className="skeleton h-96 rounded-3xl" />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-border">
              {NOTIFICATION_TYPES.map((type) => {
                const TypeIcon = type.icon;
                const isSecurity = type.key === 'SECURITY';
                return (
                  <div key={type.key} className={cn(
                    'p-4',
                    isSecurity && 'bg-amber-50 dark:bg-amber-950/20',
                  )}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                        isSecurity ? 'bg-amber-500 text-white' : 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400',
                      )}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm flex items-center gap-2">
                          {type.label}
                          {isSecurity && <Badge variant="warning" size="sm">Always on</Badge>}
                        </div>
                        <div className="text-2xs text-content-muted mt-0.5">{type.desc}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {CHANNELS.map((ch) => {
                        const enabled = state[type.key]?.[ch.key] ?? true;
                        return (
                          <button
                            key={ch.key}
                            onClick={() => toggle(type.key, ch.key)}
                            disabled={isSecurity}
                            className={cn(
                              'p-2 rounded-xl border-2 text-center transition text-2xs font-black',
                              enabled
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                                : 'border-border bg-surface text-content-muted',
                              isSecurity && 'opacity-70 cursor-not-allowed',
                            )}
                          >
                            <ch.icon className="h-3.5 w-3.5 mx-auto mb-0.5" />
                            {ch.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-3 bg-info/10 border-info/30 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <div className="text-xs text-content">
            <strong>Note:</strong> Security notifications are always sent to keep your account safe.
            You can manage marketing preferences separately.
          </div>
        </Card>
      </div>
    </>
  );
}
