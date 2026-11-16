import React, { useState, useEffect } from 'react';
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
import { MOCK_DASHBOARD_CONVERSATIONS, MOCK_TICKETS } from './mockData';
import { api } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_DASHBOARD_CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [targetSubscriberForTicket, setTargetSubscriberForTicket] = useState<string>('CN-99412');

  // Load real conversations from backend or fallback to rich mock data
  useEffect(() => {
    async function fetchConvs() {
      try {
        const live = await api.getConversations();
        if (live && live.length > 0) {
          // Merge live conversations with mock demo data to keep full demo experience
          const combined = [...live];
          for (const m of MOCK_DASHBOARD_CONVERSATIONS) {
            if (!combined.some((c) => c.id === m.id)) {
              combined.push(m);
            }
          }
          setConversations(combined);
        }
      } catch (err) {
        // Fallback to local mock data
        setConversations(MOCK_DASHBOARD_CONVERSATIONS);
      }
    }
    fetchConvs();
  }, []);

  const handleSendMessage = async (convId: string, text: string, isInternalNote = false) => {
    try {
      await api.sendMessage(convId, text, 'human_agent', isInternalNote ? 'Internal NOC Note' : 'Support Desk Engineer');
    } catch {
      // Offline fallback
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const newMsg = {
            id: `msg-${Date.now()}`,
            conversation_id: convId,
            sender_type: isInternalNote ? ('system' as const) : ('human_agent' as const),
            sender_name: isInternalNote ? 'Internal NOC Note 🔒' : 'Farhan Kabir (NOC)',
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
  };

  const handleStatusChange = async (convId: string, status: string) => {
    try {
      await api.updateConversationStatus(convId, status);
    } catch {
      // Offline fallback
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, status: status as any } : c))
    );
  };

  const handleCreateTicketFromInbox = (subscriberId: string) => {
    setTargetSubscriberForTicket(subscriberId);
    setIsTicketModalOpen(true);
  };

  const handleCreateNewTicketSubmit = (ticketData: any) => {
    const newTkt = {
      id: `tkt-${Date.now()}`,
      ticketNumber: `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      subscriberId: ticketData.subscriberId,
      subscriberName: ticketData.subscriberName,
      title: ticketData.title,
      category: ticketData.category,
      priority: ticketData.priority,
      status: 'open' as const,
      assignedAgent: ticketData.assignedAgent,
      createdAt: 'Just now',
      updatedAt: 'Just now',
      slaRemainingHours: 2.0,
    };
    MOCK_TICKETS.unshift(newTkt);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#141414] select-none">
      {/* 1. Left Sidebar Navigation across 10 sections */}
      <DashboardSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Main Center Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <DashboardTopNav
          activeSection={activeSection}
          onOpenNewTicketModal={() => setIsTicketModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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

          {activeSection === 'settings' && <SettingsView />}
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
