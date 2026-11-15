import React, { useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AttendanceStatus,
  EmployeeAttendanceRecapRow,
  EmployeeDisciplineStatus,
  EmployeeRecord,
  LeaveAbsenceRecord,
  WorkPolicyConfig,
  buildAttendanceRecapMailtoUrl,
  buildAttendanceRecapWhatsappUrl,
  buildEmployeeAttendanceRecapCsv,
  buildPerEmployeeAttendanceRecap,
} from '../../data/masterAdminData';

interface EmployeeAttendanceRecapSectionProps {
  employees: EmployeeRecord[];
  attendanceLogs: import('../../data/masterAdminData').AttendanceLogRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  policy: WorkPolicyConfig;
  availableEntities?: string[];
  onInspectEmployeeProfile?: (employeeCode: string) => void;
}

function getDisciplineBadgeStyle(status: EmployeeDisciplineStatus): string {
  switch (status) {
    case 'Evaluasi Disiplin (Alpha)':
      return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
    case 'Perlu Pembinaan Telat':
      return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    case 'Catatan Terlambat Ringan':
      return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
    case 'Disiplin Tertib':
    default:
      return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
  }
}

function getAttendanceStatusBadge(status: AttendanceStatus): string {
  switch (status) {
    case 'Hadir':
      return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
    case 'Telat':
      return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    case 'Alpha':
      return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
    case 'Cuti':
    case 'Izin':
    default:
      return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
  }
}

