import React, { useEffect, useState } from 'react';
import { Check, Eye, FileCheck2, FileText, Lock, Search, X } from 'lucide-react';
import {
  AttendanceLogRecord,
  AttendanceStatus,
  ContractRecord,
  EmployeeActivityReportRecord,
  EmployeeRecord,
  EmploymentCategory,
  INITIAL_POLICY,
  LeaveAbsenceRecord,
  OperationalSnapshot,
  OrganizationScopeCategory,
  SystemSettingsConfig,
  WorkPolicyConfig,
  calculateEmployeeLeaveQuotaSummary,
  countExpiringPkwtContracts,
  doesLeaveDeductAnnualQuota,
  filterAttendanceLogs,
  filterContracts,
  isPartialDayLeaveType,
  summarizeAttendanceLogs,
} from '../../data/masterAdminData';
import {
  resolveEmployeeContractSequenceLabel,
  resolveLatestContractSignatureStatus,
} from '../../utils/pkwtLifecycle';
import { PkwtDocumentModal } from './PkwtDocumentModal';
import { EmployeeAttendanceRecapSection } from '../shared/EmployeeAttendanceRecapSection';
import { ActivityReportsBoard } from '../shared/ActivityReportsBoard';
import { LeaveFormPdfModal } from '../shared/LeaveFormPdfModal';

export type MonitoringTabId = 'summary' | 'attendance' | 'leave-alpha' | 'pkwt' | 'activity-reports';

interface MonitoringPanelProps {
  snapshots: OperationalSnapshot[];
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  contracts: ContractRecord[];
  employees?: EmployeeRecord[];
  activityReports?: EmployeeActivityReportRecord[];
  policy?: WorkPolicyConfig;
  settings?: SystemSettingsConfig;
  initialTab?: MonitoringTabId;
  onTabChange?: (tab: MonitoringTabId) => void;
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onConvertAlphaToIzin?: (id: string) => void;
  onExtendPkwtContract: (id: string) => void;
}

function getAttendanceTone(status: AttendanceStatus): string {
  switch (status) {
    case 'Hadir':
      return 'text-[#16A36A]';
    case 'Telat':
      return 'text-[#B87D00]';
    case 'Alpha':
      return 'text-[#DC3545]';
    case 'Cuti':
    case 'Izin':
    default:
      return 'text-[#1468E8]';
  }
}

function getLeaveStatusTone(status: LeaveAbsenceRecord['status']): string {
  switch (status) {
    case 'Disetujui':
    case 'Terkonfirmasi Izin':
      return 'text-[#16A36A]';
    case 'Ditolak':
    case 'Alpha':
    case 'Perlu Klarifikasi':
      return 'text-[#DC3545]';
    case 'Menunggu':
    default:
      return 'text-[#B87D00]';
  }
}

