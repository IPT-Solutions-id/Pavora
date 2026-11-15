import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  Edit3,
  ExternalLink,
  Info,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  DepartmentRecord,
  EntityRecord,
  OrganizationScopeCategory,
  SupportedClientPosition,
  SupportedPlacementLocation,
  UserAccountRecord,
} from '../../data/masterAdminData';
import { formatRupiahDot } from '../../utils/pkwtDocument';
import { isValidMapsUrl, parseGoogleMapsUrl } from '../../utils/mapsUrl';
import { PlacementMapPicker } from './PlacementMapPicker';

interface EntitiesPanelProps {
  entities: EntityRecord[];
  departments: DepartmentRecord[];
  users?: UserAccountRecord[];
  onAddEntity: (entity: Omit<EntityRecord, 'id'>) => void;
  onUpdateEntity?: (id: string, entity: Omit<EntityRecord, 'id'>) => void;
  onToggleEntityStatus: (id: string) => void;
  onRemoveClientEntity: (id: string) => void;
  onUpdateUserScope?: (
    userId: string,
    employmentType: 'Internal' | 'Penempatan Klien',
    assignedScopes: string[]
  ) => void;
}

type CategoryFilter = 'Semua' | OrganizationScopeCategory;

interface EntityFormDraft {
  category: OrganizationScopeCategory;
  code: string;
  name: string;
  legalCompanyName: string;
  city: string;
  placementAddress: string;
  lead: string;
  defaultBaseSalary: number;
  status: 'Aktif' | 'Nonaktif';
  employeeCount: number;
  supportedPlacements: SupportedPlacementLocation[];
  supportedPositions: SupportedClientPosition[];
}

function buildEmptyDraft(category: OrganizationScopeCategory = 'Klien Penempatan'): EntityFormDraft {
  return {
    category,
    code: '',
    name: '',
    legalCompanyName: category === 'Internal' ? 'PT. SWAPRO INTERNATIONAL' : '',
    city: '',
    placementAddress: '',
    lead: '',
    defaultBaseSalary: 5396761,
    status: 'Aktif',
    employeeCount: 0,
    supportedPlacements:
      category === 'Klien Penempatan'
        ? [
            {
              id: `plc-${Date.now()}-1`,
              name: '',
              area: '',
              mapsUrl: '',
            },
          ]
        : [],
    supportedPositions: [
      {
        id: `pos-${Date.now()}-1`,
        title: category === 'Klien Penempatan' ? 'Customer Service Cabang' : 'Staff Operasional',
        department: category === 'Klien Penempatan' ? 'Layanan Operasional Cabang' : 'Operasional',
        baseSalary: 5396761,
      },
    ],
  };
}

function fromEntityRecord(entity: EntityRecord): EntityFormDraft {
  return {
    category: entity.category,
    code: entity.code,
    name: entity.name,
    legalCompanyName:
      entity.legalCompanyName ??
      (entity.category === 'Internal' ? 'PT. SWAPRO INTERNATIONAL' : entity.name),
    city: entity.city,
    placementAddress: entity.placementAddress ?? entity.city,
    lead: entity.lead,
    defaultBaseSalary: entity.defaultBaseSalary ?? 5396761,
    status: entity.status,
    employeeCount: entity.employeeCount,
    supportedPlacements:
      entity.supportedPlacements && entity.supportedPlacements.length > 0
        ? entity.supportedPlacements.map((loc) => ({ ...loc }))
        : [],
    supportedPositions:
      entity.supportedPositions && entity.supportedPositions.length > 0
        ? entity.supportedPositions.map((p) => ({ ...p }))
        : [],
  };
}

