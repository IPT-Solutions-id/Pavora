import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  History,
  Home,
  IdCard,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  Menu,
  PenTool,
  ScanFace,
  ShieldCheck,
  Upload,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { PevoraLogo } from '../PevoraLogo';
import { MasterAdminUser } from '../../utils/validation';
import { WorkspaceStore } from '../../hooks/useWorkspaceStore';
import {
  AttendanceLogRecord,
  ContractHistoryItem,
  DOCUMENT_CHECKLIST_ITEMS,
  EmployeeDocumentsRecord,
  LeaveAbsenceRecord,
  calculateDaysRemaining,
  calculateEmployeeLeaveQuotaSummary,
  countUploadedDocuments,
  formatIndonesianDate,
  getContractEocIndicator,
  maskSensitiveNumber,
  resolveEmployeeWorkSchedule,
} from '../../data/masterAdminData';
import { formatRupiahDot } from '../../utils/pkwtDocument';
import {
  canSignContractHistoryItem,
  isContractSignedLocked,
  resolveEmployeeContractSequenceLabel,
  resolveLatestContractSignatureStatus,
} from '../../utils/pkwtLifecycle';
import { isValidMapsUrl } from '../../utils/mapsUrl';
import { PkwtDocumentModal } from '../dashboard/PkwtDocumentModal';
import { BpjsCardsSection } from '../shared/BpjsCardsSection';
import { DigitalSignaturePad } from '../shared/DigitalSignaturePad';
import { NotificationBellMenu } from '../shared/NotificationBellMenu';
import { FaceAttendanceCameraModal } from './FaceAttendanceCameraModal';
import { SlipGajiModal } from '../payroll/SlipGajiModal';
import { PayrollSlipRecord } from '../../utils/payrollCalculator';
import { EmployeeActivityPanel } from './EmployeeActivityPanel';
import { EmployeeLeavePanel } from './EmployeeLeavePanel';

export type EmployeeMenuId =
  | 'emp-home'
  | 'emp-attendance'
  | 'emp-activity'
  | 'emp-leave'
  | 'emp-contract'
  | 'emp-signature'
  | 'emp-profile';

interface EmployeeDashboardProps {
  user: MasterAdminUser;
  store: WorkspaceStore;
  onLogout: () => void;
}

interface EmployeeNavItem {
  id: EmployeeMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EMPLOYEE_MENU_ITEMS: EmployeeNavItem[] = [
  { id: 'emp-home', label: 'Beranda', icon: Home },
  { id: 'emp-attendance', label: 'Presensi', icon: ScanFace },
  { id: 'emp-activity', label: 'Laporan Kegiatan', icon: ClipboardList },
  { id: 'emp-leave', label: 'Cuti & Izin', icon: CalendarCheck2 },
  { id: 'emp-contract', label: 'Kontrak & Slip', icon: Wallet },
  { id: 'emp-signature', label: 'Menu TTD', icon: PenTool },
  { id: 'emp-profile', label: 'Profil & Berkas', icon: IdCard },
];

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function formatTodayDateLabel(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dd = String(now.getDate()).padStart(2, '0');
  const mmm = months[now.getMonth()] ?? 'Nov';
  const yyyy = now.getFullYear();
  return `${dd} ${mmm} ${yyyy}`;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user, store, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState<EmployeeMenuId>('emp-home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Camera modal state
  const [cameraMode, setCameraMode] = useState<'enroll' | 'checkin' | 'checkout' | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [selfiePreviewLog, setSelfiePreviewLog] = useState<AttendanceLogRecord | null>(null);

  // PKWT Modal & Digital Signature state
  const [pkwtPreviewTarget, setPkwtPreviewTarget] = useState<ContractHistoryItem | 'active' | null>(null);
  const [selectedSlipModal, setSelectedSlipModal] = useState<PayrollSlipRecord | null>(null);
  const [pkwtSignatureDataUrl, setPkwtSignatureDataUrl] = useState('');
  const [pkwtConsentChecked, setPkwtConsentChecked] = useState(false);
  const [pkwtSignFeedback, setPkwtSignFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedSigDraft, setSavedSigDraft] = useState('');
  const [savedSigFeedback, setSavedSigFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [signSourceMode, setSignSourceMode] = useState<'saved' | 'draw'>('saved');

  // Leave feedback & SKD preview state
  const [leaveFeedback, setLeaveFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewSkdLeave, setPreviewSkdLeave] = useState<LeaveAbsenceRecord | null>(null);

  // Locate current employee record cleanly
  const employee = useMemo(() => {
    return (
      store.employees.find((e) => e.id === user.employeeId) ??
      store.employees.find(
        (e) => e.employeeCode.toLowerCase() === (user.employeeCode ?? user.id).toLowerCase()
      ) ??
      store.employees.find((e) => e.email.toLowerCase() === (user.email ?? '').toLowerCase()) ??
      store.employees[1]
    );
  }, [store.employees, user]);

  // Self-service profile draft synced when switching to profile or saving
  const [profileForm, setProfileForm] = useState(() => ({
    whatsappNumber: employee.whatsappNumber,
    email: employee.email,
    domicileSameAsKtp: employee.domicileSameAsKtp,
    domicileAddress: employee.domicileAddress,
    emergencyName: employee.emergencyContact.name,
    emergencyRelation: employee.emergencyContact.relation,
    emergencyPhone: employee.emergencyContact.phone,
    npwpNumber: employee.npwpNumber,
    bpjsKesehatanNumber: employee.bpjsKesehatanNumber ?? '',
    bpjsKetenagakerjaanNumber: employee.bpjsKetenagakerjaanNumber ?? '',
    bankName: employee.bankName,
    bankAccountNumber: employee.bankAccountNumber,
    bankAccountHolder: employee.bankAccountHolder,
    bankBranch: employee.bankBranch,
  }));
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSavedNotice, setProfileSavedNotice] = useState('');

  // Self-service password / PIN change state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showSelfPins, setShowSelfPins] = useState(false);
  const [pinChangeFeedback, setPinChangeFeedback] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const actorLabel = `${employee.fullName} (${employee.employeeCode})`;
  const activeMenuItem =
    EMPLOYEE_MENU_ITEMS.find((m) => m.id === activeMenu) ?? EMPLOYEE_MENU_ITEMS[0];

  const todayLabel = formatTodayDateLabel();
  const isFaceEnrolled = Boolean(
    employee.faceBiometric?.enrolled && employee.faceBiometric.descriptor?.length
  );

  const myAttendanceLogs = useMemo(
    () =>
      store.attendanceLogs.filter(
        (l) => l.employeeCode.toLowerCase() === employee.employeeCode.toLowerCase()
      ),
    [store.attendanceLogs, employee.employeeCode]
  );

  const todayAttendance = useMemo(
    () => myAttendanceLogs.find((l) => l.dateLabel === todayLabel) ?? null,
    [myAttendanceLogs, todayLabel]
  );

  const myLeaves = useMemo(
    () =>
      store.leaveAbsences.filter(
        (l) => l.employeeCode.toLowerCase() === employee.employeeCode.toLowerCase()
      ),
    [store.leaveAbsences, employee.employeeCode]
  );

  const myAlphaAlerts = myLeaves.filter(
    (l) =>
      l.type === 'Alpha / Tanpa Keterangan' ||
      l.status === 'Alpha' ||
      l.status === 'Perlu Klarifikasi'
  );
  const leaveQuota = useMemo(
    () =>
      calculateEmployeeLeaveQuotaSummary(
        employee.employeeCode,
        store.leaveAbsences,
        store.policy.annualLeaveQuota
      ),
    [employee.employeeCode, store.leaveAbsences, store.policy.annualLeaveQuota]
  );
  const remainingAnnualLeave = leaveQuota.remainingLeaveQuota;
  const myNotifications = useMemo(
    () =>
      store.notifications.filter(
        (n) =>
          n.recipientRole === 'employee' &&
          (n.employeeCode ?? '').toLowerCase() === employee.employeeCode.toLowerCase()
      ),
    [store.notifications, employee.employeeCode]
  );

  const myContract = useMemo(() => {
    const matched = store.contracts.find(
      (c) => c.employeeCode.toLowerCase() === employee.employeeCode.toLowerCase()
    );
    if (matched) return matched;
    return {
      id: `ctr-${employee.id}`,
      contractNumber: employee.contractNumber || `PKWT-${employee.employeeCode}`,
      employeeCode: employee.employeeCode,
      employeeName: employee.fullName,
      employmentType: employee.employmentType,
      entityName: employee.entityName,
      contractType: employee.contractType,
      startDate: formatIndonesianDate(employee.joinDate),
      endDate:
        employee.contractType === 'PKWTT'
          ? 'Karyawan Tetap'
          : formatIndonesianDate(employee.contractEndDate),
      daysRemaining:
        employee.contractType === 'PKWT'
          ? calculateDaysRemaining(employee.contractEndDate)
          : null,
      status: 'Aktif' as const,
    };
  }, [store.contracts, employee]);

  const contractDaysRemaining =
    employee.contractType === 'PKWT' ? calculateDaysRemaining(employee.contractEndDate) : null;
  const eocIndicator = getContractEocIndicator(employee.contractType, employee.contractEndDate);
  const contractHistory = useMemo(() => employee.contractHistory ?? [], [employee.contractHistory]);
  const pendingUnsignedContract = useMemo(
    () => contractHistory.find((h) => h.signatureStatus === 'Menunggu TTD Karyawan') ?? null,
    [contractHistory]
  );
  const contractSequenceLabel = useMemo(
    () => resolveEmployeeContractSequenceLabel(employee),
    [employee]
  );
  const latestContractTtdStatus = useMemo(
    () => resolveLatestContractSignatureStatus(employee),
    [employee]
  );
  const workSchedule = resolveEmployeeWorkSchedule(
    employee.entityName,
    store.policy,
    employee.placementName
  );
  const docProgress = countUploadedDocuments(employee.documents);

  const myPublishedSlips = useMemo(
    () =>
      store.payrollSlips.filter(
        (s) =>
          s.status === 'Disetujui' &&
          (s.employeeId === employee.id ||
            s.employeeCode.toLowerCase() === employee.employeeCode.toLowerCase())
      ),
    [store.payrollSlips, employee.id, employee.employeeCode]
  );

  const baseSalary = employee.salaryMonthly ?? 5350000;
  const hadirCount = myAttendanceLogs.filter((l) => l.status === 'Hadir').length;
  const telatCount = myAttendanceLogs.filter((l) => l.status === 'Telat').length;
  const bpjsKesEmployeeDeduction = Math.round(baseSalary * 0.01);
  const bpjsTkJhtDeduction = Math.round(baseSalary * 0.02);
  const bpjsTkJpDeduction = Math.round(baseSalary * 0.01);
  const estimatedNetSalary =
    baseSalary - bpjsKesEmployeeDeduction - bpjsTkJhtDeduction - bpjsTkJpDeduction;

  const selectMenu = (id: EmployeeMenuId) => {
    setActiveMenu(id);
    setMobileSidebarOpen(false);
    setActionFeedback(null);
    setPkwtSignFeedback(null);
    setSavedSigFeedback(null);
  };

  const handleSaveSignatureSpecimen = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.saveEmployeeSignatureSpecimen(employee.id, savedSigDraft, actorLabel);
    setSavedSigFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setSignSourceMode('saved');
    }
  };

