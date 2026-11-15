import React, { useState } from 'react';
import { ArrowUpRight, FileText, UserPlus } from 'lucide-react';
import {
  ContractRecord,
  DepartmentRecord,
  EmployeeFormInput,
  EmployeeRecord,
  EntityRecord,
  OnboardingCandidateRecord,
  SystemSettingsConfig,
  formatIndonesianDate,
} from '../../data/masterAdminData';
import {
  resolveEmployeeContractSequenceLabel,
  resolveLatestContractSignatureStatus,
} from '../../utils/pkwtLifecycle';
import { EmployeeModal } from '../dashboard/EmployeeModal';
import { PkwtDocumentModal } from '../dashboard/PkwtDocumentModal';

interface AdminOnboardingPkwtPanelProps {
  candidates: OnboardingCandidateRecord[];
  contracts: ContractRecord[];
  employees?: EmployeeRecord[];
  entities: EntityRecord[];
  departments: DepartmentRecord[];
  assignedScopes: string[];
  settings?: SystemSettingsConfig;
  onSubmitCandidateOnboarding: (candidateId: string, employeeData: EmployeeFormInput) => void;
  onProposePkwtExtension: (contractId: string) => void;
  onInspectEmployee: (employeeCode: string) => void;
}

export const AdminOnboardingPkwtPanel: React.FC<AdminOnboardingPkwtPanelProps> = ({
  candidates,
  contracts,
  employees = [],
  entities,
  departments,
  assignedScopes,
  settings,
  onSubmitCandidateOnboarding,
  onProposePkwtExtension,
  onInspectEmployee,
}) => {
  const [activeCandidate, setActiveCandidate] = useState<OnboardingCandidateRecord | null>(null);
  const [activePkwtContract, setActivePkwtContract] = useState<ContractRecord | null>(null);
  const [contractFilter, setContractFilter] = useState<'Semua' | 'Segera Berakhir' | 'PKWT'>(
    'Semua'
  );

  const scopedEntities = entities.filter((e) => assignedScopes.includes(e.name));
  const visibleContracts = contracts.filter((c) => {
    if (contractFilter === 'PKWT') return c.contractType === 'PKWT';
    if (contractFilter === 'Segera Berakhir') {
      return (
        c.status === 'Segera Berakhir' || (c.daysRemaining !== null && c.daysRemaining <= 30)
      );
    }
    return true;
  });

  const buildPrefillForCandidate = (
    cand: OnboardingCandidateRecord
  ): Partial<EmployeeFormInput> => {
    const matchedDept = departments.find((d) => d.entityName === cand.entityName);
    const codeSuffix = cand.candidateCode.replace(/\D/g, '').slice(-3) || '299';
    const basePrefill: Partial<EmployeeFormInput> = {
      employeeCode: `NEW-${codeSuffix}`,
      fullName: cand.fullName,
      email: cand.email,
      whatsappNumber: cand.whatsappNumber,
      position: cand.position,
      department: matchedDept?.name ?? '',
      employmentType: cand.employmentType,
      entityName: cand.entityName,
      contractType: cand.proposedContractType,
      contractNumber: `${cand.proposedContractType}-${cand.employmentType === 'Internal' ? 'INT' : 'CLN'}-2026/${codeSuffix}`,
      joinDate: cand.targetJoinDate,
      contractEndDate: cand.proposedContractType === 'PKWT' ? cand.proposedEndDate : '',
      status: 'Probation',
      bankAccountHolder: cand.fullName,
      salaryMonthly: cand.salaryMonthly,
      placementLocation: cand.placementLocation,
    };
    return cand.prefillEmployeeData
      ? {
          ...basePrefill,
          ...cand.prefillEmployeeData,
          joinDate: cand.targetJoinDate,
          contractEndDate: cand.proposedContractType === 'PKWT' ? cand.proposedEndDate : '',
          status: 'Probation',
        }
      : basePrefill;
  };

  return (
    <div className="space-y-6">
      {/* Sub-section A: Candidates Passed Recruiter Ready for Onboarding */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#102B69]">
            Kandidat Lolos Rekruter (Siap Onboarding)
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Konversi kandidat lolos seleksi menjadi karyawan Probation dan kirim permohonan aktivasi
            ke Master Admin
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Kandidat &amp; Kontak
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Posisi &amp; Unit/Klien
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Target Join &amp; Kontrak
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Berkas Masuk
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Status
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada kandidat onboarding di cakupan terpilih.
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <p className="font-bold text-[#172033]">{cand.fullName}</p>
                      <p className="text-xs text-[#64748B] tabular-nums">
                        {cand.candidateCode} · WA: {cand.whatsappNumber}
                      </p>
                      <p className="text-[11px] text-[#64748B]">{cand.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-semibold text-[#102B69]">{cand.position}</p>
                      <p className="text-[#64748B] mt-0.5">{cand.entityName}</p>
                      <p className="text-[11px] text-[#64748B]">Rekruter: {cand.recruiterName}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs tabular-nums whitespace-nowrap">
                      <p className="text-[#172033]">
                        Join:{' '}
                        <span className="font-semibold">
                          {formatIndonesianDate(cand.targetJoinDate)}
                        </span>
                      </p>
                      <p className="text-[#64748B] mt-0.5">
                        {cand.proposedContractType} s/d {formatIndonesianDate(cand.proposedEndDate)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#102B69] tabular-nums whitespace-nowrap">
                      {cand.documentsReadyCount} / 11 dokumen
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-bold ${
                          cand.status === 'Aktif Menjadi Karyawan'
                            ? 'text-[#16A36A]'
                            : cand.status === 'Menunggu Aktivasi Master Admin'
                              ? 'text-[#B87D00]'
                              : 'text-[#1468E8]'
                        }`}
                      >
                        {cand.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      {cand.status === 'Siap Onboarding' ? (
                        <button
                          type="button"
                          onClick={() => setActiveCandidate(cand)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Proses Onboarding</span>
                        </button>
                      ) : (
                        <span className="text-xs text-[#64748B]">Terkirim ke Master Admin</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sub-section B: Scoped PKWT Monitoring & Extension Proposal */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">
              Pengawasan Kontrak PKWT &amp; Usulan Perpanjangan
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pantau sisa masa kontrak di cakupan Anda dan ajukan perpanjangan PKWT ke Master Admin
            </p>
          </div>

          <div className="inline-flex p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
            {(['Semua', 'Segera Berakhir', 'PKWT'] as const).map((mode) => (
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Karyawan &amp; Nomor Kontrak
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Unit / Klien
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Join – End of Contract
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Sisa Masa
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Status
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Usulan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {visibleContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada kontrak karyawan di cakupan Anda yang sesuai filter.
                  </td>
                </tr>
              ) : (
                visibleContracts.map((c) => {
                  const matchedEmp = employees.find(
                    (e) => e.employeeCode.toLowerCase() === c.employeeCode.toLowerCase()
                  );
                  const seqLabel = matchedEmp
                    ? resolveEmployeeContractSequenceLabel(matchedEmp)
                    : c.contractType;
                  const ttdStatus = matchedEmp
                    ? resolveLatestContractSignatureStatus(matchedEmp)
                    : null;
                  return (
                    <tr key={c.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <button
                          type="button"
                          onClick={() => onInspectEmployee(c.employeeCode)}
                          className="font-semibold text-[#172033] hover:text-[#1468E8] hover:underline underline-offset-2 text-left cursor-pointer"
                        >
                          {c.employeeName}
                        </button>
                        <p className="text-xs text-[#64748B] tabular-nums">
                          {c.contractNumber} ({seqLabel})
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-[#102B69]">
                        {c.entityName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#172033] tabular-nums whitespace-nowrap">
                        {c.startDate} – {c.endDate}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-[#102B69] tabular-nums whitespace-nowrap">
                        {c.daysRemaining === null ? 'Tetap' : `${c.daysRemaining} hari`}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap space-y-0.5">
                        <p
                          className={`text-xs font-bold ${
                            c.status === 'Segera Berakhir'
                              ? 'text-[#B87D00]'
                              : c.status === 'Diperpanjang'
                                ? 'text-[#1468E8]'
                                : 'text-[#16A36A]'
                          }`}
                        >
                          {c.status}
                        </p>
                        {ttdStatus && c.contractType === 'PKWT' && (
                          <p
                            className={`text-[11px] font-semibold ${
                              ttdStatus === 'Menunggu TTD Karyawan'
                                ? 'text-[#B87D00]'
                                : 'text-[#16A36A]'
                            }`}
                          >
                            {ttdStatus}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {c.contractType === 'PKWT' && (
                            <button
                              type="button"
                              onClick={() => setActivePkwtContract(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Lihat / Cetak PKWT</span>
                            </button>
                          )}
                          {c.contractType === 'PKWT' && c.status !== 'Diperpanjang' ? (
                            c.extensionRequested ? (
                              <span className="text-xs font-semibold text-[#B87D00]">
                                Usulan Dikirim ke Master Admin
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onProposePkwtExtension(c.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                              >
                                <span>Ajukan Perpanjangan PKWT</span>
                                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            )
                          ) : c.contractType !== 'PKWT' ? (
                            <span className="text-xs text-[#64748B]">—</span>
                          ) : null}
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

      {activeCandidate && (
        <EmployeeModal
          key={`onb-${activeCandidate.id}`}
          mode="create"
          employee={null}
          entities={scopedEntities.length > 0 ? scopedEntities : entities}
          departments={departments}
          prefill={buildPrefillForCandidate(activeCandidate)}
          onClose={() => setActiveCandidate(null)}
          onSwitchToEdit={() => {}}
          onSave={(data) => {
            onSubmitCandidateOnboarding(activeCandidate.id, data);
            setActiveCandidate(null);
          }}
        />
      )}

      {activePkwtContract && (
        <PkwtDocumentModal
          contract={activePkwtContract}
          employee={employees.find((e) => e.employeeCode === activePkwtContract.employeeCode)}
          settings={settings}
          onClose={() => setActivePkwtContract(null)}
        />
      )}
    </div>
  );
};
