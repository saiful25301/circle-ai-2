import React from 'react';
import { Home, MessageSquare, HelpCircle } from 'lucide-react';
import { WidgetView } from './types';
import { Language, translations } from './localization/translations';

interface WidgetBottomNavProps {
  currentView: WidgetView;
  onNavigate: (view: WidgetView) => void;
  language: Language;
  unreadCount?: number;
}

export const WidgetBottomNav: React.FC<WidgetBottomNavProps> = ({
  currentView,
  onNavigate,
  language,
  unreadCount = 0,
}) => {
  const t = translations[language];

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-around text-xs select-none shadow-xs">
      {/* Home Tab */}
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          currentView === 'home'
            ? 'text-amber-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px]">{t.tabHome}</span>
      </button>

      {/* Messages Tab */}
      <button
        type="button"
        onClick={() => onNavigate('chat')}
        className={`flex flex-col items-center gap-1 relative transition-colors ${
          currentView === 'chat' || currentView === 'messages'
            ? 'text-amber-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
          )}
        </div>
        <span className="text-[10px]">{t.tabMessages}</span>
      </button>

      {/* Help Tab */}
      <button
        type="button"
        onClick={() => onNavigate('help')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          currentView === 'help'
            ? 'text-amber-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-[10px]">{t.tabHelp}</span>
      </button>
    </div>
  );
};
