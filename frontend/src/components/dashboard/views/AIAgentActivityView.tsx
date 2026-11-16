import React, { useState, useEffect } from 'react';
import {
  Zap,
  Code2,
  Search,
} from 'lucide-react';
import { AIToolActivityLog } from '../types';
import { MOCK_AI_LOGS } from '../mockData';
import { api } from '../../../services/api';

export const AIAgentActivityView: React.FC = () => {
  const [logs, setLogs] = useState<AIToolActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AIToolActivityLog | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const live = await api.getAILogs();
        if (live && live.length > 0) {
          setLogs(live);
          setSelectedLog(live[0]);
        } else {
          setLogs(MOCK_AI_LOGS);
          setSelectedLog(MOCK_AI_LOGS[0]);
        }
      } catch {
        setLogs(MOCK_AI_LOGS);
        setSelectedLog(MOCK_AI_LOGS[0]);
      }
    }
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.toolName.toLowerCase().includes(search.toLowerCase()) ||
      l.subscriberId.toLowerCase().includes(search.toLowerCase()) ||
      l.conversationId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-900">
      {/* Logs Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by tool name or subscriber..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gemini 1.5 Flash Live Function Calling Stream</span>
          </div>
        </div>

        {/* Logs Feed */}
        <div className="flex-1 overflow-auto widget-scroll bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider select-none sticky top-0 z-10 font-semibold">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Function / Tool</th>
                <th className="py-3 px-4">Subscriber</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Escalated?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-50/80 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-500">{log.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-amber-700 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>{log.toolName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">{log.subscriberId}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.executionTimeMs} ms</td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                      {(log.confidenceScore * 100).toFixed(0)}%
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
        </div>
      </div>

      {/* Right Detail Inspection Panel */}
      {selectedLog && (
        <div className="w-96 border-l border-slate-200 bg-white p-5 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-xl">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 font-bold">
              EXECUTION PAYLOAD INSPECTOR
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-amber-600" />
              {selectedLog.toolName}
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-600 font-medium block mb-1">Input Arguments:</span>
              <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-amber-300 overflow-x-auto shadow-2xs">
                {JSON.stringify(selectedLog.inputArgs, null, 2)}
              </pre>
            </div>

            <div>
              <span className="text-slate-600 font-medium block mb-1">OLT Return Result:</span>
              <pre className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-2xs">
                {JSON.stringify(selectedLog.outputResult, null, 2)}
              </pre>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Gemini Model:</span>
                <span className="font-mono text-slate-900 font-medium">{selectedLog.geminiModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Execution Latency:</span>
                <span className="font-mono text-slate-900 font-medium">{selectedLog.executionTimeMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Conversation:</span>
                <span className="font-mono text-slate-700">{selectedLog.conversationId}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
