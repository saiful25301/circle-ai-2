import React from 'react';
import {
  ArrowLeft,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { WidgetView } from './types';
import { Language, translations } from './localization/translations';

interface WidgetHeaderProps {
  currentView: WidgetView;
  onNavigate: (view: WidgetView) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose: () => void;
  embedded?: boolean;
  logoUrl?: string;
  activeSubscriberId?: string;
  onSubscriberChange?: (id: string) => void;
}

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  currentView,
  onNavigate,
  language,
  onLanguageChange,
  isMaximized,
  onToggleMaximize,
  onClose,
  embedded = false,
  logoUrl = '/circle_network_logo.webp',
}) => {
  const t = translations[language];

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 px-2.5 sm:px-4 py-2 sm:py-3 select-none shadow-xs relative z-20">
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left Side: Back Button + Logo + Clean Title & Subtitle */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {currentView !== 'home' && (
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="p-1 -ml-0.5 sm:-ml-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Official Circle Network Logo in clean container */}
          <div className="bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-slate-200/80 shadow-2xs flex items-center shrink-0">
            <img
              src={logoUrl}
              alt="Circle Network"
              className="h-6 sm:h-7 w-auto max-w-[95px] sm:max-w-[140px] object-contain select-none"
              loading="eager"
            />
          </div>

          {/* Title & "Our team can also help" Subtitle */}
          <div className="min-w-0 pl-0.5 sm:pl-1">
            <div className="flex items-center gap-1 sm:gap-1.5 leading-tight">
              <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">Circle AI</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate font-medium leading-tight mt-0.5 max-w-[100px] sm:max-w-none">
              {t.teamSubtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Language Toggle + Window Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                language === 'en'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('bn')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full transition-all ${
                language === 'bn'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাং
            </button>
          </div>

          {/* Window Controls (Floating Mode Only) */}
          {!embedded && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
              <button
                type="button"
                onClick={onToggleMaximize}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title={isMaximized ? 'Restore' : 'Maximize'}
                aria-label={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
