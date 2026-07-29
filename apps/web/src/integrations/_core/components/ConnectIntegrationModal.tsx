import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Check, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { integrationsApi, type AvailableIntegration } from '../api/integrations.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { Modal } from '@core/ui/Modal';
import { cn } from '@core/lib/cn';

const CATEGORY_LABELS: Record<string, string> = {
  SALES_CHANNEL: 'Sales Channel',
  COURIER: 'Courier',
  PAYMENT: 'Payment',
  ACCOUNTING: 'Accounting',
};

export function ConnectIntegrationModal({
  open,
  onClose,
  available,
}: {
  open: boolean;
  onClose: () => void;
  available: AvailableIntegration[];
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<AvailableIntegration | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No integration selected');
      return integrationsApi.create({
        type: selected.type,
        category: selected.category,
        displayName: displayName || selected.name,
        credentials: selected.fields.reduce((acc: Record<string, string>, f: any) => {
          if (fieldValues[f.key]) acc[f.key] = fieldValues[f.key];
          return acc;
        }, {} as Record<string, string>),
        config: {},
      });
    },
    onSuccess: (data: any) => {
      toast.success(`${selected?.name} connect ho gaya! 🎉`);

      // If custom website, show the API key
      if (selected?.type === 'CUSTOM_WEBSITE') {
        toast.success(
          `API Key: ${data.apiKey?.slice(0, 12)}...`,
          {
            description: `Webhook URL: ${data.webhookUrl}`,
            duration: 10000,
          },
        );
      }

      // If Daraz, need OAuth
      if (selected?.type === 'DARAZ' && data.id) {
        toast.info('Daraz authorize karein — redirect ho raha hai...');
        // Will handle OAuth redirect
      }

      queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-available'] });
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Connection fail ho gaya');
    },
  });

  const resetForm = () => {
    setSelected(null);
    setDisplayName('');
    setFieldValues({});
  };

  const handleSubmit = () => {
    if (!selected) return;
    // Validate required fields
    for (const field of selected.fields) {
      if (field.required && !fieldValues[field.key]) {
        toast.error(`${field.label} zaroori hai`);
        return;
      }
    }
    createMutation.mutate();
  };

  // Group available by category
  const grouped: Record<string, AvailableIntegration[]> = {};
  for (const a of available) {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  }

  return (
    <Modal
      open={open}
      onClose={() => { resetForm(); onClose(); }}
      title="Integration Connect Karein"
      size={selected ? 'md' : 'xl'}
      footer={
        selected ? (
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>Back</Button>
            <Button
              variant="gradient"
              loading={createMutation.isPending}
              onClick={handleSubmit}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Connect {selected.name}
            </Button>
          </>
        ) : undefined
      }
    >
      {/* ═══ STEP 1: Select Integration ═══ */}
      {!selected && (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">
                {CATEGORY_LABELS[category] ?? category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((avail) => (
                  <button
                    key={avail.type}
                    onClick={() => {
                      setSelected(avail);
                      setDisplayName(avail.name);
                      // Pre-fill defaults
                      const defaults: Record<string, string> = {};
                      avail.fields.forEach((f: any) => {
                        if (f.default) defaults[f.key] = f.default;
                      });
                      setFieldValues(defaults);
                    }}
                    className="group p-4 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 hover:border-brand-400 dark:hover:border-brand-600 transition text-left"
                  >
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition"
                      style={{ backgroundColor: `${avail.color}20` }}
                    >
                      {avail.icon}
                    </div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {avail.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                      {avail.description}
                    </div>
                    {avail.popular && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Sparkles className="h-2.5 w-2.5" /> Popular
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ STEP 2: Configure Selected Integration ═══ */}
      {selected && (
        <div className="space-y-4">
          {/* Selected integration header */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center gap-3">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ backgroundColor: `${selected.color}20` }}
            >
              {selected.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-base text-slate-900 dark:text-white">
                {selected.name}
              </div>
              <div className="text-xs text-slate-500 mt-1">{selected.description}</div>
            </div>
          </div>

          {/* Docs link */}
          <div className="p-3 rounded-xl bg-info-50 dark:bg-info-950/30 border border-info-200 dark:border-info-800 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-info-600 shrink-0 mt-0.5" />
            <div className="text-xs text-info-700 dark:text-info-400">
              <div className="font-bold mb-0.5">Setup Instructions:</div>
              {selected.docs}
            </div>
          </div>

          {/* Display name */}
          <Input
            label="Display Name"
            placeholder="e.g. My Foodpanda Shop"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          {/* Dynamic fields */}
          {selected.fields.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                API Credentials
              </div>
              {selected.fields.map((field: any) => (
                <Input
                  key={field.key}
                  label={field.label}
                  placeholder={`Enter ${field.label}`}
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}
                  required={field.required}
                />
              ))}
            </div>
          )}

          {/* Custom website special message */}
          {selected.type === 'CUSTOM_WEBSITE' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border border-brand-200 dark:border-brand-800">
              <div className="font-extrabold text-sm text-brand-900 dark:text-brand-300 mb-2">
                🌐 Custom Website Integration
              </div>
              <div className="text-xs text-brand-700 dark:text-brand-400 space-y-2">
                <div>Connect karne ke baad aap ko milega:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>API Key</strong> — apni website mein use karne ke liye</li>
                  <li><strong>Webhook URL</strong> — jahan orders bhejne hain</li>
                  <li><strong>Product API</strong> — GET se products fetch karein</li>
                </ul>
                <div className="mt-2 p-2 rounded-lg bg-white dark:bg-neutral-900 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  fetch('https://api.nafaa.pk/api/integrations/webhooks/custom-website/YOUR_API_KEY', {'{'}<br/>
                  &nbsp;&nbsp;method: 'POST',<br/>
                  &nbsp;&nbsp;headers: {'{'} 'Content-Type': 'application/json' {'}'},<br/>
                  &nbsp;&nbsp;body: JSON.stringify(orderData)<br/>
                  {'}'})
                </div>
              </div>
            </div>
          )}

          {/* Daraz special message */}
          {selected.type === 'DARAZ' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800">
              <div className="font-extrabold text-sm text-orange-900 dark:text-orange-300 mb-2">
                🛒 Daraz Setup
              </div>
              <div className="text-xs text-orange-700 dark:text-orange-400 space-y-1">
                <div>1. <a href="https://open.lazada.com" target="_blank" rel="noreferrer" className="font-bold underline inline-flex items-center gap-1">open.lazada.com <ExternalLink className="h-3 w-3" /></a> pe jao</div>
                <div>2. "Create App" karo → App Name: "Nafaa POS"</div>
                <div>3. App Key + App Secret yahan enter karo</div>
                <div>4. Connect karne ke baad "Authorize" button pe click karo</div>
                <div>5. Daraz login → Allow → Done! 🎉</div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
