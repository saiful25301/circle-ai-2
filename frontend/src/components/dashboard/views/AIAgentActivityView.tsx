import React, { useState, useEffect } from 'react';
import {
  Zap,
  Code2,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Database,
} from 'lucide-react';
import { AIToolActivityLog } from '../types';
import { api } from '../../../services/api';

const ALL_ISP_TOOLS = [
  { id: 'all', label: 'All 14 Tools' },
  { id: 'check_connection_status', label: 'check_connection_status (Rx dBm)' },
  { id: 'check_customer_bill', label: 'check_customer_bill (bKash/Due)' },
  { id: 'get_available_packages', label: 'get_available_packages (BDIX)' },
  { id: 'troubleshoot_internet', label: 'troubleshoot_internet (LOS/DNS)' },
  { id: 'check_internet_outage', label: 'check_internet_outage (POP Zone)' },
  { id: 'check_service_coverage', label: 'check_service_coverage' },
  { id: 'create_complaint_ticket', label: 'create_complaint_ticket' },
  { id: 'request_human_support', label: 'request_human_support' },
  { id: 'recommend_internet_package', label: 'recommend_internet_package' },
  { id: 'create_connection_lead', label: 'create_connection_lead' },
  { id: 'get_ticket_status', label: 'get_ticket_status' },
  { id: 'get_customer_info', label: 'get_customer_info' },
  { id: 'verify_customer', label: 'verify_customer' },
  { id: 'check_payment_status', label: 'check_payment_status' },
];

export const AIAgentActivityView: React.FC = () => {
  const [logs, setLogs] = useState<AIToolActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState('all');
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AIToolActivityLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const live = await api.getAILogs({
        search: search.trim() || undefined,
        toolName: selectedTool !== 'all' ? selectedTool : undefined,
        escalatedOnly: escalatedOnly,
        limit: 100,
      });
      setLogs(live || []);
      if (live && live.length > 0) {
        setSelectedLog(live[0]);
      } else {
        setSelectedLog(null);
      }
    } catch (err: any) {
      console.error('Failed to load tool logs:', err);
      setError(err.message || 'Failed to load AI execution logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedTool, escalatedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const user = api.getAuthUser();
  const isAdminOrSupervisor = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'noc_engineer';

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-900">
      {/* Logs Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Database className="w-4 h-4 text-amber-600" />
                </div>
                <h1 className="text-base font-bold text-slate-900">AI Function Calling & Tool Audit Trail</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {isAdminOrSupervisor ? 'RBAC Authorized' : 'Auditor Access'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect real-time Gemini function calls, input arguments, OLT outputs, and human escalation triggers recorded in <code>tool_logs</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Stream</span>
              </button>
            </div>
          </div>

          {/* Search & Tool Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subscriber ID, tool name, or conversation..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tool Dropdown */}
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none shadow-2xs cursor-pointer font-medium"
              >
                {ALL_ISP_TOOLS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              {/* Escalated Only Toggle */}
              <button
                type="button"
                onClick={() => setEscalatedOnly(!escalatedOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  escalatedOnly
                    ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Escalated Only</span>
              </button>
            </div>
          </div>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-auto widget-scroll bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs">Fetching real-time tool logs from PostgreSQL...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto" />
              <p className="font-bold text-xs">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-2 text-center p-6">
              <Code2 className="w-10 h-10 text-slate-300" />
              <h3 className="font-bold text-sm text-slate-700">No Tool Execution Logs Found</h3>
              <p className="text-xs text-slate-500">
                {search || selectedTool !== 'all' ? 'No logs match your filter criteria.' : 'No automated function executions recorded yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider select-none sticky top-0 z-10 font-semibold">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">ISP Tool Function</th>
                  <th className="py-3 px-4">Subscriber</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Escalation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  const isSuccess = log.isSuccess !== false;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/80 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-amber-700">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-mono">{log.toolName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 font-semibold">{log.subscriberId || 'CN-GUEST'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{log.executionTimeMs} ms</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span>{isSuccess ? 'Success' : 'Error'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.escalated ? (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                            ESCALATED
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                            AI RESOLVED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Detail Inspection Panel */}
      {selectedLog && (
        <div className="w-96 border-l border-slate-200 bg-white p-5 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-xl animate-slideUp">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 font-bold">
              EXECUTION PAYLOAD INSPECTOR
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5 font-mono">
              <Code2 className="w-4 h-4 text-amber-600" />
              {selectedLog.toolName}
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-600 font-bold block mb-1">Input Arguments (Payload):</span>
              <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-amber-300 overflow-x-auto shadow-2xs">
                {JSON.stringify(selectedLog.inputArgs, null, 2)}
              </pre>
            </div>

            <div>
              <span className="text-slate-600 font-bold block mb-1">Tool Execution Output:</span>
              <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-2xs">
                {JSON.stringify(selectedLog.outputResult, null, 2)}
              </pre>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Gemini Model:</span>
                <span className="font-mono text-slate-900 font-bold">{selectedLog.geminiModel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Execution Latency:</span>
                <span className="font-mono text-slate-900 font-bold">{selectedLog.executionTimeMs} ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Target Conversation:</span>
                <span className="font-mono text-slate-700 text-[10px]">{selectedLog.conversationId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Subscriber ID:</span>
                <span className="font-mono text-amber-700 font-bold">{selectedLog.subscriberId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Audit Confidence:</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {(selectedLog.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
