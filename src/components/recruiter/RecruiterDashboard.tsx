import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { PevoraLogo } from '../PevoraLogo';
import type { MasterAdminUser } from '../../utils/validation';
import type { WorkspaceStore } from '../../hooks/useWorkspaceStore';
import {
  DOCUMENT_CHECKLIST_ITEMS,
  EmployeeRecord,
  EmploymentCategory,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  formatIndonesianDate,
} from '../../data/masterAdminData';
import {
  APPLICATION_STAGES_ORDER,
  ApplicantProfileRecord,
  ApplicationStage,
  InterviewScheduleRecord,
  JobApplicationRecord,
  JobVacancyRecord,
  VacancyStatus,
  calculateApplicantProfileCompleteness,
  computeRemainingHeadcount,
  filterApplicationsForRecruiter,
  formatSalaryRangeRupiah,
  getDistinctClientNames,
} from '../../data/recruitmentData';

type RecruiterMenuId =
  | 'rec-overview'
  | 'rec-vacancies'
  | 'rec-pipeline'
  | 'rec-interviews'
  | 'rec-handoff'
  | 'rec-reports';

interface RecruiterDashboardProps {
  user: MasterAdminUser;
  store: WorkspaceStore;
  onLogout: () => void;
}

const RECRUITER_MENU_ITEMS: Array<{
  id: RecruiterMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'rec-overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'rec-vacancies', label: 'Lowongan', icon: Briefcase },
  { id: 'rec-pipeline', label: 'Pipeline', icon: Users },
  { id: 'rec-interviews', label: 'Wawancara', icon: CalendarClock },
  { id: 'rec-handoff', label: 'Handoff Admin', icon: UserCheck },
  { id: 'rec-reports', label: 'Laporan Klien', icon: BarChart3 },
];

interface VacancyFormState {
  clientName: string;
  showClientNameToApplicants: boolean;
  clientIndustryLabel: string;
  employmentType: EmploymentCategory;
  position: string;
  department: string;
  placementLocation: string;
  headcountNeeded: number;
  contractType: 'PKWT' | 'PKWTT';
  salaryMin: number;
  salaryMax: number;
  salaryNote: string;
  jobdeskText: string;
  requirementsText: string;
  deadlineDate: string;
  urgency: 'Normal' | 'Mendesak';
  status: VacancyStatus;
}

function buildEmptyVacancyForm(): VacancyFormState {
  return {
    clientName: '',
    showClientNameToApplicants: true,
    clientIndustryLabel: 'Mitra Korporat SWAPRO',
    employmentType: 'Penempatan Klien',
    position: '',
    department: '',
    placementLocation: '',
    headcountNeeded: 5,
    contractType: 'PKWT',
    salaryMin: 5000000,
    salaryMax: 5500000,
    salaryNote: 'Sesuai UMK Penempatan + BPJS Lengkap',
    jobdeskText: '',
    requirementsText: '',
    deadlineDate: '2026-12-31',
    urgency: 'Normal',
    status: 'Aktif',
  };
}

