import React, { useState } from 'react';
import {
  Search,
  Bell,
  Plus,
  X,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { DashboardSection } from './types';

interface DashboardTopNavProps {
  activeSection: DashboardSection;
  onOpenNewTicketModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DashboardTopNav: React.FC<DashboardTopNavProps> = ({
  activeSection,
  onOpenNewTicketModal,
  searchQuery,
  onSearchChange,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const sectionTitles: Record<DashboardSection, { title: string; subtitle: string }> = {
    overview: {
      title: 'Operations Overview',
      subtitle: 'Real-time AI resolution, deflection, and ISP network KPIs',
    },
    inbox: {
      title: 'Shared Support Inbox',
      subtitle: 'Omnichannel subscriber conversations and team assignments',
    },
    ai_conversations: {
      title: 'Circle AI (Fin) Conversations',
      subtitle: 'Automated subscriber chats currently resolved by Gemini AI',
    },
    human_conversations: {
      title: 'Human Support Escalations',
      subtitle: 'Active subscriber sessions requiring Tier-1 NOC engineering review',
    },
    customers: {
      title: 'Subscriber Directory & OLT Telemetry',
      subtitle: 'Live PPPoE accounts, fiber optical signal levels, and billing history',
    },
    tickets: {
      title: 'Complaint & NOC Tickets',
      subtitle: 'Field technician dispatches, optical breaks, and routing issues',
    },
    ai_activity: {
      title: 'AI Tool Execution Log',
      subtitle: 'Live audit of Gemini function calling executions and latency',
    },
    knowledge_base: {
      title: 'ISP Knowledge Base & RAG Index',
      subtitle: 'Troubleshooting guides, router configs, and billing documentation',
    },
    analytics: {
      title: 'Analytics & Performance Reports',
      subtitle: 'Deflection metrics, CSAT scores, and agent workload leaderboard',
    },
    settings: {
      title: 'Platform Settings & OLT Integrations',
      subtitle: 'Gemini model parameters, auto-escalation thresholds, and NOC alerts',
    },
  };

  const currentMeta = sectionTitles[activeSection];

  const notifications = [
    {
      id: 'notif-1',
      type: 'critical',
      title: 'Critical Optical Loss Alert',
      desc: 'Subscriber Tanvir Ahmed (CN-99412) in Dhanmondi is at -28.9 dBm.',
      time: '12m ago',
      icon: AlertTriangle,
      color: 'text-red-700 bg-red-50 border-red-200',
    },
    {
      id: 'notif-2',
      type: 'escalation',
      title: 'Human Desk Takeover Requested',
      desc: 'Sadia Sultana (CN-77301) requested a technician for BDIX routing.',
      time: '45m ago',
      icon: UserCheck,
      color: 'text-amber-800 bg-amber-50 border-amber-200',
    },
    {
      id: 'notif-3',
      type: 'resolved',
      title: 'Port Reboot Completed',
      desc: 'OLT 10.200.14.2 re-synchronized ONU port for Rashedul Hasan.',
      time: '1h ago',
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between select-none relative z-30 shadow-2xs">
      {/* Active Section Breadcrumb */}
      <div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>{currentMeta.title}</span>
          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
            WORKSPACE
          </span>
        </h1>
        <p className="text-[11px] text-slate-500 font-medium">{currentMeta.subtitle}</p>
      </div>

      {/* Center Search Input */}
      <div className="hidden md:flex items-center w-80 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search subscribers, PPPoE, tickets, or messages..."
          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right Actions & Notifications */}
      <div className="flex items-center gap-3">
        {/* New Ticket CTA Button (Golden-Amber Gradient) */}
        <button
          type="button"
          onClick={onOpenNewTicketModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Ticket</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors relative shadow-2xs"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-slideUp">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-600" /> Notifications
                </span>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  3 New
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto widget-scroll">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-amber-600" />
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{n.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
