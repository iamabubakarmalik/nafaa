import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowRight } from 'lucide-react';

export default function GoogleErrorPage() {
  const [params] = useSearchParams();
  const message = params.get('message') || 'Google login mein masla ho gaya';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex mb-6">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-xl">
            <XCircle className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Login Fail Ho Gaya</h1>
        <p className="text-slate-600 text-sm mb-6">{message}</p>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-soft mb-4">
          <p className="text-xs text-slate-500">
            Common reasons:
          </p>
          <ul className="text-xs text-slate-700 mt-2 space-y-1 text-left list-disc list-inside">
            <li>Google popup close kar diya</li>
            <li>Internet connection slow hai</li>
            <li>Email pehle se kisi aur account se linked hai</li>
          </ul>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-700 text-white font-extrabold shadow-brand hover:shadow-brand-lg transition-all"
        >
          Dobara Try Karein
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
