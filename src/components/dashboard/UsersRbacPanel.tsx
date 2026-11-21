import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Unlock,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  EmployeeRecord,
  EmploymentCategory,
  EntityRecord,
  RBAC_MATRIX_ROWS,
  UserAccountRecord,
  UserRoleName,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  buildInternalUserMailtoUrl,
  buildInternalUserWhatsappUrl,
  formatAssignedScopesSummary,
  summarizePortalAccountStats,
} from '../../data/masterAdminData';
import { ApplicantProfileRecord } from '../../data/recruitmentData';
import { isPortalRoleTemporarilyDisabled } from '../../utils/validation';

interface UsersRbacPanelProps {
  users: UserAccountRecord[];
  employees: EmployeeRecord[];
  applicants: ApplicantProfileRecord[];
  entities: EntityRecord[];
  onChangeUserRole: (userId: string, role: UserRoleName) => void;
  onUpdateUserScope: (
    userId: string,
    employmentType: EmploymentCategory,
    assignedScopes: string[]
  ) => void;
  onToggleUserStatus: (userId: string) => void;
  onResetOrUpdateUserPassword: (userId: string, newPassword: string) => void;
  onCreateInternalUser: (input: {
    employeeCode: string;
    loginAlias?: string;
    fullName: string;
    email: string;
    whatsappNumber?: string;
    role: 'Master Admin' | 'Admin' | 'Rekruter' | 'Payroll';
    employmentType: EmploymentCategory;
    assignedScopes: string[];
    portalPassword: string;
  }) => void;
  onToggleEmployeeAccountStatus: (employeeId: string) => void;
  onResetOrUpdateEmployeePassword: (employeeId: string, newPassword: string) => void;
  onToggleApplicantAccountStatus: (applicantId: string) => void;
  onResetOrUpdateApplicantPassword: (applicantId: string, newPassword: string) => void;
}

type AccessAccountTab = 'internal' | 'employees' | 'applicants';

type InternalRoleFilter = 'Semua' | 'Master Admin' | 'Admin' | 'Rekruter' | 'Payroll';

type EmployeeAccountFilter =
  | 'Semua'
  | 'Aktif'
  | 'Belum TTD PKWT'
  | 'Baru Konversi'
  | 'Nonaktif';

const INTERNAL_ROLE_FILTERS: InternalRoleFilter[] = [
  'Semua',
  'Master Admin',
  'Admin',
  'Rekruter',
  'Payroll',
];

const INTERNAL_ASSIGNABLE_ROLES: Array<'Master Admin' | 'Admin' | 'Rekruter' | 'Payroll'> = [
  'Master Admin',
  'Admin',
  'Rekruter',
  'Payroll',
];

const EMPLOYEE_ACCOUNT_FILTERS: EmployeeAccountFilter[] = [
  'Semua',
  'Aktif',
  'Belum TTD PKWT',
  'Baru Konversi',
  'Nonaktif',
];

