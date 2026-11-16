import React, { useState } from 'react';
import {
  Search,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  X,
  CheckCircle2,
} from 'lucide-react';
import { SubscriberContact } from '../types';
import { MOCK_SUBSCRIBERS } from '../mockData';

export const CustomerContactsView: React.FC = () => {
  const [subscribers] = useState<SubscriberContact[]>(MOCK_SUBSCRIBERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');
  const [selectedSub, setSelectedSub] = useState<SubscriberContact | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filtered = subscribers.filter((s) => {
    if (statusFilter !== 'all' && s.connectionStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.subscriberId.toLowerCase().includes(q) ||
        s.pppoeUsername.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.zone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleReboot = (sub: SubscriberContact) => {
    setActionNotice(`Reboot signal sent to OLT ${sub.oltIp} for ONU port ${sub.ponPort}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-900">
      {/* Main Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Status Filters */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Subscriber ID (CN-XXXXX), PPPoE, Name, or Phone..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
              {(['all', 'online', 'degraded', 'offline'] as const).map((st) => (
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
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-900">{filtered.length}</span> of {subscribers.length} subscribers
          </div>
        </div>

        {/* Global Notice Banner */}
        {actionNotice && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 flex items-center gap-2 font-medium animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Directory Table */}
        <div className="flex-1 overflow-auto widget-scroll bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider select-none sticky top-0 z-10 font-semibold">
              <tr>
                <th className="py-3 px-4">Subscriber</th>
                <th className="py-3 px-4">PPPoE & Zone</th>
                <th className="py-3 px-4">Speed Plan</th>
                <th className="py-3 px-4">Optical Power (dBm)</th>
                <th className="py-3 px-4">OLT & Port</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sub) => {
                const isCritical = sub.opticalPowerDbm < -27;
                return (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{sub.fullName}</div>
                      <div className="font-mono text-[10px] font-bold text-amber-600">{sub.subscriberId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-800">{sub.pppoeUsername}</div>
                      <div className="text-[11px] text-slate-500">{sub.zone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {sub.planName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold text-[11px] ${
                          isCritical
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                        {sub.opticalPowerDbm} dBm
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      <div>{sub.oltIp}</div>
                      <div className="text-slate-800 font-medium">{sub.ponPort}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          sub.currentDueBdt > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        ৳{sub.currentDueBdt.toFixed(2)} BDT
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReboot(sub);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[11px] font-semibold border border-slate-200 transition-colors"
                      >
                        Reboot
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Slide-over Customer Profile Drawer */}
      {selectedSub && (
        <div className="w-88 border-l border-slate-200 bg-white p-5 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-xl animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">{selectedSub.fullName}</h3>
              <p className="font-mono text-xs font-bold text-amber-600">{selectedSub.subscriberId}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSub(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Optical Telemetry Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-600 font-semibold">Optical Power (dBm)</span>
              <span
                className={`font-mono text-xs font-bold ${
                  selectedSub.opticalPowerDbm < -27 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {selectedSub.opticalPowerDbm} dBm
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden my-2">
              <div
                className={`h-full ${
                  selectedSub.opticalPowerDbm < -27 ? 'bg-rose-500 w-3/12' : 'bg-emerald-500 w-9/12'
                }`}
              ></div>
            </div>
            <div className="text-[11px] text-slate-500">
              ONU MAC: <span className="font-mono text-slate-800 font-semibold">{selectedSub.onuMac}</span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>{selectedSub.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>{selectedSub.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>{selectedSub.address}</span>
            </div>
          </div>

          {/* Network Parameters */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">PPPoE User:</span>
              <span className="font-mono font-medium text-slate-900">{selectedSub.pppoeUsername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">OLT Host IP:</span>
              <span className="font-mono text-slate-900">{selectedSub.oltIp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PON Interface:</span>
              <span className="font-mono font-bold text-amber-600">{selectedSub.ponPort}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Joined Since:</span>
              <span className="text-slate-700">{selectedSub.joinDate}</span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => handleReboot(selectedSub)}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reboot ONU Port from OLT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
