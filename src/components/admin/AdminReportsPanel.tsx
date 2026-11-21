import React from 'react';
import {
  AuditLogRecord,
  DOCUMENT_CHECKLIST_ITEMS,
  EmployeeActivityReportRecord,
  EmployeeRecord,
  OperationalSnapshot,
  countUploadedDocuments,
} from '../../data/masterAdminData';
import { ActivityReportsBoard } from '../shared/ActivityReportsBoard';

interface AdminReportsPanelProps {
  snapshots: OperationalSnapshot[];
  employees: EmployeeRecord[];
  activityReports?: EmployeeActivityReportRecord[];
  auditLogs: AuditLogRecord[];
  assignedScopes: string[];
  adminName: string;
}

export const AdminReportsPanel: React.FC<AdminReportsPanelProps> = ({
  snapshots,
  employees,
  activityReports = [],
  auditLogs,
  assignedScopes,
  adminName,
}) => {
  // Strictly scope audit trail to non-global-security operational logs inside admin's scopes
  const scopedOperationalLogs = auditLogs.filter((log) => {
    if (log.category === 'Keamanan' || log.category === 'RBAC') return false;
    const mentionsScope = assignedScopes.some(
      (scope) => log.target.includes(scope) || log.action.includes(scope)
    );
    const mentionsActor = log.actor.toLowerCase().includes(adminName.toLowerCase());
    return mentionsScope || mentionsActor;
  });

  return (
    <div className="space-y-6">
      {/* Scoped Employee Activity Reports (Internal & Eksternal) */}
      <ActivityReportsBoard
        reports={activityReports}
        title="Laporan Kegiatan Karyawan (Cakupan Anda)"
        subtitle="Update aktivitas kerja harian dari karyawan Internal maupun Eksternal pada unit atau client dalam cakupan Anda."
        csvFileNamePrefix="laporan-kegiatan-admin-cakupan"
      />

      {/* Operational Snapshot Summary Scoped to Admin's Units/Clients */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#102B69]">
            Rekap Operasional &amp; Kehadiran per Unit/Klien
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Ringkasan kedisiplinan harian, kontrak mendekati EOC, dan posisi terbuka di cakupan Anda
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Unit / Klien Cakupan
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Kategori
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Tingkat Hadir
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Cuti/Izin Hari Ini
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  PKWT &le; 30 Hari
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Kandidat Aktif
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada rekap operasional untuk cakupan yang dipilih.
                  </td>
                </tr>
              ) : (
                snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-[#172033]">
                      {snap.entityName}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#102B69]">
                      {snap.category}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-right font-bold text-[#16A36A] tabular-nums">
                      {snap.attendanceRate}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-right text-[#172033] tabular-nums">
                      {snap.onLeaveToday} orang
                    </td>
                    <td className="py-3.5 px-4 text-xs text-right font-semibold text-[#B87D00] tabular-nums">
                      {snap.expiringContracts} kontrak
                    </td>
                    <td className="py-3.5 px-6 text-xs text-right text-[#102B69] tabular-nums">
                      {snap.activeCandidates} kandidat
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 11-Document Completeness Matrix per Employee */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#102B69]">
            Matriks Kelengkapan 11 Berkas Karyawan
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Audit status dokumen wajib (CV, e-KTP, KK, SIM, Ijazah, Transkrip Nilai, Sertifikat,
            Pas Foto, SKCK, Rekening, Kontrak)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Karyawan
                </th>
                {DOCUMENT_CHECKLIST_ITEMS.map((docItem) => (
                  <th
                    key={docItem.key}
                    scope="col"
                    className="py-3 px-2 text-[11px] font-semibold text-[#64748B] text-center whitespace-nowrap"
                  >
                    {docItem.shortLabel}
                  </th>
                ))}
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={DOCUMENT_CHECKLIST_ITEMS.length + 2}
                    className="py-8 px-6 text-center text-[#64748B]"
                  >
                    Belum ada karyawan di cakupan terpilih.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const progress = countUploadedDocuments(emp.documents);
                  return (
                    <tr key={emp.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                      <td className="py-3 px-6 whitespace-nowrap">
                        <p className="font-bold text-[#172033]">{emp.fullName}</p>
                        <p className="text-[11px] text-[#64748B] tabular-nums">
                          {emp.employeeCode} · {emp.entityName}
                        </p>
                      </td>
                      {DOCUMENT_CHECKLIST_ITEMS.map((docItem) => {
                        const ok = Boolean(emp.documents[docItem.key]);
                        return (
                          <td
                            key={docItem.key}
                            className={`py-3 px-2 text-center font-bold tabular-nums ${
                              ok ? 'text-[#16A36A]' : 'text-[#DC3545]'
                            }`}
                            title={`${docItem.label}: ${ok ? 'Terunggah' : 'Belum Lengkap'}`}
                          >
                            {ok ? 'Ada' : 'Belum'}
                          </td>
                        );
                      })}
                      <td
                        className={`py-3 px-6 text-right font-bold tabular-nums whitespace-nowrap ${
                          progress.completed === progress.total
                            ? 'text-[#16A36A]'
                            : 'text-[#B87D00]'
                        }`}
                      >
                        {progress.completed}/{progress.total}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Scoped Operational Activity Log */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#102B69]">
            Riwayat Aktivitas Operasional Cakupan
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Catatan perubahan administrasi, verifikasi absensi, dan usulan pada unit/klien Anda
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Waktu
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Pelaku
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Kategori
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Aktivitas
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Sasaran
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {scopedOperationalLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-6 text-center text-[#64748B]">
                    Belum ada log aktivitas operasional pada cakupan ini.
                  </td>
                </tr>
              ) : (
                scopedOperationalLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                    <td className="py-3 px-6 text-[#64748B] tabular-nums whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#172033] whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1468E8] whitespace-nowrap">
                      {log.category}
                    </td>
                    <td className="py-3 px-4 text-[#172033]">{log.action}</td>
                    <td className="py-3 px-6 text-[#102B69] font-medium">{log.target}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
