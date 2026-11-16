import React, { useState } from 'react';
import {
  Settings,
  Bot,
  Server,
  Save,
  CheckCircle2,
  CreditCard,
  Code,
  Copy,
  Check,
  Globe,
  ExternalLink,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [model, setModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState('0.3');
  const [opticalThreshold, setOpticalThreshold] = useState('-27.0');
  const [oltHost, setOltHost] = useState('10.200.14.2');
  const [bkashMerchant, setBkashMerchant] = useState('01611411211');
  const [hotline, setHotline] = useState('16207');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [widgetLanguage, setWidgetLanguage] = useState<'bn' | 'en'>('bn');
  const [widgetColor, setWidgetColor] = useState('#FDBC1F');
  const [systemPrompt, setSystemPrompt] = useState(
    `You are Circle AI, the intelligent virtual support engineer for Circle Network, an ISP in Bangladesh.
Your persona is inspired by Intercom Fin: empathetic, concise, and proactive.
For network issues (slow speed, loss of signal, red LOS light on ONU), proactively use the diagnose_onu_status tool with the subscriber's ID or username.
For billing or invoice questions, use check_subscriber_billing tool to check dues and provide bKash payment instructions.`
  );
  const [saved, setSaved] = useState(false);

  const embedSnippet = `<!-- Circle AI Customer Messenger for circlenetworkbd.net -->
<script
  src="https://chat.circlenetworkbd.net/widget.js"
  id="circle-ai-messenger-script"
  data-isp="Circle Network"
  data-primary-color="${widgetColor}"
  data-hotline="${hotline}"
  defer
></script>
<script>
  window.addEventListener('DOMContentLoaded', function() {
    if (window.CircleAIWidget) {
      window.CircleAIWidget.init({
        primaryColor: '${widgetColor}',
        secondaryColor: '#3F3F3F',
        initialLanguage: '${widgetLanguage}',
        defaultOpen: false
      });
    }
  });
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

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

      {/* 4. Customer Messenger Widget Embed Snippet (circlenetworkbd.net) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Code className="w-4 h-4 text-amber-600" />
              Customer Messenger Widget Embed Code
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste this HTML snippet right before the closing &lt;/body&gt; tag on{' '}
              <a
                href="https://www.circlenetworkbd.net"
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 underline font-semibold hover:text-amber-700 inline-flex items-center gap-0.5"
              >
                circlenetworkbd.net
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <button
            type="button"
            onClick={copyToClipboard}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              copiedSnippet
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {copiedSnippet ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Embed Snippet</span>
              </>
            )}
          </button>
        </div>

        {/* Customization controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Default Language</label>
            <select
              value={widgetLanguage}
              onChange={(e) => setWidgetLanguage(e.target.value as 'bn' | 'en')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            >
              <option value="bn">Bangla (বাংলা - Official Website Default)</option>
              <option value="en">English (English)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Theme Brand Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={widgetColor}
                onChange={(e) => setWidgetColor(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs uppercase"
              />
            </div>
          </div>
        </div>

        {/* Snippet box */}
        <div className="relative">
          <pre className="p-4 bg-slate-900 text-amber-200 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
            {embedSnippet}
          </pre>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
          <Globe className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Production CDN &amp; Cross-Origin Support:</p>
            <p className="text-amber-800">
              The embed bundle is isolated in an iframe / custom shadow DOM to avoid CSS collisions with the main Circle Network website. Works seamlessly across WordPress, custom HTML, and modern single-page apps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
