import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Car, Wrench, Calendar, ArrowRight } from 'lucide-react';
import { customerVehiclesApi } from '../api/customer-vehicles.api';
import { workshopJobsApi } from '../api/workshop-jobs.api';
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';
import { formatPKR } from '@/lib/format';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

export default function AutoPartsCustomerDetailPage() {
  const { id } = useParams();

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['customer-vehicles-detail', id],
    queryFn: () => customerVehiclesApi.list({}),
    enabled: !!id,
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['workshop-jobs-detail', id],
    queryFn: () => workshopJobsApi.list({}),
    enabled: !!id,
  });

  const customerVehicles = (allVehicles as any[]).filter((v) => v.customerId === id);
  const customerJobs = (allJobs as any[]).filter((j) => j.customerId === id).slice(0, 10);

  return (
    <div className="space-y-6">
      {(customerVehicles.length > 0 || customerJobs.length > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-slate-50 to-orange-50 border-2 border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-700" />
            <h3 className="font-extrabold text-slate-900">🔧 Auto Parts / Workshop History</h3>
          </div>

          {customerVehicles.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-fuchsia-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-4 w-4 text-fuchsia-600" />
                <h4 className="font-bold text-slate-900 text-sm">🚗 Registered Vehicles ({customerVehicles.length})</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {customerVehicles.map((v: any) => (
                  <div key={v.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">{v.registrationNumber}</div>
                        <div className="text-xs text-slate-600 truncate">
                          {v.make?.name} {v.model?.name}
                          {v.year && ` (${v.year})`}
                        </div>
                        {v.color && <div className="text-[10px] text-slate-500">🎨 {v.color}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customerJobs.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-orange-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-100">
                <h4 className="font-bold text-slate-900 text-sm">🔧 Workshop Job History ({customerJobs.length})</h4>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {customerJobs.map((job: any) => (
                  <Link key={job.id} to={`/autoparts/jobs/${job.id}`}
                    className="block px-4 py-3 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-sm text-slate-900">{job.jobNumber}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            job.status === 'COMPLETED' || job.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                            job.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{job.status}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          🚗 {job.registrationNumber} • {job.makeName} {job.modelName}
                        </div>
                        <div className="text-[10px] text-slate-500 inline-flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />{formatDate(job.createdAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(job.total)}</div>
                        <ArrowRight className="h-3 w-3 text-slate-400 ml-auto" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <CustomerDetailPage />
    </div>
  );
}
