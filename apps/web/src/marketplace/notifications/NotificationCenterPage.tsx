import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Settings, X, Sparkles,
  ShoppingCart, Star, MessageCircle, AlertTriangle, DollarSign, Package,
  Award, MessageSquare, Zap, Moon, Volume2, Clock, ArrowRight,
} from 'lucide-react';
import { notificationsApi, type BizNotificationType, type NotificationPriority } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { relativeTime } from '../shared/status-utils';
import { Button } from '@core/ui/Button';

const TYPE_META: Record<BizNotificationType, { icon: any; color: string; bg: string }> = {
  NEW_ORDER:            { icon: ShoppingCart,   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  ORDER_CANCELLED:      { icon: X,              color: 'text-rose-700',    bg: 'bg-rose-100' },
  REVIEW_RECEIVED:      { icon: Star,           color: 'text-amber-700',   bg: 'bg-amber-100' },
  BARGAIN_OFFER:        { icon: MessageSquare,  color: 'text-purple-700',  bg: 'bg-purple-100' },
  LOW_STOCK:            { icon: Package,        color: 'text-orange-700',  bg: 'bg-orange-100' },
  PAYMENT_RECEIVED:     { icon: DollarSign,     color: 'text-green-700',   bg: 'bg-green-100' },
  PAYOUT_PROCESSED:     { icon: DollarSign,     color: 'text-blue-700',    bg: 'bg-blue-100' },
  DISPUTE_OPENED:       { icon: AlertTriangle,  color: 'text-red-700',     bg: 'bg-red-100' },
  MESSAGE_RECEIVED:     { icon: MessageCircle,  color: 'text-blue-700',    bg: 'bg-blue-100' },
  SUBSCRIPTION_EXPIRING:{ icon: Clock,          color: 'text-amber-700',   bg: 'bg-amber-100' },
  SYSTEM_ALERT:         { icon: AlertTriangle,  color: 'text-red-700',     bg: 'bg-red-100' },
  ACHIEVEMENT:          { icon: Award,          color: 'text-yellow-700',  bg: 'bg-yellow-100' },
};

const PRIORITY_META: Record<NotificationPriority, { color: string; bg: string; label: string }> = {
  URGENT:   { color: 'text-red-700', bg: 'bg-red-100', label: '🚨 URGENT' },
  HIGH:     { color: 'text-orange-700', bg: 'bg-orange-100', label: '⚠️ HIGH' },
  MEDIUM:   { color: 'text-blue-700', bg: 'bg-blue-100', label: 'MEDIUM' },
  LOW:      { color: 'text-slate-600', bg: 'bg-slate-100', label: 'LOW' },
};

export default function NotificationCenterPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [typeFilter, setTypeFilter] = useState<BizNotificationType | 'ALL'>('ALL');
  const [showSettings, setShowSettings] = useState(false);

  const params = {
    unreadOnly: filter === 'unread',
    priority: filter === 'urgent' ? ('URGENT' as NotificationPriority) : undefined,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
  };

  const { data } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.list(params),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: (result) => {
      toast.success(`✅ ${result.marked} notifications marked as read`);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data?.items || [];
  const counts = data?.counts || { total: 0, unread: 0, urgent: 0, high: 0 };

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Bell className="h-3.5 w-3.5" />
              Notification Center
              {counts.unread > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] animate-pulse">
                  {counts.unread} new
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">All Notifications</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">Business updates ek jagah — orders, reviews, alerts</p>
          </div>
          <div className="flex gap-2">
            {counts.unread > 0 && (
              <Button
                onClick={() => markAllReadMutation.mutate()}
                loading={markAllReadMutation.isPending}
                className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </Button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur text-white hover:bg-white/25 border border-white/20 flex items-center justify-center"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-4 gap-2 mt-6">
          <HeroKpi label="Total" value={counts.total} icon={Bell} />
          <HeroKpi label="Unread" value={counts.unread} icon={BellOff} highlight={counts.unread > 0} />
          <HeroKpi label="Urgent" value={counts.urgent} icon={AlertTriangle} />
          <HeroKpi label="High Priority" value={counts.high} icon={Zap} />
        </div>
      </section>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'unread', 'urgent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-black transition border-2 ${
              filter === f ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f === 'all' && 'All'}
            {f === 'unread' && `Unread (${counts.unread})`}
            {f === 'urgent' && '🚨 Urgent Only'}
          </button>
        ))}

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="ml-auto h-10 px-3 rounded-xl border-2 border-slate-200 text-xs font-black outline-none bg-white"
        >
          <option value="ALL">All Types</option>
          {Object.keys(TYPE_META).map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Notifications List */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <BellOff className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">All caught up!</h3>
          <p className="text-sm text-slate-500 mt-1">No notifications matching your filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((notif) => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              onMarkRead={() => markReadMutation.mutate(notif.id)}
              onDelete={() => deleteMutation.mutate(notif.id)}
            />
          ))}
        </div>
      )}

      {showSettings && (
        <NotificationSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function HeroKpi({ label, value, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-xl backdrop-blur border p-2.5 ${
      highlight ? 'bg-red-500/25 border-red-300/50 ring-2 ring-red-400/40 animate-pulse' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{label}</div>
      </div>
      <div className="text-xl font-black leading-none tabular-nums">{value}</div>
    </div>
  );
}

function NotificationCard({ notification: n, onMarkRead, onDelete }: any) {
  const meta = TYPE_META[n.type as BizNotificationType] || TYPE_META.SYSTEM_ALERT;
  const priorityMeta = PRIORITY_META[n.priority as NotificationPriority];
  const Icon = meta.icon;

  return (
    <div className={`rounded-2xl bg-white border-2 p-4 transition-all hover:shadow-md ${
      !n.isRead ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        {!n.isRead && (
          <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0 animate-pulse" />
        )}

        <div className={`h-11 w-11 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${priorityMeta.bg} ${priorityMeta.color}`}>
              {priorityMeta.label}
            </span>
            <span className="text-[10px] font-black text-slate-500">{n.type.replace(/_/g, ' ')}</span>
            <span className="text-[10px] font-bold text-slate-400 ml-auto">{relativeTime(n.createdAt)}</span>
          </div>

          <h3 className="font-black text-slate-900">{n.title}</h3>
          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{n.body}</p>

          {n.imageUrl && (
            <img src={n.imageUrl} alt="" className="mt-2 h-16 rounded-lg object-cover border border-slate-200" />
          )}

          <div className="flex items-center gap-2 mt-3">
            {n.actionUrl && (
              <Link
                to={n.actionUrl}
                onClick={() => !n.isRead && onMarkRead()}
                className={`h-8 px-3 rounded-lg text-white text-xs font-black inline-flex items-center gap-1 shadow ${meta.color.replace('text-', 'bg-').replace('-700', '-600')} hover:opacity-90`}
              >
                {n.actionLabel || 'View'}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {!n.isRead && (
              <button
                onClick={onMarkRead}
                className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black inline-flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark Read
              </button>
            )}
            <button
              onClick={onDelete}
              className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center ml-auto"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettingsModal({ onClose }: any) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationsApi.preferences,
  });

  const [prefs, setPrefs] = useState<any>(null);
  if (data && !prefs) setPrefs(data);

  const saveMutation = useMutation({
    mutationFn: () => notificationsApi.updatePreferences(prefs),
    onSuccess: () => {
      toast.success('✅ Preferences saved');
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
      onClose();
    },
  });

  if (!prefs) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Settings className="h-3 w-3" />
              Notification Preferences
            </div>
            <h2 className="mt-2 text-xl font-black">Customize Your Alerts</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Sound */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-black text-slate-900">Sound Alerts</div>
                <div className="text-xs text-slate-500 font-bold">Play sound for new notifications</div>
              </div>
            </div>
            <label className="cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.soundEnabled}
                onChange={(e) => setPrefs({ ...prefs, soundEnabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`h-7 w-12 rounded-full transition ${prefs.soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'} relative`}>
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500 text-white flex items-center justify-center">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-black text-slate-900">Quiet Hours</div>
                  <div className="text-xs text-slate-500 font-bold">Silence non-urgent notifications</div>
                </div>
              </div>
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.quietHoursEnabled}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursEnabled: e.target.checked })}
                  className="sr-only"
                />
                <div className={`h-7 w-12 rounded-full transition ${prefs.quietHoursEnabled ? 'bg-purple-500' : 'bg-slate-300'} relative`}>
                  <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.quietHoursEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>
            {prefs.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase">From</label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart || '22:00'}
                    onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase">To</label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd || '07:00'}
                    onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border-2 border-slate-200 text-sm font-bold outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Per-type channels */}
          <div>
            <h3 className="font-black text-slate-900 mb-3">Notification Types</h3>
            <div className="space-y-2">
              {Object.entries(prefs.channels).map(([type, channels]: any) => {
                const meta = TYPE_META[type as BizNotificationType] || TYPE_META.SYSTEM_ALERT;
                const Icon = meta.icon;
                return (
                  <div key={type} className="p-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-8 w-8 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="font-black text-sm text-slate-900">{type.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="flex gap-3 pl-10">
                      {(['push', 'email', 'sms'] as const).map((ch) => (
                        <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={channels[ch]}
                            onChange={(e) => setPrefs({
                              ...prefs,
                              channels: {
                                ...prefs.channels,
                                [type]: { ...channels, [ch]: e.target.checked },
                              },
                            })}
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-xs font-black text-slate-700 uppercase">{ch}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="bg-gradient-to-r from-slate-700 to-slate-900">
            <Check className="h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
