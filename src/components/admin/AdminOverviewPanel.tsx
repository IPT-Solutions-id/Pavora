import React from 'react';
import { ArrowRight, Mail, MessageCircle } from 'lucide-react';
import {
  AdminMenuId,
  AttendanceLogRecord,
  ContractRecord,
  EmployeeRecord,
  EntityRecord,
  LeaveAbsenceRecord,
  OnboardingCandidateRecord,
  buildLeaveFollowupMailtoUrl,
  buildLeaveFollowupWhatsappUrl,
} from '../../data/masterAdminData';
import { WorkforceAttendanceAnalyticsSection } from '../dashboard/WorkforceAttendanceAnalyticsSection';

interface AdminOverviewPanelProps {
  entities?: EntityRecord[];
  employees: EmployeeRecord[];
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  contracts: ContractRecord[];
  onboardingCandidates: OnboardingCandidateRecord[];
  activeScopes: string[];
  onNavigateMenu: (menu: AdminMenuId) => void;
  onApproveLeave?: (id: string) => void;
  onRejectLeave?: (id: string) => void;
  onConvertAlphaToIzin?: (id: string) => void;
}

export const AdminOverviewPanel: React.FC<AdminOverviewPanelProps> = ({
  entities = [],
  employees,
  attendanceLogs,
  leaveAbsences,
  contracts,
  onboardingCandidates,
  activeScopes,
  onNavigateMenu,
}) => {
  const internalCount = employees.filter((e) => e.employmentType === 'Internal').length;
  const clientCount = employees.filter((e) => e.employmentType === 'Penempatan Klien').length;
  const readyOnboarding = onboardingCandidates.filter((c) => c.status === 'Siap Onboarding');
  const expiringContracts = contracts.filter(
    (c) =>
      c.contractType === 'PKWT' &&
      c.daysRemaining !== null &&
      c.daysRemaining <= 30 &&
      c.status !== 'Diperpanjang'
  );

  const scopedTotalHeadcount =
    entities.length > 0
      ? entities.reduce((sum, item) => sum + item.employeeCount, 0)
      : employees.length;
  const scopedInternalHeadcount =
    entities.length > 0
      ? entities
          .filter((e) => e.category === 'Internal')
          .reduce((sum, item) => sum + item.employeeCount, 0)
      : internalCount;
  const scopedClientHeadcount =
    entities.length > 0
      ? entities
          .filter((e) => e.category === 'Klien Penempatan')
          .reduce((sum, item) => sum + item.employeeCount, 0)
      : clientCount;
  const scopedClientsCount = entities.filter((e) => e.category === 'Klien Penempatan').length;
  const scopedSupportedPositions = entities.reduce(
    (sum, ent) => sum + Math.max(1, ent.supportedPositions?.length ?? 0),
    0
  );

  const findEmployee = (code: string) =>
    employees.find((emp) => emp.employeeCode.trim().toLowerCase() === code.trim().toLowerCase());

  return (
    <div className="space-y-6">
      {/* Row 1: Total Karyawan & Total Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B]">Total Karyawan</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums mt-1">
            {scopedTotalHeadcount} Orang
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            {scopedInternalHeadcount} internal · {scopedClientHeadcount} penempatan klien ·{' '}
            {scopedSupportedPositions} posisi aktif
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B]">Total Client</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums mt-1">
            {scopedClientsCount} Klien
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            {readyOnboarding.length} siap onboarding · {expiringContracts.length} PKWT berakhir ≤ 30 hari
          </p>
        </div>
      </div>

      {/* Row 2 (Hadir, Izin/Sakit, Cuti, Alpha) + Row 3 (1 Chart Card + Side Detail Card) */}
      <WorkforceAttendanceAnalyticsSection
        entities={entities}
        employees={employees}
        attendanceLogs={attendanceLogs}
        leaveAbsences={leaveAbsences}
        scopeTitle={activeScopes.join(' · ') || 'Cakupan Admin'}
      />

      {/* 12-Col Split: Priority Daily Queue + Quick Access Scopes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                Pantauan Cuti, Izin Sakit (SKD) &amp; Tindak Lanjut Alpha
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pantau pengajuan dan hubungi karyawan via WA/Email (Otorisasi ACC oleh Master Admin)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateMenu('admin-leave')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1468E8] hover:text-[#102B69] shrink-0 cursor-pointer"
            >
              <span>Buka Semua</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {leaveAbsences.length === 0 ? (
              <div className="px-6 py-8 text-center text-xs text-[#64748B]">
                Belum ada pengajuan cuti atau alpha pada cakupan terpilih.
              </div>
            ) : (
              leaveAbsences.map((item) => {
                const matchedEmp = findEmployee(item.employeeCode);
                return (
                  <div
                    key={item.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F5F7FA]/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-[#64748B] tabular-nums">
                        {item.type} · {item.dateRange} ({item.daysCount} hari)
                      </p>
                      <h3 className="text-sm font-bold text-[#172033]">
                        {item.employeeName} ({item.employeeCode})
                      </h3>
                      <p className="text-xs text-[#102B69] font-medium mt-0.5">{item.entityName}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{item.reason}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.status === 'Menunggu' ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded-[4px]">
                          Menunggu ACC Master Admin
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold ${
                            item.status === 'Ditolak' ||
                            item.status === 'Alpha' ||
                            item.status === 'Perlu Klarifikasi'
                              ? 'text-[#DC3545]'
                              : 'text-[#16A36A]'
                          }`}
                        >
                          {item.status === 'Perlu Klarifikasi' ? 'Alpha Mengikat' : item.status}
                        </span>
                      )}

                      <a
                        href={buildLeaveFollowupWhatsappUrl(item, matchedEmp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#16A36A] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-[4px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>WA</span>
                      </a>
                      <a
                        href={buildLeaveFollowupMailtoUrl(item, matchedEmp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#102B69] bg-[#F8FAFC] hover:bg-[#EAF2FF] border border-[#CBD5E1] rounded-[4px]"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                        <span>Email</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                Onboarding &amp; Kontrak Mendekati EOC
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Kandidat lolos rekrutmen dan PKWT butuh usulan perpanjangan
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateMenu('admin-onboarding')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1468E8] hover:text-[#102B69] shrink-0 cursor-pointer"
            >
              <span>Kelola</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {readyOnboarding.map((cand) => (
              <div key={cand.id} className="px-6 py-3.5">
                <p className="text-[11px] font-semibold text-[#1468E8] tabular-nums">
                  Siap Onboarding · {cand.candidateCode} · Berkas {cand.documentsReadyCount}/11
                </p>
                <p className="text-sm font-bold text-[#172033] mt-0.5">{cand.fullName}</p>
                <p className="text-xs text-[#64748B]">
                  {cand.position} · {cand.entityName}
                </p>
              </div>
            ))}

            {expiringContracts.map((ctr) => (
              <div key={ctr.id} className="px-6 py-3.5">
                <p className="text-[11px] font-semibold text-[#B87D00] tabular-nums">
                  PKWT Segera Berakhir · Sisa {ctr.daysRemaining} hari ({ctr.endDate})
                </p>
                <p className="text-sm font-bold text-[#172033] mt-0.5">
                  {ctr.employeeName} ({ctr.employeeCode})
                </p>
                <p className="text-xs text-[#64748B]">
                  {ctr.entityName} ·{' '}
                  {ctr.extensionRequested
                    ? 'Usulan perpanjangan telah dikirim ke Master Admin'
                    : 'Belum diajukan perpanjangan'}
                </p>
              </div>
            ))}

            {readyOnboarding.length === 0 && expiringContracts.length === 0 && (
              <div className="px-6 py-8 text-center text-xs text-[#64748B]">
                Tidak ada antrean onboarding maupun kontrak PKWT yang mendekati akhir.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
