import React, { useState } from 'react';
import { Navbar } from './components/common/Navbar';
import { CircleMessengerWidget } from './components/widget';
import { AdminDashboard } from './components/dashboard';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'widget' | 'dashboard' | 'split'>('split');
  const [activeSubscriber] = useState('CN-88214');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Full Widget Preview Mode */}
        {activeView === 'widget' && (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-100/60">
            <div className="w-[430px] h-[700px] max-h-[calc(100vh-6rem)]">
              <CircleMessengerWidget
                embedded={true}
                subscriberId={activeSubscriber}
                initialLanguage="en"
              />
            </div>
          </div>
        )}

        {/* Support Desk Dashboard Only */}
        {activeView === 'dashboard' && (
          <div className="flex-1 overflow-hidden flex bg-slate-50">
            <AdminDashboard />
            {/* Floating launcher in bottom right */}
            <CircleMessengerWidget
              embedded={false}
              subscriberId={activeSubscriber}
              defaultOpen={false}
            />
          </div>
        )}

        {/* Dual Live View: Support Desk + Live Embedded Messenger */}
        {activeView === 'split' && (
          <div className="flex-1 flex overflow-hidden bg-slate-50">
            {/* Left side: Support Agent Intercom Dashboard */}
            <div className="flex-1 border-r border-slate-200 overflow-hidden flex">
              <AdminDashboard />
            </div>

            {/* Right side: Live Subscriber Messenger Widget preview */}
            <div className="w-[440px] p-4 bg-slate-100/70 flex flex-col shrink-0 border-l border-slate-200 shadow-inner">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Subscriber Messenger View
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 shadow-xs">
                  Interactive
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <CircleMessengerWidget
                  embedded={true}
                  subscriberId={activeSubscriber}
                  initialLanguage="en"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
