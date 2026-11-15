import React, { useState } from 'react';
import {
  CalendarCheck2,
  Eye,
  FileCheck2,
  Lock,
  Mail,
  MessageCircle,
  Search,
  X,
} from 'lucide-react';
import {
  EmployeeRecord,
  LeaveAbsenceRecord,
  WorkPolicyConfig,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  buildLeaveFollowupMailtoUrl,
  buildLeaveFollowupWhatsappUrl,
  buildSkdCertificatePreviewDataUrl,
  calculateEmployeeLeaveQuotaSummary,
} from '../../data/masterAdminData';

interface AdminLeavePanelProps {
  leaveAbsences: LeaveAbsenceRecord[];
  employees: EmployeeRecord[];
  policy: WorkPolicyConfig;
  onApproveLeave?: (id: string) => void;
  onRejectLeave?: (id: string) => void;
  onConvertAlphaToIzin?: (id: string) => void;
}

function getLeaveTone(status: LeaveAbsenceRecord['status']): string {
  switch (status) {
    case 'Disetujui':
    case 'Terkonfirmasi Izin':
      return 'text-[#16A36A]';
    case 'Ditolak':
    case 'Alpha':
    case 'Perlu Klarifikasi':
      return 'text-[#DC3545]';
    default:
      return 'text-[#B87D00]';
  }
}

