'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalPipelineValue: number;
    winRate: number;
    avgVelocityDays: number;
    activeDeals: number;
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
  };
  pipelineValue: { status: string; deal_count: number; total_value: number }[];
  stageVelocity: { stage: string; label: string; avg_days: number; count: number }[];
  revenueByClient: { client_name: string; deal_count: number; total_revenue: number }[];
  conversionFunnel: { stage: string; label: string; count: number }[];
  dealTypeDistribution: { deal_type: string; count: number; total_value: number }[];
  monthlyTrend: { month: string; deals_created: number; total_value: number }[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#a5b4fc'];
const TYPE_COLORS: Record<string, string> = {
  talent: '#6366f1',
  music: '#ec4899',
  talent_and_music: '#8b5cf6',
};
const TYPE_LABELS: Record<string, string> = {
  talent: 'Talent',
  music: 'Music',
  talent_and_music: 'Both',
};

function currency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    fetchAnalytics();
  }, [expanded]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // fail silently
    }
    setLoading(false);
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 mb-3 group"
      >
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Analytics
        {data && !expanded && (
          <span className="text-xs text-gray-400 font-normal ml-1">
            ({data.summary.activeDeals} active · {currency(data.summary.totalPipelineValue)} pipeline)
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-4">
          {loading && !data ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
              Loading analytics...
            </div>
          ) : data ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  label="Pipeline Value"
                  value={currency(data.summary.totalPipelineValue)}
                  sublabel={`${data.summary.activeDeals} active deals`}
                  color="indigo"
                />
                <SummaryCard
                  label="Win Rate"
                  value={`${data.summary.winRate}%`}
                  sublabel={`${data.summary.wonDeals}W / ${data.summary.lostDeals}L`}
                  color="green"
                />
                <SummaryCard
                  label="Avg Stage Time"
                  value={`${data.summary.avgVelocityDays}d`}
                  sublabel="per pipeline stage"
                  color="blue"
                />
                <SummaryCard
                  label="Total Deals"
                  value={String(data.summary.totalDeals)}
                  sublabel={`${data.summary.wonDeals} completed`}
                  color="purple"
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pipeline Value by Stage */}
                {data.pipelineValue.length > 0 && (
                  <ChartCard title="Pipeline Value by Stage">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.pipelineValue.filter(p => p.total_value > 0)} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="status"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => currency(v)} />
                        <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Value']} />
                        <Bar dataKey="total_value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Deal Type Distribution */}
                {data.dealTypeDistribution.length > 0 && (
                  <ChartCard title="Deal Type Distribution">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={data.dealTypeDistribution.map(d => ({
                            ...d,
                            name: TYPE_LABELS[d.deal_type] || d.deal_type,
                          }))}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          label={({ name, value }: any) => `${name}: ${value}`}
                          labelLine={true}
                        >
                          {data.dealTypeDistribution.map((d, i) => (
                            <Cell key={i} fill={TYPE_COLORS[d.deal_type] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Stage Velocity */}
                {data.stageVelocity.length > 0 && (
                  <ChartCard title="Avg Days per Stage">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.stageVelocity} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={75} />
                        <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)} days`, 'Avg Time']} />
                        <Bar dataKey="avg_days" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Top Clients by Revenue */}
                {data.revenueByClient.length > 0 && (
                  <ChartCard title="Top Clients by Revenue">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.revenueByClient.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => currency(v)} />
                        <YAxis type="category" dataKey="client_name" tick={{ fontSize: 10 }} width={75} />
                        <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                        <Bar dataKey="total_revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Monthly Trend */}
                {data.monthlyTrend.length > 1 && (
                  <ChartCard title="Deal Activity (12mo)" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={data.monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="deals_created"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={0.15}
                          name="Deals Created"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Conversion Funnel */}
                {data.conversionFunnel.length > 0 && data.conversionFunnel.some(f => f.count > 0) && (
                  <ChartCard title="Pipeline Funnel" className="lg:col-span-2">
                    <div className="space-y-1.5 px-2">
                      {data.conversionFunnel.map((stage, i) => {
                        const maxCount = Math.max(...data.conversionFunnel.map(f => f.count), 1);
                        const width = Math.max((stage.count / maxCount) * 100, 4);
                        return (
                          <div key={stage.stage} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-28 text-right truncate">{stage.label}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${width}%`,
                                  backgroundColor: COLORS[i % COLORS.length],
                                  opacity: 0.8,
                                }}
                              />
                              <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-white mix-blend-difference">
                                {stage.count}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ChartCard>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
              Unable to load analytics data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sublabel, color }: { label: string; value: string; sublabel: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color] || colorMap.indigo}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-60">{sublabel}</p>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h4>
      {children}
    </div>
  );
}
