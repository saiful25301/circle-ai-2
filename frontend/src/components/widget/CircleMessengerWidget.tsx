import React, { useState, useEffect, useRef } from 'react';
import { WidgetHeader } from './WidgetHeader';
import { WidgetWelcomeScreen } from './WidgetWelcomeScreen';
import { WidgetChatView } from './WidgetChatView';
import { WidgetMessageInput } from './WidgetMessageInput';
import { WidgetBottomNav } from './WidgetBottomNav';
import { WidgetLauncher } from './WidgetLauncher';
import { WidgetHelpView } from './WidgetHelpView';
import { WidgetProps, WidgetView, MOCK_TEST_SUBSCRIBERS } from './types';
import { Language } from './localization/translations';
import { Conversation, Message } from '../../types';
import { api } from '../../services/api';

export const CircleMessengerWidget: React.FC<WidgetProps> = ({
  embedded = false,
  logoUrl = '/circle_network_logo.webp',
  initialLanguage = 'en',
  subscriberId = 'CN-88214',
  onMessageReceived,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(embedded || defaultOpen);
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentView, setCurrentView] = useState<WidgetView>('home');
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [activeSubscriberId, setActiveSubscriberId] = useState<string>(subscriberId);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAgentTyping, setIsAgentTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Initialize or fetch conversation for active subscriber
  const loadConversation = async () => {
    try {
      setError(null);
      const convs = await api.getConversations();
      // Look for an active AI conversation first
      const activeAiConv = convs.find(
        (c) =>
          c.customer_id === activeSubscriberId &&
          (c.status === 'ai_handling' || c.status === 'AI_ACTIVE' || c.status === 'open') &&
          c.is_ai_handled !== false
      );

      if (activeAiConv) {
        const sanitized = {
          ...activeAiConv,
          messages: activeAiConv.messages.filter((m) => m.sender_type !== 'internal_note'),
        };
        setConversation(sanitized);
      } else {
        // Automatically start fresh active AI session if no active AI conversation exists
        const created = await api.createConversation(activeSubscriberId);
        setConversation(created);
      }
    } catch (err: any) {
      console.warn('Backend unavailable, using initial mock conversation for testing:', err);
      // Clean mock session so widget is fully testable without crashing
      const fallbackConv: Conversation = {
        id: `mock-conv-${activeSubscriberId}`,
        customer_id: activeSubscriberId,
        channel: 'webchat',
        status: 'ai_handling',
        priority: 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [
          {
            id: 'mock-msg-welcome',
            conversation_id: `mock-conv-${activeSubscriberId}`,
            sender_type: 'ai_agent',
            sender_name: 'Circle AI',
            content: language === 'bn'
              ? `স্বাগতম! আমি সার্কেল এআই, সার্কেল নেটওয়ার্কের ভার্চুয়াল এনওসি অ্যাসিস্ট্যান্ট। ফাইবার লাইন বা বিল সংক্রান্ত কী তথ্য জানতে চান?`
              : `Hi there! 👋 Welcome to Circle Network. I'm Circle AI, your virtual ISP assistant. How can I assist you with your fiber line or billing today?`,
            created_at: new Date().toISOString(),
          }
        ]
      };
      setConversation(fallbackConv);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [activeSubscriberId]);

  // Connect WebSocket when conversation is active
  useEffect(() => {
    if (!conversation?.id || conversation.id.startsWith('mock-')) return;

    let isSubscribed = true;
    let reconnectTimer: any = null;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/chat/${conversation.id}?client_type=customer`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle live typing indicator from AI or Human Agent
            if (data.type === 'typing') {
              if (data.sender_type !== 'customer') {
                setIsAgentTyping(data.is_typing);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                if (data.is_typing) {
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsAgentTyping(false);
                  }, 3500);
                }
              }
              return;
            }

            if (data.type === 'new_message' && data.message) {
              // Never render internal notes in customer messenger
              if (data.message.sender_type === 'internal_note') return;

              setIsAgentTyping(false);
              setConversation(prev => {
                if (!prev) return null;
                // Avoid duplicates
                if (prev.messages.some(m => m.id === data.message.id)) return prev;
                const updated = { ...prev, messages: [...prev.messages, data.message] };
                onMessageReceived?.(data.message);
                return updated;
              });

              if (!isOpen && data.message.sender_type !== 'customer') {
                setUnreadCount(prev => prev + 1);
              }
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          if (isSubscribed) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          // Silently wait for onclose to reconnect
        };
      } catch {
        // WS fallback
      }
    };

    connectWs();

    return () => {
      isSubscribed = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [conversation?.id, isOpen]);

  // Handle user sending message
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Switch view to chat automatically
    setCurrentView('chat');
    setLoading(true);
    setError(null);

    const activeSub = MOCK_TEST_SUBSCRIBERS.find(s => s.id === activeSubscriberId) || MOCK_TEST_SUBSCRIBERS[0];
    const tempId = `temp-${Date.now()}`;

    // Optimistic customer message
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversation?.id || `conv-${activeSubscriberId}`,
      sender_type: 'customer',
      sender_name: activeSub.name,
      content: text,
      created_at: new Date().toISOString(),
    };

    setConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, tempMsg]
    } : null);

    try {
      let activeConv = conversation;
      if (!activeConv || activeConv.id.startsWith('mock-')) {
        activeConv = await api.createConversation(activeSubscriberId);
        setConversation(activeConv);
      }

      await api.sendMessage(activeConv.id, text, 'customer', activeSub.name);
      const refreshed = await api.getConversation(activeConv.id);
      setConversation(refreshed);
    } catch {
      // Local simulation fallback if network request fails
      await new Promise((r) => setTimeout(r, 1000));
      let mockReply =
        language === 'bn'
          ? `আপনার প্রশ্নটি পেয়েছি। সার্কেল নেটওয়ার্কের ফাইবার লাইন ডায়াগনস্টিক সম্পন্ন হয়েছে। সাবস্ক্রাইবার ${activeSubscriberId}-এর ওএনইউ সিগন্যাল স্বাভাবিক।`
          : `Thank you. I have verified subscriber ${activeSubscriberId}. Optical fiber power is optimal. How else may I assist you?`;

      if (
        text.toLowerCase().includes('signal') ||
        text.toLowerCase().includes('সিগন্যাল') ||
        text.toLowerCase().includes('los')
      ) {
        mockReply =
          language === 'bn'
            ? `📡 অপটিক্যাল সিগন্যাল রিপোর্ট (${activeSubscriberId}):\n- ONU পাওয়ার: ${activeSub.powerDbm} dBm\n- ওএলটি পোর্ট: EPON0/2:4\n- সংযোগ স্থিতি: ${activeSub.status}`
            : `📡 Optical Power Telemetry for ${activeSubscriberId}:\n- Optical Power: ${activeSub.powerDbm} dBm\n- OLT Port: EPON0/2:4\n- Status: ${activeSub.status}`;
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        conversation_id: tempMsg.conversation_id,
        sender_type: 'ai_agent',
        sender_name: 'Circle AI',
        content: mockReply,
        created_at: new Date().toISOString(),
      };

      setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, aiMsg],
            }
          : null
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle human handover request
  const handleRequestHumanSupport = async () => {
    const text = language === 'bn'
      ? 'আমি সরাসরি একজন সার্কেল সাপোর্ট অফিসারের সাথে কথা বলতে চাই।'
      : 'I would like to speak directly with a human NOC support officer.';

    if (conversation && !conversation.id.startsWith('mock-')) {
      try {
        await api.updateConversationStatus(conversation.id, 'agent_handling', 'high');
      } catch (e) {
        console.error(e);
      }
    }

    handleSendMessage(text);
  };

  const handleStartChatFromWelcome = async (initialMsg?: string, forceNew = true) => {
    setCurrentView('chat');
    setError(null);

    const isHumanHandoffOrClosed =
      conversation &&
      (conversation.status === 'agent_handling' ||
        conversation.status === 'waiting_for_agent' ||
        conversation.status === 'human_takeover' ||
        conversation.status === 'resolved' ||
        conversation.status === 'closed' ||
        conversation.is_ai_handled === false);

    if (forceNew || !conversation || conversation.id.startsWith('mock-') || isHumanHandoffOrClosed) {
      try {
        const freshConv = await api.createConversation(activeSubscriberId, initialMsg);
        setConversation(freshConv);
        return;
      } catch (e) {
        console.warn('Could not create new conversation, using local handling:', e);
      }
    }

    if (initialMsg) {
      handleSendMessage(initialMsg);
    }
  };

  const handleNewChat = async () => {
    try {
      setLoading(true);
      setError(null);
      const fresh = await api.createConversation(activeSubscriberId);
      setConversation(fresh);
      setCurrentView('chat');
    } catch (err: any) {
      console.error('Failed to create new conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLauncher = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  // Widget Window Sizing classes
  const containerClasses = embedded
    ? 'w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white'
    : `fixed z-50 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl border border-slate-200/90 bg-white ${
        isMaximized
          ? 'inset-4 sm:inset-10 rounded-2xl'
          : 'bottom-5 right-5 sm:bottom-24 sm:right-6 w-full sm:w-[410px] h-[100dvh] sm:h-[660px] max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-2xl'
      }`;

  return (
    <>
      {/* Messenger Window */}
      {isOpen && (
        <div className={containerClasses} role="dialog" aria-label="Circle AI Messenger">
          {/* Header */}
          <WidgetHeader
            currentView={currentView}
            onNavigate={setCurrentView}
            language={language}
            onLanguageChange={setLanguage}
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onClose={() => setIsOpen(false)}
            embedded={embedded}
            activeSubscriberId={activeSubscriberId}
            onSubscriberChange={setActiveSubscriberId}
            logoUrl={logoUrl}
          />

          {/* View Container */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {currentView === 'home' && (
              <WidgetWelcomeScreen
                language={language}
                onStartChat={handleStartChatFromWelcome}
                recentConversation={conversation}
                activeSubscriberId={activeSubscriberId}
              />
            )}

            {currentView === 'chat' && (
              <>
                <WidgetChatView
                  language={language}
                  conversation={conversation}
                  loading={loading}
                  isAgentTyping={isAgentTyping}
                  error={error}
                  onRetry={() => loadConversation()}
                  onRequestHumanSupport={handleRequestHumanSupport}
                  onNewChat={handleNewChat}
                  activeSubscriberId={activeSubscriberId}
                />
                <WidgetMessageInput
                  language={language}
                  onSendMessage={handleSendMessage}
                  disabled={loading}
                  onQuickChipClick={handleSendMessage}
                />
              </>
            )}

            {currentView === 'help' && (
              <WidgetHelpView
                language={language}
                onAskAboutArticle={(topic) => {
                  setCurrentView('chat');
                  handleSendMessage(`Please explain this guide: ${topic}`);
                }}
              />
            )}
          </div>

          {/* Bottom Intercom Tabs Navigation */}
          <WidgetBottomNav
            currentView={currentView}
            onNavigate={setCurrentView}
            language={language}
            unreadCount={unreadCount}
          />
        </div>
      )}

      {/* Floating Action Launcher Button (Only when not embedded) */}
      {!embedded && (
        <WidgetLauncher
          isOpen={isOpen}
          onToggle={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              handleOpenLauncher();
            }
          }}
          unreadCount={unreadCount}
          language={language}
        />
      )}
    </>
  );
};
