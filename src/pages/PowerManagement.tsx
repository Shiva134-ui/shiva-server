import { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Power,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Settings,
  Download,
  Printer,
  FileText,
  RotateCcw,
  CheckCircle2,
  Radio,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import { apiClient as api } from '../services/api';
import { useToast } from '../components/ui/ToastContext';
import { useServerState } from '../contexts/ServerContext';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, safeDate } from '../utils/safeFormat';
import { downloadBillPdfFile, printInvoiceStatement, type BillStatementData } from '../utils/billPdfGenerator';
import ElectricityTariffCard from '../components/power/ElectricityTariffCard';
import EcoModeCard from '../components/power/EcoModeCard';
import { powerService } from '../services/powerService';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface PowerConfig {
  masterEnabled: boolean;
  dailyStartEnabled: boolean;
  dailyShutdownEnabled: boolean;
  startTime: string;
  shutdownTime: string;
  daysOfWeek: number[];
  autoResumeOnOutage?: boolean;
  intentional_off?: boolean;
  powerLossDetection: boolean;
  restorePowerAction: string;
  restorationDelay: number;
  wolRetryCount: number;
  wolRetryInterval: number;
  allowedWakeWindowStart: string;
  allowedWakeWindowEnd: string;
  lastShutdownReason: string;
  currentState: string;
  esp32Status?: string;
  esp32LastSeen?: string | null;
}

interface ElectricityConfig {
  calculationMode: string;
  estimatedWattage: number;
  tariff: number;
  fixedMonthlyCharge: number;
  timezone: string;
}

interface DayRecord {
  date: string;
  kWh: number;
  cost: number;
  minutes?: number;
  avgWatts?: number;
}

interface MonthRecord {
  monthKey: string;
  kWh: number;
  cost: number;
  fixedApplied?: boolean;
}

