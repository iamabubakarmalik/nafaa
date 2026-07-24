import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  ArrowLeft, Download, FileText, CheckCircle2, Package,
  MessageCircle, Heart, MapPin, CreditCard, Star, ShieldCheck,
  Clock, AlertTriangle,
} from 'lucide-react';
import { profileApi } from '../api/profile.api';
import { Button, Card, Badge } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const DATA_CATEGORIES = [
  { key: 'profile',        icon: FileText,      label: 'Profile info',      desc: 'Name, email, phone, avatar', color: 'from-brand-500 to-emerald-600' },
  { key: 'addresses',      icon: MapPin,        label: 'Addresses',         desc: 'All your saved delivery addresses', color: 'from-info to-blue-700' },
  { key: 'orders',         icon: Package,       label: 'Orders',            desc: 'Complete order history with items', color: 'from-accent-500 to-orange-600' },
  { key: 'wishlist',       icon: Heart,         label: 'Wishlist',          desc: 'All saved products', color: 'from-rose-500 to-pink-600' },
  { key: 'reviews',        icon: Star,          label: 'Reviews',           desc: 'Product & shop reviews you posted', color: 'from-amber-500 to-yellow-600' },
  { key: 'messages',       icon: MessageCircle, label: 'Messages',          desc: 'Chats with shops and support', color: 'from-purple-500 to-pink-500' },
  { key: 'wallet',         icon: CreditCard,    label: 'Wallet & payments', desc: 'Transaction history, loyalty points', color: 'from-emerald-500 to-teal-600' },
];

export default function DataExportPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set(DATA_CATEGORIES.map((c) => c.key)));
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [requestSent, setRequestSent] = useState(false);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const requestMutation = useMutation({
    mutationFn: async () => {
      // TODO: wire to real endpoint when backend adds it
      await new Promise((r) => setTimeout(r, 1500));
      return { success: true };
    },
    onSuccess: () => {
      setRequestSent(true);
      toast.success('Export request submitted');
    },
  });

  return (
    <>
      <Helmet><title>Export My Data — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-info to-blue-700 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              Your right to data
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Download my data</h1>
            <p className="text-white/90 text-sm md:text-base mt-1">
              Get a complete copy of everything we have about you
            </p>
          </div>
        </Card>

        {requestSent ? (
          <Card className="p-6 md:p-8 text-center space-y-4">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Request submitted!</h2>
              <p className="text-sm text-content-muted mt-2">
                We're preparing your data export. You'll receive an email with a secure download
                link within 24-48 hours.
              </p>
            </div>
            <Card className="p-3 bg-info/10 border-info/30 text-left">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <div className="text-xs text-content">
                  <strong>What happens next:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li>We gather your data across all systems</li>
                    <li>Package into your chosen format ({format.toUpperCase()})</li>
                    <li>Email a secure, encrypted download link</li>
                    <li>Link expires after 7 days for security</li>
                  </ul>
                </div>
              </div>
            </Card>
            <Button variant="gradient" size="lg" fullWidth onClick={() => navigate('/profile')}>
              Back to profile
            </Button>
          </Card>
        ) : (
          <>
            {/* Categories */}
            <Card className="p-5">
              <h3 className="font-black text-lg mb-1">Choose what to include</h3>
              <p className="text-xs text-content-muted mb-4">
                Select the data categories you want to export
              </p>
              <div className="space-y-2">
                {DATA_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selected.has(cat.key);
                  return (
                    <label
                      key={cat.key}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition',
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                          : 'border-border bg-surface hover:border-brand-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(cat.key)}
                        className="h-4 w-4 mt-1 rounded accent-brand-600"
                      />
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shrink-0`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm">{cat.label}</div>
                        <div className="text-2xs text-content-muted mt-0.5">{cat.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setSelected(new Set(DATA_CATEGORIES.map((c) => c.key)))}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  Select all
                </button>
                <span className="text-content-subtle">·</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs font-bold text-danger hover:underline"
                >
                  Clear all
                </button>
              </div>
            </Card>

            {/* Format */}
            <Card className="p-5">
              <h3 className="font-black text-lg mb-1">Export format</h3>
              <p className="text-xs text-content-muted mb-4">
                Choose how you want the data delivered
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'json', label: 'JSON', desc: 'Developer format', icon: '{ }' },
                  { key: 'csv',  label: 'CSV',  desc: 'Excel-compatible', icon: '📊' },
                  { key: 'pdf',  label: 'PDF',  desc: 'Human readable',   icon: '📄' },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFormat(f.key as any)}
                    className={cn(
                      'p-3 rounded-2xl border-2 text-center transition',
                      format === f.key
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                        : 'border-border bg-surface hover:border-brand-300',
                    )}
                  >
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <div className="text-sm font-black">{f.label}</div>
                    <div className="text-2xs text-content-muted">{f.desc}</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Warning */}
            <Card className="p-3 bg-warning/10 border-warning/30 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-xs text-content">
                <strong>Note:</strong> Data exports may take 24-48 hours. The download link
                will be sent to your registered email and expires after 7 days.
              </div>
            </Card>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={selected.size === 0}
              loading={requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Request export ({selected.size} categor{selected.size === 1 ? 'y' : 'ies'})
            </Button>

            <div className="text-center text-2xs text-content-muted">
              Under GDPR-like data protection principles, you have the right to access your data.
            </div>
          </>
        )}
      </div>
    </>
  );
}
