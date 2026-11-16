import React, { useState } from 'react';
import { X, Ticket } from 'lucide-react';
import { MOCK_SUBSCRIBERS, MOCK_AGENTS } from './mockData';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any) => void;
  defaultSubscriberId?: string;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultSubscriberId = 'CN-99412',
}) => {
  const [subscriberId, setSubscriberId] = useState(defaultSubscriberId);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('optical_loss');
  const [priority, setPriority] = useState('urgent');
  const [assignedAgent, setAssignedAgent] = useState('Farhan Kabir');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const sub = MOCK_SUBSCRIBERS.find((s) => s.subscriberId === subscriberId);
    onSubmit({
      subscriberId,
      subscriberName: sub?.fullName || 'Subscriber',
      title,
      category,
      priority,
      assignedAgent,
      description,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm">Create New NOC Support Ticket</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Target Subscriber</label>
            <select
              value={subscriberId}
              onChange={(e) => setSubscriberId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            >
              {MOCK_SUBSCRIBERS.map((s) => (
                <option key={s.id} value={s.subscriberId}>
                  {s.subscriberId} — {s.fullName} ({s.zone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Issue Subject / Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Critical Optical Power Drop (-28.9 dBm) in Dhanmondi"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
              >
                <option value="optical_loss">Optical Signal Loss / High dBm</option>
                <option value="fiber_break">Physical Fiber Break / Red LOS</option>
                <option value="high_ping">High Ping / BDIX Routing</option>
                <option value="billing">Billing & Due Discrepancy</option>
                <option value="router_config">Wi-Fi Router Configuration</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
              >
                <option value="urgent">Urgent (SLA &lt; 2 hrs)</option>
                <option value="high">High (SLA &lt; 4 hrs)</option>
                <option value="normal">Normal (SLA &lt; 12 hrs)</option>
                <option value="low">Low (General)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Assigned NOC Engineer</label>
            <select
              value={assignedAgent}
              onChange={(e) => setAssignedAgent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
            >
              {MOCK_AGENTS.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name} ({a.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Diagnostic Notes / Details</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide drop wire TJ box, split ratio, or router diagnostic notes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white resize-none transition-all shadow-2xs"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold transition-all shadow-xs active:scale-95"
            >
              Dispatch Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
