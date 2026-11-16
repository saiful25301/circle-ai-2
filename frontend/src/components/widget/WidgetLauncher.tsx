import React from 'react';
import { MessageSquare, X, Sparkles } from 'lucide-react';
import { Language } from './localization/translations';

interface WidgetLauncherProps {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount?: number;
  language?: Language;
}

export const WidgetLauncher: React.FC<WidgetLauncherProps> = ({
  isOpen,
  onToggle,
  unreadCount = 0,
  language = 'en',
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3">
      {/* Optional Callout Bubble when closed */}
      {!isOpen && (
        <div
          onClick={onToggle}
          className="hidden sm:flex items-center gap-2.5 bg-white text-slate-800 px-4 py-2.5 rounded-2xl shadow-lg border border-slate-200/90 cursor-pointer hover:border-amber-400 hover:shadow-xl transition-all group animate-slideUp"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800 group-hover:text-amber-800 transition-colors">
            {language === 'bn' ? 'সার্কেল এআই-এর সাথে কথা বলুন' : 'Ask Circle AI'}
          </span>
          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.5 rounded">
            Fin
          </span>
        </div>
      )}

      {/* Floating Action Button with Warm Golden-Amber to Orange Gradient */}
      <button
        type="button"
        onClick={onToggle}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 relative group border-2 border-white/30"
        title={isOpen ? 'Close chat' : 'Open Circle AI chat'}
        aria-label={isOpen ? 'Close chat' : 'Open Circle AI chat'}
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-300 rotate-0 group-hover:rotate-90" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
            <Sparkles className="w-3 h-3 text-amber-200 absolute -top-1 -right-1" />
          </div>
        )}

        {/* Unread Counter Badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
