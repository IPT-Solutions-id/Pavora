import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Lock,
  LogOut,
  Menu,
  Plus,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { PevoraLogo } from '../PevoraLogo';
import { NotificationBellMenu } from '../shared/NotificationBellMenu';
import { SlipGajiModal } from './SlipGajiModal';
import type { MasterAdminUser } from '../../utils/validation';
import type { WorkspaceStore } from '../../hooks/useWorkspaceStore';
import {
  type ExcelImportMode,
  type ExcelImportPreviewResult,
  type PayrollSlipRecord,
  type PayrollTariffConfig,
  type RegionalWageTier,
  buildPayrollRecapWorkbookBytes,
  buildPayrollTemplateWorkbookBytes,
  calculatePkwtCompensationAmount,
  computePayrollHeadcountSummary,
  formatPayrollPeriodLabel,
  parseAndValidatePayrollExcel,
  resolveEmployeeBaseSalary,
} from '../../utils/payrollCalculator';
import { formatRupiahDot } from '../../utils/pkwtDocument';
import {
  generateSlipGajiPdfBytes,
  loadSlipGajiBrowserAssets,
} from '../../utils/slipGajiPdfGenerator';
import { formatIndonesianDate } from '../../data/masterAdminData';

type PayrollMenuId = 'pay-run' | 'pay-excel' | 'pay-comp' | 'pay-tariffs';

interface PayrollDashboardProps {
  user: MasterAdminUser;
  store: WorkspaceStore;
  onLogout: () => void;
}

const PAYROLL_MENU_ITEMS: Array<{
  id: PayrollMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'pay-run', label: 'Hitung Gaji & Slip', icon: Calculator },
  { id: 'pay-excel', label: 'Impor & Ekspor Excel', icon: FileSpreadsheet },
  { id: 'pay-comp', label: 'Kompensasi PKWT', icon: Wallet },
  { id: 'pay-tariffs', label: 'Master UMR & Tarif', icon: SlidersHorizontal },
];

const PERIOD_OPTIONS = [
  { value: '2026-11', label: 'November 2026 (Periode Berjalan)' },
  { value: '2026-12', label: 'Desember 2026' },
  { value: '2026-10', label: 'Oktober 2026 (Arsip)' },
];

