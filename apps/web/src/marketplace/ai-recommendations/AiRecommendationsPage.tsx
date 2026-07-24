import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles, Package, TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Zap, CheckCircle2, ArrowRight, BarChart3, Brain, Target, Star,
  Lightbulb, ArrowUp, ArrowDown, Users,
} from 'lucide-react';
import { aiApi, type DemandForecast, type PriceOptimization } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function AiRecommendationsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [activeTab, setActiveTab] = useState<'insights' | 'demand' | 'pricing' | 'customers'>('insights');

  const { data: insights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: aiApi.insights,
  });

  const { data: forecast } = useQuery({
    queryKey: ['ai-demand'],
    queryFn: aiApi.demandForecast,
    enabled: activeTab === 'demand',
  });

  const { data: pricing } = useQuery({
    queryKey: ['ai-pricing'],
    queryFn: aiApi.priceOptimization,
    enabled: activeTab === 'pricing',
  });

  const { data: recommendations } = useQuery({
    queryKey: ['ai-customer-recs'],
    queryFn: () => aiApi.customerRecommendations(20),
    enabled: activeTab === 'customers',
  });

  return (
    <div className="space-y-5 pb-10">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Brain className="h-3.5 w-3.5 text-purple-300" />
              AI-Powered Insights
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Smart Recommendations</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              AI analyzes karta hai — forecast, pricing, aur customer suggestions
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: 'insights',  label: 'AI Insights',        icon: Lightbulb, color: 'purple' },
          { key: 'demand',    label: 'Demand Forecast',    icon: TrendingUp, color: 'emerald' },
          { key: 'pricing',   label: 'Price Optimization', icon: DollarSign, color: 'amber' },
          { key: 'customers', label: 'For Customers',      icon: Users,      color: 'blue' },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-black transition border-2 inline-flex items-center gap-1.5 ${
                isActive ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'insights' && (
        <div className="grid md:grid-cols-2 gap-4">
          {insights?.length === 0 ? (
            <div className="md:col-span-2 rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
              <Lightbulb className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900">No insights yet</h3>
              <p className="text-sm text-slate-500 mt-1">AI is still learning your business patterns</p>
            </div>
          ) : (
            insights?.map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
        </div>
      )}

      {activeTab === 'demand' && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b-2 border-slate-100 bg-emerald-50">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Demand Forecasting
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">Products jo jaldi khatam ho jayenge — reorder karein</p>
          </div>
          <div className="p-4 space-y-3">
            {forecast?.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-black text-slate-600">No forecast data yet</p>
              </div>
            ) : (
              forecast?.map((f) => <DemandForecastRow key={f.productId} forecast={f} />)
            )}
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b-2 border-slate-100 bg-amber-50">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Price Optimization
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">AI ke suggestions — kaunsi price se zyada revenue hoga</p>
          </div>
          <div className="p-4 space-y-3">
            {pricing?.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-black text-slate-600">Not enough data yet</p>
              </div>
            ) : (
              pricing?.map((p) => (
                <PriceOptimizationRow
                  key={p.productId}
                  optimization={p}
                  onApply={async (newPrice) => {
                    await aiApi.applyPriceSuggestion(p.productId, newPrice);
                    toast.success(`✅ Price updated to Rs ${newPrice}`);
                    qc.invalidateQueries({ queryKey: ['ai-pricing'] });
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid md:grid-cols-2 gap-4">
          {recommendations?.length === 0 ? (
            <div className="md:col-span-2 rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900">No customer recommendations yet</h3>
              <p className="text-sm text-slate-500 mt-1">AI needs more customer purchase data</p>
            </div>
          ) : (
            recommendations?.map((rec) => (
              <div key={rec.customerId} className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                  <div className="h-10 w-10 rounded-full bg-blue-100 overflow-hidden shrink-0">
                    {rec.avatarUrl ? (
                      <img src={rec.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-black text-blue-700">
                        {rec.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 truncate">{rec.fullName}</div>
                    <div className="text-[10px] text-slate-500 font-bold">Recommended for them</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {rec.suggestions.slice(0, 3).map((s) => (
                    <div key={s.productId} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                      <div className="h-10 w-10 rounded-lg bg-white overflow-hidden shrink-0 border">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">{s.productName}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{s.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-700 tabular-nums">Rs {formatPKR(s.price)}</div>
                        <div className="text-[9px] text-purple-600 font-black">Match: {(s.score * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const INSIGHT_META: Record<string, { icon: any; gradient: string; textColor: string; bgColor: string }> = {
  OPPORTUNITY:  { icon: TrendingUp,   gradient: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  WARNING:      { icon: AlertTriangle, gradient: 'from-rose-500 to-red-600',    textColor: 'text-rose-700',    bgColor: 'bg-rose-50' },
  INFO:         { icon: Lightbulb,    gradient: 'from-blue-500 to-indigo-600', textColor: 'text-blue-700',    bgColor: 'bg-blue-50' },
  CELEBRATION:  { icon: Star,         gradient: 'from-yellow-400 to-amber-500', textColor: 'text-amber-700',   bgColor: 'bg-amber-50' },
};

function InsightCard({ insight }: any) {
  const meta = INSIGHT_META[insight.type] || INSIGHT_META.INFO;
  const Icon = meta.icon;

  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all">
      <div className={`h-1 bg-gradient-to-r ${meta.gradient}`} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bgColor} ${meta.textColor}`}>
                {insight.type}
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                insight.impact === 'HIGH' ? 'bg-red-100 text-red-700' :
                insight.impact === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {insight.impact} IMPACT
              </span>
            </div>
            <h3 className="font-black text-slate-900">{insight.title}</h3>
            <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{insight.description}</p>

            {insight.metric && (
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">{insight.metric.value}</span>
                {insight.metric.change !== 0 && (
                  <span className={`text-xs font-black inline-flex items-center gap-0.5 ${
                    insight.metric.change > 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {insight.metric.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(insight.metric.change).toFixed(1)}%
                  </span>
                )}
              </div>
            )}

            {insight.actionUrl && insight.actionLabel && (
              <a
                href={insight.actionUrl}
                className={`mt-3 inline-flex items-center gap-1 text-xs font-black ${meta.textColor} hover:opacity-80`}
              >
                {insight.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemandForecastRow({ forecast: f }: { forecast: DemandForecast }) {
  const urgencyMeta: Record<string, { color: string; bg: string; label: string }> = {
    CRITICAL: { color: 'text-red-800', bg: 'bg-red-100', label: '🚨 Critical — Reorder NOW' },
    HIGH:     { color: 'text-orange-800', bg: 'bg-orange-100', label: '⚠️ High — Reorder Soon' },
    MEDIUM:   { color: 'text-amber-800', bg: 'bg-amber-100', label: '⏰ Medium' },
    LOW:      { color: 'text-slate-700', bg: 'bg-slate-100', label: 'Low' },
    NONE:     { color: 'text-slate-500', bg: 'bg-slate-50', label: 'Adequate' },
  };
  const meta = urgencyMeta[f.urgency];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-300 transition">
      <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
        {f.imageUrl ? (
          <img src={f.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Package className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-slate-900 truncate">{f.productName}</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>{meta.label}</span>
        </div>
        <div className="text-[10px] text-slate-500 font-bold mt-0.5">
          Current stock: <span className="text-slate-900">{f.currentStock}</span> · Avg daily: {f.avgDailySales.toFixed(1)}
          {f.daysUntilStockout !== undefined && f.daysUntilStockout > 0 && (
            <> · Days until stockout: <span className="text-rose-700 font-black">{f.daysUntilStockout}</span></>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[9px] font-black text-slate-500 uppercase">7d / 30d</div>
        <div className="text-sm font-black text-slate-900 tabular-nums">{f.forecastNext7Days} / {f.forecastNext30Days}</div>
      </div>

      {f.recommendedReorderQty > 0 && (
        <div className="text-right shrink-0 pl-3 border-l border-slate-200">
          <div className="text-[9px] font-black text-emerald-700 uppercase">Reorder</div>
          <div className="text-lg font-black text-emerald-700 tabular-nums">{f.recommendedReorderQty}</div>
        </div>
      )}
    </div>
  );
}

function PriceOptimizationRow({ optimization: p, onApply }: { optimization: PriceOptimization; onApply: (newPrice: number) => void }) {
  const [applying, setApplying] = useState(false);
  const priceChange = ((p.suggestedPrice - p.currentPrice) / p.currentPrice) * 100;
  const isIncrease = priceChange > 0;

  const confidenceMeta: Record<string, { color: string; bg: string }> = {
    HIGH:   { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-100' },
    LOW:    { color: 'text-slate-700', bg: 'bg-slate-100' },
  };
  const cm = confidenceMeta[p.confidence];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-amber-300 transition">
      <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Package className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-slate-900 truncate">{p.productName}</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${cm.bg} ${cm.color}`}>
            {p.confidence} confidence
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-bold mt-0.5 line-clamp-1">{p.reasoning}</div>
        {p.expectedRevenueLift !== 0 && (
          <div className={`text-[10px] font-black mt-0.5 ${p.expectedRevenueLift > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            Expected impact: {p.expectedRevenueLift > 0 ? '+' : ''}{p.expectedRevenueLift.toFixed(1)}% revenue
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="text-[10px] font-black text-slate-500 line-through">Rs {formatPKR(p.currentPrice)}</div>
        <div className="text-lg font-black text-amber-700 tabular-nums">Rs {formatPKR(p.suggestedPrice)}</div>
        <div className={`text-[10px] font-black inline-flex items-center gap-0.5 ${isIncrease ? 'text-emerald-700' : 'text-rose-700'}`}>
          {isIncrease ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {Math.abs(priceChange).toFixed(1)}%
        </div>
      </div>

      <button
        onClick={async () => {
          setApplying(true);
          await onApply(p.suggestedPrice);
          setApplying(false);
        }}
        disabled={applying}
        className="h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black inline-flex items-center gap-1 disabled:opacity-50"
      >
        {applying ? <Sparkles className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        Apply
      </button>
    </div>
  );
}
