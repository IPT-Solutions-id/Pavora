import React, { useState } from 'react';
import { Camera, Clock, Mail, MapPin, MessageCircle, Search, ShieldCheck, X } from 'lucide-react';
import {
  AttendanceLogRecord,
  AttendanceStatus,
  EmployeeRecord,
  LeaveAbsenceRecord,
  WorkPolicyConfig,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  filterAttendanceLogs,
  summarizeAttendanceLogs,
} from '../../data/masterAdminData';
import { EmployeeAttendanceRecapSection } from '../shared/EmployeeAttendanceRecapSection';

interface AdminAttendancePanelProps {
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences?: LeaveAbsenceRecord[];
  employees: EmployeeRecord[];
  policy: WorkPolicyConfig;
  assignedScopes: string[];
  onVerifyAttendanceNote: (logId: string, notes: string) => void;
  onInspectEmployee: (employeeCode: string) => void;
}

function getAttendanceTone(status: AttendanceStatus): string {
  switch (status) {
    case 'Hadir':
      return 'text-[#16A36A]';
    case 'Telat':
      return 'text-[#B87D00]';
    case 'Alpha':
      return 'text-[#DC3545]';
    default:
      return 'text-[#1468E8]';
  }
}

export const AdminAttendancePanel: React.FC<AdminAttendancePanelProps> = ({
  attendanceLogs,
  leaveAbsences = [],
  employees,
  policy,
  assignedScopes,
  onVerifyAttendanceNote,
  onInspectEmployee,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'Semua'>('Semua');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [selfiePreviewLog, setSelfiePreviewLog] = useState<AttendanceLogRecord | null>(null);

  const summary = summarizeAttendanceLogs(attendanceLogs);
  const visibleLogs = filterAttendanceLogs(attendanceLogs, query, statusFilter);
  const scopedLocations = policy.attendanceLocations.filter(
    (loc) => assignedScopes.includes(loc.entityName) && loc.status === 'Aktif'
  );
  const scopedOverrides = policy.clientOverrides.filter((ov) =>
    assignedScopes.includes(ov.entityName)
  );

  return (
    <div className="space-y-6">
      {/* Attendance KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Hadir Tepat Waktu</p>
          <p className="text-xl font-extrabold text-[#16A36A] tabular-nums mt-1">
            {summary.hadir} Orang
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Terlambat</p>
          <p className="text-xl font-extrabold text-[#B87D00] tabular-nums mt-1">
            {summary.telat} Orang
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Cuti / Izin</p>
          <p className="text-xl font-extrabold text-[#1468E8] tabular-nums mt-1">
            {summary.cutiIzin} Orang
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Alpha</p>
          <p className="text-xl font-extrabold text-[#DC3545] tabular-nums mt-1">
            {summary.alpha} Orang
          </p>
        </div>
      </div>

      {/* Rekapan Akumulasi Absensi Per Karyawan di Cakupan Admin */}
      <EmployeeAttendanceRecapSection
        employees={employees}
        attendanceLogs={attendanceLogs}
        leaveAbsences={leaveAbsences}
        policy={policy}
        availableEntities={assignedScopes}
        onInspectEmployeeProfile={onInspectEmployee}
      />

      {/* Daily Attendance Verification Table */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">
              Verifikasi Presensi Harian Cakupan
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pantau jam masuk/pulang, titik check-in, dan tambahkan catatan verifikasi lapangan
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
                placeholder="Cari karyawan, lokasi..."
                aria-label="Cari presensi cakupan"
                className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-48 focus:outline-none focus:border-[#1468E8]"
              />
            </div>

            <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
              {(['Semua', 'Hadir', 'Telat', 'Cuti', 'Izin', 'Alpha'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer ${
                    statusFilter === st
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
                  Unit / Klien
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Masuk – Pulang
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Status
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Lokasi &amp; Catatan
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Verifikasi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {visibleLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada catatan presensi di cakupan Anda yang sesuai filter.
                  </td>
                </tr>
              ) : (
                visibleLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-[#F5F7FA]/60 transition-colors">
                      <td className="py-3 px-6">
                        <button
                          type="button"
                          onClick={() => onInspectEmployee(log.employeeCode)}
                          className="font-semibold text-[#172033] hover:text-[#1468E8] hover:underline underline-offset-2 text-left cursor-pointer"
                        >
                          {log.employeeName}
                        </button>
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
                      <td className="py-3 px-4">
                        <p className="text-xs font-medium text-[#172033]">{log.locationUsed}</p>
                        <p className="text-[11px] text-[#64748B]">{log.notes}</p>
                        {log.faceVerified && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 font-bold text-[#16A36A]">
                              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              Wajah &amp; Liveness Valid ({log.faceMatchScore ?? 95}%)
                            </span>
                            {log.selfieSnapshot && (
                              <button
                                type="button"
                                onClick={() => setSelfiePreviewLog(log)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] cursor-pointer"
                              >
                                <Camera className="w-3 h-3" aria-hidden="true" />
                                <span>Lihat Swafoto</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {(() => {
                            const matchedEmp = employees.find(
                              (e) =>
                                e.employeeCode.trim().toLowerCase() ===
                                log.employeeCode.trim().toLowerCase()
                            );
                            if (!matchedEmp) return null;
                            return (
                              <>
                                <a
                                  href={buildEmployeeWhatsappUrl(matchedEmp)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Hubungi WhatsApp ${log.employeeName}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px]"
                                >
                                  <MessageCircle className="w-3 h-3" aria-hidden="true" />
                                  <span>WA</span>
                                </a>
                                <a
                                  href={buildEmployeeMailtoUrl(matchedEmp)}
                                  aria-label={`Kirim Email ke ${log.employeeName}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#102B69] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px]"
                                >
                                  <Mail className="w-3 h-3 text-[#1468E8]" aria-hidden="true" />
                                  <span>Email</span>
                                </a>
                              </>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => {
                              if (editingLogId === log.id) {
                                setEditingLogId(null);
                              } else {
                                setEditingLogId(log.id);
                                setDraftNote(log.notes);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] cursor-pointer transition-colors"
                          >
                            {editingLogId === log.id ? 'Tutup' : 'Catatan Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingLogId === log.id && (
                      <tr className="bg-[#F5F7FA]">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input
                              type="text"
                              value={draftNote}
                              onChange={(e) => setDraftNote(e.target.value)}
                              aria-label={`Catatan verifikasi presensi ${log.employeeName}`}
                              placeholder="Tulis keterangan verifikasi lapangan / konfirmasi koordinator..."
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-[4px]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onVerifyAttendanceNote(log.id, draftNote);
                                setEditingLogId(null);
                              }}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer shrink-0"
                            >
                              Simpan Catatan
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reference: Work Hours & Geofencing Locations Active in Admin's Scopes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[#102B69]">
              Acuan Jam Kerja Cakupan (Kebijakan Master Admin)
            </h3>
          </div>
          <div className="text-xs space-y-2 border-t border-[#E2E8F0] pt-3">
            <p className="text-[#64748B]">
              Standar Perusahaan:{' '}
              <strong className="text-[#172033] tabular-nums">
                {policy.checkInTime} – {policy.checkOutTime}
              </strong>{' '}
              ({policy.workDays}) · Toleransi {policy.lateToleranceMinutes} menit
            </p>
            {scopedOverrides.map((ov) => (
              <div
                key={ov.entityId}
                className="p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] flex items-center justify-between gap-2"
              >
                <span className="font-semibold text-[#102B69]">{ov.entityName}</span>
                <span className="font-bold text-[#172033] tabular-nums">
                  {ov.useDefault
                    ? `${policy.checkInTime} – ${policy.checkOutTime}`
                    : `${ov.checkInTime} – ${ov.checkOutTime} (Toleransi ${ov.lateToleranceMinutes} mnt)`}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[#102B69]">
              Titik Geofencing &amp; Radius Aktif di Cakupan
            </h3>
          </div>
          <div className="space-y-2 border-t border-[#E2E8F0] pt-3 text-xs">
            {scopedLocations.length === 0 ? (
              <p className="text-[#64748B]">Belum ada titik radius terdaftar di cakupan Anda.</p>
            ) : (
              scopedLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#172033]">{loc.name}</span>
                    <span className="font-bold text-[#1468E8] tabular-nums">
                      {loc.radiusMeters}m · {loc.mode}
                    </span>
                  </div>
                  <p className="text-[#64748B] mt-0.5">{loc.addressOrCoords}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {selfiePreviewLog && selfiePreviewLog.selfieSnapshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="selfie-proof-title"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-between gap-3">
              <div>
                <h3 id="selfie-proof-title" className="text-sm font-bold text-[#102B69]">
                  Bukti Swafoto Biometrik Presensi
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  {selfiePreviewLog.employeeName} ({selfiePreviewLog.employeeCode}) ·{' '}
                  {selfiePreviewLog.dateLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelfiePreviewLog(null)}
                aria-label="Tutup pratinjau swafoto"
                className="p-1.5 text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <img
                src={selfiePreviewLog.selfieSnapshot}
                alt={`Swafoto presensi ${selfiePreviewLog.employeeName}`}
                className="w-full h-64 object-cover rounded-[4px] border border-[#E2E8F0]"
              />
              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[4px] text-[#16A36A] font-semibold">
                Liveness 3D Aktif Lolos · Kecocokan Wajah: {selfiePreviewLog.faceMatchScore ?? 95}%
              </div>
              <p className="text-[#64748B]">
                Jam Masuk: <strong className="text-[#172033]">{selfiePreviewLog.checkIn}</strong> ·
                Pulang: <strong className="text-[#172033]">{selfiePreviewLog.checkOut}</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
