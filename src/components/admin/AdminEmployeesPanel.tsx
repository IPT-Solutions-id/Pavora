import React, { useState } from 'react';
import { Edit3, Eye, Mail, MapPin, MessageCircle, Plus, Search } from 'lucide-react';
import {
  ContractHistoryItem,
  DepartmentRecord,
  EmployeeContractFilterMode,
  EmployeeFormInput,
  EmployeeRecord,
  EntityRecord,
  SystemSettingsConfig,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  calculateDaysRemaining,
  countUploadedDocuments,
  filterEmployees,
  formatEmployeeHandledClientsSummary,
  formatIndonesianDate,
  getContractEocIndicator,
  maskSensitiveNumber,
  summarizeEmployeeStatusCounts,
} from '../../data/masterAdminData';
import { isValidMapsUrl } from '../../utils/mapsUrl';
import { EmployeeModal } from '../dashboard/EmployeeModal';
import { PkwtDocumentModal } from '../dashboard/PkwtDocumentModal';

interface AdminEmployeesPanelProps {
  employees: EmployeeRecord[];
  entities: EntityRecord[];
  departments: DepartmentRecord[];
  assignedScopes: string[];
  settings?: SystemSettingsConfig;
  onCreateEmployee?: (data: EmployeeFormInput) => void;
  onUpdateEmployee: (id: string, data: EmployeeFormInput) => void;
  onResetFaceBiometric?: (employee: EmployeeRecord) => void;
  onMarkReviewed?: (employee: EmployeeRecord) => void;
  onAddContractHistory?: (
    employeeId: string,
    entry: Omit<ContractHistoryItem, 'id'>,
    makeActiveContract: boolean
  ) => void;
}

