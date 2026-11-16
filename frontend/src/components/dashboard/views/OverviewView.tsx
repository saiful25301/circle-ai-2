import React, { useState, useEffect } from 'react';
import {
  Zap,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Radio,
  Server,
  Activity,
  Plus
} from 'lucide-react';
import { MOCK_DASHBOARD_METRICS, MOCK_AGENTS, MOCK_TICKETS } from '../mockData';
import { DashboardSection } from '../types';
import { api } from '../../../services/api';

interface OverviewViewProps {
  onNavigateSection: (section: DashboardSection) => void;
  onOpenTicketModal: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateSection,
  onOpenTicketModal,
}) => {
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

  const m = {
    ...MOCK_DASHBOARD_METRICS,
    totalConversationsToday: stats?.total_conversations ?? MOCK_DASHBOARD_METRICS.totalConversationsToday,
    deflectionRate: stats?.ai_resolved_percentage ?? MOCK_DASHBOARD_METRICS.deflectionRate,
    openNocTickets: stats?.open_tickets ?? MOCK_DASHBOARD_METRICS.openNocTickets,
    avgFirstResponseSeconds: stats?.average_response_time_seconds ?? MOCK_DASHBOARD_METRICS.avgFirstResponseSeconds,
    customerSatisfactionScore: stats?.customer_satisfaction_score ?? MOCK_DASHBOARD_METRICS.customerSatisfactionScore,
  };

  return (
    <div className="flex-1 overflow-y-auto widget-scroll p-6 space-y-6 bg-slate-50 text-slate-900">
      {/* Top Banner: Circle Network NOC Status (Warm Light Theme) */}
      <div className="bg-gradient-to-r from-amber-50/70 via-white to-orange-50/50 border border-amber-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Circle AI Operations Center</h2>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                ALL OLT CORES ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Serving residential fiber broadband subscribers across Dhaka & Nationwide
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTicketModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Support Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('inbox')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs transition-colors shadow-2xs"
          >
            <span>Open Shared Inbox</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-semibold">AI Resolution</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{m.aiResolutionRate}%</div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-bold">
            <TrendingUp className="w-3 h-3" /> +4.2% this week
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-semibold">Deflection Rate</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{m.deflectionRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Zero human touch</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-semibold">Chats Today</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{m.totalConversationsToday}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-bold">{m.activeNow} active now</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-semibold">Human Handover</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{m.humanEscalated}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Tier-1 & NOC routed</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-semibold">Avg Response</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{m.avgFirstResponseSeconds}s</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-bold">Gemini 1.5 Flash</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-semibold">Open Tickets</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{m.openNocTickets}</div>
          <div className="text-[11px] text-red-600 mt-1 font-bold">{m.criticalFiberAlarms} critical alarms</div>
        </div>
      </div>

      {/* Main Grid: Fiber Outage Telemetry & Agent Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Fiber Outage & Critical Alarms */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">Active OLT Telemetry & Fiber Health</h3>
              </div>
              <span className="text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Live Sensor Feed
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-red-50/60 border border-red-200 rounded-xl p-3.5 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-700 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">Dhanmondi-27 GPON0/1:7 High Attenuation</h4>
                      <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded font-mono font-bold">
                        -28.9 dBm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">
                      Subscriber Tanvir Ahmed (CN-99412) packet drop alert. Technician Farhan Kabir assigned.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateSection('tickets')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold shrink-0 shadow-xs"
                >
                  View Ticket
                </button>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">Mirpur-10 EPON0/2 OLT Distribution Hub</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        -19.4 dBm (Normal)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">
                      All 128 PON optical ports operating within healthy -15 to -24 dBm tolerance limits.
                    </p>
                  </div>
                </div>
                <span className="text-emerald-700 text-xs font-bold px-2 py-1 bg-emerald-100 rounded-lg">Healthy</span>
              </div>
            </div>
          </div>

          {/* Urgent Tickets Preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Urgent Priority Complaint Tickets
              </h3>
              <button
                type="button"
                onClick={() => onNavigateSection('tickets')}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
              >
                <span>All Tickets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {MOCK_TICKETS.slice(0, 3).map((tkt) => (
                <div
                  key={tkt.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-amber-800 font-bold">{tkt.ticketNumber}</span>
                      <span className="font-bold text-slate-900">{tkt.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Sub: {tkt.subscriberName} ({tkt.subscriberId}) • Assignee: {tkt.assignedAgent}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      tkt.priority === 'urgent'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {tkt.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Team Activity Leaderboard */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              Support Desk Engineers
            </h3>

            <div className="space-y-3">
              {MOCK_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                      {agent.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{agent.name}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            agent.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        ></span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {agent.role === 'noc_engineer' ? 'NOC Engineer' : agent.role === 'admin' ? 'NOC Lead' : 'Tier-1 Support'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-extrabold text-slate-900">{agent.resolvedTodayCount}</div>
                    <div className="text-[10px] text-slate-500 font-medium">resolved today</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick RAG Citation Snapshot */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              Top AI Knowledge Citations
            </h3>
            <p className="text-[11px] text-slate-500 mb-3 font-medium">
              Most invoked ISP troubleshooting guides by Circle AI
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-700 truncate font-medium">bKash & Nagad Merchant Pay</span>
                <span className="font-mono text-amber-700 font-bold">2,050x</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-700 truncate font-medium">Wi-Fi Router PPPoE (MTU 1492)</span>
                <span className="font-mono text-amber-700 font-bold">1,210x</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-700 truncate font-medium">Red LOS Optical Light Bend</span>
                <span className="font-mono text-amber-700 font-bold">843x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
