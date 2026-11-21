import React from 'react';
import { Check, Clock, X } from 'lucide-react';
import {
  ApprovalRequestRecord,
  AttendanceLogRecord,
  ContractRecord,
  EmployeeRecord,
  EntityRecord,
  LeaveAbsenceRecord,
  countExpiringPkwtContracts,
  splitActiveEntitiesByCategory,
  summarizeEmployeeStatusCounts,
} from '../../data/masterAdminData';
import { WorkforceAttendanceAnalyticsSection } from './WorkforceAttendanceAnalyticsSection';
import { LiveAttendanceLogCard } from './LiveAttendanceLogCard';

interface OverviewPanelProps {
  entities: EntityRecord[];
  employees?: EmployeeRecord[];
  approvals?: ApprovalRequestRecord[];
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences?: LeaveAbsenceRecord[];
  contracts: ContractRecord[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  entities,
  employees = [],
  approvals = [],
  attendanceLogs,
  leaveAbsences = [],
  contracts,
  onApprove,
  onReject,
}) => {
  const activeEntities = entities.filter((e) => e.status === 'Aktif');
  const { internalUnits, clientPlacements } = splitActiveEntitiesByCategory(entities);
  const internalEmployees = internalUnits.reduce((sum, item) => sum + item.employeeCount, 0);
  const clientEmployees = clientPlacements.reduce((sum, item) => sum + item.employeeCount, 0);
  const totalEmployees = internalEmployees + clientEmployees;
  const statusCounts = summarizeEmployeeStatusCounts(employees);
  const expiringPkwt = countExpiringPkwtContracts(contracts);
  const totalSupportedPositions = activeEntities.reduce(
    (sum, ent) => sum + Math.max(1, ent.supportedPositions?.length ?? 0),
    0
  );
  const pendingApprovals = approvals.filter((a) => a.status === 'Menunggu');

  const hasClients = clientPlacements.length > 0;

  return (
    <div className="space-y-6">
      {/* Row 1: Karyawan Aktif, Karyawan Nonaktif & Total Client */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          data-testid="overview-active-karyawan"
          className="bg-white border border-[#E2E8F0] rounded-[6px] p-5"
        >
          <p className="text-xs font-semibold text-[#64748B] mb-1">Karyawan Aktif</p>
          <p
            data-testid="overview-total-karyawan"
            className="text-2xl font-extrabold text-[#16A36A] tabular-nums"
          >
            {totalEmployees} Orang
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            {hasClients
              ? `${internalEmployees} internal · ${clientEmployees} penempatan klien · ${totalSupportedPositions} posisi aktif`
              : `${internalEmployees} karyawan internal aktif · ${totalSupportedPositions} posisi aktif`}
          </p>
          <p
            data-testid="overview-active-breakdown"
            className="text-[11px] text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9] tabular-nums"
          >
            Direktori Terdata:{' '}
            <strong className="text-[#16A36A]">{statusCounts.activeCount} Aktif</strong> ·{' '}
            <strong className="text-[#B87D00]">{statusCounts.probationCount} Probation</strong>
          </p>
        </div>

        <div
          data-testid="overview-inactive-karyawan"
          className="bg-white border border-[#E2E8F0] rounded-[6px] p-5"
        >
          <p className="text-xs font-semibold text-[#64748B] mb-1">Karyawan Nonaktif</p>
          <p
            data-testid="overview-inactive-total"
            className={`text-2xl font-extrabold tabular-nums ${
              statusCounts.inactiveOrResignedCount > 0 ? 'text-[#DC3545]' : 'text-[#102B69]'
            }`}
          >
            {statusCounts.inactiveOrResignedCount} Orang
          </p>
          <p
            data-testid="overview-status-breakdown"
            className="text-xs text-[#64748B] mt-1 tabular-nums"
          >
            <strong className="text-[#DC3545]">{statusCounts.resignCount} Resign</strong> ·{' '}
            <strong className="text-[#475569]">{statusCounts.nonaktifCount} Nonaktif</strong>
          </p>
          <p className="text-[11px] text-[#64748B] mt-2 pt-2 border-t border-[#F1F5F9]">
            Tidak masuk hitungan aktif &amp; akses login diblokir
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B] mb-1">Total Client</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums">
            {clientPlacements.length} Klien
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            {hasClients
              ? `Didukung ${internalUnits.length} unit internal · ${expiringPkwt} PKWT berakhir ≤ 30 hari`
              : `Mode internal (${internalUnits.length} unit internal aktif)`}
          </p>
        </div>
      </div>

      {/* Row 2 (Hadir, Izin/Sakit, Cuti, Alpha) + Row 3 (1 Chart Card + Side Detail Periode with Merged Sebaran & Posisi) */}
      <WorkforceAttendanceAnalyticsSection
        entities={entities}
        employees={employees}
        attendanceLogs={attendanceLogs}
        leaveAbsences={leaveAbsences}
        scopeTitle="Seluruh Unit Internal & Mitra Klien"
      />

      {/* Row 4: Cross-Role Pending Approvals Queue */}
      {pendingApprovals.length > 0 && (
        <section
          aria-label="Antrean Persetujuan Lintas Role"
          className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                Antrean Persetujuan Lintas Role ({pendingApprovals.length} Menunggu)
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Usulan perpanjangan PKWT dari Admin, aktivasi onboarding karyawan baru, dan permintaan lintas unit
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B87D00]">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Perlu Keputusan Master Admin</span>
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {pendingApprovals.map((apr) => (
              <div
                key={apr.id}
                data-testid={`approval-row-${apr.id}`}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F5F7FA]/60 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 font-bold bg-[#EAF2FF] text-[#1468E8] border border-[#C9DDFB] rounded-[3px]">
                      {apr.category}
                    </span>
                    <span className="font-semibold text-[#102B69]">{apr.entityName}</span>
                    <span className="text-[#64748B] tabular-nums">· {apr.submittedAt}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#172033]">{apr.title}</h3>
                  <p className="text-xs text-[#64748B]">
                    Diajukan oleh <strong className="text-[#102B69]">{apr.requester}</strong> ({apr.requesterRole})
                  </p>
                </div>

                {(onApprove || onReject) && (
                  <div className="flex items-center gap-2 shrink-0">
                    {onApprove && (
                      <button
                        type="button"
                        data-testid={`approve-req-${apr.id}`}
                        onClick={() => onApprove(apr.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Setujui (ACC)</span>
                      </button>
                    )}
                    {onReject && (
                      <button
                        type="button"
                        data-testid={`reject-req-${apr.id}`}
                        onClick={() => onReject(apr.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#DC3545] bg-white hover:bg-[#FEF2F2] border border-[#E2E8F0] rounded-[4px] transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Tolak</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Row 5: Live Attendance Log Feed */}
      <LiveAttendanceLogCard
        attendanceLogs={attendanceLogs}
        leaveAbsences={leaveAbsences}
      />
    </div>
  );
};
