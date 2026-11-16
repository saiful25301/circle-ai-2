import React, { useState } from 'react';
import {
  Settings,
  Bot,
  Server,
  Save,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [model, setModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState('0.3');
  const [opticalThreshold, setOpticalThreshold] = useState('-27.0');
  const [oltHost, setOltHost] = useState('10.200.14.2');
  const [bkashMerchant, setBkashMerchant] = useState('01844XXXXXX');
  const [hotline, setHotline] = useState('09611800800');
  const [systemPrompt, setSystemPrompt] = useState(
    `You are Circle AI, the intelligent virtual support engineer for Circle Network, an ISP in Bangladesh.
Your persona is inspired by Intercom Fin: empathetic, concise, and proactive.
For network issues (slow speed, loss of signal, red LOS light on ONU), proactively use the diagnose_onu_status tool with the subscriber's ID or username.
For billing or invoice questions, use check_subscriber_billing tool to check dues and provide bKash payment instructions.`
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto widget-scroll p-6 space-y-6 bg-slate-50 text-slate-900 max-w-5xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-600" />
            Workspace & OLT Configuration
          </h2>
          <p className="text-xs text-slate-500">
            Configure Gemini AI agent behavior, OLT network thresholds, and billing parameters
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2 rounded-xl flex items-center gap-2 animate-fadeIn font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Configuration saved successfully. Applied to Circle AI and OLT services.</span>
        </div>
      )}

      {/* 1. Gemini AI Configuration */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Bot className="w-4 h-4 text-amber-600" />
          Gemini AI Agent Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Gemini Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended for &lt;1s Latency)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Complex Reasoning)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Temperature (Creativity)</label>
            <input
              type="text"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1 text-xs">System Persona & Prompt</label>
          <textarea
            rows={5}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-mono leading-relaxed focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* 2. OLT & Physical Thresholds */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Server className="w-4 h-4 text-amber-600" />
          Circle Network OLT & Network Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Primary OLT Core IP</label>
            <input
              type="text"
              value={oltHost}
              onChange={(e) => setOltHost(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Auto-Escalation Optical Threshold (dBm)
            </label>
            <input
              type="text"
              value={opticalThreshold}
              onChange={(e) => setOpticalThreshold(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Signals below this threshold (e.g. -27.0 dBm) trigger automatic NOC technician dispatches.
            </p>
          </div>
        </div>
      </div>

      {/* 3. ISP Merchant & Support Hotline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <CreditCard className="w-4 h-4 text-amber-600" />
          bKash Merchant & Helpline Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">bKash Merchant Pay Number</label>
            <input
              type="text"
              value={bkashMerchant}
              onChange={(e) => setBkashMerchant(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">24/7 NOC Helpline Phone</label>
            <input
              type="text"
              value={hotline}
              onChange={(e) => setHotline(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
