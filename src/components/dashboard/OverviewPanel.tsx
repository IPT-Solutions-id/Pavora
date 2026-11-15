import React from 'react';
import {
  ApprovalRequestRecord,
  AttendanceLogRecord,
  ContractRecord,
  EmployeeRecord,
  EntityRecord,
  LeaveAbsenceRecord,
  countExpiringPkwtContracts,
  splitActiveEntitiesByCategory,
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
  attendanceLogs,
  leaveAbsences = [],
  contracts,
}) => {
  const activeEntities = entities.filter((e) => e.status === 'Aktif');
  const { internalUnits, clientPlacements } = splitActiveEntitiesByCategory(entities);
  const internalEmployees = internalUnits.reduce((sum, item) => sum + item.employeeCount, 0);
  const clientEmployees = clientPlacements.reduce((sum, item) => sum + item.employeeCount, 0);
  const totalEmployees = internalEmployees + clientEmployees;
  const expiringPkwt = countExpiringPkwtContracts(contracts);
  const totalSupportedPositions = activeEntities.reduce(
    (sum, ent) => sum + Math.max(1, ent.supportedPositions?.length ?? 0),
    0
  );

  const hasClients = clientPlacements.length > 0;

  return (
    <div className="space-y-6">
      {/* Row 1: Total Karyawan & Total Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B] mb-1">Total Karyawan</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums">
            {totalEmployees} Orang
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            {hasClients
              ? `${internalEmployees} internal · ${clientEmployees} penempatan klien · ${totalSupportedPositions} posisi aktif`
              : `${internalEmployees} karyawan internal aktif · ${totalSupportedPositions} posisi aktif`}
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

      {/* Row 4: Live Attendance Log Feed (Replacing Antrean Persetujuan Master Admin) */}
      <LiveAttendanceLogCard
        attendanceLogs={attendanceLogs}
        leaveAbsences={leaveAbsences}
      />
    </div>
  );
};
