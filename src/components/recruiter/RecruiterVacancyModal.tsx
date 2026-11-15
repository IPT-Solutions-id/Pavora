import React from 'react';
import { AlertCircle, MapPin, X } from 'lucide-react';
import type { EmploymentCategory, EntityRecord } from '../../data/masterAdminData';
import {
  type VacancyStatus,
  formatRupiahSimple,
  resolveMasterClientVacancyOptions,
} from '../../data/recruitmentData';

export interface VacancyFormState {
  clientName: string;
  showClientNameToApplicants: boolean;
  clientIndustryLabel: string;
  employmentType: EmploymentCategory;
  position: string;
  department: string;
  placementId: string;
  placementName: string;
  placementArea: string;
  placementMapsUrl: string;
  placementLocation: string;
  headcountNeeded: number;
  contractType: 'PKWT' | 'PKWTT';
  salaryMin: number;
  salaryMax: number;
  salaryNote: string;
  jobdeskText: string;
  requirementsText: string;
  deadlineDate: string;
  urgency: 'Normal' | 'Mendesak';
  status: VacancyStatus;
}

export function buildEmptyVacancyForm(
  entities: EntityRecord[] = [],
  assignedScopes: string[] = []
): VacancyFormState {
  const options = resolveMasterClientVacancyOptions(entities, assignedScopes);
  const firstOpt = options[0];
  const firstPos = firstOpt?.positions[0];
  const firstLoc = firstOpt?.placements[0];

  return {
    clientName: firstOpt?.entity.name ?? '',
    showClientNameToApplicants: true,
    clientIndustryLabel: firstOpt?.entity.industryLabel || 'Mitra Korporat SWAPRO',
    employmentType:
      firstOpt?.entity.category === 'Internal' ? 'Internal' : 'Penempatan Klien',
    position: firstPos?.title ?? '',
    department: firstPos?.department ?? '',
    placementId: firstLoc?.id ?? '',
    placementName: firstLoc?.name ?? '',
    placementArea: firstLoc?.area ?? '',
    placementMapsUrl: firstLoc?.mapsUrl ?? '',
    placementLocation: firstLoc
      ? `${firstLoc.name} (${firstLoc.area})`
      : firstOpt?.entity.city ?? '',
    headcountNeeded: 5,
    contractType: 'PKWT',
    salaryMin: firstPos?.baseSalary ?? firstOpt?.entity.defaultBaseSalary ?? 5000000,
    salaryMax: firstPos?.baseSalary ?? firstOpt?.entity.defaultBaseSalary ?? 5500000,
    salaryNote: 'Sesuai UMK Penempatan + BPJS Lengkap',
    jobdeskText: '',
    requirementsText: '',
    deadlineDate: '2026-12-31',
    urgency: 'Normal',
    status: 'Aktif',
  };
}