export const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({
  user,
  store,
  onLogout,
}) => {
  const [activeMenu, setActiveMenu] = useState<RecruiterMenuId>('rec-overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Vacancy modal state
  const [vacancyModalMode, setVacancyModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(null);
  const [vacancyForm, setVacancyForm] = useState<VacancyFormState>(buildEmptyVacancyForm);
  const [vacancyFormError, setVacancyFormError] = useState<string | null>(null);
  const [vacancyQuery, setVacancyQuery] = useState('');
  const [vacancyStatusFilter, setVacancyStatusFilter] = useState<VacancyStatus | 'Semua'>('Semua');

  // ATS Pipeline filter state
  const [pipelineStageFilter, setPipelineStageFilter] = useState<ApplicationStage | 'Semua'>(
    'Semua'
  );
  const [pipelineVacancyFilter, setPipelineVacancyFilter] = useState('Semua');
  const [pipelineQuery, setPipelineQuery] = useState('');

  // Inspect full applicant profile modal
  const [inspectedApplicant, setInspectedApplicant] = useState<{
    applicant: ApplicantProfileRecord;
    application: JobApplicationRecord;
    vacancy?: JobVacancyRecord;
  } | null>(null);

  // Interview Schedule modal
  const [scheduleTargetApp, setScheduleTargetApp] = useState<JobApplicationRecord | null>(null);
  const [scheduleForm, setScheduleForm] = useState<InterviewScheduleRecord>({
    date: '2026-11-18',
    time: '10:00 WIB',
    mode: 'Online (Video Call)',
    locationOrLink: 'https://meet.swapro-demo.co.id/interview-kandidat',
    interviewerName: user.name,
    notesToApplicant: 'Siapkan e-KTP asli dan pastikan seluruh profil biodata karyawan dilengkapi.',
  });

  // Evaluation modal
  const [evalTargetApp, setEvalTargetApp] = useState<JobApplicationRecord | null>(null);
  const [evalScore, setEvalScore] = useState(85);
  const [evalSummary, setEvalSummary] = useState('');
  const [evalNextStage, setEvalNextStage] = useState<ApplicationStage>('Offering');

  // Handoff modal
  const [handoffTargetApp, setHandoffTargetApp] = useState<JobApplicationRecord | null>(null);
  const [handoffJoinDate, setHandoffJoinDate] = useState('2026-12-01');
  const [handoffEndDate, setHandoffEndDate] = useState('2027-11-30');
  const [handoffPlacementId, setHandoffPlacementId] = useState('');
  const [handoffCreatedEmployee, setHandoffCreatedEmployee] = useState<EmployeeRecord | null>(null);

  const actorLabel = `${user.name} (${user.id})`;
  const activeMenuItem =
    RECRUITER_MENU_ITEMS.find((m) => m.id === activeMenu) ?? RECRUITER_MENU_ITEMS[0];

  const clientSuggestions = useMemo(
    () => getDistinctClientNames(store.vacancies, store.entities),
    [store.vacancies, store.entities]
  );

  const totalOpenVacancies = store.vacancies.filter(
    (v) => v.status === 'Aktif' || v.status === 'Mendesak'
  ).length;
  const totalHeadcountTarget = store.vacancies.reduce((sum, v) => sum + v.headcountNeeded, 0);
  const totalHeadcountFilled = store.vacancies.reduce((sum, v) => sum + v.headcountFilled, 0);
  const incomingCount = store.applications.filter((a) => a.stage === 'Lamaran Masuk').length;
  const readyHandoffCount = store.applications.filter(
    (a) => a.stage === 'Offering' || (a.stage === 'Lolos & Siap Onboarding' && !a.handedOffToOnboarding)
  ).length;

  const filteredVacancies = useMemo(() => {
    const q = vacancyQuery.trim().toLowerCase();
    return store.vacancies.filter((v) => {
      const matchesStatus = vacancyStatusFilter === 'Semua' || v.status === vacancyStatusFilter;
      const matchesQuery =
        !q ||
        v.clientName.toLowerCase().includes(q) ||
        v.position.toLowerCase().includes(q) ||
        v.placementLocation.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [store.vacancies, vacancyQuery, vacancyStatusFilter]);

  const filteredApplications = useMemo(
    () =>
      filterApplicationsForRecruiter(
        store.applications,
        store.vacancies,
        store.applicants,
        pipelineStageFilter,
        pipelineVacancyFilter,
        pipelineQuery
      ),
    [
      store.applications,
      store.vacancies,
      store.applicants,
      pipelineStageFilter,
      pipelineVacancyFilter,
      pipelineQuery,
    ]
  );

  const clientFulfillmentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        clientName: string;
        vacancyCount: number;
        needed: number;
        filled: number;
        applicantsCount: number;
      }
    >();

    store.vacancies.forEach((v) => {
      const key = v.clientName.trim();
      const existing = map.get(key) ?? {
        clientName: key,
        vacancyCount: 0,
        needed: 0,
        filled: 0,
        applicantsCount: 0,
      };
      existing.vacancyCount += 1;
      existing.needed += v.headcountNeeded;
      existing.filled += v.headcountFilled;
      existing.applicantsCount += store.applications.filter((a) => a.vacancyId === v.id).length;
      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [store.vacancies, store.applications]);

  const selectMenu = (id: RecruiterMenuId) => {
    setActiveMenu(id);
    setMobileSidebarOpen(false);
    setFeedbackBanner(null);
    setHandoffCreatedEmployee(null);
  };

  const openCreateVacancy = () => {
    setVacancyModalMode('create');
    setEditingVacancyId(null);
    setVacancyForm(buildEmptyVacancyForm());
    setVacancyFormError(null);
  };

  const openEditVacancy = (vac: JobVacancyRecord) => {
    setVacancyModalMode('edit');
    setEditingVacancyId(vac.id);
    setVacancyForm({
      clientName: vac.clientName,
      showClientNameToApplicants: vac.showClientNameToApplicants,
      clientIndustryLabel: vac.clientIndustryLabel,
      employmentType: vac.employmentType,
      position: vac.position,
      department: vac.department,
      placementLocation: vac.placementLocation,
      headcountNeeded: vac.headcountNeeded,
      contractType: vac.contractType,
      salaryMin: vac.salaryMin,
      salaryMax: vac.salaryMax,
      salaryNote: vac.salaryNote,
      jobdeskText: vac.jobdesk.join('\n'),
      requirementsText: vac.requirements.join('\n'),
      deadlineDate: vac.deadlineDate,
      urgency: vac.urgency,
      status: vac.status,
    });
    setVacancyFormError(null);
  };

  const handleSaveVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacancyForm.clientName.trim()) {
      setVacancyFormError('Nama Client wajib diketik.');
      return;
    }
    if (!vacancyForm.position.trim()) {
      setVacancyFormError('Posisi / Jabatan lowongan wajib diisi.');
      return;
    }
    if (!vacancyForm.placementLocation.trim()) {
      setVacancyFormError('Lokasi penempatan wajib diisi.');
      return;
    }
    if (vacancyForm.headcountNeeded < 1) {
      setVacancyFormError('Kebutuhan jumlah orang minimal 1.');
      return;
    }

    const jobdesk = vacancyForm.jobdeskText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const requirements = vacancyForm.requirementsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (jobdesk.length === 0 || requirements.length === 0) {
      setVacancyFormError('Isi minimal 1 baris Jobdesk dan 1 baris Persyaratan kandidat.');
      return;
    }

    const payload = {
      clientName: vacancyForm.clientName.trim(),
      showClientNameToApplicants: vacancyForm.showClientNameToApplicants,
      clientIndustryLabel: vacancyForm.clientIndustryLabel.trim() || 'Mitra Korporat SWAPRO',
      employmentType: vacancyForm.employmentType,
      position: vacancyForm.position.trim(),
      department: vacancyForm.department.trim() || 'Operasional Klien',
      placementLocation: vacancyForm.placementLocation.trim(),
      headcountNeeded: Number(vacancyForm.headcountNeeded),
      contractType: vacancyForm.contractType,
      salaryMin: Math.max(0, Number(vacancyForm.salaryMin) || 0),
      salaryMax: Math.max(0, Number(vacancyForm.salaryMax) || 0),
      salaryNote: vacancyForm.salaryNote.trim(),
      jobdesk,
      requirements,
      deadlineDate: vacancyForm.deadlineDate,
      urgency: vacancyForm.urgency,
      status: vacancyForm.status,
      recruiterName: user.name,
    };

    if (vacancyModalMode === 'edit' && editingVacancyId) {
      store.updateVacancy(editingVacancyId, payload, actorLabel);
      setFeedbackBanner({
        type: 'success',
        text: `Lowongan "${payload.position}" untuk ${payload.clientName} berhasil diperbarui.`,
      });
    } else {
      store.createVacancy(payload, actorLabel);
      setFeedbackBanner({
        type: 'success',
        text: `Lowongan baru "${payload.position}" (${payload.clientName}, butuh ${payload.headcountNeeded} orang) berhasil dipublikasikan ke Portal Pelamar.`,
      });
    }

    setVacancyModalMode(null);
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-[#102B69] text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/15 shrink-0">
        <PevoraLogo variant="light" />
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Tutup sidebar"
          className="lg:hidden p-1.5 rounded-[4px] text-[#EAF2FF] hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-white/15">
        <p className="font-jakarta text-[11px] font-semibold text-[#EAF2FF]/70">
          Konsol Rekrutmen (ATS)
        </p>
        <p className="text-sm font-bold text-white mt-0.5 truncate">
          {store.settings.companyName}
        </p>
        <p className="text-[11px] text-[#EAF2FF]/80 mt-0.5 tabular-nums truncate">
          {totalOpenVacancies} Lowongan Aktif · {totalHeadcountFilled}/{totalHeadcountTarget} Terisi
        </p>
      </div>

      <nav aria-label="Menu Dashboard Rekruter" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {RECRUITER_MENU_ITEMS.map((item) => {
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
              {item.id === 'rec-pipeline' && incomingCount > 0 && (
                <span className="text-[11px] font-bold text-[#FF7A1A] tabular-nums shrink-0">
                  {incomingCount}
                </span>
              )}
              {item.id === 'rec-handoff' && readyHandoffCount > 0 && (
                <span className="text-[11px] font-bold text-[#EAF2FF] tabular-nums shrink-0">
                  {readyHandoffCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/15 shrink-0 space-y-3">
        <div className="px-2">
          <p className="text-xs font-semibold text-white truncate">{user.name}</p>
          <p className="text-[11px] text-[#EAF2FF]/75 truncate">
            {user.role} · {user.id}
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
              aria-label="Buka menu rekruter"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA]"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <p className="text-xs text-[#64748B] truncate">
                {store.settings.companyName} /{' '}
                <span className="font-semibold text-[#102B69]">{activeMenuItem.label}</span>
              </p>
              <h1 className="text-base sm:text-lg font-bold text-[#102B69] truncate">
                {activeMenuItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openCreateVacancy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Buat Lowongan</span>
            </button>
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
          {feedbackBanner && (
            <div
              role="status"
              className={`p-4 rounded-[6px] border text-xs font-medium flex items-center justify-between gap-3 ${
                feedbackBanner.type === 'success'
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
              }`}
            >
              <span>{feedbackBanner.text}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                aria-label="Tutup notifikasi"
                className="p-1 hover:bg-black/5 rounded-[4px] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {handoffCreatedEmployee && (
            <section
              aria-label="Konversi Akun Karyawan Berhasil"
              data-testid="handoff-created-card"
              className="bg-white border border-[#1468E8]/35 rounded-[6px] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold text-[#1468E8] bg-[#EAF2FF] border border-[#C9DDFB] rounded-[3px]">
                      Akun Karyawan Aktif &amp; PKWT Siap TTD
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-mono font-bold text-[#102B69] bg-[#F5F7FA] border border-[#E2E8F0] rounded-[3px]">
                      NIK: {handoffCreatedEmployee.employeeCode}
                    </span>
                    {handoffCreatedEmployee.originApplicantCode && (
                      <span className="text-[11px] font-mono text-[#64748B]">
                        Ex-{handoffCreatedEmployee.originApplicantCode}
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm font-bold text-[#102B69]">
                    {handoffCreatedEmployee.fullName} — {handoffCreatedEmployee.position}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Klien: <strong className="text-[#172033]">{handoffCreatedEmployee.entityName}</strong>
                    {handoffCreatedEmployee.placementName
                      ? ` · Cabang: ${handoffCreatedEmployee.placementName}`
                      : ''}
                    {handoffCreatedEmployee.placementArea
                      ? ` (${handoffCreatedEmployee.placementArea})`
                      : ''}{' '}
                    · Password Login: <span className="font-mono font-semibold text-[#102B69]">sesuai akun pelamar</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHandoffCreatedEmployee(null)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#64748B] hover:text-[#102B69] border border-[#E2E8F0] rounded-[4px] cursor-pointer whitespace-nowrap shrink-0"
                >
                  Tutup
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  href={buildEmployeeWhatsappUrl(handoffCreatedEmployee, 'account-pkwt')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#16A36A] hover:bg-[#128557] rounded-[4px] whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kirim Akun &amp; PKWT via WhatsApp</span>
                </a>
                <a
                  href={buildEmployeeMailtoUrl(handoffCreatedEmployee, 'account-pkwt')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white border border-[#C9DDFB] rounded-[4px] transition-colors whitespace-nowrap shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kirim Akun &amp; PKWT via Email</span>
                </a>
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* MENU 1: RINGKASAN REKRUTMEN                                      */}
          {/* =============================================================== */}
          {activeMenu === 'rec-overview' && (
            <div className="space-y-6">
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Lowongan Publikasi Aktif</p>
                  <p className="text-2xl font-extrabold text-[#102B69] mt-2 tabular-nums">
                    {totalOpenVacancies} Lowongan
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">Tayang di Portal Pelamar</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Kebutuhan Orang (Terisi)</p>
                  <p className="text-2xl font-extrabold text-[#1468E8] mt-2 tabular-nums">
                    {totalHeadcountFilled} / {totalHeadcountTarget}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                    Sisa {Math.max(0, totalHeadcountTarget - totalHeadcountFilled)} posisi terbuka
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Total Lamaran Masuk</p>
                  <p className="text-2xl font-extrabold text-[#102B69] mt-2 tabular-nums">
                    {store.applications.length} Pelamar
                  </p>
                  <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                    {incomingCount} menunggu screening
                  </p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Siap Verifikasi &amp; Handoff</p>
                  <p className="text-2xl font-extrabold text-[#16A36A] mt-2 tabular-nums">
                    {readyHandoffCount} Kandidat
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">Menuju Admin Onboarding &amp; PKWT</p>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#102B69]">
                        Kebutuhan Client &amp; Progres Kuota
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Ringkasan permintaan tenaga kerja aktif per Client
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectMenu('rec-vacancies')}
                      className="text-xs font-semibold text-[#1468E8] hover:underline cursor-pointer"
                    >
                      Kelola Lowongan
                    </button>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {store.vacancies.slice(0, 5).map((v) => (
                      <div key={v.id} className="p-4 px-6 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#102B69] truncate">{v.position}</p>
                          <p className="text-xs text-[#64748B] truncate">
                            {v.clientName} · {v.placementLocation}
                          </p>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <p className="text-xs font-bold text-[#102B69]">
                            {v.headcountFilled}/{v.headcountNeeded} Terisi
                          </p>
                          <p
                            className={`text-[11px] font-bold ${
                              v.status === 'Mendesak'
                                ? 'text-[#B87D00]'
                                : v.status === 'Ditutup'
                                  ? 'text-[#64748B]'
                                  : 'text-[#16A36A]'
                            }`}
                          >
                            {v.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#102B69]">Aktivitas Pelamar Terbaru</h2>
                    <button
                      type="button"
                      onClick={() => selectMenu('rec-pipeline')}
                      className="text-xs font-semibold text-[#1468E8] hover:underline cursor-pointer"
                    >
                      Buka Pipeline
                    </button>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {store.applications.slice(0, 5).map((app) => {
                      const ap = store.applicants.find((p) => p.id === app.applicantId);
                      const vac = store.vacancies.find((v) => v.id === app.vacancyId);
                      return (
                        <div key={app.id} className="p-4 px-6 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-[#172033]">
                              {ap?.fullName ?? 'Pelamar'}
                            </p>
                            <span className="text-[11px] font-bold text-[#1468E8]">
                              {app.stage}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B]">
                            {vac?.position} · {vac?.clientName}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 2: LOWONGAN & PERMINTAAN CLIENT                             */}
          {/* =============================================================== */}
          {activeMenu === 'rec-vacancies' && (
            <div className="space-y-6">
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={vacancyQuery}
                    onChange={(e) => setVacancyQuery(e.target.value)}
                    placeholder="Cari nama client, posisi, atau lokasi penempatan..."
                    aria-label="Cari lowongan rekruter"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                    {(['Semua', 'Aktif', 'Mendesak', 'Ditutup'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setVacancyStatusFilter(status)}
                        className={`px-3 py-1 text-xs font-semibold rounded-[3px] cursor-pointer ${
                          vacancyStatusFilter === status
                            ? 'bg-[#1468E8] text-white'
                            : 'text-[#64748B] hover:text-[#102B69]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={openCreateVacancy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#102B69] hover:bg-[#1468E8] rounded-[4px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tambah Lowongan Client</span>
                  </button>
                </div>
              </section>

              <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                        <th className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                          Posisi &amp; Client (Ketik Manual)
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                          Penempatan &amp; Gaji
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                          Kebutuhan Kuota
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">Pelamar</th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">Status</th>
                        <th className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      {filteredVacancies.map((v) => {
                        const applicantCount = store.applications.filter(
                          (a) => a.vacancyId === v.id
                        ).length;
                        const remaining = computeRemainingHeadcount(v);
                        return (
                          <tr key={v.id} className="hover:bg-[#F5F7FA]/60">
                            <td className="py-3.5 px-6">
                              <p className="font-bold text-[#102B69] text-sm">{v.position}</p>
                              <p className="text-[#172033] font-medium mt-0.5">{v.clientName}</p>
                              <p className="text-[11px] text-[#64748B]">
                                {v.code} · {v.department} ·{' '}
                                {v.showClientNameToApplicants
                                  ? 'Nama Client Tampil'
                                  : 'Client Disamarkan'}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-[#172033]">{v.placementLocation}</p>
                              <p className="text-[#16A36A] font-semibold tabular-nums mt-0.5">
                                {formatSalaryRangeRupiah(v.salaryMin, v.salaryMax, v.salaryNote)}
                              </p>
                              <p className="text-[11px] text-[#64748B]">{v.contractType}</p>
                            </td>
                            <td className="py-3.5 px-4 tabular-nums whitespace-nowrap">
                              <p className="font-bold text-[#102B69]">
                                {v.headcountFilled} / {v.headcountNeeded} Orang
                              </p>
                              <p className="text-[11px] text-[#64748B]">Sisa {remaining} kuota</p>
                            </td>
                            <td className="py-3.5 px-4 tabular-nums">
                              <button
                                type="button"
                                onClick={() => {
                                  setPipelineVacancyFilter(v.id);
                                  selectMenu('rec-pipeline');
                                }}
                                className="font-bold text-[#1468E8] hover:underline cursor-pointer"
                              >
                                {applicantCount} Pelamar
                              </button>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`font-bold ${
                                  v.status === 'Mendesak'
                                    ? 'text-[#B87D00]'
                                    : v.status === 'Ditutup'
                                      ? 'text-[#64748B]'
                                      : 'text-[#16A36A]'
                                }`}
                              >
                                {v.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => openEditVacancy(v)}
                                className="px-2.5 py-1.5 font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  store.toggleVacancyStatus(
                                    v.id,
                                    v.status === 'Ditutup' ? 'Aktif' : 'Ditutup',
                                    actorLabel
                                  )
                                }
                                className="px-2.5 py-1.5 font-semibold text-[#102B69] bg-white hover:bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                              >
                                {v.status === 'Ditutup' ? 'Buka Lagi' : 'Tutup'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 3: PIPELINE PELAMAR (ATS)                                   */}
          {/* =============================================================== */}
          {activeMenu === 'rec-pipeline' && (
            <div className="space-y-6">
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={pipelineQuery}
                    onChange={(e) => setPipelineQuery(e.target.value)}
                    placeholder="Cari nama pelamar, NIK, posisi, atau client..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={pipelineVacancyFilter}
                    onChange={(e) => setPipelineVacancyFilter(e.target.value)}
                    aria-label="Filter lowongan pipeline"
                    className="px-3 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                  >
                    <option value="Semua">Semua Lowongan</option>
                    {store.vacancies.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.position} — {v.clientName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={pipelineStageFilter}
                    onChange={(e) =>
                      setPipelineStageFilter(e.target.value as ApplicationStage | 'Semua')
                    }
                    aria-label="Filter tahap seleksi"
                    className="px-3 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                  >
                    <option value="Semua">Semua Tahapan</option>
                    {APPLICATION_STAGES_ORDER.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                        <th className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                          Pelamar &amp; Kontak
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                          Lowongan &amp; Client
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                          Kelengkapan Data Karyawan
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                          Tahap Seleksi
                        </th>
                        <th className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                          Aksi Rekruter
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      {filteredApplications.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 px-6 text-center text-[#64748B]">
                            Tidak ada lamaran pelamar sesuai filter saat ini.
                          </td>
                        </tr>
                      ) : (
                        filteredApplications.map((app) => {
                          const ap = store.applicants.find((a) => a.id === app.applicantId);
                          const vac = store.vacancies.find((v) => v.id === app.vacancyId);
                          if (!ap) return null;
                          const comp = calculateApplicantProfileCompleteness(ap);
                          return (
                            <tr key={app.id} className="hover:bg-[#F5F7FA]/60">
                              <td className="py-3.5 px-6">
                                <p className="font-bold text-sm text-[#172033]">{ap.fullName}</p>
                                <p className="text-[#64748B] tabular-nums">
                                  {ap.applicantCode} · WA: {ap.whatsappNumber || '—'}
                                </p>
                                <p className="text-[11px] text-[#64748B]">{ap.email}</p>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-[#102B69]">
                                  {vac?.position ?? '—'}
                                </p>
                                <p className="text-[#64748B]">{vac?.clientName ?? '—'}</p>
                                <p className="text-[11px] text-[#64748B] tabular-nums">
                                  {app.applicationCode} · {app.appliedAt}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 tabular-nums">
                                <p
                                  className={`font-bold ${
                                    comp.isEmployeeReady ? 'text-[#16A36A]' : 'text-[#B87D00]'
                                  }`}
                                >
                                  {comp.percentage}% Lengkap
                                </p>
                                <p className="text-[11px] text-[#64748B]">
                                  {app.requiresFullProfile
                                    ? comp.isEmployeeReady
                                      ? 'Sudah Lengkap (Terverifikasi)'
                                      : 'Sudah Dihubungi — Wajib Lengkapi'
                                    : 'Tahap Awal'}
                                </p>
                              </td>
                              <td className="py-3.5 px-4">
                                <select
                                  value={app.stage}
                                  disabled={app.handedOffToOnboarding}
                                  onChange={(e) => {
                                    const nextStage = e.target.value as ApplicationStage;
                                    store.advanceApplicationStage(
                                      app.id,
                                      nextStage,
                                      {},
                                      actorLabel
                                    );
                                    setFeedbackBanner({
                                      type: 'success',
                                      text: `Tahap ${ap.fullName} diubah ke "${nextStage}".${
                                        nextStage !== 'Lamaran Masuk' && nextStage !== 'Tidak Lolos'
                                          ? ' Sistem otomatis menandai wajib melengkapi data karyawan.'
                                          : ''
                                      }`,
                                    });
                                  }}
                                  aria-label={`Ubah tahap seleksi ${ap.fullName}`}
                                  className="px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-semibold text-[#102B69] disabled:opacity-60"
                                >
                                  {APPLICATION_STAGES_ORDER.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3.5 px-6 text-right whitespace-nowrap space-x-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInspectedApplicant({ applicant: ap, application: app, vacancy: vac })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Profil &amp; Berkas</span>
                                </button>
                                {!app.handedOffToOnboarding && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setScheduleTargetApp(app);
                                      setScheduleForm({
                                        date: app.interview?.date ?? '2026-11-19',
                                        time: app.interview?.time ?? '10:00 WIB',
                                        mode: app.interview?.mode ?? 'Online (Video Call)',
                                        locationOrLink:
                                          app.interview?.locationOrLink ??
                                          'https://meet.swapro-demo.co.id/interview-swapro',
                                        interviewerName: app.interview?.interviewerName ?? user.name,
                                        notesToApplicant:
                                          app.interview?.notesToApplicant ??
                                          'Mohon lengkapi data KK, Rekening Bank, dan dokumen pada Portal Pelamar sebelum tahap Offering.',
                                      });
                                    }}
                                    className="px-2.5 py-1.5 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                                  >
                                    Jadwal Interview
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 4: JADWAL & HASIL INTERVIEW                                 */}
          {/* =============================================================== */}
          {activeMenu === 'rec-interviews' && (
            <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#102B69]">
                  Daftar Jadwal &amp; Evaluasi Interview Kandidat
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Catat skor evaluasi wawancara dan teruskan kandidat ke Offering / Onboarding
                </p>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {store.applications.filter((a) => Boolean(a.interview)).length === 0 ? (
                  <div className="p-10 text-center text-xs text-[#64748B]">
                    Belum ada jadwal interview. Tetapkan jadwal melalui menu Pipeline Pelamar (ATS).
                  </div>
                ) : (
                  store.applications
                    .filter((a) => Boolean(a.interview))
                    .map((app) => {
                      const ap = store.applicants.find((p) => p.id === app.applicantId);
                      const vac = store.vacancies.find((v) => v.id === app.vacancyId);
                      const iv = app.interview!;
                      return (
                        <div
                          key={app.id}
                          className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 text-xs">
                            <p className="font-bold text-sm text-[#102B69]">
                              {ap?.fullName} — {vac?.position}
                            </p>
                            <p className="text-[#64748B]">
                              Client: <span className="font-semibold text-[#172033]">{vac?.clientName}</span>{' '}
                              · Jadwal: {formatIndonesianDate(iv.date)} ({iv.time}) · {iv.mode}
                            </p>
                            <p className="text-[#64748B] break-all">
                              Lokasi/Link: {iv.locationOrLink} · Pewawancara: {iv.interviewerName}
                            </p>
                            {iv.evaluationScore !== undefined && (
                              <p className="text-[#16A36A] font-bold pt-1">
                                Skor Evaluasi: {iv.evaluationScore}/100 — {iv.evaluationSummary}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEvalTargetApp(app);
                                setEvalScore(iv.evaluationScore ?? 86);
                                setEvalSummary(iv.evaluationSummary ?? '');
                                setEvalNextStage('Offering');
                              }}
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                            >
                              Input Nilai &amp; Hasil
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* MENU 5: VERIFIKASI BERKAS & HANDOFF KE ADMIN ONBOARDING          */}
          {/* =============================================================== */}
          {activeMenu === 'rec-handoff' && (
            <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#102B69]">
                  Verifikasi Data Karyawan &amp; Serah Terima ke Admin Onboarding PKWT
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pastikan kandidat tahap Offering / Lolos sudah melengkapi biodata KTP, KK,
                  rekening bank, &amp; dokumen 100% sebelum dikirim ke Admin PKWT.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                      <th className="py-3 px-6 text-xs font-semibold text-[#64748B]">Kandidat</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                        Posisi &amp; Client Penempatan
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                        Kesiapan Database Karyawan
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#64748B]">Status</th>
                      <th className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                        Handoff Onboarding
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {store.applications
                      .filter(
                        (a) =>
                          a.stage === 'Offering' ||
                          a.stage === 'Lolos & Siap Onboarding' ||
                          a.handedOffToOnboarding
                      )
                      .map((app) => {
                        const ap = store.applicants.find((p) => p.id === app.applicantId);
                        const vac = store.vacancies.find((v) => v.id === app.vacancyId);
                        if (!ap) return null;
                        const comp = calculateApplicantProfileCompleteness(ap);
                        const convertedEmp = store.employees.find(
                          (e) =>
                            e.applicantId === ap.id ||
                            (ap.applicantCode && e.originApplicantCode === ap.applicantCode)
                        );
                        return (
                          <tr key={app.id} className="hover:bg-[#F5F7FA]/60">
                            <td className="py-3.5 px-6">
                              <p className="font-bold text-sm text-[#172033]">{ap.fullName}</p>
                              <p className="text-[#64748B] tabular-nums">
                                NIK KTP: {ap.nik || 'Belum diisi'} · KK: {ap.kkNumber || 'Belum diisi'}
                              </p>
                              {convertedEmp && (
                                <p className="text-[11px] font-mono font-bold text-[#1468E8] mt-0.5">
                                  NIK Karyawan: {convertedEmp.employeeCode} (Ex-{ap.applicantCode})
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-[#102B69]">{vac?.position}</p>
                              <p className="text-[#64748B]">{vac?.clientName}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p
                                className={`font-bold tabular-nums ${
                                  comp.isEmployeeReady ? 'text-[#16A36A]' : 'text-[#B87D00]'
                                }`}
                              >
                                {comp.percentage}% Lengkap
                              </p>
                              {!comp.isEmployeeReady && (
                                <p className="text-[11px] text-[#64748B]">
                                  Kurang: {comp.missingEmployeeFields.slice(0, 3).join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold">
                              {app.handedOffToOnboarding ? (
                                <span className="text-[#16A36A]">Masuk Karyawan &amp; PKWT</span>
                              ) : (
                                <span className="text-[#1468E8]">{app.stage}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-6 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setInspectedApplicant({ applicant: ap, application: app, vacancy: vac })
                                }
                                className="px-2.5 py-1.5 font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                              >
                                Cek Data
                              </button>
                              {convertedEmp && (
                                <>
                                  <a
                                    href={buildEmployeeWhatsappUrl(convertedEmp, 'account-pkwt')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-[#16A36A] bg-[#ECFDF5] hover:bg-[#16A36A] hover:text-white border border-[#A7F3D0] rounded-[4px]"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>WA</span>
                                  </a>
                                  <a
                                    href={buildEmployeeMailtoUrl(convertedEmp, 'account-pkwt')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white border border-[#C9DDFB] rounded-[4px]"
                                  >
                                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Email</span>
                                  </a>
                                </>
                              )}
                              {!app.handedOffToOnboarding && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!comp.isEmployeeReady) {
                                      store.advanceApplicationStage(
                                        app.id,
                                        app.stage,
                                        {
                                          requiresFullProfile: true,
                                          recruiterNotes: `Wajib melengkapi: ${comp.missingEmployeeFields.join(', ')}.`,
                                        },
                                        actorLabel
                                      );
                                      setFeedbackBanner({
                                        type: 'error',
                                        text: `${ap.fullName} baru melengkapi ${comp.percentage}% data karyawan. Notifikasi "Wajib Lengkapi Data" sudah dikirim ke Portal Pelamar.`,
                                      });
                                      return;
                                    }
                                    const matchedEnt = store.entities.find(
                                      (e) => e.name.toLowerCase() === (vac?.clientName ?? '').trim().toLowerCase()
                                    );
                                    const matchedPlacement =
                                      matchedEnt?.supportedPlacements?.find((loc) =>
                                        (vac?.placementLocation ?? '').toLowerCase().includes(loc.name.toLowerCase())
                                      ) ?? matchedEnt?.supportedPlacements?.[0];
                                    setHandoffPlacementId(matchedPlacement?.id ?? '');
                                    setHandoffCreatedEmployee(null);
                                    setHandoffTargetApp(app);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white rounded-[4px] cursor-pointer ${
                                    comp.isEmployeeReady
                                      ? 'bg-[#16A36A] hover:bg-[#102B69]'
                                      : 'bg-[#B87D00] hover:bg-[#102B69]'
                                  }`}
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>
                                    {comp.isEmployeeReady
                                      ? 'Kirim ke Admin Onboarding'
                                      : 'Minta Lengkapi Data'}
                                  </span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* MENU 6: LAPORAN PEMENUHAN CLIENT                                 */}
          {/* =============================================================== */}
          {activeMenu === 'rec-reports' && (
            <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#102B69]">
                  Rekapitulasi Pemenuhan Kebutuhan per Client
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Akumulasi kuota kebutuhan orang, jumlah terisi, dan pelamar aktif tiap Client
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                      <th className="py-3 px-6 text-xs font-semibold text-[#64748B]">Nama Client</th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Lowongan
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Kebutuhan Orang
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Sudah Terisi
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Sisa Kuota
                      </th>
                      <th className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                        Total Pelamar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                    {clientFulfillmentSummary.map((row) => (
                      <tr key={row.clientName} className="hover:bg-[#F5F7FA]/60">
                        <td className="py-3.5 px-6 font-bold text-[#102B69]">{row.clientName}</td>
                        <td className="py-3.5 px-4 text-right font-semibold">{row.vacancyCount}</td>
                        <td className="py-3.5 px-4 text-right font-semibold">{row.needed} org</td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#16A36A]">
                          {row.filled} org
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#B87D00]">
                          {Math.max(0, row.needed - row.filled)} org
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-[#1468E8]">
                          {row.applicantsCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Create / Edit Vacancy Modal (with Free-text Client & Kuota) */}
      {vacancyModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vacancy-form-title"
        >
          <form
            onSubmit={handleSaveVacancy}
            className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-between gap-4">
              <div>
                <h2 id="vacancy-form-title" className="text-lg font-bold text-[#102B69]">
                  {vacancyModalMode === 'edit' ? 'Edit Lowongan Kerja' : 'Buat Lowongan Client Baru'}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Ketik nama Client, jumlah kebutuhan orang, lokasi penempatan, jobdesk, syarat, dan
                  rentang gaji.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVacancyModalMode(null)}
                aria-label="Tutup form lowongan"
                className="p-1.5 text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {vacancyFormError && (
                <div
                  role="alert"
                  className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-[#DC3545] font-semibold"
                >
                  {vacancyFormError}
                </div>
              )}

              {(() => {
                const matchedClientEntity = store.entities.find(
                  (ent) => ent.name.toLowerCase() === vacancyForm.clientName.trim().toLowerCase()
                );
                const clientSupportedPositions = matchedClientEntity?.supportedPositions ?? [];
                return (
                  <div className="p-3.5 bg-[#EAF2FF]/60 border border-[#C9DDFB] rounded-[4px] space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-[#102B69]">
                        Pilih cepat dari Master Client (Setting Master Admin):
                      </span>
                      <select
                        value={matchedClientEntity?.name ?? ''}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          const ent = store.entities.find((x) => x.name === selectedName);
                          if (!ent) return;
                          const firstPos = ent.supportedPositions?.[0];
                          setVacancyForm((prev) => ({
                            ...prev,
                            clientName: ent.name,
                            employmentType:
                              ent.category === 'Klien Penempatan' ? 'Penempatan Klien' : 'Internal',
                            placementLocation: ent.city || prev.placementLocation,
                            clientIndustryLabel: ent.industryLabel || prev.clientIndustryLabel,
                            position: firstPos ? firstPos.title : prev.position,
                            department: firstPos ? firstPos.department : prev.department,
                            salaryMin: firstPos
                              ? firstPos.baseSalary
                              : ent.defaultBaseSalary || prev.salaryMin,
                            salaryMax: firstPos
                              ? firstPos.baseSalary
                              : ent.defaultBaseSalary || prev.salaryMax,
                          }));
                        }}
                        aria-label="Pilih dari Master Client"
                        className="px-2.5 py-1.5 bg-white border border-[#C9DDFB] rounded-[4px] font-semibold text-[#102B69]"
                      >
                        <option value="">— Pilih Klien / Unit Terdaftar —</option>
                        {store.entities
                          .filter((e) => e.status === 'Aktif')
                          .map((ent) => (
                            <option key={ent.id} value={ent.name}>
                              {ent.name} ({(ent.supportedPositions ?? []).length} posisi disupport)
                            </option>
                          ))}
                      </select>
                    </div>

                    {clientSupportedPositions.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-[#C9DDFB]/70">
                        <p className="text-[11px] font-semibold text-[#102B69]">
                          Posisi yang Disupport pada {matchedClientEntity?.name} (Klik untuk isi
                          otomatis, kuota diisi sesuai kebutuhan lowongan):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {clientSupportedPositions.map((pos) => {
                            const isSelected = vacancyForm.position === pos.title;
                            return (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() =>
                                  setVacancyForm((prev) => ({
                                    ...prev,
                                    position: pos.title,
                                    department: pos.department,
                                    salaryMin: pos.baseSalary,
                                    salaryMax: pos.baseSalary,
                                    placementLocation:
                                      matchedClientEntity?.city || prev.placementLocation,
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-[4px] border text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#1468E8] text-white border-[#1468E8] font-semibold'
                                    : 'bg-white text-[#102B69] border-[#C9DDFB] hover:bg-[#EAF2FF]'
                                }`}
                              >
                                {pos.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Nama Client (Pilih atau Ketik Langsung) *
                  </label>
                  <input
                    type="text"
                    list="recruiter-client-suggestions"
                    value={vacancyForm.clientName}
                    onChange={(e) => setVacancyForm({ ...vacancyForm, clientName: e.target.value })}
                    placeholder="Contoh: PT Bank Mandiri / PT Telkom Akses"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                  <datalist id="recruiter-client-suggestions">
                    {clientSuggestions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Kebutuhan Berapa Orang (Kuota) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={vacancyForm.headcountNeeded}
                    onChange={(e) =>
                      setVacancyForm({
                        ...vacancyForm,
                        headcountNeeded: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Posisi / Jabatan *
                  </label>
                  <input
                    type="text"
                    value={vacancyForm.position}
                    onChange={(e) => setVacancyForm({ ...vacancyForm, position: e.target.value })}
                    placeholder="Contoh: Sales Promotion / Customer Service"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Lokasi Penempatan (Kota/Area) *
                  </label>
                  <input
                    type="text"
                    value={vacancyForm.placementLocation}
                    onChange={(e) =>
                      setVacancyForm({ ...vacancyForm, placementLocation: e.target.value })
                    }
                    placeholder="Contoh: Jakarta Selatan & Jabodetabek"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Bagian / Divisi</label>
                  <input
                    type="text"
                    value={vacancyForm.department}
                    onChange={(e) => setVacancyForm({ ...vacancyForm, department: e.target.value })}
                    placeholder="Contoh: Operasional Cabang"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Tipe Penempatan &amp; Kontrak
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={vacancyForm.employmentType}
                      onChange={(e) =>
                        setVacancyForm({
                          ...vacancyForm,
                          employmentType: e.target.value as EmploymentCategory,
                        })
                      }
                      className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    >
                      <option value="Penempatan Klien">Penempatan Klien</option>
                      <option value="Internal">Internal SWAPRO</option>
                    </select>
                    <select
                      value={vacancyForm.contractType}
                      onChange={(e) =>
                        setVacancyForm({
                          ...vacancyForm,
                          contractType: e.target.value as 'PKWT' | 'PKWTT',
                        })
                      }
                      className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    >
                      <option value="PKWT">PKWT</option>
                      <option value="PKWTT">PKWTT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Gaji Minimal (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={vacancyForm.salaryMin}
                    onChange={(e) =>
                      setVacancyForm({ ...vacancyForm, salaryMin: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Gaji Maksimal (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={vacancyForm.salaryMax}
                    onChange={(e) =>
                      setVacancyForm({ ...vacancyForm, salaryMax: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Catatan Gaji &amp; Tunjangan
                  </label>
                  <input
                    type="text"
                    value={vacancyForm.salaryNote}
                    onChange={(e) => setVacancyForm({ ...vacancyForm, salaryNote: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Tenggat &amp; Status Publikasi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={vacancyForm.deadlineDate}
                      onChange={(e) =>
                        setVacancyForm({ ...vacancyForm, deadlineDate: e.target.value })
                      }
                      className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                    <select
                      value={vacancyForm.status}
                      onChange={(e) => {
                        const st = e.target.value as VacancyStatus;
                        setVacancyForm({
                          ...vacancyForm,
                          status: st,
                          urgency: st === 'Mendesak' ? 'Mendesak' : vacancyForm.urgency,
                        });
                      }}
                      className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    >
                      <option value="Aktif">Aktif (Tayang)</option>
                      <option value="Mendesak">Mendesak (Tayang)</option>
                      <option value="Draft">Draft</option>
                      <option value="Ditutup">Ditutup</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-2">
                <label className="inline-flex items-center gap-2 font-semibold text-[#102B69] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vacancyForm.showClientNameToApplicants}
                    onChange={(e) =>
                      setVacancyForm({
                        ...vacancyForm,
                        showClientNameToApplicants: e.target.checked,
                      })
                    }
                  />
                  <span>Tampilkan nama Client secara terbuka di Portal Pelamar</span>
                </label>
                {!vacancyForm.showClientNameToApplicants && (
                  <input
                    type="text"
                    value={vacancyForm.clientIndustryLabel}
                    onChange={(e) =>
                      setVacancyForm({ ...vacancyForm, clientIndustryLabel: e.target.value })
                    }
                    placeholder="Label industri alternatif (contoh: Mitra Perbankan Nasional)"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Jobdesk / Uraian Tugas (1 poin per baris) *
                  </label>
                  <textarea
                    rows={4}
                    value={vacancyForm.jobdeskText}
                    onChange={(e) => setVacancyForm({ ...vacancyForm, jobdeskText: e.target.value })}
                    placeholder="Melayani nasabah cabang&#10;Melakukan verifikasi kelengkapan berkas"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Persyaratan / Kualifikasi (1 poin per baris) *
                  </label>
                  <textarea
                    rows={4}
                    value={vacancyForm.requirementsText}
                    onChange={(e) =>
                      setVacancyForm({ ...vacancyForm, requirementsText: e.target.value })
                    }
                    placeholder="Pendidikan min. D3/S1&#10;Komunikatif &amp; teliti"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setVacancyModalMode(null)}
                className="px-4 py-2 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
              >
                {vacancyModalMode === 'edit' ? 'Simpan Perubahan Lowongan' : 'Publikasikan Lowongan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inspect Full Applicant Employee-Parity Profile Modal */}
      {inspectedApplicant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="applicant-inspect-title"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#64748B]">
                  {inspectedApplicant.applicant.applicantCode} ·{' '}
                  {inspectedApplicant.vacancy?.position} ({inspectedApplicant.vacancy?.clientName})
                </p>
                <h2 id="applicant-inspect-title" className="text-lg font-bold text-[#102B69]">
                  {inspectedApplicant.applicant.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectedApplicant(null)}
                aria-label="Tutup profil pelamar"
                className="p-1.5 text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <dt className="text-[#64748B]">NIK e-KTP</dt>
                  <dd className="font-mono font-bold text-[#102B69] mt-0.5">
                    {inspectedApplicant.applicant.nik || 'Belum diisi'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">No. KK &amp; Kepala Keluarga</dt>
                  <dd className="font-mono font-semibold text-[#172033] mt-0.5">
                    {inspectedApplicant.applicant.kkNumber || 'Belum diisi'} (
                    {inspectedApplicant.applicant.headOfFamily || '—'})
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">TTL &amp; Jenis Kelamin</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {inspectedApplicant.applicant.birthPlace || '—'},{' '}
                    {formatIndonesianDate(inspectedApplicant.applicant.birthDate)} ·{' '}
                    {inspectedApplicant.applicant.gender}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">WhatsApp &amp; Email</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {inspectedApplicant.applicant.whatsappNumber || '—'} ·{' '}
                    {inspectedApplicant.applicant.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Rekening Bank</dt>
                  <dd className="font-mono font-semibold text-[#172033] mt-0.5">
                    {inspectedApplicant.applicant.bankName} ·{' '}
                    {inspectedApplicant.applicant.bankAccountNumber || 'Belum diisi'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Kontak Darurat</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {inspectedApplicant.applicant.emergencyContact.name || 'Belum diisi'}{' '}
                    {inspectedApplicant.applicant.emergencyContact.phone
                      ? `(${inspectedApplicant.applicant.emergencyContact.phone})`
                      : ''}
                  </dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-[#64748B]">Alamat Lengkap KTP</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {inspectedApplicant.applicant.ktpAddress.street || 'Belum diisi'}{' '}
                    {inspectedApplicant.applicant.ktpAddress.city
                      ? `, ${inspectedApplicant.applicant.ktpAddress.city}`
                      : ''}
                  </dd>
                </div>
              </dl>

              <div className="pt-4 border-t border-[#E2E8F0]">
                <h3 className="font-bold text-[#102B69] mb-3">
                  Kelengkapan Dokumen Kandidat (Siap Karyawan)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {DOCUMENT_CHECKLIST_ITEMS.filter((d) => d.key !== 'contractUploaded').map(
                    (doc) => {
                      const ok = Boolean(inspectedApplicant.applicant.documents[doc.key]);
                      return (
                        <div
                          key={doc.key}
                          className="p-2.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                        >
                          <p className="text-[#64748B]">{doc.shortLabel}</p>
                          <p className={`font-bold mt-0.5 ${ok ? 'text-[#16A36A]' : 'text-[#B87D00]'}`}>
                            {ok ? 'Tersedia' : 'Belum Upload'}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  store.advanceApplicationStage(
                    inspectedApplicant.application.id,
                    inspectedApplicant.application.stage,
                    {
                      requiresFullProfile: true,
                      recruiterNotes:
                        'Rekruter menandai wajib melengkapi seluruh data karyawan & berkas.',
                    },
                    actorLabel
                  );
                  setInspectedApplicant(null);
                  setFeedbackBanner({
                    type: 'success',
                    text: 'Permintaan lengkapi data karyawan telah dikirim ke Portal Pelamar.',
                  });
                }}
                className="px-4 py-2 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                Wajibkan Lengkapi Data
              </button>
              <button
                type="button"
                onClick={() => setInspectedApplicant(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] rounded-[4px] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Schedule Modal */}
      {scheduleTargetApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              store.scheduleApplicantInterview(scheduleTargetApp.id, scheduleForm, actorLabel);
              setScheduleTargetApp(null);
              setFeedbackBanner({
                type: 'success',
                text: 'Jadwal interview berhasil dikirim ke Portal Pelamar (wajib lengkapi data karyawan otomatis aktif).',
              });
            }}
            className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-lg p-6 space-y-4 text-xs"
          >
            <h2 className="text-base font-bold text-[#102B69]">Tetapkan Jadwal Interview</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Tanggal</label>
                <input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Jam</label>
                <input
                  type="text"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Metode</label>
              <select
                value={scheduleForm.mode}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    mode: e.target.value as InterviewScheduleRecord['mode'],
                  })
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              >
                <option value="Online (Video Call)">Online (Video Call)</option>
                <option value="Offline (Datang ke Kantor)">Offline (Datang ke Kantor)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Lokasi / Link Meeting</label>
              <input
                type="text"
                value={scheduleForm.locationOrLink}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, locationOrLink: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Pewawancara</label>
              <input
                type="text"
                value={scheduleForm.interviewerName}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, interviewerName: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Catatan ke Pelamar</label>
              <textarea
                rows={2}
                value={scheduleForm.notesToApplicant}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, notesToApplicant: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScheduleTargetApp(null)}
                className="px-4 py-2 font-semibold border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-[#1468E8] rounded-[4px] cursor-pointer"
              >
                Simpan Jadwal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interview Evaluation Modal */}
      {evalTargetApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              store.recordInterviewEvaluation(
                evalTargetApp.id,
                evalScore,
                evalSummary,
                evalNextStage,
                actorLabel
              );
              setEvalTargetApp(null);
              setFeedbackBanner({
                type: 'success',
                text: `Evaluasi interview disimpan dengan keputusan "${evalNextStage}".`,
              });
            }}
            className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-md p-6 space-y-4 text-xs"
          >
            <h2 className="text-base font-bold text-[#102B69]">Evaluasi &amp; Skor Interview</h2>
            <div>
              <label className="block font-semibold mb-1">Skor Wawancara (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={evalScore}
                onChange={(e) => setEvalScore(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Keputusan Tahap Berikutnya</label>
              <select
                value={evalNextStage}
                onChange={(e) => setEvalNextStage(e.target.value as ApplicationStage)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              >
                <option value="Offering">Offering (Lolos Interview)</option>
                <option value="Lolos & Siap Onboarding">Lolos &amp; Siap Onboarding</option>
                <option value="Tidak Lolos">Tidak Lolos</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Ringkasan Hasil</label>
              <textarea
                rows={3}
                value={evalSummary}
                onChange={(e) => setEvalSummary(e.target.value)}
                placeholder="Catatan kelebihan/kesesuaian kandidat..."
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEvalTargetApp(null)}
                className="px-4 py-2 font-semibold border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-[#1468E8] rounded-[4px] cursor-pointer"
              >
                Simpan Evaluasi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Handoff to Admin Onboarding Modal */}
      {handoffTargetApp && (() => {
        const handoffVac = store.vacancies.find((v) => v.id === handoffTargetApp.vacancyId);
        const handoffEntity = store.entities.find(
          (e) => e.name.toLowerCase() === (handoffVac?.clientName ?? '').trim().toLowerCase()
        );
        const supportedPlacements = handoffEntity?.supportedPlacements ?? [];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="handoff-modal-title"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = store.handoffApplicantToOnboarding(
                  handoffTargetApp.id,
                  handoffJoinDate,
                  handoffEndDate,
                  actorLabel,
                  handoffPlacementId || undefined
                );
                setHandoffTargetApp(null);
                if (res.createdEmployee) {
                  setHandoffCreatedEmployee(res.createdEmployee);
                }
                setFeedbackBanner({
                  type: res.ok ? 'success' : 'error',
                  text: res.message,
                });
              }}
              className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-md p-6 space-y-4 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#16A36A] shrink-0" aria-hidden="true" />
                <div>
                  <h2 id="handoff-modal-title" className="text-base font-bold text-[#102B69]">
                    Konversi ke Karyawan &amp; Siapkan PKWT
                  </h2>
                  <p className="text-[#64748B] mt-0.5">
                    Kandidat otomatis masuk ke Data Karyawan dengan format NIK Klien, dibuatkan PKWT Ke-1 untuk ditandatangani digital, dan siap dikirim via WA / Email.
                  </p>
                </div>
              </div>

              {supportedPlacements.length > 0 && (
                <div>
                  <label
                    htmlFor="handoff-placement-select"
                    className="flex items-center gap-1.5 font-semibold text-[#102B69] mb-1"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                    <span>Penempatan Cabang / Area</span>
                  </label>
                  <select
                    id="handoff-placement-select"
                    value={handoffPlacementId}
                    onChange={(e) => setHandoffPlacementId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-medium text-[#102B69]"
                  >
                    {supportedPlacements.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.area})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tanggal Target Join</label>
                  <input
                    type="date"
                    value={handoffJoinDate}
                    onChange={(e) => setHandoffJoinDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Usulan End of Contract</label>
                  <input
                    type="date"
                    value={handoffEndDate}
                    onChange={(e) => setHandoffEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHandoffTargetApp(null)}
                  className="px-4 py-2 font-semibold border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#16A36A] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                >
                  Kirim ke Admin Sekarang
                </button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
};
