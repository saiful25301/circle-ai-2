import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Wifi,
  CreditCard,
  RefreshCw,
  Zap,
  AlertTriangle,
  User
} from 'lucide-react';
import { Message, Conversation } from '../../types';
import { api } from '../../services/api';

interface MessengerWidgetProps {
  embedded?: boolean;
  onNewMessage?: () => void;
}

export const MessengerWidget: React.FC<MessengerWidgetProps> = ({ embedded = false, onNewMessage }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSubscriber, setActiveSubscriber] = useState('CN-88214');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load or initialize conversation
  useEffect(() => {
    async function init() {
      try {
        const convs = await api.getConversations();
        if (convs.length > 0) {
          setConversation(convs[0]);
        } else {
          const newConv = await api.createConversation(activeSubscriber);
          setConversation(newConv);
        }
      } catch (err) {
        console.error('Error fetching conversation:', err);
      }
    }
    init();
  }, [activeSubscriber]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !conversation) return;

    setInputMessage('');
    setLoading(true);

    try {
      // Optimistic message update
      const tempMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        sender_type: 'customer',
        sender_name: activeSubscriber === 'CN-88214' ? 'Rashedul Hasan' : 'Tanvir Ahmed',
        content: text,
        created_at: new Date().toISOString(),
      };

      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, tempMsg]
      } : null);

      await api.sendMessage(conversation.id, text, 'customer', tempMsg.sender_name);

      // Re-fetch conversation to sync latest AI reply and tool executions
      const updated = await api.getConversation(conversation.id);
      setConversation(updated);
      onNewMessage?.();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { label: 'Check Fiber Signal', query: `Diagnose optical power for ${activeSubscriber}`, icon: Wifi },
    { label: 'Check Bill & bKash', query: `Check my billing statement and bKash pay code for ${activeSubscriber}`, icon: CreditCard },
    { label: 'Reboot ONU Port', query: `Soft reboot port for ${activeSubscriber}`, icon: RefreshCw },
    { label: 'Internet Plans', query: 'What are Circle Network internet plans and packages?', icon: Zap },
    { label: 'Red LOS Light Help', query: 'Red LOS light is blinking on my ONU', icon: AlertTriangle },
  ];

  const widgetContent = (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Messenger Header (Intercom Fin Style) */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-4 text-white flex items-center justify-between border-b border-emerald-600/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-emerald-200" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Circle AI</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-300" /> Fin Bot
              </span>
            </div>
            <p className="text-xs text-emerald-100/80">Circle Network Virtual NOC Support</p>
          </div>
        </div>

        {/* Subscriber Selector Demo Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/20 hover:bg-black/30 px-2 py-1 rounded-lg text-xs border border-white/10 transition-colors">
            <User className="w-3 h-3 text-emerald-200" />
            <select
              value={activeSubscriber}
              onChange={(e) => setActiveSubscriber(e.target.value)}
              aria-label="Subscriber Account"
              className="bg-transparent text-emerald-100 text-xs focus:outline-none cursor-pointer"
            >
              <option value="CN-88214" className="bg-slate-900 text-white">CN-88214 (Mirpur - Healthy)</option>
              <option value="CN-99412" className="bg-slate-900 text-white">CN-99412 (Dhanmondi - Fiber Issue)</option>
            </select>
          </div>
          {!embedded && (
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              aria-label="Close messenger"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
        {quickActions.map((qa, i) => {
          const Icon = qa.icon;
          return (
            <button
              key={i}
              onClick={() => handleSendMessage(qa.query)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap rounded-lg bg-slate-800 hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-slate-700 text-slate-300 hover:text-emerald-300 transition-all"
            >
              <Icon className="w-3 h-3 text-emerald-400" />
              <span>{qa.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {conversation?.messages.map((msg) => {
          const isCustomer = msg.sender_type === 'customer';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[11px] text-slate-400 mb-1 px-1">
                {isCustomer ? (msg.sender_name || 'Subscriber') : 'Circle AI (Fin)'}
              </span>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isCustomer
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-950/40'
                    : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none shadow'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Inline Tool Call Result Badge */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/70 text-xs space-y-2">
                    {msg.tool_calls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-2.5 text-slate-300"
                      >
                        <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Function: {tc.tool_name}
                          </span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded">
                            Executed on OLT
                          </span>
                        </div>
                        {tc.tool_name === 'diagnose_onu_status' && (
                          <div className="grid grid-cols-2 gap-1.5 text-[11px] mt-1.5 font-mono">
                            <div>Power: <span className={tc.result.optical_power_dbm < -27 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{tc.result.optical_power_dbm} dBm</span></div>
                            <div>Port: <span className="text-slate-200">{tc.result.pon_port}</span></div>
                            <div>ONU MAC: <span className="text-slate-200">{tc.result.onu_mac}</span></div>
                            <div>State: <span className="text-slate-200">{tc.result.connection_state}</span></div>
                          </div>
                        )}
                        {tc.tool_name === 'check_subscriber_billing' && (
                          <div className="text-[11px] mt-1.5">
                            <div>Current Due: <span className="text-amber-400 font-bold">৳{tc.result.current_due_bdt} BDT</span></div>
                            <div>Plan: <span className="text-slate-200">{tc.result.current_plan}</span></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/60 p-3 rounded-2xl w-fit border border-slate-700/60 animate-pulse">
            <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Circle AI is reasoning and executing ISP network tools...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2 bg-slate-800/90 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about internet speed, bills, fiber signal, router..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputMessage.trim()}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-slate-400">
          <span>Powered by Gemini API & Circle Network OLT</span>
          <span>Hotline: 09611800800</span>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="h-full w-full">{widgetContent}</div>;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-[420px] h-[640px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)]">
          {widgetContent}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-5 py-3.5 rounded-full shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping"></span>
          </div>
          <span className="font-semibold text-sm">Chat with Circle AI</span>
        </button>
      )}
    </div>
  );
};
