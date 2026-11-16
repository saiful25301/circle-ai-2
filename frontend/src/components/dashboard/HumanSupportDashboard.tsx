import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  UserCheck,
  Send,
  Zap,
  Activity,
  Ticket as TicketIcon,
  Check,
  RefreshCw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { Conversation, Customer, DashboardStats } from '../../types';
import { api } from '../../services/api';

export const HumanSupportDashboard: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('conv-demo-mirpur');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'ai_handling' | 'agent_handling' | 'resolved'>('all');
  const [agentReply, setAgentReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [convs, st] = await Promise.all([
        api.getConversations(),
        api.getAnalytics(),
      ]);
      setConversations(convs);
      setStats(st);

      const targetId = selectedConvId || convs[0]?.id;
      if (targetId) {
        const full = await api.getConversation(targetId);
        setSelectedConversation(full);
        if (full.customer_id) {
          const cust = await api.getCustomer(full.customer_id);
          setCustomerData(cust);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [selectedConvId]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConvId(conv.id);
    setSelectedConversation(conv);
    if (conv.customer_id) {
      try {
        const cust = await api.getCustomer(conv.customer_id);
        setCustomerData(cust);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSendAgentReply = async (customText?: string) => {
    const text = (customText || agentReply).trim();
    if (!text || !selectedConversation) return;

    setIsSending(true);
    try {
      await api.sendMessage(selectedConversation.id, text, 'human_agent', 'Support Desk Engineer');
      setAgentReply('');
      const updated = await api.getConversation(selectedConversation.id);
      setSelectedConversation(updated);
      showNotice('Reply sent to customer widget');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedConversation) return;
    try {
      await api.updateConversationStatus(selectedConversation.id, newStatus);
      showNotice(`Conversation status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNocTicket = async () => {
    if (!selectedConversation || !customerData) return;
    try {
      await api.createTicket({
        customer_id: customerData.subscriber_id,
        conversation_id: selectedConversation.id,
        title: `NOC Escalation: ${customerData.pppoe_username} on ${customerData.pon_port}`,
        description: `Optical Power: ${customerData.optical_power_dbm} dBm. Customer requested dispatch.`,
        category: customerData.optical_power_dbm < -27 ? 'optical_fiber_break' : 'high_latency',
        priority: 'urgent',
      });
      showNotice('Field NOC Ticket Created Successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRebootPort = async () => {
    if (!customerData) return;
    showNotice(`Dispatched soft reboot command to OLT ${customerData.olt_ip} for port ${customerData.pon_port}`);
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden">
      {/* Top ISP KPI Metrics Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">AI Resolution Rate</p>
              <h4 className="text-lg font-bold text-white">{stats?.ai_resolved_percentage || 78.4}%</h4>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Conversations</p>
              <h4 className="text-lg font-bold text-white">{stats?.total_conversations || 128}</h4>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Human Desk Escalated</p>
              <h4 className="text-lg font-bold text-white">{stats?.human_escalated_percentage || 21.6}%</h4>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg. AI Response</p>
              <h4 className="text-lg font-bold text-white">{stats?.average_response_time_seconds || 1.2}s</h4>
            </div>
          </div>
        </div>

        {actionNotice && (
          <div className="mt-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* 3-Column Main Dashboard Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Conversation Inbox */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col">
          <div className="p-3 border-b border-slate-800 flex gap-1">
            {(['all', 'ai_handling', 'agent_handling', 'resolved'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium capitalize transition-colors ${
                  filter === tab
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'agent_handling' ? 'Human Desk' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredConversations.map((conv) => {
              const isSelected = selectedConvId === conv.id;
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-800 border-l-4 border-emerald-500' : 'hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-200">
                      {conv.customer_id || 'Subscriber'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        conv.status === 'ai_handling'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : conv.status === 'agent_handling'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {conv.status === 'ai_handling' ? 'Fin AI' : conv.status === 'agent_handling' ? 'Escalated' : 'Resolved'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {lastMsg ? lastMsg.content : 'No messages yet'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Active Conversation Stream & Takeover */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Conversation Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                {selectedConversation?.customer_id?.substring(0, 2) || 'CN'}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {customerData?.full_name || selectedConversation?.customer_id || 'Subscriber Session'}
                </h3>
                <p className="text-xs text-slate-400">
                  PPPoE: <span className="font-mono text-emerald-400">{customerData?.pppoe_username || 'N/A'}</span> | Zone: {customerData?.zone || 'Dhaka'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedConversation?.status === 'ai_handling' ? (
                <button
                  onClick={() => handleStatusChange('agent_handling')}
                  className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Take Over (Human Desk)
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('ai_handling')}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" /> Return to Circle AI
                </button>
              )}
              <button
                onClick={() => handleStatusChange('resolved')}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mark Resolved
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {selectedConversation?.messages.map((m) => {
              const isCust = m.sender_type === 'customer';
              const isAI = m.sender_type === 'ai_agent';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}
                >
                  <span className="text-[11px] text-slate-400 mb-0.5 px-1">
                    {isCust ? (customerData?.full_name || 'Subscriber') : isAI ? 'Circle AI (Fin)' : 'Human Support Officer'}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      isCust
                        ? 'bg-slate-800 text-slate-200 border border-slate-700'
                        : isAI
                        ? 'bg-emerald-950/80 text-emerald-100 border border-emerald-500/40'
                        : 'bg-blue-600 text-white shadow'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {m.tool_calls && m.tool_calls.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-emerald-500/30 text-[11px] text-emerald-300">
                        ⚡ Tool executed: <span className="font-mono font-semibold">{m.tool_calls[0].tool_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Copilot Suggestions Bar for Human Desk */}
          <div className="bg-slate-900/90 border-t border-slate-800 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5 font-medium">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>AI Copilot Suggested Canned Responses:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleSendAgentReply('I have dispatched a soft reboot signal to your ONU port on our OLT. Please allow 60 seconds for the session to refresh.')}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap transition-colors"
              >
                🔄 Send OLT Reboot Notice
              </button>
              <button
                onClick={() => handleSendAgentReply('Our optical diagnostics show a physical drop wire bend at -28.9 dBm. A field technician has been assigned to visit your premises within 2 hours.')}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap transition-colors"
              >
                👷 Dispatch Field Technician
              </button>
              <button
                onClick={() => handleSendAgentReply('Your payment has been reconciled. Your bandwidth speed is now running on Circle Fast 30 Mbps.')}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap transition-colors"
              >
                💳 Confirm bKash Payment
              </button>
            </div>
          </div>

          {/* Agent Reply Box */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={agentReply}
              onChange={(e) => setAgentReply(e.target.value)}
              placeholder="Write a message as Circle Support Desk Engineer..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSendAgentReply()}
              disabled={isSending || !agentReply.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        </div>

        {/* Right Column: Circle Network ISP Subscriber Telemetry */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/60 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" /> ISP Telemetry & OLT
            </h4>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                customerData?.connection_status === 'online'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}
            >
              {customerData?.connection_status?.toUpperCase() || 'ONLINE'}
            </span>
          </div>

          {customerData ? (
            <>
              {/* Optical Power Gauge Card */}
              <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400">Optical Signal (dBm)</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      customerData.optical_power_dbm < -27
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {customerData.optical_power_dbm} dBm
                  </span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      customerData.optical_power_dbm < -27
                        ? 'bg-red-500 w-3/12'
                        : 'bg-emerald-500 w-9/12'
                    }`}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {customerData.optical_power_dbm < -27
                    ? '⚠️ Critical optical loss (< -27 dBm). High chance of fiber break.'
                    : '✅ Healthy optical physical layer (-15 dBm to -25 dBm).'}
                </p>
              </div>

              {/* Network Parameters */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Subscriber ID:</span>
                  <span className="font-mono text-slate-200">{customerData.subscriber_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">PPPoE User:</span>
                  <span className="font-mono text-emerald-400">{customerData.pppoe_username}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Plan Speed:</span>
                  <span className="text-slate-200">{customerData.plan_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">OLT Host IP:</span>
                  <span className="font-mono text-slate-300">{customerData.olt_ip}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">PON Port:</span>
                  <span className="font-mono text-slate-300">{customerData.pon_port}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">ONU MAC:</span>
                  <span className="font-mono text-slate-300">{customerData.onu_mac}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Current Due:</span>
                  <span className={`font-bold ${customerData.current_due_bdt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ৳{customerData.current_due_bdt.toFixed(2)} BDT
                  </span>
                </div>
              </div>

              {/* Quick ISP Actions */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleRebootPort}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Reboot Port on OLT
                </button>
                <button
                  onClick={handleCreateNocTicket}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-medium transition-colors"
                >
                  <TicketIcon className="w-3.5 h-3.5" /> Dispatch Field NOC Ticket
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">Select a conversation to inspect ISP optical telemetry.</p>
          )}
        </div>
      </div>
    </div>
  );
};
