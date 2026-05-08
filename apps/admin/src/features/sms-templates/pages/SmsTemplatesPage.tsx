import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import {
  adminCommunicationsApi, type SmsTemplate, type UpsertSmsTemplatePayload,
} from '@/api/admin-communications.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function SmsTemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [form, setForm] = useState<UpsertSmsTemplatePayload>({
    slug: '', name: '', message: '', isActive: true,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['admin-sms-templates'],
    queryFn: adminCommunicationsApi.listSmsTemplates,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? adminCommunicationsApi.updateSmsTemplate(editing.id, form)
      : adminCommunicationsApi.createSmsTemplate(form),
    onSuccess: () => {
      toast.success(editing ? 'Template updated' : 'Template created');
      setShowForm(false);
      setEditing(null);
      setForm({ slug: '', name: '', message: '', isActive: true });
      queryClient.invalidateQueries({ queryKey: ['admin-sms-templates'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const removeMutation = useMutation({
    mutationFn: adminCommunicationsApi.deleteSmsTemplate,
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-sms-templates'] });
    },
  });

  const seedMutation = useMutation({
    mutationFn: adminCommunicationsApi.seedSmsDefaults,
    onSuccess: () => {
      toast.success('Default templates seeded');
      queryClient.invalidateQueries({ queryKey: ['admin-sms-templates'] });
    },
  });

  const startEdit = (t: SmsTemplate) => {
    setEditing(t);
    setForm({ slug: t.slug, name: t.name, message: t.message, isActive: t.isActive });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <MessageSquare className="h-3.5 w-3.5" /> SMS Templates
            </div>
            <h2 className="mt-3 text-3xl font-bold">SMS Templates</h2>
            <p className="mt-2 text-sm text-white/80">Manage reusable SMS templates with variables</p>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <Button variant="secondary" onClick={() => seedMutation.mutate()} loading={seedMutation.isPending}>
                Seed Defaults
              </Button>
            )}
            <Button onClick={() => { setShowForm(true); setEditing(null); }}
              className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        {templates.length === 0 ? (
          <div className="col-span-full p-12 text-center text-sm text-slate-500">
            No templates yet. Click "Seed Defaults" to add common ones.
          </div>
        ) : templates.map((t) => (
          <div key={t.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900">{t.name}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}>{t.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">{t.slug}</div>
                <div className="text-sm text-slate-700 mt-3 p-3 rounded-lg bg-slate-50 whitespace-pre-wrap">
                  {t.message}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Length: {t.message.length} chars • Approx {Math.ceil(t.message.length / 160)} SMS
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(t)} className="text-slate-700 hover:bg-slate-100 rounded-lg p-2">
                  <Edit className="h-4 w-4" />
                </button>
                <button onClick={() => { if (confirm(`Delete ${t.name}?`)) removeMutation.mutate(t.id); }}
                  className="text-rose-600 hover:bg-rose-50 rounded-lg p-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl">{editing ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Input label="Slug (unique identifier)" value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="welcome" disabled={!!editing} />
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={6} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                  placeholder="Hi {{name}}! Aap ka order Rs {{amount}} confirmed." />
                <div className="text-xs text-slate-500 mt-1">
                  Length: {form.message.length} • Use {`{{variable}}`} for placeholders
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
                Active
              </label>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
                💡 Common variables: {`{{name}}, {{amount}}, {{days}}, {{reason}}, {{productName}}, {{otp}}`}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => {
                  if (!form.slug || !form.name || !form.message) {
                    return toast.error('All fields required');
                  }
                  saveMutation.mutate();
                }} loading={saveMutation.isPending} className="flex-1">
                  <Check className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
