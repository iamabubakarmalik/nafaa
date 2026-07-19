import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building, Award } from 'lucide-react';
import { projectsApi } from '../api/projects.api';
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';
import { formatPKR } from '@/lib/format';

export default function HardwareCustomerDetailPage() {
  const { id } = useParams();

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects-for-customer', id],
    queryFn: () => projectsApi.list({}),
    enabled: !!id,
  });

  const customerProjects = allProjects.filter((p: any) => p.customerId === id);

  return (
    <div className="space-y-6">
      {customerProjects.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            <h3 className="font-extrabold text-blue-900">🏗️ Construction Projects</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {customerProjects.map((p: any) => (
              <Link key={p.id} to={`/hardware/projects/${p.id}`}
                className="rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-400 p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-mono font-extrabold text-xs text-slate-500">{p.projectNumber}</div>
                    <div className="font-bold text-slate-900">{p.name}</div>
                    {p.city && <div className="text-xs text-slate-500">{p.city}</div>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ${
                    p.status === 'COMPLETED' ? 'bg-emerald-500' :
                    p.status === 'IN_PROGRESS' ? 'bg-amber-500' :
                    p.status === 'ON_HOLD' ? 'bg-orange-500' :
                    p.status === 'CANCELLED' ? 'bg-rose-500' :
                    'bg-slate-500'
                  }`}>{p.status.replace('_', ' ')}</span>
                </div>
                {p.totalOrdered > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                      <span>Delivery Progress</span>
                      <span>{((p.totalDelivered / p.totalOrdered) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${(p.totalDelivered / p.totalOrdered) * 100}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-2 text-sm font-extrabold text-emerald-700">{formatPKR(p.totalDelivered)} delivered</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CustomerDetailPage />
    </div>
  );
}