interface RecruiterVacancyModalProps {
  mode: 'create' | 'edit';
  entities: EntityRecord[];
  assignedScopes: string[];
  form: VacancyFormState;
  error: string | null;
  onChangeForm: React.Dispatch<React.SetStateAction<VacancyFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const RecruiterVacancyModal: React.FC<RecruiterVacancyModalProps> = ({
  mode,
  entities,
  assignedScopes,
  form,
  error,
  onChangeForm,
  onSubmit,
  onClose,
}) => {
  const clientOptions = resolveMasterClientVacancyOptions(entities, assignedScopes);
  const selectedOption = clientOptions.find(
    (opt) => opt.entity.name.trim().toLowerCase() === form.clientName.trim().toLowerCase()
  );
  const supportedPositions = selectedOption?.positions ?? [];
  const supportedPlacements = selectedOption?.placements ?? [];

  const matchedPosition = supportedPositions.find(
    (p) => p.title.trim().toLowerCase() === form.position.trim().toLowerCase()
  );
  const matchedPlacement = supportedPlacements.find((loc) => loc.id === form.placementId);

  const handleSelectClient = (clientName: string) => {
    const opt = clientOptions.find((o) => o.entity.name === clientName);
    if (!opt) {
      onChangeForm((prev) => ({
        ...prev,
        clientName: '',
        position: '',
        department: '',
        placementId: '',
        placementName: '',
        placementArea: '',
        placementMapsUrl: '',
        placementLocation: '',
      }));
      return;
    }
    const firstPos = opt.positions[0];
    const firstLoc = opt.placements[0];
    const baseSalary = firstPos?.baseSalary ?? opt.entity.defaultBaseSalary ?? 5000000;

    onChangeForm((prev) => ({
      ...prev,
      clientName: opt.entity.name,
      employmentType: opt.entity.category === 'Internal' ? 'Internal' : 'Penempatan Klien',
      clientIndustryLabel: opt.entity.industryLabel || prev.clientIndustryLabel,
      position: firstPos?.title ?? '',
      department: firstPos?.department ?? '',
      placementId: firstLoc?.id ?? '',
      placementName: firstLoc?.name ?? '',
      placementArea: firstLoc?.area ?? '',
      placementMapsUrl: firstLoc?.mapsUrl ?? '',
      placementLocation: firstLoc ? `${firstLoc.name} (${firstLoc.area})` : '',
      salaryMin: baseSalary,
      salaryMax: baseSalary,
    }));
  };

  const handleSelectPosition = (positionTitle: string) => {
    const pos = supportedPositions.find((p) => p.title === positionTitle);
    if (!pos) return;
    onChangeForm((prev) => ({
      ...prev,
      position: pos.title,
      department: pos.department,
      salaryMin: pos.baseSalary,
      salaryMax: pos.baseSalary,
    }));
  };

  const handleSelectPlacement = (placementId: string) => {
    const loc = supportedPlacements.find((l) => l.id === placementId);
    if (!loc) return;
    onChangeForm((prev) => ({
      ...prev,
      placementId: loc.id,
      placementName: loc.name,
      placementArea: loc.area,
      placementMapsUrl: loc.mapsUrl,
      placementLocation: `${loc.name} (${loc.area})`,
    }));
  };

  const isLegacyPositionInEdit =
    mode === 'edit' && Boolean(form.position.trim()) && !matchedPosition;

  const missingClientConfig =
    Boolean(selectedOption) &&
    (supportedPositions.length === 0 || supportedPlacements.length === 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vacancy-form-title"
    >
      <form
        onSubmit={onSubmit}
        className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-between gap-4">
          <div>
            <h2 id="vacancy-form-title" className="text-lg font-bold text-[#102B69]">
              {mode === 'edit' ? 'Edit Lowongan Kerja' : 'Buat Lowongan Client Baru'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Client, Posisi, dan Lokasi Penempatan disinkronkan langsung dari pengaturan Master
              Admin sesuai cakupan Rekruter Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form lowongan"
            className="p-1.5 text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div
              role="alert"
              className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-[#DC3545] font-semibold flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {clientOptions.length === 0 ? (
            <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-[4px] text-[#92400E] space-y-1">
              <p className="font-bold">Belum Ada Master Client pada Cakupan Anda</p>
              <p>
                Master Admin belum menugaskan Client / Unit aktif pada akun Rekruter Anda. Hubungi
                Master Admin untuk menetapkan cakupan di menu Pengguna &amp; RBAC.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-[#EAF2FF]/55 border border-[#C9DDFB] rounded-[4px] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-[#102B69]">
                  Sinkronisasi Master Client (Setting Master Admin)
                </p>
                {selectedOption && (
                  <p className="text-[11px] font-medium text-[#475569] tabular-nums">
                    {selectedOption.positions.length} Posisi · {selectedOption.placements.length}{' '}
                    Cabang Penempatan
                    {selectedOption.entity.pksNumber
                      ? ` · PKS ${selectedOption.entity.pksNumber}`
                      : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="vacancy-client-select"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Client / Unit Kerja (Master Admin) *
                  </label>
                  <select
                    id="vacancy-client-select"
                    value={selectedOption?.entity.name ?? ''}
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#C9DDFB] rounded-[4px] font-semibold text-[#102B69]"
                  >
                    <option value="">— Pilih Client / Unit Aktif —</option>
                    {clientOptions.map((opt) => (
                      <option key={opt.entity.id} value={opt.entity.name}>
                        {opt.entity.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="vacancy-position-select"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Posisi Disupport *
                  </label>
                  <select
                    id="vacancy-position-select"
                    value={form.position}
                    disabled={!selectedOption || supportedPositions.length === 0}
                    onChange={(e) => handleSelectPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#C9DDFB] rounded-[4px] font-semibold text-[#102B69] disabled:opacity-60"
                  >
                    <option value="">— Pilih Posisi dari Master Client —</option>
                    {isLegacyPositionInEdit && (
                      <option value={form.position}>{form.position} (Posisi Sebelumnya)</option>
                    )}
                    {supportedPositions.map((pos) => (
                      <option key={pos.id} value={pos.title}>
                        {pos.title} ({formatRupiahSimple(pos.baseSalary)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="vacancy-placement-select"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Lokasi Penempatan / Cabang *
                  </label>
                  <select
                    id="vacancy-placement-select"
                    value={form.placementId}
                    disabled={!selectedOption || supportedPlacements.length === 0}
                    onChange={(e) => handleSelectPlacement(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#C9DDFB] rounded-[4px] font-semibold text-[#102B69] disabled:opacity-60"
                  >
                    <option value="">— Pilih Cabang Penempatan —</option>
                    {supportedPlacements.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} · {loc.area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedOption && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#475569] pt-1 border-t border-[#C9DDFB]/70">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#1468E8] shrink-0" aria-hidden="true" />
                    <span>
                      {matchedPlacement
                        ? `Penempatan: ${matchedPlacement.name} (${matchedPlacement.area})${
                            matchedPlacement.mapsUrl ? ' · Link Maps Terpasang' : ''
                          }`
                        : 'Pilih cabang penempatan yang telah di-set Master Admin'}
                    </span>
                  </div>
                  <span>
                    Divisi Otomatis: <strong className="text-[#102B69]">{form.department || '—'}</strong>
                  </span>
                </div>
              )}

              {missingClientConfig && (
                <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-[4px] text-[#92400E] font-medium">
                  {supportedPositions.length === 0 &&
                    `Master Admin belum mengisi daftar Posisi Disupport untuk ${selectedOption?.entity.name}. `}
                  {supportedPlacements.length === 0 &&
                    `Master Admin belum mengisi Cabang / Lokasi Penempatan untuk ${selectedOption?.entity.name}.`}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="vacancy-headcount-input"
                className="block font-semibold text-[#172033] mb-1"
              >
                Kebutuhan Berapa Orang (Kuota) *
              </label>
              <input
                id="vacancy-headcount-input"
                type="number"
                min={1}
                max={999}
                value={form.headcountNeeded}
                onChange={(e) =>
                  onChangeForm((prev) => ({
                    ...prev,
                    headcountNeeded: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172033] mb-1">
                Tipe Penempatan &amp; Kontrak
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  readOnly
                  value={form.employmentType}
                  aria-label="Kategori penempatan dari Master Client"
                  className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#64748B] font-semibold"
                />
                <select
                  value={form.contractType}
                  onChange={(e) =>
                    onChangeForm((prev) => ({
                      ...prev,
                      contractType: e.target.value as 'PKWT' | 'PKWTT',
                    }))
                  }
                  aria-label="Jenis perjanjian kontrak"
                  className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                >
                  <option value="PKWT">PKWT</option>
                  <option value="PKWTT">PKWTT</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="vacancy-salary-min"
                className="block font-semibold text-[#172033] mb-1"
              >
                Gaji Minimal (Rp)
              </label>
              <input
                id="vacancy-salary-min"
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(e) =>
                  onChangeForm((prev) => ({ ...prev, salaryMin: Number(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="vacancy-salary-max"
                className="block font-semibold text-[#172033] mb-1"
              >
                Gaji Maksimal (Rp)
              </label>
              <input
                id="vacancy-salary-max"
                type="number"
                min={0}
                value={form.salaryMax}
                onChange={(e) =>
                  onChangeForm((prev) => ({ ...prev, salaryMax: Number(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="vacancy-salary-note"
                className="block font-semibold text-[#172033] mb-1"
              >
                Catatan Gaji &amp; Tunjangan
              </label>
              <input
                id="vacancy-salary-note"
                type="text"
                value={form.salaryNote}
                onChange={(e) =>
                  onChangeForm((prev) => ({ ...prev, salaryNote: e.target.value }))
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172033] mb-1">
                Tenggat &amp; Status Publikasi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.deadlineDate}
                  onChange={(e) =>
                    onChangeForm((prev) => ({ ...prev, deadlineDate: e.target.value }))
                  }
                  aria-label="Tanggal tenggat lowongan"
                  className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                />
                <select
                  value={form.status}
                  onChange={(e) => {
                    const st = e.target.value as VacancyStatus;
                    onChangeForm((prev) => ({
                      ...prev,
                      status: st,
                      urgency: st === 'Mendesak' ? 'Mendesak' : prev.urgency,
                    }));
                  }}
                  aria-label="Status publikasi lowongan"
                  className="px-2.5 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                >
                  <option value="Aktif">Aktif (Tayang)</option>
                  <option value="Mendesak">Mendesak (Tayang)</option>
                  <option value="Draft">Draft</option>
                  <option value="Ditutup">Ditutup</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-2">
            <label className="inline-flex items-center gap-2 font-semibold text-[#102B69] cursor-pointer">
              <input
                type="checkbox"
                checked={form.showClientNameToApplicants}
                onChange={(e) =>
                  onChangeForm((prev) => ({
                    ...prev,
                    showClientNameToApplicants: e.target.checked,
                  }))
                }
              />
              <span>Tampilkan nama Client secara terbuka di Portal Pelamar</span>
            </label>
            {!form.showClientNameToApplicants && (
              <input
                type="text"
                value={form.clientIndustryLabel}
                onChange={(e) =>
                  onChangeForm((prev) => ({ ...prev, clientIndustryLabel: e.target.value }))
                }
                placeholder="Label industri alternatif (contoh: Mitra Perbankan Nasional)"
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="vacancy-jobdesk-input"
                className="block font-semibold text-[#172033] mb-1"
              >
                Jobdesk / Uraian Tugas (1 poin per baris) *
              </label>
              <textarea
                id="vacancy-jobdesk-input"
                rows={4}
                value={form.jobdeskText}
                onChange={(e) =>
                  onChangeForm((prev) => ({ ...prev, jobdeskText: e.target.value }))
                }
                placeholder="Melayani nasabah cabang&#10;Melakukan verifikasi kelengkapan berkas"
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>
            <div>
              <label
                htmlFor="vacancy-req-input"
                className="block font-semibold text-[#172033] mb-1"
              >
                Persyaratan / Kualifikasi (1 poin per baris) *
              </label>
              <textarea
                id="vacancy-req-input"
                rows={4}
                value={form.requirementsText}
                onChange={(e) =>
                  onChangeForm((prev) => ({ ...prev, requirementsText: e.target.value }))
                }
                placeholder="Pendidikan min. D3/S1&#10;Komunikatif &amp; teliti"
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={clientOptions.length === 0 || missingClientConfig}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:opacity-50 disabled:cursor-not-allowed rounded-[4px] cursor-pointer"
          >
            {mode === 'edit' ? 'Simpan Perubahan Lowongan' : 'Publikasikan Lowongan'}
          </button>
        </div>
      </form>
    </div>
  );
};
