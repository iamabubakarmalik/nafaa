import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import {
  adminEmailTemplatesApi,
  type EmailTemplate,
  type UpsertEmailTemplatePayload,
} from '@/api/admin-email-templates.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const [form, setForm] = useState<UpsertEmailTemplatePayload>({
    slug: '', name: '', subject: '', bodyHtml: '', bodyText: '', isActive: true,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: adminEmailTemplatesApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? adminEmailTemplatesApi.update(editing.id, form)
      : adminEmailTemplatesApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Template updated' : 'Template created');
      setShowForm(false);
      setEditing(null);
      setForm({ slug: '', name: '', subject: '', bodyHtml: '', bodyText: '', isActive: true });
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const removeMutation = useMutation({
    mutationFn: adminEmailTemplatesApi.remove,
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
    },
  });

  const seedMutation = useMutation({
    mutationFn: adminEmailTemplatesApi.seedDefaults,
    onSuccess: () => {
      toast.success('Default templates seeded');
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
    },
  });

  const startEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({
      slug: t.slug, name: t.name, subject: t.subject,
      bodyHtml: t.bodyHtml, bodyText: t.bodyText ?? '', isActive: t.isActive,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-blue-900 to-blue-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Mail className="h-3.5 w-3.5" /> Email Templates
            </div>
            <h2 className="mt-3 text-3xl font-bold">System Emails</h2>
            <p className="mt-2 text-sm text-white/80">Edit emails sent to tenants</p>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <Button variant="secondary" onClick={() => seedMutation.mutate()} loading={seedMutation.isPending}>
                Seed Defaults
              </Button>
            )}
            <Button onClick={() => { setShowForm(true); setEditing(null); }} className="bg-white text-slate-900 hover:bg-slate-100">
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
                  }`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">{t.slug}</div>
                <div className="text-sm text-slate-700 mt-2 font-semibold">📧 {t.subject}</div>
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
              <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="welcome-email" disabled={!!editing} />
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                hint="Use {{variable}} for placeholders" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">HTML Body</label>
                <textarea value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                  rows={8} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                  placeholder="<h1>Hello {{name}}</h1>" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Plain Text Body (optional)</label>
                <textarea value={form.bodyText ?? ''} onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
                  rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono" />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
                Active
              </label>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => {
                  if (!form.slug || !form.name || !form.subject || !form.bodyHtml) {
                    return toast.error('All required fields needed');
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
