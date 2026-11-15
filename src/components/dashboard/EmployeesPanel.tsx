import React, { useState } from 'react';
import { Edit3, Eye, Mail, MapPin, MessageCircle, Plus, Search, Trash2 } from 'lucide-react';
import {
  ContractHistoryItem,
  DepartmentRecord,
  EmployeeContractFilterMode,
  EmployeeFormInput,
  EmployeeRecord,
  EmploymentCategory,
  EntityRecord,
  SystemSettingsConfig,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  calculateDaysRemaining,
  countUploadedDocuments,
  filterEmployees,
  formatIndonesianDate,
  getContractEocIndicator,
  maskSensitiveNumber,
} from '../../data/masterAdminData';
import { isValidMapsUrl } from '../../utils/mapsUrl';
import { EmployeeModal } from './EmployeeModal';
import { PkwtDocumentModal } from './PkwtDocumentModal';

interface EmployeesPanelProps {
  employees: EmployeeRecord[];
  entities: EntityRecord[];
  departments: DepartmentRecord[];
  settings?: SystemSettingsConfig;
  onCreateEmployee: (data: EmployeeFormInput) => void;
  onUpdateEmployee: (id: string, data: EmployeeFormInput) => void;
  onDeleteEmployee: (id: string) => void;
  onResetFaceBiometric?: (employee: EmployeeRecord) => void;
  onMarkReviewed?: (employee: EmployeeRecord) => void;
  onAddContractHistory?: (
    employeeId: string,
    entry: Omit<ContractHistoryItem, 'id'>,
    makeActiveContract: boolean
  ) => void;
}