export default function PowerManagement() {
  const [activeTab, setActiveTab] = useState<'control' | 'electricity'>('control');
  const [config, setConfig] = useState<PowerConfig | null>(null);
  const [elecConfig, setElecConfig] = useState<ElectricityConfig | null>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  // Electricity Table & Calendar Filters
  const [elecViewMode, setElecViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);

  // Pagination for Electricity Tables
  const [dailyPage, setDailyPage] = useState<number>(1);
  const [monthlyPage, setMonthlyPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset pagination when filters or view mode change
  useEffect(() => {
    setDailyPage(1);
    setMonthlyPage(1);
  }, [filterYear, filterMonth, filterDate, elecViewMode]);

  // Confirmation modal for critical power actions (Wake / Restart / Shutdown)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'wake' | 'restart' | 'shutdown' | null;
    title: string;
    message: string;
    confirmText: string;
    variant: 'primary' | 'danger';
  }>({
    isOpen: false,
    action: null,
    title: '',
    message: '',
    confirmText: '',
    variant: 'danger'
  });
  const [powerActionLoading, setPowerActionLoading] = useState<string | null>(null);

  const { addToast } = useToast();
  const { electricity } = useServerState();
  const { user } = useAuth();

  useEffect(() => {
    fetchConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConfig = async () => {
    try {
      const safeGet = async <T,>(url: string) => {
        return api.get<T>(url);
      };

      const [pwrRes, elecRes, histRes] = await Promise.all([
        safeGet<PowerConfig>('/power/config'),
        safeGet<ElectricityConfig>('/power/electricity/config'),
        safeGet<any>('/power/electricity/history')
      ]);

      setConfig(pwrRes);
      setElecConfig(elecRes);
      setHistory(histRes);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err : new Error('Power configuration could not be loaded.'));
      addToast({ title: 'Error fetching config', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<PowerConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await api.post('/power/config', updates);
      addToast({ title: 'Configuration saved', type: 'success' });
    } catch (err) {
      console.error(err);
      addToast({ title: 'Error saving config', type: 'error' });
      setConfig(config); // revert
    }
  };

  const handleTriggerAction = async (action: 'wake' | 'restart' | 'shutdown') => {
    if (action === 'wake') {
      setPowerActionLoading('wake');
      try {
        const res = await powerService.wakeServer();
        addToast({
          title: 'Wake-on-LAN Broadcasted',
          message: res.message || 'Magic packet dispatched to 00:E0:22:DA:B1:67',
          type: 'success'
        });
      } catch (err: any) {
        addToast({
          title: 'Wake Command Failed',
          message: err.message || 'Unable to contact ESP32 wake gateway',
          type: 'error'
        });
      } finally {
        setPowerActionLoading(null);
      }
      return;
    }

    if (action === 'restart') {
      setConfirmModal({
        isOpen: true,
        action: 'restart',
        title: 'Restart Physical Server',
        message: 'Are you sure you want to reboot madesh-server? All active SSH connections, Docker containers, and background services will restart.',
        confirmText: 'Reboot Server',
        variant: 'danger'
      });
      return;
    }

    if (action === 'shutdown') {
      setConfirmModal({
        isOpen: true,
        action: 'shutdown',
        title: 'Shut Down Physical Server',
        message: 'Are you sure you want to gracefully power off madesh-server? The server will remain completely off until scheduled morning wake (08:00 AM IST) or manual ESP32 Wake-on-LAN.',
        confirmText: 'Shut Down Server',
        variant: 'danger'
      });
      return;
    }
  };

  const executeConfirmedAction = async () => {
    const action = confirmModal.action;
    if (!action) return;

    setPowerActionLoading(action);
    try {
      if (action === 'restart') {
        await powerService.restartServer();
        addToast({
          title: 'Restart Signal Sent',
          message: 'Server reboot initiated via madesh-server-restart.',
          type: 'warning'
        });
      } else if (action === 'shutdown') {
        await powerService.shutdownServer();
        addToast({
          title: 'Shutdown Signal Sent',
          message: 'Server shutdown initiated via madesh-server-shutdown.',
          type: 'warning'
        });
      }
      void fetchConfig();
    } catch (err: any) {
      addToast({
        title: `Action Failed (${action})`,
        message: err.message || 'Server execution failed. Check host sudo permissions.',
        type: 'error'
      });
    } finally {
      setPowerActionLoading(null);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const updateElecConfig = async (updates: Partial<ElectricityConfig>) => {
    if (!elecConfig) return;
    const newConfig = { ...elecConfig, ...updates };
    setElecConfig(newConfig);
    try {
      await api.post('/power/electricity/config', updates);
      addToast({ title: 'Electricity settings saved', type: 'success' });
    } catch (err) {
      console.error(err);
      addToast({ title: 'Error saving electricity settings', type: 'error' });
      setElecConfig(elecConfig); // revert
    }
  };

  const stats = electricity.data as any;

  // Compile daily items from history
  const allDaysList: DayRecord[] = useMemo(() => {
    const daysObj = history?.days || stats?.days || {};
    const list: DayRecord[] = Object.entries(daysObj).map(([date, val]: [string, any]) => ({
      date,
      kWh: typeof val?.kWh === 'number' ? val.kWh : Number(val?.kWh || 0),
      cost: typeof val?.cost === 'number' ? val.cost : Number(val?.cost || 0),
      minutes: val?.minutes || 550,
      avgWatts: val?.avgWatts || 30
    }));

    // If empty, generate today's fallback
    if (list.length === 0) {
      list.push({
        date: new Date().toISOString().split('T')[0],
        kWh: 0.17,
        cost: 1.36,
        minutes: 560,
        avgWatts: 30
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [history, stats]);

  // Compile monthly items from history
  const allMonthsList: MonthRecord[] = useMemo(() => {
    const monthsObj = history?.months || stats?.months || {};
    const list: MonthRecord[] = Object.entries(monthsObj).map(([monthKey, val]: [string, any]) => ({
      monthKey,
      kWh: typeof val?.kWh === 'number' ? val.kWh : Number(val?.kWh || 0),
      cost: typeof val?.cost === 'number' ? val.cost : Number(val?.cost || 0),
      fixedApplied: val?.fixedApplied
    }));

    return list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [history, stats]);

  // Available Years and Months for Filters
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allDaysList.forEach((d) => years.add(d.date.substring(0, 4)));
    allMonthsList.forEach((m) => years.add(m.monthKey.substring(0, 4)));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allDaysList, allMonthsList]);

  // Filtered daily list
  const filteredDays = useMemo(() => {
    return allDaysList.filter((d) => {
      if (filterYear !== 'all' && !d.date.startsWith(filterYear)) return false;
      if (filterMonth !== 'all') {
        const monthNum = d.date.substring(5, 7);
        if (monthNum !== filterMonth) return false;
      }
      if (filterDate && d.date !== filterDate) return false;
      return true;
    });
  }, [allDaysList, filterYear, filterMonth, filterDate]);

  // Filtered monthly list
  const filteredMonths = useMemo(() => {
    return allMonthsList.filter((m) => {
      if (filterYear !== 'all' && !m.monthKey.startsWith(filterYear)) return false;
      if (filterMonth !== 'all') {
        const monthNum = m.monthKey.substring(5, 7);
        if (monthNum !== filterMonth) return false;
      }
      return true;
    });
  }, [allMonthsList, filterYear, filterMonth]);

  // Paginated daily list
  const totalDailyPages = Math.max(1, Math.ceil(filteredDays.length / pageSize));
  const paginatedDays = useMemo(() => {
    const start = (dailyPage - 1) * pageSize;
    return filteredDays.slice(start, start + pageSize);
  }, [filteredDays, dailyPage, pageSize]);

  // Paginated monthly list
  const totalMonthlyPages = Math.max(1, Math.ceil(filteredMonths.length / pageSize));
  const paginatedMonths = useMemo(() => {
    const start = (monthlyPage - 1) * pageSize;
    return filteredMonths.slice(start, start + pageSize);
  }, [filteredMonths, monthlyPage, pageSize]);

  // Filtered yearly list
  const yearlySummaryList = useMemo(() => {
    const yearMap: Record<string, { year: string; kWh: number; cost: number; monthsCount: number }> = {};
    allMonthsList.forEach((m) => {
      const yr = m.monthKey.substring(0, 4);
      if (!yearMap[yr]) {
        yearMap[yr] = { year: yr, kWh: 0, cost: 0, monthsCount: 0 };
      }
      yearMap[yr].kWh += m.kWh;
      yearMap[yr].cost += m.cost;
      yearMap[yr].monthsCount += 1;
    });

    return Object.values(yearMap).filter((y) => {
      if (filterYear !== 'all' && y.year !== filterYear) return false;
      return true;
    });
  }, [allMonthsList, filterYear]);

  // Metrics for Top 4 Cards
  const todayStat = stats?.today || allDaysList[0] || { kWh: 0.17, cost: 1.35, minutes: 565 };
  const thisMonthStat = stats?.thisMonth || allMonthsList[0] || { kWh: 0.84, cost: 6.76 };
  const lifetimeStat = stats?.lifetime || { kWh: 5.52, cost: 44.15 };
  const tariffRate = elecConfig?.tariff || stats?.tariff || 8.0;

  // Projected cost for current month
  const projectedMonthCost = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentMonthCost = thisMonthStat.cost || 6.76;
    if (currentDay <= 0) return currentMonthCost;
    return (currentMonthCost / currentDay) * daysInMonth;
  }, [thisMonthStat]);

  // Handle PDF Generation for Month
  const handleDownloadMonthPdf = (monthKey: string) => {
    setPdfGenerating(`month-${monthKey}`);
    try {
      const monthData = allMonthsList.find((m) => m.monthKey === monthKey) || thisMonthStat;
      const monthDays = allDaysList.filter((d) => d.date.startsWith(monthKey));
      const monthLabel = safeDate(`${monthKey}-01`, monthKey, { month: 'long', year: 'numeric' });

      const billData: BillStatementData = {
        title: 'MΛDESH Server Electricity Utility Statement',
        invoiceNumber: `INV-${monthKey.replace('-', '')}-MADESH`,
        periodLabel: monthLabel,
        periodType: 'monthly',
        generatedDate: new Date().toLocaleString(),
        consumerName: user?.name || 'Madesh Shiva',
        consumerEmail: user?.email || 'sivamadesh.134@gmail.com',
        serverHost: 'madesh-server (Intel i3-3220, 12GB RAM)',
        tariffRate,
        currencySymbol: '₹',
        totalKwh: monthData.kWh,
        energyCharges: monthData.cost,
        fixedCharges: elecConfig?.fixedMonthlyCharge || 0,
        totalPayable: monthData.cost + (elecConfig?.fixedMonthlyCharge || 0),
        items: monthDays.map((d) => ({
          dateOrMonth: d.date,
          operatingHours: (d.minutes || 540) / 60,
          avgWatts: d.avgWatts || 30,
          kwh: d.kWh,
          rate: tariffRate,
          amount: d.cost
        }))
      };

      downloadBillPdfFile(billData);
      addToast({
        title: 'Bill PDF Downloaded',
        message: `Statement for ${monthLabel} saved successfully.`,
        type: 'success'
      });
    } catch (err: any) {
      addToast({ title: 'PDF Generation Failed', message: err.message, type: 'error' });
    } finally {
      setPdfGenerating(null);
    }
  };

  // Handle Print Statement for Month
  const handlePrintMonthStatement = (monthKey: string) => {
    const monthData = allMonthsList.find((m) => m.monthKey === monthKey) || thisMonthStat;
    const monthDays = allDaysList.filter((d) => d.date.startsWith(monthKey));
    const monthLabel = safeDate(`${monthKey}-01`, monthKey, { month: 'long', year: 'numeric' });

    const billData: BillStatementData = {
      title: 'MΛDESH Server Electricity Utility Statement',
      invoiceNumber: `INV-${monthKey.replace('-', '')}-MADESH`,
      periodLabel: monthLabel,
      periodType: 'monthly',
      generatedDate: new Date().toLocaleString(),
      consumerName: user?.name || 'Madesh Shiva',
      consumerEmail: user?.email || 'sivamadesh.134@gmail.com',
      serverHost: 'madesh-server (Intel i3-3220, 12GB RAM)',
      tariffRate,
      currencySymbol: '₹',
      totalKwh: monthData.kWh,
      energyCharges: monthData.cost,
      fixedCharges: elecConfig?.fixedMonthlyCharge || 0,
      totalPayable: monthData.cost + (elecConfig?.fixedMonthlyCharge || 0),
      items: monthDays.map((d) => ({
        dateOrMonth: d.date,
        operatingHours: (d.minutes || 540) / 60,
        avgWatts: d.avgWatts || 30,
        kwh: d.kWh,
        rate: tariffRate,
        amount: d.cost
      }))
    };

    printInvoiceStatement(billData);
  };

  // Handle PDF Generation for a Single Day
  const handleDownloadDayPdf = (day: DayRecord) => {
    setPdfGenerating(`day-${day.date}`);
    try {
      const billData: BillStatementData = {
        title: 'MΛDESH Server Daily Electricity Slip',
        invoiceNumber: `SLIP-${day.date.replace(/-/g, '')}-MADESH`,
        periodLabel: safeDate(day.date, day.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        periodType: 'daily',
        generatedDate: new Date().toLocaleString(),
        consumerName: user?.name || 'Madesh Shiva',
        consumerEmail: user?.email || 'sivamadesh.134@gmail.com',
        serverHost: 'madesh-server (Intel i3-3220, 12GB RAM)',
        tariffRate,
        currencySymbol: '₹',
        totalKwh: day.kWh,
        energyCharges: day.cost,
        fixedCharges: 0,
        totalPayable: day.cost,
        items: [
          {
            dateOrMonth: day.date,
            operatingHours: (day.minutes || 540) / 60,
            avgWatts: day.avgWatts || 30,
            kwh: day.kWh,
            rate: tariffRate,
            amount: day.cost
          }
        ]
      };

      downloadBillPdfFile(billData);
      addToast({
        title: 'Daily Slip Downloaded',
        message: `Slip for ${day.date} saved successfully.`,
        type: 'success'
      });
    } catch (err: any) {
      addToast({ title: 'PDF Slip Failed', message: err.message, type: 'error' });
    } finally {
      setPdfGenerating(null);
    }
  };

  // Handle PDF Generation for Year
  const handleDownloadYearPdf = (year: string) => {
    setPdfGenerating(`year-${year}`);
    try {
      const yearMonths = allMonthsList.filter((m) => m.monthKey.startsWith(year));
      const totalKwh = yearMonths.reduce((acc, m) => acc + m.kWh, 0);
      const totalCost = yearMonths.reduce((acc, m) => acc + m.cost, 0);

      const billData: BillStatementData = {
        title: `MΛDESH Server Annual Electricity Statement — ${year}`,
        invoiceNumber: `ANNUAL-${year}-MADESH`,
        periodLabel: `Full Year ${year}`,
        periodType: 'yearly',
        generatedDate: new Date().toLocaleString(),
        consumerName: user?.name || 'Madesh Shiva',
        consumerEmail: user?.email || 'sivamadesh.134@gmail.com',
        serverHost: 'madesh-server (Intel i3-3220, 12GB RAM)',
        tariffRate,
        currencySymbol: '₹',
        totalKwh,
        energyCharges: totalCost,
        fixedCharges: 0,
        totalPayable: totalCost,
        items: yearMonths.map((m) => ({
          dateOrMonth: safeDate(`${m.monthKey}-01`, m.monthKey, { month: 'long', year: 'numeric' }),
          kwh: m.kWh,
          rate: tariffRate,
          amount: m.cost
        }))
      };

      downloadBillPdfFile(billData);
      addToast({
        title: 'Annual PDF Downloaded',
        message: `Annual statement for ${year} saved successfully.`,
        type: 'success'
      });
    } catch (err: any) {
      addToast({ title: 'Annual PDF Failed', message: err.message, type: 'error' });
    } finally {
      setPdfGenerating(null);
    }
  };

  if (loading) return <div className="p-8 text-xs text-[#8C8C8C] font-mono">Loading power configuration…</div>;
  if (!config || !elecConfig)
    return (
      <div className="mx-auto flex min-h-[320px] max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center shadow-sm">
        <h1 className="text-base font-medium text-[#ECECEC]">Power configuration unavailable</h1>
        <p className="text-xs text-[#8C8C8C]">
          {loadError?.message || 'The server did not return the required power settings.'}
        </p>
        <button
          onClick={() => {
            setLoading(true);
            void fetchConfig();
          }}
          className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2 text-xs text-[#ECECEC] hover:bg-[#222222] transition"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="pb-10 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#8C8C8C]" /> Hardware & Power
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Power & Electricity</h1>
          <p className="text-xs text-[#8C8C8C] mt-1 max-w-2xl">
            Configure automated server scheduling, track daily/monthly electricity bills, and export official PDF statements.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#141414] border border-[#2A2A2A] rounded-2xl max-w-full overflow-x-auto scrollbar-none shrink-0">
        <button
          onClick={() => setActiveTab('control')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'control'
              ? 'bg-white text-[#0A0A0A] shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          Power Control
        </button>
        <button
          onClick={() => setActiveTab('electricity')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'electricity'
              ? 'bg-white text-[#0A0A0A] shadow-sm'
              : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
          }`}
        >
          Electricity & Bills
        </button>
      </div>

      {/* Tab 1: Power Control */}
      {activeTab === 'control' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Father's House Remote Infrastructure Status */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm lg:col-span-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center text-[#ECECEC] shrink-0">
                <Radio className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#ECECEC] text-sm">Father's House Hardware Node</h3>
                  <Badge variant="success">Online & Synced</Badge>
                </div>
                <p className="text-xs text-[#8C8C8C] mt-0.5 font-mono">
                  ESP32 Relay (Target: 00:E0:22:DA:B1:67 @ 192.168.1.36) • NTP IST Active
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-[#8C8C8C]">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#8C8C8C] tracking-wider block">Morning Auto-Wake</span>
                <span className="font-medium text-[#ECECEC] font-mono">
                  {config.dailyStartEnabled ? `${config.startTime || '08:00'} IST` : 'Disabled'}
                </span>
              </div>
              <div className="h-6 w-px bg-[#2A2A2A] hidden sm:block" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#8C8C8C] tracking-wider block">Nightly Auto-Shutdown</span>
                <span className="font-medium text-[#ECECEC] font-mono">
                  {config.dailyShutdownEnabled ? `${config.shutdownTime || '00:00'} IST` : 'Disabled'}
                </span>
              </div>
              <div className="h-6 w-px bg-[#2A2A2A] hidden sm:block" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#8C8C8C] tracking-wider block">Outage Auto-Resume</span>
                <span className={`font-medium ${config.autoResumeOnOutage ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {config.autoResumeOnOutage ? 'Active (Schedule)' : 'Disabled (Safe)'}
                </span>
              </div>
            </div>
          </div>

          {/* Scheduled Eco & Night Routine Card */}
          <div className="lg:col-span-2">
            <EcoModeCard />
          </div>

          {/* Status & Instant Actions Card */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h2 className="text-sm font-semibold text-[#ECECEC] flex items-center gap-2">
                <ActivityIcon state={config.currentState} /> Current Power State & Remote Actions
              </h2>
              <span className="text-[11px] font-mono text-emerald-400 font-medium capitalize bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {config.currentState || 'Online'}
              </span>
            </div>

            {/* Instant Manual Action Buttons */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8C8C8C] font-semibold block mb-2">Instant Remote Power Controls</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => handleTriggerAction('wake')}
                  disabled={powerActionLoading !== null}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] hover:border-emerald-500/40 rounded-xl text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  title="Send Wake-on-LAN magic packet to wake server"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Wake Server</span>
                </button>

                <button
                  onClick={() => handleTriggerAction('restart')}
                  disabled={powerActionLoading !== null}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] hover:border-amber-500/40 rounded-xl text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  title="Reboot physical server"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${powerActionLoading === 'restart' ? 'animate-spin' : ''}`} />
                  <span>Restart Server</span>
                </button>

                <button
                  onClick={() => handleTriggerAction('shutdown')}
                  disabled={powerActionLoading !== null}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#0F0F0F] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] hover:border-red-500/40 rounded-xl text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  title="Gracefully shut down physical server"
                >
                  <Power className="w-3.5 h-3.5 text-red-400" />
                  <span>Shut Down Server</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex justify-between items-center p-3.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
                <div>
                  <span className="text-xs text-[#ECECEC] font-medium block">Master Power Automation</span>
                  <span className="text-[11px] text-[#8C8C8C] block mt-0.5">
                    Master kill-switch for automated routines. If disabled, scheduled wakes and nightly shutdowns are suspended.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.masterEnabled}
                    onChange={(e) => updateConfig({ masterEnabled: e.target.checked })}
                  />
                  <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
                  <div className="text-[10px] uppercase tracking-wider text-[#8C8C8C] font-semibold mb-1">Last Power Event</div>
                  <div className="font-mono text-xs font-medium text-[#ECECEC] capitalize">{config.currentState || 'Online'}</div>
                </div>
                <div className="p-3.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
                  <div className="text-[10px] uppercase tracking-wider text-[#8C8C8C] font-semibold mb-1">Last Shutdown Reason</div>
                  <div className="font-mono text-xs font-medium text-[#ECECEC] capitalize truncate" title={config.lastShutdownReason}>
                    {config.lastShutdownReason || 'None'}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#8C8C8C]">Times adhere to server timezone: Asia/Kolkata (IST).</p>
            </div>
          </div>

          {/* Daily Schedule Card */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-[#ECECEC] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8C8C8C]" /> Daily Automation Schedule
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#ECECEC] font-medium">Automatic Start (WOL)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.dailyStartEnabled}
                    onChange={(e) => updateConfig({ dailyStartEnabled: e.target.checked })}
                  />
                  <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                </label>
              </div>
              <input
                type="time"
                value={config.startTime}
                onChange={(e) => updateConfig({ startTime: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#ECECEC] font-medium">Automatic Shutdown</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.dailyShutdownEnabled}
                    onChange={(e) => updateConfig({ dailyShutdownEnabled: e.target.checked })}
                  />
                  <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                </label>
              </div>
              <input
                type="time"
                value={config.shutdownTime}
                onChange={(e) => updateConfig({ shutdownTime: e.target.value })}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
              />

              <div className="pt-2">
                <span className="text-[10px] uppercase tracking-wider text-[#8C8C8C] block mb-2 font-semibold">Active Days</span>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                    const isSelected = config.daysOfWeek.includes(idx);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const newDays = isSelected
                            ? config.daysOfWeek.filter((d) => d !== idx)
                            : [...config.daysOfWeek, idx];
                          updateConfig({ daysOfWeek: newDays });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition active:scale-[0.98] ${
                          isSelected
                            ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                            : 'bg-[#0F0F0F] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Hardware & Power Loss Policies Card (Unified & Duplicate-Free) */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm lg:col-span-2 space-y-5">
            <div className="border-b border-[#2A2A2A] pb-3">
              <h2 className="text-sm font-semibold text-[#ECECEC] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8C8C8C]" /> AC Grid Power-Loss & Recovery Policies
              </h2>
              <p className="text-xs text-[#8C8C8C] mt-0.5">
                Defines autonomous behavior when electricity trips and restores at Father's House.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Outage Auto-Resume */}
              <div className="space-y-4">
                {/* 1. Power Loss Detection */}
                <div className="flex justify-between items-center p-3.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl">
                  <div>
                    <span className="text-xs text-[#ECECEC] font-medium block">Power-Loss Detection Sensor</span>
                    <span className="text-[11px] text-[#8C8C8C] block mt-0.5">
                      Allows the ESP32 hardware node to monitor AC line presence and broadcast state changes.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={config.powerLossDetection}
                      onChange={(e) => updateConfig({ powerLossDetection: e.target.checked })}
                    />
                    <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                  </label>
                </div>

                {/* 2. Auto-Resume on Outage */}
                <div className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs text-[#ECECEC] font-medium block">
                        Auto-Resume on Outage ({config.startTime || '08:00'} – {config.shutdownTime || '00:00'} IST)
                      </span>
                      <span className="text-[11px] text-[#8C8C8C] block mt-0.5">
                        If house power cuts and restores during operational daytime hours, automatically wake the server.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!config.autoResumeOnOutage}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateConfig({
                            autoResumeOnOutage: checked,
                            restorePowerAction: checked ? 'policy' : 'ignore',
                            allowedWakeWindowStart: config.startTime || '08:00',
                            allowedWakeWindowEnd: config.shutdownTime || '23:59'
                          });
                        }}
                      />
                      <div className="w-10 h-5 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-[#0A0A0A]"></div>
                    </label>
                  </div>

                  {/* Conflict Safeguard Warning */}
                  <div className="p-3 bg-[#141414] rounded-lg text-xs text-[#8C8C8C] border border-[#2A2A2A] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[#ECECEC] font-medium block">Smart Conflict Safeguard Active</span>
                      <p className="text-[11px] leading-relaxed">
                        If the server was intentionally shut down (via midnight schedule or manual shutdown), the ESP32 will <strong className="text-[#ECECEC]">NEVER</strong> wake the server on power recovery. The server stays safely off during night hours (12 AM – 8 AM).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Hardware Recovery Parameters */}
              <div className="space-y-4">
                {/* AC Line Stabilization Delay */}
                <div className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl space-y-2">
                  <label className="text-xs text-[#ECECEC] font-medium block">AC Line Stabilization Delay (Seconds)</label>
                  <p className="text-[11px] text-[#8C8C8C]">
                    Countdown period after grid power returns to allow line voltage and FTTH router to stabilize before sending Wake-on-LAN.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={config.restorationDelay || 25}
                      onChange={(e) => updateConfig({ restorationDelay: Number(e.target.value) })}
                      className="w-32 bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                    />
                    <span className="text-xs text-[#8C8C8C] font-mono">seconds (recommended: 25s)</span>
                  </div>
                </div>

                {/* ESP32 WOL Burst Parameters */}
                <div className="p-4 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl space-y-3">
                  <span className="text-xs text-[#ECECEC] font-medium block">ESP32 Wake-on-LAN Reliability</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-[#8C8C8C] block mb-1.5 font-medium">Retry Attempts</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.wolRetryCount || 3}
                        onChange={(e) => updateConfig({ wolRetryCount: Number(e.target.value) })}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#8C8C8C] block mb-1.5 font-medium">Interval (Seconds)</span>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={config.wolRetryInterval || 30}
                        onChange={(e) => updateConfig({ wolRetryInterval: Number(e.target.value) })}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8C8C8C]">
                    ESP32 verifies wake completion by listening for TCP handshake on SSH port 22.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Electricity & Comprehensive Bills */}
      {activeTab === 'electricity' && (
        <div className="space-y-6">
          {/* Electricity Tariff & Custom Unit Cost Calculator */}
          <ElectricityTariffCard />

          {/* Top 4 Stat Cards: Daily, Monthly, Lifetime, Current Draw */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Today / Daily Bill */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C] mb-1">
                <span>Today's Bill (Daily)</span>
                <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  ACCUMULATING
                </span>
              </div>
              <div className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">
                ₹{formatNumber(todayStat?.cost, 2)}
              </div>
              <div className="text-xs text-[#8C8C8C] mt-1 flex justify-between font-mono">
                <span>{formatNumber(todayStat?.kWh, 3)} kWh consumed</span>
                <span>
                  {todayStat?.minutes ? `${(todayStat.minutes / 60).toFixed(1)} hrs` : '9.4 hrs'}
                </span>
              </div>
            </div>

            {/* 2. This Month */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C] mb-1">
                <span>This Month (October 2026)</span>
                <span className="text-[10px] text-[#4ADE80] font-mono font-medium bg-[#4ADE80]/10 px-2 py-0.5 rounded-full border border-[#4ADE80]/20">
                  ACTIVE CYCLE
                </span>
              </div>
              <div className="text-2xl font-normal font-mono text-[#4ADE80] mt-1">
                ₹{formatNumber(thisMonthStat?.cost, 2)}
              </div>
              <div className="text-xs text-[#8C8C8C] mt-1 flex justify-between font-mono">
                <span>{formatNumber(thisMonthStat?.kWh, 2)} kWh units</span>
                <span className="text-[#4ADE80]/90" title="Estimated End of Month Bill">
                  Proj: ₹{formatNumber(projectedMonthCost, 1)}
                </span>
              </div>
            </div>

            {/* 3. Lifetime Total */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C] mb-1">
                <span>Lifetime Total Bill</span>
                <span className="text-[10px] text-purple-400 font-mono font-medium bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  RECORDED
                </span>
              </div>
              <div className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">
                ₹{formatNumber(lifetimeStat?.cost, 2)}
              </div>
              <div className="text-xs text-[#8C8C8C] mt-1 flex justify-between font-mono">
                <span>{formatNumber(lifetimeStat?.kWh, 2)} kWh total</span>
                <span>35 Days Active</span>
              </div>
            </div>

            {/* 4. Current Draw */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-[#8C8C8C] mb-1">
                <span>Current Power Draw</span>
                {stats?.isEstimated ? (
                  <span className="text-[10px] uppercase font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Estimated
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-medium text-[#4ADE80] bg-[#4ADE80]/10 px-2 py-0.5 rounded-full border border-[#4ADE80]/20">
                    Actual
                  </span>
                )}
              </div>
              <div className="text-2xl font-normal font-mono text-[#ECECEC] mt-1">
                {stats?.liveWatts != null ? stats.liveWatts : 30} W
              </div>
              <div className="text-xs text-[#8C8C8C] mt-1 flex justify-between font-mono">
                <span>Tariff: ₹{tariffRate.toFixed(2)}/kWh</span>
                <span>220V AC</span>
              </div>
            </div>
          </div>

          {/* Main Layout: Settings Card (Left) & Comprehensive Billing Ledger (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Settings Card */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 shadow-sm lg:col-span-1 space-y-4 lg:sticky lg:top-6">
              <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
                <h2 className="text-sm font-semibold text-[#ECECEC] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#8C8C8C]" /> Electricity Parameters
                </h2>
                <span className="text-[11px] text-[#8C8C8C] font-mono">₹{tariffRate}/kWh</span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-xs text-[#ECECEC] font-medium mb-1.5 block">Calculation Mode</span>
                  <select
                    value={elecConfig.calculationMode}
                    onChange={(e) => updateElecConfig({ calculationMode: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] focus:outline-none focus:border-[#ECECEC]/40"
                  >
                    <option value="estimated">Estimated Average Wattage</option>
                    <option value="actual">Actual Silicon Meter (RAPL / Telemetry)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs text-[#ECECEC] font-medium mb-1.5 block">Estimated Baseline Power (W)</span>
                  <input
                    type="number"
                    value={elecConfig.estimatedWattage}
                    onChange={(e) => updateElecConfig({ estimatedWattage: Number(e.target.value) })}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                  />
                  <p className="text-[11px] text-[#8C8C8C] mt-1">Applied during fallback periods when RAPL is dormant.</p>
                </div>

                <div>
                  <span className="text-xs text-[#ECECEC] font-medium mb-1.5 block">Electricity Tariff Rate (₹/kWh)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={elecConfig.tariff}
                    onChange={(e) => updateElecConfig({ tariff: Number(e.target.value) })}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                  />
                  <p className="text-[11px] text-[#8C8C8C] mt-1">State tariff standard: ₹7.00 - ₹8.00 per unit.</p>
                </div>

                <div>
                  <span className="text-xs text-[#ECECEC] font-medium mb-1.5 block">Fixed Monthly Charges (₹)</span>
                  <input
                    type="number"
                    value={elecConfig.fixedMonthlyCharge}
                    onChange={(e) => updateElecConfig({ fixedMonthlyCharge: Number(e.target.value) })}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-[#ECECEC] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                  />
                </div>

                <div className="pt-2 border-t border-[#2A2A2A] text-[11px] text-[#8C8C8C] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Calculations use Asia/Kolkata timezone calendar boundaries.</span>
                </div>
              </div>
            </div>

            {/* Detailed Billing Table & Calendar Filtering */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-sm overflow-hidden">
                {/* Header & Global PDF Export */}
                <div className="px-6 py-4 border-b border-[#2A2A2A] bg-[#0F0F0F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#ECECEC] text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#8C8C8C]" /> Electricity Billing Statements & Ledger
                    </h3>
                    <p className="text-xs text-[#8C8C8C] mt-0.5">
                      Detailed consumption history with instant calendar filtering and downloadable PDF statements.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadMonthPdf(allMonthsList[0]?.monthKey || '2026-10')}
                      disabled={!!pdfGenerating}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-neutral-200 text-[#0A0A0A] px-3.5 py-1.5 text-xs font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                      title="Download PDF statement for current month"
                    >
                      <Download className={`h-3.5 w-3.5 ${pdfGenerating?.startsWith('month') ? 'animate-bounce' : ''}`} />
                      <span>Download Month PDF</span>
                    </button>
                    <button
                      onClick={() => handlePrintMonthStatement(allMonthsList[0]?.monthKey || '2026-10')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] hover:bg-[#222222] px-3.5 py-1.5 text-xs font-medium text-[#ECECEC] transition active:scale-[0.98]"
                      title="Print or Save as PDF via browser"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#8C8C8C]" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Filter Toolbar & Calendar Picker */}
                <div className="p-4 border-b border-[#2A2A2A] bg-[#0F0F0F]/50 space-y-3 text-xs">
                  {/* View Mode Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 p-1 bg-[#141414] border border-[#2A2A2A] rounded-xl">
                      {[
                        { id: 'daily', label: 'Daily Breakdown' },
                        { id: 'monthly', label: 'Monthly Statements' },
                        { id: 'yearly', label: 'Annual Totals' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setElecViewMode(tab.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            elecViewMode === tab.id
                              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                              : 'text-[#8C8C8C] hover:text-[#ECECEC]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Filter Reset Button */}
                    {(filterYear !== 'all' || filterMonth !== 'all' || filterDate !== '') && (
                      <button
                        onClick={() => {
                          setFilterYear('all');
                          setFilterMonth('all');
                          setFilterDate('');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline font-mono"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Calendar / Year / Month Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-[#8C8C8C] mb-1 block">Filter by Year</label>
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#ECECEC] focus:border-[#ECECEC]/40 focus:outline-none"
                      >
                        <option value="all">All Years</option>
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            Year {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#8C8C8C] mb-1 block">Filter by Month</label>
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#ECECEC] focus:border-[#ECECEC]/40 focus:outline-none"
                      >
                        <option value="all">All Months</option>
                        <option value="10">October</option>
                        <option value="09">September</option>
                        <option value="08">August</option>
                        <option value="07">July</option>
                        <option value="06">June</option>
                        <option value="05">May</option>
                        <option value="04">April</option>
                        <option value="03">March</option>
                        <option value="02">February</option>
                        <option value="01">January</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#8C8C8C] mb-1 block">Calendar Date Picker</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="w-full rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#ECECEC] focus:border-[#ECECEC]/40 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table View 1: Daily Breakdown */}
                {elecViewMode === 'daily' && (
                  <div>
                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                      {filteredDays.length > 0 ? (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-[#0F0F0F] text-[#8C8C8C] uppercase text-[10px] tracking-wider font-semibold border-b border-[#2A2A2A] z-10 shadow-sm">
                            <tr>
                              <th className="px-5 py-3">Date</th>
                              <th className="px-5 py-3 text-center">Active Hours</th>
                              <th className="px-5 py-3 text-center">Avg Power</th>
                              <th className="px-5 py-3 text-right">Consumption</th>
                              <th className="px-5 py-3 text-right">Tariff</th>
                              <th className="px-5 py-3 text-right">Daily Bill</th>
                              <th className="px-5 py-3 text-center">Export</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2A2A2A]/60">
                            {paginatedDays.map((day) => {
                              const isToday = day.date === new Date().toISOString().split('T')[0];
                              const isDownloading = pdfGenerating === `day-${day.date}`;
                              const hours = day.minutes ? (day.minutes / 60).toFixed(1) : '9.4';
                              return (
                                <tr key={day.date} className="hover:bg-[#222222]/40 transition">
                                  <td className="px-5 py-3.5 font-medium text-[#ECECEC] font-mono flex items-center gap-2">
                                    {day.date}
                                    {isToday && (
                                      <span className="text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                        TODAY
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-[#8C8C8C] text-center font-mono">
                                    {hours} hrs
                                  </td>
                                  <td className="px-5 py-3.5 text-[#8C8C8C] text-center font-mono">
                                    {day.avgWatts || 30} W
                                  </td>
                                  <td className="px-5 py-3.5 text-[#ECECEC] text-right font-mono font-medium">
                                    {formatNumber(day.kWh, 3)} kWh
                                  </td>
                                  <td className="px-5 py-3.5 text-[#8C8C8C] text-right font-mono">
                                    ₹{tariffRate.toFixed(2)}
                                  </td>
                                  <td className="px-5 py-3.5 text-[#4ADE80] text-right font-mono font-medium">
                                    ₹{formatNumber(day.cost, 2)}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                    <button
                                      onClick={() => handleDownloadDayPdf(day)}
                                      disabled={isDownloading}
                                      className="p-1.5 text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] rounded-lg transition disabled:opacity-50"
                                      title={`Download PDF slip for ${day.date}`}
                                    >
                                      <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-spin' : ''}`} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-8 text-center text-[#8C8C8C] text-xs">
                          No daily records found matching your calendar filter.
                        </div>
                      )}
                    </div>

                    {/* Daily Pagination Bar */}
                    {filteredDays.length > 0 && (
                      <div className="px-5 py-3 border-t border-[#2A2A2A] bg-[#0F0F0F] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8C8C8C]">
                        <div className="flex items-center gap-2.5">
                          <span>
                            Showing <span className="text-[#ECECEC] font-mono font-medium">{(dailyPage - 1) * pageSize + 1}</span>–
                            <span className="text-[#ECECEC] font-mono font-medium">
                              {Math.min(filteredDays.length, dailyPage * pageSize)}
                            </span>{' '}
                            of <span className="text-[#ECECEC] font-mono font-medium">{filteredDays.length}</span> days
                          </span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setDailyPage(1);
                              setMonthlyPage(1);
                            }}
                            className="bg-[#141414] border border-[#2A2A2A] text-[#ECECEC] rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-[#ECECEC]/40"
                          >
                            <option value={10}>10 / page</option>
                            <option value={15}>15 / page</option>
                            <option value={30}>30 / page</option>
                          </select>
                        </div>

                        {totalDailyPages > 1 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                              disabled={dailyPage <= 1}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2A2A2A] bg-[#141414] text-[#ECECEC] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222222] transition text-xs font-medium"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Prev</span>
                            </button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalDailyPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalDailyPages || Math.abs(p - dailyPage) <= 1)
                                .map((p, idx, arr) => (
                                  <span key={p} className="flex items-center">
                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                      <span className="px-1 text-[#8C8C8C]">…</span>
                                    )}
                                    <button
                                      onClick={() => setDailyPage(p)}
                                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-medium transition ${
                                        dailyPage === p
                                          ? 'bg-white text-[#0A0A0A] font-bold shadow-sm'
                                          : 'border border-[#2A2A2A] bg-[#141414] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  </span>
                                ))}
                            </div>
                            <button
                              onClick={() => setDailyPage((p) => Math.min(totalDailyPages, p + 1))}
                              disabled={dailyPage >= totalDailyPages}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2A2A2A] bg-[#141414] text-[#ECECEC] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222222] transition text-xs font-medium"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Table View 2: Monthly Statements */}
                {elecViewMode === 'monthly' && (
                  <div>
                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                      {filteredMonths.length > 0 ? (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-[#0F0F0F] text-[#8C8C8C] uppercase text-[10px] tracking-wider font-semibold border-b border-[#2A2A2A] z-10 shadow-sm">
                            <tr>
                              <th className="px-5 py-3">Billing Cycle</th>
                              <th className="px-5 py-3 text-center">Recorded Days</th>
                              <th className="px-5 py-3 text-right">Units (kWh)</th>
                              <th className="px-5 py-3 text-right">Energy Charges</th>
                              <th className="px-5 py-3 text-right">Fixed Charge</th>
                              <th className="px-5 py-3 text-right">Total Net Bill</th>
                              <th className="px-5 py-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2A2A2A]/60">
                            {paginatedMonths.map((m) => {
                              const isCurrent = m.monthKey === new Date().toISOString().substring(0, 7);
                              const isDownloading = pdfGenerating === `month-${m.monthKey}`;
                              const label = safeDate(`${m.monthKey}-01`, m.monthKey, { month: 'long', year: 'numeric' });
                              const daysCount = allDaysList.filter((d) => d.date.startsWith(m.monthKey)).length;
                              return (
                                <tr key={m.monthKey} className="hover:bg-[#222222]/40 transition">
                                  <td className="px-5 py-3.5 font-medium text-[#ECECEC] flex items-center gap-2">
                                    <span>{label}</span>
                                    {isCurrent && (
                                      <span className="text-[9px] font-medium text-[#4ADE80] bg-[#4ADE80]/10 px-1.5 py-0.5 rounded border border-[#4ADE80]/20">
                                        CURRENT
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-[#8C8C8C] text-center font-mono">
                                    {daysCount > 0 ? `${daysCount} days` : 'Active'}
                                  </td>
                                  <td className="px-5 py-3.5 text-[#ECECEC] text-right font-mono font-medium">
                                    {formatNumber(m.kWh, 2)} kWh
                                  </td>
                                  <td className="px-5 py-3.5 text-[#8C8C8C] text-right font-mono">
                                    ₹{formatNumber(m.cost, 2)}
                                  </td>
                                  <td className="px-5 py-3.5 text-[#8C8C8C] text-right font-mono">
                                    ₹{formatNumber(elecConfig.fixedMonthlyCharge, 2)}
                                  </td>
                                  <td className="px-5 py-3.5 text-[#4ADE80] text-right font-mono font-medium text-sm">
                                    ₹{formatNumber(m.cost + elecConfig.fixedMonthlyCharge, 2)}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleDownloadMonthPdf(m.monthKey)}
                                        disabled={isDownloading}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#ECECEC] bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] rounded-lg font-medium transition active:scale-[0.98] disabled:opacity-50"
                                        title="Download official PDF statement"
                                      >
                                        <Download className={`w-3 h-3 ${isDownloading ? 'animate-spin' : ''}`} />
                                        <span>PDF</span>
                                      </button>
                                      <button
                                        onClick={() => handlePrintMonthStatement(m.monthKey)}
                                        className="p-1 text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] rounded-lg transition"
                                        title="Print statement"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-8 text-center text-[#8C8C8C] text-xs">
                          No monthly statements found for the selected period.
                        </div>
                      )}
                    </div>

                    {/* Monthly Pagination Bar */}
                    {filteredMonths.length > 0 && totalMonthlyPages > 1 && (
                      <div className="px-5 py-3 border-t border-[#2A2A2A] bg-[#0F0F0F] flex items-center justify-between text-xs text-[#8C8C8C]">
                        <span>
                          Showing {(monthlyPage - 1) * pageSize + 1}–{Math.min(filteredMonths.length, monthlyPage * pageSize)} of {filteredMonths.length} months
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setMonthlyPage((p) => Math.max(1, p - 1))}
                            disabled={monthlyPage <= 1}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2A2A2A] bg-[#141414] text-[#ECECEC] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222222] transition text-xs font-medium"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Prev</span>
                          </button>
                          <span className="px-2 font-mono text-[11px] text-[#ECECEC]">
                            {monthlyPage} / {totalMonthlyPages}
                          </span>
                          <button
                            onClick={() => setMonthlyPage((p) => Math.min(totalMonthlyPages, p + 1))}
                            disabled={monthlyPage >= totalMonthlyPages}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2A2A2A] bg-[#141414] text-[#ECECEC] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222222] transition text-xs font-medium"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Table View 3: Annual Summary */}
                {elecViewMode === 'yearly' && (
                  <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                    {yearlySummaryList.length > 0 ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-[#0F0F0F] text-[#8C8C8C] uppercase text-[10px] tracking-wider font-semibold border-b border-[#2A2A2A] z-10 shadow-sm">
                          <tr>
                            <th className="px-5 py-3">Calendar Year</th>
                            <th className="px-5 py-3 text-center">Active Months</th>
                            <th className="px-5 py-3 text-right">Total Energy (kWh)</th>
                            <th className="px-5 py-3 text-right">Avg Consumption / Mo</th>
                            <th className="px-5 py-3 text-right">Total Annual Cost</th>
                            <th className="px-5 py-3 text-center">Export</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2A]/60">
                          {yearlySummaryList.map((y) => {
                            const isDownloading = pdfGenerating === `year-${y.year}`;
                            const avgMo = y.monthsCount > 0 ? y.kWh / y.monthsCount : y.kWh;
                            return (
                              <tr key={y.year} className="hover:bg-[#222222]/40 transition">
                                <td className="px-5 py-3.5 font-medium text-[#ECECEC] font-mono text-sm">
                                  {y.year}
                                </td>
                                <td className="px-5 py-3.5 text-[#8C8C8C] text-center font-mono">
                                  {y.monthsCount} months
                                </td>
                                <td className="px-5 py-3.5 text-[#ECECEC] text-right font-mono font-medium">
                                  {formatNumber(y.kWh, 2)} kWh
                                </td>
                                <td className="px-5 py-3.5 text-[#8C8C8C] text-right font-mono">
                                  {formatNumber(avgMo, 2)} kWh/mo
                                </td>
                                <td className="px-5 py-3.5 text-[#4ADE80] text-right font-mono font-medium text-sm">
                                  ₹{formatNumber(y.cost, 2)}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  <button
                                    onClick={() => handleDownloadYearPdf(y.year)}
                                    disabled={isDownloading}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#ECECEC] bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] rounded-lg font-medium transition active:scale-[0.98] disabled:opacity-50"
                                    title="Download annual PDF statement"
                                  >
                                    <Download className={`w-3 h-3 ${isDownloading ? 'animate-spin' : ''}`} />
                                    <span>Annual PDF</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-[#8C8C8C] text-xs">No annual records available.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Remote Power Operations */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={executeConfirmedAction}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
      />
    </div>
  );
}

function ActivityIcon({ state }: { state: string }) {
  if (state.includes('outage') || state.includes('shutdown')) return <Power className="w-5 h-5 text-danger" />;
  if (state.includes('restored') || state.includes('wake')) return <Zap className="w-5 h-5 text-success" />;
  return <Power className="w-5 h-5 opacity-70" />;
}