  const handleSignPkwtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSignature =
      signSourceMode === 'saved' && employee.savedSignatureDataUrl
        ? employee.savedSignatureDataUrl
        : pkwtSignatureDataUrl;
    if (!effectiveSignature) {
      setPkwtSignFeedback({
        ok: false,
        text: 'Silakan simpan tanda tangan di Menu TTD atau goreskan TTD pada kanvas terlebih dahulu.',
      });
      return;
    }
    if (!pkwtConsentChecked) {
      setPkwtSignFeedback({
        ok: false,
        text: 'Centang pernyataan persetujuan syarat & ketentuan PKWT setelah membaca isinya.',
      });
      return;
    }
    const res = store.signEmployeePkwtDigitally(
      employee.id,
      effectiveSignature,
      actorLabel,
      pendingUnsignedContract?.contractNumber
    );
    setPkwtSignFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setPkwtSignatureDataUrl('');
      setPkwtConsentChecked(false);
    }
  };

  const handleOpenAttendanceCamera = (targetMode: 'checkin' | 'checkout') => {
    setActionFeedback(null);
    if (!isFaceEnrolled) {
      setCameraMode('enroll');
      return;
    }
    setCameraMode(targetMode);
  };



  const handleSaveSelfProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSavedNotice('');
    const errs: Record<string, string> = {};

    const waDigits = profileForm.whatsappNumber.replace(/[^0-9]/g, '');
    if (waDigits.length < 10 || waDigits.length > 15) {
      errs.whatsappNumber = 'No. WhatsApp harus 10–15 digit angka.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())) {
      errs.email = 'Format email tidak valid.';
    }
    const bpjsKesDigits = profileForm.bpjsKesehatanNumber.replace(/\s+/g, '');
    if (bpjsKesDigits && !/^\d{11,13}$/.test(bpjsKesDigits)) {
      errs.bpjsKesehatanNumber = 'No. BPJS Kesehatan harus 11–13 digit angka.';
    }
    const bpjsTkClean = profileForm.bpjsKetenagakerjaanNumber.replace(/\s+/g, '');
    if (bpjsTkClean && !/^[A-Za-z0-9]{11,16}$/.test(bpjsTkClean)) {
      errs.bpjsKetenagakerjaanNumber = 'No. BPJS Ketenagakerjaan harus 11–16 karakter.';
    }
    const acctDigits = profileForm.bankAccountNumber.replace(/\s+/g, '');
    if (!/^\d{8,20}$/.test(acctDigits)) {
      errs.bankAccountNumber = 'Nomor rekening harus 8–20 digit angka.';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setProfileErrors({});
    store.updateEmployeeSelfProfile(
      employee.id,
      {
        whatsappNumber: profileForm.whatsappNumber.trim(),
        email: profileForm.email.trim(),
        domicileSameAsKtp: profileForm.domicileSameAsKtp,
        domicileAddress: profileForm.domicileSameAsKtp
          ? `${employee.ktpAddress.street}, ${employee.ktpAddress.city}`
          : profileForm.domicileAddress.trim(),
        emergencyContact: {
          name: profileForm.emergencyName.trim(),
          relation: profileForm.emergencyRelation.trim(),
          phone: profileForm.emergencyPhone.trim(),
        },
        npwpNumber: profileForm.npwpNumber.trim(),
        bpjsKesehatanNumber: bpjsKesDigits,
        bpjsKetenagakerjaanNumber: bpjsTkClean,
        bankName: profileForm.bankName.trim(),
        bankAccountNumber: acctDigits,
        bankAccountHolder: profileForm.bankAccountHolder.trim(),
        bankBranch: profileForm.bankBranch.trim(),
      },
      actorLabel
    );
    setProfileSavedNotice('Perubahan profil, nomor BPJS, dan rekening berhasil disimpan & disinkronkan ke HR Admin.');
  };

  const handleToggleSelfDocument = (docKey: keyof EmployeeDocumentsRecord) => {
    if (docKey === 'contractUploaded') return;
    store.updateEmployeeSelfProfile(
      employee.id,
      {
        documents: {
          ...employee.documents,
          [docKey]: !employee.documents[docKey],
        },
      },
      actorLabel
    );
  };

  const handleChangeSelfPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeFeedback(null);
    if (newPinInput.trim().length < 4) {
      setPinChangeFeedback({
        ok: false,
        text: 'PIN / kata sandi baru minimal harus 4 karakter.',
      });
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinChangeFeedback({
        ok: false,
        text: 'Konfirmasi PIN / kata sandi baru tidak cocok.',
      });
      return;
    }
    const res = store.changeEmployeeOwnPassword(
      employee.id,
      currentPinInput,
      newPinInput,
      actorLabel
    );
    setPinChangeFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
    }
  };

  const renderSidebarNav = () => (
    <div className="flex flex-col h-full bg-[#102B69] text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/15 shrink-0">
        <PevoraLogo variant="light" />
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Tutup menu karyawan"
          className="lg:hidden p-1.5 rounded-[4px] text-[#EAF2FF] hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-white/15">
        <p className="font-jakarta text-[11px] font-semibold text-[#FF7A1A]">
          Portal Karyawan (ESS)
        </p>
        <p className="text-sm font-bold text-white mt-0.5 truncate" title={employee.fullName}>
          {employee.fullName}
        </p>
        <p className="text-[11px] text-[#EAF2FF]/80 mt-0.5 truncate tabular-nums">
          {employee.employeeCode} · {employee.employmentType}
        </p>
      </div>

      <nav aria-label="Menu Portal Karyawan" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {EMPLOYEE_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectMenu(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-[4px] transition-colors duration-150 cursor-pointer text-left ${
                isActive
                  ? 'bg-[#1468E8] text-white font-semibold'
                  : 'text-[#EAF2FF]/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'emp-leave' && myAlphaAlerts.length > 0 && (
                <span className="text-[11px] font-bold text-[#FF7A1A] tabular-nums shrink-0">
                  {myAlphaAlerts.length}
                </span>
              )}
              {item.id === 'emp-attendance' && !isFaceEnrolled && (
                <span className="text-[10px] font-bold text-[#FF7A1A] shrink-0">Wajib Daftar</span>
              )}
              {item.id === 'emp-signature' &&
                (pendingUnsignedContract ||
                  (employee.contractType === 'PKWT' && contractHistory.length === 0)) && (
                  <span className="text-[10px] font-bold text-[#FF7A1A] shrink-0">TTD PKWT</span>
                )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/15 shrink-0 space-y-3">
        <div className="px-2">
          <p className="text-xs font-semibold text-white truncate">{employee.entityName}</p>
          <p className="text-[11px] text-[#EAF2FF]/75 truncate">
            Wajah: {isFaceEnrolled ? 'Terdaftar' : 'Belum Registrasi'}
          </p>
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[272px] shrink-0 sticky top-0 h-screen">
        {renderSidebarNav()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#172033]/50"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-[272px] max-w-[84vw] h-full z-10">
            {renderSidebarNav()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 min-h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu karyawan"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA] shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] truncate">
                Portal Karyawan ·{' '}
                <span className="font-semibold text-[#102B69]">{activeMenuItem.label}</span>
              </p>
              <h1 className="text-base sm:text-lg font-bold text-[#102B69] truncate">
                {activeMenuItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NotificationBellMenu
              notifications={myNotifications}
              onSelectNotification={(notif) => {
                store.markNotificationRead(notif.id);
                if (notif.targetMenu === 'emp-signature') {
                  selectMenu('emp-signature');
                } else if (notif.targetMenu === 'emp-contract') {
                  selectMenu('emp-contract');
                } else {
                  selectMenu('emp-leave');
                }
              }}
              onMarkAllRead={store.markAllNotificationsRead}
            />
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-[#102B69]">{employee.fullName}</p>
              <p className="text-[11px] text-[#64748B] tabular-nums">
                {employee.employeeCode} · {employee.status}
              </p>
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto space-y-6">
          {actionFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`p-4 rounded-[6px] border text-xs font-semibold flex items-center justify-between gap-3 ${
                actionFeedback.ok
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
              }`}
            >
              <span>{actionFeedback.text}</span>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                aria-label="Tutup notifikasi"
                className="p-1 hover:bg-black/5 rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 1: BERANDA KARYAWAN (DENGAN CARD SAPAAN)                    */}
          {/* =============================================================== */}
          {activeMenu === 'emp-home' && (
            <div className="space-y-6">
              {/* HERO CARD SAPAAN */}
              <section
                aria-label="Card Sapaan Karyawan"
                className="bg-[#102B69] text-white border border-[#102B69] rounded-[6px] p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
              >
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#EAF2FF]">
                    <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-[4px] tabular-nums">
                      NIK {employee.employeeCode}
                    </span>
                    <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-[4px]">
                      {employee.employmentType}
                    </span>
                    <span className="px-2 py-0.5 bg-[#FF7A1A]/20 border border-[#FF7A1A]/50 text-[#FFD4B3] rounded-[4px]">
                      {employee.status}
                    </span>
                    {eocIndicator.isExpiring && (
                      <span className="px-2 py-0.5 bg-[#DC3545]/25 border border-[#FCA5A5]/60 text-[#FECACA] rounded-[4px]">
                        {eocIndicator.badgeLabel}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                      {getTimeOfDayGreeting()}, {employee.fullName}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#EAF2FF]/85 mt-1">
                      {employee.position} · Penempatan:{' '}
                      <strong className="text-white">{employee.entityName}</strong>
                      {employee.placementName ? ` · Cabang ${employee.placementName}` : ''}
                      {employee.placementArea ? ` (${employee.placementArea})` : ''}
                    </p>
                    {employee.placementMapsUrl && isValidMapsUrl(employee.placementMapsUrl) && (
                      <a
                        href={employee.placementMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#93C5FD] hover:text-white mt-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Buka Titik Penempatan di Google Maps</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#EAF2FF]/85 pt-1 tabular-nums">
                    <span>
                      Jadwal Hari Ini ({workSchedule.policySourceLabel}):{' '}
                      <strong className="text-white">
                        {workSchedule.checkInTime} – {workSchedule.checkOutTime} WIB
                      </strong>{' '}
                      (Toleransi {workSchedule.lateToleranceMinutes} mnt · {workSchedule.workDays})
                    </span>
                    <span>
                      Kontrak ({contractSequenceLabel}):{' '}
                      <strong className="text-white">
                        {employee.contractType === 'PKWTT'
                          ? 'Karyawan Tetap'
                          : contractDaysRemaining !== null
                            ? `Sisa ${contractDaysRemaining} hari (${formatIndonesianDate(
                                employee.contractEndDate
                              )})`
                            : formatIndonesianDate(employee.contractEndDate)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Card Sapaan Right Action Column */}
                <div className="lg:col-span-4 bg-white/10 border border-white/20 rounded-[6px] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#EAF2FF]/80 font-medium">Biometrik Wajah</span>
                    <span
                      className={`font-bold ${
                        isFaceEnrolled ? 'text-[#86EFAC]' : 'text-[#FFD4B3]'
                      }`}
                    >
                      {isFaceEnrolled ? 'Terdaftar' : 'Wajib Registrasi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <span className="text-[#EAF2FF]/80 font-medium">Presensi ({todayLabel})</span>
                    <span className="font-bold text-white">
                      {todayAttendance
                        ? `${todayAttendance.checkIn} / ${todayAttendance.checkOut}`
                        : 'Belum Clock-In'}
                    </span>
                  </div>

                  {!isFaceEnrolled ? (
                    <button
                      type="button"
                      onClick={() => setCameraMode('enroll')}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#FF7A1A] hover:bg-[#E06810] rounded-[4px] transition-colors cursor-pointer"
                    >
                      <ScanFace className="w-4 h-4" aria-hidden="true" />
                      <span>Registrasi Wajah Wajib Dulu</span>
                    </button>
                  ) : !todayAttendance || todayAttendance.checkIn === '—' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAttendanceCamera('checkin')}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#128557] rounded-[4px] transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>Clock-In Wajah Live</span>
                    </button>
                  ) : todayAttendance.checkOut === '—' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAttendanceCamera('checkout')}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#1468E8] hover:bg-[#0E56C5] rounded-[4px] transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>Clock-Out Wajah Live</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 text-center text-xs font-bold text-[#86EFAC] border border-[#86EFAC]/40 rounded-[4px]">
                      Clock-In &amp; Clock-Out Hari Ini Selesai
                    </div>
                  )}
                </div>
              </section>

              {/* Mandatory Face Biometric Reminder if unenrolled */}
              {!isFaceEnrolled && (
                <div
                  role="alert"
                  className="bg-[#FFF8EB] border border-[#F59E0B]/45 rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#B87D00] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-[#102B69]">
                        Registrasi Wajah Wajib Diselesaikan Sebelum Absen
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Untuk mencegah titip absen atau pemakaian pas foto/gambar, Anda wajib
                        mendaftarkan wajah asli melalui kamera langsung sekali sebelum tombol
                        Clock-In/Out dibuka.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCameraMode('enroll')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Daftar Wajah Sekarang
                  </button>
                </div>
              )}

              {/* Pending Digital PKWT Signature Reminder (Single Callout -> Menu TTD) */}
              {(pendingUnsignedContract ||
                (employee.contractType === 'PKWT' && contractHistory.length === 0)) && (
                <div
                  role="alert"
                  data-testid="emp-pending-pkwt-alert"
                  className="bg-[#EAF2FF] border border-[#1468E8]/40 rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <PenTool className="w-5 h-5 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-[#102B69]">
                        {pendingUnsignedContract?.sequenceLabel ?? 'PKWT Ke-1'} (
                        {pendingUnsignedContract?.contractNumber ?? myContract.contractNumber}) Menunggu TTD Anda
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Periode{' '}
                        {formatIndonesianDate(
                          pendingUnsignedContract?.startDate ?? employee.joinDate
                        )}{' '}
                        –{' '}
                        {pendingUnsignedContract?.endDate || employee.contractEndDate
                          ? formatIndonesianDate(
                              pendingUnsignedContract?.endDate ?? employee.contractEndDate
                            )
                          : 'Tetap'}
                        . Silakan tinjau &amp; baca isi kontrak kerja terlebih dahulu di Menu TTD sebelum menyetujui &amp; membubuhkan tanda tangan digital.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectMenu('emp-signature')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Buka Menu TTD
                  </button>
                </div>
              )}

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Kepesertaan BPJS Kesehatan</p>
                  <p className="text-base font-extrabold text-[#102B69] font-mono tabular-nums mt-1.5">
                    {employee.bpjsKesehatanNumber || 'Belum didaftarkan'}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {employee.bpjsKesehatanNumber ? 'Aktif · JKN-KIS' : 'Lengkapi di menu Profil'}
                  </p>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">BPJS Ketenagakerjaan (KPJ)</p>
                  <p className="text-base font-extrabold text-[#102B69] font-mono tabular-nums mt-1.5">
                    {employee.bpjsKetenagakerjaanNumber || 'Belum didaftarkan'}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {employee.bpjsKetenagakerjaanNumber
                      ? 'Aktif · JHT, JKK, JKM & JP'
                      : 'Lengkapi di menu Profil'}
                  </p>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Sisa Kuota Cuti Tahunan</p>
                  <p className="text-2xl font-extrabold text-[#1468E8] tabular-nums mt-1">
                    {remainingAnnualLeave} / {store.policy.annualLeaveQuota} Hari
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    Alur: {store.policy.leaveApprovalFlow}
                  </p>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Kelengkapan 11 Berkas</p>
                  <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums mt-1">
                    {docProgress.completed} / {docProgress.total}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    Terintegrasi otomatis dengan HR Admin
                  </p>
                </div>
              </div>

              {/* Recent Attendance + Leave Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#102B69]">
                        Riwayat Presensi Terakhir Anda
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Sinkron real-time dengan laporan kehadiran HR &amp; Klien
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectMenu('emp-attendance')}
                      className="text-xs font-semibold text-[#1468E8] hover:underline cursor-pointer"
                    >
                      Buka Presensi
                    </button>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {myAttendanceLogs.slice(0, 4).map((log) => (
                      <div
                        key={log.id}
                        className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#102B69] tabular-nums">{log.dateLabel}</p>
                          <p className="text-[#64748B] mt-0.5">{log.locationUsed}</p>
                        </div>
                        <div className="text-right tabular-nums">
                          <p className="font-semibold text-[#172033]">
                            {log.checkIn} – {log.checkOut}
                          </p>
                          <p
                            className={`font-bold mt-0.5 ${
                              log.status === 'Hadir'
                                ? 'text-[#16A36A]'
                                : log.status === 'Telat'
                                  ? 'text-[#B87D00]'
                                  : 'text-[#1468E8]'
                            }`}
                          >
                            {log.status}
                            {log.faceVerified ? ` · Wajah ${log.faceMatchScore ?? 95}%` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {myAttendanceLogs.length === 0 && (
                      <p className="p-6 text-xs text-[#64748B]">
                        Belum ada catatan presensi tercatat.
                      </p>
                    )}
                  </div>
                </section>

                <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#102B69]">Akses Cepat Layanan Mandiri</h3>
                    <Building2 className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => selectMenu('emp-contract')}
                      className="w-full p-3 bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-[#102B69]">
                        Lihat &amp; Unduh Kontrak PKWT + Slip Gaji
                      </span>
                      <FileText className="w-4 h-4 text-[#1468E8] shrink-0" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectMenu('emp-activity')}
                      className="w-full p-3 bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-[#102B69]">
                        Catat / Update Laporan Kegiatan Kerja
                      </span>
                      <ClipboardList className="w-4 h-4 text-[#1468E8] shrink-0" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectMenu('emp-leave')}
                      className="w-full p-3 bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-[#102B69]">
                        Ajukan Cuti / Izin atau Klarifikasi Alpha
                      </span>
                      <CalendarCheck2
                        className="w-4 h-4 text-[#1468E8] shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectMenu('emp-profile')}
                      className="w-full p-3 bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-[#102B69]">
                        Perbarui No. BPJS, Rekening &amp; Kontak Darurat
                      </span>
                      <IdCard className="w-4 h-4 text-[#1468E8] shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU: LAPORAN & UPDATE KEGIATAN KARYAWAN                        */}
          {/* =============================================================== */}
          {activeMenu === 'emp-activity' && (
            <EmployeeActivityPanel
              employee={employee}
              reports={store.activityReports}
              onSubmitReport={(input) =>
                store.submitEmployeeActivityReport(employee.id, input, actorLabel)
              }
              onUpdateReport={(reportId, input) =>
                store.updateEmployeeActivityReport(reportId, employee.id, input, actorLabel)
              }
            />
          )}

          {/* =============================================================== */}
          {/* MENU 2: PRESENSI & JADWAL SAYA (STRICT FACE ANTI-SPOOF GATE)     */}
          {/* =============================================================== */}
          {activeMenu === 'emp-attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Gate Status & Biometric Action Card */}
                <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-[#102B69]">
                        Presensi Biometrik Wajah Anti-Spoof
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Wajib kamera langsung + kedip mata + toleh 3D + kecocokan wajah ≥ 82%
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        isFaceEnrolled ? 'text-[#16A36A]' : 'text-[#B87D00]'
                      }`}
                    >
                      {isFaceEnrolled ? 'Biometrik Terdaftar' : 'Belum Registrasi Wajah'}
                    </span>
                  </div>

                  {!isFaceEnrolled ? (
                    <div className="p-4 bg-[#FFF8EB] border border-[#F59E0B]/45 rounded-[6px] space-y-3">
                      <p className="text-xs font-bold text-[#102B69]">
                        Langkah Wajib 1: Daftarkan Wajah Asli Anda Terlebih Dahulu
                      </p>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        Saat berstatus Karyawan baru, Anda harus melakukan registrasi wajah sekali
                        melalui kamera langsung. Sistem menolak pas foto atau gambar statis saat
                        Clock-In maupun Clock-Out.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCameraMode('enroll')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#FF7A1A] hover:bg-[#E06810] rounded-[4px] cursor-pointer"
                      >
                        <ScanFace className="w-4 h-4" aria-hidden="true" />
                        <span>Registrasi Wajah Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {employee.faceBiometric?.referenceSnapshot && (
                          <img
                            src={employee.faceBiometric.referenceSnapshot}
                            alt={`Wajah terdaftar ${employee.fullName}`}
                            className="w-12 h-12 rounded-[4px] object-cover border border-[#BBF7D0]"
                          />
                        )}
                        <div className="text-xs">
                          <p className="font-bold text-[#16A36A]">
                            Wajah Asli Aktif untuk Presensi ({employee.faceBiometric?.enrolledAt})
                          </p>
                          <p className="text-[#64748B] mt-0.5">
                            Terkunci pada identitas {employee.employeeCode}. Hubungi Admin jika butuh reset ulang.
                          </p>
                        </div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-[#16A36A] shrink-0" aria-hidden="true" />
                    </div>
                  )}

                  {/* Clock-In & Clock-Out Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <button
                      type="button"
                      disabled={
                        !isFaceEnrolled ||
                        Boolean(todayAttendance && todayAttendance.checkIn !== '—')
                      }
                      onClick={() => handleOpenAttendanceCamera('checkin')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#128557] disabled:bg-[#CBD5E1] disabled:text-[#64748B] disabled:cursor-not-allowed rounded-[4px] cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {todayAttendance && todayAttendance.checkIn !== '—'
                          ? `Sudah Clock-In (${todayAttendance.checkIn})`
                          : 'Mulai Clock-In Wajah Live'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={
                        !isFaceEnrolled ||
                        !todayAttendance ||
                        todayAttendance.checkIn === '—' ||
                        todayAttendance.checkOut !== '—'
                      }
                      onClick={() => handleOpenAttendanceCamera('checkout')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:bg-[#CBD5E1] disabled:text-[#64748B] disabled:cursor-not-allowed rounded-[4px] cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {todayAttendance && todayAttendance.checkOut !== '—'
                          ? `Sudah Clock-Out (${todayAttendance.checkOut})`
                          : 'Mulai Clock-Out Wajah Live'}
                      </span>
                    </button>
                  </div>
                </section>

                {/* Schedule & Security Policy */}
                <section
                  data-testid="employee-attendance-policy-card"
                  className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                      <h3 className="text-sm font-bold text-[#102B69]">
                        Jadwal Wajib &amp; Kebijakan Klien
                      </h3>
                    </div>
                    <span
                      data-testid="employee-policy-source-badge"
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-[3px] border ${
                        workSchedule.isCustomClientOverride
                          ? 'bg-[#EAF2FF] text-[#1468E8] border-[#C9DDFB]'
                          : 'bg-[#F5F7FA] text-[#102B69] border-[#E2E8F0]'
                      }`}
                    >
                      {workSchedule.policySourceLabel}
                    </span>
                  </div>
                  <dl className="space-y-2.5 border-t border-[#E2E8F0] pt-3">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B]">Unit / Klien Penempatan</dt>
                      <dd className="font-semibold text-[#102B69] text-right">
                        <p>{employee.entityName}</p>
                        {employee.placementName && (
                          <p className="text-[11px] font-medium text-[#64748B] mt-0.5">
                            {employee.placementName}
                            {employee.placementArea ? ` (${employee.placementArea})` : ''}
                          </p>
                        )}
                        {employee.placementMapsUrl && isValidMapsUrl(employee.placementMapsUrl) && (
                          <a
                            href={employee.placementMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1468E8] hover:underline mt-0.5"
                          >
                            <span>Lihat Maps</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B]">Jam Kerja Wajib</dt>
                      <dd className="font-bold text-[#172033] tabular-nums">
                        {workSchedule.checkInTime} – {workSchedule.checkOutTime} WIB
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B]">Toleransi Keterlambatan</dt>
                      <dd className="font-semibold text-[#172033] tabular-nums">
                        {workSchedule.lateToleranceMinutes} menit (Lewat batas otomatis Telat)
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B]">Pola Hari Kerja</dt>
                      <dd className="font-semibold text-[#172033]">{workSchedule.workDays}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B]">Mode &amp; Titik Lokasi Absen</dt>
                      <dd className="font-semibold text-[#102B69] text-right tabular-nums">
                        <p>{workSchedule.locationMode}</p>
                        {workSchedule.matchedLocation && (
                          <p className="text-[11px] text-[#64748B] font-normal mt-0.5">
                            {workSchedule.matchedLocation.name} (Radius{' '}
                            {workSchedule.matchedLocation.radiusMeters}m)
                          </p>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[11px] text-[#64748B] leading-relaxed">
                    <strong className="text-[#102B69]">Aturan Presensi Mengikat:</strong> Status{' '}
                    <strong>Hadir</strong> atau <strong>Telat</strong> dihitung otomatis terhadap jam
                    masuk wajib ({workSchedule.checkInTime} WIB + toleransi{' '}
                    {workSchedule.lateToleranceMinutes} menit) sesuai{' '}
                    <strong>{workSchedule.policySourceLabel}</strong>.
                  </div>
                </section>
              </div>

              {/* Attendance Logs Table */}
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E2E8F0]">
                  <h3 className="text-sm font-bold text-[#102B69]">Riwayat Presensi Harian</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F5F7FA] border-b border-[#E2E8F0]">
                        <th className="py-3 px-6 text-xs font-semibold text-[#64748B]">Tanggal</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">Masuk – Pulang</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">Status</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">Lokasi &amp; Catatan</th>
                        <th className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                          Bukti Biometrik
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      {myAttendanceLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F5F7FA]/60">
                          <td className="py-3.5 px-6 font-semibold text-[#102B69] tabular-nums">
                            {log.dateLabel}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#172033] tabular-nums whitespace-nowrap">
                            {log.checkIn} – {log.checkOut}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`font-bold ${
                                log.status === 'Hadir'
                                  ? 'text-[#16A36A]'
                                  : log.status === 'Telat'
                                    ? 'text-[#B87D00]'
                                    : log.status === 'Alpha'
                                      ? 'text-[#DC3545]'
                                      : 'text-[#1468E8]'
                              }`}
                            >
                              {log.status}
                              {log.lateMinutes > 0 ? ` (${log.lateMinutes} mnt)` : ''}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-[#172033]">{log.locationUsed}</p>
                            <p className="text-[11px] text-[#64748B]">{log.notes}</p>
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            {log.faceVerified ? (
                              <div className="inline-flex items-center gap-2">
                                <span className="font-bold text-[#16A36A]">
                                  Valid ({log.faceMatchScore ?? 95}%)
                                </span>
                                {log.selfieSnapshot && (
                                  <button
                                    type="button"
                                    onClick={() => setSelfiePreviewLog(log)}
                                    className="px-2 py-1 text-[11px] font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] cursor-pointer"
                                  >
                                    Swafoto
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#64748B]">Standar</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 3: CUTI, IZIN SAKIT (WAJIB SKD) & CATATAN ALPHA             */}
          {/* =============================================================== */}
          {activeMenu === 'emp-leave' && (
            <div className="space-y-6">
              {/* 3 Quota & Attendance Discipline Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  data-testid="employee-leave-quota-card"
                  className="bg-white border border-[#E2E8F0] rounded-[6px] p-5"
                >
                  <p className="text-xs font-semibold text-[#64748B]">Sisa Jatah Cuti Tahunan</p>
                  <p className="text-2xl font-extrabold text-[#1468E8] tabular-nums mt-1">
                    {leaveQuota.remainingLeaveQuota} / {leaveQuota.annualLeaveQuota} Hari
                  </p>
                  <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                    Terpakai: <strong className="text-[#102B69]">{leaveQuota.approvedLeaveDays} hari</strong> ·
                    Menunggu: {leaveQuota.pendingLeaveDays} hari
                  </p>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">
                    Rekap Izin Sakit (Wajib SKD)
                  </p>
                  <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums mt-1">
                    {leaveQuota.approvedSickDays} Hari
                  </p>
                  <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                    Menunggu verifikasi SKD: {leaveQuota.pendingSickDays} hari
                  </p>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">
                    Catatan Alpha (Tanpa Keterangan)
                  </p>
                  <p className="text-2xl font-extrabold text-[#DC3545] tabular-nums mt-1">
                    {leaveQuota.alphaDays} Hari
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    Status Alpha mengikat &amp; tidak dapat diubah menjadi izin
                  </p>
                </div>
              </div>

              {myAlphaAlerts.length > 0 && (
                <section className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-5 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#DC3545] shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-[#DC3545]">
                          Catatan Alpha Bersifat Mengikat (Tanpa Keterangan)
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-[#DC3545] bg-white border border-[#FECACA] rounded-[3px]">
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          <span>Alpha Tetap Alpha</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#7F1D1D] leading-relaxed">
                        Sesuai kebijakan perusahaan, ketidakhadiran tanpa pengajuan resmi tercatat
                        permanen sebagai <strong>Alpha</strong> dan tidak dapat dikonversi menjadi
                        izin. Jika Anda berhalangan hadir karena sakit, wajib mengajukan{' '}
                        <strong>Izin Sakit</strong> dengan mengunggah{' '}
                        <strong>SKD (Surat Keterangan Dokter)</strong>.
                      </p>
                      {myAlphaAlerts.map((alpha) => (
                        <div
                          key={alpha.id}
                          className="p-3 bg-white border border-[#FECACA] rounded-[4px] flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#102B69] tabular-nums">
                              {alpha.dateRange} ({alpha.daysCount} hari)
                            </span>
                            <p className="text-[#64748B] mt-0.5">{alpha.reason}</p>
                          </div>
                          <span className="font-bold text-[#DC3545]">Alpha Mengikat</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {leaveFeedback && (
                <div
                  role="status"
                  data-testid="employee-leave-feedback"
                  className={`p-3.5 rounded-[6px] border text-xs font-semibold ${
                    leaveFeedback.ok
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
                  }`}
                >
                  {leaveFeedback.text}
                </div>
              )}

              <EmployeeLeavePanel
                employee={employee}
                allEmployees={store.employees}
                myLeaves={myLeaves}
                leaveQuota={leaveQuota}
                onSubmitLeave={(input) =>
                  store.submitEmployeeLeaveRequest(employee.employeeCode, input, actorLabel)
                }
                onOpenSkdPreview={(rec) => setPreviewSkdLeave(rec)}
                onFeedback={(fb) =>
                  setLeaveFeedback({ ok: fb.tone === 'success', text: fb.message })
                }
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 4: KONTRAK PKWT & SLIP                                      */}
          {/* =============================================================== */}
          {activeMenu === 'emp-contract' && (
            <div className="space-y-6">
              {/* Contract Summary & PDF */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#1468E8]">
                        Dokumen Perjanjian Kerja Resmi · {contractSequenceLabel} · NIK {employee.employeeCode}
                      </p>
                      <h2 className="text-base font-bold text-[#102B69] mt-0.5">
                        {myContract.contractType} · {myContract.contractNumber}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-[3px] border ${
                          pendingUnsignedContract
                            ? 'text-[#B87D00] bg-[#FFFBEB] border-[#FDE68A]'
                            : 'text-[#16A36A] bg-[#ECFDF5] border-[#A7F3D0]'
                        }`}
                      >
                        {pendingUnsignedContract ? 'Menunggu TTD Karyawan' : latestContractTtdStatus}
                      </span>
                      {eocIndicator.isExpiring && (
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-[3px] border ${
                            eocIndicator.severity === 'danger'
                              ? 'text-[#DC3545] bg-[#FEF2F2] border-[#FECACA]'
                              : 'text-[#B87D00] bg-[#FFFBEB] border-[#FDE68A]'
                          }`}
                        >
                          {eocIndicator.badgeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs">
                    <div>
                      <dt className="text-[#64748B]">Nama Karyawan &amp; NIK</dt>
                      <dd className="font-bold text-[#102B69] mt-0.5">
                        {employee.fullName} · <span className="font-mono">{employee.employeeCode}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#64748B]">Tahap Kontrak &amp; Status Arsip</dt>
                      <dd className="font-bold text-[#102B69] mt-0.5">
                        {contractSequenceLabel} · {latestContractTtdStatus}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#64748B]">Jabatan &amp; Penempatan</dt>
                      <dd className="font-semibold text-[#172033] mt-0.5">
                        <p>
                          {employee.position} · {employee.entityName}
                        </p>
                        {employee.placementName && (
                          <p className="text-[11px] text-[#64748B] mt-0.5">
                            Cabang: {employee.placementName}
                            {employee.placementArea ? ` (${employee.placementArea})` : ''}
                          </p>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#64748B]">Tanggal Mulai (Join) &amp; EOC</dt>
                      <dd className="font-bold text-[#102B69] tabular-nums mt-0.5">
                        {formatIndonesianDate(employee.joinDate)} →{' '}
                        {employee.contractType === 'PKWTT'
                          ? 'Karyawan Tetap (PKWTT)'
                          : formatIndonesianDate(employee.contractEndDate)}
                      </dd>
                    </div>
                  </dl>

                  {employee.contractType === 'PKWT' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPkwtPreviewTarget('active')}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer transition-colors"
                      >
                        <FileText className="w-4 h-4" aria-hidden="true" />
                        <span>Lihat &amp; Download PDF PKWT (Mode Baca)</span>
                      </button>
                      {(pendingUnsignedContract || contractHistory.length === 0) && (
                        <button
                          type="button"
                          onClick={() => selectMenu('emp-signature')}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#102B69] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white border border-[#C9DDFB] rounded-[4px] cursor-pointer transition-colors"
                        >
                          <PenTool className="w-4 h-4" aria-hidden="true" />
                          <span>Tandatangani di Menu TTD</span>
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* Compensation & BPJS Slip */}
                <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#64748B]">
                        Ringkasan Kompensasi &amp; Iuran BPJS
                      </p>
                      <h2 className="text-base font-bold text-[#102B69] mt-0.5">
                        Estimasi Slip Kompensasi Bulanan
                      </h2>
                    </div>
                    <span className="text-xs font-semibold text-[#64748B] tabular-nums">
                      Hadir {hadirCount} · Telat {telatCount}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs border-t border-b border-[#E2E8F0] py-4 tabular-nums">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[#64748B]">Gaji Pokok Penempatan</span>
                      <span className="font-bold text-[#102B69] whitespace-nowrap shrink-0">
                        {formatRupiahDot(baseSalary)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[#64748B]">
                        Potongan BPJS Kesehatan 1% ({employee.bpjsKesehatanNumber || 'Belum terdaftar'})
                      </span>
                      <span className="font-semibold text-[#DC3545] whitespace-nowrap shrink-0">
                        - {formatRupiahDot(bpjsKesEmployeeDeduction)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[#64748B]">
                        Potongan JHT BPJS Ketenagakerjaan 2% (
                        {employee.bpjsKetenagakerjaanNumber || 'Belum terdaftar'})
                      </span>
                      <span className="font-semibold text-[#DC3545] whitespace-nowrap shrink-0">
                        - {formatRupiahDot(bpjsTkJhtDeduction)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[#64748B]">Potongan Jaminan Pensiun (JP) 1%</span>
                      <span className="font-semibold text-[#DC3545] whitespace-nowrap shrink-0">
                        - {formatRupiahDot(bpjsTkJpDeduction)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#64748B]">Estimasi Diterima Bersih</p>
                      <p className="text-lg font-extrabold text-[#16A36A] tabular-nums">
                        {formatRupiahDot(estimatedNetSalary)}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-[#64748B]">Rekening Pencairan</p>
                      <p className="font-bold text-[#102B69] font-mono tabular-nums">
                        {employee.bankName} · {maskSensitiveNumber(employee.bankAccountNumber, 3, 4)}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Arsip Slip Gaji Resmi (Sudah ACC Master Admin) */}
              <section
                aria-label="Arsip Slip Gaji Resmi"
                data-testid="employee-payslips-section"
                className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <div>
                      <h2 className="text-sm font-bold text-[#102B69]">
                        Arsip Slip Gaji Resmi ({myPublishedSlips.length})
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Slip gaji resmi dari tim Payroll yang telah di-ACC Master Admin. Klik untuk pratinjau rincian atau unduh PDF A4.
                      </p>
                    </div>
                  </div>
                </div>

                {myPublishedSlips.length === 0 ? (
                  <p className="p-6 text-xs text-[#64748B]">
                    Belum ada slip gaji resmi yang diterbitkan untuk akun Anda pada periode berjalan.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {myPublishedSlips.map((slip) => {
                      const totalComp = slip.pkwtCompensation + slip.otherCompensation;
                      return (
                        <div
                          key={slip.id}
                          data-testid={`employee-slip-row-${slip.period}`}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-[#F5F7FA]/60 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-[#102B69]">
                                {slip.periodLabel}
                              </span>
                              <span className="font-mono text-[#64748B]">{slip.period}</span>
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-[3px] border text-[#16A36A] bg-[#ECFDF5] border-[#A7F3D0]">
                                Resmi · Terbit
                              </span>
                              <span className="text-[11px] font-medium text-[#64748B]">
                                {slip.calculationSource}
                              </span>
                            </div>
                            <p className="text-[#172033] tabular-nums">
                              Bruto: <strong>{formatRupiahDot(slip.grossIncome)}</strong> · Potongan:{' '}
                              <strong className="text-[#DC3545]">
                                - {formatRupiahDot(slip.totalDeductions)}
                              </strong>{' '}
                              {totalComp > 0 && (
                                <>
                                  · Kompensasi:{' '}
                                  <strong className="text-[#1468E8]">
                                    + {formatRupiahDot(totalComp)}
                                  </strong>
                                </>
                              )}
                            </p>
                            <p className="text-[11px] text-[#64748B] tabular-nums">
                              Basis: {slip.baseSalarySourceTag} · Disetujui oleh{' '}
                              {slip.approvedBy || 'Master Admin'} ({slip.approvedAt || 'Tercatat'})
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right tabular-nums">
                              <p className="text-[11px] text-[#64748B]">Take Home Pay (THP)</p>
                              <p className="text-sm font-extrabold text-[#16A36A]">
                                {formatRupiahDot(slip.takeHomePay)}
                              </p>
                            </div>
                            <button
                              type="button"
                              data-testid={`open-emp-slip-${slip.period}`}
                              onClick={() => setSelectedSlipModal(slip)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Lihat &amp; Unduh PDF</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Riwayat Kontrak Saya (Arsip Read-Only) */}
              <section
                aria-label="Riwayat Kontrak Saya"
                className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <div>
                      <h2 className="text-sm font-bold text-[#102B69]">
                        Riwayat Kontrak Saya ({contractHistory.length})
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Arsip seluruh periode PKWT / PKWTT. Dokumen yang sudah ditandatangani terkunci permanen (hanya dapat dilihat &amp; diunduh PDF-nya).
                      </p>
                    </div>
                  </div>
                </div>

                {contractHistory.length === 0 ? (
                  <p className="p-6 text-xs text-[#64748B]">
                    Belum ada riwayat arsip kontrak tambahan. Kontrak aktif saat ini tertera pada ringkasan di atas.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {contractHistory.map((hist) => {
                      const isWaiting = hist.signatureStatus === 'Menunggu TTD Karyawan';
                      const isSigned = isContractSignedLocked(hist.signatureStatus);
                      return (
                        <div
                          key={hist.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-[#102B69]">
                                {hist.sequenceLabel}
                              </span>
                              <span className="font-mono text-[#64748B]">{hist.contractNumber}</span>
                              <span
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-[3px] border ${
                                  isWaiting
                                    ? 'text-[#B87D00] bg-[#FFFBEB] border-[#FDE68A]'
                                    : isSigned
                                      ? 'text-[#16A36A] bg-[#ECFDF5] border-[#A7F3D0]'
                                      : 'text-[#64748B] bg-[#F5F7FA] border-[#E2E8F0]'
                                }`}
                              >
                                {hist.signatureStatus}
                              </span>
                              {isSigned && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#102B69]">
                                  <Lock className="w-3 h-3 text-[#1468E8]" aria-hidden="true" />
                                  <span>Terkunci · Read-Only</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[#172033] font-medium">
                              {hist.position} · {hist.entityName}
                              {hist.placementName ? ` (${hist.placementName})` : ''}
                            </p>
                            <p className="text-[#64748B] tabular-nums">
                              Periode: {formatIndonesianDate(hist.startDate)} –{' '}
                              {hist.endDate ? formatIndonesianDate(hist.endDate) : 'Tetap'}
                              {hist.signedAt ? ` · Ditandatangani: ${hist.signedAt}` : ''}
                            </p>
                            {hist.notes && <p className="text-[11px] text-[#64748B]">{hist.notes}</p>}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {hist.employeeSignatureDataUrl && (
                              <img
                                src={hist.employeeSignatureDataUrl}
                                alt={`TTD ${employee.fullName}`}
                                className="h-10 w-24 object-contain bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] p-1"
                              />
                            )}
                            {hist.contractType === 'PKWT' && (
                              <button
                                type="button"
                                onClick={() => setPkwtPreviewTarget(hist)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                                <span>{isSigned ? 'Lihat & Unduh PDF' : 'Lihat PKWT'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 4B: MENU TTD (SPESIMEN TTD PRIBADI + TTD PKWT / PERPANJANGAN) */}
          {/* =============================================================== */}
          {activeMenu === 'emp-signature' && (
            <div className="space-y-6">
              {/* 1. Saved Personal Digital Signature Specimen */}
              <section
                aria-label="Pengaturan Tanda Tangan Digital Saya"
                data-testid="emp-saved-signature-panel"
                className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-[#102B69] flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                      <span>Tanda Tangan Digital Pribadi ({employee.fullName})</span>
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1">
                      Simpan tanda tangan digital resmi Anda di sini. Apabila nanti Super Admin / Admin menerbitkan kontrak baru atau perpanjangan PKWT, TTD tidak terpasang otomatis — Anda wajib meninjau isi dokumennya terlebih dahulu sebelum menyetujui &amp; menandatangani.
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold shrink-0 whitespace-nowrap pt-0.5 ${
                      employee.savedSignatureDataUrl ? 'text-[#16A36A]' : 'text-[#B87D00]'
                    }`}
                  >
                    {employee.savedSignatureDataUrl ? 'TTD Tersimpan Aktif' : 'Belum Disetel'}
                  </span>
                </div>

                {savedSigFeedback && (
                  <div
                    role="status"
                    className={`p-3 rounded-[4px] border text-xs font-semibold ${
                      savedSigFeedback.ok
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
                    }`}
                  >
                    {savedSigFeedback.text}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-4 p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[6px] space-y-2.5 text-xs">
                    <p className="font-bold text-[#102B69]">Spesimen TTD Tersimpan Saat Ini</p>
                    {employee.savedSignatureDataUrl ? (
                      <>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-3 flex items-center justify-center">
                          <img
                            src={employee.savedSignatureDataUrl}
                            alt={`Spesimen TTD tersimpan ${employee.fullName}`}
                            className="max-h-28 w-auto object-contain"
                          />
                        </div>
                        <p className="text-[11px] text-[#64748B]">
                          Terakhir diperbarui: {employee.savedSignatureUpdatedAt || 'Hari ini'}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-[#64748B] py-6 text-center bg-white border border-dashed border-[#CBD5E1] rounded-[4px]">
                        Belum ada spesimen TTD tersimpan. Goreskan TTD di samping lalu klik Simpan.
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleSaveSignatureSpecimen} className="lg:col-span-8 space-y-3 text-xs">
                    <DigitalSignaturePad
                      value={savedSigDraft}
                      onChange={setSavedSigDraft}
                      signerLabel={employee.fullName}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        data-testid="save-personal-signature-btn"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {employee.savedSignatureDataUrl
                            ? 'Perbarui Spesimen TTD Saya'
                            : 'Simpan TTD Saya'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              {/* 2. Pending PKWT / Extension Review & Signing Queue */}
              <section
                aria-label="Kontrak PKWT Menunggu Tanda Tangan"
                data-testid="emp-pkwt-sign-section"
                className="bg-white border border-[#1468E8]/40 rounded-[6px] p-6 space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#102B69]">
                      Tinjauan &amp; Tanda Tangan PKWT ({pendingUnsignedContract?.sequenceLabel ?? contractSequenceLabel})
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Kontrak baru maupun perpanjangan tidak langsung tertempel TTD. Baca draf surat lengkapnya terlebih dahulu, lalu setujui &amp; tandatangani secara sadar.
                    </p>
                  </div>
                </div>

                {pkwtSignFeedback && (
                  <div
                    role="status"
                    className={`p-3 rounded-[4px] border text-xs font-semibold ${
                      pkwtSignFeedback.ok
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
                    }`}
                  >
                    {pkwtSignFeedback.text}
                  </div>
                )}

                {pendingUnsignedContract ||
                (employee.contractType === 'PKWT' && contractHistory.length === 0) ? (
                  <form onSubmit={handleSignPkwtSubmit} className="space-y-4 text-xs">
                    <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-[#102B69]">
                          {pendingUnsignedContract?.sequenceLabel ?? 'PKWT Ke-1'} ·{' '}
                          <span className="font-mono">
                            {pendingUnsignedContract?.contractNumber ?? myContract.contractNumber}
                          </span>
                        </p>
                        <p className="text-[#172033]">
                          {pendingUnsignedContract?.position ?? employee.position} ·{' '}
                          {pendingUnsignedContract?.entityName ?? employee.entityName}
                        </p>
                        <p className="text-[#64748B] tabular-nums">
                          Periode:{' '}
                          {formatIndonesianDate(
                            pendingUnsignedContract?.startDate ?? employee.joinDate
                          )}{' '}
                          s/d{' '}
                          {formatIndonesianDate(
                            pendingUnsignedContract?.endDate ?? employee.contractEndDate
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPkwtPreviewTarget(pendingUnsignedContract ?? 'active')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-[#1468E8] bg-white hover:bg-[#1468E8] hover:text-white border border-[#C9DDFB] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Baca Draf PKWT (4 Halaman)</span>
                      </button>
                    </div>

                    {employee.savedSignatureDataUrl && (
                      <div className="inline-flex p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                        <button
                          type="button"
                          onClick={() => setSignSourceMode('saved')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] cursor-pointer ${
                            signSourceMode === 'saved'
                              ? 'bg-[#1468E8] text-white'
                              : 'text-[#64748B] hover:text-[#102B69]'
                          }`}
                        >
                          Pakai TTD Tersimpan Saya
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignSourceMode('draw')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] cursor-pointer ${
                            signSourceMode === 'draw'
                              ? 'bg-[#1468E8] text-white'
                              : 'text-[#64748B] hover:text-[#102B69]'
                          }`}
                        >
                          Gores TTD Baru di Kanvas
                        </button>
                      </div>
                    )}

                    {signSourceMode === 'saved' && employee.savedSignatureDataUrl ? (
                      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] space-y-2">
                        <p className="font-semibold text-[#102B69]">
                          Tanda tangan digital berikut akan dibubuhkan ke Halaman 3 &amp; 4 PKWT ini setelah Anda menyetujui:
                        </p>
                        <img
                          src={employee.savedSignatureDataUrl}
                          alt={`TTD tersimpan ${employee.fullName}`}
                          className="h-24 w-56 object-contain bg-white border border-[#E2E8F0] rounded-[4px] p-2"
                        />
                      </div>
                    ) : (
                      <DigitalSignaturePad
                        value={pkwtSignatureDataUrl}
                        onChange={setPkwtSignatureDataUrl}
                        signerLabel={employee.fullName}
                      />
                    )}

                    <label className="inline-flex items-start gap-2.5 text-[#172033] font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkwtConsentChecked}
                        onChange={(e) => setPkwtConsentChecked(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Saya telah melihat, membaca seluruh isi perjanjian kerja PKWT ini (Pasal 1 s/d Pasal 8), dan menyetujuinya secara hukum. Setelah ditandatangani, dokumen tersimpan permanen &amp; tidak dapat diedit.
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="submit"
                        data-testid="menu-ttd-submit-pkwt"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#102B69] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>Setujui &amp; Tandatangani PKWT</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs text-[#64748B]">
                    Tidak ada dokumen PKWT yang menunggu tanda tangan saat ini. Jika nanti HR / Super Admin menerbitkan perpanjangan PKWT baru, kontrak akan muncul di sini untuk Anda tinjau sebelum ditandatangani.
                  </p>
                )}
              </section>

              {/* 3. Signed & Locked Archive */}
              <section
                aria-label="Arsip PKWT Selesai TTD"
                className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#102B69] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#16A36A]" aria-hidden="true" />
                      <span>Arsip PKWT Tersimpan &amp; Terkunci Permanen</span>
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Dokumen yang sudah selesai di-TTD tersimpan aman, hanya bisa dilihat dan diunduh PDF-nya (tidak dapat diedit kembali).
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-[#E2E8F0]">
                  {contractHistory.filter((h) => isContractSignedLocked(h.signatureStatus)).length ===
                  0 ? (
                    <p className="p-6 text-xs text-[#64748B]">
                      Belum ada kontrak PKWT yang selesai ditandatangani.
                    </p>
                  ) : (
                    contractHistory
                      .filter((h) => isContractSignedLocked(h.signatureStatus))
                      .map((hist) => (
                        <div
                          key={hist.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-[#102B69]">
                                {hist.sequenceLabel}
                              </span>
                              <span className="font-mono text-[#64748B]">{hist.contractNumber}</span>
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-[3px] border text-[#16A36A] bg-[#ECFDF5] border-[#A7F3D0]">
                                {hist.signatureStatus}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#102B69]">
                                <Lock className="w-3 h-3 text-[#1468E8]" aria-hidden="true" />
                                <span>Terkunci · Read-Only</span>
                              </span>
                            </div>
                            <p className="text-[#64748B] tabular-nums">
                              Periode: {formatIndonesianDate(hist.startDate)} –{' '}
                              {hist.endDate ? formatIndonesianDate(hist.endDate) : 'Tetap'}
                              {hist.signedAt ? ` · TTD: ${hist.signedAt}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {hist.employeeSignatureDataUrl && (
                              <img
                                src={hist.employeeSignatureDataUrl}
                                alt={`TTD ${employee.fullName}`}
                                className="h-10 w-24 object-contain bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] p-1"
                              />
                            )}
                            {hist.contractType === 'PKWT' && (
                              <button
                                type="button"
                                onClick={() => setPkwtPreviewTarget(hist)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-[#102B69] hover:bg-[#1468E8] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Lihat &amp; Unduh PDF</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 5: PROFIL, BPJS & DOKUMEN                                   */}
          {/* =============================================================== */}
          {activeMenu === 'emp-profile' && (
            <div className="space-y-6">
              {/* Biometric Card */}
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ScanFace className="w-6 h-6 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-bold text-[#102B69]">
                      Keamanan Biometrik Wajah Presensi
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {isFaceEnrolled
                        ? `Terdaftar pada ${employee.faceBiometric?.enrolledAt}. Perubahan/reset wajah hanya dapat dilakukan oleh HR Admin.`
                        : 'Anda belum mendaftarkan wajah asli. Wajib daftar sekali sebelum melakukan presensi.'}
                    </p>
                  </div>
                </div>
                {!isFaceEnrolled ? (
                  <button
                    type="button"
                    onClick={() => setCameraMode('enroll')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] shrink-0 cursor-pointer"
                  >
                    Daftarkan Wajah
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A36A] shrink-0">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Terkunci Aman
                  </span>
                )}
              </section>

              {/* Self-Service Account Security & PIN Change Card */}
              <section
                data-testid="employee-self-password-card"
                className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-start gap-2.5">
                    <KeyRound className="w-5 h-5 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h2 className="text-sm font-bold text-[#102B69]">
                        Keamanan Akun Login &amp; Ubah PIN / Kata Sandi
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        ID Login Anda: <strong className="font-mono text-[#102B69]">{employee.employeeCode}</strong> (atau email <span className="font-medium text-[#172033]">{employee.email}</span>). Anda dapat mengganti PIN default dari HR Admin kapan saja.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSelfPins((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#172033] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px] cursor-pointer self-start sm:self-auto"
                  >
                    {showSelfPins ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#64748B]" aria-hidden="true" />
                        <span>Sembunyikan Karakter</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                        <span>Tampilkan Karakter</span>
                      </>
                    )}
                  </button>
                </div>

                {pinChangeFeedback && (
                  <div
                    role="status"
                    data-testid="employee-self-password-feedback"
                    className={`px-3.5 py-2.5 rounded-[4px] border text-xs font-medium flex items-center justify-between gap-3 ${
                      pinChangeFeedback.ok
                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    <span>{pinChangeFeedback.text}</span>
                    <button
                      type="button"
                      onClick={() => setPinChangeFeedback(null)}
                      className="text-[11px] font-bold underline cursor-pointer shrink-0"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleChangeSelfPassword}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label
                      htmlFor="self-current-pin"
                      className="block text-[11px] font-semibold text-[#172033] mb-1"
                    >
                      PIN / Sandi Saat Ini <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="self-current-pin"
                      type={showSelfPins ? 'text' : 'password'}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="Contoh: 1234"
                      required
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="self-new-pin"
                      className="block text-[11px] font-semibold text-[#172033] mb-1"
                    >
                      PIN / Sandi Baru (Min. 4 Karakter) <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="self-new-pin"
                      type={showSelfPins ? 'text' : 'password'}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="Masukkan sandi baru"
                      required
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="self-confirm-pin"
                      className="block text-[11px] font-semibold text-[#172033] mb-1"
                    >
                      Ulangi PIN / Sandi Baru <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="self-confirm-pin"
                      type={showSelfPins ? 'text' : 'password'}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      placeholder="Konfirmasi sandi baru"
                      required
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      data-testid="employee-self-password-submit"
                      className="w-full px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
                    >
                      Simpan PIN Baru
                    </button>
                  </div>
                </form>
              </section>

              {/* Read-Only KTP & Employment Summary (incl. Kontrak Ke-N, Tanggal Join, EOC) */}
              <section
                data-testid="emp-profile-employment-summary"
                className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4"
              >
                <h2 className="text-sm font-bold text-[#102B69] border-b border-[#E2E8F0] pb-2">
                  Identitas Induk Karyawan, Kontrak &amp; Penempatan (Dikelola HR / Super Admin)
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <dt className="text-[#64748B]">NIK (Nomor Induk Karyawan)</dt>
                    <dd className="font-bold text-[#102B69] mt-0.5 tabular-nums font-mono">
                      {employee.employeeCode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Nama Lengkap (KTP)</dt>
                    <dd className="font-bold text-[#172033] mt-0.5">{employee.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">NIK KTP (16 Digit)</dt>
                    <dd className="font-mono font-semibold text-[#172033] mt-0.5">
                      {employee.nik}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Nomor KK (16 Digit)</dt>
                    <dd className="font-mono font-semibold text-[#172033] mt-0.5">
                      {employee.kkNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Kontrak Ke Berapa &amp; Nomor</dt>
                    <dd className="font-bold text-[#102B69] mt-0.5">
                      {contractSequenceLabel} ·{' '}
                      <span className="font-mono font-semibold text-[#172033]">
                        {employee.contractNumber || myContract.contractNumber}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Status TTD Kontrak</dt>
                    <dd
                      className={`font-bold mt-0.5 ${
                        latestContractTtdStatus === 'Menunggu TTD Karyawan'
                          ? 'text-[#B87D00]'
                          : 'text-[#16A36A]'
                      }`}
                    >
                      {latestContractTtdStatus}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Tanggal Join (Mulai Kerja)</dt>
                    <dd className="font-bold text-[#172033] tabular-nums mt-0.5">
                      {formatIndonesianDate(employee.joinDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#64748B]">Tanggal EOC (Berakhir Kontrak)</dt>
                    <dd className="font-bold text-[#102B69] tabular-nums mt-0.5">
                      {employee.contractType === 'PKWTT'
                        ? 'Karyawan Tetap (PKWTT)'
                        : `${formatIndonesianDate(employee.contractEndDate)}${
                            contractDaysRemaining !== null
                              ? ` (Sisa ${contractDaysRemaining} hari)`
                              : ''
                          }`}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-[#E2E8F0]">
                    <dt className="text-[#64748B]">Penempatan Klien &amp; Cabang / Area</dt>
                    <dd className="font-semibold text-[#102B69] mt-0.5 flex flex-wrap items-center gap-3">
                      <span>
                        {employee.entityName}
                        {employee.placementName ? ` — Cabang ${employee.placementName}` : ''}
                        {employee.placementArea ? ` (${employee.placementArea})` : ''}
                      </span>
                      {employee.placementMapsUrl && isValidMapsUrl(employee.placementMapsUrl) && (
                        <a
                          href={employee.placementMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#1468E8] hover:underline"
                        >
                          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Lihat Maps Lokasi</span>
                        </a>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Digital & Uploaded BPJS Cards Section */}
              <section
                aria-label="Kartu BPJS Kesehatan dan BPJS Ketenagakerjaan"
                className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4"
              >
                <div className="border-b border-[#E2E8F0] pb-3">
                  <h2 className="text-sm font-bold text-[#102B69]">
                    Kartu Kepesertaan BPJS Kesehatan (JKN-KIS) &amp; BPJS Ketenagakerjaan (KPJ)
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Anda dapat melihat &amp; mengunduh kartu BPJS digital maupun mengunggah scan/PDF kartu asli agar sinkron ke Admin &amp; Super Admin.
                  </p>
                </div>
                <BpjsCardsSection
                  employee={employee}
                  editable={true}
                  onUploadCard={(kind, fileName, dataUrl) => {
                    store.updateEmployeeSelfProfile(
                      employee.id,
                      kind === 'kesehatan'
                        ? {
                            bpjsKesehatanCardName: fileName,
                            bpjsKesehatanCardDataUrl: dataUrl,
                          }
                        : {
                            bpjsKetenagakerjaanCardName: fileName,
                            bpjsKetenagakerjaanCardDataUrl: dataUrl,
                          },
                      actorLabel
                    );
                    setProfileSavedNotice(
                      `Scan Kartu ${kind === 'kesehatan' ? 'BPJS Kesehatan' : 'BPJS Ketenagakerjaan'} (${fileName}) berhasil diunggah & disinkronkan ke Super Admin.`
                    );
                  }}
                />
              </section>

              {/* Self-Service Editable Form: Kontak, BPJS, Rekening */}
              <form
                onSubmit={handleSaveSelfProfile}
                noValidate
                className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#102B69]">
                      Data BPJS Kesehatan, BPJS Ketenagakerjaan, Kontak &amp; Rekening
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Pembaruan mandiri langsung tersinkron ke Database Karyawan Admin &amp; Master Admin
                    </p>
                  </div>
                  <UserCheck className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                </div>

                {profileSavedNotice && (
                  <div
                    role="status"
                    className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[4px] text-[#16A36A] font-semibold"
                  >
                    {profileSavedNotice}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="selfBpjsKes" className="block font-semibold text-[#172033] mb-1">
                      No. BPJS Kesehatan (JKN-KIS)
                    </label>
                    <input
                      id="selfBpjsKes"
                      type="text"
                      maxLength={13}
                      value={profileForm.bpjsKesehatanNumber}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          bpjsKesehatanNumber: e.target.value.replace(/[^0-9]/g, ''),
                        })
                      }
                      placeholder="13 digit kartu JKN-KIS"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                    {profileErrors.bpjsKesehatanNumber && (
                      <p className="text-[#DC3545] mt-1">{profileErrors.bpjsKesehatanNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="selfBpjsTk" className="block font-semibold text-[#172033] mb-1">
                      No. BPJS Ketenagakerjaan (KPJ)
                    </label>
                    <input
                      id="selfBpjsTk"
                      type="text"
                      maxLength={16}
                      value={profileForm.bpjsKetenagakerjaanNumber}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          bpjsKetenagakerjaanNumber: e.target.value.replace(/[^A-Za-z0-9]/g, ''),
                        })
                      }
                      placeholder="11–16 karakter nomor KPJ"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                    {profileErrors.bpjsKetenagakerjaanNumber && (
                      <p className="text-[#DC3545] mt-1">
                        {profileErrors.bpjsKetenagakerjaanNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="selfNpwp" className="block font-semibold text-[#172033] mb-1">
                      NPWP
                    </label>
                    <input
                      id="selfNpwp"
                      type="text"
                      value={profileForm.npwpNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, npwpNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="selfWa" className="block font-semibold text-[#172033] mb-1">
                      No. WhatsApp Aktif *
                    </label>
                    <input
                      id="selfWa"
                      type="tel"
                      value={profileForm.whatsappNumber}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, whatsappNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                    />
                    {profileErrors.whatsappNumber && (
                      <p className="text-[#DC3545] mt-1">{profileErrors.whatsappNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="selfEmail" className="block font-semibold text-[#172033] mb-1">
                      Email Pribadi / Kerja *
                    </label>
                    <input
                      id="selfEmail"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                    {profileErrors.email && (
                      <p className="text-[#DC3545] mt-1">{profileErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="selfBankName" className="block font-semibold text-[#172033] mb-1">
                      Nama Bank
                    </label>
                    <input
                      id="selfBankName"
                      type="text"
                      value={profileForm.bankName}
                      onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="selfBankAcct" className="block font-semibold text-[#172033] mb-1">
                      Nomor Rekening *
                    </label>
                    <input
                      id="selfBankAcct"
                      type="text"
                      value={profileForm.bankAccountNumber}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          bankAccountNumber: e.target.value.replace(/[^0-9]/g, ''),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                    />
                    {profileErrors.bankAccountNumber && (
                      <p className="text-[#DC3545] mt-1">{profileErrors.bankAccountNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="selfEmergencyName" className="block font-semibold text-[#172033] mb-1">
                      Nama Kontak Darurat
                    </label>
                    <input
                      id="selfEmergencyName"
                      type="text"
                      value={profileForm.emergencyName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, emergencyName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="selfEmergencyPhone" className="block font-semibold text-[#172033] mb-1">
                      No. Telp Kontak Darurat
                    </label>
                    <input
                      id="selfEmergencyPhone"
                      type="tel"
                      value={profileForm.emergencyPhone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, emergencyPhone: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 font-semibold text-[#102B69] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileForm.domicileSameAsKtp}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, domicileSameAsKtp: e.target.checked })
                      }
                    />
                    <span>Alamat domisili saat ini sama dengan KTP</span>
                  </label>
                  {!profileForm.domicileSameAsKtp && (
                    <input
                      type="text"
                      value={profileForm.domicileAddress}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, domicileAddress: e.target.value })
                      }
                      placeholder="Tuliskan alamat domisili lengkap saat ini"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer transition-colors"
                  >
                    Simpan Perubahan Profil &amp; BPJS
                  </button>
                </div>
              </form>

              {/* 11 Document Vault */}
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#102B69] border-b border-[#E2E8F0] pb-2">
                  Status Kelengkapan 11 Berkas Karyawan ({docProgress.completed}/{docProgress.total})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {DOCUMENT_CHECKLIST_ITEMS.map((doc) => {
                    const available = Boolean(employee.documents[doc.key]);
                    return (
                      <div
                        key={doc.key}
                        className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] flex flex-col justify-between gap-2"
                      >
                        <div>
                          <p className="font-semibold text-[#172033]">{doc.label}</p>
                          <p
                            className={`font-bold mt-1 ${
                              available ? 'text-[#16A36A]' : 'text-[#B87D00]'
                            }`}
                          >
                            {available ? 'Tersedia' : 'Menunggu Berkas'}
                          </p>
                        </div>
                        {doc.key !== 'contractUploaded' && (
                          <button
                            type="button"
                            onClick={() => handleToggleSelfDocument(doc.key)}
                            className="text-[11px] font-semibold text-[#1468E8] hover:underline text-left cursor-pointer"
                          >
                            {available ? 'Tandai Perbarui Ulang' : 'Konfirmasi Berkas Tersedia'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Live Face Enrollment / Anti-Spoof Attendance Camera Modal */}
      {cameraMode && (
        <FaceAttendanceCameraModal
          mode={cameraMode}
          employee={employee}
          locations={store.policy.attendanceLocations}
          workSchedule={workSchedule}
          onClose={() => setCameraMode(null)}
          onCompleteEnrollment={(descriptor, snapshot) => {
            store.enrollEmployeeFace(employee.id, descriptor, snapshot, actorLabel);
            setCameraMode(null);
            setActionFeedback({
              ok: true,
              text: 'Registrasi biometrik wajah berhasil! Sekarang Anda dapat melakukan Clock-In / Clock-Out menggunakan wajah asli Anda.',
            });
          }}
          onCompleteAttendance={(payload) => {
            const modeType = cameraMode === 'checkout' ? 'checkout' : 'checkin';
            const res = store.recordEmployeeAttendance(
              employee.employeeCode,
              modeType,
              payload,
              actorLabel
            );
            if (res.ok) {
              setCameraMode(null);
              setActionFeedback({ ok: true, text: res.message });
            }
            return res;
          }}
        />
      )}

      {/* Official 4-page PKWT PDF Modal */}
      {pkwtPreviewTarget && (() => {
        const scopedHistory =
          pkwtPreviewTarget === 'active' ? undefined : pkwtPreviewTarget;
        const contractForModal = scopedHistory
          ? {
              ...myContract,
              contractNumber: scopedHistory.contractNumber,
              contractType: scopedHistory.contractType,
              startDate: scopedHistory.startDate,
              endDate: scopedHistory.endDate,
              daysRemaining: calculateDaysRemaining(scopedHistory.endDate),
            }
          : myContract;
        const employeeForModal = scopedHistory
          ? {
              ...employee,
              contractNumber: scopedHistory.contractNumber,
              joinDate: scopedHistory.startDate,
              contractEndDate: scopedHistory.endDate,
              position: scopedHistory.position,
              placementName: scopedHistory.placementName ?? employee.placementName,
              contractHistory: [scopedHistory],
            }
          : employee;
        const targetHistoryItem =
          scopedHistory ??
          employee.contractHistory?.find((h) => h.contractNumber === contractForModal.contractNumber) ??
          pendingUnsignedContract ??
          undefined;
        const canSignThisModal =
          canSignContractHistoryItem(targetHistoryItem) ||
          (employee.contractType === 'PKWT' && contractHistory.length === 0);
        return (
          <PkwtDocumentModal
            contract={contractForModal}
            employee={employeeForModal}
            settings={store.settings}
            readOnly={true}
            canSignNow={canSignThisModal}
            savedSignatureDataUrl={employee.savedSignatureDataUrl}
            onSignContract={(sigUrl) =>
              store.signEmployeePkwtDigitally(
                employee.id,
                sigUrl,
                actorLabel,
                contractForModal.contractNumber
              )
            }
            onGoToSignatureMenu={() => {
              setPkwtPreviewTarget(null);
              selectMenu('emp-signature');
            }}
            onClose={() => setPkwtPreviewTarget(null)}
          />
        );
      })()}

      {/* Selfie Proof Modal for Employee History */}
      {selfiePreviewLog && selfiePreviewLog.selfieSnapshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-selfie-title"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-between">
              <h3 id="emp-selfie-title" className="text-sm font-bold text-[#102B69]">
                Swafoto Presensi · {selfiePreviewLog.dateLabel}
              </h3>
              <button
                type="button"
                onClick={() => setSelfiePreviewLog(null)}
                aria-label="Tutup swafoto presensi"
                className="p-1 text-[#64748B] hover:text-[#102B69] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <img
                src={selfiePreviewLog.selfieSnapshot}
                alt={`Swafoto presensi ${employee.fullName}`}
                className="w-full h-64 object-cover rounded-[4px] border border-[#E2E8F0]"
              />
              <p className="font-semibold text-[#16A36A]">
                Terverifikasi Liveness 3D · Kecocokan Wajah {selfiePreviewLog.faceMatchScore ?? 95}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SKD Medical Certificate Preview Modal for Employee */}
      {previewSkdLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Surat Keterangan Dokter"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-xl overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-[#102B69] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                Lampiran SKD · {previewSkdLeave.skdFileName || 'Surat_Keterangan_Dokter.pdf'}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewSkdLeave(null)}
                aria-label="Tutup pratinjau SKD"
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {previewSkdLeave.skdFileDataUrl && (
                <div className="border border-[#E2E8F0] rounded-[6px] bg-[#F8FAFC] p-3 flex items-center justify-center">
                  <img
                    src={previewSkdLeave.skdFileDataUrl}
                    alt={`Surat Keterangan Dokter ${employee.fullName}`}
                    className="max-h-[320px] w-auto object-contain rounded-[4px]"
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#64748B]">
                  Klinik: <strong>{previewSkdLeave.doctorOrClinicName || 'Klinik Rekanan'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewSkdLeave(null)}
                  className="px-3 py-1.5 font-semibold text-[#102B69] bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSlipModal && (
        <SlipGajiModal
          slip={selectedSlipModal}
          settings={store.settings}
          onClose={() => setSelectedSlipModal(null)}
        />
      )}
    </div>
  );
};