export const EmployeesPanel: React.FC<EmployeesPanelProps> = ({
  employees,
  entities,
  departments,
  settings,
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onResetFaceBiometric,
  onMarkReviewed,
  onAddContractHistory,
}) => {
  const [query, setQuery] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState<EmploymentCategory | 'Semua'>('Semua');
  const [contractFilter, setContractFilter] = useState<EmployeeContractFilterMode>('Semua');
  const [entityFilter, setEntityFilter] = useState('Semua');

  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit' | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pkwtTarget, setPkwtTarget] = useState<{
    employee: EmployeeRecord;
    historyItem?: ContractHistoryItem;
  } | null>(null);

  const liveSelectedEmployee = selectedEmployee
    ? employees.find((e) => e.id === selectedEmployee.id) ?? selectedEmployee
    : null;

  const visibleEmployees = filterEmployees(
    employees,
    query,
    employmentFilter,
    contractFilter,
    entityFilter
  );

  const internalCount = employees.filter((e) => e.employmentType === 'Internal').length;
  const clientCount = employees.filter((e) => e.employmentType === 'Penempatan Klien').length;
  const pkwtCount = employees.filter((e) => e.contractType === 'PKWT').length;
  const pkwttCount = employees.filter((e) => e.contractType === 'PKWTT').length;
  const expiringSoonCount = employees.filter(
    (e) => getContractEocIndicator(e.contractType, e.contractEndDate).isExpiring
  ).length;
  const hasClients = entities.some((e) => e.category === 'Klien Penempatan') || clientCount > 0;

  const openViewModal = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp);
    setModalMode('view');
  };

  const openCreateModal = () => {
    setSelectedEmployee(null);
    setModalMode('create');
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp);
    setModalMode('edit');
  };

  const handleSaveModal = (data: EmployeeFormInput, existingId?: string) => {
    if (existingId) {
      onUpdateEmployee(existingId, data);
    } else {
      onCreateEmployee(data);
    }
    setModalMode(null);
    setSelectedEmployee(null);
  };

  const pendingDeleteRecord = employees.find((e) => e.id === pendingDeleteId) ?? null;

  return (
    <div className="space-y-6">
      {/* 4-column Employee Database Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Total Record Karyawan</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums mt-1">
            {employees.length} Data
          </p>
          <p className="text-xs text-[#64748B] mt-1 tabular-nums">
            {internalCount} internal · {clientCount} penempatan klien
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Status Kontrak Kerja</p>
          <p className="text-2xl font-extrabold text-[#102B69] tabular-nums mt-1">
            {pkwtCount} PKWT · {pkwttCount} PKWTT
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Terhubung dengan Tanggal Join &amp; EOC
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">End of Contract ≤ 30 Hari</p>
          <p
            className={`text-2xl font-extrabold tabular-nums mt-1 ${
              expiringSoonCount > 0 ? 'text-[#B87D00]' : 'text-[#16A36A]'
            }`}
          >
            {expiringSoonCount} Karyawan
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Sinkron dengan pantauan kontrak PKWT
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Kelengkapan 11 Berkas Karyawan</p>
          <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums mt-1">
            {
              employees.filter((e) => {
                const c = countUploadedDocuments(e.documents);
                return c.completed === c.total;
              }).length
            }{' '}
            / {employees.length}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            CV, KTP, KK, SIM, Ijazah, SKCK, Foto &amp; Kontrak
          </p>
        </div>
      </div>

      {/* Inline Delete Confirmation Banner (replaces window.confirm) */}
      {pendingDeleteRecord && (
        <div
          role="alertdialog"
          aria-labelledby="delete-confirm-title"
          className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h3 id="delete-confirm-title" className="text-sm font-bold text-[#DC3545]">
              Konfirmasi Penghapusan Data Karyawan
            </h3>
            <p className="text-xs text-[#172033] mt-0.5">
              Hapus profil <strong>{pendingDeleteRecord.fullName}</strong> (
              {pendingDeleteRecord.employeeCode}) beserta data KTP, KK, dan rekening dari direktori?
              Tindakan ini akan dicatat di Log Audit.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteEmployee(pendingDeleteRecord.id);
                setPendingDeleteId(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DC3545] hover:bg-[#B91C1C] rounded-[4px] cursor-pointer"
            >
              Ya, Hapus Data
            </button>
          </div>
        </div>
      )}

      {/* Main CRUD Table Card */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">Data Karyawan</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Kelola biodata, penempatan, dan riwayat kontrak karyawan.
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
                placeholder="Cari nama, NIK, email, WA, NIK KTP..."
                aria-label="Cari data karyawan"
                className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] w-60 focus:outline-none focus:border-[#1468E8]"
              />
            </div>

            {hasClients && (
              <select
                aria-label="Filter kategori karyawan"
                value={employmentFilter}
                onChange={(e) =>
                  setEmploymentFilter(e.target.value as EmploymentCategory | 'Semua')
                }
                className="px-2.5 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Internal">Internal Perusahaan</option>
                <option value="Penempatan Klien">Penempatan Klien</option>
              </select>
            )}

            <select
              aria-label="Filter unit atau klien"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-2.5 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] max-w-[190px]"
            >
              <option value="Semua">Semua Unit &amp; Klien</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.name}>
                  {ent.name}
                </option>
              ))}
            </select>

            <div className="inline-flex flex-wrap p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] gap-0.5">
              {(
                ['Semua', 'PKWT', 'PKWTT', 'Probation', 'Segera Habis', 'Baru'] as const
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

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tambah Karyawan</span>
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
                  Kontak (Email &amp; WA)
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Penempatan &amp; Status
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Tanggal Join &amp; EOC
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  KTP, KK &amp; Rekening
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Aksi (CRUD)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada data karyawan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                visibleEmployees.map((emp) => {
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
                            onClick={() => openViewModal(emp)}
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
                          className="inline-flex items-center gap-1 font-medium text-[#172033] hover:text-[#1468E8] hover:underline"
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
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          {emp.employmentType} ·{' '}
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
                      <td className="py-3.5 px-4 text-xs font-mono text-[#64748B] tabular-nums whitespace-nowrap">
                        <p>
                          NIK KTP: <span className="text-[#172033]">{maskSensitiveNumber(emp.nik)}</span>
                        </p>
                        <p className="mt-0.5">
                          {emp.bankName}:{' '}
                          <span className="text-[#172033]">
                            {maskSensitiveNumber(emp.bankAccountNumber, 3, 4)}
                          </span>
                        </p>
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openViewModal(emp)}
                            aria-label={`Lihat detail ${emp.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Lihat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            aria-label={`Edit data ${emp.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(emp.id)}
                            aria-label={`Hapus data ${emp.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#DC3545] bg-white hover:bg-[#FEF2F2] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Hapus</span>
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

      {modalMode && (
        <EmployeeModal
          key={`${modalMode}-${liveSelectedEmployee?.id ?? 'new'}`}
          mode={modalMode}
          employee={liveSelectedEmployee}
          entities={entities}
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
          onSave={handleSaveModal}
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
