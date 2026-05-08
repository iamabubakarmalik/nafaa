import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save, Plus } from 'lucide-react';
import { adminSettingsApi, type SystemSetting } from '@/api/admin-settings.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [edited, setEdited] = useState<Record<string, string>>({});

  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminSettingsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: (changes: { key: string; value: string }[]) =>
      adminSettingsApi.bulk(changes),
    onSuccess: () => {
      toast.success('Settings saved');
      setEdited({});
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const seedMutation = useMutation({
    mutationFn: adminSettingsApi.seedDefaults,
    onSuccess: () => {
      toast.success('Default settings seeded');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const grouped = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const hasChanges = Object.keys(edited).length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <SettingsIcon className="h-3.5 w-3.5" /> System Settings
            </div>
            <h2 className="mt-3 text-3xl font-bold">Configuration</h2>
            <p className="mt-2 text-sm text-white/80">Bank info, branding, system config</p>
          </div>
          <div className="flex gap-2">
            {settings.length === 0 && (
              <Button variant="secondary" onClick={() => seedMutation.mutate()} loading={seedMutation.isPending}>
                <Plus className="h-4 w-4" /> Seed Defaults
              </Button>
            )}
            {hasChanges && (
              <Button onClick={() => {
                const changes = Object.entries(edited).map(([key, value]) => ({ key, value }));
                saveMutation.mutate(changes);
              }} loading={saveMutation.isPending} className="bg-white text-slate-900 hover:bg-slate-100">
                <Save className="h-4 w-4" /> Save {Object.keys(edited).length} Changes
              </Button>
            )}
          </div>
        </div>
      </section>

      {settings.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
          <SettingsIcon className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="mt-4 font-bold text-slate-900">No settings yet</h3>
          <p className="text-sm text-slate-500 mt-2">Click "Seed Defaults" to add common settings</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 capitalize">{category.replace(/_/g, ' ')}</h3>
              <p className="text-xs text-slate-500">{items.length} settings</p>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((s) => (
                <div key={s.id} className="px-6 py-4 grid lg:grid-cols-[1fr_2fr] gap-4 items-center">
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-700">{s.key}</div>
                    {s.description && (
                      <div className="text-xs text-slate-500 mt-1">{s.description}</div>
                    )}
                    {s.isPublic && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                        Public
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={edited[s.key] !== undefined ? edited[s.key] : s.value}
                    onChange={(e) => setEdited({ ...edited, [s.key]: e.target.value })}
                    className={`h-10 w-full rounded-lg border px-3 text-sm font-mono ${
                      edited[s.key] !== undefined ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                    }`}
                  />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
