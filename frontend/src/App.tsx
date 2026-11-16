import React, { useState } from 'react';
import { Navbar } from './components/common/Navbar';
import { CircleMessengerWidget } from './components/widget';
import { AdminDashboard } from './components/dashboard';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'widget' | 'dashboard' | 'split'>('split');
  const [activeSubscriber] = useState('CN-88214');
  const [splitMobilePane, setSplitMobilePane] = useState<'dashboard' | 'messenger'>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 w-full max-w-full overflow-x-hidden">
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <main className="flex-1 flex overflow-hidden relative w-full">
        {/* Full Widget Preview Mode */}
        {activeView === 'widget' && (
          <div className="flex-1 flex items-center justify-center p-2 sm:p-6 bg-slate-100/60 overflow-hidden">
            <div className="w-full max-w-[430px] h-[100dvh] sm:h-[700px] max-h-full">
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
          <div className="flex-1 overflow-hidden flex bg-slate-50 w-full relative">
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
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 w-full">
            {/* Responsive Toggle Bar for Screens < 1024px */}
            <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
              <span className="text-xs font-bold text-slate-700">Dual Live View Mode</span>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSplitMobilePane('dashboard')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    splitMobilePane === 'dashboard'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Support Desk
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMobilePane('messenger')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    splitMobilePane === 'messenger'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Subscriber Messenger
                </button>
              </div>
            </div>

            {/* Left side: Support Agent Intercom Dashboard */}
            <div
              className={`flex-1 border-r border-slate-200 overflow-hidden flex ${
                splitMobilePane === 'dashboard' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <AdminDashboard />
            </div>

            {/* Right side: Live Subscriber Messenger Widget preview */}
            <div
              className={`w-full lg:w-[400px] xl:w-[440px] p-2 sm:p-4 bg-slate-100/70 flex flex-col shrink-0 border-l border-slate-200 shadow-inner ${
                splitMobilePane === 'messenger' ? 'flex' : 'hidden lg:flex'
              }`}
            >
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