export const MonitoringPanel: React.FC<MonitoringPanelProps> = ({
  snapshots,
  attendanceLogs,
  leaveAbsences,
  contracts,
  employees = [],
  activityReports = [],
  policy = INITIAL_POLICY,
  settings,
  initialTab = 'summary',
  onTabChange,
  onApproveLeave,
  onRejectLeave,
  onConvertAlphaToIzin,
  onExtendPkwtContract,
}) => {
  const [activeTab, setActiveTab] = useState<MonitoringTabId>(initialTab);
  const [activePkwtContract, setActivePkwtContract] = useState<ContractRecord | null>(null);
  const [previewSkdRecord, setPreviewSkdRecord] = useState<LeaveAbsenceRecord | null>(null);
  const [previewLeavePdfRecord, setPreviewLeavePdfRecord] = useState<LeaveAbsenceRecord | null>(
    null
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tab: MonitoringTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Tab 1 filters
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | OrganizationScopeCategory>('Semua');
  const [selectedEntity, setSelectedEntity] = useState<string>('Semua');

  // Tab 2 filters (Attendance Check)
  const [attQuery, setAttQuery] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState<AttendanceStatus | 'Semua'>('Semua');
  const [attEmploymentFilter, setAttEmploymentFilter] = useState<EmploymentCategory | 'Semua'>('Semua');
  const [attEntityFilter, setAttEntityFilter] = useState('Semua');

  // Tab 3 filters (Leave, Sick SKD & Alpha)
  const [leaveQuery, setLeaveQuery] = useState('');
  const [leaveFilterMode, setLeaveFilterMode] = useState<
    'Semua' | 'Menunggu' | 'Izin Sakit (SKD)' | 'Disetujui' | 'Alpha'
  >('Semua');

  // Tab 4 filters (PKWT)
  const [contractQuery, setContractQuery] = useState('');
  const [contractMode, setContractMode] = useState<
    'Semua' | 'PKWT' | 'Segera Berakhir' | 'PKWTT'
  >('Semua');

  const hasClientSnapshots = snapshots.some((s) => s.category === 'Klien Penempatan');
  const attSummary = summarizeAttendanceLogs(attendanceLogs);
  const expiringPkwtCount = countExpiringPkwtContracts(contracts);
  const pendingLeaveCount = leaveAbsences.filter((l) => l.status === 'Menunggu').length;
  const sickSkdCount = leaveAbsences.filter((l) => l.type === 'Izin Sakit').length;
  const approvedLeaveCount = leaveAbsences.filter((l) => l.status === 'Disetujui').length;
  const alphaCount = leaveAbsences.filter(
    (l) =>
      (l.type === 'Alpha / Tanpa Keterangan' && l.status !== 'Terkonfirmasi Izin') ||
      l.status === 'Alpha' ||
      l.status === 'Perlu Klarifikasi'
  ).length;

  const categoryFiltered =
    categoryFilter === 'Semua'
      ? snapshots
      : snapshots.filter((s) => s.category === categoryFilter);

  const visibleSnapshots =
    selectedEntity === 'Semua'
      ? categoryFiltered
      : categoryFiltered.filter((s) => s.entityName === selectedEntity);

  const visibleAttendance = filterAttendanceLogs(
    attendanceLogs,
    attQuery,
    attStatusFilter,
    attEmploymentFilter,
    attEntityFilter
  );

  const visibleLeaves = leaveAbsences.filter((item) => {
    const q = leaveQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.employeeName.toLowerCase().includes(q) ||
      item.employeeCode.toLowerCase().includes(q) ||
      item.entityName.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (leaveFilterMode === 'Menunggu') return item.status === 'Menunggu';
    if (leaveFilterMode === 'Izin Sakit (SKD)') return item.type === 'Izin Sakit';
    if (leaveFilterMode === 'Disetujui') {
      return item.status === 'Disetujui' || item.status === 'Terkonfirmasi Izin';
    }
    if (leaveFilterMode === 'Alpha') {
      return (
        (item.type === 'Alpha / Tanpa Keterangan' && item.status !== 'Terkonfirmasi Izin') ||
        item.status === 'Alpha' ||
        item.status === 'Perlu Klarifikasi'
      );
    }
    return true;
  });

  const visibleContracts = filterContracts(contracts, contractQuery, contractMode);

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs inside Pantauan Operasional */}
      <div
        role="tablist"
        aria-label="Sub-menu pantauan operasional"
        className="flex flex-wrap gap-2 bg-white border border-[#E2E8F0] rounded-[6px] p-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'summary'}
          onClick={() => handleSelectTab('summary')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-[#102B69] text-white'
              : 'text-[#64748B] hover:text-[#102B69] hover:bg-[#F5F7FA]'
          }`}
        >
          Rekap Unit &amp; Klien
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'attendance'}
          onClick={() => handleSelectTab('attendance')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-[#102B69] text-white'
              : 'text-[#64748B] hover:text-[#102B69] hover:bg-[#F5F7FA]'
          }`}
        >
          Cek Absensi Karyawan ({attendanceLogs.length})
        </button>

        <button
          type="button"
          role="tab"
          data-testid="monitoring-tab-leave"
          aria-selected={activeTab === 'leave-alpha'}
          onClick={() => handleSelectTab('leave-alpha')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'leave-alpha'
              ? 'bg-[#102B69] text-white'
              : 'text-[#64748B] hover:text-[#102B69] hover:bg-[#F5F7FA]'
          }`}
        >
          Cuti, Izin Sakit (SKD) &amp; Alpha ({pendingLeaveCount} Menunggu)
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pkwt'}
          onClick={() => handleSelectTab('pkwt')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'pkwt'
              ? 'bg-[#102B69] text-white'
              : 'text-[#64748B] hover:text-[#102B69] hover:bg-[#F5F7FA]'
          }`}
        >
          Kontrak Kerja / PKWT ({expiringPkwtCount} Segera Berakhir)
        </button>

        <button
          type="button"
          role="tab"
          data-testid="monitoring-tab-activity-reports"
          aria-selected={activeTab === 'activity-reports'}
          onClick={() => handleSelectTab('activity-reports')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'activity-reports'
              ? 'bg-[#102B69] text-white'
              : 'text-[#64748B] hover:text-[#102B69] hover:bg-[#F5F7FA]'
          }`}
        >
          Laporan Kegiatan ({activityReports.length})
        </button>
      </div>

      {/* TAB 1: Rekap Unit & Klien */}
      {activeTab === 'summary' && (
        <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                Rekap Operasional per Unit Internal &amp; Klien
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Tingkat presensi harian, cuti, kontrak segera habis, dan kebutuhan rekrutmen
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasClientSnapshots && (
                <div className="inline-flex p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                  {(['Semua', 'Internal', 'Klien Penempatan'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(cat);
                        setSelectedEntity('Semua');
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-[#1468E8] text-white'
                          : 'text-[#64748B] hover:text-[#102B69]'
                      }`}
                    >
                      {cat === 'Internal' ? 'Unit Internal' : cat}
                    </button>
                  ))}
                </div>
              )}

              <select
                aria-label="Filter unit atau klien operasional"
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] focus:outline-none focus:border-[#1468E8]"
              >
                <option value="Semua">Semua Unit &amp; Klien</option>
                {categoryFiltered.map((s) => (
                  <option key={s.id} value={s.entityName}>
                    {s.entityName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                  <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                    Unit Internal / Klien Penempatan
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                    Kehadiran
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                    Cuti Hari Ini
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                    Kontrak Segera Berakhir
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                    Lowongan
                  </th>
                  <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                    Kandidat Aktif
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {visibleSnapshots.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <p className="font-medium text-[#172033]">{row.entityName}</p>
                      <p className="text-[11px] text-[#64748B]">
                        {row.category === 'Internal' ? 'Unit Internal' : 'Klien Penempatan'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#16A36A] tabular-nums">
                      {row.attendanceRate}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#172033] tabular-nums">
                      {row.onLeaveToday} orang
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          row.expiringContracts > 0 ? 'text-[#B87D00]' : 'text-[#64748B]'
                        }`}
                      >
                        {row.expiringContracts} kontrak
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#102B69] tabular-nums">
                      {row.openPositions} posisi
                    </td>
                    <td className="py-3.5 px-6 text-right text-[#1468E8] font-semibold tabular-nums">
                      {row.activeCandidates} pelamar
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: Cek Absensi Karyawan (Internal & Klien) */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs text-[#64748B] font-semibold">Hadir Tepat Waktu</p>
              <p className="text-xl font-extrabold text-[#16A36A] tabular-nums mt-1">
                {attSummary.hadir} Orang
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs text-[#64748B] font-semibold">Terlambat</p>
              <p className="text-xl font-extrabold text-[#B87D00] tabular-nums mt-1">
                {attSummary.telat} Orang
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs text-[#64748B] font-semibold">Cuti / Izin</p>
              <p className="text-xl font-extrabold text-[#1468E8] tabular-nums mt-1">
                {attSummary.cutiIzin} Orang
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs text-[#64748B] font-semibold">Alpha</p>
              <p className="text-xl font-extrabold text-[#DC3545] tabular-nums mt-1">
                {attSummary.alpha} Orang
              </p>
            </div>
          </div>

          {/* REKAPAN AKUMULASI ABSENSI PER KARYAWAN */}
          <EmployeeAttendanceRecapSection
            employees={employees}
            attendanceLogs={attendanceLogs}
            leaveAbsences={leaveAbsences}
            policy={policy}
            availableEntities={snapshots.map((s) => s.entityName)}
          />

          <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#102B69]">
                  Log Absensi Detail Karyawan (Internal &amp; Klien)
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Periksa jam masuk, jam pulang, keterlambatan, alpha, dan titik lokasi check-in
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
                    value={attQuery}
                    onChange={(e) => setAttQuery(e.target.value)}
                    placeholder="Cari nama, ID, lokasi..."
                    aria-label="Cari absensi karyawan"
                    className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-48 focus:outline-none focus:border-[#1468E8]"
                  />
                </div>

                {hasClientSnapshots && (
                  <select
                    aria-label="Filter tipe karyawan absensi"
                    value={attEmploymentFilter}
                    onChange={(e) =>
                      setAttEmploymentFilter(e.target.value as EmploymentCategory | 'Semua')
                    }
                    className="px-2.5 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                  >
                    <option value="Semua">Internal &amp; Klien</option>
                    <option value="Internal">Internal Saja</option>
                    <option value="Penempatan Klien">Penempatan Klien</option>
                  </select>
                )}

                <select
                  aria-label="Filter unit atau klien absensi"
                  value={attEntityFilter}
                  onChange={(e) => setAttEntityFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] max-w-[200px]"
                >
                  <option value="Semua">Semua Lokasi / Klien</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.entityName}>
                      {s.entityName}
                    </option>
                  ))}
                </select>

                <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                  {(['Semua', 'Hadir', 'Telat', 'Cuti', 'Izin', 'Alpha'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAttStatusFilter(st)}
                      className={`px-2 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                        attStatusFilter === st
                          ? 'bg-[#1468E8] text-white'
                          : 'text-[#64748B] hover:text-[#102B69]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                    <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                      Karyawan
                    </th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                      Unit / Klien Penempatan
                    </th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                      Masuk – Pulang
                    </th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                      Lokasi &amp; Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm">
                  {visibleAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-xs text-[#64748B]">
                        Tidak ada catatan presensi yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    visibleAttendance.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                        <td className="py-3 px-6">
                          <p className="font-semibold text-[#172033]">{log.employeeName}</p>
                          <p className="text-xs text-[#64748B] tabular-nums">
                            {log.employeeCode} · {log.employmentType}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-[#102B69]">
                          {log.entityName}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#172033] tabular-nums whitespace-nowrap">
                          {log.checkIn} – {log.checkOut}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-xs font-bold ${getAttendanceTone(log.status)}`}>
                            {log.status}
                            {log.lateMinutes > 0 ? ` (${log.lateMinutes} mnt)` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <p className="text-xs font-medium text-[#172033]">{log.locationUsed}</p>
                          <p className="text-[11px] text-[#64748B]">{log.notes}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: Pengajuan Cuti, Izin Sakit (SKD) & Catatan Alpha */}
      {activeTab === 'leave-alpha' && (
        <div className="space-y-6">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs font-semibold text-[#64748B]">Menunggu Persetujuan</p>
              <p className="text-2xl font-extrabold text-[#B87D00] tabular-nums mt-1">
                {pendingLeaveCount} Pengajuan
              </p>
              <p className="text-[11px] text-[#64748B] mt-1">
                Tersinkron otomatis dengan Lonceng Notifikasi
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs font-semibold text-[#64748B]">Izin Sakit (Wajib SKD)</p>
              <p className="text-2xl font-extrabold text-[#1468E8] tabular-nums mt-1">
                {sickSkdCount} Pengajuan
              </p>
              <p className="text-[11px] text-[#64748B] mt-1">
                Dilengkapi bukti Surat Keterangan Dokter
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs font-semibold text-[#64748B]">Cuti/Izin Disetujui</p>
              <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums mt-1">
                {approvedLeaveCount} Catatan
              </p>
              <p className="text-[11px] text-[#64748B] mt-1 tabular-nums">
                Otomatis memotong jatah kuota ({policy.annualLeaveQuota} hari/thn)
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
              <p className="text-xs font-semibold text-[#64748B]">Alpha (Tanpa Keterangan)</p>
              <p className="text-2xl font-extrabold text-[#DC3545] tabular-nums mt-1">
                {alphaCount} Catatan
              </p>
              <p className="text-[11px] text-[#64748B] mt-1">
                Status Alpha mengikat (tidak dapat diubah jadi izin)
              </p>
            </div>
          </div>

          {/* Main Leave & Sick Verification List */}
          <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#102B69]">
                  Verifikasi Pengajuan Cuti, Izin Sakit (SKD) &amp; Catatan Alpha
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Persetujuan Cuti/Izin otomatis memotong sisa jatah kuota karyawan &amp; mengirim
                  notifikasi ke Portal Karyawan. Izin Sakit wajib menyertakan SKD.
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
                    value={leaveQuery}
                    onChange={(e) => setLeaveQuery(e.target.value)}
                    placeholder="Cari karyawan, klien..."
                    aria-label="Cari pengajuan cuti atau izin"
                    className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-48 focus:outline-none focus:border-[#1468E8]"
                  />
                </div>

                <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                  {(
                    ['Semua', 'Menunggu', 'Izin Sakit (SKD)', 'Disetujui', 'Alpha'] as const
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setLeaveFilterMode(mode)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        leaveFilterMode === mode
                          ? 'bg-[#1468E8] text-white'
                          : 'text-[#64748B] hover:text-[#102B69]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {visibleLeaves.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#64748B]">
                  Tidak ada catatan pengajuan cuti, izin sakit, atau alpha yang sesuai filter.
                </div>
              ) : (
                visibleLeaves.map((item) => {
                  const empQuota = calculateEmployeeLeaveQuotaSummary(
                    item.employeeCode,
                    leaveAbsences,
                    policy.annualLeaveQuota
                  );
                  const isClarifiedPendingAlpha =
                    item.type === 'Alpha / Tanpa Keterangan' &&
                    item.status === 'Menunggu' &&
                    item.reason.startsWith('[Klarifikasi Karyawan]');
                  const isAlphaRecord =
                    (item.type === 'Alpha / Tanpa Keterangan' &&
                      item.status !== 'Terkonfirmasi Izin') ||
                    item.status === 'Alpha' ||
                    item.status === 'Perlu Klarifikasi';
                  const projectedRemaining = Math.max(
                    0,
                    empQuota.remainingLeaveQuota - item.daysCount
                  );
                  const partialDay = isPartialDayLeaveType(item.type);
                  const durationLabel = partialDay
                    ? item.type === 'Meninggalkan Pekerjaan' &&
                      item.leaveTimeStart &&
                      item.leaveTimeEnd
                      ? `${item.leaveTimeStart} s/d ${item.leaveTimeEnd}`
                      : item.timeDetail
                        ? `Pukul ${item.timeDetail} WIB`
                        : 'Parsial'
                    : `${item.daysCount} hari`;

                  return (
                    <div
                      key={item.id}
                      data-testid={`monitoring-leave-item-${item.id}`}
                      className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F5F7FA]/60 transition-colors"
                    >
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`px-2 py-0.5 font-bold rounded-[3px] border ${
                              isAlphaRecord
                                ? 'bg-[#FEF2F2] text-[#DC3545] border-[#FECACA]'
                                : item.type === 'Izin Sakit'
                                  ? 'bg-[#EAF2FF] text-[#1468E8] border-[#C9DDFB]'
                                  : 'bg-[#F5F7FA] text-[#102B69] border-[#E2E8F0]'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="font-semibold text-[#172033] tabular-nums">
                            {item.dateRange} ({durationLabel})
                          </span>
                          <span className="text-[#64748B]">· {item.employmentType}</span>
                          {item.submittedAt && (
                            <span className="text-[11px] text-[#64748B] tabular-nums">
                              · Diajukan: {item.submittedAt}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-[#172033]">
                          {item.employeeName} ({item.employeeCode}) —{' '}
                          <span className="font-medium text-[#102B69]">{item.entityName}</span>
                        </h3>

                        <p className="text-xs text-[#64748B]">{item.reason}</p>

                        {item.replacementStaff?.fullName && (
                          <p className="text-[11px] text-[#475569]">
                            Staff Pengganti:{' '}
                            <strong className="text-[#172033]">
                              {item.replacementStaff.fullName}
                            </strong>{' '}
                            ({item.replacementStaff.employeeCode})
                          </p>
                        )}

                        {/* Real-time Quota & SKD Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          {!isAlphaRecord && (
                            <span className="px-2 py-0.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[3px] text-[#102B69] font-semibold tabular-nums">
                              Sisa Jatah Cuti Tahunan: {empQuota.remainingLeaveQuota} /{' '}
                              {empQuota.annualLeaveQuota} Hari (Terpakai {empQuota.approvedLeaveDays}{' '}
                              hari · Sakit SKD: {empQuota.approvedSickDays} hari)
                            </span>
                          )}

                          {item.status === 'Menunggu' &&
                            doesLeaveDeductAnnualQuota(item.type) && (
                              <span className="px-2 py-0.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-[3px] text-[#B87D00] font-semibold tabular-nums">
                                Jika Disetujui → Sisa Jatah Menjadi: {projectedRemaining} /{' '}
                                {empQuota.annualLeaveQuota} Hari
                              </span>
                            )}

                          {item.type === 'Izin Sakit' && (
                            <div className="inline-flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[3px] text-[#16A36A] font-semibold">
                                <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>
                                  SKD Terlampir: {item.skdFileName || 'Surat_Keterangan_Dokter.pdf'}
                                </span>
                              </span>
                              {item.doctorOrClinicName && (
                                <span className="text-[#64748B]">
                                  ({item.doctorOrClinicName})
                                </span>
                              )}
                              {item.skdFileDataUrl && (
                                <button
                                  type="button"
                                  data-testid={`view-skd-${item.id}`}
                                  onClick={() => setPreviewSkdRecord(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[3px] transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" aria-hidden="true" />
                                  <span>Lihat Bukti SKD</span>
                                </button>
                              )}
                            </div>
                          )}

                          {item.reviewedBy && (
                            <span className="text-[#64748B]">
                              Diproses oleh {item.reviewedBy}{' '}
                              {item.reviewedAt ? `(${item.reviewedAt})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {!isAlphaRecord && (
                          <button
                            type="button"
                            data-testid={`monitoring-leave-pdf-${item.id}`}
                            onClick={() => setPreviewLeavePdfRecord(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer whitespace-nowrap"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                            <span>Form PDF</span>
                          </button>
                        )}

                        {item.status === 'Menunggu' && !isAlphaRecord && (
                          <>
                            <button
                              type="button"
                              data-testid={`approve-leave-${item.id}`}
                              onClick={() => onApproveLeave(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>
                                {doesLeaveDeductAnnualQuota(item.type)
                                  ? 'Setujui & Potong Jatah'
                                  : 'Setujui Permohonan'}
                              </span>
                            </button>
                            <button
                              type="button"
                              data-testid={`reject-leave-${item.id}`}
                              onClick={() => onRejectLeave(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#DC3545] bg-white hover:bg-[#FEF2F2] border border-[#E2E8F0] rounded-[4px] cursor-pointer whitespace-nowrap"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Tolak</span>
                            </button>
                          </>
                        )}

                        {isClarifiedPendingAlpha && (
                          <>
                            <button
                              type="button"
                              data-testid={`convert-alpha-${item.id}`}
                              onClick={() => onConvertAlphaToIzin?.(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Konfirmasi Jadi Izin</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`reject-alpha-${item.id}`}
                              onClick={() => onRejectLeave(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#DC3545] bg-white hover:bg-[#FEF2F2] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Tetap Alpha (Tolak)</span>
                            </button>
                          </>
                        )}

                        {isAlphaRecord && !isClarifiedPendingAlpha && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#DC3545] bg-[#FEF2F2] border border-[#FECACA] rounded-[4px]">
                            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Alpha Mengikat (Tanpa Keterangan)</span>
                          </span>
                        )}

                        {!isAlphaRecord && item.status !== 'Menunggu' && (
                          <span className={`text-xs font-bold ${getLeaveStatusTone(item.status)}`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Employee Leave & Sick Quota Recap Table */}
          {employees.length > 0 && (
            <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#102B69]">
                  Rekap Jatah Cuti Tahunan, Izin Sakit (SKD) &amp; Alpha Karyawan
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                  Sisa jatah cuti otomatis berkurang dari kuota standar ({policy.annualLeaveQuota}{' '}
                  hari/tahun) setiap kali pengajuan Cuti / Izin disetujui
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                      <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                        Karyawan
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                        Unit / Klien Penempatan
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Jatah Tahunan
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Cuti/Izin Terpakai
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Sisa Jatah Cuti
                      </th>
                      <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                        Sakit (SKD)
                      </th>
                      <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                        Alpha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-sm">
                    {employees.map((emp) => {
                      const qSummary = calculateEmployeeLeaveQuotaSummary(
                        emp.employeeCode,
                        leaveAbsences,
                        policy.annualLeaveQuota
                      );
                      return (
                        <tr key={emp.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                          <td className="py-3 px-6">
                            <p className="font-semibold text-[#172033]">{emp.fullName}</p>
                            <p className="text-xs text-[#64748B] tabular-nums">{emp.employeeCode}</p>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-[#102B69]">
                            {emp.entityName}
                          </td>
                          <td className="py-3 px-4 text-xs text-right text-[#64748B] tabular-nums">
                            {qSummary.annualLeaveQuota} hari
                          </td>
                          <td className="py-3 px-4 text-xs text-right font-semibold text-[#172033] tabular-nums">
                            {qSummary.approvedLeaveDays} hari
                          </td>
                          <td className="py-3 px-4 text-xs text-right font-bold text-[#16A36A] tabular-nums">
                            {qSummary.remainingLeaveQuota} hari
                          </td>
                          <td className="py-3 px-4 text-xs text-right font-semibold text-[#1468E8] tabular-nums">
                            {qSummary.approvedSickDays} hari
                          </td>
                          <td className="py-3 px-6 text-xs text-right font-bold text-[#DC3545] tabular-nums">
                            {qSummary.alphaDays} hari
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 4: Daftar Kontrak Kerja (PKWT / PKWTT) */}
      {activeTab === 'pkwt' && (
        <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                Pengawasan Kontrak Kerja (PKWT &amp; PKWTT)
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pantau masa berlaku perjanjian kerja karyawan internal maupun penempatan klien dan
                proses perpanjangan PKWT
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={contractQuery}
                  onChange={(e) => setContractQuery(e.target.value)}
                  placeholder="Cari nomor PKWT, nama..."
                  aria-label="Cari kontrak PKWT"
                  className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-52 focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                {(['Semua', 'PKWT', 'Segera Berakhir', 'PKWTT'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setContractMode(mode)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                      contractMode === mode
                        ? 'bg-[#1468E8] text-white'
                        : 'text-[#64748B] hover:text-[#102B69]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                  <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                    Nomor Kontrak
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Karyawan
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Unit / Klien Penempatan
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Periode Kontrak
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {visibleContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                      Tidak ada kontrak kerja yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  visibleContracts.map((c) => {
                    const matchedEmp = employees.find(
                      (e) => e.employeeCode.toLowerCase() === c.employeeCode.toLowerCase()
                    );
                    const seqLabel = matchedEmp
                      ? resolveEmployeeContractSequenceLabel(matchedEmp)
                      : c.contractType;
                    const ttdStatus = matchedEmp
                      ? resolveLatestContractSignatureStatus(matchedEmp)
                      : null;
                    return (
                      <tr key={c.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                        <td className="py-3 px-6">
                          <p className="text-xs font-bold text-[#102B69] tabular-nums">
                            {c.contractNumber}
                          </p>
                          <p className="text-[11px] text-[#64748B]">{seqLabel}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#172033]">{c.employeeName}</p>
                          <p className="text-xs text-[#64748B] tabular-nums">
                            {c.employeeCode} · {c.employmentType}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#102B69] font-medium">
                          {c.entityName}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#172033] tabular-nums">
                          <p>
                            {c.startDate} – {c.endDate}
                          </p>
                          {c.daysRemaining !== null && (
                            <p className="text-[11px] text-[#64748B]">
                              Sisa {c.daysRemaining} hari
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap space-y-0.5">
                          <p
                            className={`font-bold ${
                              c.status === 'Segera Berakhir'
                                ? 'text-[#B87D00]'
                                : 'text-[#16A36A]'
                            }`}
                          >
                            {c.status}
                          </p>
                          {c.extensionRequested && c.status !== 'Diperpanjang' && (
                            <p className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-[#FFFBEB] text-[#B87D00] border border-[#FDE68A] rounded-[3px]">
                              Usulan Admin · Menunggu ACC
                            </p>
                          )}
                          {ttdStatus && c.contractType === 'PKWT' && (
                            <p
                              className={`text-[11px] font-semibold ${
                                ttdStatus === 'Menunggu TTD Karyawan'
                                  ? 'text-[#B87D00]'
                                  : 'text-[#16A36A]'
                              }`}
                            >
                              {ttdStatus}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {c.contractType === 'PKWT' && (
                              <button
                                type="button"
                                onClick={() => setActivePkwtContract(c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Lihat / Cetak PKWT</span>
                              </button>
                            )}
                            {c.contractType === 'PKWT' && c.status !== 'Diperpanjang' ? (
                              <button
                                type="button"
                                data-testid={`extend-pkwt-${c.id}`}
                                onClick={() => onExtendPkwtContract(c.id)}
                                className="text-xs font-semibold text-[#1468E8] hover:text-[#102B69] cursor-pointer"
                              >
                                {c.extensionRequested
                                  ? 'ACC & Perpanjang 6 Bln'
                                  : 'Perpanjang 6 Bulan'}
                              </button>
                            ) : c.contractType === 'PKWT' && ttdStatus === 'Menunggu TTD Karyawan' ? (
                              <span className="text-[11px] font-semibold text-[#B87D00]">
                                Menunggu TTD di Karyawan
                              </span>
                            ) : c.contractType !== 'PKWT' ? (
                              <span className="text-xs text-[#64748B]">—</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: Laporan Kegiatan Karyawan (Internal & Eksternal) */}
      {activeTab === 'activity-reports' && (
        <ActivityReportsBoard
          reports={activityReports}
          title="Laporan Kegiatan Karyawan — Lintas Unit & Client"
          subtitle="Pantauan langsung pembaruan aktivitas kerja seluruh karyawan Internal maupun Eksternal tanpa persetujuan (ACC)."
          csvFileNamePrefix="laporan-kegiatan-semua-karyawan"
        />
      )}

      {activePkwtContract && (
        <PkwtDocumentModal
          contract={activePkwtContract}
          employee={employees.find((e) => e.employeeCode === activePkwtContract.employeeCode)}
          settings={settings}
          onClose={() => setActivePkwtContract(null)}
        />
      )}

      {previewLeavePdfRecord && (
        <LeaveFormPdfModal
          record={previewLeavePdfRecord}
          employee={employees.find(
            (e) =>
              e.employeeCode.toLowerCase() ===
              previewLeavePdfRecord.employeeCode.toLowerCase()
          )}
          quotaSummary={calculateEmployeeLeaveQuotaSummary(
            previewLeavePdfRecord.employeeCode,
            leaveAbsences,
            policy.annualLeaveQuota
          )}
          onClose={() => setPreviewLeavePdfRecord(null)}
        />
      )}

      {/* SKD Medical Certificate Preview Modal */}
      {previewSkdRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Surat Keterangan Dokter (SKD)"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/60"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-[#102B69] text-white flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[#93C5FD]">
                  Verifikasi Lampiran Medis Wajib (SKD)
                </p>
                <h3 className="text-sm font-bold">
                  {previewSkdRecord.skdFileName || 'Surat_Keterangan_Dokter.pdf'} —{' '}
                  {previewSkdRecord.employeeName} ({previewSkdRecord.employeeCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSkdRecord(null)}
                aria-label="Tutup pratinjau SKD"
                className="p-1.5 rounded-[4px] text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                <div>
                  <p className="text-[#64748B]">Karyawan &amp; Unit</p>
                  <p className="font-bold text-[#102B69] mt-0.5">
                    {previewSkdRecord.employeeName} · {previewSkdRecord.entityName}
                  </p>
                </div>
                <div>
                  <p className="text-[#64748B]">Tanggal &amp; Durasi Sakit</p>
                  <p className="font-bold text-[#172033] mt-0.5 tabular-nums">
                    {previewSkdRecord.dateRange} ({previewSkdRecord.daysCount} hari)
                  </p>
                </div>
                <div>
                  <p className="text-[#64748B]">Klinik / Dokter Pemeriksa</p>
                  <p className="font-bold text-[#1468E8] mt-0.5">
                    {previewSkdRecord.doctorOrClinicName || 'Klinik Rekanan Terverifikasi'}
                  </p>
                </div>
              </div>

              {previewSkdRecord.skdFileDataUrl ? (
                <div className="border border-[#E2E8F0] rounded-[6px] bg-[#F8FAFC] p-3 flex items-center justify-center">
                  <img
                    src={previewSkdRecord.skdFileDataUrl}
                    alt={`Surat Keterangan Dokter ${previewSkdRecord.employeeName}`}
                    className="max-h-[340px] w-auto object-contain rounded-[4px]"
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-[#64748B] border border-[#E2E8F0] rounded-[6px]">
                  Berkas SKD ({previewSkdRecord.skdFileName}) terlampir.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
                <span className="text-[#64748B]">
                  Status Pengajuan: <strong className="text-[#102B69]">{previewSkdRecord.status}</strong>
                </span>
                <div className="flex items-center gap-2">
                  {previewSkdRecord.status === 'Menunggu' && (
                    <button
                      type="button"
                      onClick={() => {
                        onApproveLeave(previewSkdRecord.id);
                        setPreviewSkdRecord(null);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#16A36A] hover:bg-[#128557] rounded-[4px] cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Setujui Izin Sakit (SKD Valid)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewSkdRecord(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                  >
                    Tutup Pratinjau
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
