import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bot,
  User,
  Zap,
  Send,
  Sparkles,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Ticket as TicketIcon,
  Activity,
  Lock,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { Conversation, Customer } from '../../types';
import { SubscriberContact } from './types';
import { MOCK_SUBSCRIBERS } from './mockData';
import { api } from '../../services/api';

interface ThreeColumnInboxProps {
  conversations: Conversation[];
  filterMode?: 'all' | 'ai_only' | 'human_only';
  onSendMessage?: (convId: string, text: string, isInternalNote?: boolean) => void;
  onStatusChange?: (convId: string, status: string) => void;
  onCreateTicket?: (subId: string, convId: string) => void;
}

export const ThreeColumnInbox: React.FC<ThreeColumnInboxProps> = ({
  conversations,
  filterMode = 'all',
  onSendMessage,
  onStatusChange,
  onCreateTicket,
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'conversations' | 'chat' | 'telemetry'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<'all' | 'pending' | 'active' | 'ai' | 'resolved'>('all');
  const [replyText, setReplyText] = useState('');
  const [composerTab, setComposerTab] = useState<'reply' | 'internal_note'>('reply');
  const [rebooting, setRebooting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Agent Assignment & Transfer state
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentToAssign, setSelectedAgentToAssign] = useState<string>('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetAgent, setTransferTargetAgent] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Folder Counts state
  const [folderCounts, setFolderCounts] = useState({
    pending: 0,
    active: 0,
    resolved: 0,
    ai_active: 0,
  });

  // Agent availability status
  const [agentAvailability, setAgentAvailability] = useState<'online' | 'busy' | 'offline'>('online');

  // Customer Profile Telemetry & History
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [customerTickets, setCustomerTickets] = useState<any[]>([]);
  const [customerAILogs, setCustomerAILogs] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set default selected conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  // Match subscriber info from mock subscribers or fallback
  const fallbackSubscriber: SubscriberContact =
    MOCK_SUBSCRIBERS.find((s) => s.subscriberId === activeConversation?.customer_id) || MOCK_SUBSCRIBERS[0];

  const activeSubscriberId = activeConversation?.customer_id || fallbackSubscriber.subscriberId;

  // Load agents and folder counts
  const loadMetadata = async () => {
    try {
      const [agentsList, counts] = await Promise.all([
        api.getAgents().catch(() => []),
        api.getConversationCounts().catch(() => ({
          pending: conversations.filter((c) => ['waiting_for_agent', 'open'].includes(c.status)).length,
          active: conversations.filter((c) => ['agent_handling', 'human_takeover'].includes(c.status)).length,
          resolved: conversations.filter((c) => ['resolved', 'closed'].includes(c.status)).length,
          ai_active: conversations.filter((c) => ['ai_handling', 'AI_ACTIVE'].includes(c.status)).length,
        })),
      ]);
      setAgents(agentsList);
      setFolderCounts(counts);
    } catch (e) {
      console.warn('Error loading inbox metadata:', e);
    }
  };

  useEffect(() => {
    loadMetadata();
    const interval = setInterval(loadMetadata, 10000);
    return () => clearInterval(interval);
  }, [conversations.length]);

  // Load active customer details, tickets, and AI logs
  useEffect(() => {
    if (!activeSubscriberId) return;

    let mounted = true;
    (async () => {
      try {
        const [cust, tickets, aiLogs] = await Promise.all([
          api.getCustomer(activeSubscriberId).catch(() => null),
          api.getTickets().catch(() => []),
          api.getAILogs(10).catch(() => []),
        ]);
        if (mounted) {
          if (cust) setCustomerDetails(cust);
          setCustomerTickets(tickets.filter((t: any) => t.customer_id === activeSubscriberId));
          setCustomerAILogs(aiLogs.filter((l: any) => l.customer_id === activeSubscriberId || l.conversation_id === activeConversation?.id));
        }
      } catch (e) {
        console.warn('Failed to load customer profile details:', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeSubscriberId, activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSend = () => {
    const text = replyText.trim();
    if (!text || !activeConversation) return;

    if (onSendMessage) {
      onSendMessage(activeConversation.id, text, composerTab === 'internal_note');
    }
    setReplyText('');
    showNotice(composerTab === 'internal_note' ? '🔒 Internal note added to conversation' : 'Reply sent to customer');
  };

  const handleRebootPort = async () => {
    setRebooting(true);
    try {
      await api.rebootCustomer(activeSubscriberId);
      showNotice(`OLT ${customerDetails?.olt_ip || fallbackSubscriber.oltIp} re-synchronized port successfully.`);
    } catch {
      showNotice(`OLT reboot signal dispatched to subscriber ${activeSubscriberId}.`);
    } finally {
      setRebooting(false);
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!activeConversation || !agentId) return;
    try {
      await api.assignConversation(activeConversation.id, agentId);
      showNotice(`Assigned to agent successfully.`);
      setSelectedAgentToAssign(agentId);
      loadMetadata();
    } catch (err: any) {
      showNotice(err.message || 'Failed to assign agent.');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !transferTargetAgent || !transferReason.trim()) return;

    setIsTransferring(true);
    try {
      await api.transferConversation(activeConversation.id, transferTargetAgent, transferReason.trim());
      showNotice(`Conversation transferred successfully.`);
      setIsTransferModalOpen(false);
      setTransferReason('');
      loadMetadata();
    } catch (err: any) {
      showNotice(err.message || 'Transfer failed.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleHandbackToAI = async () => {
    if (!activeConversation) return;
    try {
      await api.handbackToAI(activeConversation.id);
      showNotice('Handed back to Circle AI successfully.');
      loadMetadata();
    } catch (err: any) {
      showNotice(err.message || 'Failed to hand back to AI.');
    }
  };

  const handleAvailabilityToggle = async (status: 'online' | 'busy' | 'offline') => {
    setAgentAvailability(status);
    const firstAgent = agents[0];
    if (firstAgent?.id) {
      try {
        await api.updateAgentStatus(firstAgent.id, status);
      } catch (e) {
        console.warn('Could not update agent status on server:', e);
      }
    }
    showNotice(`Status updated to ${status.toUpperCase()}`);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterMode === 'ai_only' && !['ai_handling', 'AI_ACTIVE'].includes(c.status)) return false;
    if (filterMode === 'human_only' && !['agent_handling', 'human_takeover'].includes(c.status)) return false;

    if (activeFolder === 'pending' && !['waiting_for_agent', 'open'].includes(c.status)) return false;
    if (activeFolder === 'active' && !['agent_handling', 'human_takeover'].includes(c.status)) return false;
    if (activeFolder === 'ai' && !['ai_handling', 'AI_ACTIVE'].includes(c.status)) return false;
    if (activeFolder === 'resolved' && !['resolved', 'closed'].includes(c.status)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchCustomer = (c.customer_id || '').toLowerCase().includes(q);
      const matchContent = c.messages.some((m) => m.content.toLowerCase().includes(q));
      return matchId || matchCustomer || matchContent;
    }

    return true;
  });

  const isAIHandled = ['ai_handling', 'AI_ACTIVE'].includes(activeConversation?.status || '');
  const isResolved = ['resolved', 'closed'].includes(activeConversation?.status || '');
  const isCustomerVerified = activeConversation?.metadata_info?.verified === true || Boolean(customerDetails);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 w-full">
      {/* ── Mobile/Tablet Responsive Switcher (< 1024px) ── */}
      <div className="lg:hidden flex items-center justify-between p-2 bg-slate-100 border-b border-slate-200 text-xs shrink-0 select-none">
        <div className="flex items-center gap-1 w-full bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileTab('conversations')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center text-xs transition-all ${
              mobileTab === 'conversations'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Conversations ({filteredConversations.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center text-xs transition-all ${
              mobileTab === 'chat'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chat ({activeSubscriberId})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('telemetry')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-center text-xs transition-all ${
              mobileTab === 'telemetry'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Subscriber & OLT
          </button>
        </div>
      </div>

      {/* ── COLUMN 1: Conversation List & Filter Bar ── */}
      <div
        className={`w-full lg:w-80 xl:w-88 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-2xs ${
          mobileTab === 'conversations' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Search & Folder Tabs */}
        <div className="p-3 border-b border-slate-200 space-y-2.5 bg-slate-50/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations, ID, or text..."
              className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs"
            />
          </div>

          {filterMode === 'all' && (
            <div className="flex gap-1 overflow-x-auto widget-scroll pb-0.5">
              {[
                { id: 'all', label: 'All', count: conversations.length },
                { id: 'pending', label: 'Pending', count: folderCounts.pending },
                { id: 'active', label: 'Active', count: folderCounts.active },
                { id: 'ai', label: 'Circle AI', count: folderCounts.ai_active },
                { id: 'resolved', label: 'Resolved', count: folderCounts.resolved },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFolder(tab.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg font-bold whitespace-nowrap transition-colors ${
                    activeFolder === tab.id
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeFolder === tab.id
                        ? 'bg-amber-200/80 text-amber-950 font-extrabold'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto widget-scroll divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found matching folder filter.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = (activeConversation?.id || '') === conv.id;
              const lastMsg = conv.messages[conv.messages.length - 1];
              const convIsHuman = ['agent_handling', 'human_takeover'].includes(conv.status);
              const convIsResolved = ['resolved', 'closed'].includes(conv.status);
              const convIsPending = ['waiting_for_agent', 'open'].includes(conv.status);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    setMobileTab('chat');
                  }}
                  className={`p-3.5 cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'bg-amber-50/70 border-l-4 border-amber-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {conv.customer_id || 'Subscriber'}
                      </span>
                      {conv.metadata_info?.verified && (
                        <span title="Verified Subscriber">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        convIsPending
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : convIsHuman
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : convIsResolved
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {convIsPending
                        ? 'Pending'
                        : convIsHuman
                        ? 'Agent'
                        : convIsResolved
                        ? 'Resolved'
                        : 'Circle AI'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                    {lastMsg
                      ? lastMsg.sender_type === 'internal_note'
                        ? `🔒 [Internal Note] ${lastMsg.content}`
                        : lastMsg.content
                      : 'No messages'}
                  </p>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-500">
                      {conv.channel === 'whatsapp' ? 'WhatsApp' : 'Webchat Widget'}
                    </span>
                    <span className="font-mono">
                      {new Date(conv.updated_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── COLUMN 2: Conversation Stream & Reply Composer ── */}
      <div
        className={`flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0 ${
          mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Header with Mode, Status & Escalation actions */}
        <div className="p-2.5 sm:p-3 px-3 sm:px-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 sm:gap-3 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Back button on mobile */}
            <button
              type="button"
              onClick={() => setMobileTab('conversations')}
              className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
              title="Back to conversation list"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {activeSubscriberId.split('-')[1]?.substring(0, 2) || 'CN'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  {customerDetails?.full_name || fallbackSubscriber.fullName}
                </h3>
                <span className="font-mono text-[10px] sm:text-xs text-amber-800 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded border border-amber-200 font-bold shrink-0">
                  {activeSubscriberId}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 ${
                    isCustomerVerified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {isCustomerVerified ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Unverified</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                PPPoE:{' '}
                <span className="font-mono text-slate-800 font-semibold">
                  {customerDetails?.pppoe_username || fallbackSubscriber.pppoeUsername}
                </span>{' '}
                • Zone: {customerDetails?.zone || fallbackSubscriber.zone}
              </p>
            </div>
          </div>

          {/* Action & Assignment Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Agent Availability Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleAvailabilityToggle('online')}
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                  agentAvailability === 'online' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="Status: Online"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Online</span>
              </button>
              <button
                type="button"
                onClick={() => handleAvailabilityToggle('busy')}
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                  agentAvailability === 'busy' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="Status: Busy"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Busy</span>
              </button>
              <button
                type="button"
                onClick={() => handleAvailabilityToggle('offline')}
                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                  agentAvailability === 'offline' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="Status: Offline"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Offline</span>
              </button>
            </div>

            {/* Assign Agent Dropdown */}
            <select
              value={activeConversation?.assigned_agent_id || selectedAgentToAssign}
              onChange={(e) => handleAssignAgent(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 shadow-2xs"
            >
              <option value="">Assign Agent...</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.role.replace('_', ' ')})
                </option>
              ))}
            </select>

            {/* Transfer Button */}
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
              title="Transfer conversation to another agent"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Transfer</span>
            </button>

            {/* Take Over vs Hand Back to AI */}
            {isAIHandled ? (
              <button
                type="button"
                onClick={() => onStatusChange?.(activeConversation.id, 'agent_handling')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Take Over</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleHandbackToAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors"
              >
                <Bot className="w-3.5 h-3.5 text-amber-600" />
                <span>Hand back to Circle AI</span>
              </button>
            )}

            {/* Resolve */}
            {!isResolved && (
              <button
                type="button"
                onClick={() => onStatusChange?.(activeConversation.id, 'resolved')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark Resolved</span>
              </button>
            )}

            {/* Mobile View OLT Telemetry Button */}
            <button
              type="button"
              onClick={() => setMobileTab('telemetry')}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-colors shadow-2xs"
              title="View Subscriber & OLT Telemetry"
            >
              <Info className="w-3.5 h-3.5 text-amber-600" />
              <span>OLT Profile</span>
            </button>
          </div>
        </div>

        {/* Global Action Notice Banner */}
        {actionNotice && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-1.5 flex items-center gap-2 font-bold animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto widget-scroll space-y-4 bg-slate-50">
          {activeConversation?.messages?.map((m) => {
            const isCust = m.sender_type === 'customer';
            const isAI = m.sender_type === 'ai_agent';
            const isNote = m.sender_type === 'internal_note';

            if (isNote) {
              return (
                <div
                  key={m.id}
                  className="w-full bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-950 shadow-xs animate-fadeIn space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200/80 pb-1 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Internal NOC Note (Staff Only)</span>
                      <span className="text-amber-700 font-normal">• {m.sender_name || 'Agent'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-800/80">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                  <div className="text-[10px] text-amber-800/70 font-semibold italic">
                    Private note — not visible to customer.
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1 px-1">
                  {isCust ? (
                    <>
                      <User className="w-3 h-3 text-amber-600" />
                      <span className="font-semibold text-slate-700">
                        {m.sender_name || customerDetails?.full_name || fallbackSubscriber.fullName}
                      </span>
                    </>
                  ) : isAI ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold text-slate-900">Circle AI</span>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-1 rounded font-bold font-mono">
                        AUTOMATED
                      </span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold text-blue-700">{m.sender_name || 'Support Desk Engineer'}</span>
                    </>
                  )}
                  <span className="text-slate-400 font-mono text-[10px]">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    isCust
                      ? 'bg-white text-slate-800 border border-slate-200 font-medium'
                      : isAI
                      ? 'bg-amber-50/80 text-amber-950 border border-amber-200 font-normal'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-normal'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Inline Tool Execution Badges & Telemetry Logs */}
                  {m.tool_calls && m.tool_calls.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-amber-200/80 space-y-1.5">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-amber-800/80 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>AI Agent Tool Executions ({m.tool_calls.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.tool_calls.map((tc: any, tcIdx: number) => (
                          <div
                            key={tcIdx}
                            className="bg-white/90 rounded-lg p-2 border border-amber-200/90 text-[10px] font-mono shadow-2xs"
                          >
                            <div className="flex items-center justify-between font-bold text-amber-900 mb-1">
                              <span className="flex items-center gap-1 text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {tc.tool_name}
                              </span>
                            </div>
                            {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                              <div className="text-slate-500 text-[9px] truncate">
                                args: {JSON.stringify(tc.arguments)}
                              </div>
                            )}
                            <div className="mt-1 bg-slate-50 rounded p-1 text-slate-700 max-h-24 overflow-y-auto widget-scroll text-[9px]">
                              {typeof tc.result === 'object' ? JSON.stringify(tc.result, null, 2) : String(tc.result)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* AI Copilot Response Suggestions for Support Officer */}
        <div className="p-2.5 bg-white border-t border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-1.5 font-bold px-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>AI Copilot Suggested Canned Responses:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto widget-scroll pb-1">
            <button
              type="button"
              onClick={() =>
                setReplyText(
                  'I have dispatched a soft reboot signal to your ONU port on our OLT. Please allow 60 seconds for the session to refresh.'
                )
              }
              className="text-[11px] bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 font-medium whitespace-nowrap transition-colors"
            >
              🔄 Port Reboot Notice
            </button>
            <button
              type="button"
              onClick={() =>
                setReplyText(
                  `Our optical telemetry indicates attenuation at (${
                    customerDetails?.optical_power_dbm || fallbackSubscriber.opticalPowerDbm
                  } dBm). A field NOC technician has been assigned to inspect your fiber drop line.`
                )
              }
              className="text-[11px] bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 font-medium whitespace-nowrap transition-colors"
            >
              👷 Field Technician Dispatch
            </button>
            <button
              type="button"
              onClick={() =>
                setReplyText(
                  'Your recent payment has been reconciled in our billing system. Your fiber bandwidth is running without restrictions.'
                )
              }
              className="text-[11px] bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 font-medium whitespace-nowrap transition-colors"
            >
              💳 Payment Confirmation
            </button>
          </div>
        </div>

        {/* Reply Composer with Tabs: Reply vs Internal Note */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setComposerTab('reply')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                composerTab === 'reply'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reply to Subscriber
            </button>
            <button
              type="button"
              onClick={() => setComposerTab('internal_note')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                composerTab === 'internal_note'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Internal NOC Note 🔒</span>
            </button>
          </div>

          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-amber-500 focus-within:bg-white shadow-inner">
            <textarea
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={
                composerTab === 'reply'
                  ? 'Write your response to subscriber (English or Bangla)...'
                  : 'Write a private note visible only to Circle NOC team (hidden from subscriber)...'
              }
              className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none resize-none px-1 font-normal"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!replyText.trim()}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── COLUMN 3: Customer ISP Profile & Telemetry Panel ── */}
      <div
        className={`w-full lg:w-80 xl:w-96 border-l border-slate-200 bg-white p-4 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-2xs ${
          mobileTab === 'telemetry' ? 'block' : 'hidden lg:block'
        }`}
      >
        {/* Mobile Back Button to Chat */}
        <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Active Chat</span>
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-600" />
            Subscriber & OLT
          </h4>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              (customerDetails?.connection_status || fallbackSubscriber.connectionStatus) === 'online'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {(customerDetails?.connection_status || fallbackSubscriber.connectionStatus).toUpperCase()}
          </span>
        </div>

        {/* Optical Power Telemetry Gauge */}
        {(() => {
          const power = customerDetails?.optical_power_dbm ?? fallbackSubscriber.opticalPowerDbm;
          const isCritical = power < -27;
          return (
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-600 font-semibold">Optical Light Signal</span>
                <span
                  className={`text-xs font-mono font-bold ${
                    isCritical ? 'text-red-600 animate-pulse' : 'text-emerald-600'
                  }`}
                >
                  {power} dBm
                </span>
              </div>

              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden my-2">
                <div
                  className={`h-full transition-all ${
                    isCritical ? 'bg-red-500 w-3/12' : 'bg-emerald-500 w-9/12'
                  }`}
                ></div>
              </div>

              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                {isCritical
                  ? '⚠️ High attenuation detected. Physical patch cord bend or OLT port fault.'
                  : '✅ Optimal optical light level (-15 dBm to -25 dBm).'}
              </p>
            </div>
          );
        })()}

        {/* ISP Telemetry Specs */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Subscriber ID:</span>
            <span className="font-mono text-slate-900 font-bold">{activeSubscriberId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">PPPoE User:</span>
            <span className="font-mono text-amber-700 font-bold">
              {customerDetails?.pppoe_username || fallbackSubscriber.pppoeUsername}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Bandwidth Plan:</span>
            <span className="text-slate-800 font-semibold">
              {customerDetails?.plan_name || fallbackSubscriber.planName}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">OLT IP:</span>
            <span className="font-mono text-slate-700">{customerDetails?.olt_ip || fallbackSubscriber.oltIp}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">PON Port:</span>
            <span className="font-mono text-slate-700">{customerDetails?.pon_port || fallbackSubscriber.ponPort}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">ONU MAC:</span>
            <span className="font-mono text-slate-700">{customerDetails?.onu_mac || fallbackSubscriber.onuMac}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Phone:</span>
            <span className="text-slate-800 font-medium">{customerDetails?.phone || fallbackSubscriber.phone}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Outstanding Due:</span>
            <span
              className={`font-bold ${
                (customerDetails?.current_due_bdt ?? fallbackSubscriber.currentDueBdt) > 0
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              ৳{customerDetails?.current_due_bdt ?? fallbackSubscriber.currentDueBdt} BDT
            </span>
          </div>
        </div>

        {/* Past Tickets Section */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <TicketIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Past Tickets ({customerTickets.length})</span>
            </span>
          </div>
          {customerTickets.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-1">No past tickets filed for this subscriber.</div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto widget-scroll">
              {customerTickets.map((t) => (
                <div key={t.id} className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{t.ticket_number}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                        t.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="text-slate-600 truncate mt-0.5">{t.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Tool Execution Logs for Subscriber */}
        {customerAILogs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>AI Tool Logs ({customerAILogs.length})</span>
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto widget-scroll">
              {customerAILogs.slice(0, 5).map((log, lIdx) => (
                <div key={lIdx} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-[10px] font-mono">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="text-amber-800">{log.tool_name}</span>
                    <span className="text-emerald-600">{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fast Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleRebootPort}
            disabled={rebooting}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${rebooting ? 'animate-spin' : ''}`} />
            <span>{rebooting ? 'Dispatched to OLT...' : 'Reboot Port on OLT'}</span>
          </button>

          <button
            type="button"
            onClick={() => onCreateTicket?.(activeSubscriberId, activeConversation?.id || '')}
            className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <TicketIcon className="w-3.5 h-3.5" />
            <span>Create Field NOC Ticket</span>
          </button>
        </div>
      </div>

      {/* Transfer Conversation Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">Transfer Conversation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Support Agent / NOC Engineer
                </label>
                <select
                  required
                  value={transferTargetAgent}
                  onChange={(e) => setTransferTargetAgent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select destination agent...</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} — {ag.role.replace('_', ' ').toUpperCase()} ({ag.is_online ? '🟢 Online' : '⚪ Offline'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Reason & Handoff Briefing
                </label>
                <textarea
                  required
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g., Escalating to Tier-2 NOC for fiber splice fault in Dhanmondi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring || !transferTargetAgent || !transferReason.trim()}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-xs hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                >
                  {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
