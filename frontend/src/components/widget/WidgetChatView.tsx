import React, { useRef, useEffect, useState } from 'react';
import {
  Bot,
  User,
  Zap,
  Clock,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Sparkles,
  Star,
  CheckCircle2,
  Send,
  Plus,
} from 'lucide-react';
import { Conversation } from '../../types';
import { Language, translations } from './localization/translations';
import { MOCK_TEST_SUBSCRIBERS } from './types';
import { api } from '../../services/api';

interface WidgetChatViewProps {
  language: Language;
  conversation: Conversation | null;
  loading: boolean;
  isAgentTyping?: boolean;
  error: string | null;
  onRetry: () => void;
  onRequestHumanSupport: () => void;
  onNewChat?: () => void;
  activeSubscriberId: string;
}

export const WidgetChatView: React.FC<WidgetChatViewProps> = ({
  language,
  conversation,
  loading,
  isAgentTyping = false,
  error,
  onRetry,
  onRequestHumanSupport,
  onNewChat,
  activeSubscriberId,
}) => {
  const t = translations[language];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSub =
    MOCK_TEST_SUBSCRIBERS.find((s) => s.id === activeSubscriberId) || MOCK_TEST_SUBSCRIBERS[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, loading]);

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isHumanHandling = conversation?.status === 'agent_handling';

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const isResolved = conversation?.status === 'resolved' || conversation?.status === 'closed';
  const hasSubmittedFeedback = feedbackSubmitted || Boolean((conversation?.metadata_info as any)?.csat_rating);

  const handleSubmitFeedback = async () => {
    if (!conversation?.id || selectedRating === 0) return;
    setIsSubmittingFeedback(true);
    try {
      const combinedText = [selectedTag, feedbackText.trim()].filter(Boolean).join(' - ');
      const sentiment = selectedRating >= 4 ? 'positive' : selectedRating === 3 ? 'neutral' : 'negative';

      await api.submitConversationFeedback(conversation.id, {
        rating: selectedRating,
        feedback_text: combinedText || undefined,
        customer_sentiment: sentiment,
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setFeedbackSubmitted(true);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Top Banner: Status & Quick Human Escalation Button */}
      <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="text-slate-700 font-semibold">
            {isHumanHandling ? (
              <span className="text-amber-700 flex items-center gap-1.5 font-bold">
                <UserCheck className="w-3.5 h-3.5" /> {t.escalatedToHuman}
              </span>
            ) : (
              <span className="text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" /> {t.headerTitle}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95 ${
                isHumanHandling
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title={language === 'bn' ? 'নতুন চ্যাট শুরু করুন' : 'Start a new chat'}
            >
              <Plus className="w-3 h-3" />
              <span>{language === 'bn' ? 'নতুন চ্যাট' : 'New Chat'}</span>
            </button>
          )}

          {!isHumanHandling && (
            <button
              type="button"
              onClick={onRequestHumanSupport}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-colors"
            >
              <UserCheck className="w-3 h-3" />
              <span>{t.requestHumanSupport}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner (if any) */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-2.5 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{t.networkError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> {t.retry}
          </button>
        </div>
      )}

      {/* Messages Stream - Clean and minimal light theme */}
      <div className="flex-1 p-4 overflow-y-auto widget-scroll space-y-3.5">
        {conversation?.messages
          ?.filter((msg) => msg.sender_type !== 'internal_note')
          ?.map((msg) => {
          const isCustomer = msg.sender_type === 'customer';
          const isHumanAgent = msg.sender_type === 'human_agent';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} animate-slideUp`}
            >
              {/* Sender Name & Role */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1 px-1">
                {isCustomer ? (
                  <>
                    <span className="font-medium text-slate-700">{msg.sender_name || activeSub.name}</span>
                    <User className="w-3 h-3 text-amber-600" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-slate-800">
                      {isHumanAgent ? t.supportTeam : 'Circle AI'}
                    </span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  isCustomer
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-none font-medium'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Inline Diagnostic Summary */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-2">
                    {msg.tool_calls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5 text-slate-800 text-[11px]"
                      >
                        <div className="flex items-center justify-between text-amber-900 font-bold mb-1">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-600" />
                            {tc.tool_name === 'diagnose_onu_status'
                              ? t.opticalPower
                              : tc.tool_name === 'check_subscriber_billing'
                              ? t.checkBill
                              : tc.tool_name === 'reboot_onu_session'
                              ? t.rebootPort
                              : tc.tool_name}
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                            Verified
                          </span>
                        </div>

                        {tc.tool_name === 'diagnose_onu_status' && (
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] mt-1 bg-white p-2 rounded-lg border border-amber-200/60">
                            <div>
                              Signal:{' '}
                              <span
                                className={`font-bold ${
                                  tc.result.optical_power_dbm < -27
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {tc.result.optical_power_dbm} dBm
                              </span>
                            </div>
                            <div>
                              Status:{' '}
                              <span className="text-slate-700 capitalize font-sans">
                                {tc.result.connection_state}
                              </span>
                            </div>
                          </div>
                        )}

                        {tc.tool_name === 'check_subscriber_billing' && (
                          <div className="text-[11px] mt-1 space-y-0.5">
                            <div>
                              Amount Due:{' '}
                              <span className="text-amber-800 font-bold">
                                ৳{tc.result.current_due_bdt} BDT
                              </span>
                            </div>
                            <div>
                              Plan: <span className="text-slate-700 font-medium">{tc.result.current_plan}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Timestamp & Status Icon */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isCustomer ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatTimestamp(msg.created_at)}</span>
                  {isCustomer && <CheckCheck className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {(loading || isAgentTyping) && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-2xl rounded-bl-none w-fit text-xs shadow-xs animate-fadeIn">
            {isHumanHandling ? (
              <UserCheck className="w-4 h-4 text-blue-600 animate-pulse" />
            ) : (
              <Bot className="w-4 h-4 text-amber-600 animate-spin" />
            )}
            <span className="text-[11px] font-semibold">
              {isHumanHandling ? 'Support Agent is typing...' : t.typingText}
            </span>
            <div className="flex gap-1 items-center ml-1">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
            </div>
          </div>
        )}

        {/* CSAT 1-5 Star Ratings Prompt upon Resolution */}
        {isResolved && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-white border border-amber-300 shadow-sm space-y-3 animate-slideUp">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {language === 'bn' ? 'সার্কেল নেটওয়ার্ক কাস্টমার ফিডব্যাক' : 'Circle Network Service Feedback'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {language === 'bn' ? 'আমাদের সাপোর্ট কেমন লাগলো? আপনার মূল্যবান রেটিং দিন:' : 'How was your support experience? Please rate our service:'}
                </p>
              </div>
            </div>

            {hasSubmittedFeedback ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {language === 'bn'
                    ? 'আপনার মতামতের জন্য ধন্যবাদ! সার্কেল নেটওয়ার্ক সবসময় আপনার সাথে আছে।'
                    : 'Thank you for your feedback! Circle Network appreciates your review.'}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 5 Interactive Stars */}
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setSelectedRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          (hoverRating || selectedRating) >= star
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-slate-300 fill-slate-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Quick Feedback Chips */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    language === 'bn' ? 'দ্রুত সমাধান' : 'Fast Resolution',
                    language === 'bn' ? 'সহজ নির্দেশনা' : 'Clear Guidance',
                    language === 'bn' ? 'বন্ধুত্বপূর্ণ সাপোর্ট' : 'Friendly Officer',
                    language === 'bn' ? 'আরও দ্রুত হওয়া দরকার' : 'Needs Speedup',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === chip ? '' : chip)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        selectedTag === chip
                          ? 'bg-amber-500 text-white border-amber-600 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Optional Comment Input & Submit Button */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={language === 'bn' ? 'অতিরিক্ত মন্তব্য লিখুন (ঐচ্ছিক)...' : 'Additional comments (optional)...'}
                    className="flex-1 bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={selectedRating === 0 || isSubmittingFeedback}
                    onClick={handleSubmitFeedback}
                    className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSubmittingFeedback ? '...' : language === 'bn' ? 'পাঠান' : 'Submit'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
