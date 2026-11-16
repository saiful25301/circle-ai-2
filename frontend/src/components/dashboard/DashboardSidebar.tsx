import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Bot,
  UserCheck,
  Users,
  Ticket,
  Activity,
  BookOpen,
  BarChart3,
  Settings,
  Radio,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { DashboardSection } from './types';

interface DashboardSidebarProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
}) => {
  const menuItems = [
    {
      id: 'overview' as DashboardSection,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'inbox' as DashboardSection,
      label: 'Shared Inbox',
      icon: Inbox,
      badge: '4',
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300',
    },
    {
      id: 'ai_conversations' as DashboardSection,
      label: 'AI Conversations',
      icon: Bot,
      badge: 'Fin',
      badgeColor: 'bg-amber-50 text-amber-800 border border-amber-200',
    },
    {
      id: 'human_conversations' as DashboardSection,
      label: 'Human Support',
      icon: UserCheck,
      badge: '2 Urgent',
      badgeColor: 'bg-red-50 text-red-700 border border-red-200',
    },
    {
      id: 'customers' as DashboardSection,
      label: 'Subscriber Directory',
      icon: Users,
      badge: null,
    },
    {
      id: 'tickets' as DashboardSection,
      label: 'Complaint Tickets',
      icon: Ticket,
      badge: '14 Open',
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
    },
    {
      id: 'ai_activity' as DashboardSection,
      label: 'AI Tool Activity',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    },
    {
      id: 'knowledge_base' as DashboardSection,
      label: 'Knowledge Base',
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'analytics' as DashboardSection,
      label: 'Analytics & KPIs',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings' as DashboardSection,
      label: 'Settings & OLT',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 select-none shrink-0 shadow-xs ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Logo Section */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
          {!collapsed ? (
            <div className="bg-white px-2 py-1 rounded-xl border border-slate-200/80 shadow-2xs flex items-center">
              <img
                src="/circle_network_logo.webp"
                alt="Circle Network"
                className="h-8 max-w-[150px] object-contain drop-shadow-2xs"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs mx-auto shadow-sm">
              CN
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Presence Tag (Expanded only) */}
        {!collapsed && (
          <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>OLT Telemetry</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5 rounded border border-emerald-300">
              OPERATIONAL
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)] widget-scroll">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-600'
                  }`}
                />

                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              TH
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                <span>Tanvir Hasan</span>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                admin@circlenetwork.bd
              </div>
            </div>
          </div>
        ) : (
          <div
            className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center mx-auto shadow-xs"
            title="Tanvir Hasan (Admin)"
          >
            TH
          </div>
        )}
      </div>
    </aside>
  );
};