export const UsersRbacPanel: React.FC<UsersRbacPanelProps> = ({
  users,
  employees,
  applicants,
  entities,
  onChangeUserRole,
  onUpdateUserScope,
  onToggleUserStatus,
  onResetOrUpdateUserPassword,
  onCreateInternalUser,
  onToggleEmployeeAccountStatus,
  onResetOrUpdateEmployeePassword,
  onToggleApplicantAccountStatus,
  onResetOrUpdateApplicantPassword,
}) => {
  const [activeTab, setActiveTab] = useState<AccessAccountTab>('employees');
  const [query, setQuery] = useState('');
  const [internalRoleFilter, setInternalRoleFilter] = useState<InternalRoleFilter>('Semua');
  const [employeeAccountFilter, setEmployeeAccountFilter] =
    useState<EmployeeAccountFilter>('Semua');

  // Password visibility & inline reset state
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Record<string, boolean>>({});
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [draftPassword, setDraftPassword] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Scope editor for Internal users
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftEmploymentType, setDraftEmploymentType] = useState<EmploymentCategory>('Internal');
  const [draftScopes, setDraftScopes] = useState<string[]>([]);

  // New internal user form
  const [showAddInternalForm, setShowAddInternalForm] = useState(false);
  const [newInternalCode, setNewInternalCode] = useState('');
  const [newInternalAlias, setNewInternalAlias] = useState('');
  const [newInternalName, setNewInternalName] = useState('');
  const [newInternalEmail, setNewInternalEmail] = useState('');
  const [newInternalWhatsapp, setNewInternalWhatsapp] = useState('');
  const [newInternalRole, setNewInternalRole] = useState<'Master Admin' | 'Admin' | 'Rekruter' | 'Payroll'>(
    'Admin'
  );
  const [newInternalPassword, setNewInternalPassword] = useState('1234');
  const [newInternalScopes, setNewInternalScopes] = useState<string[]>([
    'Kantor Pusat Operasional',
  ]);
  const [addInternalError, setAddInternalError] = useState<string | null>(null);

  const activeScopes = entities.filter((e) => e.status === 'Aktif');
  const stats = summarizePortalAccountStats(users, employees, applicants);

  const internalUsers = users.filter(
    (u) =>
      u.role === 'Master Admin' ||
      u.role === 'Admin' ||
      u.role === 'Rekruter' ||
      u.role === 'Payroll'
  );

  const visibleInternalUsers = internalUsers.filter((u) => {
    const matchesRole = internalRoleFilter === 'Semua' || u.role === internalRoleFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.employeeCode.toLowerCase().includes(q) ||
      (u.loginAlias ?? '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.assignedScopes.some((s) => s.toLowerCase().includes(q));
    return matchesRole && matchesQuery;
  });

  const isEmployeePendingPkwt = (emp: EmployeeRecord): boolean => {
    const latest = emp.contractHistory?.[emp.contractHistory.length - 1];
    if (latest) {
      return latest.signatureStatus === 'Menunggu TTD Karyawan';
    }
    return emp.contractType === 'PKWT' && !emp.documents.contractUploaded;
  };

  const isEmployeeLocked = (emp: EmployeeRecord): boolean =>
    Boolean(emp.accountDisabled) || emp.status === 'Nonaktif' || emp.status === 'Resign';

  const visibleEmployees = employees.filter((emp) => {
    const locked = isEmployeeLocked(emp);
    const pendingPkwt = isEmployeePendingPkwt(emp);
    const matchesFilter =
      employeeAccountFilter === 'Semua' ||
      (employeeAccountFilter === 'Aktif' && !locked) ||
      (employeeAccountFilter === 'Nonaktif' && locked) ||
      (employeeAccountFilter === 'Belum TTD PKWT' && pendingPkwt && !locked) ||
      (employeeAccountFilter === 'Baru Konversi' &&
        (Boolean(emp.originApplicantCode) || Boolean(emp.isNewHire)));

    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      emp.employeeCode.toLowerCase().includes(q) ||
      (emp.loginAlias ?? '').toLowerCase().includes(q) ||
      emp.fullName.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.whatsappNumber.toLowerCase().includes(q) ||
      emp.entityName.toLowerCase().includes(q) ||
      (emp.placementName ?? '').toLowerCase().includes(q) ||
      (emp.originApplicantCode ?? '').toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const visibleApplicants = applicants.filter((app) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      app.applicantCode.toLowerCase().includes(q) ||
      app.loginId.toLowerCase().includes(q) ||
      app.fullName.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      (app.convertedToEmployeeCode ?? '').toLowerCase().includes(q)
    );
  });

  const toggleRevealPassword = (id: string) => {
    setRevealedPasswordIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openPasswordResetEditor = (id: string, currentPwd: string) => {
    if (resetTargetId === id) {
      setResetTargetId(null);
      setDraftPassword('');
      return;
    }
    setResetTargetId(id);
    setDraftPassword(currentPwd);
  };

  const openScopeEditor = (user: UserAccountRecord) => {
    if (editingUserId === user.id) {
      setEditingUserId(null);
      return;
    }
    setEditingUserId(user.id);
    setDraftEmploymentType(user.employmentType);
    setDraftScopes(user.assignedScopes);
  };

  const toggleMultiScope = (scopeName: string) => {
    setDraftScopes((prev) =>
      prev.includes(scopeName) ? prev.filter((item) => item !== scopeName) : [...prev, scopeName]
    );
  };

  const saveScopeEdit = (userId: string) => {
    onUpdateUserScope(userId, draftEmploymentType, draftScopes);
    setEditingUserId(null);
    setFeedbackBanner('Cakupan unit/klien akun berhasil diperbarui.');
  };

  const handleCreateInternalAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternalCode.trim() || !newInternalName.trim() || !newInternalEmail.trim()) {
      setAddInternalError('Kode ID, nama lengkap, dan email wajib diisi.');
      return;
    }
    if (newInternalPassword.trim().length < 4) {
      setAddInternalError('PIN / Kata Sandi minimal terdiri dari 4 karakter.');
      return;
    }
    setAddInternalError(null);
    onCreateInternalUser({
      employeeCode: newInternalCode,
      loginAlias: newInternalAlias,
      fullName: newInternalName,
      email: newInternalEmail,
      whatsappNumber: newInternalWhatsapp || '081199881024',
      role: newInternalRole,
      employmentType: 'Internal',
      assignedScopes: newInternalScopes,
      portalPassword: newInternalPassword,
    });
    setNewInternalCode('');
    setNewInternalAlias('');
    setNewInternalName('');
    setNewInternalEmail('');
    setNewInternalWhatsapp('');
    setNewInternalPassword('1234');
    setShowAddInternalForm(false);
    setFeedbackBanner(`Akun pengelola ${newInternalName.trim()} berhasil ditambahkan.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Ringkasan Status Akun & Akses Login */}
      <section
        aria-label="Ringkasan Hak Akses dan Akun"
        data-testid="rbac-summary-cards"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#64748B]">Total Akun Aktif</p>
            <p className="text-2xl font-extrabold text-[#102B69] tabular-nums mt-1">
              {stats.totalActiveAccounts}
            </p>
            <p className="text-[11px] text-[#64748B] mt-1 tabular-nums">
              {stats.activeInternalCount} Pengelola · {stats.activeEmployeeCount} Karyawan
              {!isPortalRoleTemporarilyDisabled('Pelamar') &&
                ` · ${stats.activeApplicantCount} Pelamar`}
            </p>
          </div>
          <div className="p-2.5 bg-[#EAF2FF] text-[#1468E8] rounded-[4px] shrink-0">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#64748B]">
              Akun Karyawan Baru (Belum TTD PKWT)
            </p>
            <p className="text-2xl font-extrabold text-[#B87D00] tabular-nums mt-1">
              {stats.pendingPkwtEmployeeAccounts}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('employees');
                setEmployeeAccountFilter('Belum TTD PKWT');
              }}
              className="text-[11px] font-semibold text-[#1468E8] hover:underline mt-1 cursor-pointer"
            >
              Lihat akun menunggu TTD PKWT →
            </button>
          </div>
          <div className="p-2.5 bg-[#FFFBEB] text-[#B87D00] rounded-[4px] shrink-0">
            <UserCheck className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#64748B]">Akun Nonaktif / Terkunci</p>
            <p className="text-2xl font-extrabold text-[#DC3545] tabular-nums mt-1">
              {stats.disabledOrLockedAccounts}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('employees');
                setEmployeeAccountFilter('Nonaktif');
              }}
              className="text-[11px] font-semibold text-[#1468E8] hover:underline mt-1 cursor-pointer"
            >
              Filter akun nonaktif / dialihkan →
            </button>
          </div>
          <div className="p-2.5 bg-[#FEF2F2] text-[#DC3545] rounded-[4px] shrink-0">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </section>

      {feedbackBanner && (
        <div
          role="status"
          className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] flex items-center justify-between gap-3 text-xs font-semibold text-[#16A36A]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{feedbackBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-[#102B69] hover:underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. Direktori 3 Tab: Akun Pengelola | Akun Karyawan | Akun Pelamar */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        {/* Header & Tab Switcher */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E2E8F0] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                Kelola Hak Akses, Status Login &amp; Reset Password Akun
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Atur aktif/nonaktif akun, reset PIN/kata sandi, dan kirim kredensial via WhatsApp
                atau Email secara terpusat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari NIK, nama, email, klien..."
                  aria-label="Cari akun pengguna"
                  className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1468E8] w-60"
                />
              </div>

              {activeTab === 'internal' && (
                <button
                  type="button"
                  onClick={() => setShowAddInternalForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{showAddInternalForm ? 'Tutup Form' : 'Tambah Akun Pengelola'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 3 Main Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div
              role="tablist"
              aria-label="Kategori Akun Sistem"
              className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'internal'}
                onClick={() => {
                  setActiveTab('internal');
                  setResetTargetId(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'internal'
                    ? 'bg-[#102B69] text-white'
                    : 'text-[#64748B] hover:text-[#102B69]'
                }`}
              >
                Akun Pengelola ({internalUsers.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'employees'}
                onClick={() => {
                  setActiveTab('employees');
                  setResetTargetId(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'employees'
                    ? 'bg-[#102B69] text-white'
                    : 'text-[#64748B] hover:text-[#102B69]'
                }`}
              >
                Akun Karyawan ({employees.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'applicants'}
                onClick={() => {
                  setActiveTab('applicants');
                  setResetTargetId(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'applicants'
                    ? 'bg-[#102B69] text-white'
                    : 'text-[#64748B] hover:text-[#102B69]'
                }`}
              >
                Akun Pelamar ({applicants.length})
              </button>
            </div>

            {/* Sub-filter per Tab */}
            {activeTab === 'internal' && (
              <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                {INTERNAL_ROLE_FILTERS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setInternalRoleFilter(role)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      internalRoleFilter === role
                        ? 'bg-[#1468E8] text-white'
                        : 'text-[#64748B] hover:text-[#102B69]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'employees' && (
              <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                {EMPLOYEE_ACCOUNT_FILTERS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEmployeeAccountFilter(mode)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      employeeAccountFilter === mode
                        ? 'bg-[#1468E8] text-white'
                        : 'text-[#64748B] hover:text-[#102B69]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Tambah Akun Pengelola Baru */}
        {activeTab === 'internal' && showAddInternalForm && (
          <form
            onSubmit={handleCreateInternalAccountSubmit}
            className="p-6 bg-[#F5F7FA] border-b border-[#E2E8F0] space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#102B69]">
                Tambah Akun Pengelola Baru (Master Admin / Admin / Payroll)
              </p>
              {addInternalError && (
                <p className="font-semibold text-[#DC3545]">{addInternalError}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label
                  htmlFor="new-internal-code"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  Kode Akun *
                </label>
                <input
                  id="new-internal-code"
                  type="text"
                  value={newInternalCode}
                  onChange={(e) => setNewInternalCode(e.target.value)}
                  placeholder="Mis: ADM-035"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                />
              </div>
              <div>
                <label
                  htmlFor="new-internal-alias"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  Username Login
                </label>
                <input
                  id="new-internal-alias"
                  type="text"
                  value={newInternalAlias}
                  onChange={(e) => setNewInternalAlias(e.target.value)}
                  placeholder="Mis: adm-rizal"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                />
              </div>
              <div>
                <label
                  htmlFor="new-internal-name"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  Nama Lengkap *
                </label>
                <input
                  id="new-internal-name"
                  type="text"
                  value={newInternalName}
                  onChange={(e) => setNewInternalName(e.target.value)}
                  placeholder="Nama pengelola"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
                />
              </div>
              <div>
                <label
                  htmlFor="new-internal-email"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  Email Kerja &amp; WA *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    id="new-internal-email"
                    type="email"
                    value={newInternalEmail}
                    onChange={(e) => setNewInternalEmail(e.target.value)}
                    placeholder="nama@swapro-demo.co.id"
                    className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
                  />
                  <input
                    id="new-internal-wa"
                    type="tel"
                    value={newInternalWhatsapp}
                    onChange={(e) => setNewInternalWhatsapp(e.target.value)}
                    placeholder="0812xxxx"
                    aria-label="Nomor WhatsApp Pengelola"
                    className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="new-internal-role"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Peran *
                  </label>
                  <select
                    id="new-internal-role"
                    value={newInternalRole}
                    onChange={(e) =>
                      setNewInternalRole(
                        e.target.value as 'Master Admin' | 'Admin' | 'Rekruter' | 'Payroll'
                      )
                    }
                    className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-medium"
                  >
                    {INTERNAL_ASSIGNABLE_ROLES.filter(
                      (r) => !isPortalRoleTemporarilyDisabled(r)
                    ).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-internal-pin"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    PIN Awal *
                  </label>
                  <input
                    id="new-internal-pin"
                    type="text"
                    value={newInternalPassword}
                    onChange={(e) => setNewInternalPassword(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#64748B]">Cakupan Awal:</span>
                {activeScopes.map((sc) => {
                  const checked = newInternalScopes.includes(sc.name);
                  return (
                    <label
                      key={sc.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNewInternalScopes((prev) =>
                            prev.includes(sc.name)
                              ? prev.filter((item) => item !== sc.name)
                              : [...prev, sc.name]
                          )
                        }
                      />
                      <span>{sc.name}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddInternalForm(false)}
                  className="px-3 py-1.5 font-semibold text-[#64748B] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                >
                  Simpan Akun Pengelola
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* TAB 1: AKUN PENGELOLA (MASTER ADMIN, ADMIN, REKRUTER)             */}
        {/* ================================================================= */}
        {activeTab === 'internal' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                  <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                    ID &amp; Username Login
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Nama &amp; Email
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Cakupan Unit / Klien
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Peran Sistem
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    PIN / Password
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Status Akun
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right"
                  >
                    Kontrol Akses
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {visibleInternalUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-xs text-[#64748B]">
                      Tidak ada akun pengelola yang cocok dengan pencarian saat ini.
                    </td>
                  </tr>
                ) : (
                  visibleInternalUsers.map((user) => {
                    const isEditingScope = editingUserId === user.id;
                    const isResettingPwd = resetTargetId === user.id;
                    const activePin = user.portalPassword?.trim() || '1234';
                    const isRevealed = Boolean(revealedPasswordIds[user.id]);

                    return (
                      <React.Fragment key={user.id}>
                        <tr className="hover:bg-[#F5F7FA]/60 transition-colors">
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#102B69] font-mono tabular-nums">
                              {user.employeeCode}
                            </p>
                            {user.loginAlias && (
                              <p className="text-[11px] text-[#64748B] font-mono">
                                Login: {user.loginAlias}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#172033] text-sm">{user.fullName}</p>
                            <p className="text-xs text-[#64748B]">{user.email}</p>
                            {user.whatsappNumber && (
                              <p className="text-[11px] text-[#64748B] tabular-nums mt-0.5">
                                WA: {user.whatsappNumber}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-xs text-[#172033] font-medium">
                              {formatAssignedScopesSummary(user.assignedScopes)}
                            </p>
                            {user.role !== 'Master Admin' && (
                              <button
                                type="button"
                                onClick={() => openScopeEditor(user)}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1468E8] hover:text-[#102B69] cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
                                <span>{isEditingScope ? 'Tutup Cakupan' : 'Atur Cakupan'}</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              aria-label={`Ubah peran untuk ${user.fullName}`}
                              value={user.role}
                              onChange={(e) =>
                                onChangeUserRole(user.id, e.target.value as UserRoleName)
                              }
                              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#E2E8F0] rounded-[4px] text-[#102B69] focus:outline-none focus:border-[#1468E8]"
                            >
                              {INTERNAL_ASSIGNABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-[#102B69] tabular-nums">
                                {isRevealed ? activePin : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealPassword(user.id)}
                                aria-label={
                                  isRevealed
                                    ? `Sembunyikan PIN ${user.fullName}`
                                    : `Tampilkan PIN ${user.fullName}`
                                }
                                className="p-1 text-[#64748B] hover:text-[#102B69] cursor-pointer"
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openPasswordResetEditor(user.id, activePin)}
                                className="text-[11px] font-semibold text-[#1468E8] hover:underline cursor-pointer"
                              >
                                {isResettingPwd ? 'Tutup' : 'Reset PIN'}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isPortalRoleTemporarilyDisabled(user.role) ? (
                              <>
                                <span className="text-xs font-bold text-[#DC3545]">
                                  Nonaktif Sementara
                                </span>
                                <p className="text-[11px] text-[#64748B] tabular-nums">
                                  Role diblokir · Data aman
                                </p>
                              </>
                            ) : (
                              <>
                                <span
                                  className={`text-xs font-bold ${
                                    user.status === 'Aktif' ? 'text-[#16A36A]' : 'text-[#DC3545]'
                                  }`}
                                >
                                  {user.status}
                                </span>
                                <p className="text-[11px] text-[#64748B] tabular-nums">
                                  {user.lastActive}
                                </p>
                              </>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              <a
                                href={buildInternalUserWhatsappUrl(user)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Hubungi WhatsApp ${user.fullName}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px]"
                              >
                                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>WA</span>
                              </a>
                              <a
                                href={buildInternalUserMailtoUrl(user)}
                                aria-label={`Kirim Email ke ${user.fullName}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px]"
                              >
                                <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                                <span>Email</span>
                              </a>
                              {(() => {
                                const roleLocked = isPortalRoleTemporarilyDisabled(user.role);
                                return (
                                  <button
                                    type="button"
                                    disabled={roleLocked}
                                    onClick={() => {
                                      if (roleLocked) return;
                                      onToggleUserStatus(user.id);
                                      setFeedbackBanner(
                                        `Status akun ${user.fullName} diubah menjadi ${
                                          user.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
                                        }.`
                                      );
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[4px] border transition-colors ${
                                      roleLocked
                                        ? 'text-[#64748B] bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed'
                                        : user.status === 'Aktif'
                                          ? 'text-[#DC3545] bg-[#FEF2F2] hover:bg-[#FEE2E2] border-[#FECACA] cursor-pointer'
                                          : 'text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border-[#BBF7D0] cursor-pointer'
                                    }`}
                                  >
                                    {roleLocked ? (
                                      <>
                                        <Lock className="w-3 h-3" aria-hidden="true" />
                                        <span>Terkunci</span>
                                      </>
                                    ) : user.status === 'Aktif' ? (
                                      <>
                                        <Lock className="w-3 h-3" aria-hidden="true" />
                                        <span>Nonaktifkan</span>
                                      </>
                                    ) : (
                                      <>
                                        <Unlock className="w-3 h-3" aria-hidden="true" />
                                        <span>Aktifkan Akun</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>

                        {isResettingPwd && (
                          <tr className="bg-[#F8FAFC]">
                            <td colSpan={7} className="px-6 py-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <KeyRound
                                    className="w-4 h-4 text-[#1468E8]"
                                    aria-hidden="true"
                                  />
                                  <span className="font-bold text-[#102B69]">
                                    Atur / Reset PIN Kata Sandi untuk {user.fullName} (
                                    {user.employeeCode})
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    aria-label={`PIN baru untuk ${user.fullName}`}
                                    value={draftPassword}
                                    onChange={(e) => setDraftPassword(e.target.value)}
                                    placeholder="Minimal 4 karakter"
                                    className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] font-mono w-44"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (draftPassword.trim().length < 4) return;
                                      onResetOrUpdateUserPassword(user.id, draftPassword.trim());
                                      setResetTargetId(null);
                                      setFeedbackBanner(
                                        `PIN login ${user.fullName} (${user.employeeCode}) berhasil diperbarui.`
                                      );
                                    }}
                                    className="px-3 py-1.5 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                                  >
                                    Simpan PIN Baru
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onResetOrUpdateUserPassword(user.id, '1234');
                                      setResetTargetId(null);
                                      setFeedbackBanner(
                                        `PIN login ${user.fullName} di-reset ke default (1234).`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                    <span>Reset Default (1234)</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {isEditingScope && (
                          <tr className="bg-[#F5F7FA]">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="space-y-3">
                                <p className="text-xs font-bold text-[#102B69]">
                                  Atur Cakupan Unit / Klien untuk {user.fullName} ({user.role})
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {activeScopes.map((scope) => {
                                    const checked = draftScopes.includes(scope.name);
                                    return (
                                      <label
                                        key={scope.id}
                                        className="flex items-start gap-2 p-2.5 bg-white border border-[#E2E8F0] rounded-[4px] text-xs cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleMultiScope(scope.name)}
                                          className="mt-0.5 text-[#1468E8]"
                                        />
                                        <span className="min-w-0">
                                          <span className="block font-semibold text-[#172033]">
                                            {scope.name}
                                          </span>
                                          <span className="block text-[11px] text-[#64748B]">
                                            {scope.category === 'Internal'
                                              ? 'Unit Internal'
                                              : 'Klien Penempatan'}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserId(null)}
                                    className="px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveScopeEdit(user.id)}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                                  >
                                    Simpan Cakupan
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: AKUN KARYAWAN (ADR-001, OUT-318, EMP-1024, DLL.)           */}
        {/* ================================================================= */}
        {activeTab === 'employees' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                  <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                    NIK Login
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Nama, Email &amp; WhatsApp
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Penempatan &amp; Status PKWT
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    PIN / Password Login
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Status Akses
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right"
                  >
                    Kontrol &amp; Kirim Akun
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {visibleEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                      Tidak ada akun karyawan yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  visibleEmployees.map((emp) => {
                    const locked = isEmployeeLocked(emp);
                    const pendingPkwt = isEmployeePendingPkwt(emp);
                    const activePin = emp.portalPassword?.trim() || '1234';
                    const isRevealed = Boolean(revealedPasswordIds[emp.id]);
                    const isResettingPwd = resetTargetId === emp.id;

                    return (
                      <React.Fragment key={emp.id}>
                        <tr className="hover:bg-[#F5F7FA]/60 transition-colors">
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#102B69] font-mono tabular-nums">
                              {emp.employeeCode}
                            </p>
                            {emp.loginAlias && (
                              <p className="text-[11px] text-[#64748B] font-mono">
                                Login: {emp.loginAlias}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1 text-[11px] mt-0.5">
                              {emp.isNewHire && (
                                <span className="font-bold text-[#1468E8]">Baru</span>
                              )}
                              {emp.isNewHire && emp.originApplicantCode && (
                                <span aria-hidden="true" className="text-[#CBD5E1]">
                                  ·
                                </span>
                              )}
                              {emp.originApplicantCode && (
                                <span className="text-[#64748B] font-mono">
                                  Ex-{emp.originApplicantCode}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#172033] text-sm">{emp.fullName}</p>
                            <p className="text-xs text-[#64748B]">
                              {emp.email} ·{' '}
                              <span className="tabular-nums">{emp.whatsappNumber}</span>
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="text-xs font-semibold text-[#102B69]">
                              {emp.entityName}
                              {emp.placementName ? ` · ${emp.placementName}` : ''}
                            </p>
                            <p className="text-[11px] text-[#64748B] mt-0.5">
                              {emp.position} ·{' '}
                              <span
                                className={`font-semibold ${
                                  pendingPkwt ? 'text-[#B87D00]' : 'text-[#16A36A]'
                                }`}
                              >
                                {emp.contractType === 'PKWTT'
                                  ? 'PKWTT (Tetap)'
                                  : pendingPkwt
                                    ? 'Menunggu TTD PKWT'
                                    : 'PKWT Sudah TTD'}
                              </span>
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                data-testid={`emp-pin-display-${emp.employeeCode}`}
                                className="font-mono text-xs font-bold text-[#102B69] tabular-nums"
                              >
                                {isRevealed ? activePin : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealPassword(emp.id)}
                                aria-label={
                                  isRevealed
                                    ? `Sembunyikan PIN ${emp.fullName}`
                                    : `Tampilkan PIN ${emp.fullName}`
                                }
                                className="p-1 text-[#64748B] hover:text-[#102B69] cursor-pointer"
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openPasswordResetEditor(emp.id, activePin)}
                                className="text-[11px] font-semibold text-[#1468E8] hover:underline cursor-pointer"
                              >
                                {isResettingPwd ? 'Tutup' : 'Reset / Ubah PIN'}
                              </button>
                            </div>
                            {emp.passwordResetAt && (
                              <p className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                                {emp.passwordResetAt}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-xs font-bold ${
                                locked ? 'text-[#DC3545]' : 'text-[#16A36A]'
                              }`}
                            >
                              {emp.status === 'Resign'
                                ? 'Nonaktif (Resign)'
                                : locked
                                  ? 'Nonaktif / Terkunci'
                                  : 'Aktif'}
                            </span>
                            <p className="text-[11px] text-[#64748B]">
                              Status SDM: {emp.status}
                            </p>
                          </td>

                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <a
                                href={buildEmployeeWhatsappUrl(emp, 'account-pkwt')}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Kirim detail akun ${emp.employeeCode} via WhatsApp ke ${emp.fullName}`}
                                title="Kirim NIK & PIN terbaru via WhatsApp"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px] whitespace-nowrap shrink-0"
                              >
                                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>WA</span>
                              </a>
                              <a
                                href={buildEmployeeMailtoUrl(emp, 'account-pkwt')}
                                aria-label={`Kirim detail akun ${emp.employeeCode} via Email ke ${emp.fullName}`}
                                title="Kirim NIK & PIN terbaru via Email"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#D8E8FF] border border-[#C9DDFB] rounded-[4px] whitespace-nowrap shrink-0"
                              >
                                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Email</span>
                              </a>
                              <button
                                type="button"
                                disabled={emp.status === 'Resign'}
                                title={
                                  emp.status === 'Resign'
                                    ? 'Akun karyawan Resign otomatis nonaktif. Ubah status SDM di Data Karyawan jika ingin mengaktifkan.'
                                    : undefined
                                }
                                onClick={() => {
                                  if (emp.status === 'Resign') return;
                                  onToggleEmployeeAccountStatus(emp.id);
                                  setFeedbackBanner(
                                    locked
                                      ? `Akses login akun karyawan ${emp.fullName} (${emp.employeeCode}) telah diaktifkan kembali.`
                                      : `Akses login akun karyawan ${emp.fullName} (${emp.employeeCode}) telah dinonaktifkan sementara.`
                                  );
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[4px] border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                  locked
                                    ? 'text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border-[#BBF7D0]'
                                    : 'text-[#DC3545] bg-[#FEF2F2] hover:bg-[#FEE2E2] border-[#FECACA]'
                                }`}
                              >
                                {locked ? (
                                  <>
                                    <Unlock className="w-3 h-3" aria-hidden="true" />
                                    <span>{emp.status === 'Resign' ? 'Terkunci (Resign)' : 'Aktifkan Akun'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" aria-hidden="true" />
                                    <span>Nonaktifkan</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isResettingPwd && (
                          <tr className="bg-[#F8FAFC]">
                            <td colSpan={6} className="px-6 py-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <KeyRound
                                    className="w-4 h-4 text-[#1468E8]"
                                    aria-hidden="true"
                                  />
                                  <span className="font-bold text-[#102B69]">
                                    Atur / Reset PIN Login untuk {emp.fullName} (NIK:{' '}
                                    {emp.employeeCode})
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    aria-label={`PIN baru untuk ${emp.fullName}`}
                                    value={draftPassword}
                                    onChange={(e) => setDraftPassword(e.target.value)}
                                    placeholder="Minimal 4 karakter"
                                    className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] font-mono w-44"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (draftPassword.trim().length < 4) return;
                                      onResetOrUpdateEmployeePassword(emp.id, draftPassword.trim());
                                      setResetTargetId(null);
                                      setRevealedPasswordIds((prev) => ({
                                        ...prev,
                                        [emp.id]: true,
                                      }));
                                      setFeedbackBanner(
                                        `PIN / Kata Sandi untuk ${emp.fullName} (${emp.employeeCode}) diperbarui menjadi "${draftPassword.trim()}". Klik tombol WA/Email untuk mengirimkannya.`
                                      );
                                    }}
                                    className="px-3 py-1.5 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                                  >
                                    Simpan PIN Baru
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onResetOrUpdateEmployeePassword(emp.id, '1234');
                                      setResetTargetId(null);
                                      setRevealedPasswordIds((prev) => ({
                                        ...prev,
                                        [emp.id]: true,
                                      }));
                                      setFeedbackBanner(
                                        `PIN login ${emp.fullName} (${emp.employeeCode}) di-reset ke default (1234).`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                    <span>Reset Default (1234)</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: AKUN PELAMAR (PLM-2026-001, DLL. + STATUS KONVERSI)        */}
        {/* ================================================================= */}
        {activeTab === 'applicants' && (
          <div>
            {isPortalRoleTemporarilyDisabled('Pelamar') && (
              <div
                role="status"
                className="px-6 py-3.5 bg-[#FFFBEB] border-b border-[#FDE68A] text-xs text-[#92400E] flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-[#B87D00] shrink-0" aria-hidden="true" />
                <span>
                  <strong>Portal &amp; Role Pelamar Dinonaktifkan Sementara (Opsi A):</strong>{' '}
                  Data historis tetap tersimpan aman, tetapi login akun Pelamar diblokir sementara
                  agar sistem fokus pada Master Admin, Admin, Payroll, dan Karyawan.
                </span>
              </div>
            )}
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                  <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                    Kode Pelamar
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Nama, Email &amp; WhatsApp
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Status Konversi Karyawan
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    PIN / Password
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Status Akun
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right"
                  >
                    Kontrol Akses
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {visibleApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                      Tidak ada akun pelamar yang cocok dengan pencarian saat ini.
                    </td>
                  </tr>
                ) : (
                  visibleApplicants.map((app) => {
                    const matchedEmp = employees.find(
                      (e) =>
                        e.applicantId === app.id ||
                        (e.originApplicantCode &&
                          e.originApplicantCode.toLowerCase() ===
                            app.applicantCode.toLowerCase())
                    );
                    const convertedNik =
                      app.convertedToEmployeeCode || matchedEmp?.employeeCode;
                    const isRevealed = Boolean(revealedPasswordIds[app.id]);
                    const isResettingPwd = resetTargetId === app.id;

                    return (
                      <React.Fragment key={app.id}>
                        <tr className="hover:bg-[#F5F7FA]/60 transition-colors">
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#102B69] font-mono tabular-nums">
                              {app.applicantCode}
                            </p>
                            <p className="text-[11px] text-[#64748B] font-mono">
                              Login: {app.loginId}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#172033] text-sm">{app.fullName}</p>
                            <p className="text-xs text-[#64748B]">
                              {app.email} ·{' '}
                              <span className="tabular-nums">{app.whatsappNumber}</span>
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            {convertedNik ? (
                              <div>
                                <p className="text-xs font-bold text-[#1468E8]">
                                  Dialihkan ke NIK {convertedNik}
                                </p>
                                <p className="text-[11px] text-[#64748B]">
                                  Login beralih ke Portal Karyawan ({convertedNik})
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-[#64748B]">
                                Pelamar Aktif (Belum Handoff)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-[#102B69] tabular-nums">
                                {isRevealed ? app.password : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleRevealPassword(app.id)}
                                aria-label={
                                  isRevealed
                                    ? `Sembunyikan PIN pelamar ${app.fullName}`
                                    : `Tampilkan PIN pelamar ${app.fullName}`
                                }
                                className="p-1 text-[#64748B] hover:text-[#102B69] cursor-pointer"
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                              </button>
                              {!convertedNik && (
                                <button
                                  type="button"
                                  onClick={() => openPasswordResetEditor(app.id, app.password)}
                                  className="text-[11px] font-semibold text-[#1468E8] hover:underline cursor-pointer"
                                >
                                  {isResettingPwd ? 'Tutup' : 'Reset PIN'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {convertedNik ? (
                              <span className="text-xs font-bold text-[#64748B]">
                                Nonaktif (Sudah Jadi Karyawan)
                              </span>
                            ) : isPortalRoleTemporarilyDisabled('Pelamar') ? (
                              <span className="text-xs font-bold text-[#DC3545]">
                                Nonaktif (Portal Nonaktif)
                              </span>
                            ) : app.accountDisabled ? (
                              <span className="text-xs font-bold text-[#DC3545]">Nonaktif</span>
                            ) : (
                              <span className="text-xs font-bold text-[#16A36A]">Aktif</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            {convertedNik ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('employees');
                                  setQuery(convertedNik);
                                }}
                                className="text-xs font-semibold text-[#1468E8] hover:underline cursor-pointer"
                              >
                                Buka Akun {convertedNik} →
                              </button>
                            ) : isPortalRoleTemporarilyDisabled('Pelamar') ? (
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[4px] border text-[#64748B] bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed"
                              >
                                <Lock className="w-3 h-3" aria-hidden="true" />
                                <span>Terkunci (Portal Nonaktif)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onToggleApplicantAccountStatus(app.id);
                                  setFeedbackBanner(
                                    app.accountDisabled
                                      ? `Akun pelamar ${app.fullName} (${app.applicantCode}) diaktifkan.`
                                      : `Akun pelamar ${app.fullName} (${app.applicantCode}) dinonaktifkan.`
                                  );
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[4px] border cursor-pointer ${
                                  app.accountDisabled
                                    ? 'text-[#16A36A] bg-[#F0FDF4] border-[#BBF7D0]'
                                    : 'text-[#DC3545] bg-[#FEF2F2] border-[#FECACA]'
                                }`}
                              >
                                {app.accountDisabled ? 'Aktifkan Akun' : 'Nonaktifkan'}
                              </button>
                            )}
                          </td>
                        </tr>

                        {isResettingPwd && !convertedNik && (
                          <tr className="bg-[#F8FAFC]">
                            <td colSpan={6} className="px-6 py-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <span className="font-bold text-[#102B69]">
                                  Reset PIN Pelamar {app.fullName} ({app.applicantCode})
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    aria-label={`PIN baru pelamar ${app.fullName}`}
                                    value={draftPassword}
                                    onChange={(e) => setDraftPassword(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] font-mono w-40"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (draftPassword.trim().length < 4) return;
                                      onResetOrUpdateApplicantPassword(
                                        app.id,
                                        draftPassword.trim()
                                      );
                                      setResetTargetId(null);
                                      setFeedbackBanner(
                                        `PIN akun pelamar ${app.fullName} berhasil diperbarui.`
                                      );
                                    }}
                                    className="px-3 py-1.5 font-semibold text-white bg-[#1468E8] rounded-[4px] cursor-pointer"
                                  >
                                    Simpan PIN
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onResetOrUpdateApplicantPassword(app.id, '1234');
                                      setResetTargetId(null);
                                      setFeedbackBanner(
                                        `PIN akun pelamar ${app.fullName} di-reset ke 1234.`
                                      );
                                    }}
                                    className="px-3 py-1.5 font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                                  >
                                    Reset Default (1234)
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

      {/* 3. Matriks Izin Akses Modul (RBAC) */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#102B69]">Matriks Izin Akses Modul (RBAC)</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Pembagian kewenangan per modul tata kelola internal, penempatan klien, kehadiran, dan
            rekrutmen
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Modul Sistem
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#102B69]">
                  Master Admin
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#102B69]">
                  Admin
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#102B69]">
                  Rekruter
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#102B69]">
                  Payroll
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#102B69]">
                  Karyawan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {RBAC_MATRIX_ROWS.map((row) => (
                <tr key={row.module} className="hover:bg-[#F5F7FA]/60 transition-colors">
                  <td className="py-3 px-6 font-semibold text-[#172033]">{row.module}</td>
                  <td className="py-3 px-4 text-[#1468E8] font-medium">{row.masterAdmin}</td>
                  <td className="py-3 px-4 text-[#172033]">{row.admin}</td>
                  <td className="py-3 px-4 text-[#172033]">{row.rekruter}</td>
                  <td className="py-3 px-4 text-[#172033]">{row.payroll}</td>
                  <td className="py-3 px-6 text-[#64748B]">{row.karyawan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
