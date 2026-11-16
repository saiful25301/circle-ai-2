import React, { useState, useEffect } from 'react';
import {
  Shield,
  Headphones,
  Lock,
  Mail,
  Key,
  ArrowRight,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopNav } from './DashboardTopNav';
import { ThreeColumnInbox } from './ThreeColumnInbox';
import { OverviewView } from './views/OverviewView';
import { CustomerContactsView } from './views/CustomerContactsView';
import { ComplaintTicketsView } from './views/ComplaintTicketsView';
import { AIAgentActivityView } from './views/AIAgentActivityView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { AnalyticsReportsView } from './views/AnalyticsReportsView';
import { SettingsView } from './views/SettingsView';
import { NewTicketModal } from './NewTicketModal';
import { DashboardSection } from './types';
import { Conversation } from '../../types';
import { MOCK_DASHBOARD_CONVERSATIONS } from './mockData';
import { api, AuthUser } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => api.getAuthUser());
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [targetSubscriberForTicket, setTargetSubscriberForTicket] = useState<string>('CN-99412');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@circlenetwork.com.bd');
  const [loginPassword, setLoginPassword] = useState('Circle@2026');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Load real conversations from backend
  const loadConversations = async () => {
    try {
      const live = await api.getConversations();
      if (live && live.length > 0) {
        setConversations(live);
      } else {
        setConversations(MOCK_DASHBOARD_CONVERSATIONS);
      }
    } catch {
      // Fallback if backend connection fails
      setConversations(MOCK_DASHBOARD_CONVERSATIONS);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await api.login(loginEmail, loginPassword);
      setCurrentUser({
        id: '',
        email: data.email,
        full_name: data.full_name,
        role: data.role,
      });
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'agent') => {
    const email = role === 'admin' ? 'admin@circlenetwork.com.bd' : 'agent@circlenetwork.com.bd';
    const password = role === 'admin' ? 'Circle@2026' : 'Agent@2026';
    setLoginEmail(email);
    setLoginPassword(password);
    setLoginLoading(true);
    setLoginError(null);
    try {
      const data = await api.login(email, password);
      setCurrentUser({
        id: '',
        email: data.email,
        full_name: data.full_name,
        role: data.role,
      });
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleSendMessage = async (convId: string, text: string, isInternalNote = false) => {
    try {
      await api.sendMessage(
        convId,
        text,
        isInternalNote ? 'internal_note' : 'human_agent',
        isInternalNote ? 'Internal NOC Note 🔒' : currentUser?.full_name || 'Support Officer'
      );
      // Reload fresh conversation stream from DB
      await loadConversations();
    } catch {
      // Offline fallback state update
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            const newMsg = {
              id: `msg-${Date.now()}`,
              conversation_id: convId,
              sender_type: isInternalNote ? ('internal_note' as const) : ('human_agent' as const),
              sender_name: isInternalNote ? 'Internal NOC Note 🔒' : currentUser?.full_name || 'Support Desk',
              content: text,
              created_at: new Date().toISOString(),
            };
            return {
              ...c,
              updated_at: new Date().toISOString(),
              messages: [...c.messages, newMsg],
            };
          }
          return c;
        })
      );
    }
  };

  const handleStatusChange = async (convId: string, status: string) => {
    try {
      await api.updateConversationStatus(convId, status);
      await loadConversations();
    } catch {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, status: status as any } : c))
      );
    }
  };

  const handleCreateTicketFromInbox = (subscriberId: string) => {
    setTargetSubscriberForTicket(subscriberId);
    setIsTicketModalOpen(true);
  };

  const handleCreateNewTicketSubmit = async (ticketData: any) => {
    try {
      await api.createTicket({
        customer_id: ticketData.subscriberId,
        title: ticketData.title,
        description: ticketData.description || ticketData.title,
        category: ticketData.category,
        priority: ticketData.priority,
        assigned_to: ticketData.assignedAgent,
      });
    } catch (e) {
      console.warn('Could not save ticket to backend:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // Protected View: If unauthenticated, display Circle AI Login Portal
  // ---------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-screen select-none">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6 animate-fadeIn">
          {/* Official Logo in White Framed Container */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <img
                src="/circle_network_logo.webp"
                alt="Circle Network Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Circle AI Staff Portal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                NOC Engineer & Customer Support Desk Access
              </p>
            </div>
          </div>

          {/* Quick One-Click Demo Role Selectors */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Role Sign-In
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loginLoading}
                className="p-3 rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-900">NOC Admin</div>
                  <div className="text-[10px] text-slate-500">Full platform access</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('agent')}
                disabled={loginLoading}
                className="p-3 rounded-2xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-xs">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-900">Support Agent</div>
                  <div className="text-[10px] text-slate-500">Inbox & Tickets</div>
                </div>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Or Manual Sign-In
            </span>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Manual Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="agent@circlenetwork.com.bd"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Support Desk</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center text-[11px] text-slate-400 pt-1">
            Protected by Circle Network Security • JWT Token Expiration: 24h
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated Dashboard
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 select-none">
      {/* 1. Left Sidebar Navigation across 10 sections */}
      <DashboardSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Main Center Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation with Auth Profile & Logout */}
        <DashboardTopNav
          activeSection={activeSection}
          onOpenNewTicketModal={() => setIsTicketModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Dynamic Section Views */}
        <main className="flex-1 flex overflow-hidden">
          {activeSection === 'overview' && (
            <OverviewView
              onNavigateSection={setActiveSection}
              onOpenTicketModal={() => setIsTicketModalOpen(true)}
            />
          )}

          {activeSection === 'inbox' && (
            <ThreeColumnInbox
              conversations={conversations}
              filterMode="all"
              onSendMessage={handleSendMessage}
              onStatusChange={handleStatusChange}
              onCreateTicket={handleCreateTicketFromInbox}
            />
          )}

          {activeSection === 'ai_conversations' && (
            <ThreeColumnInbox
              conversations={conversations}
              filterMode="ai_only"
              onSendMessage={handleSendMessage}
              onStatusChange={handleStatusChange}
              onCreateTicket={handleCreateTicketFromInbox}
            />
          )}

          {activeSection === 'human_conversations' && (
            <ThreeColumnInbox
              conversations={conversations}
              filterMode="human_only"
              onSendMessage={handleSendMessage}
              onStatusChange={handleStatusChange}
              onCreateTicket={handleCreateTicketFromInbox}
            />
          )}

          {activeSection === 'customers' && <CustomerContactsView />}

          {activeSection === 'tickets' && (
            <ComplaintTicketsView onOpenCreateModal={() => setIsTicketModalOpen(true)} />
          )}

          {activeSection === 'ai_activity' && <AIAgentActivityView />}

          {activeSection === 'knowledge_base' && <KnowledgeBaseView />}

          {activeSection === 'analytics' && <AnalyticsReportsView />}

          {/* Role-Protected Section: Settings restricted to Admin */}
          {activeSection === 'settings' && (
            currentUser.role === 'admin' ? (
              <SettingsView />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
                <div className="max-w-md bg-white border border-amber-200 rounded-3xl p-6 shadow-sm text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Administrator Permissions Required
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    OLT network configurations, Gemini model parameters, and merchant billing thresholds are restricted to <span className="font-bold text-amber-700">NOC Administrators</span>. Your current account role is <span className="font-bold text-blue-700 capitalize">{currentUser.role}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('overview')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-xs"
                  >
                    Return to Overview
                  </button>
                </div>
              </div>
            )
          )}
        </main>
      </div>

      {/* New Ticket Creation Modal */}
      <NewTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSubmit={handleCreateNewTicketSubmit}
        defaultSubscriberId={targetSubscriberForTicket}
      />
    </div>
  );
};