export const PayrollDashboard: React.FC<PayrollDashboardProps> = ({
  user,
  store,
  onLogout,
}) => {
  const [activeMenu, setActiveMenu] = useState<PayrollMenuId>('pay-run');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('2026-11');
  const [entityFilter, setEntityFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Slip preview & edit modals
  const [previewSlip, setPreviewSlip] = useState<PayrollSlipRecord | null>(null);
  const [editingSlip, setEditingSlip] = useState<PayrollSlipRecord | null>(null);
  const [editForm, setEditForm] = useState({
    baseSalaryOverride: '',
    prorataDaysOverride: '',
    fixedAllowance: '0',
    variableAllowance: '0',
    overtimePay: '0',
    incentiveBonus: '0',
    pkwtCompensation: '0',
    otherCompensation: '0',
    loanKasbonDeduction: '0',
    otherDeduction: '0',
    notes: '',
  });

  // Excel import state
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const [excelMode, setExcelMode] = useState<ExcelImportMode>('variable-merge');
  const [excelPreview, setExcelPreview] = useState<ExcelImportPreviewResult | null>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);

  // Tariff editor draft
  const [tariffDraft, setTariffDraft] = useState<PayrollTariffConfig>(() => store.payrollTariffs);
  const [newTierName, setNewTierName] = useState('');
  const [newTierKeywords, setNewTierKeywords] = useState('');
  const [newTierUmr, setNewTierUmr] = useState('');

  const actorLabel = `${user.name} (${user.id})`;
  const activeMenuItem =
    PAYROLL_MENU_ITEMS.find((m) => m.id === activeMenu) ?? PAYROLL_MENU_ITEMS[0];

  const scopedEntities = useMemo(() => {
    if (!user.assignedScopes || user.assignedScopes.length === 0) return store.entities;
    return store.entities.filter((e) => user.assignedScopes.includes(e.name));
  }, [store.entities, user.assignedScopes]);

  const scopedAllEmployees = useMemo(() => {
    const allowedNames = new Set(scopedEntities.map((e) => e.name));
    return store.employees.filter((emp) => allowedNames.has(emp.entityName));
  }, [store.employees, scopedEntities]);

  const entityScopedEmployees = useMemo(() => {
    return scopedAllEmployees.filter(
      (emp) => entityFilter === 'Semua' || emp.entityName === entityFilter
    );
  }, [scopedAllEmployees, entityFilter]);

  const scopedEmployees = useMemo(() => {
    return scopedAllEmployees.filter((emp) => emp.status !== 'Nonaktif');
  }, [scopedAllEmployees]);

  const periodRun = useMemo(
    () => store.payrollRuns.find((r) => r.period === selectedPeriod),
    [store.payrollRuns, selectedPeriod]
  );
  const isPeriodLocked = Boolean(periodRun?.locked || periodRun?.status === 'Disetujui');

  const entityScopedSlips = useMemo(() => {
    return store.payrollSlips.filter((s) => {
      if (s.period !== selectedPeriod) return false;
      return entityFilter === 'Semua' || s.entityName === entityFilter;
    });
  }, [store.payrollSlips, selectedPeriod, entityFilter]);

  const periodSlips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entityScopedSlips.filter((s) => {
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        s.entityName.toLowerCase().includes(q)
      );
    });
  }, [entityScopedSlips, searchQuery]);

  const headcountSummary = useMemo(
    () =>
      computePayrollHeadcountSummary({
        period: selectedPeriod,
        employees: entityScopedEmployees,
        entities: store.entities,
        tariffs: store.payrollTariffs,
        periodSlips: entityScopedSlips,
        settledResignEmployeeIds: store.settledResignEmployeeIds,
      }),
    [
      selectedPeriod,
      entityScopedEmployees,
      store.entities,
      store.payrollTariffs,
      entityScopedSlips,
      store.settledResignEmployeeIds,
    ]
  );

  const periodTotals = useMemo(() => {
    return periodSlips.reduce(
      (acc, s) => ({
        gross: acc.gross + s.grossIncome,
        bpjs: acc.bpjs + s.bpjsKesEmployee + s.bpjsTkJhtEmployee + s.bpjsTkJpEmployee,
        pph21: acc.pph21 + s.pph21Employee,
        compensation: acc.compensation + s.pkwtCompensation + s.otherCompensation,
        deductions: acc.deductions + s.totalDeductions,
        thp: acc.thp + s.takeHomePay,
        companyCost: acc.companyCost + s.totalCompanyCost,
        warnings: acc.warnings + (s.belowUmrWarning || s.excelBaseMismatchWarning ? 1 : 0),
      }),
      {
        gross: 0,
        bpjs: 0,
        pph21: 0,
        compensation: 0,
        deductions: 0,
        thp: 0,
        companyCost: 0,
        warnings: 0,
      }
    );
  }, [periodSlips]);

  const payrollNotifications = useMemo(
    () =>
      store.notifications.filter(
        (n) => n.recipientRole === 'payroll' || n.type === 'pkwt-expiring'
      ),
    [store.notifications]
  );

  const pkwtCompensationCandidates = useMemo(() => {
    return scopedEmployees
      .filter((e) => e.contractType === 'PKWT')
      .map((emp) => {
        const baseInfo = resolveEmployeeBaseSalary(
          emp,
          store.entities,
          store.payrollTariffs.regionalTiers
        );
        const comp = calculatePkwtCompensationAmount(emp, baseInfo.baseSalary, 0);
        const alreadyClaimed = store.claimedPkwtCompensationNumbers.includes(emp.contractNumber);
        const inCurrentDraft = periodSlips.some(
          (s) => s.employeeId === emp.id && s.pkwtCompensation > 0
        );
        return {
          emp,
          baseInfo,
          comp,
          alreadyClaimed,
          inCurrentDraft,
        };
      });
  }, [scopedEmployees, store.entities, store.payrollTariffs.regionalTiers, store.claimedPkwtCompensationNumbers, periodSlips]);

  const selectMenu = (id: PayrollMenuId) => {
    setActiveMenu(id);
    setMobileSidebarOpen(false);
  };

  const triggerDownloadBytes = (bytes: Uint8Array, filename: string, mimeType: string) => {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleAutoCalculate = () => {
    const targetIds = entityScopedEmployees.map((e) => e.id);
    const res = store.runPayrollCalculation(selectedPeriod, targetIds, actorLabel);
    setFeedback({ ok: res.ok, text: res.message });
  };

  const handleCalculateResignSettlement = (employeeId: string) => {
    const res = store.runResignFinalSettlement(selectedPeriod, employeeId, actorLabel);
    setFeedback({ ok: res.ok, text: res.message });
  };

  const handleSubmitApproval = () => {
    const res = store.submitPayrollRunForApproval(selectedPeriod, actorLabel);
    setFeedback({ ok: res.ok, text: res.message });
  };

  const handleDownloadTemplate = () => {
    const bytes = buildPayrollTemplateWorkbookBytes({
      period: selectedPeriod,
      employees: entityScopedEmployees,
      entities: store.entities,
      tariffs: store.payrollTariffs,
      settledResignEmployeeIds: store.settledResignEmployeeIds,
    });
    triggerDownloadBytes(
      bytes,
      `Template_Payroll_PEVORA_${selectedPeriod}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    setFeedback({
      ok: true,
      text: `Template Excel (${headcountSummary.totalPayableThisPeriod} karyawan wajib gaji + resign unsettled) berhasil diunduh.`,
    });
  };

  const handleDownloadRecapExcel = () => {
    if (periodSlips.length === 0) {
      setFeedback({
        ok: false,
        text: 'Belum ada slip gaji di periode ini untuk diekspor ke Excel.',
      });
      return;
    }
    const bytes = buildPayrollRecapWorkbookBytes(
      periodSlips,
      formatPayrollPeriodLabel(selectedPeriod)
    );
    triggerDownloadBytes(
      bytes,
      `Rekap_Payroll_Transfer_${selectedPeriod}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    setFeedback({
      ok: true,
      text: `Rekap Payroll & Daftar Transfer Bank (${periodSlips.length} karyawan) berhasil diunduh.`,
    });
  };

  const handleDownloadBatchPdf = async () => {
    if (periodSlips.length === 0) {
      setFeedback({ ok: false, text: 'Belum ada slip gaji di periode ini untuk diunduh.' });
      return;
    }
    setBatchDownloading(true);
    try {
      const assets = await loadSlipGajiBrowserAssets();
      const bytes = await generateSlipGajiPdfBytes(periodSlips, store.settings, assets);
      triggerDownloadBytes(
        bytes,
        `Bundel_Slip_Gaji_${selectedPeriod}.pdf`,
        'application/pdf'
      );
      setFeedback({
        ok: true,
        text: `Bundel PDF (${periodSlips.length} Slip Gaji ${formatPayrollPeriodLabel(selectedPeriod)}) berhasil diunduh.`,
      });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Gagal membuat bundel PDF Slip Gaji.',
      });
    } finally {
      setBatchDownloading(false);
    }
  };

  const handleExcelUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const preview = parseAndValidatePayrollExcel({
        fileBytes: buf,
        fileName: file.name,
        period: selectedPeriod,
        mode: excelMode,
        employees: scopedAllEmployees,
        entities: store.entities,
        tariffs: store.payrollTariffs,
        attendanceLogs: store.attendanceLogs,
        leaveAbsences: store.leaveAbsences,
        settledResignEmployeeIds: store.settledResignEmployeeIds,
      });
      setExcelPreview(preview);
      setFeedback({
        ok: preview.duplicateCount === 0 && preview.errorCount === 0,
        text: `File "${file.name}" dipindai: ${preview.validCount + preview.warningCount} baris siap diterapkan, ${preview.duplicateCount} duplikat NIK diblokir, ${preview.errorCount} error.`,
      });
    } catch {
      setFeedback({
        ok: false,
        text: 'File Excel/CSV tidak dapat dibaca. Pastikan memakai Template Excel PEVORA (.xlsx / .csv).',
      });
    }
  };

  const handleApplyExcelImport = () => {
    if (!excelPreview) return;
    const readySlips = excelPreview.rows
      .filter((r) => (r.status === 'valid' || r.status === 'warning') && r.slip)
      .map((r) => r.slip as PayrollSlipRecord);
    if (readySlips.length === 0) {
      setFeedback({ ok: false, text: 'Tidak ada baris valid untuk diterapkan.' });
      return;
    }
    const res = store.applyExcelPayrollImport(
      selectedPeriod,
      readySlips,
      excelPreview.fileName,
      actorLabel
    );
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setExcelPreview(null);
      setActiveMenu('pay-run');
    }
  };

  const openEditSlip = (slip: PayrollSlipRecord) => {
    setEditingSlip(slip);
    setEditForm({
      baseSalaryOverride: String(slip.baseSalary),
      prorataDaysOverride:
        typeof slip.prorataActiveDays === 'number' ? String(slip.prorataActiveDays) : '',
      fixedAllowance: String(slip.fixedAllowance),
      variableAllowance: String(slip.variableAllowance),
      overtimePay: String(slip.overtimePay),
      incentiveBonus: String(slip.incentiveBonus),
      pkwtCompensation: String(slip.pkwtCompensation),
      otherCompensation: String(slip.otherCompensation),
      loanKasbonDeduction: String(slip.loanKasbonDeduction),
      otherDeduction: String(slip.otherDeduction),
      notes: slip.notes ?? '',
    });
  };

  const handleSaveSlipEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlip) return;
    const isResignSlip = editingSlip.settlementType === 'Final Settlement (Resign)';
    const initialProrataStr =
      typeof editingSlip.prorataActiveDays === 'number'
        ? String(editingSlip.prorataActiveDays)
        : '';
    const prorataChanged = isResignSlip && editForm.prorataDaysOverride !== initialProrataStr;
    const res = store.updateSinglePayrollSlip(
      selectedPeriod,
      editingSlip.employeeId,
      {
        baseSalaryOverride: prorataChanged
          ? undefined
          : Number(editForm.baseSalaryOverride) || 0,
        prorataDaysOverride: prorataChanged
          ? Math.max(0, Number(editForm.prorataDaysOverride) || 0)
          : undefined,
        fixedAllowance: Number(editForm.fixedAllowance) || 0,
        variableAllowance: Number(editForm.variableAllowance) || 0,
        overtimePay: Number(editForm.overtimePay) || 0,
        incentiveBonus: Number(editForm.incentiveBonus) || 0,
        pkwtCompensation: Number(editForm.pkwtCompensation) || 0,
        otherCompensation: Number(editForm.otherCompensation) || 0,
        loanKasbonDeduction: Number(editForm.loanKasbonDeduction) || 0,
        otherDeduction: Number(editForm.otherDeduction) || 0,
        notes: editForm.notes.trim() || undefined,
        pkwtContractClaimedNumber: editingSlip.pkwtContractClaimedNumber,
      },
      actorLabel
    );
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) setEditingSlip(null);
  };

  const handleInjectPkwtComp = (
    empId: string,
    contractNumber: string,
    amount: number,
    empName: string
  ) => {
    const existing = periodSlips.find((s) => s.employeeId === empId);
    const res = store.updateSinglePayrollSlip(
      selectedPeriod,
      empId,
      {
        baseSalaryOverride: existing?.baseSalary,
        fixedAllowance: existing?.fixedAllowance ?? 0,
        variableAllowance: existing?.variableAllowance ?? 0,
        overtimePay: existing?.overtimePay ?? 0,
        incentiveBonus: existing?.incentiveBonus ?? 0,
        pkwtCompensation: amount,
        otherCompensation: existing?.otherCompensation ?? 0,
        loanKasbonDeduction: existing?.loanKasbonDeduction ?? 0,
        otherDeduction: existing?.otherDeduction ?? 0,
        pkwtContractClaimedNumber: contractNumber,
        notes: `Kompensasi PKWT ${contractNumber} (PP 35/2021)`,
      },
      actorLabel
    );
    setFeedback({
      ok: res.ok,
      text: res.ok
        ? `Kompensasi PKWT ${empName} (${formatRupiahDot(amount)}) masuk ke draft ${formatPayrollPeriodLabel(selectedPeriod)}.`
        : res.message,
    });
  };

  const handleSaveTariffs = (e: React.FormEvent) => {
    e.preventDefault();
    store.savePayrollTariffs(tariffDraft, actorLabel);
    setFeedback({
      ok: true,
      text: 'Master Tarif UMR Regional, BPJS, PPh 21 & Alpha berhasil disimpan.',
    });
  };

  const handleAddRegionalTier = () => {
    const cleanName = newTierName.trim();
    const umr = Math.max(0, Math.round(Number(newTierUmr) || 0));
    if (!cleanName || umr <= 0) {
      setFeedback({ ok: false, text: 'Isi nama wilayah UMR dan nominal upah minimal > 0.' });
      return;
    }
    const newTier: RegionalWageTier = {
      id: `umr-${Date.now()}`,
      name: cleanName,
      areaKeywords: newTierKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
      umrMonthly: umr,
    };
    const nextConfig: PayrollTariffConfig = {
      ...tariffDraft,
      regionalTiers: [...tariffDraft.regionalTiers, newTier],
    };
    setTariffDraft(nextConfig);
    store.savePayrollTariffs(nextConfig, actorLabel);
    setNewTierName('');
    setNewTierKeywords('');
    setNewTierUmr('');
    setFeedback({ ok: true, text: `Tier UMR "${cleanName}" berhasil ditambahkan.` });
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-[#102B69] text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/15 shrink-0">
        <PevoraLogo variant="light" />
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Tutup menu payroll"
          className="lg:hidden p-1.5 rounded-[4px] text-[#EAF2FF] hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-white/15 space-y-1">
        <p className="text-[11px] font-semibold text-[#EAF2FF]/70">Konsol Payroll PEVORA</p>
        <p className="text-sm font-bold text-white truncate">{user.name}</p>
        <p className="text-[11px] text-[#EAF2FF]/80 truncate">
          {scopedEntities.length} Unit / Klien Tercakup
        </p>
      </div>

      <nav aria-label="Menu Portal Payroll" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {PAYROLL_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectMenu(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-[4px] transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-[#1468E8] text-white font-semibold'
                  : 'text-[#EAF2FF]/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'pay-run' && periodSlips.length > 0 && (
                <span className="text-[11px] font-bold text-[#EAF2FF] tabular-nums shrink-0">
                  {periodSlips.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/15 shrink-0 space-y-3">
        <div className="px-2">
          <p className="text-xs font-semibold text-white truncate">{user.email || user.id}</p>
          <p className="text-[11px] text-[#EAF2FF]/75 truncate">Role: Payroll</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-[4px] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F7FA] text-[#172033]">
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {renderSidebar()}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#172033]/50"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-[260px] max-w-[82vw] h-full z-10">{renderSidebar()}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu payroll"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] truncate">
                Portal Payroll PEVORA /{' '}
                <span className="font-semibold text-[#102B69]">{activeMenuItem.label}</span>
              </p>
              <h1 className="text-base sm:text-lg font-bold text-[#102B69] truncate">
                {activeMenuItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NotificationBellMenu
              notifications={payrollNotifications}
              onSelectNotification={(notif) => {
                store.markNotificationRead(notif.id);
                if (notif.type === 'pkwt-expiring') {
                  selectMenu('pay-comp');
                } else {
                  selectMenu('pay-run');
                }
              }}
              onMarkAllRead={store.markAllNotificationsRead}
            />
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-[#102B69]">{user.name}</p>
              <p className="text-[11px] text-[#64748B]">Payroll Specialist</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto space-y-6">
          {/* Period & Scope Controls */}
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label htmlFor="payroll-period-select" className="sr-only">
                  Periode Payroll
                </label>
                <select
                  id="payroll-period-select"
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setExcelPreview(null);
                  }}
                  className="px-3 py-2 text-xs font-bold text-[#102B69] bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="payroll-entity-filter" className="sr-only">
                  Filter Unit atau Klien
                </label>
                <select
                  id="payroll-entity-filter"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-[4px]"
                >
                  <option value="Semua">Semua Unit &amp; Klien ({scopedEntities.length})</option>
                  {scopedEntities.map((ent) => (
                    <option key={ent.id} value={ent.name}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span
                data-testid="payroll-period-status"
                className={`inline-flex items-center gap-1.5 font-bold ${
                  periodRun?.status === 'Disetujui'
                    ? 'text-[#16A36A]'
                    : periodRun?.status === 'Menunggu ACC'
                      ? 'text-[#B87D00]'
                      : periodRun?.status === 'Ditolak'
                        ? 'text-[#DC3545]'
                        : 'text-[#1468E8]'
                }`}
              >
                {isPeriodLocked ? (
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>
                  Status Periode: {periodRun?.status ?? 'Draft'}
                  {isPeriodLocked ? ' · Terkunci (Anti-Double)' : ''}
                </span>
              </span>
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              data-testid="payroll-feedback-banner"
              className={`p-3.5 rounded-[4px] border text-xs font-semibold flex items-center justify-between gap-3 ${
                feedback.ok
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="underline text-[11px] shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* TAB 1: HITUNG GAJI & SLIP */}
          {activeMenu === 'pay-run' && (
            <div className="space-y-6">
              {/* Headcount Visibility Strip */}
              <section
                aria-label="Ringkasan Jumlah & Status Karyawan Payroll"
                data-testid="payroll-headcount-summary"
                className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden"
              >
                <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#102B69]">
                    Ringkasan Jumlah Karyawan ({entityFilter === 'Semua' ? 'Semua Unit & Klien' : entityFilter})
                  </span>
                  <span className="font-semibold text-[#1468E8] tabular-nums">
                    Terhitung Periode Ini: {headcountSummary.calculatedSlipCount} /{' '}
                    {headcountSummary.totalPayableThisPeriod} Karyawan Wajib Gaji
                    {headcountSummary.uncalculatedEligibleCount > 0
                      ? ` · ${headcountSummary.uncalculatedEligibleCount} Belum Dihitung`
                      : ' · Lengkap'}
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]">
                  <div className="p-4">
                    <p className="text-[11px] font-semibold text-[#64748B]">Total Terdata</p>
                    <p className="text-lg font-extrabold text-[#102B69] tabular-nums mt-0.5">
                      {headcountSummary.totalScoped} Orang
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                      Wajib digaji periode ini: {headcountSummary.totalPayableThisPeriod} org
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-semibold text-[#64748B]">Aktif &amp; Probation (Rutin)</p>
                    <p className="text-lg font-extrabold text-[#16A36A] tabular-nums mt-0.5">
                      {headcountSummary.activeRegularCount} Orang
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                      {headcountSummary.activeCount} Aktif · {headcountSummary.probationCount} Probation
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-semibold text-[#64748B]">Karyawan Resign</p>
                    <p
                      className={`text-lg font-extrabold tabular-nums mt-0.5 ${
                        headcountSummary.resignPendingSettlementCount > 0
                          ? 'text-[#B87D00]'
                          : 'text-[#102B69]'
                      }`}
                    >
                      {headcountSummary.resignTotalCount} Orang
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                      {headcountSummary.resignPendingSettlementCount} perlu Final Settlement ·{' '}
                      {headcountSummary.resignSettledCount} lunas
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-semibold text-[#64748B]">Nonaktif (Dikecualikan)</p>
                    <p className="text-lg font-extrabold text-[#DC3545] tabular-nums mt-0.5">
                      {headcountSummary.nonaktifCount} Orang
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Tidak masuk hitungan gaji &amp; login diblokir
                    </p>
                  </div>
                </div>
              </section>

              {/* KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Total Take Home Pay (THP)</p>
                  <p className="text-xl font-extrabold text-[#16A36A] mt-1 tabular-nums">
                    {formatRupiahDot(periodTotals.thp)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1 tabular-nums">
                    {periodSlips.length} slip gaji · Bruto {formatRupiahDot(periodTotals.gross)}
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Potongan BPJS &amp; PPh 21</p>
                  <p className="text-xl font-extrabold text-[#DC3545] mt-1 tabular-nums">
                    {formatRupiahDot(periodTotals.bpjs + periodTotals.pph21)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1 tabular-nums">
                    BPJS {formatRupiahDot(periodTotals.bpjs)} · PPh 21 {formatRupiahDot(periodTotals.pph21)}
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Total Kompensasi</p>
                  <p className="text-xl font-extrabold text-[#102B69] mt-1 tabular-nums">
                    {formatRupiahDot(periodTotals.compensation)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Kompensasi PKWT PP 35/2021 &amp; Tambahan
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Total Cost-to-Company</p>
                  <p className="text-xl font-extrabold text-[#1468E8] mt-1 tabular-nums">
                    {formatRupiahDot(periodTotals.companyCost)}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1 tabular-nums">
                    {periodTotals.warnings > 0
                      ? `${periodTotals.warnings} peringatan UMR/selisih Excel`
                      : 'Seluruh base gaji sesuai acuan'}
                  </p>
                </div>
              </div>

              {/* Action Bar & Table */}
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                <div className="p-5 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-[#102B69]">
                      Daftar Perhitungan Gaji &amp; Slip — {formatPayrollPeriodLabel(selectedPeriod)}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Kunci unik <span className="font-mono">periode::employeeId</span> menjamin 1 karyawan hanya memiliki 1 slip per bulan (anti-double).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isPeriodLocked}
                      onClick={handleAutoCalculate}
                      data-testid="run-auto-payroll-btn"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:opacity-50 rounded-[4px] cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Hitung Otomatis Aplikasi</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadRecapExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Ekspor Excel &amp; Bank</span>
                    </button>
                    <button
                      type="button"
                      disabled={batchDownloading || periodSlips.length === 0}
                      onClick={handleDownloadBatchPdf}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] disabled:opacity-50 rounded-[4px] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{batchDownloading ? 'Membuat PDF...' : 'Unduh Semua Slip PDF'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPeriodLocked || periodSlips.length === 0 || periodRun?.status === 'Menunggu ACC'}
                      onClick={handleSubmitApproval}
                      data-testid="submit-payroll-acc-btn"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#16A36A] hover:bg-[#15803D] disabled:opacity-50 rounded-[4px] cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {periodRun?.status === 'Menunggu ACC'
                          ? 'Menunggu ACC Master Admin'
                          : 'Ajukan ACC Master Admin'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="px-5 py-3 bg-[#F5F7FA] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari NIK, nama karyawan, atau unit/klien..."
                    aria-label="Cari karyawan pada daftar payroll"
                    className="w-full sm:w-80 px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-[4px]"
                  />
                  <span className="text-xs text-[#64748B] tabular-nums">
                    Menampilkan {periodSlips.length} slip gaji
                  </span>
                </div>

                {periodSlips.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-sm font-bold text-[#102B69]">
                      Belum ada hitungan Payroll untuk periode {formatPayrollPeriodLabel(selectedPeriod)}
                    </p>
                    <p className="text-xs text-[#64748B] max-w-lg mx-auto">
                      Klik <strong>Hitung Otomatis Aplikasi</strong> untuk menarik data gaji pokok (hierarki UMR &amp; Rate Card Klien), absensi Alpha, BPJS, dan PPh 21 — atau buka menu <strong>Impor &amp; Ekspor Excel</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]">
                          <th className="py-3 px-4 font-semibold">Karyawan &amp; Penempatan</th>
                          <th className="py-3 px-4 font-semibold">Base Gaji &amp; Acuan</th>
                          <th className="py-3 px-4 font-semibold text-right">Tunj. &amp; Kompensasi</th>
                          <th className="py-3 px-4 font-semibold text-right">BPJS + PPh 21 + Pot.</th>
                          <th className="py-3 px-4 font-semibold text-right">THP Bersih</th>
                          <th className="py-3 px-4 font-semibold text-right">Aksi Slip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {periodSlips.map((slip) => {
                          const totalAllowComp =
                            slip.fixedAllowance +
                            slip.variableAllowance +
                            slip.overtimePay +
                            slip.incentiveBonus +
                            slip.pkwtCompensation +
                            slip.otherCompensation;
                          return (
                            <tr key={slip.id} className="hover:bg-[#F5F7FA]/70">
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-[#102B69]">
                                  {slip.fullName}{' '}
                                  <span className="font-mono text-[#64748B] font-medium">
                                    ({slip.employeeCode})
                                  </span>
                                </p>
                                <p className="text-[11px] text-[#64748B]">
                                  {slip.entityName} · {slip.placementName}
                                </p>
                                <p className="text-[11px] text-[#1468E8]">
                                  {slip.calculationSource} · PTKP {slip.ptkpStatus}
                                </p>
                                {slip.settlementType === 'Final Settlement (Resign)' && (
                                  <p className="text-[11px] font-bold text-[#B87D00] mt-0.5">
                                    Final Settlement (Resign
                                    {slip.resignDate
                                      ? ` ${formatIndonesianDate(slip.resignDate)}`
                                      : ''}
                                    ) · Prorata {slip.prorataActiveDays ?? '-'}/
                                    {slip.prorataTotalDays ?? '-'} hr
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-[#172033] tabular-nums whitespace-nowrap">
                                  {formatRupiahDot(slip.baseSalary)}
                                </p>
                                {slip.settlementType === 'Final Settlement (Resign)' &&
                                  typeof slip.fullBaseSalary === 'number' &&
                                  slip.fullBaseSalary !== slip.baseSalary && (
                                    <p className="text-[11px] text-[#B87D00] tabular-nums whitespace-nowrap">
                                      Prorata dari Full {formatRupiahDot(slip.fullBaseSalary)}
                                    </p>
                                  )}
                                <p className="text-[11px] text-[#64748B]">
                                  {slip.baseSalarySourceTag} · {slip.regionName}
                                </p>
                                {(slip.belowUmrWarning || slip.excelBaseMismatchWarning) && (
                                  <p className="text-[11px] font-semibold text-[#B87D00] flex items-center gap-1 mt-0.5">
                                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                                    <span>
                                      {slip.excelBaseMismatchWarning
                                        ? 'Selisih Base Excel'
                                        : 'Di bawah acuan UMR'}
                                    </span>
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right tabular-nums">
                                <p className="font-semibold text-[#172033] whitespace-nowrap">
                                  +{formatRupiahDot(totalAllowComp)}
                                </p>
                                {slip.pkwtCompensation > 0 && (
                                  <p className="text-[11px] font-semibold text-[#1468E8] whitespace-nowrap">
                                    PKWT: {formatRupiahDot(slip.pkwtCompensation)}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right tabular-nums">
                                <p className="font-semibold text-[#DC3545] whitespace-nowrap">
                                  -{formatRupiahDot(slip.totalDeductions)}
                                </p>
                                <p className="text-[11px] text-[#64748B] whitespace-nowrap">
                                  BPJS{' '}
                                  {formatRupiahDot(
                                    slip.bpjsKesEmployee +
                                      slip.bpjsTkJhtEmployee +
                                      slip.bpjsTkJpEmployee
                                  )}{' '}
                                  · PPh21 {formatRupiahDot(slip.pph21Employee)}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-right tabular-nums whitespace-nowrap">
                                <p className="text-sm font-extrabold text-[#16A36A] whitespace-nowrap">
                                  {formatRupiahDot(slip.takeHomePay)}
                                </p>
                                <p className="text-[11px] text-[#64748B]">{slip.status}</p>
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {!isPeriodLocked && (
                                    <button
                                      type="button"
                                      onClick={() => openEditSlip(slip)}
                                      aria-label={`Ubah rincian gaji ${slip.fullName}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" aria-hidden="true" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setPreviewSlip(slip)}
                                    data-testid={`open-slip-${slip.employeeCode}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                                  >
                                    <FileText className="w-3 h-3" aria-hidden="true" />
                                    <span>Slip PDF</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Resign Final Settlement & Nonaktif Exclusion Panel */}
              <section
                aria-label="Karyawan Resign Final Settlement dan Nonaktif"
                data-testid="payroll-resign-nonaktif-panel"
                className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#102B69]">
                      Karyawan Resign (Final Settlement Prorata) &amp; Nonaktif
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Karyawan berstatus <strong>Resign</strong> tetap dapat dihitung Final Settlement secara prorata &amp; otomatis terkunci setelah disetujui Master Admin. Akun login berstatus Resign otomatis dinonaktifkan.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B] tabular-nums">
                    {headcountSummary.resignTotalCount} Resign · {headcountSummary.nonaktifCount}{' '}
                    Nonaktif
                  </span>
                </div>

                {headcountSummary.resignEmployees.length === 0 &&
                headcountSummary.nonaktifEmployees.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-[#64748B]">
                    Tidak ada karyawan berstatus <strong>Resign</strong> atau{' '}
                    <strong>Nonaktif</strong> pada filter unit/klien saat ini.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E2E8F0] text-xs">
                    {headcountSummary.resignEmployees.map((row) => (
                      <div
                        key={row.employee.id}
                        className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#102B69]">
                            {row.employee.fullName}{' '}
                            <span className="font-mono font-medium text-[#64748B]">
                              ({row.employee.employeeCode})
                            </span>{' '}
                            · <span className="text-[#B87D00]">Status: Resign</span>
                          </p>
                          <p className="text-[#64748B] tabular-nums">
                            {row.employee.entityName} · Tgl Resign:{' '}
                            <strong>
                              {row.employee.resignDate
                                ? formatIndonesianDate(row.employee.resignDate)
                                : 'Belum diisi'}
                            </strong>{' '}
                            · Prorata Kerja: {row.prorata.activeDays}/{row.prorata.totalDays} hr
                            (Est. Base {formatRupiahDot(row.prorata.proratedBaseSalary)})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {row.isSettled ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[#16A36A]">
                              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Final Settlement Lunas (Terkunci)</span>
                            </span>
                          ) : row.hasSlipInPeriod ? (
                            <span className="font-bold text-[#1468E8]">
                              Masuk Draft {formatPayrollPeriodLabel(selectedPeriod)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isPeriodLocked}
                              onClick={() => handleCalculateResignSettlement(row.employee.id)}
                              data-testid={`calc-final-settlement-${row.employee.employeeCode}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-[#B87D00] hover:bg-[#926200] disabled:opacity-50 rounded-[4px] cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Hitung Final Settlement (Prorata)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {headcountSummary.nonaktifEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F8FAFC]"
                      >
                        <div>
                          <p className="font-semibold text-[#64748B]">
                            {emp.fullName}{' '}
                            <span className="font-mono">({emp.employeeCode})</span> ·{' '}
                            <span className="text-[#DC3545]">Nonaktif</span>
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {emp.entityName} · Dikecualikan otomatis dari perhitungan payroll.
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-[#DC3545] shrink-0">
                          Dikecualikan
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: UPLOAD & IMPOR EXCEL */}
          {activeMenu === 'pay-excel' && (
            <div className="space-y-6">
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#102B69]">
                      Impor Excel Payroll &amp; Validasi Anti-Double
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Unduh template resmi, isi komponen variabel/final, lalu unggah kembali. Sistem memblokir NIK duplikat dan melakukan overwrite terstruktur pada draft periode aktif.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    data-testid="download-payroll-template-btn"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                    <span>Download Template Excel (.xlsx)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <label className="p-4 border border-[#E2E8F0] rounded-[4px] bg-[#F8FAFC] flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="excelMode"
                      checked={excelMode === 'variable-merge'}
                      onChange={() => setExcelMode('variable-merge')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-bold text-[#102B69]">
                        Mode 1: Gabungkan Variabel Excel + Hitungan Sistem (Disarankan)
                      </p>
                      <p className="text-[#64748B] mt-0.5">
                        Excel memasok lembur, insentif, tunjangan, kompensasi &amp; kasbon. Base Gaji Master, BPJS Kes/TK, dan PPh 21 tetap dihitung otomatis agar tidak salah tarif.
                      </p>
                    </div>
                  </label>
                  <label className="p-4 border border-[#E2E8F0] rounded-[4px] bg-[#F8FAFC] flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="excelMode"
                      checked={excelMode === 'full-override'}
                      onChange={() => setExcelMode('full-override')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-bold text-[#102B69]">
                        Mode 2: Override Angka Final dari Excel Klien
                      </p>
                      <p className="text-[#64748B] mt-0.5">
                        Memakai Base Gaji dan override BPJS/PPh 21 dari file Excel jika klien sudah melakukan perhitungan final. Selisih terhadap UMR/Master tetap ditandai.
                      </p>
                    </div>
                  </label>
                </div>

                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUploadChange}
                  className="sr-only"
                  aria-label="Pilih file Excel Payroll"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isPeriodLocked}
                    onClick={() => excelInputRef.current?.click()}
                    data-testid="upload-payroll-excel-btn"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:opacity-50 rounded-[4px] cursor-pointer"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    <span>Upload File Excel / CSV Payroll</span>
                  </button>
                  <span className="text-xs text-[#64748B]">
                    Mendukung format `.xlsx`, `.xls`, dan `.csv`.
                  </span>
                </div>
              </section>

              {excelPreview && (
                <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#102B69]">
                        Pratinjau Validasi Impor: {excelPreview.fileName}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                        Valid: {excelPreview.validCount} · Peringatan: {excelPreview.warningCount} · Duplikat NIK Diblokir: {excelPreview.duplicateCount} · Error: {excelPreview.errorCount}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={
                        isPeriodLocked ||
                        excelPreview.validCount + excelPreview.warningCount === 0
                      }
                      onClick={handleApplyExcelImport}
                      data-testid="apply-excel-import-btn"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A36A] hover:bg-[#15803D] disabled:opacity-50 rounded-[4px] cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Terapkan Baris Valid ke Draft</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F5F7FA] border-b border-[#E2E8F0] text-[#64748B]">
                          <th className="py-2.5 px-4">Baris</th>
                          <th className="py-2.5 px-4">NIK &amp; Nama</th>
                          <th className="py-2.5 px-4">Status Validasi</th>
                          <th className="py-2.5 px-4">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {excelPreview.rows.map((r) => (
                          <tr key={`${r.rowNumber}-${r.rawCode}`}>
                            <td className="py-2.5 px-4 font-mono">#{r.rowNumber}</td>
                            <td className="py-2.5 px-4 font-semibold text-[#102B69]">
                              {r.rawCode} · {r.matchedEmployeeName || r.rawName}
                            </td>
                            <td className="py-2.5 px-4 font-bold">
                              {r.status === 'valid' && <span className="text-[#16A36A]">Valid</span>}
                              {r.status === 'warning' && (
                                <span className="text-[#B87D00]">Peringatan</span>
                              )}
                              {r.status === 'duplicate' && (
                                <span className="text-[#DC3545]">Duplikat (Diblokir)</span>
                              )}
                              {r.status === 'error' && (
                                <span className="text-[#DC3545]">Error</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-[#475569]">{r.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TAB 3: KOMPENSASI PKWT */}
          {activeMenu === 'pay-comp' && (
            <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
              <div className="p-6 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#102B69]">
                  Perhitungan Uang Kompensasi PKWT (PP No. 35 Tahun 2021)
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Rumus: (Masa Kerja Bulan / 12) × Base Gaji Kontrak. Kontrak yang sudah dicairkan kompensasinya otomatis terkunci (anti-double claim).
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#E2E8F0] text-[#64748B]">
                      <th className="py-3 px-4">Karyawan &amp; No. PKWT</th>
                      <th className="py-3 px-4">Periode Kontrak</th>
                      <th className="py-3 px-4 text-right">Masa Kerja</th>
                      <th className="py-3 px-4 text-right">Estimasi Kompensasi</th>
                      <th className="py-3 px-4 text-right">Status &amp; Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {pkwtCompensationCandidates.map(
                      ({ emp, baseInfo, comp, alreadyClaimed, inCurrentDraft }) => (
                        <tr key={emp.id}>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-[#102B69]">
                              {emp.fullName} ({emp.employeeCode})
                            </p>
                            <p className="text-[11px] font-mono text-[#64748B]">
                              {emp.contractNumber} · {emp.entityName}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 tabular-nums">
                            {formatIndonesianDate(emp.joinDate)} –{' '}
                            {formatIndonesianDate(emp.contractEndDate)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold tabular-nums">
                            {comp.tenureMonths} Bulan
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#102B69] tabular-nums">
                            {formatRupiahDot(comp.amount)}
                            <p className="text-[10px] font-normal text-[#64748B]">
                              Base: {formatRupiahDot(baseInfo.baseSalary)}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {alreadyClaimed ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[#16A36A]">
                                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Sudah Dicairkan (Terkunci)</span>
                              </span>
                            ) : inCurrentDraft ? (
                              <span className="font-bold text-[#1468E8]">
                                Masuk Draft {formatPayrollPeriodLabel(selectedPeriod)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isPeriodLocked}
                                onClick={() =>
                                  handleInjectPkwtComp(
                                    emp.id,
                                    emp.contractNumber,
                                    comp.amount,
                                    emp.fullName
                                  )
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:opacity-50 rounded-[4px] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Masukkan ke Slip</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 4: MASTER UMR & TARIF */}
          {activeMenu === 'pay-tariffs' && (
            <form onSubmit={handleSaveTariffs} className="space-y-6 text-xs">
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#102B69]">
                      Referensi UMR / UMK Regional &amp; Nominal Khusus
                    </h2>
                    <p className="text-[#64748B] mt-0.5">
                      Acuan otomatis untuk mendeteksi kesesuaian base gaji (Jakarta, Daerah Rp 3,5 Jt, Surabaya, Bandung, atau PKS Khusus).
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {tariffDraft.regionalTiers.map((tier, idx) => (
                    <div
                      key={tier.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px]"
                    >
                      <div className="sm:col-span-5">
                        <p className="font-bold text-[#102B69]">{tier.name}</p>
                        <p className="text-[11px] text-[#64748B]">
                          Kata kunci area: {tier.areaKeywords.join(', ') || 'Manual'}
                        </p>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="sr-only" htmlFor={`tier-umr-${tier.id}`}>
                          Nominal UMR {tier.name}
                        </label>
                        <input
                          id={`tier-umr-${tier.id}`}
                          type="number"
                          min={0}
                          disabled={tier.isCustom}
                          value={tier.umrMonthly}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setTariffDraft((prev) => ({
                              ...prev,
                              regionalTiers: prev.regionalTiers.map((item, i) =>
                                i === idx ? { ...item, umrMonthly: val } : item
                              ),
                            }));
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] font-mono font-bold text-[#102B69]"
                        />
                      </div>
                      <div className="sm:col-span-3 text-right font-semibold text-[#64748B] tabular-nums">
                        {tier.isCustom ? 'Mengikuti Nominal Kontrak' : formatRupiahDot(tier.umrMonthly)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label htmlFor="new-tier-name" className="block font-semibold text-[#102B69] mb-1">
                      Nama Wilayah / UMR Baru
                    </label>
                    <input
                      id="new-tier-name"
                      type="text"
                      value={newTierName}
                      onChange={(e) => setNewTierName(e.target.value)}
                      placeholder="Mis: UMK Semarang 2026"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-tier-kw" className="block font-semibold text-[#102B69] mb-1">
                      Kata Kunci Area (koma)
                    </label>
                    <input
                      id="new-tier-kw"
                      type="text"
                      value={newTierKeywords}
                      onChange={(e) => setNewTierKeywords(e.target.value)}
                      placeholder="semarang, kendal"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-tier-umr" className="block font-semibold text-[#102B69] mb-1">
                      Nominal UMR (Rp)
                    </label>
                    <input
                      id="new-tier-umr"
                      type="number"
                      min={0}
                      value={newTierUmr}
                      onChange={(e) => setNewTierUmr(e.target.value)}
                      placeholder="3500000"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRegionalTier}
                    className="px-4 py-2 font-semibold text-[#102B69] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white border border-[#C9DDFB] rounded-[4px] cursor-pointer"
                  >
                    + Tambah UMR Wilayah
                  </button>
                </div>
              </section>

              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4">
                <h2 className="text-base font-bold text-[#102B69] border-b border-[#E2E8F0] pb-3">
                  Parameter BPJS, PPh 21 (TER) &amp; Potongan Alpha
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="cfg-kes-cap" className="block font-semibold text-[#102B69] mb-1">
                      Batas Upah BPJS Kes (Rp)
                    </label>
                    <input
                      id="cfg-kes-cap"
                      type="number"
                      value={tariffDraft.bpjsKesWageCap}
                      onChange={(e) =>
                        setTariffDraft((p) => ({ ...p, bpjsKesWageCap: Number(e.target.value) || 0 }))
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-jp-cap" className="block font-semibold text-[#102B69] mb-1">
                      Batas Upah JP BPJS TK (Rp)
                    </label>
                    <input
                      id="cfg-jp-cap"
                      type="number"
                      value={tariffDraft.bpjsJpWageCap}
                      onChange={(e) =>
                        setTariffDraft((p) => ({ ...p, bpjsJpWageCap: Number(e.target.value) || 0 }))
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="cfg-pph-scheme" className="block font-semibold text-[#102B69] mb-1">
                      Skema PPh 21 (PP 58/2023)
                    </label>
                    <select
                      id="cfg-pph-scheme"
                      value={tariffDraft.pph21Scheme}
                      onChange={(e) =>
                        setTariffDraft((p) => ({
                          ...p,
                          pph21Scheme: e.target.value as PayrollTariffConfig['pph21Scheme'],
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
                    >
                      <option value="Gross">Gross (Potong dari THP Karyawan)</option>
                      <option value="Nett (Ditanggung Perusahaan)">
                        Nett (Ditanggung Perusahaan)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cfg-work-days" className="block font-semibold text-[#102B69] mb-1">
                      Pembagi Hari Kerja / Bulan
                    </label>
                    <input
                      id="cfg-work-days"
                      type="number"
                      min={1}
                      max={31}
                      value={tariffDraft.workingDaysPerMonth}
                      onChange={(e) =>
                        setTariffDraft((p) => ({
                          ...p,
                          workingDaysPerMonth: Math.max(1, Number(e.target.value) || 22),
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                  >
                    Simpan Master Tarif Payroll
                  </button>
                </div>
              </section>
            </form>
          )}
        </main>
      </div>

      {/* Inline Edit Slip Modal */}
      {editingSlip && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-slip-title"
          className="fixed inset-0 z-50 bg-[#172033]/60 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveSlipEdit}
            className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 id="edit-slip-title" className="text-sm font-bold text-[#102B69]">
                  Sesuaikan Rincian Gaji: {editingSlip.fullName}
                </h2>
                <p className="text-[#64748B]">
                  {editingSlip.employeeCode} · BPJS &amp; PPh 21 akan otomatis dihitung ulang (1x).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlip(null)}
                aria-label="Tutup modal edit slip"
                className="p-1 text-[#64748B] hover:text-[#102B69] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {editingSlip.settlementType === 'Final Settlement (Resign)' && (
                <div className="sm:col-span-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label
                      htmlFor="edit-prorataDaysOverride"
                      className="block font-bold text-[#92400E]"
                    >
                      Hari Kerja Prorata Resign (dari {editingSlip.prorataTotalDays ?? 22} hr)
                    </label>
                    <p className="text-[11px] text-[#92400E]/80">
                      Ubah hari kerja untuk menghitung ulang Gaji Pokok prorata dari Full{' '}
                      {formatRupiahDot(editingSlip.fullBaseSalary ?? editingSlip.baseSalary)}.
                    </p>
                  </div>
                  <input
                    id="edit-prorataDaysOverride"
                    type="number"
                    min={0}
                    max={editingSlip.prorataTotalDays ?? 31}
                    value={editForm.prorataDaysOverride}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, prorataDaysOverride: e.target.value }))
                    }
                    className="w-28 px-3 py-1.5 bg-white border border-[#F59E0B] rounded-[4px] font-mono font-bold text-[#102B69]"
                  />
                </div>
              )}
              {[
                ['baseSalaryOverride', 'Base Gaji (Override Rp)'],
                ['fixedAllowance', 'Tunjangan Tetap (Rp)'],
                ['variableAllowance', 'Tunjangan Tidak Tetap (Rp)'],
                ['overtimePay', 'Lembur / Overtime (Rp)'],
                ['incentiveBonus', 'Insentif / Bonus (Rp)'],
                ['pkwtCompensation', 'Kompensasi PKWT (Rp)'],
                ['otherCompensation', 'Kompensasi / THR Lain (Rp)'],
                ['loanKasbonDeduction', 'Potongan Kasbon / Lainnya (Rp)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`edit-${key}`} className="block font-semibold text-[#172033] mb-1">
                    {label}
                  </label>
                  <input
                    id={`edit-${key}`}
                    type="number"
                    min={0}
                    value={editForm[key as keyof typeof editForm]}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                  />
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="edit-notes" className="block font-semibold text-[#172033] mb-1">
                Catatan Slip
              </label>
              <input
                id="edit-notes"
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Opsional, misal: Lembur proyek akhir bulan"
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSlip(null)}
                className="px-4 py-2 font-semibold text-[#64748B] bg-[#F5F7FA] rounded-[4px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
              >
                Simpan &amp; Hitung Ulang THP
              </button>
            </div>
          </form>
        </div>
      )}

      {previewSlip && (
        <SlipGajiModal
          slip={previewSlip}
          settings={store.settings}
          onClose={() => setPreviewSlip(null)}
        />
      )}
    </div>
  );
};
