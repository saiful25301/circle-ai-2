import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Zap,
  Clock,
  Star,
  Users,
  PieChart,
} from 'lucide-react';
import { MOCK_AGENTS } from '../mockData';
import { api } from '../../../services/api';

export const AnalyticsReportsView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const live = await api.getAnalytics();
        setStats(live);
      } catch {
        // fallback
      }
    }
    loadStats();
  }, []);

  const issues = stats?.top_issues?.length
    ? stats.top_issues.map((i: any, idx: number) => ({
        label: i.category,
        percentage: i.percentage,
        color: ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][idx % 4],
      }))
    : [
        { label: 'Fiber Optical Loss / Red LOS on ONU', percentage: 42, color: 'bg-red-500' },
        { label: 'Monthly Bill / bKash Payment Reconciliation', percentage: 30, color: 'bg-[#FDBC1F]' },
        { label: 'Wi-Fi Router PPPoE (MTU 1492) Setup', percentage: 17, color: 'bg-blue-500' },
        { label: 'Bandwidth Upgrade & BDIX Peering Routing', percentage: 11, color: 'bg-emerald-500' },
      ];

  const deflectionRate = stats ? `${stats.ai_resolved_percentage}%` : '74.2%';
  const csat = stats ? `${stats.customer_satisfaction_score} / 5.0` : '4.8 / 5.0';
  const latency = stats ? `${stats.average_response_time_seconds}s` : '1.1s';
  const handoverRate = stats ? `${stats.human_escalated_percentage}%` : '21.6%';

  return (
    <div className="flex-1 overflow-y-auto widget-scroll p-6 space-y-6 bg-slate-50 text-slate-900">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            AI Deflection & Support Performance Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time ISP conversation metrics, deflection rate, and support officer response latency
          </p>
        </div>
        <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl font-bold">
          Last 30 Days (November 2026)
        </span>
      </div>

      {/* KPI 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">AI Deflection Rate</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{deflectionRate}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            ↑ 5.8% vs last month
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Customer CSAT</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{csat}</div>
          <div className="text-[11px] text-slate-500 mt-1">Based on 1,420 ratings</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">First Response Latency</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{latency}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            Instant Gemini AI inference
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Human Handover Rate</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{handoverRate}</div>
          <div className="text-[11px] text-slate-500 mt-1">Only severe fiber issues</div>
        </div>
      </div>

      {/* Breakdown: Issues distribution & Agent Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Categorization Bars */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-600" />
            Subscriber Inquiries by ISP Category
          </h3>

          <div className="space-y-4 pt-2">
            {issues.map((item: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="font-mono text-slate-900">{item.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Officer Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            Support Officer Resolution Leaderboard
          </h3>

          <div className="space-y-3 pt-2">
            {MOCK_AGENTS.map((agent, i) => (
              <div
                key={agent.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200">
                    {agent.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{agent.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{agent.role.replace('_', ' ')}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-emerald-700 text-sm">{agent.resolvedTodayCount}</span>
                  <span className="text-[10px] text-slate-400 ml-1">resolved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