export const AdminEmployeesPanel: React.FC<AdminEmployeesPanelProps> = ({
  employees,
  entities,
  departments,
  assignedScopes,
  settings,
  onCreateEmployee,
  onUpdateEmployee,
  onResetFaceBiometric,
  onMarkReviewed,
  onAddContractHistory,
}) => {
  const [query, setQuery] = useState('');
  const [contractFilter, setContractFilter] = useState<EmployeeContractFilterMode>('Semua');
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit' | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [pkwtTarget, setPkwtTarget] = useState<{
    employee: EmployeeRecord;
    historyItem?: ContractHistoryItem;
  } | null>(null);

  const liveSelectedEmployee = selectedEmployee
    ? employees.find((e) => e.id === selectedEmployee.id) ?? selectedEmployee
    : null;

  const visibleEmployees = filterEmployees(employees, query, 'Semua', contractFilter, 'Semua');
  const statusCounts = summarizeEmployeeStatusCounts(employees);
  const scopedEntities = entities.filter((e) => assignedScopes.includes(e.name));
  const completeDocsCount = employees.filter((e) => {
    const c = countUploadedDocuments(e.documents);
    return c.completed === c.total;
  }).length;

  return (
    <div className="space-y-6">
      <div
        data-testid="admin-employees-status-summary"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div
          data-testid="admin-employees-active-card"
          className="bg-white border border-[#E2E8F0] rounded-[6px] p-4"
        >
          <p className="text-xs font-semibold text-[#64748B]">Karyawan Aktif (Cakupan)</p>
          <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums mt-1">
            {statusCounts.activeWorkingCount} Orang
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            <strong className="text-[#16A36A]">{statusCounts.activeCount} Aktif</strong> ·{' '}
            <strong className="text-[#B87D00]">{statusCounts.probationCount} Probation</strong> ·
            Masuk hitungan karyawan aktif
          </p>
        </div>

        <div
          data-testid="admin-employees-inactive-card"
          className="bg-white border border-[#E2E8F0] rounded-[6px] p-4"
        >
          <p className="text-xs font-semibold text-[#64748B]">Karyawan Nonaktif (Cakupan)</p>
          <p
            className={`text-2xl font-extrabold tabular-nums mt-1 ${
              statusCounts.inactiveOrResignedCount > 0 ? 'text-[#DC3545]' : 'text-[#102B69]'
            }`}
          >
            {statusCounts.inactiveOrResignedCount} Orang
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            <strong className="text-[#DC3545]">{statusCounts.resignCount} Resign</strong> ·{' '}
            <strong className="text-[#475569]">{statusCounts.nonaktifCount} Nonaktif</strong> ·
            Tidak masuk hitungan aktif
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Karyawan Cakupan Anda</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums mt-1">
            {employees.length} Orang
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Terbatas pada {assignedScopes.length} unit/klien yang ditugaskan
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Kontrak PKWT &amp; PKWTT</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums mt-1">
            {employees.filter((e) => e.contractType === 'PKWT').length} PKWT ·{' '}
            {employees.filter((e) => e.contractType === 'PKWTT').length} PKWTT
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Klik nama karyawan atau tombol Lihat untuk biodata penuh
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Kelengkapan 11 Berkas</p>
          <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums mt-1">
            {completeDocsCount} / {employees.length}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            CV, KTP, KK, SIM, Ijazah, Transkrip, Sertifikat, Foto, SKCK
          </p>
        </div>
      </div>

      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">Data Karyawan Cakupan</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pantau biodata, penempatan, berkas, dan riwayat kontrak karyawan cakupan Anda.
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
                placeholder="Cari nama, NIK, WA, email, NIK KTP..."
                aria-label="Cari karyawan cakupan"
                className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-56 focus:outline-none focus:border-[#1468E8]"
              />
            </div>

            <div className="inline-flex flex-wrap p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] gap-0.5">
              {(
                [
                  'Semua',
                  'PKWT',
                  'PKWTT',
                  'Probation',
                  'Resign',
                  'Nonaktif',
                  'Segera Habis',
                  'Baru',
                ] as const
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setContractFilter(mode)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    contractFilter === mode
                      ? 'bg-[#1468E8] text-white'
                      : 'text-[#64748B] hover:text-[#102B69]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {onCreateEmployee && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee(null);
                  setModalMode('create');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Karyawan</span>
              </button>
            )}
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
                  Email &amp; WhatsApp
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Unit / Klien
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Tanggal Join &amp; EOC
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Identitas &amp; Berkas
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada karyawan di cakupan Anda yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                visibleEmployees.map((emp) => {
                  const docs = countUploadedDocuments(emp.documents);
                  const eoc = getContractEocIndicator(emp.contractType, emp.contractEndDate);
                  const latestHistory = emp.contractHistory?.[emp.contractHistory.length - 1];
                  const waHref = buildEmployeeWhatsappUrl(emp);
                  const emailHref = buildEmployeeMailtoUrl(emp);

                  return (
                    <tr key={emp.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setModalMode('view');
                            }}
                            className="font-bold text-[#172033] hover:text-[#1468E8] hover:underline underline-offset-2 text-left cursor-pointer"
                          >
                            {emp.fullName}
                          </button>
                          {emp.isNewHire && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold text-[#1468E8] bg-[#EAF2FF] border border-[#C9DDFB] rounded-[3px]">
                              Baru
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B] tabular-nums mt-0.5">
                          NIK: <span className="font-mono font-semibold text-[#102B69]">{emp.employeeCode}</span> · {emp.position}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <a
                          href={emailHref}
                          title={`Kirim Email ke ${emp.fullName}`}
                          className="inline-flex items-center gap-1 text-[#172033] hover:text-[#1468E8] hover:underline"
                        >
                          <Mail className="w-3 h-3 text-[#64748B] shrink-0" aria-hidden="true" />
                          <span>{emp.email}</span>
                        </a>
                        <div className="mt-1">
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Kirim WhatsApp ke ${emp.fullName}`}
                            className="inline-flex items-center gap-1 text-[#16A36A] hover:underline font-semibold tabular-nums"
                          >
                            <MessageCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>WA: {emp.whatsappNumber}</span>
                          </a>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-[#102B69]">{emp.entityName}</p>
                        {(emp.placementName || emp.placementLocation) && (
                          <p className="text-[11px] text-[#172033] mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>
                              {emp.placementName || emp.placementLocation}
                              {emp.placementArea ? ` · ${emp.placementArea}` : ''}
                              {emp.employmentType === 'Penempatan Klien' &&
                              (emp.additionalBranches ?? []).length > 0
                                ? ` (+${emp.additionalBranches?.length} cabang)`
                                : ''}
                            </span>
                            {emp.placementMapsUrl && isValidMapsUrl(emp.placementMapsUrl) && (
                              <a
                                href={emp.placementMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[#1468E8] hover:underline font-semibold"
                              >
                                <MapPin className="w-3 h-3" aria-hidden="true" />
                                <span>Maps</span>
                              </a>
                            )}
                          </p>
                        )}
                        {emp.employmentType === 'Internal' &&
                          (emp.handledClients ?? []).length > 0 && (
                            <p className="text-[11px] text-[#1468E8] font-medium mt-0.5">
                              Handle: {formatEmployeeHandledClientsSummary(emp).join(' · ')}
                            </p>
                          )}
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          {emp.employmentType === 'Internal'
                            ? 'Internal'
                            : 'Eksternal (Penempatan Klien)'}{' '}
                          ·{' '}
                          <span
                            className={`font-semibold ${
                              emp.status === 'Aktif'
                                ? 'text-[#16A36A]'
                                : emp.status === 'Probation'
                                  ? 'text-[#B87D00]'
                                  : 'text-[#DC3545]'
                            }`}
                          >
                            {emp.status}
                            {emp.status === 'Resign' && emp.resignDate
                              ? ` (${formatIndonesianDate(emp.resignDate)})`
                              : ''}
                          </span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs tabular-nums whitespace-nowrap">
                        <p className="text-[#172033]">
                          Join: <span className="font-semibold">{formatIndonesianDate(emp.joinDate)}</span>
                        </p>
                        <p className="text-[#64748B] mt-0.5">
                          {emp.contractType === 'PKWTT' ? (
                            <span className="text-[#16A36A] font-semibold">PKWTT (Tetap)</span>
                          ) : (
                            <>
                              EOC:{' '}
                              <span
                                className={`font-semibold ${
                                  eoc.isExpiring
                                    ? eoc.severity === 'danger'
                                      ? 'text-[#DC3545]'
                                      : 'text-[#B87D00]'
                                    : 'text-[#102B69]'
                                }`}
                              >
                                {formatIndonesianDate(emp.contractEndDate)}
                              </span>
                            </>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {eoc.isExpiring && (
                            <span
                              className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-[3px] border ${
                                eoc.severity === 'danger'
                                  ? 'text-[#DC3545] bg-[#FEF2F2] border-[#FECACA]'
                                  : 'text-[#B87D00] bg-[#FFFBEB] border-[#FDE68A]'
                              }`}
                            >
                              {eoc.badgeLabel}
                            </span>
                          )}
                          {latestHistory && (
                            <span
                              className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] border ${
                                latestHistory.signatureStatus === 'Menunggu TTD Karyawan'
                                  ? 'text-[#B87D00] bg-[#FFFBEB] border-[#FDE68A]'
                                  : 'text-[#16A36A] bg-[#ECFDF5] border-[#A7F3D0]'
                              }`}
                            >
                              {latestHistory.sequenceLabel} ·{' '}
                              {latestHistory.signatureStatus === 'Menunggu TTD Karyawan'
                                ? 'Menunggu TTD'
                                : 'TTD OK'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs tabular-nums whitespace-nowrap">
                        <p className="font-mono text-[#64748B]">
                          NIK KTP: <span className="text-[#172033]">{maskSensitiveNumber(emp.nik)}</span>
                        </p>
                        <p
                          className={`font-semibold mt-0.5 ${
                            docs.completed === docs.total ? 'text-[#16A36A]' : 'text-[#B87D00]'
                          }`}
                        >
                          Berkas: {docs.completed}/{docs.total} lengkap
                        </p>
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setModalMode('view');
                            }}
                            aria-label={`Lihat detail ${emp.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Lihat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setModalMode('edit');
                            }}
                            aria-label={`Perbarui administrasi ${emp.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Perbarui</span>
                          </button>
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

      {modalMode && (modalMode === 'create' || liveSelectedEmployee) && (
        <EmployeeModal
          key={`${modalMode}-${liveSelectedEmployee?.id ?? 'new'}`}
          mode={modalMode}
          employee={modalMode === 'create' ? null : liveSelectedEmployee}
          entities={scopedEntities.length > 0 ? scopedEntities : entities}
          allEntities={entities}
          departments={departments}
          onClose={() => {
            setModalMode(null);
            setSelectedEmployee(null);
          }}
          onSwitchToEdit={() => setModalMode('edit')}
          onOpenPkwt={(emp, historyItem) => {
            setModalMode(null);
            setSelectedEmployee(null);
            setPkwtTarget({ employee: emp, historyItem });
          }}
          onResetFaceBiometric={(emp) => {
            onResetFaceBiometric?.(emp);
            setModalMode(null);
            setSelectedEmployee(null);
          }}
          onMarkReviewed={onMarkReviewed}
          onAddContractHistory={onAddContractHistory}
          onSave={(data, existingId) => {
            if (existingId) {
              onUpdateEmployee(existingId, data);
            } else {
              onCreateEmployee?.(data);
            }
            setModalMode(null);
            setSelectedEmployee(null);
          }}
        />
      )}

      {pkwtTarget && (
        <PkwtDocumentModal
          settings={settings}
          contract={{
            id: `ctr-${pkwtTarget.employee.id}`,
            contractNumber:
              pkwtTarget.historyItem?.contractNumber ?? pkwtTarget.employee.contractNumber,
            employeeCode: pkwtTarget.employee.employeeCode,
            employeeName: pkwtTarget.employee.fullName,
            employmentType: pkwtTarget.employee.employmentType,
            entityName: pkwtTarget.employee.entityName,
            contractType:
              pkwtTarget.historyItem?.contractType ?? pkwtTarget.employee.contractType,
            startDate: pkwtTarget.historyItem?.startDate ?? pkwtTarget.employee.joinDate,
            endDate: pkwtTarget.historyItem?.endDate ?? pkwtTarget.employee.contractEndDate,
            daysRemaining: calculateDaysRemaining(
              pkwtTarget.historyItem?.endDate ?? pkwtTarget.employee.contractEndDate
            ),
            status: 'Aktif',
          }}
          employee={
            pkwtTarget.historyItem
              ? {
                  ...pkwtTarget.employee,
                  contractNumber: pkwtTarget.historyItem.contractNumber,
                  joinDate: pkwtTarget.historyItem.startDate,
                  contractEndDate: pkwtTarget.historyItem.endDate,
                  position: pkwtTarget.historyItem.position,
                  placementName:
                    pkwtTarget.historyItem.placementName ?? pkwtTarget.employee.placementName,
                  contractHistory: [pkwtTarget.historyItem],
                }
              : pkwtTarget.employee
          }
          onClose={() => setPkwtTarget(null)}
        />
      )}
    </div>
  );
};