export const EmployeeAttendanceRecapSection: React.FC<EmployeeAttendanceRecapSectionProps> = ({
  employees,
  attendanceLogs,
  leaveAbsences,
  policy,
  availableEntities,
  onInspectEmployeeProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('Semua');
  const [disciplineFilter, setDisciplineFilter] = useState<'Semua' | EmployeeDisciplineStatus>(
    'Semua'
  );
  const [selectedRecap, setSelectedRecap] = useState<EmployeeAttendanceRecapRow | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const allRecapRows = buildPerEmployeeAttendanceRecap({
    employees,
    attendanceLogs,
    leaveAbsences,
    policy,
  });

  const entityOptions =
    availableEntities && availableEntities.length > 0
      ? availableEntities
      : Array.from(new Set(allRecapRows.map((r) => r.entityName)));

  const filteredRows = allRecapRows.filter((row) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      row.employeeName.toLowerCase().includes(q) ||
      row.employeeCode.toLowerCase().includes(q) ||
      row.entityName.toLowerCase().includes(q) ||
      row.position.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (entityFilter !== 'Semua' && row.entityName !== entityFilter) return false;
    if (disciplineFilter !== 'Semua' && row.disciplineStatus !== disciplineFilter) return false;
    return true;
  });

  const liveSelectedRecap = selectedRecap
    ? allRecapRows.find((r) => r.employeeCode === selectedRecap.employeeCode) ?? selectedRecap
    : null;

  const triggerCsvDownload = (rowsToExport: EmployeeAttendanceRecapRow[], filename: string) => {
    const csvContent = buildEmployeeAttendanceRecapCsv(rowsToExport);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    setExportNotice(
      `Berhasil mengunduh rekapan absensi (${rowsToExport.length} karyawan) — ${filename}`
    );
  };

  return (
    <div className="space-y-4">
      {exportNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 px-4 py-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[6px] text-xs font-semibold text-[#065F46]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" aria-hidden="true" />
            <span>{exportNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#102B69]">
                Rekapan Akumulasi Absensi Per Karyawan (Periode Berjalan: Nov 2026)
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-[#EAF2FF] text-[#1468E8] rounded-[4px]">
                {filteredRows.length} Karyawan
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Akumulasi hadir tepat waktu, frekuensi &amp; total menit terlambat, pemakaian cuti,
              izin sakit (SKD), serta catatan Alpha per individu.
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIK, jabatan..."
                aria-label="Cari rekapan absensi per karyawan"
                className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-48 focus:outline-none focus:border-[#1468E8]"
              />
            </div>

            <select
              aria-label="Filter unit atau klien rekapan karyawan"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-2.5 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] max-w-[210px]"
            >
              <option value="Semua">Semua Unit &amp; Klien</option>
              {entityOptions.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter status disiplin karyawan"
              value={disciplineFilter}
              onChange={(e) =>
                setDisciplineFilter(e.target.value as 'Semua' | EmployeeDisciplineStatus)
              }
              className="px-2.5 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
            >
              <option value="Semua">Semua Status Disiplin</option>
              <option value="Disiplin Tertib">Disiplin Tertib</option>
              <option value="Catatan Terlambat Ringan">Catatan Terlambat Ringan</option>
              <option value="Perlu Pembinaan Telat">Perlu Pembinaan Telat</option>
              <option value="Evaluasi Disiplin (Alpha)">Evaluasi Disiplin (Alpha)</option>
            </select>

            <button
              type="button"
              onClick={() =>
                triggerCsvDownload(
                  filteredRows,
                  `Rekapan_Absensi_Karyawan_PEVORA_Nov2026.csv`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#102B69] hover:bg-[#1468E8] rounded-[4px] transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unduh Rekapan (CSV)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Karyawan &amp; Jabatan
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Penempatan &amp; Jam Kerja Wajib
                </th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold text-[#64748B] text-center">
                  Total Hadir
                </th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold text-[#64748B] text-center">
                  Frekuensi &amp; Menit Telat
                </th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold text-[#64748B] text-center">
                  Cuti &amp; Sisa Kuota
                </th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold text-[#64748B] text-center">
                  Sakit (SKD)
                </th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold text-[#64748B] text-center">
                  Alpha
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Kehadiran &amp; Disiplin
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Rincian
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada data rekapan karyawan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.employeeCode} className="hover:bg-[#F5F7FA]/60 transition-colors">
                    <td className="py-3.5 px-6">
                      {onInspectEmployeeProfile ? (
                        <button
                          type="button"
                          onClick={() => onInspectEmployeeProfile(row.employeeCode)}
                          className="font-bold text-[#102B69] hover:text-[#1468E8] hover:underline text-left cursor-pointer"
                        >
                          {row.employeeName}
                        </button>
                      ) : (
                        <p className="font-bold text-[#102B69]">{row.employeeName}</p>
                      )}
                      <p className="text-xs text-[#64748B] tabular-nums">
                        {row.employeeCode} · {row.position}
                      </p>
                      <p className="text-[11px] text-[#64748B] tabular-nums mt-0.5">
                        WA: {row.whatsappNumber} · {row.email}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-xs font-semibold text-[#172033]">{row.entityName}</p>
                      <p className="text-[11px] text-[#64748B] tabular-nums mt-0.5">
                        Wajib: <span className="font-semibold text-[#102B69]">{row.checkInTime} – {row.checkOutTime} WIB</span> (Tol. {row.lateToleranceMinutes}m)
                      </p>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded-[3px] ${
                          row.isCustomClientOverride
                            ? 'bg-[#EAF2FF] text-[#1468E8]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {row.policySourceLabel}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center tabular-nums">
                      <p className="text-xs font-extrabold text-[#102B69]">
                        {row.totalPresentDays} Hari
                      </p>
                      <p className="text-[11px] text-[#16A36A] font-semibold">
                        {row.hadirTepatWaktuDays} Tepat Waktu
                      </p>
                    </td>

                    <td className="py-3.5 px-3 text-center tabular-nums">
                      {row.telatCount > 0 ? (
                        <div>
                          <span className="inline-block px-2 py-0.5 text-xs font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded-[4px]">
                            {row.telatCount}x Telat
                          </span>
                          <p className="text-[11px] font-semibold text-[#B45309] mt-0.5">
                            Total {row.totalLateMinutes} menit
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[#16A36A]">
                          0x · Tepat Waktu
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center tabular-nums">
                      <p className="text-xs font-bold text-[#172033]">
                        {row.approvedLeaveDays} Hari Dipakai
                      </p>
                      <p className="text-[11px] font-semibold text-[#1468E8]">
                        Sisa: {row.remainingLeaveQuota} / {row.annualLeaveQuota} hr
                      </p>
                      {row.pendingLeaveDays > 0 && (
                        <p className="text-[10px] font-semibold text-[#B45309]">
                          ({row.pendingLeaveDays} hr menunggu)
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center tabular-nums">
                      <p className="text-xs font-bold text-[#1468E8]">
                        {row.approvedSickDays} Hari
                      </p>
                      {row.pendingSickDays > 0 ? (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#FFFBEB] text-[#B45309] rounded-[3px]">
                          +{row.pendingSickDays} hr (SKD Menunggu)
                        </span>
                      ) : (
                        <p className="text-[10px] text-[#64748B]">Wajib SKD</p>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center tabular-nums">
                      {row.alphaDays > 0 ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-extrabold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] rounded-[4px]">
                          {row.alphaDays} Hari Alpha
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#64748B]">0 Hari</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#102B69] tabular-nums">
                          {row.attendanceRatePercent}%
                        </span>
                        <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              row.alphaDays > 0
                                ? 'bg-[#DC2626]'
                                : row.telatCount > 0
                                  ? 'bg-[#D97706]'
                                  : 'bg-[#16A36A]'
                            }`}
                            style={{ width: `${Math.min(100, row.attendanceRatePercent)}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold border rounded-[4px] ${getDisciplineBadgeStyle(
                          row.disciplineStatus
                        )}`}
                      >
                        {row.disciplineStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <a
                          href={buildAttendanceRecapWhatsappUrl(row)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Kirim rekapan via WhatsApp ke ${row.employeeName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>WA</span>
                        </a>
                        <a
                          href={buildAttendanceRecapMailtoUrl(row)}
                          aria-label={`Kirim rekapan via Email ke ${row.employeeName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px]"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                          <span>Email</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setSelectedRecap(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Lihat Rincian</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL RINCIAN REKAPAN & RIWAYAT ABSENSI PER KARYAWAN */}
      {liveSelectedRecap && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-recap-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4 overflow-y-auto"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] max-w-4xl w-full overflow-hidden shadow-xl my-8">
            <div className="px-6 py-4 bg-[#102B69] text-white flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-[#93C5FD]">
                  Rekapan Detail Presensi, Keterlambatan, Cuti &amp; Kedisiplinan Individu
                </p>
                <h3 id="emp-recap-modal-title" className="text-base font-bold mt-0.5">
                  {liveSelectedRecap.employeeName} ({liveSelectedRecap.employeeCode}) —{' '}
                  {liveSelectedRecap.position}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecap(null)}
                aria-label="Tutup rincian rekapan karyawan"
                className="p-1.5 rounded-[4px] text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Jadwal Kerja Wajib & Kebijakan Klien */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#102B69]">
                      Unit / Klien: {liveSelectedRecap.entityName}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-[#EAF2FF] text-[#1468E8] rounded-[4px]">
                      {liveSelectedRecap.policySourceLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold border rounded-[4px] ${getDisciplineBadgeStyle(
                        liveSelectedRecap.disciplineStatus
                      )}`}
                    >
                      {liveSelectedRecap.disciplineStatus}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                      Jam Kerja Wajib:{' '}
                      <strong className="text-[#102B69]">
                        {liveSelectedRecap.checkInTime} – {liveSelectedRecap.checkOutTime} WIB
                      </strong>{' '}
                      (Toleransi Telat {liveSelectedRecap.lateToleranceMinutes} menit ·{' '}
                      {liveSelectedRecap.workDays})
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                      Titik Penempatan: <strong>{liveSelectedRecap.placementLabel}</strong> (
                      {liveSelectedRecap.locationMode})
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={buildAttendanceRecapWhatsappUrl(liveSelectedRecap)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Kirim Rekap WA</span>
                  </a>
                  <a
                    href={buildAttendanceRecapMailtoUrl(liveSelectedRecap)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                    <span>Kirim Email</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      triggerCsvDownload(
                        [liveSelectedRecap],
                        `Rekap_Absensi_${liveSelectedRecap.employeeCode}_${liveSelectedRecap.employeeName.replace(/\s+/g, '_')}.csv`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                    <span>Unduh CSV Individu</span>
                  </button>
                </div>
              </div>

              {/* 5 Kartu Akumulasi Individu */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-[6px]">
                  <p className="text-[11px] font-semibold text-[#64748B]">Total Hari Masuk</p>
                  <p className="text-lg font-extrabold text-[#102B69] tabular-nums mt-0.5">
                    {liveSelectedRecap.totalPresentDays} Hari
                  </p>
                  <p className="text-[11px] text-[#16A36A] font-semibold">
                    {liveSelectedRecap.hadirTepatWaktuDays} hr tepat waktu
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-[6px]">
                  <p className="text-[11px] font-semibold text-[#64748B]">Akumulasi Telat</p>
                  <p className="text-lg font-extrabold text-[#B45309] tabular-nums mt-0.5">
                    {liveSelectedRecap.telatCount}x ({liveSelectedRecap.totalLateMinutes}m)
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Toleransi {liveSelectedRecap.lateToleranceMinutes} mnt/hari
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-[6px]">
                  <p className="text-[11px] font-semibold text-[#64748B]">Sisa Jatah Cuti</p>
                  <p className="text-lg font-extrabold text-[#1468E8] tabular-nums mt-0.5">
                    {liveSelectedRecap.remainingLeaveQuota} / {liveSelectedRecap.annualLeaveQuota}{' '}
                    Hr
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Terpakai: {liveSelectedRecap.approvedLeaveDays} hari
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-[6px]">
                  <p className="text-[11px] font-semibold text-[#64748B]">Izin Sakit (SKD)</p>
                  <p className="text-lg font-extrabold text-[#102B69] tabular-nums mt-0.5">
                    {liveSelectedRecap.approvedSickDays} Hari
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {liveSelectedRecap.pendingSickDays > 0
                      ? `${liveSelectedRecap.pendingSickDays} hr menunggu verifikasi`
                      : 'Bukti SKD terverifikasi'}
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-[6px]">
                  <p className="text-[11px] font-semibold text-[#64748B]">Catatan Alpha</p>
                  <p
                    className={`text-lg font-extrabold tabular-nums mt-0.5 ${
                      liveSelectedRecap.alphaDays > 0 ? 'text-[#DC2626]' : 'text-[#16A36A]'
                    }`}
                  >
                    {liveSelectedRecap.alphaDays} Hari
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Kehadiran: {liveSelectedRecap.attendanceRatePercent}%
                  </p>
                </div>
              </div>

              {/* Tabel Riwayat Presensi Harian Individu (Tanggal demi Tanggal) */}
              <div className="border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#102B69] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <span>
                      Rincian Riwayat Presensi Harian — {liveSelectedRecap.employeeName} (
                      {liveSelectedRecap.dailyHistory.length} Hari Tercatat)
                    </span>
                  </h4>
                  <span className="text-[11px] text-[#64748B]">Periode Berjalan: November 2026</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                        <th className="py-2.5 px-4 text-xs font-semibold text-[#64748B]">
                          Tanggal
                        </th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-[#64748B]">
                          Jam Masuk – Pulang
                        </th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-[#64748B]">
                          Status Presensi
                        </th>
                        <th className="py-2.5 px-4 text-xs font-semibold text-[#64748B]">
                          Titik Lokasi &amp; Evaluasi Kebijakan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      {liveSelectedRecap.dailyHistory.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-4 font-semibold text-[#102B69] whitespace-nowrap">
                            {log.dateLabel}
                          </td>
                          <td className="py-2.5 px-4 tabular-nums text-[#172033] whitespace-nowrap">
                            {log.checkIn} – {log.checkOut}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-bold border rounded-[4px] ${getAttendanceStatusBadge(
                                log.status
                              )}`}
                            >
                              {log.status}
                              {log.lateMinutes > 0 ? ` (+${log.lateMinutes} mnt)` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="font-semibold text-[#172033]">{log.locationUsed}</p>
                            <p className="text-[11px] text-[#64748B]">{log.notes}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Riwayat Cuti, Izin Sakit (SKD) & Alpha Individu */}
              <div className="border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#102B69] flex items-center gap-1.5">
                    <CalendarCheck2 className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <span>
                      Riwayat Pengajuan Cuti, Izin Sakit (SKD) &amp; Catatan Alpha Individu (
                      {liveSelectedRecap.leaveHistory.length})
                    </span>
                  </h4>
                </div>

                {liveSelectedRecap.leaveHistory.length === 0 ? (
                  <div className="p-4 text-xs text-[#64748B]">
                    Belum ada riwayat pengajuan cuti, izin sakit, atau catatan alpha untuk karyawan
                    ini.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {liveSelectedRecap.leaveHistory.map((lv) => (
                      <div
                        key={lv.id}
                        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[#102B69]">{lv.type}</span>
                            <span className="text-[#475569] font-semibold">
                              {lv.dateRange} ({lv.daysCount} hari)
                            </span>
                            {lv.skdFileName && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-[4px]">
                                <FileCheck2 className="w-3 h-3" aria-hidden="true" />
                                SKD: {lv.skdFileName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5">{lv.reason}</p>
                        </div>

                        <span
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-[4px] ${
                            lv.status === 'Disetujui'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : lv.status === 'Alpha' || lv.status === 'Ditolak'
                                ? 'bg-[#FEF2F2] text-[#B91C1C]'
                                : 'bg-[#FFFBEB] text-[#B45309]'
                          }`}
                        >
                          {lv.status === 'Alpha' ? 'Alpha Mengikat' : lv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecap(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#102B69] hover:bg-[#1468E8] rounded-[4px] transition-colors cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
