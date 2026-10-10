import { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Edit2, 
  Check, 
  X
} from 'lucide-react';
import { electricityTariffService, type ElectricityTariff } from '../../services/electricityTariff';
import { useToast } from '../ui/ToastContext';

export default function ElectricityTariffCard() {
  const [data, setData] = useState<ElectricityTariff | null>(null);
  const [editing, setEditing] = useState(false);
  const [rateInput, setRateInput] = useState('6.5');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const loadTariff = useCallback(async () => {
    try {
      const res = await electricityTariffService.getTariff();
      setData(res);
      setRateInput(res.ratePerKWh.toString());
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadTariff();
  }, [loadTariff]);

  const handleSave = async () => {
    const num = parseFloat(rateInput);
    if (isNaN(num) || num <= 0) {
      addToast({ title: 'Validation', message: 'Enter a valid rate per unit', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const updated = await electricityTariffService.updateTariff({ ratePerKWh: num });
      setData(updated);
      setEditing(false);
      addToast({ title: 'Tariff Updated', message: `Unit rate set to ₹${num}/kWh`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Update Failed', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#ECECEC] flex items-center gap-2">
              Electricity Tariff & Bill Projections
            </h2>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Live power cost calculator based on Tamil Nadu EB slab rates and ESP32 power consumption.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-[#8C8C8C] mr-1.5 font-mono">₹/kWh:</span>
                <input
                  type="number"
                  step="0.5"
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                  className="w-16 bg-transparent text-[#ECECEC] font-mono focus:outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition active:scale-[0.98]"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-xl bg-[#0F0F0F] text-[#8C8C8C] hover:text-[#ECECEC] border border-[#2A2A2A] transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition-colors active:scale-[0.98]"
            >
              <Edit2 className="w-3 h-3 text-[#8C8C8C]" />
              Set EB Unit Rate (₹{data?.ratePerKWh || '6.5'})
            </button>
          )}
        </div>
      </div>

      {/* Projections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4">
          <span className="text-[10px] uppercase font-semibold text-[#8C8C8C] tracking-wider">Daily Running Cost</span>
          <div className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">
            ₹{data?.dailyCost || '7.80'}
          </div>
          <span className="text-[11px] text-[#8C8C8C] mt-1 block">~{data?.dailyKWh || '1.2'} kWh / 24 Hours</span>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4">
          <span className="text-[10px] uppercase font-semibold text-[#8C8C8C] tracking-wider">Monthly Projected Bill</span>
          <div className="text-2xl font-normal font-mono text-[#4ADE80] mt-1">
            ₹{data?.monthlyCost || '234.00'}
          </div>
          <span className="text-[11px] text-[#8C8C8C] mt-1 block">~{data?.monthlyKWh || '36.0'} Units / Month</span>
        </div>

        <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4">
          <span className="text-[10px] uppercase font-semibold text-[#8C8C8C] tracking-wider">Yearly Projection</span>
          <div className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">
            ₹{data?.yearlyCost || '2847.00'}
          </div>
          <span className="text-[11px] text-[#8C8C8C] mt-1 block">~{data?.yearlyKWh || '438.0'} Units / Year</span>
        </div>
      </div>
    </div>
  );
}
