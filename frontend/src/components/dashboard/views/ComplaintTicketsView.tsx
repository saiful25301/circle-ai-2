import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';
import { SupportTicketItem } from '../types';
import { MOCK_TICKETS, MOCK_AGENTS } from '../mockData';
import { api } from '../../../services/api';

interface ComplaintTicketsViewProps {
  onOpenCreateModal: () => void;
}

export const ComplaintTicketsView: React.FC<ComplaintTicketsViewProps> = ({
  onOpenCreateModal,
}) => {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);

  const fetchTickets = async () => {
    try {
      const data = await api.getTickets(statusFilter);
      if (data && data.length > 0) {
        const formatted: SupportTicketItem[] = data.map((t: any) => ({
          id: t.id,
          ticketNumber: t.ticket_number,
          subscriberId: t.subscriber_id || t.customer_id,
          subscriberName: t.subscriber_name || 'Subscriber',
          title: t.title,
          category: t.category,
          priority: t.priority,
          status: t.status,
          assignedAgent: t.assigned_agent || 'Farhan Kabir',
          conversationId: t.conversation_id,
          createdAt: t.created_at || 'Just now',
          updatedAt: t.resolved_at || 'Just now',
          slaRemainingHours: t.sla_remaining_hours || 2,
        }));
        setTickets(formatted);
      } else {
        setTickets(MOCK_TICKETS);
      }
    } catch {
      setTickets(MOCK_TICKETS);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subscriberName.toLowerCase().includes(q) ||
        t.subscriberId.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpdateStatus = async (ticketId: string, newStatus: SupportTicketItem['status']) => {
    try {
      await api.updateTicketStatus(ticketId, newStatus);
    } catch {
      // offline fallback
    }
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleAssignAgent = async (ticketId: string, agentName: string) => {
    try {
      await api.updateTicketStatus(ticketId, undefined, undefined, agentName);
    } catch {
      // offline fallback
    }
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, assignedAgent: agentName } : t))
    );
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) => (prev ? { ...prev, assignedAgent: agentName } : null));
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-900">
      {/* Main Table Column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket #, subscriber, or issue..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
              {(['all', 'open', 'in_progress', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>
        </div>

        {/* Tickets Table */}
        <div className="flex-1 overflow-auto widget-scroll bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider sticky top-0 z-10 select-none font-semibold">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Subscriber</th>
                <th className="py-3 px-4">Issue Title</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Engineer</th>
                <th className="py-3 px-4 text-right">SLA Timer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tkt) => {
                const isUrgent = tkt.priority === 'urgent';
                return (
                  <tr
                    key={tkt.id}
                    onClick={() => setSelectedTicket(tkt)}
                    className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-600">
                      {tkt.ticketNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{tkt.subscriberName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{tkt.subscriberId}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-800">
                      {tkt.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          isUrgent
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {tkt.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-bold capitalize ${
                          tkt.status === 'open'
                            ? 'text-rose-600'
                            : tkt.status === 'in_progress'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {tkt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {tkt.assignedAgent}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500 text-[11px]">
                      {tkt.slaRemainingHours > 0 ? `${tkt.slaRemainingHours}h remaining` : 'Resolved'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Drawer: Ticket Detail Panel */}
      {selectedTicket && (
        <div className="w-88 border-l border-slate-200 bg-white p-5 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-xl animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <span className="font-mono text-xs font-bold text-amber-600">{selectedTicket.ticketNumber}</span>
              <h3 className="font-bold text-sm text-slate-900 mt-0.5">{selectedTicket.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subscriber summary */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Subscriber:</span>
              <span className="font-bold text-slate-900">{selectedTicket.subscriberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account ID:</span>
              <span className="font-mono font-bold text-amber-600">{selectedTicket.subscriberId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created:</span>
              <span className="text-slate-700">{selectedTicket.createdAt}</span>
            </div>
          </div>

          {/* Update Status Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Ticket Status</label>
            <select
              value={selectedTicket.status}
              onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            >
              <option value="open">Open (Unresolved)</option>
              <option value="in_progress">In Progress (NOC Dispatched)</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Reassign Agent */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Assigned NOC Engineer</label>
            <select
              value={selectedTicket.assignedAgent}
              onChange={(e) => handleAssignAgent(selectedTicket.id, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            >
              {MOCK_AGENTS.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name} ({a.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Resolution Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Ticket Resolved</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
