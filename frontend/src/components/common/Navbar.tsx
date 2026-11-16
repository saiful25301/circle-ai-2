import React from 'react';
import { LayoutDashboard, MessageSquareText, Columns, PhoneCall } from 'lucide-react';

interface NavbarProps {
  activeView: 'widget' | 'dashboard' | 'split';
  setActiveView: (view: 'widget' | 'dashboard' | 'split') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView }) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-xs">
      {/* Official Brand Logo with clean container */}
      <div className="flex items-center gap-4">
        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center">
          <img
            src="/circle_network_logo.webp"
            alt="Circle Network"
            className="h-9 w-auto max-w-[200px] object-contain drop-shadow-xs"
          />
        </div>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
          <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300/80 rounded-full shadow-2xs">
            Circle AI
          </span>
          <span className="text-xs text-slate-500 font-medium">ISP Customer Intelligence</span>
        </div>
      </div>

      {/* View Switcher Controls */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
        <button
          onClick={() => setActiveView('widget')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'widget'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquareText className="w-3.5 h-3.5" />
          Messenger Widget
        </button>
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'dashboard'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Support Desk
        </button>
        <button
          onClick={() => setActiveView('split')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'split'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
          Dual Live View
        </button>
      </div>

      {/* Telemetry & Helpline */}
      <div className="hidden lg:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 text-emerald-800 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>OLT Core Online</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
          <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
          <span>09611800800</span>
        </div>
      </div>
    </header>
  );
};
