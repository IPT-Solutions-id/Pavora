import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  AttendanceLocationMode,
  AttendanceLocationRecord,
  ClientPolicyOverride,
  EntityRecord,
  WorkPolicyConfig,
} from '../../data/masterAdminData';
import { isValidMapsUrl } from '../../utils/mapsUrl';

interface PoliciesPanelProps {
  policy: WorkPolicyConfig;
  entities: EntityRecord[];
  onSavePolicy: (nextPolicy: WorkPolicyConfig) => void;
  onAddLocation: (loc: Omit<AttendanceLocationRecord, 'id'>) => void;
  onToggleLocationStatus: (id: string) => void;
  onRemoveLocation: (id: string) => void;
  onSyncLocationsFromEntities?: () => { addedCount: number; updatedCount: number };
}

export const PoliciesPanel: React.FC<PoliciesPanelProps> = ({
  policy,
  entities,
  onSavePolicy,
  onAddLocation,
  onToggleLocationStatus,
  onRemoveLocation,
  onSyncLocationsFromEntities,
}) => {
  const [draft, setDraft] = useState<WorkPolicyConfig>(policy);
  const [savedNotice, setSavedNotice] = useState<string>('');

  // Add Geofence Location Form state
  const [showLocForm, setShowLocForm] = useState(false);
  const [locEntityName, setLocEntityName] = useState(entities[0]?.name ?? '');
  const [locName, setLocName] = useState('');
  const [locArea, setLocArea] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locMapsUrl, setLocMapsUrl] = useState('');
  const [locRadius, setLocRadius] = useState(100);
  const [locMode, setLocMode] = useState<AttendanceLocationMode>('Wajib di Radius Lokasi');
  const [locError, setLocError] = useState('');
  const [locationFilterEntity, setLocationFilterEntity] = useState<string>('Semua');

  const activeClients = useMemo(
    () => entities.filter((e) => e.category === 'Klien Penempatan' && e.status === 'Aktif'),
    [entities]
  );

  const selectedEntityForForm = useMemo(
    () => entities.find((e) => e.name === locEntityName) ?? null,
    [entities, locEntityName]
  );

  const availableBranchesForSelectedEntity = useMemo(
    () => selectedEntityForForm?.supportedPlacements ?? [],
    [selectedEntityForForm]
  );

  const getOverrideForClient = (client: EntityRecord): ClientPolicyOverride => {
    const existing =
      draft.clientOverrides.find((o) => o.entityId === client.id) ??
      draft.clientOverrides.find((o) => o.entityName === client.name);
    return (
      existing ?? {
        entityId: client.id,
        entityName: client.name,
        checkInTime: draft.checkInTime,
        checkOutTime: draft.checkOutTime,
        lateToleranceMinutes: draft.lateToleranceMinutes,
        workDays: draft.workDays,
        locationMode: draft.defaultLocationMode ?? 'Wajib di Radius Lokasi',
        useDefault: true,
      }
    );
  };

  const updateClientOverride = (
    client: EntityRecord,
    patch: Partial<ClientPolicyOverride>
  ) => {
    setSavedNotice('');
    setDraft((prev) => {
      const current =
        prev.clientOverrides.find((o) => o.entityId === client.id) ??
        prev.clientOverrides.find((o) => o.entityName === client.name) ?? {
          entityId: client.id,
          entityName: client.name,
          checkInTime: prev.checkInTime,
          checkOutTime: prev.checkOutTime,
          lateToleranceMinutes: prev.lateToleranceMinutes,
          workDays: prev.workDays,
          locationMode: prev.defaultLocationMode ?? 'Wajib di Radius Lokasi',
          useDefault: true,
        };
      const updated: ClientPolicyOverride = {
        ...current,
        entityId: client.id,
        entityName: client.name,
        ...patch,
      };
      const exists = prev.clientOverrides.some(
        (o) => o.entityId === client.id || o.entityName === client.name
      );
      return {
        ...prev,
        clientOverrides: exists
          ? prev.clientOverrides.map((o) =>
              o.entityId === client.id || o.entityName === client.name ? updated : o
            )
          : [...prev.clientOverrides, updated],
      };
    });
  };

  const handleSubmitPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePolicy({
      ...draft,
      attendanceLocations: policy.attendanceLocations,
    });
    setSavedNotice(
      'Kebijakan absensi standar & aturan khusus per klien berhasil disimpan dan langsung mengikat presensi karyawan.'
    );
  };

  const handleSelectBranchPreset = (branchId: string) => {
    const branch = availableBranchesForSelectedEntity.find((b) => b.id === branchId);
    if (!branch) return;
    setLocName(branch.name);
    setLocArea(branch.area);
    setLocAddress(`${branch.name} · Area ${branch.area}`);
    setLocMapsUrl(branch.mapsUrl || '');
    setLocError('');
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locEntityName.trim() || !locAddress.trim()) {
      setLocError('Lengkapi nama lokasi, unit/klien terkait, dan alamat atau area penempatan.');
      return;
    }
    if (locMapsUrl.trim() && !isValidMapsUrl(locMapsUrl.trim())) {
      setLocError('Format link Google Maps tidak valid (gunakan URL diawali https://).');
      return;
    }
    const matchedEntity = entities.find((en) => en.name === locEntityName);
    onAddLocation({
      name: locName.trim(),
      entityName: locEntityName,
      category: matchedEntity?.category ?? 'Internal',
      area: locArea.trim() || matchedEntity?.city || '',
      addressOrCoords: locAddress.trim(),
      mapsUrl: locMapsUrl.trim() || undefined,
      radiusMeters: Math.max(25, Number(locRadius) || 100),
      mode: locMode,
      status: 'Aktif',
    });
    setLocName('');
    setLocArea('');
    setLocAddress('');
    setLocMapsUrl('');
    setLocRadius(100);
    setLocError('');
    setShowLocForm(false);
    setSavedNotice(`Titik lokasi absensi "${locName.trim()}" berhasil ditambahkan.`);
  };

  const handleSyncBranches = () => {
    if (!onSyncLocationsFromEntities) return;
    const res = onSyncLocationsFromEntities();
    if (res.addedCount === 0 && res.updatedCount === 0) {
      setSavedNotice(
        'Seluruh cabang penempatan dari menu Unit & Klien sudah tersinkron di daftar lokasi absensi.'
      );
    } else {
      setSavedNotice(
        `Sinkronisasi selesai: +${res.addedCount} cabang lokasi baru ditambahkan dan ${res.updatedCount} lokasi diperbarui dari menu Unit & Klien.`
      );
    }
  };

  const customClientCount = useMemo(
    () =>
      activeClients.filter((client) => {
        const ov = getOverrideForClient(client);
        return !ov.useDefault;
      }).length,
    [activeClients, draft]
  );

  const activeLocationsCount = useMemo(
    () => policy.attendanceLocations.filter((l) => l.status === 'Aktif').length,
    [policy.attendanceLocations]
  );

  const visibleLocations = useMemo(() => {
    if (locationFilterEntity === 'Semua') return policy.attendanceLocations;
    return policy.attendanceLocations.filter((loc) => loc.entityName === locationFilterEntity);
  }, [policy.attendanceLocations, locationFilterEntity]);

  return (
    <div className="space-y-6">
      {/* 3 Top Summary Cards */}
      <section
        aria-label="Ringkasan Kebijakan Presensi"
        data-testid="policy-summary-cards"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#64748B]">
              Kebijakan Standar Perusahaan (Global)
            </p>
            <p className="text-xl font-extrabold text-[#102B69] tabular-nums mt-1">
              {draft.checkInTime} – {draft.checkOutTime} WIB
            </p>
            <p className="text-xs text-[#64748B] mt-1 tabular-nums">
              Toleransi {draft.lateToleranceMinutes} mnt · {draft.workDays} · Cuti{' '}
              {draft.annualLeaveQuota} hari
            </p>
          </div>
          <div className="w-9 h-9 rounded-[4px] bg-[#EAF2FF] text-[#1468E8] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#64748B]">
              Aturan Absensi per Klien Penempatan
            </p>
            <p className="text-xl font-extrabold text-[#1468E8] tabular-nums mt-1">
              {customClientCount} Khusus · {Math.max(0, activeClients.length - customClientCount)}{' '}
              Standar
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Otomatis mengikat jadwal &amp; status Hadir/Telat karyawan per klien
            </p>
          </div>
          <div className="w-9 h-9 rounded-[4px] bg-[#EAF2FF] text-[#102B69] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#64748B]">
              Titik Lokasi &amp; Radius Absensi Aktif
            </p>
            <p className="text-xl font-extrabold text-[#16A36A] tabular-nums mt-1">
              {activeLocationsCount} / {policy.attendanceLocations.length} Lokasi
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Terhubung dengan cabang penempatan di menu Unit &amp; Klien
            </p>
          </div>
          <div className="w-9 h-9 rounded-[4px] bg-[#F0FDF4] text-[#16A36A] flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </section>

      {savedNotice && (
        <div
          role="status"
          data-testid="policy-saved-banner"
          className="px-4 py-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[6px] text-xs font-semibold text-[#065F46] flex items-center justify-between gap-3"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" aria-hidden="true" />
            <span>{savedNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setSavedNotice('')}
            className="text-[11px] font-bold underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Section 1: Attendance Schedule (Global Standard vs Per-Client Override) */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6">
        <div className="mb-6 pb-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">
              Kebijakan Absensi Wajib (Standar Perusahaan &amp; Penyesuaian per Klien)
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Setiap perubahan di bawah ini langsung menjadi aturan wajib saat karyawan melakukan
              Clock-In / Clock-Out di Portal Karyawan.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] text-xs font-semibold text-[#102B69]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
            <span>Otomatis Mengikat Presensi Karyawan</span>
          </span>
        </div>

        <form onSubmit={handleSubmitPolicy} className="space-y-6">
          {/* 1A: Global Standard Work Schedule */}
          <div>
            <h3 className="text-xs font-bold text-[#102B69] uppercase tracking-wider mb-3">
              1. Kebijakan Standar Keseluruhan (Berlaku untuk Unit Internal &amp; Klien yang Mengikuti Standar)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="checkInTime"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Jam Masuk Standar
                </label>
                <input
                  id="checkInTime"
                  type="time"
                  value={draft.checkInTime}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, checkInTime: e.target.value }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="checkOutTime"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Jam Pulang Standar
                </label>
                <input
                  id="checkOutTime"
                  type="time"
                  value={draft.checkOutTime}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, checkOutTime: e.target.value }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="lateTolerance"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Toleransi Keterlambatan (Menit)
                </label>
                <input
                  id="lateTolerance"
                  type="number"
                  min={0}
                  max={60}
                  value={draft.lateToleranceMinutes}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      lateToleranceMinutes: Math.max(0, Number(e.target.value) || 0),
                    }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="workDays"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Pola Hari Kerja Standar
                </label>
                <select
                  id="workDays"
                  value={draft.workDays}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, workDays: e.target.value }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                >
                  <option value="Senin – Jumat">Senin – Jumat (5 Hari Kerja)</option>
                  <option value="Senin – Sabtu">Senin – Sabtu (6 Hari Kerja)</option>
                  <option value="Shift Rotasi 24/7">Shift Rotasi Operasional</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="earlyCheckIn"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Batas Awal Check-In (Menit)
                </label>
                <input
                  id="earlyCheckIn"
                  type="number"
                  min={15}
                  max={180}
                  value={draft.earlyCheckInWindowMinutes}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      earlyCheckInWindowMinutes: Number(e.target.value) || 60,
                    }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="defaultLocationMode"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Mode Lokasi Presensi Standar
                </label>
                <select
                  id="defaultLocationMode"
                  value={draft.defaultLocationMode ?? 'Wajib di Radius Lokasi'}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      defaultLocationMode: e.target.value as AttendanceLocationMode,
                    }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                >
                  <option value="Wajib di Radius Lokasi">Wajib di Radius Lokasi</option>
                  <option value="Fleksibel Lapangan">Fleksibel Lapangan</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="leaveQuota"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Kuota Cuti Tahunan (Hari)
                </label>
                <input
                  id="leaveQuota"
                  type="number"
                  min={1}
                  max={30}
                  value={draft.annualLeaveQuota}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      annualLeaveQuota: Number(e.target.value) || 12,
                    }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="leaveFlow"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Alur Persetujuan Cuti &amp; Izin
                </label>
                <select
                  id="leaveFlow"
                  value={draft.leaveApprovalFlow}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, leaveApprovalFlow: e.target.value }));
                    setSavedNotice('');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                >
                  <option value="Kepala Unit / Koordinator → Admin HR">
                    Kepala Unit / Koordinator → Admin HR
                  </option>
                  <option value="Admin HR Langsung">Admin HR Langsung</option>
                  <option value="Koordinator Klien → Master Admin">
                    Koordinator Klien → Master Admin
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* 1B: Attendance Verification Methods */}
          <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
            <h3 className="text-xs font-bold text-[#102B69] uppercase tracking-wider">
              2. Syarat Keamanan &amp; Verifikasi Presensi Wajib
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-start gap-2.5 p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs text-[#172033] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.requireGpsRadius}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, requireGpsRadius: e.target.checked }));
                    setSavedNotice('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded-[2px] border-[#E2E8F0] text-[#1468E8]"
                />
                <span>Wajib validasi titik cabang penempatan &amp; radius lokasi absensi</span>
              </label>

              <label className="flex items-start gap-2.5 p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs text-[#172033] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.requireSelfie}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, requireSelfie: e.target.checked }));
                    setSavedNotice('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded-[2px] border-[#E2E8F0] text-[#1468E8]"
                />
                <span>Wajib biometrik wajah live (Liveness 3D + Swafoto) saat Clock-In/Out</span>
              </label>

              <label className="flex items-start gap-2.5 p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs text-[#172033] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.enforceStrictDeviceCheck}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      enforceStrictDeviceCheck: e.target.checked,
                    }));
                    setSavedNotice('');
                  }}
                  className="mt-0.5 w-4 h-4 rounded-[2px] border-[#E2E8F0] text-[#1468E8]"
                />
                <span>Kunci presensi pada identitas wajah terdaftar karyawan</span>
              </label>
            </div>
          </div>

          {/* 1C: Adaptive Client-Specific Work Policy Section */}
          {activeClients.length > 0 ? (
            <div className="pt-5 border-t border-[#E2E8F0] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-[#102B69] uppercase tracking-wider">
                    3. Kebijakan Absensi per Klien Penempatan (Standar vs Khusus per Klien)
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Pilih apakah karyawan di masing-masing klien mengikuti{' '}
                    <strong className="text-[#102B69]">Standar Perusahaan</strong> atau{' '}
                    <strong className="text-[#1468E8]">Kebijakan Khusus Klien</strong> (jam masuk,
                    jam pulang, toleransi telat, hari kerja, dan mode lokasi).
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                {activeClients.map((client) => {
                  const override = getOverrideForClient(client);
                  const branchCount = client.supportedPlacements?.length ?? 0;

                  return (
                    <div
                      key={client.id}
                      data-testid={`client-policy-row-${client.code}`}
                      className="p-4 sm:p-5 bg-white hover:bg-[#F5F7FA]/40 transition-colors space-y-3"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-[#102B69]">{client.name}</p>
                            <span
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-[3px] border ${
                                override.useDefault
                                  ? 'bg-[#F5F7FA] text-[#64748B] border-[#E2E8F0]'
                                  : 'bg-[#EAF2FF] text-[#1468E8] border-[#C9DDFB]'
                              }`}
                            >
                              {override.useDefault
                                ? 'Mengikuti Standar Perusahaan'
                                : 'Kebijakan Khusus Klien'}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            Kode: <span className="font-mono font-semibold">{client.code}</span> ·{' '}
                            {client.city} · {branchCount} Cabang Terdaftar
                          </p>
                        </div>

                        {/* Mode Selector: Ikuti Standar vs Atur Khusus Klien */}
                        <div className="inline-flex p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] self-start lg:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => updateClientOverride(client, { useDefault: true })}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap cursor-pointer ${
                              override.useDefault
                                ? 'bg-[#102B69] text-white'
                                : 'text-[#64748B] hover:text-[#102B69]'
                            }`}
                          >
                            Ikuti Standar ({draft.checkInTime}–{draft.checkOutTime})
                          </button>
                          <button
                            type="button"
                            onClick={() => updateClientOverride(client, { useDefault: false })}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap cursor-pointer ${
                              !override.useDefault
                                ? 'bg-[#1468E8] text-white'
                                : 'text-[#64748B] hover:text-[#102B69]'
                            }`}
                          >
                            Atur Khusus Klien Ini
                          </button>
                        </div>
                      </div>

                      {override.useDefault ? (
                        <div className="px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] text-xs text-[#64748B] flex flex-wrap items-center justify-between gap-2 tabular-nums">
                          <span>
                            Karyawan di <strong className="text-[#172033]">{client.name}</strong>{' '}
                            wajib mengikuti jadwal standar:{' '}
                            <strong className="text-[#102B69]">
                              {draft.checkInTime} – {draft.checkOutTime} WIB
                            </strong>{' '}
                            · Toleransi{' '}
                            <strong className="text-[#102B69]">
                              {draft.lateToleranceMinutes} menit
                            </strong>{' '}
                            · {draft.workDays}
                          </span>
                          <span className="text-[11px] font-semibold text-[#16A36A]">
                            Aktif Mengikat
                          </span>
                        </div>
                      ) : (
                        <div className="p-4 bg-[#EAF2FF]/45 border border-[#C9DDFB] rounded-[4px] space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                            <div>
                              <label
                                htmlFor={`client-in-${client.id}`}
                                className="block font-semibold text-[#102B69] mb-1"
                              >
                                Jam Masuk Klien
                              </label>
                              <input
                                id={`client-in-${client.id}`}
                                type="time"
                                aria-label={`Jam masuk ${client.name}`}
                                value={override.checkInTime}
                                onChange={(e) =>
                                  updateClientOverride(client, { checkInTime: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-[4px] tabular-nums text-[#172033]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`client-out-${client.id}`}
                                className="block font-semibold text-[#102B69] mb-1"
                              >
                                Jam Pulang Klien
                              </label>
                              <input
                                id={`client-out-${client.id}`}
                                type="time"
                                aria-label={`Jam pulang ${client.name}`}
                                value={override.checkOutTime}
                                onChange={(e) =>
                                  updateClientOverride(client, { checkOutTime: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-[4px] tabular-nums text-[#172033]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`client-tol-${client.id}`}
                                className="block font-semibold text-[#102B69] mb-1"
                              >
                                Toleransi Telat (Menit)
                              </label>
                              <input
                                id={`client-tol-${client.id}`}
                                type="number"
                                min={0}
                                max={60}
                                aria-label={`Toleransi terlambat ${client.name}`}
                                value={override.lateToleranceMinutes}
                                onChange={(e) =>
                                  updateClientOverride(client, {
                                    lateToleranceMinutes: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-[4px] tabular-nums text-[#172033]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`client-days-${client.id}`}
                                className="block font-semibold text-[#102B69] mb-1"
                              >
                                Pola Hari Kerja Klien
                              </label>
                              <select
                                id={`client-days-${client.id}`}
                                aria-label={`Pola hari kerja ${client.name}`}
                                value={override.workDays ?? draft.workDays}
                                onChange={(e) =>
                                  updateClientOverride(client, { workDays: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033]"
                              >
                                <option value="Senin – Jumat">Senin – Jumat (5 Hari)</option>
                                <option value="Senin – Sabtu">Senin – Sabtu (6 Hari)</option>
                                <option value="Shift Rotasi 24/7">Shift Operasional</option>
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor={`client-locmode-${client.id}`}
                                className="block font-semibold text-[#102B69] mb-1"
                              >
                                Mode Lokasi Presensi
                              </label>
                              <select
                                id={`client-locmode-${client.id}`}
                                aria-label={`Mode lokasi presensi ${client.name}`}
                                value={
                                  override.locationMode ??
                                  draft.defaultLocationMode ??
                                  'Wajib di Radius Lokasi'
                                }
                                onChange={(e) =>
                                  updateClientOverride(client, {
                                    locationMode: e.target.value as AttendanceLocationMode,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033]"
                              >
                                <option value="Wajib di Radius Lokasi">
                                  Wajib di Radius Lokasi
                                </option>
                                <option value="Fleksibel Lapangan">Fleksibel Lapangan</option>
                              </select>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#102B69] font-medium tabular-nums">
                            Aturan Wajib Aktif: Karyawan di <strong>{client.name}</strong> wajib
                            Clock-In maks. pukul <strong>{override.checkInTime} WIB</strong>{' '}
                            (Toleransi <strong>{override.lateToleranceMinutes} menit</strong>, lewat
                            itu otomatis tercatat <strong>Telat</strong>) dan Clock-Out pukul{' '}
                            <strong>{override.checkOutTime} WIB</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs text-[#64748B]">
              <Info className="w-4 h-4 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Penyesuaian jam masuk/pulang per klien akan muncul otomatis apabila perusahaan
                menambahkan Klien Penempatan.
              </span>
            </div>
          )}

          <div className="pt-2 flex justify-end border-t border-[#E2E8F0]">
            <button
              type="submit"
              data-testid="save-policy-submit"
              className="mt-4 px-5 py-2.5 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Simpan Kebijakan Absensi
            </button>
          </div>
        </form>
      </section>

      {/* Section 2: Multi-Location Attendance & Geofencing Radius (Synced with Unit & Klien) */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">
              Titik Lokasi &amp; Radius Absensi (Terhubung Cabang Unit &amp; Klien)
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Daftar titik cabang presensi beserta link Google Maps, radius meter, dan mode
              kehadiran yang wajib dipilih karyawan saat Clock-In / Clock-Out.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Filter lokasi berdasarkan unit atau klien"
              value={locationFilterEntity}
              onChange={(e) => setLocationFilterEntity(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-semibold"
            >
              <option value="Semua">Semua Unit &amp; Klien ({policy.attendanceLocations.length})</option>
              {entities.map((en) => (
                <option key={en.id} value={en.name}>
                  {en.name}
                </option>
              ))}
            </select>

            {onSyncLocationsFromEntities && (
              <button
                type="button"
                data-testid="sync-branches-button"
                onClick={handleSyncBranches}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#EAF2FF] hover:bg-[#D8E8FF] border border-[#C9DDFB] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                <span>Sinkronkan Cabang Unit &amp; Klien</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowLocForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showLocForm ? 'Tutup Form' : 'Tambah Lokasi Absensi'}</span>
            </button>
          </div>
        </div>

        {showLocForm && (
          <form
            onSubmit={handleCreateLocation}
            className="p-6 bg-[#F5F7FA] border-b border-[#E2E8F0] space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="locEntity" className="block text-xs font-semibold text-[#102B69] mb-1">
                  1. Pilih Unit Internal / Klien *
                </label>
                <select
                  id="locEntity"
                  value={locEntityName}
                  onChange={(e) => {
                    setLocEntityName(e.target.value);
                    setLocError('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-medium"
                >
                  {entities.map((en) => (
                    <option key={en.id} value={en.name}>
                      {en.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="locBranchPreset"
                  className="block text-xs font-semibold text-[#102B69] mb-1"
                >
                  2. Ambil Cepat dari Cabang Terdaftar (Opsional)
                </label>
                <select
                  id="locBranchPreset"
                  defaultValue=""
                  onChange={(e) => handleSelectBranchPreset(e.target.value)}
                  disabled={availableBranchesForSelectedEntity.length === 0}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] text-[#172033] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                >
                  <option value="">
                    {availableBranchesForSelectedEntity.length > 0
                      ? `— Pilih dari ${availableBranchesForSelectedEntity.length} cabang ${selectedEntityForForm?.code ?? ''} —`
                      : '— Belum ada cabang terdaftar di klien ini —'}
                  </option>
                  {availableBranchesForSelectedEntity.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="locName" className="block text-xs font-semibold text-[#102B69] mb-1">
                  3. Nama Titik Lokasi / Cabang *
                </label>
                <input
                  id="locName"
                  type="text"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="Contoh: Adira Cabang Bekasi"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px]"
                />
              </div>

              <div>
                <label htmlFor="locAddr" className="block text-xs font-semibold text-[#102B69] mb-1">
                  Alamat / Area Penempatan *
                </label>
                <input
                  id="locAddr"
                  type="text"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="Jl. Ahmad Yani · Area Bekasi"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px]"
                />
              </div>

              <div>
                <label htmlFor="locMapsUrl" className="block text-xs font-semibold text-[#102B69] mb-1">
                  Link Google Maps Lokasi (Opsional)
                </label>
                <input
                  id="locMapsUrl"
                  type="url"
                  value={locMapsUrl}
                  onChange={(e) => setLocMapsUrl(e.target.value)}
                  placeholder="https://www.google.com/maps?q=-6.2383,106.9756"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="locRadius"
                    className="block text-xs font-semibold text-[#102B69] mb-1"
                  >
                    Radius (Meter) *
                  </label>
                  <input
                    id="locRadius"
                    type="number"
                    min={25}
                    max={5000}
                    value={locRadius}
                    onChange={(e) => setLocRadius(Number(e.target.value) || 100)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="locMode"
                    className="block text-xs font-semibold text-[#102B69] mb-1"
                  >
                    Mode Presensi *
                  </label>
                  <select
                    id="locMode"
                    value={locMode}
                    onChange={(e) => setLocMode(e.target.value as AttendanceLocationMode)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                  >
                    <option value="Wajib di Radius Lokasi">Wajib di Radius Lokasi</option>
                    <option value="Fleksibel Lapangan">Fleksibel Lapangan</option>
                  </select>
                </div>
              </div>
            </div>

            {locError && (
              <p role="alert" className="text-xs font-medium text-[#DC3545]">
                {locError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
              >
                Simpan Titik Lokasi
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Titik Cabang Lokasi &amp; Area
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Unit / Klien Terkait
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right"
                >
                  Radius
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Mode Presensi
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Status
                </th>
                <th
                  scope="col"
                  className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {visibleLocations.map((loc) => (
                <tr key={loc.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-start gap-2">
                      <MapPin
                        className="w-4 h-4 text-[#1468E8] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#172033] text-sm">{loc.name}</p>
                          {loc.area && (
                            <span className="text-[11px] font-medium text-[#64748B]">
                              · {loc.area}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B]">{loc.addressOrCoords}</p>
                        {loc.mapsUrl && isValidMapsUrl(loc.mapsUrl) && (
                          <a
                            href={loc.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1468E8] hover:underline mt-0.5"
                          >
                            <span>Lihat Maps Titik Lokasi</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-xs font-semibold text-[#102B69]">{loc.entityName}</p>
                    <p className="text-[11px] text-[#64748B]">{loc.category}</p>
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-[#102B69] text-right tabular-nums whitespace-nowrap">
                    {loc.radiusMeters} m
                  </td>
                  <td className="py-3 px-4 text-xs text-[#172033] whitespace-nowrap">
                    {loc.mode}
                  </td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        loc.status === 'Aktif' ? 'text-[#16A36A]' : 'text-[#DC3545]'
                      }`}
                    >
                      {loc.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right whitespace-nowrap space-x-3">
                    <button
                      type="button"
                      onClick={() => onToggleLocationStatus(loc.id)}
                      className="text-xs font-semibold text-[#1468E8] hover:text-[#102B69] cursor-pointer"
                    >
                      {loc.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveLocation(loc.id)}
                      aria-label={`Hapus lokasi ${loc.name}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#DC3545] hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Hapus</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
