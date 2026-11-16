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
} from 'lucide-react';
import { Conversation } from '../../types';
import { SubscriberContact } from './types';
import { MOCK_SUBSCRIBERS } from './mockData';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<'all' | 'ai' | 'escalated' | 'resolved'>('all');
  const [replyText, setReplyText] = useState('');
  const [composerTab, setComposerTab] = useState<'reply' | 'internal_note'>('reply');
  const [rebooting, setRebooting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set default selected conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  // Match subscriber info from mock subscribers or fallback
  const activeSubscriber: SubscriberContact = MOCK_SUBSCRIBERS.find(
    (s) => s.subscriberId === activeConversation?.customer_id
  ) || MOCK_SUBSCRIBERS[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSend = () => {
    const text = replyText.trim();
    if (!text || !activeConversation) return;

    if (onSendMessage) {
      onSendMessage(activeConversation.id, text, composerTab === 'internal_note');
    }
    setReplyText('');
    showNotice(composerTab === 'internal_note' ? 'Internal note added to thread' : 'Reply sent to customer');
  };

  const handleRebootPort = () => {
    setRebooting(true);
    setTimeout(() => {
      setRebooting(false);
      showNotice(`OLT ${activeSubscriber.oltIp} re-synchronized port ${activeSubscriber.ponPort} successfully.`);
    }, 1200);
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterMode === 'ai_only' && c.status !== 'ai_handling') return false;
    if (filterMode === 'human_only' && c.status !== 'agent_handling') return false;

    if (activeFolder === 'ai' && c.status !== 'ai_handling') return false;
    if (activeFolder === 'escalated' && c.status !== 'agent_handling') return false;
    if (activeFolder === 'resolved' && c.status !== 'resolved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchCustomer = (c.customer_id || '').toLowerCase().includes(q);
      const matchContent = c.messages.some((m) => m.content.toLowerCase().includes(q));
      return matchId || matchCustomer || matchContent;
    }

    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      {/* ── COLUMN 1: Conversation List & Filter Bar ── */}
      <div className="w-80 md:w-88 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-2xs">
        {/* Search & Folder Tabs */}
        <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs"
            />
          </div>

          {filterMode === 'all' && (
            <div className="flex gap-1 overflow-x-auto widget-scroll pb-0.5">
              {(['all', 'ai', 'escalated', 'resolved'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFolder(tab)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-bold capitalize whitespace-nowrap transition-colors ${
                    activeFolder === tab
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {tab === 'ai' ? 'Fin AI' : tab === 'escalated' ? 'Escalated' : tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto widget-scroll divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No conversations found matching filter.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = (activeConversation?.id || '') === conv.id;
              const lastMsg = conv.messages[conv.messages.length - 1];
              const isEscalated = conv.status === 'agent_handling';
              const isResolved = conv.status === 'resolved';

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3.5 cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'bg-amber-50/70 border-l-4 border-amber-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {conv.customer_id || 'Subscriber'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        isEscalated
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : isResolved
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isEscalated ? 'Escalated' : isResolved ? 'Resolved' : 'Fin AI'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                    {lastMsg ? lastMsg.content : 'No messages'}
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
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Header with Status & Escalation actions */}
        <div className="p-3 px-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {activeSubscriber.subscriberId.split('-')[1]?.substring(0, 2) || 'CN'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">{activeSubscriber.fullName}</h3>
                <span className="font-mono text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                  {activeSubscriber.subscriberId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                PPPoE: <span className="font-mono text-slate-800">{activeSubscriber.pppoeUsername}</span> • Zone: {activeSubscriber.zone}
              </p>
            </div>
          </div>

          {/* Status Controls */}
          <div className="flex items-center gap-2">
            {activeConversation?.status === 'ai_handling' ? (
              <button
                type="button"
                onClick={() => onStatusChange?.(activeConversation.id, 'agent_handling')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Take Over (Escalate)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStatusChange?.(activeConversation.id, 'ai_handling')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors"
              >
                <Bot className="w-3.5 h-3.5 text-amber-600" />
                <span>Return to Circle AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onStatusChange?.(activeConversation.id, 'resolved')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark Resolved</span>
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

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1 px-1">
                  {isCust ? (
                    <>
                      <User className="w-3 h-3 text-amber-600" />
                      <span className="font-semibold text-slate-700">{m.sender_name || activeSubscriber.fullName}</span>
                    </>
                  ) : isAI ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold text-slate-900">Circle AI (Fin)</span>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-1 rounded font-bold font-mono">AUTOMATED</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold text-blue-700">{m.sender_name || 'NOC Engineer'}</span>
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
                              {tc.duration_ms !== undefined && (
                                <span className="text-[9px] text-slate-400 font-normal">
                                  {tc.duration_ms}ms
                                </span>
                              )}
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
              onClick={() => setReplyText('I have dispatched a soft reboot signal to your ONU port on our OLT. Please allow 60 seconds for the session to refresh.')}
              className="text-[11px] bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 font-medium whitespace-nowrap transition-colors"
            >
              🔄 Port Reboot Notice
            </button>
            <button
              type="button"
              onClick={() => setReplyText(`Our optical telemetry indicates high attenuation (${activeSubscriber.opticalPowerDbm} dBm). A field NOC technician has been assigned to inspect your drop wire in ${activeSubscriber.zone}.`)}
              className="text-[11px] bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 font-medium whitespace-nowrap transition-colors"
            >
              👷 Field Technician Dispatch
            </button>
            <button
              type="button"
              onClick={() => setReplyText('Your bKash payment has been reconciled. Your bandwidth is running without restrictions on Circle Fast 30 Mbps.')}
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
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                composerTab === 'internal_note'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Internal NOC Note 🔒
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
                  : 'Write a private note visible only to Circle NOC team...'
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
      <div className="w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-600" />
            Subscriber & OLT
          </h4>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeSubscriber.connectionStatus === 'online'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {activeSubscriber.connectionStatus.toUpperCase()}
          </span>
        </div>

        {/* Optical Power Telemetry Gauge */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-600 font-semibold">Optical Light Signal</span>
            <span
              className={`text-xs font-mono font-bold ${
                activeSubscriber.opticalPowerDbm < -27
                  ? 'text-red-600 animate-pulse'
                  : 'text-emerald-600'
              }`}
            >
              {activeSubscriber.opticalPowerDbm} dBm
            </span>
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden my-2">
            <div
              className={`h-full transition-all ${
                activeSubscriber.opticalPowerDbm < -27
                  ? 'bg-red-500 w-3/12'
                  : 'bg-emerald-500 w-9/12'
              }`}
            ></div>
          </div>

          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
            {activeSubscriber.opticalPowerDbm < -27
              ? '⚠️ High attenuation detected. Physical patch cord bend or OLT port fault.'
              : '✅ Optimal optical light level (-15 dBm to -25 dBm).'}
          </p>
        </div>

        {/* ISP Telemetry Specs */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Subscriber ID:</span>
            <span className="font-mono text-slate-900 font-bold">{activeSubscriber.subscriberId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">PPPoE User:</span>
            <span className="font-mono text-amber-700 font-bold">{activeSubscriber.pppoeUsername}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Bandwidth Plan:</span>
            <span className="text-slate-800 font-semibold">{activeSubscriber.planName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">OLT IP:</span>
            <span className="font-mono text-slate-700">{activeSubscriber.oltIp}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">PON Port:</span>
            <span className="font-mono text-slate-700">{activeSubscriber.ponPort}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">ONU MAC:</span>
            <span className="font-mono text-slate-700">{activeSubscriber.onuMac}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Phone:</span>
            <span className="text-slate-800 font-medium">{activeSubscriber.phone}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Outstanding Due:</span>
            <span
              className={`font-bold ${
                activeSubscriber.currentDueBdt > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              ৳{activeSubscriber.currentDueBdt} BDT
            </span>
          </div>
        </div>

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
            onClick={() => onCreateTicket?.(activeSubscriber.subscriberId, activeConversation?.id || '')}
            className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <TicketIcon className="w-3.5 h-3.5" />
            <span>Create Field NOC Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