export const EntitiesPanel: React.FC<EntitiesPanelProps> = ({
  entities,
  departments,
  users = [],
  onAddEntity,
  onUpdateEntity,
  onToggleEntityStatus,
  onRemoveClientEntity,
  onUpdateUserScope,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('Semua');

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EntityFormDraft>(() => buildEmptyDraft('Klien Penempatan'));
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [activeMapPlacementId, setActiveMapPlacementId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');

  const adminUsers = users.filter((u) => u.role === 'Admin');
  const clientEntities = entities.filter((e) => e.category === 'Klien Penempatan');
  const clientCount = clientEntities.length;
  const internalCount = entities.filter((e) => e.category === 'Internal').length;

  const totalSupportedPositionsCount = clientEntities.reduce(
    (sum, e) => sum + (e.supportedPositions?.length ?? 0),
    0
  );
  const totalSupportedPlacementsCount = clientEntities.reduce(
    (sum, e) => sum + (e.supportedPlacements?.length ?? 0),
    0
  );
  const totalClientFilled = clientEntities.reduce((sum, e) => sum + e.employeeCount, 0);

  const filteredEntities = entities.filter((e) => {
    const matchesCategory = categoryFilter === 'Semua' || e.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesPosition = (e.supportedPositions ?? []).some(
      (p) => p.title.toLowerCase().includes(q) || p.department.toLowerCase().includes(q)
    );
    const matchesPlacement = (e.supportedPlacements ?? []).some(
      (loc) => loc.name.toLowerCase().includes(q) || loc.area.toLowerCase().includes(q)
    );
    const matchesQuery =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.lead.toLowerCase().includes(q) ||
      (e.legalCompanyName ?? '').toLowerCase().includes(q) ||
      matchesPosition ||
      matchesPlacement;
    return matchesCategory && matchesQuery;
  });

  const openCreateModal = (defaultCat: OrganizationScopeCategory = 'Klien Penempatan') => {
    setModalMode('create');
    setEditingEntityId(null);
    setDraft(buildEmptyDraft(defaultCat));
    setSelectedAdminIds([]);
    setActiveMapPlacementId(null);
    setFormError('');
  };

  const openEditModal = (entity: EntityRecord) => {
    setModalMode('edit');
    setEditingEntityId(entity.id);
    setDraft(fromEntityRecord(entity));
    const currentAdmins = adminUsers
      .filter((u) => u.assignedScopes.includes(entity.name))
      .map((u) => u.id);
    setSelectedAdminIds(currentAdmins);
    setActiveMapPlacementId(null);
    setFormError('');
  };

  const addSupportedPlacementRow = () => {
    const nextId = `plc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const nextRow: SupportedPlacementLocation = {
      id: nextId,
      name: '',
      area: '',
      mapsUrl: '',
    };
    setDraft((prev) => ({
      ...prev,
      supportedPlacements: [...prev.supportedPlacements, nextRow],
    }));
  };

  const updateSupportedPlacementRow = (
    idx: number,
    patch: Partial<SupportedPlacementLocation>
  ) => {
    setDraft((prev) => ({
      ...prev,
      supportedPlacements: prev.supportedPlacements.map((row, i) =>
        i === idx ? { ...row, ...patch } : row
      ),
    }));
  };

  const handlePlacementMapsUrlChange = (idx: number, nextUrl: string) => {
    const extracted = parseGoogleMapsUrl(nextUrl);
    updateSupportedPlacementRow(idx, {
      mapsUrl: nextUrl,
      ...(extracted ? { lat: extracted.lat, lng: extracted.lng } : {}),
    });
  };

  const removeSupportedPlacementRow = (idx: number) => {
    const row = draft.supportedPlacements[idx];
    if (row && activeMapPlacementId === row.id) {
      setActiveMapPlacementId(null);
    }
    setDraft((prev) => ({
      ...prev,
      supportedPlacements: prev.supportedPlacements.filter((_, i) => i !== idx),
    }));
  };

  const addSupportedPositionRow = () => {
    const nextRow: SupportedClientPosition = {
      id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: '',
      department: '',
      baseSalary: draft.defaultBaseSalary || 5350000,
    };
    setDraft((prev) => ({
      ...prev,
      supportedPositions: [...prev.supportedPositions, nextRow],
    }));
  };

  const updateSupportedPositionRow = (
    idx: number,
    patch: Partial<SupportedClientPosition>
  ) => {
    setDraft((prev) => ({
      ...prev,
      supportedPositions: prev.supportedPositions.map((row, i) =>
        i === idx ? { ...row, ...patch } : row
      ),
    }));
  };

  const removeSupportedPositionRow = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      supportedPositions: prev.supportedPositions.filter((_, i) => i !== idx),
    }));
  };

  const toggleAdminSelection = (adminId: string) => {
    setSelectedAdminIds((prev) =>
      prev.includes(adminId) ? prev.filter((id) => id !== adminId) : [...prev, adminId]
    );
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.code.trim() || !draft.name.trim() || !draft.city.trim() || !draft.lead.trim()) {
      setFormError('Lengkapi Kode, Nama Klien/Unit, Kota/Area, dan PIC/Koordinator.');
      return;
    }

    const cleanedPlacements = draft.supportedPlacements
      .filter((loc) => loc.name.trim().length > 0 || loc.area.trim().length > 0 || loc.mapsUrl.trim().length > 0)
      .map((loc) => {
        const parsedCoords = parseGoogleMapsUrl(loc.mapsUrl);
        return {
          ...loc,
          name: loc.name.trim() || 'Cabang Penempatan',
          area: loc.area.trim(),
          mapsUrl: loc.mapsUrl.trim(),
          lat: loc.lat ?? parsedCoords?.lat,
          lng: loc.lng ?? parsedCoords?.lng,
        };
      });

    const cleanedPositions = draft.supportedPositions
      .filter((p) => p.title.trim().length > 0)
      .map((p) => ({
        id: p.id,
        title: p.title.trim(),
        department: p.department.trim() || 'Operasional',
        baseSalary: Math.max(0, Number(p.baseSalary) || draft.defaultBaseSalary || 5000000),
      }));

    const payload: Omit<EntityRecord, 'id'> = {
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
      category: draft.category,
      city: draft.city.trim(),
      lead: draft.lead.trim(),
      employeeCount: draft.employeeCount,
      departmentCount: Math.max(1, new Set(cleanedPositions.map((p) => p.department)).size || 1),
      status: draft.status,
      legalCompanyName:
        draft.legalCompanyName.trim() ||
        (draft.category === 'Internal' ? 'PT. SWAPRO INTERNATIONAL' : draft.name.trim()),
      placementAddress: draft.placementAddress.trim() || draft.city.trim(),
      defaultBaseSalary: Math.max(0, Number(draft.defaultBaseSalary) || 5350000),
      supportedPlacements: cleanedPlacements,
      supportedPositions: cleanedPositions,
    };

    if (modalMode === 'edit' && editingEntityId && onUpdateEntity) {
      onUpdateEntity(editingEntityId, payload);
      setFeedbackNotice(
        `Pengaturan ${payload.name} beserta ${cleanedPositions.length} posisi yang disupport berhasil diperbarui.`
      );
    } else {
      onAddEntity(payload);
      setFeedbackNotice(
        `${payload.category === 'Klien Penempatan' ? 'Mitra Klien' : 'Unit Internal'} "${payload.name}" (${cleanedPositions.length} posisi disupport) berhasil ditambahkan.`
      );
    }

    // Sync assigned Admin HR scopes if onUpdateUserScope is provided
    if (onUpdateUserScope && adminUsers.length > 0) {
      adminUsers.forEach((adm) => {
        const shouldHaveScope = selectedAdminIds.includes(adm.id);
        const currentlyHasScope = adm.assignedScopes.includes(payload.name);
        if (shouldHaveScope && !currentlyHasScope) {
          onUpdateUserScope(adm.id, adm.employmentType, [...adm.assignedScopes, payload.name]);
        } else if (!shouldHaveScope && currentlyHasScope && modalMode === 'edit') {
          const nextScopes = adm.assignedScopes.filter((s) => s !== payload.name);
          if (nextScopes.length > 0) {
            onUpdateUserScope(adm.id, adm.employmentType, nextScopes);
          }
        }
      });
    }

    setModalMode(null);
    setEditingEntityId(null);
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards for Client & Position Management */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B]">Mitra Klien Penempatan</p>
          <p className="text-2xl font-extrabold text-[#102B69] mt-1 tabular-nums">
            {clientCount} Klien
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Terintegrasi ke Lowongan, Onboarding &amp; PKWT
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B]">Posisi Disupport di Klien</p>
          <p className="text-2xl font-extrabold text-[#1468E8] mt-1 tabular-nums">
            {totalSupportedPositionsCount} Posisi
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Siap dipilih otomatis oleh Rekruter &amp; Admin
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B]">Personel Aktif di Klien</p>
          <p className="text-2xl font-extrabold text-[#16A36A] mt-1 tabular-nums">
            {totalClientFilled} Personel
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Tersebar di {totalSupportedPlacementsCount} titik penempatan cabang
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
          <p className="text-xs font-semibold text-[#64748B]">Unit Internal Perusahaan</p>
          <p className="text-2xl font-extrabold text-[#102B69] mt-1 tabular-nums">
            {internalCount} Unit
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Kantor pusat &amp; cabang operasional internal
          </p>
        </div>
      </div>

      {feedbackNotice && (
        <div
          role="status"
          className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] text-xs font-semibold text-[#16A36A] flex items-center justify-between gap-3"
        >
          <span>{feedbackNotice}</span>
          <button
            type="button"
            onClick={() => setFeedbackNotice('')}
            className="text-[#16A36A] hover:underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Adaptive Notice when company has 0 clients */}
      {clientCount === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#EAF2FF] border border-[#C9DDFB] rounded-[6px]">
          <div className="flex items-start gap-2.5 text-xs text-[#102B69] leading-relaxed">
            <Info className="w-4 h-4 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Saat ini perusahaan hanya mengelola <strong>Unit Internal ({internalCount})</strong>{' '}
              tanpa Klien Penempatan. Tambahkan klien mitra beserta daftar posisi yang disupport
              melalui tombol di kanan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal('Klien Penempatan')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tambah Klien Baru</span>
          </button>
        </div>
      )}

      {/* Entities & Clients Master Table */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">
              Manajemen Mitra Klien, Unit Internal &amp; Posisi yang Disupport
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Atur identitas PT klien kerja sama, penempatan &amp; area cabang yang disupport,
              daftar posisi/jabatan beserta standar gaji, dan Admin HR penanggung jawab
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
              {(['Semua', 'Klien Penempatan', 'Internal'] as CategoryFilter[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#1468E8] text-white'
                      : 'text-[#64748B] hover:text-[#102B69]'
                  }`}
                >
                  {cat === 'Internal' ? 'Unit Internal' : cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari klien, cabang, area, posisi..."
                aria-label="Cari unit, klien, lokasi penempatan, atau posisi"
                className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1468E8] w-64"
              />
            </div>

            <button
              type="button"
              onClick={() => openCreateModal('Klien Penempatan')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tambah Klien / Unit</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Klien / Unit &amp; Badan Hukum (PT)
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Penempatan &amp; Posisi yang Disupport
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Area &amp; Admin HR
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B] text-right">
                  Personel Aktif
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
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-[#64748B]">
                    Tidak ada unit internal atau klien yang cocok dengan pencarian saat ini.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((entity) => {
                  const positions = entity.supportedPositions ?? [];
                  const placements = entity.supportedPlacements ?? [];
                  const assignedAdmins = adminUsers.filter((u) =>
                    u.assignedScopes.includes(entity.name)
                  );
                  return (
                    <tr key={entity.id} className="hover:bg-[#F5F7FA]/60 transition-colors align-top">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#102B69] bg-[#EAF2FF] px-2 py-0.5 rounded-[4px] tabular-nums">
                            {entity.code}
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              entity.category === 'Klien Penempatan'
                                ? 'text-[#1468E8]'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {entity.category === 'Internal' ? 'Unit Internal' : 'Klien Penempatan'}
                          </span>
                        </div>
                        <p className="font-bold text-[#102B69] text-sm mt-1">{entity.name}</p>
                        {entity.legalCompanyName && (
                          <p className="text-xs font-medium text-[#172033] mt-0.5">
                            {entity.legalCompanyName}
                          </p>
                        )}
                        {entity.defaultBaseSalary && (
                          <p className="text-[11px] text-[#16A36A] font-semibold tabular-nums mt-1">
                            Standar Gaji: {formatRupiahDot(entity.defaultBaseSalary)}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 max-w-md space-y-2">
                        {placements.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {placements.map((loc) => (
                              <div
                                key={loc.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EAF2FF]/70 border border-[#C9DDFB] rounded-[4px] text-xs"
                              >
                                <MapPin
                                  className="w-3 h-3 text-[#1468E8] shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="font-semibold text-[#102B69]">{loc.name}</span>
                                {loc.area && (
                                  <span className="text-[11px] text-[#64748B]">· {loc.area}</span>
                                )}
                                {isValidMapsUrl(loc.mapsUrl) && (
                                  <a
                                    href={loc.mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Buka Google Maps ${loc.name}`}
                                    className="text-[#1468E8] hover:text-[#102B69]"
                                  >
                                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {positions.length === 0 ? (
                          <span className="text-xs text-[#64748B] block">
                            Belum ada posisi spesifik (klik Kelola untuk menambahkan)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {positions.map((pos) => (
                              <div
                                key={pos.id}
                                className="px-2.5 py-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs"
                              >
                                <span className="font-semibold text-[#102B69]">{pos.title}</span>
                                <span className="text-[11px] text-[#64748B] ml-1.5">
                                  ({pos.department})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <p className="font-semibold text-[#172033]">{entity.city}</p>
                        <p className="text-[#64748B] mt-0.5">PIC: {entity.lead}</p>
                        {assignedAdmins.length > 0 && (
                          <p className="text-[11px] text-[#1468E8] font-medium mt-1">
                            Admin HR: {assignedAdmins.map((a) => a.fullName).join(', ')}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-xs text-right tabular-nums whitespace-nowrap">
                        <p className="font-bold text-[#102B69] text-sm">
                          {entity.employeeCount} Personel
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          {positions.length} jabatan · {placements.length} penempatan
                        </p>
                      </td>

                      <td className="py-4 px-4 text-xs whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            entity.status === 'Aktif' ? 'text-[#16A36A]' : 'text-[#64748B]'
                          }`}
                        >
                          {entity.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(entity)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Kelola &amp; Posisi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleEntityStatus(entity.id)}
                            className="px-2 py-1.5 text-xs font-semibold text-[#1468E8] hover:text-[#102B69] cursor-pointer"
                          >
                            {entity.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>

                          {entity.category === 'Klien Penempatan' && (
                            <button
                              type="button"
                              onClick={() => onRemoveClientEntity(entity.id)}
                              aria-label={`Hapus klien ${entity.name}`}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-[#DC3545] hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
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

      {/* Departments & Placement Teams Hierarchy Table */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#102B69]">
            Struktur Departemen &amp; Tim Penempatan
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Pemetaan kepala unit, koordinator klien, dan rentang tingkatan jabatan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Departemen / Tim
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Kategori
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Unit / Klien Induk
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Penanggung Jawab
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Rentang Grade
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Personel
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {departments.map((dep) => (
                <tr key={dep.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                  <td className="py-3 px-6 font-medium text-[#172033]">{dep.name}</td>
                  <td className="py-3 px-4 text-xs text-[#64748B]">
                    {dep.category === 'Internal' ? 'Unit Internal' : 'Klien Penempatan'}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#64748B]">{dep.entityName}</td>
                  <td className="py-3 px-4 text-xs text-[#172033]">{dep.head}</td>
                  <td className="py-3 px-4 text-xs text-[#64748B] tabular-nums">{dep.gradeRange}</td>
                  <td className="py-3 px-6 text-xs font-semibold text-[#102B69] text-right tabular-nums">
                    {dep.headcount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Tambah / Edit Klien & Posisi yang Disupport */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="entity-client-modal-title"
        >
          <form
            onSubmit={handleSaveModal}
            noValidate
            className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[4px] bg-[#102B69] text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="entity-client-modal-title" className="text-base font-bold text-[#102B69]">
                    {modalMode === 'edit'
                      ? `Kelola Pengaturan & Posisi — ${draft.name}`
                      : 'Tambah Mitra Klien / Unit Internal Baru'}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Pengaturan ini otomatis terhubung ke Lowongan Rekruter, Penugasan Admin HR,
                    dan Daftar Posisi &amp; Penempatan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                aria-label="Tutup modal klien"
                className="p-1.5 text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-[#DC3545] font-semibold"
                >
                  {formError}
                </div>
              )}

              {/* Bagian 1: Identitas Klien / Unit & Badan Hukum */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#102B69] pb-1.5 border-b border-[#E2E8F0]">
                  01. Identitas Klien / Unit &amp; Badan Hukum
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-[#172033] mb-1">Kategori *</label>
                    <select
                      value={draft.category}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          category: e.target.value as OrganizationScopeCategory,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-semibold"
                    >
                      <option value="Klien Penempatan">Klien Penempatan (Mitra Outsourcing)</option>
                      <option value="Internal">Unit Internal Perusahaan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#172033] mb-1">
                      Kode Klien / Unit *
                    </label>
                    <input
                      type="text"
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                      placeholder={draft.category === 'Klien Penempatan' ? 'CLN-BCAF' : 'INT-MDN'}
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#172033] mb-1">
                      Kota / Area Operasional *
                    </label>
                    <input
                      type="text"
                      value={draft.city}
                      onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                      placeholder="Contoh: Jakarta Selatan & Jabodetabek"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#172033] mb-1">
                      {draft.category === 'Klien Penempatan'
                        ? 'Nama Klien / Proyek Penempatan *'
                        : 'Nama Unit Internal *'}
                    </label>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder={
                        draft.category === 'Klien Penempatan'
                          ? 'Contoh: BCA Finance — Operasional Cabang'
                          : 'Contoh: Cabang Operasional Medan'
                      }
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#172033] mb-1">
                      PIC / Koordinator Lapangan *
                    </label>
                    <input
                      type="text"
                      value={draft.lead}
                      onChange={(e) => setDraft({ ...draft, lead: e.target.value })}
                      placeholder="Nama Koordinator / PIC"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#172033] mb-1">
                      Nama Resmi PT Klien (Badan Hukum)
                    </label>
                    <input
                      type="text"
                      value={draft.legalCompanyName}
                      onChange={(e) => setDraft({ ...draft, legalCompanyName: e.target.value })}
                      placeholder="Contoh: PT BCA Finance"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#172033] mb-1">
                      Standar Gaji Pokok Default (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={draft.defaultBaseSalary}
                      onChange={(e) =>
                        setDraft({ ...draft, defaultBaseSalary: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-[#172033] mb-1">
                      Alamat Lengkap Lokasi Penempatan
                    </label>
                    <input
                      type="text"
                      value={draft.placementAddress}
                      onChange={(e) => setDraft({ ...draft, placementAddress: e.target.value })}
                      placeholder="Contoh: Wisma BCA Pondok Indah Jl. Metro Pondok Indah No. 10, Jakarta Selatan"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 2: Penempatan yang Disupport & Lokasi Maps */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <h3 className="text-xs font-bold text-[#102B69]">
                      02. Penempatan yang Disupport &amp; Lokasi Google Maps
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addSupportedPlacementRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tambah Penempatan</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#64748B]">
                  Tambahkan cabang/lokasi penempatan yang disupport oleh klien ini (contoh:{' '}
                  <strong>Adira Tebet</strong>), ketik <strong>Area</strong> secara manual (contoh:{' '}
                  <strong>Jabodetabek</strong>), lalu <strong>tempel (paste) Link Google Maps</strong>{' '}
                  atau tandai titiknya melalui <strong>Peta Interaktif</strong>.
                </p>

                {draft.supportedPlacements.length === 0 ? (
                  <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-center text-[#64748B]">
                    Belum ada cabang penempatan ditambahkan. Klik{' '}
                    <strong>Tambah Penempatan</strong> di kanan atas untuk menambahkan lokasi
                    cabang.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.supportedPlacements.map((loc, idx) => {
                      const isMapOpen = activeMapPlacementId === loc.id;
                      const validLink = isValidMapsUrl(loc.mapsUrl);
                      const hasCoords =
                        typeof loc.lat === 'number' &&
                        typeof loc.lng === 'number' &&
                        Number.isFinite(loc.lat) &&
                        Number.isFinite(loc.lng);
                      return (
                        <div
                          key={loc.id}
                          className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-2.5"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                            <div className="sm:col-span-4">
                              <label className="block text-[11px] font-semibold text-[#172033] mb-1">
                                Nama Penempatan / Cabang
                              </label>
                              <input
                                type="text"
                                value={loc.name}
                                onChange={(e) =>
                                  updateSupportedPlacementRow(idx, { name: e.target.value })
                                }
                                placeholder="Contoh: Adira Tebet"
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-semibold text-[#172033] mb-1">
                                Area (Ketik Manual)
                              </label>
                              <input
                                type="text"
                                value={loc.area}
                                onChange={(e) =>
                                  updateSupportedPlacementRow(idx, { area: e.target.value })
                                }
                                placeholder="Contoh: Jabodetabek"
                                className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                              />
                            </div>

                            <div className="sm:col-span-5 flex items-end gap-2">
                              <div className="flex-1 min-w-0">
                                <label className="block text-[11px] font-semibold text-[#172033] mb-1">
                                  Link Google Maps
                                </label>
                                <input
                                  type="text"
                                  value={loc.mapsUrl}
                                  onChange={(e) =>
                                    handlePlacementMapsUrlChange(idx, e.target.value)
                                  }
                                  placeholder="Paste link Google Maps atau pilih di peta"
                                  className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMapPlacementId(isMapOpen ? null : loc.id)
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer ${
                                  isMapOpen
                                    ? 'bg-[#102B69] text-white border-[#102B69]'
                                    : 'bg-white text-[#1468E8] border-[#C9DDFB] hover:bg-[#EAF2FF]'
                                }`}
                              >
                                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{isMapOpen ? 'Tutup Peta' : 'Peta Interaktif'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => removeSupportedPlacementRow(idx)}
                                aria-label={`Hapus penempatan ${loc.name || idx + 1}`}
                                className="p-2 text-[#DC3545] hover:bg-[#FEF2F2] rounded-[4px] shrink-0 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {(hasCoords || validLink) && (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                              <span className="tabular-nums">
                                {hasCoords
                                  ? `Koordinat tersimpan: ${loc.lat?.toFixed(6)}, ${loc.lng?.toFixed(6)}`
                                  : 'Tautan Google Maps terpasang'}
                              </span>
                              {validLink && (
                                <a
                                  href={loc.mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-[#1468E8] hover:underline"
                                >
                                  <span>Buka Lokasi di Google Maps</span>
                                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          )}

                          {isMapOpen && (
                            <PlacementMapPicker
                              placementName={loc.name}
                              areaLabel={loc.area}
                              lat={loc.lat}
                              lng={loc.lng}
                              mapsUrl={loc.mapsUrl}
                              onSelectCoordinates={(nextLat, nextLng, generatedUrl) =>
                                updateSupportedPlacementRow(idx, {
                                  lat: nextLat,
                                  lng: nextLng,
                                  mapsUrl: generatedUrl,
                                })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bagian 3: Daftar Posisi / Jabatan yang Disupport */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <h3 className="text-xs font-bold text-[#102B69]">
                      03. Daftar Posisi / Jabatan yang Disupport pada{' '}
                      {draft.category === 'Klien Penempatan' ? 'Klien' : 'Unit'} Ini
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addSupportedPositionRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tambah Posisi Disupport</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#64748B]">
                  Daftar posisi di bawah ini akan otomatis muncul sebagai pilihan cepat saat{' '}
                  <strong>Rekruter membuka Lowongan</strong> (jumlah kuota kebutuhan SDM diisi oleh
                  Rekruter saat lowongan dibuka) maupun saat <strong>Admin menambahkan Karyawan</strong>{' '}
                  untuk klien ini.
                </p>

                {draft.supportedPositions.length === 0 ? (
                  <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-center text-[#64748B]">
                    Belum ada posisi yang ditambahkan. Klik <strong>Tambah Posisi Disupport</strong>{' '}
                    di kanan atas.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {draft.supportedPositions.map((pos, idx) => (
                      <div
                        key={pos.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] items-end"
                      >
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold text-[#172033] mb-1">
                            Nama Posisi / Jabatan *
                          </label>
                          <input
                            type="text"
                            value={pos.title}
                            onChange={(e) =>
                              updateSupportedPositionRow(idx, { title: e.target.value })
                            }
                            placeholder="Contoh: Field Collection Officer"
                            className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-[#172033] mb-1">
                            Bagian / Divisi Penempatan
                          </label>
                          <input
                            type="text"
                            value={pos.department}
                            onChange={(e) =>
                              updateSupportedPositionRow(idx, { department: e.target.value })
                            }
                            placeholder="Contoh: Collection & Recovery"
                            className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[#172033] mb-1">
                            Gaji Pokok (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={pos.baseSalary}
                            onChange={(e) =>
                              updateSupportedPositionRow(idx, {
                                baseSalary: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] tabular-nums"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeSupportedPositionRow(idx)}
                            aria-label={`Hapus posisi ${pos.title}`}
                            className="p-2 text-[#DC3545] hover:bg-[#FEF2F2] rounded-[4px] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bagian 4: Penugasan Admin HR Penanggung Jawab */}
              {adminUsers.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[#E2E8F0]">
                    <Users className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <h3 className="text-xs font-bold text-[#102B69]">
                      04. Penugasan Admin HR yang Memegang Cakupan Klien/Unit Ini
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {adminUsers.map((adm) => {
                      const checked = selectedAdminIds.includes(adm.id);
                      return (
                        <label
                          key={adm.id}
                          className={`flex items-start gap-2.5 p-3 border rounded-[4px] cursor-pointer transition-colors ${
                            checked
                              ? 'bg-[#EAF2FF] border-[#1468E8]'
                              : 'bg-[#F5F7FA] border-[#E2E8F0]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAdminSelection(adm.id)}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="font-bold text-[#102B69]">
                              {adm.fullName} ({adm.employeeCode})
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              Cakupan saat ini: {adm.assignedScopes.join(', ')}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
              >
                {modalMode === 'edit' ? 'Simpan Pengaturan & Posisi' : 'Simpan Klien & Posisi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
