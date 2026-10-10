import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export interface Rule {
  id?: string;
  name: string;
  category: string;
  metric?: string;
  event?: string;
  operator?: string;
  threshold?: number;
  duration?: number;
  severity: string;
  enabled: boolean;
  cooldown: number;
}

export default function RuleEditor({
  rule,
  onSave,
  onClose
}: {
  rule?: Rule;
  onSave: (r: Rule) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Rule>(
    rule || {
      name: '',
      category: 'hardware',
      metric: 'cpuUsage',
      operator: '>',
      threshold: 80,
      duration: 5,
      cooldown: 30,
      severity: 'warning',
      enabled: true
    }
  );

  const [isEvent, setIsEvent] = useState(!!rule?.event);

  const categories = ['hardware', 'system', 'network', 'docker', 'services', 'power'];

  const metricOptions: Record<string, string[]> = {
    hardware: ['cpuUsage', 'cpuTemperature', 'ramUsage', 'storageUsage', 'diskTemperature'],
    system: ['uptime'],
    network: ['rxSpeed', 'txSpeed'],
    docker: ['containerCount'],
    services: ['activeServiceCount'],
    power: ['liveWatts']
  };

  const eventOptions: Record<string, string[]> = {
    power: ['power_outage', 'power_restored', 'wake_sent', 'scheduled_shutdown', 'server_online'],
    system: ['server_online', 'server_restarted', 'server_shutdown'],
    docker: ['container_crashed', 'container_unhealthy'],
    services: ['service_failed', 'service_restarted'],
    hardware: ['thermal_throttling'],
    network: ['wan_ip_changed']
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const finalData = { ...formData };
    if (isEvent) {
      delete finalData.metric;
      delete finalData.operator;
      delete finalData.threshold;
      delete finalData.duration;
    } else {
      delete finalData.event;
    }

    onSave(finalData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:px-6 border-b border-[#2A2A2A] bg-[#0F0F0F]">
          <div>
            <h2 className="text-sm font-semibold text-[#ECECEC]">{rule ? 'Edit Alert Rule' : 'Create Alert Rule'}</h2>
            <p className="text-[11px] text-[#8C8C8C] mt-0.5">Automate notification triggers for hardware telemetry or discrete events.</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] transition rounded-lg p-1.5"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Rule Name */}
          <div>
            <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Rule Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs focus:border-[#ECECEC]/40 focus:outline-none"
              placeholder="e.g., High CPU Core Temp Warning"
            />
          </div>

          {/* Trigger Type Toggle */}
          <div>
            <span className="block text-[11px] uppercase font-semibold tracking-wider text-[#8C8C8C] mb-2">Condition Type</span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
              <button
                type="button"
                onClick={() => setIsEvent(false)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition ${
                  !isEvent
                    ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                    : 'text-[#8C8C8C] hover:text-[#ECECEC]'
                }`}
              >
                Metric Threshold
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEvent(true);
                  setFormData({ ...formData, event: 'power_outage', category: 'power' });
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition ${
                  isEvent
                    ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                    : 'text-[#8C8C8C] hover:text-[#ECECEC]'
                }`}
              >
                Discrete Event
              </button>
            </div>
          </div>

          {/* Category & Metric / Event */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setFormData({
                    ...formData,
                    category: cat,
                    metric: metricOptions[cat]?.[0] || '',
                    event: eventOptions[cat]?.[0] || ''
                  });
                }}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs focus:border-[#ECECEC]/40 focus:outline-none capitalize font-mono"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#1A1A1A] text-[#ECECEC]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {!isEvent ? (
              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Metric</label>
                <select
                  value={formData.metric || ''}
                  onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs focus:border-[#ECECEC]/40 focus:outline-none font-mono"
                >
                  {(metricOptions[formData.category] || ['cpuUsage']).map((m) => (
                    <option key={m} value={m} className="bg-[#1A1A1A] text-[#ECECEC]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Event Type</label>
                <select
                  value={formData.event || ''}
                  onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs focus:border-[#ECECEC]/40 focus:outline-none font-mono"
                >
                  {(eventOptions[formData.category] || ['power_outage']).map((e) => (
                    <option key={e} value={e} className="bg-[#1A1A1A] text-[#ECECEC]">
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Operator & Threshold (if Metric) */}
          {!isEvent && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Operator</label>
                <select
                  value={formData.operator || '>'}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs focus:border-[#ECECEC]/40 focus:outline-none font-mono"
                >
                  <option value=">" className="bg-[#1A1A1A]">&gt; (Greater than)</option>
                  <option value="<" className="bg-[#1A1A1A]">&lt; (Less than)</option>
                  <option value=">=" className="bg-[#1A1A1A]">&gt;= (Greater or equal)</option>
                  <option value="<=" className="bg-[#1A1A1A]">&lt;= (Less or equal)</option>
                  <option value="==" className="bg-[#1A1A1A]">== (Exact match)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Threshold Value</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.threshold ?? 80}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs font-mono focus:border-[#ECECEC]/40 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Duration & Cooldown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isEvent && (
              <div>
                <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Sustain Duration (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  required
                  value={formData.duration ?? 5}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs font-mono focus:border-[#ECECEC]/40 focus:outline-none"
                />
                <p className="text-[11px] text-[#8C8C8C] mt-1">Time condition must persist before firing alert.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Alert Cooldown (Minutes)</label>
              <input
                type="number"
                min="1"
                max="1440"
                required
                value={formData.cooldown ?? 30}
                onChange={(e) => setFormData({ ...formData, cooldown: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs font-mono focus:border-[#ECECEC]/40 focus:outline-none"
              />
              <p className="text-[11px] text-[#8C8C8C] mt-1">Minimum quiet interval before sending duplicate alert.</p>
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-medium text-[#ECECEC] mb-1.5">Alert Severity</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#ECECEC] text-xs focus:border-[#ECECEC]/40 focus:outline-none uppercase font-mono"
            >
              <option value="info" className="bg-[#1A1A1A] text-sky-400">INFO</option>
              <option value="warning" className="bg-[#1A1A1A] text-amber-400">WARNING</option>
              <option value="critical" className="bg-[#1A1A1A] text-red-400">CRITICAL</option>
            </select>
          </div>

          {/* Rule Enabled Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
            <div>
              <span className="text-xs font-medium text-[#ECECEC] block">Rule Active</span>
              <span className="text-[11px] text-[#8C8C8C] block mt-0.5">Actively evaluate against host telemetry.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2.5 border-t border-[#2A2A2A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#141414] hover:bg-[#222222] border border-[#2A2A2A] rounded-xl text-xs font-medium text-[#ECECEC] transition active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-200 text-[#0A0A0A] rounded-xl text-xs font-semibold shadow-sm transition active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Rule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
