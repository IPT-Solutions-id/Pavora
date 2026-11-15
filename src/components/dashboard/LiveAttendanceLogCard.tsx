import React, { useMemo, useState } from 'react';
import { Clock, RotateCcw, Search } from 'lucide-react';
import { AttendanceLogRecord, LeaveAbsenceRecord } from '../../data/masterAdminData';
import {
  LiveAttendanceStatus,
  buildLiveAttendanceFeed,
} from '../../utils/overviewAnalytics';

interface LiveAttendanceLogCardProps {
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences?: LeaveAbsenceRecord[];
}

type StatusFilterOption = 'Semua' | LiveAttendanceStatus;

const STATUS_FILTER_OPTIONS: Array<{ id: StatusFilterOption; label: string }> = [
  { id: 'Semua', label: 'Semua' },
  { id: 'Hadir', label: 'Hadir' },
  { id: 'Telat', label: 'Telat' },
  { id: 'Sakit', label: 'Sakit' },
  { id: 'Izin', label: 'Izin' },
  { id: 'Cuti', label: 'Cuti' },
  { id: 'Alpha', label: 'Alpha' },
];

function getStatusBadgeStyle(status: LiveAttendanceStatus): string {
  switch (status) {
    case 'Hadir':
      return 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]';
    case 'Telat':
      return 'bg-[#FFFBEB] text-[#B87D00] border-[#FDE68A]';
    case 'Sakit':
      return 'bg-[#ECFEFF] text-[#0891B2] border-[#A5F3FC]';
    case 'Izin':
      return 'bg-[#EFF6FF] text-[#1468E8] border-[#BFDBFE]';
    case 'Cuti':
      return 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]';
    case 'Alpha':
    default:
      return 'bg-[#FEF2F2] text-[#DC3545] border-[#FECACA]';
  }
}

export const LiveAttendanceLogCard: React.FC<LiveAttendanceLogCardProps> = ({
  attendanceLogs,
  leaveAbsences = [],
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('Semua');
  const [placementFilter, setPlacementFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allEntries = useMemo(
    () => buildLiveAttendanceFeed(attendanceLogs, leaveAbsences),
    [attendanceLogs, leaveAbsences]
  );

  const distinctEntities = useMemo(() => {
    const names = Array.from(new Set(allEntries.map((item) => item.entityName)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [allEntries]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilterOption, number> = {
      Semua: allEntries.length,
      Hadir: 0,
      Telat: 0,
      Sakit: 0,
      Izin: 0,
      Cuti: 0,
      Alpha: 0,
    };
    allEntries.forEach((entry) => {
      counts[entry.liveStatus] += 1;
    });
    return counts;
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEntries.filter((entry) => {
      const matchesStatus =
        statusFilter === 'Semua' || entry.liveStatus === statusFilter;
      const matchesPlacement =
        placementFilter === 'Semua' ||
        (placementFilter === 'Internal' && entry.employmentType === 'Internal') ||
        (placementFilter === 'Penempatan Klien' &&
          entry.employmentType === 'Penempatan Klien') ||
        entry.entityName === placementFilter;
      const matchesQuery =
        !q ||
        entry.employeeName.toLowerCase().includes(q) ||
        entry.employeeCode.toLowerCase().includes(q) ||
        entry.entityName.toLowerCase().includes(q) ||
        entry.detectionReason.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q);
      return matchesStatus && matchesPlacement && matchesQuery;
    });
  }, [allEntries, statusFilter, placementFilter, searchQuery]);

  const hasActiveFilter =
    statusFilter !== 'Semua' || placementFilter !== 'Semua' || searchQuery.trim() !== '';

  const resetFilters = () => {
    setStatusFilter('Semua');
    setPlacementFilter('Semua');
    setSearchQuery('');
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#102B69]">Log Live Absensi</h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold text-[#16A36A] bg-[#ECFDF5] border border-[#A7F3D0] rounded-[4px]">
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#16A36A]" />
              Live
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Rekaman check-in real-time serta deteksi otomatis Hadir, Telat, Sakit, Izin, Cuti, dan Alpha
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] tabular-nums shrink-0">
          <Clock className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
          <span>
            Menampilkan <strong className="text-[#102B69]">{filteredEntries.length}</strong> dari{' '}
            {allEntries.length} log
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        {/* Status Filter Tabs (Sakit & Izin Dipisah) */}
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Filter status log absensi"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.id;
            const count = statusCounts[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-[4px] border transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#102B69] text-white border-[#102B69]'
                    : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#102B69] hover:text-[#102B69]'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`tabular-nums text-[11px] ${
                    isActive ? 'text-[#CBD5E1]' : 'text-[#64748B]'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Placement Dropdown */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIK..."
              aria-label="Cari log live absensi"
              className="pl-8 pr-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] w-40 focus:outline-none focus:border-[#1468E8]"
            />
          </div>

          <select
            aria-label="Filter penempatan log absensi"
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-white border border-[#CBD5E1] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer max-w-[165px]"
          >
            <option value="Semua">Semua Penempatan</option>
            <option value="Internal">Karyawan Internal</option>
            <option value="Penempatan Klien">Semua Client</option>
            {distinctEntities.map((entityName) => (
              <option key={entityName} value={entityName}>
                {entityName}
              </option>
            ))}
          </select>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-[#1468E8] bg-white border border-[#CBD5E1] hover:border-[#1468E8] rounded-[4px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Log Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
              <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                Karyawan
              </th>
              <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                Penempatan
              </th>
              <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                Waktu &amp; Tanggal
              </th>
              <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                Status
              </th>
              <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                Deteksi Log &amp; Keterangan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 px-6 text-center text-[#64748B]">
                  Tidak ada log absensi yang sesuai dengan filter saat ini.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                  <td className="py-3.5 px-6">
                    <p className="text-sm font-bold text-[#172033]">{entry.employeeName}</p>
                    <p className="text-[11px] text-[#64748B] tabular-nums">{entry.employeeCode}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#102B69]">{entry.entityName}</p>
                    <p className="text-[11px] text-[#64748B]">{entry.employmentType}</p>
                  </td>
                  <td className="py-3.5 px-4 tabular-nums">
                    <p className="font-semibold text-[#172033]">
                      {entry.checkIn} – {entry.checkOut}
                    </p>
                    <p className="text-[11px] text-[#64748B]">{entry.dateLabel}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold border rounded-[4px] ${getStatusBadgeStyle(
                        entry.liveStatus
                      )}`}
                    >
                      {entry.liveStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <p className="font-semibold text-[#172033]">{entry.detectionReason}</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      {entry.locationOrSource} · {entry.notes}
                      {entry.faceVerified && entry.faceMatchScore
                        ? ` · Wajah ${entry.faceMatchScore}%`
                        : ''}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
