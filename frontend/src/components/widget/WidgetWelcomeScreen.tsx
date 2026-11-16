import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  Search,
  Clock,
  PhoneCall,
  Bot,
  Users,
} from 'lucide-react';
import { Conversation } from '../../types';
import { Language, translations } from './localization/translations';
import { MOCK_TEST_SUBSCRIBERS } from './types';

interface WidgetWelcomeScreenProps {
  language: Language;
  onStartChat: (initialMessage?: string) => void;
  recentConversation?: Conversation | null;
  activeSubscriberId: string;
}

export const WidgetWelcomeScreen: React.FC<WidgetWelcomeScreenProps> = ({
  language,
  onStartChat,
  recentConversation,
  activeSubscriberId,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');

  const activeSub =
    MOCK_TEST_SUBSCRIBERS.find((s) => s.id === activeSubscriberId) || MOCK_TEST_SUBSCRIBERS[0];

  const filteredQuestions = t.quickQuestions.filter(
    (q) =>
      q.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto widget-scroll p-4 space-y-4 bg-slate-50 text-slate-900">
      {/* Intercom Fin Hero Greeting Card (Warm Light Theme) */}
      <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 border border-amber-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
        {/* Subtle decorative amber glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
          {/* Friendly Team Avatars */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center ring-2 ring-white">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/70 shadow-2xs">
              <Clock className="w-3 h-3 text-amber-600" />
              {t.responseSpeed}
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
            {t.greetingTitle}
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {t.greetingSubtitle}
          </p>

          {/* Subscriber Welcome Tag */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 shadow-2xs">
            <span className="text-slate-400">{t.subscriberBadge}:</span>
            <span className="font-bold text-slate-900">{activeSub.name}</span>
          </div>
        </div>
      </div>

      {/* Primary Action: Send us a Message (Golden-Amber Gradient) */}
      <button
        type="button"
        onClick={() => onStartChat()}
        className="w-full bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">{t.sendUsMessage}</div>
            <div className="text-[11px] text-white/90 font-medium">{t.sendUsMessageSub}</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-white transition-transform group-hover:translate-x-1" />
      </button>

      {/* Recent Conversation Resume Card (If exists) */}
      {recentConversation && recentConversation.messages && recentConversation.messages.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-amber-400 transition-colors shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t.recentConversations}
            </span>
            <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
              {recentConversation.status === 'ai_handling' ? t.aiHandled : t.escalatedToHuman}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onStartChat()}
            className="w-full text-left text-xs text-slate-700 hover:text-slate-900 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium"
          >
            {recentConversation.messages[recentConversation.messages.length - 1]?.content ||
              'Resume your chat'}
          </button>
        </div>
      )}

      {/* Search Input for Quick Help */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors shadow-2xs"
        />
      </div>

      {/* Suggested Questions Grid */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
          {t.suggestedQuestions}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {filteredQuestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStartChat(item.query)}
              className="text-left p-3 rounded-xl bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 text-xs text-slate-800 transition-all flex items-center justify-between group shadow-2xs"
            >
              <span className="font-semibold group-hover:text-amber-800 transition-colors">
                {item.label}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </div>

      {/* Support Helpline Footer */}
      <div className="pt-2 pb-1 text-center border-t border-slate-200">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-bold text-slate-800">{t.hotlineText}</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Circle Network — Fast & Reliable Fiber Broadband Support
        </p>
      </div>
    </div>
  );
};