export const AdminLeavePanel: React.FC<AdminLeavePanelProps> = ({
  leaveAbsences,
  employees,
  policy,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'Semua' | 'Menunggu' | 'Izin Sakit (SKD)' | 'Disetujui' | 'Alpha'
  >('Semua');
  const [previewSkdRecord, setPreviewSkdRecord] = useState<LeaveAbsenceRecord | null>(null);

  const q = query.trim().toLowerCase();
  const visibleLeaves = leaveAbsences.filter((item) => {
    const isAlpha =
      item.type === 'Alpha / Tanpa Keterangan' ||
      item.status === 'Alpha' ||
      item.status === 'Perlu Klarifikasi';
    const matchesStatus =
      statusFilter === 'Semua' ||
      (statusFilter === 'Menunggu'
        ? item.status === 'Menunggu'
        : statusFilter === 'Izin Sakit (SKD)'
          ? item.type === 'Izin Sakit'
          : statusFilter === 'Disetujui'
            ? item.status === 'Disetujui'
            : isAlpha);
    const matchesQuery =
      !q ||
      item.employeeName.toLowerCase().includes(q) ||
      item.employeeCode.toLowerCase().includes(q) ||
      item.entityName.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const waitingCount = leaveAbsences.filter((l) => l.status === 'Menunggu').length;
  const sickSkdCount = leaveAbsences.filter((l) => l.type === 'Izin Sakit').length;
  const approvedCount = leaveAbsences.filter((l) => l.status === 'Disetujui').length;
  const alphaStrictCount = leaveAbsences.filter(
    (l) =>
      l.type === 'Alpha / Tanpa Keterangan' ||
      l.status === 'Alpha' ||
      l.status === 'Perlu Klarifikasi'
  ).length;

  const findEmployeeForRecord = (employeeCode: string): EmployeeRecord | undefined =>
    employees.find(
      (emp) => emp.employeeCode.trim().toLowerCase() === employeeCode.trim().toLowerCase()
    );

  return (
    <div className="space-y-6">
      {/* Info Kewenangan Pemantauan Admin vs ACC Master Admin */}
      <div className="p-4 bg-[#EAF2FF] border border-[#BFDBFE] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <CalendarCheck2 className="w-4 h-4 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-[#102B69]">
            <p className="font-bold">
              Mode Pemantauan Cuti, Izin Sakit (SKD) &amp; Tindak Lanjut WA/Email Admin Operasional
            </p>
            <p className="text-[#475569] mt-0.5">
              Role Admin dapat memantau pengajuan cuti, memeriksa bukti{' '}
              <strong>Surat Keterangan Dokter (SKD)</strong>, melihat sisa jatah cuti, serta
              menghubungi karyawan via <strong>WhatsApp (WA)</strong> atau <strong>Email</strong>.
              Otorisasi persetujuan akhir (<strong>ACC / Tolak</strong>) dilakukan terpusat oleh{' '}
              <strong>Master Admin</strong>.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-[11px] font-bold bg-white text-[#102B69] border border-[#BFDBFE] rounded-[4px] whitespace-nowrap shrink-0">
          Otorisasi ACC: Master Admin
        </span>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Menunggu ACC Master Admin</p>
          <p className="text-2xl font-extrabold text-[#B87D00] tabular-nums mt-1">
            {waitingCount} Pengajuan
          </p>
          <p className="text-xs text-[#64748B] mt-1">Dipantau Admin · ACC oleh Master Admin</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Izin Sakit (Wajib SKD)</p>
          <p className="text-2xl font-extrabold text-[#1468E8] tabular-nums mt-1">
            {sickSkdCount} Pengajuan
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Dilengkapi lampiran Surat Keterangan Dokter
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Cuti/Izin Disetujui</p>
          <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums mt-1">
            {approvedCount} Catatan
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            Otomatis memotong kuota ({policy.annualLeaveQuota} hari/tahun)
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Alpha (Tanpa Keterangan)</p>
          <p className="text-2xl font-extrabold text-[#DC3545] tabular-nums mt-1">
            {alphaStrictCount} Karyawan
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Hubungi via WA / Email untuk tindak lanjut disiplin
          </p>
        </div>
      </div>

      {/* Main Leave & SKD Monitoring Table */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">
              Pemantauan Cuti, Izin Sakit (SKD) &amp; Catatan Alpha Cakupan
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pantau permohonan cuti/izin, periksa bukti SKD dokter, dan hubungi karyawan via
              WhatsApp (WA) atau Email. Persetujuan (ACC) dieksekusi oleh Master Admin.
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
                placeholder="Cari karyawan, unit..."
                aria-label="Cari pengajuan cuti dan izin"
                className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-48 focus:outline-none focus:border-[#1468E8]"
              />
            </div>

            <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
              {(['Semua', 'Menunggu', 'Izin Sakit (SKD)', 'Disetujui', 'Alpha'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#1468E8] text-white'
                        : 'text-[#64748B] hover:text-[#102B69]'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Karyawan &amp; Jenis
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Unit / Klien
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Tanggal &amp; Jatah Kuota
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Keterangan &amp; Lampiran SKD
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Status Otorisasi
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Pantau &amp; Hubungi (WA / Email)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {visibleLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada pengajuan cuti, izin sakit, atau alpha di cakupan Anda yang sesuai
                    filter.
                  </td>
                </tr>
              ) : (
                visibleLeaves.map((item) => {
                  const empQuota = calculateEmployeeLeaveQuotaSummary(
                    item.employeeCode,
                    leaveAbsences,
                    policy.annualLeaveQuota
                  );
                  const isAlphaRecord =
                    item.type === 'Alpha / Tanpa Keterangan' ||
                    item.status === 'Alpha' ||
                    item.status === 'Perlu Klarifikasi';
                  const matchedEmp = findEmployeeForRecord(item.employeeCode);
                  const waFollowupUrl = buildLeaveFollowupWhatsappUrl(item, matchedEmp);
                  const mailFollowupUrl = buildLeaveFollowupMailtoUrl(item, matchedEmp);

                  return (
                    <tr key={item.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <p className="font-bold text-[#172033]">
                          {item.employeeName}{' '}
                          <span className="font-normal text-xs text-[#64748B] tabular-nums">
                            ({item.employeeCode})
                          </span>
                        </p>
                        <p
                          className={`text-xs font-semibold mt-0.5 ${
                            isAlphaRecord ? 'text-[#DC3545]' : 'text-[#1468E8]'
                          }`}
                        >
                          {item.type}
                        </p>
                        {matchedEmp && (
                          <p className="text-[11px] text-[#64748B] tabular-nums mt-0.5">
                            WA: {matchedEmp.whatsappNumber} · {matchedEmp.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-[#102B69]">
                        {item.entityName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#172033] tabular-nums whitespace-nowrap">
                        <p className="font-semibold">
                          {item.dateRange} ({item.daysCount} hari)
                        </p>
                        {!isAlphaRecord && (
                          <p className="text-[11px] text-[#64748B] mt-0.5">
                            Sisa Cuti: <strong className="text-[#102B69]">{empQuota.remainingLeaveQuota}</strong>/
                            {empQuota.annualLeaveQuota} hr · Sakit: {empQuota.approvedSickDays} hr
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#64748B] max-w-xs space-y-1.5">
                        <p>{item.reason}</p>
                        {item.type === 'Izin Sakit' && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-[#F0FDF4] text-[#16A36A] border border-[#BBF7D0] rounded-[3px]">
                              <FileCheck2 className="w-3 h-3" aria-hidden="true" />
                              <span>{item.skdFileName || 'SKD_Dokter.pdf'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreviewSkdRecord(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[3px] cursor-pointer"
                            >
                              <Eye className="w-3 h-3" aria-hidden="true" />
                              <span>Lihat SKD</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === 'Menunggu' && !isAlphaRecord ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 text-[11px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded-[4px]">
                              Menunggu ACC Master Admin
                            </span>
                            <p className="text-[10px] text-[#64748B] mt-0.5">
                              Dipantau Admin Cakupan
                            </p>
                          </div>
                        ) : isAlphaRecord ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#DC3545] bg-[#FEF2F2] border border-[#FECACA] rounded-[4px]">
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            <span>Alpha (Tanpa SKD/Izin)</span>
                          </span>
                        ) : (
                          <div>
                            <span className={`text-xs font-bold ${getLeaveTone(item.status)}`}>
                              {item.status}
                            </span>
                            {item.reviewedBy && (
                              <p className="text-[10px] text-[#64748B] mt-0.5">
                                Oleh: {item.reviewedBy}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <a
                            href={waFollowupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Hubungi WhatsApp ${item.employeeName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>WA</span>
                          </a>
                          <a
                            href={mailFollowupUrl}
                            aria-label={`Kirim Email ke ${item.employeeName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px]"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                            <span>Email</span>
                          </a>
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

      {/* Annual Leave & Sick Quota Overview Scoped to Admin Employees */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#102B69]">
            Rekap Sisa Kuota Cuti Tahunan, Izin Sakit (SKD) &amp; Alpha Cakupan
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
            Perhitungan otomatis dari jatah standar {policy.annualLeaveQuota} hari dikurangi cuti /
            izin keperluan berstatus Disetujui beserta akses kontak WA &amp; Email
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Karyawan &amp; Kontak
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Unit / Klien
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Kuota Dasar
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Cuti/Izin Terpakai
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Sisa Kuota
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Sakit (SKD)
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Alpha
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Hubungi Karyawan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada karyawan dalam cakupan terpilih.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const qSummary = calculateEmployeeLeaveQuotaSummary(
                    emp.employeeCode,
                    leaveAbsences,
                    policy.annualLeaveQuota
                  );

                  return (
                    <tr key={emp.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                      <td className="py-3 px-6">
                        <p className="font-semibold text-[#172033]">{emp.fullName}</p>
                        <p className="text-xs text-[#64748B] tabular-nums">
                          {emp.employeeCode} · WA: {emp.whatsappNumber}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-[#102B69]">
                        {emp.entityName}
                      </td>
                      <td className="py-3 px-4 text-xs text-right text-[#64748B] tabular-nums">
                        {qSummary.annualLeaveQuota} hari
                      </td>
                      <td className="py-3 px-4 text-xs text-right text-[#172033] tabular-nums">
                        {qSummary.approvedLeaveDays} hari
                      </td>
                      <td className="py-3 px-4 text-xs text-right font-bold text-[#16A36A] tabular-nums">
                        {qSummary.remainingLeaveQuota} hari
                      </td>
                      <td className="py-3 px-4 text-xs text-right font-semibold text-[#1468E8] tabular-nums">
                        {qSummary.approvedSickDays} hari
                      </td>
                      <td className="py-3 px-4 text-xs text-right font-bold text-[#DC3545] tabular-nums">
                        {qSummary.alphaDays} hari
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <a
                            href={buildEmployeeWhatsappUrl(emp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>WA</span>
                          </a>
                          <a
                            href={buildEmployeeMailtoUrl(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#102B69] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px]"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                            <span>Email</span>
                          </a>
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
                  Pemantauan Lampiran Medis Wajib (SKD) — Admin Operasional
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

              <div className="border border-[#E2E8F0] rounded-[6px] bg-[#F8FAFC] p-3 flex items-center justify-center">
                <img
                  src={
                    previewSkdRecord.skdFileDataUrl ||
                    buildSkdCertificatePreviewDataUrl({
                      employeeName: previewSkdRecord.employeeName,
                      employeeCode: previewSkdRecord.employeeCode,
                      dateRange: previewSkdRecord.dateRange,
                      daysCount: previewSkdRecord.daysCount,
                      reason: previewSkdRecord.reason,
                      doctorOrClinicName: previewSkdRecord.doctorOrClinicName,
                    })
                  }
                  alt={`Surat Keterangan Dokter ${previewSkdRecord.employeeName}`}
                  className="max-h-[340px] w-auto object-contain rounded-[4px]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
                {previewSkdRecord.status === 'Menunggu' ? (
                  <span className="px-2.5 py-1 text-xs font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded-[4px]">
                    Status: Menunggu ACC Master Admin
                  </span>
                ) : (
                  <span className="text-[#64748B]">
                    Status Pengajuan:{' '}
                    <strong className="text-[#102B69]">{previewSkdRecord.status}</strong>
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={buildLeaveFollowupWhatsappUrl(
                      previewSkdRecord,
                      findEmployeeForRecord(previewSkdRecord.employeeCode)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px]"
                  >
                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Konfirmasi WA</span>
                  </a>
                  <a
                    href={buildLeaveFollowupMailtoUrl(
                      previewSkdRecord,
                      findEmployeeForRecord(previewSkdRecord.employeeCode)
                    )}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px]"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                    <span>Kirim Email</span>
                  </a>
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

