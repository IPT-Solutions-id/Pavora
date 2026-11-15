import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  History,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ContractHistoryItem,
  DOCUMENT_CHECKLIST_ITEMS,
  DepartmentRecord,
  EmployeeFormInput,
  EmployeeRecord,
  EntityRecord,
  FamilyMemberRecord,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  countUploadedDocuments,
  formatIndonesianDate,
  getContractEocIndicator,
  validateEmployeeInput,
} from '../../data/masterAdminData';
import { isValidMapsUrl } from '../../utils/mapsUrl';

interface EmployeeModalProps {
  mode: 'view' | 'create' | 'edit';
  employee: EmployeeRecord | null;
  entities: EntityRecord[];
  departments: DepartmentRecord[];
  prefill?: Partial<EmployeeFormInput>;
  onClose: () => void;
  onSwitchToEdit: () => void;
  onSave: (data: EmployeeFormInput, existingId?: string) => void;
  onOpenPkwt?: (employee: EmployeeRecord, historyItem?: ContractHistoryItem) => void;
  onResetFaceBiometric?: (employee: EmployeeRecord) => void;
  onMarkReviewed?: (employee: EmployeeRecord) => void;
  onAddContractHistory?: (
    employeeId: string,
    entry: Omit<ContractHistoryItem, 'id'>,
    makeActiveContract: boolean
  ) => void;
}

function buildEmptyForm(entities: EntityRecord[]): EmployeeFormInput {
  const activeEntities = entities.filter((e) => e.status === 'Aktif');
  const firstEntity = activeEntities[0] ?? entities[0];
  return {
    employeeCode: '',
    fullName: '',
    email: '',
    whatsappNumber: '',
    position: '',
    department: '',
    employmentType: firstEntity?.category === 'Klien Penempatan' ? 'Penempatan Klien' : 'Internal',
    entityName: firstEntity?.name ?? 'Kantor Pusat Operasional',
    contractType: 'PKWT',
    contractNumber: '',
    joinDate: '2026-11-12',
    contractEndDate: '2027-11-11',
    status: 'Aktif',
    nik: '',
    birthPlace: '',
    birthDate: '1998-01-01',
    gender: 'Laki-laki',
    religion: 'Islam',
    maritalStatus: 'Belum Kawin',
    bloodType: 'O',
    education: 'S1',
    npwpNumber: '',
    bpjsKesehatanNumber: '',
    bpjsKetenagakerjaanNumber: '',
    ktpAddress: {
      street: '',
      rtRw: '',
      kelurahan: '',
      kecamatan: '',
      city: '',
      province: '',
      postalCode: '',
    },
    domicileSameAsKtp: true,
    domicileAddress: '',
    kkNumber: '',
    headOfFamily: '',
    familyMembers: [],
    emergencyContact: {
      name: '',
      relation: 'Orang Tua',
      phone: '',
    },
    bankName: 'BCA',
    bankAccountNumber: '',
    bankAccountHolder: '',
    bankBranch: '',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: true,
      simUploaded: false,
      ijazahUploaded: true,
      sertifikatUploaded: false,
      passFotoUploaded: true,
      skckUploaded: true,
      transkripNilaiUploaded: true,
      bankBookUploaded: true,
      contractUploaded: true,
    },
  };
}

function fromEmployee(emp: EmployeeRecord): EmployeeFormInput {
  return {
    ...emp,
    ktpAddress: { ...emp.ktpAddress },
    familyMembers: emp.familyMembers.map((m) => ({ ...m })),
    emergencyContact: { ...emp.emergencyContact },
    documents: { ...emp.documents },
  };
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  mode,
  employee,
  entities,
  departments,
  prefill,
  onClose,
  onSwitchToEdit,
  onSave,
  onOpenPkwt,
  onResetFaceBiometric,
  onMarkReviewed,
  onAddContractHistory,
}) => {
  const [form, setForm] = useState<EmployeeFormInput>(() => {
    if (mode === 'edit' && employee) return fromEmployee(employee);
    const base = buildEmptyForm(entities);
    const merged = prefill ? { ...base, ...prefill } : base;
    const matchedEnt = entities.find((e) => e.name === merged.entityName);
    const firstPos = matchedEnt?.supportedPositions?.[0];
    const firstLoc = matchedEnt?.supportedPlacements?.[0];
    return {
      ...merged,
      position: merged.position || firstPos?.title || '',
      department: merged.department || firstPos?.department || '',
      salaryMonthly: merged.salaryMonthly ?? firstPos?.baseSalary ?? matchedEnt?.defaultBaseSalary,
      placementId: merged.placementId ?? firstLoc?.id,
      placementName: merged.placementName ?? firstLoc?.name ?? '',
      placementArea: merged.placementArea ?? firstLoc?.area ?? '',
      placementMapsUrl: merged.placementMapsUrl ?? firstLoc?.mapsUrl ?? '',
      placementLocation:
        merged.placementLocation ??
        firstLoc?.name ??
        matchedEnt?.placementAddress ??
        matchedEnt?.city ??
        '',
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Section 06 contract history / manual upload form state (View mode)
  const [showAddHistoryForm, setShowAddHistoryForm] = useState(false);
  const [histSeqLabel, setHistSeqLabel] = useState(() => {
    const count = employee?.contractHistory?.length ?? 0;
    return `PKWT Ke-${count + 1}`;
  });
  const [histContractType, setHistContractType] = useState<'PKWT' | 'PKWTT'>('PKWT');
  const [histContractNumber, setHistContractNumber] = useState('');
  const [histStartDate, setHistStartDate] = useState('2026-11-12');
  const [histEndDate, setHistEndDate] = useState('2027-11-11');
  const [histSignatureStatus, setHistSignatureStatus] = useState<
    ContractHistoryItem['signatureStatus']
  >('Sudah Upload TTD Manual');
  const [histNotes, setHistNotes] = useState('');
  const [histFileName, setHistFileName] = useState('');
  const [histFileDataUrl, setHistFileDataUrl] = useState('');
  const [histMakeActive, setHistMakeActive] = useState(true);
  const [histError, setHistError] = useState('');

  const activeEntities = entities.filter((e) => e.status === 'Aktif');
  const entityOptions = activeEntities.length > 0 ? activeEntities : entities;

  const selectedEntityRecord = entities.find((e) => e.name === form.entityName);
  const entitySupportedPositions = selectedEntityRecord?.supportedPositions ?? [];
  const entitySupportedPlacements = selectedEntityRecord?.supportedPlacements ?? [];

  const handleEntityChange = (nextEntityName: string) => {
    const matched = entities.find((e) => e.name === nextEntityName);
    const firstPos = matched?.supportedPositions?.[0];
    const firstLoc = matched?.supportedPlacements?.[0];
    setForm((prev) => ({
      ...prev,
      entityName: nextEntityName,
      employmentType:
        matched?.category === 'Klien Penempatan' ? 'Penempatan Klien' : 'Internal',
      position: firstPos?.title || '',
      department: firstPos?.department || '',
      salaryMonthly: firstPos?.baseSalary ?? matched?.defaultBaseSalary,
      placementId: firstLoc?.id ?? '',
      placementName: firstLoc?.name ?? '',
      placementArea: firstLoc?.area ?? '',
      placementMapsUrl: firstLoc?.mapsUrl ?? '',
      placementLocation:
        firstLoc?.name || matched?.placementAddress || matched?.city || '',
    }));
  };

  const handleHistoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      setHistError('Ukuran file maksimal 800 KB agar penyimpanan aman.');
      return;
    }
    setHistError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setHistFileName(file.name);
        setHistFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !onAddContractHistory) return;
    if (!histSeqLabel.trim() || !histContractNumber.trim() || !histStartDate.trim()) {
      setHistError('Label periode, nomor kontrak, dan tanggal mulai wajib diisi.');
      return;
    }
    if (histContractType === 'PKWT' && !histEndDate.trim()) {
      setHistError('Tanggal berakhir (EOC) wajib diisi untuk periode PKWT.');
      return;
    }
    if (histContractType === 'PKWT' && histEndDate < histStartDate) {
      setHistError('Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.');
      return;
    }
    setHistError('');
    onAddContractHistory(
      employee.id,
      {
        sequenceLabel: histSeqLabel.trim(),
        contractType: histContractType,
        contractNumber: histContractNumber.trim(),
        startDate: histStartDate,
        endDate: histContractType === 'PKWTT' ? '' : histEndDate,
        entityName: employee.entityName,
        placementName: employee.placementName || employee.placementLocation,
        placementArea: employee.placementArea,
        placementMapsUrl: employee.placementMapsUrl,
        position: employee.position,
        signatureStatus: histSignatureStatus,
        signedAt:
          histSignatureStatus === 'Sudah Upload TTD Manual' || histFileDataUrl
            ? formatIndonesianDate(histStartDate)
            : undefined,
        signerEmployeeName: employee.fullName,
        uploadedSignedFileName: histFileName || undefined,
        uploadedSignedFileDataUrl: histFileDataUrl || undefined,
        notes: histNotes.trim() || undefined,
      },
      histMakeActive
    );
    setShowAddHistoryForm(false);
    setHistContractNumber('');
    setHistNotes('');
    setHistFileName('');
    setHistFileDataUrl('');
  };

  const addFamilyMemberRow = () => {
    const nextRow: FamilyMemberRecord = {
      id: `fam-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: '',
      relation: 'Anak',
      birthDate: '2020-01-01',
      nik: '',
    };
    setForm((prev) => ({
      ...prev,
      familyMembers: [...prev.familyMembers, nextRow],
    }));
  };

  const updateFamilyMember = (
    idx: number,
    patch: Partial<FamilyMemberRecord>
  ) => {
    setForm((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

  const removeFamilyMember = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const compiledDomicile = form.domicileSameAsKtp
      ? `${form.ktpAddress.street}${form.ktpAddress.rtRw ? `, RT/RW ${form.ktpAddress.rtRw}` : ''}${form.ktpAddress.kelurahan ? `, ${form.ktpAddress.kelurahan}` : ''}${form.ktpAddress.city ? `, ${form.ktpAddress.city}` : ''}`
      : form.domicileAddress;

    const payload: EmployeeFormInput = {
      ...form,
      contractEndDate: form.contractType === 'PKWTT' ? '' : form.contractEndDate,
      domicileAddress: compiledDomicile,
      familyMembers: form.familyMembers.filter((m) => m.name.trim().length > 0),
    };

    const result = validateEmployeeInput(payload);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    onSave(payload, mode === 'edit' && employee ? employee.id : undefined);
  };

  if (mode === 'view' && employee) {
    const eocIndicator = getContractEocIndicator(employee.contractType, employee.contractEndDate);
    const waShareUrl = buildEmployeeWhatsappUrl(employee, 'account-pkwt');
    const emailShareUrl = buildEmployeeMailtoUrl(employee, 'account-pkwt');
    const historyItems = employee.contractHistory ?? [];

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-detail-title"
      >
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4 bg-[#F5F7FA] shrink-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-[#64748B] tabular-nums">
                  NIK: {employee.employeeCode} · {employee.employmentType} · {employee.contractType}
                </p>
                {employee.isNewHire && (
                  <span className="px-2 py-0.5 text-[11px] font-bold text-[#1468E8] bg-[#EAF2FF] border border-[#C9DDFB] rounded-[3px]">
                    Baru
                  </span>
                )}
                {employee.originApplicantCode && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[3px] tabular-nums">
                    Asal Pelamar: {employee.originApplicantCode}
                  </span>
                )}
              </div>
              <h2
                id="employee-detail-title"
                className="text-lg font-bold text-[#102B69] truncate mt-0.5"
              >
                {employee.fullName}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {employee.isNewHire && onMarkReviewed && (
                <button
                  type="button"
                  onClick={() => onMarkReviewed(employee)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16A36A] bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] rounded-[4px] whitespace-nowrap cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tandai Sudah Ditinjau</span>
                </button>
              )}
              {employee.contractType === 'PKWT' && onOpenPkwt && (
                <button
                  type="button"
                  onClick={() => onOpenPkwt(employee)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cetak PKWT</span>
                </button>
              )}
              <button
                type="button"
                onClick={onSwitchToEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] whitespace-nowrap cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit Data</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup detail karyawan"
                className="p-1.5 text-[#64748B] hover:text-[#102B69] border border-[#E2E8F0] bg-white rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 text-sm">
            {/* Quick account & PKWT sharing bar */}
            <div className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs">
                <p className="font-bold text-[#102B69]">
                  Akses Portal Karyawan (NIK: <span className="font-mono">{employee.employeeCode}</span>)
                </p>
                <p className="text-[#64748B] mt-0.5">
                  Kirim info NIK, email login, dan pengingat tanda tangan PKWT langsung ke karyawan.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16A36A] bg-white hover:bg-[#ECFDF5] border border-[#A7F3D0] rounded-[4px] whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kirim Akun via WA</span>
                </a>
                <a
                  href={emailShareUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kirim Akun via Email</span>
                </a>
              </div>
            </div>

            {/* Section 01: Kepegawaian, Kontak & Kontrak */}
            <section>
              <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0] mb-3">
                01. Kepegawaian, Kontak &amp; Penempatan
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                <div>
                  <dt className="text-[#64748B]">NIK (Nomor Induk Karyawan)</dt>
                  <dd className="font-mono font-bold text-[#102B69] mt-0.5 tabular-nums">
                    {employee.employeeCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Email Aktif</dt>
                  <dd className="mt-0.5 break-all">
                    <a
                      href={buildEmployeeMailtoUrl(employee)}
                      className="font-semibold text-[#1468E8] hover:underline"
                    >
                      {employee.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">No. WhatsApp</dt>
                  <dd className="mt-0.5 tabular-nums">
                    <a
                      href={buildEmployeeWhatsappUrl(employee)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#16A36A] hover:underline"
                    >
                      {employee.whatsappNumber}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Status Kerja</dt>
                  <dd className="font-bold text-[#16A36A] mt-0.5">{employee.status}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Unit / Klien Penempatan</dt>
                  <dd className="font-semibold text-[#102B69] mt-0.5">{employee.entityName}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Cabang / Area Penempatan</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5 flex flex-wrap items-center gap-2">
                    <span>
                      {employee.placementName || employee.placementLocation || '—'}
                      {employee.placementArea ? ` (${employee.placementArea})` : ''}
                    </span>
                    {employee.placementMapsUrl && isValidMapsUrl(employee.placementMapsUrl) && (
                      <a
                        href={employee.placementMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1468E8] hover:underline"
                      >
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        <span>Lihat Maps</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Jabatan &amp; Departemen</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {employee.position}
                    {employee.department ? ` · ${employee.department}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Jenis &amp; Nomor Kontrak</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5 tabular-nums">
                    {employee.contractType} · {employee.contractNumber || 'Belum bernomor'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Tanggal Join &amp; End of Contract (EOC)</dt>
                  <dd className="font-bold text-[#102B69] mt-0.5 tabular-nums flex flex-wrap items-center gap-1.5">
                    <span>
                      {formatIndonesianDate(employee.joinDate)} →{' '}
                      {employee.contractType === 'PKWTT'
                        ? 'Tetap (PKWTT)'
                        : formatIndonesianDate(employee.contractEndDate)}
                    </span>
                    {eocIndicator.isExpiring && (
                      <span
                        className={`px-1.5 py-0.5 text-[11px] font-bold rounded-[3px] border ${
                          eocIndicator.severity === 'danger'
                            ? 'text-[#DC3545] bg-[#FEF2F2] border-[#FECACA]'
                            : 'text-[#B87D00] bg-[#FFFBEB] border-[#FDE68A]'
                        }`}
                      >
                        {eocIndicator.badgeLabel}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Section 02: Data KTP & Domisili */}
            <section>
              <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0] mb-3">
                02. Identitas KTP &amp; Alamat Domisili
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                <div>
                  <dt className="text-[#64748B]">NIK KTP (16 Digit)</dt>
                  <dd className="font-mono font-bold text-[#102B69] mt-0.5 tabular-nums">
                    {employee.nik}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Tempat, Tanggal Lahir</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5 tabular-nums">
                    {employee.birthPlace || '—'}, {formatIndonesianDate(employee.birthDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Jenis Kelamin · Gol. Darah</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {employee.gender} · Gol. {employee.bloodType || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Agama · Status Kawin</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {employee.religion} · {employee.maritalStatus}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Pendidikan Terakhir</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">{employee.education || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">NPWP</dt>
                  <dd className="font-mono font-semibold text-[#172033] mt-0.5 tabular-nums">
                    {employee.npwpNumber || 'Belum diisi'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">No. BPJS Kesehatan (JKN-KIS)</dt>
                  <dd className="font-mono font-semibold text-[#102B69] mt-0.5 tabular-nums">
                    {employee.bpjsKesehatanNumber || 'Belum didaftarkan'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">No. BPJS Ketenagakerjaan (KPJ)</dt>
                  <dd className="font-mono font-semibold text-[#102B69] mt-0.5 tabular-nums">
                    {employee.bpjsKetenagakerjaanNumber || 'Belum didaftarkan'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Biometrik Wajah Presensi</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`font-bold ${
                        employee.faceBiometric?.enrolled ? 'text-[#16A36A]' : 'text-[#B87D00]'
                      }`}
                    >
                      {employee.faceBiometric?.enrolled
                        ? `Terdaftar (${employee.faceBiometric.enrolledAt})`
                        : 'Belum Registrasi Wajah'}
                    </span>
                    {employee.faceBiometric?.enrolled && onResetFaceBiometric && (
                      <button
                        type="button"
                        onClick={() => onResetFaceBiometric(employee)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-[#DC3545] bg-[#FEF2F2] hover:bg-[#FECACA] border border-[#FECACA] rounded-[4px] cursor-pointer"
                      >
                        Reset Wajah
                      </button>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-[#64748B]">Alamat Lengkap Sesuai KTP</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {employee.ktpAddress.street}
                    {employee.ktpAddress.rtRw ? `, RT/RW ${employee.ktpAddress.rtRw}` : ''}
                    {employee.ktpAddress.kelurahan ? `, Kel. ${employee.ktpAddress.kelurahan}` : ''}
                    {employee.ktpAddress.kecamatan ? `, Kec. ${employee.ktpAddress.kecamatan}` : ''}
                    {employee.ktpAddress.city ? `, ${employee.ktpAddress.city}` : ''}
                    {employee.ktpAddress.province ? `, ${employee.ktpAddress.province}` : ''}
                    {employee.ktpAddress.postalCode ? ` ${employee.ktpAddress.postalCode}` : ''}
                  </dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-[#64748B]">Alamat Domisili Saat Ini</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {employee.domicileSameAsKtp
                      ? 'Sama dengan alamat KTP'
                      : employee.domicileAddress || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Section 03: Kartu Keluarga & Kontak Darurat */}
            <section>
              <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0] mb-3">
                03. Kartu Keluarga (KK) &amp; Kontak Darurat
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs mb-4">
                <div>
                  <dt className="text-[#64748B]">Nomor Kartu Keluarga (KK)</dt>
                  <dd className="font-mono font-bold text-[#102B69] mt-0.5 tabular-nums">
                    {employee.kkNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Nama Kepala Keluarga</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">{employee.headOfFamily}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Kontak Darurat</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5 tabular-nums">
                    {employee.emergencyContact.name || '—'} ({employee.emergencyContact.relation}) ·{' '}
                    {employee.emergencyContact.phone || '—'}
                  </dd>
                </div>
              </dl>

              {employee.familyMembers.length > 0 ? (
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-[4px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F5F7FA] border-b border-[#E2E8F0]">
                        <th className="py-2 px-3 font-semibold text-[#64748B]">Anggota Keluarga</th>
                        <th className="py-2 px-3 font-semibold text-[#64748B]">Hubungan</th>
                        <th className="py-2 px-3 font-semibold text-[#64748B]">Tanggal Lahir</th>
                        <th className="py-2 px-3 font-semibold text-[#64748B]">NIK (Opsional)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {employee.familyMembers.map((member) => (
                        <tr key={member.id}>
                          <td className="py-2 px-3 font-semibold text-[#172033]">{member.name}</td>
                          <td className="py-2 px-3 text-[#102B69]">{member.relation}</td>
                          <td className="py-2 px-3 text-[#64748B] tabular-nums">
                            {formatIndonesianDate(member.birthDate)}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#64748B] tabular-nums">
                            {member.nik || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">Belum ada anggota keluarga tambahan tercatat.</p>
              )}
            </section>

            {/* Section 04: Rekening Administratif (Non-Payroll) */}
            <section>
              <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0] mb-3">
                04. Data Rekening Administratif (Non-Payroll)
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-xs">
                <div>
                  <dt className="text-[#64748B]">Nama Bank</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">{employee.bankName}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Nomor Rekening</dt>
                  <dd className="font-mono font-bold text-[#102B69] mt-0.5 tabular-nums">
                    {employee.bankAccountNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Nama Penerima / Pemilik</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {employee.bankAccountHolder}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Cabang Bank</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {employee.bankBranch || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Section 05: Kelengkapan Berkas */}
            <section>
              {(() => {
                const docCount = countUploadedDocuments(employee.documents);
                return (
                  <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0] mb-3">
                    05. Status Kelengkapan Berkas Administrasi ({docCount.completed}/
                    {docCount.total})
                  </h3>
                );
              })()}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                {DOCUMENT_CHECKLIST_ITEMS.map((doc) => {
                  const ok = Boolean(employee.documents[doc.key]);
                  return (
                    <div
                      key={doc.key}
                      className="p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                    >
                      <p className="text-[#64748B]">{doc.label}</p>
                      <p className={`font-bold mt-1 ${ok ? 'text-[#16A36A]' : 'text-[#B87D00]'}`}>
                        {ok ? 'Tersedia' : 'Menunggu Berkas'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 06: Riwayat Kontrak & Arsip PKWT */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0] mb-3">
                <h3 className="text-xs font-bold text-[#102B69] inline-flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                  <span>06. Riwayat Kontrak &amp; Arsip PKWT ({historyItems.length} Periode)</span>
                </h3>
                {onAddContractHistory && (
                  <button
                    type="button"
                    onClick={() => setShowAddHistoryForm((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    <span>{showAddHistoryForm ? 'Tutup Form' : 'Tambah Periode / Upload PKWT'}</span>
                  </button>
                )}
              </div>

              {showAddHistoryForm && onAddContractHistory && (
                <form
                  onSubmit={handleSubmitHistory}
                  className="mb-4 p-4 bg-[#F5F7FA] border border-[#C9DDFB] rounded-[4px] space-y-3 text-xs"
                >
                  <p className="font-bold text-[#102B69]">
                    Catat Periode Kontrak Baru atau Upload Scan PKWT Bertanda Tangan
                  </p>
                  {histError && (
                    <p className="text-[#DC3545] font-semibold bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1.5 rounded-[4px]">
                      {histError}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Periode Kontrak *
                      </label>
                      <input
                        type="text"
                        value={histSeqLabel}
                        onChange={(e) => setHistSeqLabel(e.target.value)}
                        placeholder="PKWT Ke-2"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Jenis Kontrak
                      </label>
                      <select
                        value={histContractType}
                        onChange={(e) =>
                          setHistContractType(e.target.value as 'PKWT' | 'PKWTT')
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      >
                        <option value="PKWT">PKWT</option>
                        <option value="PKWTT">PKWTT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nomor Kontrak *
                      </label>
                      <input
                        type="text"
                        value={histContractNumber}
                        onChange={(e) => setHistContractNumber(e.target.value)}
                        placeholder="PKWT-ADR-2026/002"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Tanggal Mulai *
                      </label>
                      <input
                        type="date"
                        value={histStartDate}
                        onChange={(e) => setHistStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Tanggal Berakhir (EOC)
                      </label>
                      <input
                        type="date"
                        value={histContractType === 'PKWTT' ? '' : histEndDate}
                        disabled={histContractType === 'PKWTT'}
                        onChange={(e) => setHistEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] tabular-nums disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Status Tanda Tangan
                      </label>
                      <select
                        value={histSignatureStatus}
                        onChange={(e) =>
                          setHistSignatureStatus(
                            e.target.value as ContractHistoryItem['signatureStatus']
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      >
                        <option value="Sudah Upload TTD Manual">Sudah Upload TTD Manual</option>
                        <option value="Menunggu TTD Karyawan">Menunggu TTD Karyawan</option>
                        <option value="Sudah TTD Digital">Sudah TTD Digital</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Upload Scan / PDF PKWT Bertanda Tangan (Maks 800 KB)
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-semibold cursor-pointer hover:bg-[#EAF2FF]">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{histFileName || 'Pilih File PDF / Gambar'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg"
                          onChange={handleHistoryFileChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">Catatan</label>
                      <input
                        type="text"
                        value={histNotes}
                        onChange={(e) => setHistNotes(e.target.value)}
                        placeholder="Catatan perpanjangan / upload fisik"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="inline-flex items-center gap-2 text-[#102B69] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={histMakeActive}
                        onChange={(e) => setHistMakeActive(e.target.checked)}
                      />
                      <span>Jadikan kontrak aktif karyawan ini</span>
                    </label>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-[#1468E8] hover:bg-[#102B69] text-white font-semibold rounded-[4px] cursor-pointer"
                    >
                      Simpan Riwayat Kontrak
                    </button>
                  </div>
                </form>
              )}

              {historyItems.length === 0 ? (
                <p className="text-xs text-[#64748B]">
                  Belum ada riwayat PKWT tercatat untuk karyawan ini.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {historyItems.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[#102B69]">{hist.sequenceLabel}</span>
                          <span className="font-mono text-[#64748B] tabular-nums">
                            {hist.contractNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-[3px] border ${
                              hist.signatureStatus === 'Sudah TTD Digital' ||
                              hist.signatureStatus === 'Sudah Upload TTD Manual'
                                ? 'text-[#16A36A] bg-[#ECFDF5] border-[#A7F3D0]'
                                : hist.signatureStatus === 'Menunggu TTD Karyawan'
                                  ? 'text-[#B87D00] bg-[#FFFBEB] border-[#FDE68A]'
                                  : 'text-[#64748B] bg-white border-[#E2E8F0]'
                            }`}
                          >
                            {hist.signatureStatus}
                          </span>
                        </div>
                        <p className="text-[#172033] tabular-nums">
                          Periode: {formatIndonesianDate(hist.startDate)} →{' '}
                          {hist.contractType === 'PKWTT'
                            ? 'Tetap (PKWTT)'
                            : formatIndonesianDate(hist.endDate)}{' '}
                          · {hist.position}
                          {hist.placementName ? ` · ${hist.placementName}` : ''}
                        </p>
                        {(hist.signedAt || hist.notes) && (
                          <p className="text-[11px] text-[#64748B]">
                            {hist.signedAt ? `TTD: ${hist.signedAt}` : ''}
                            {hist.signedAt && hist.notes ? ' · ' : ''}
                            {hist.notes ?? ''}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {hist.employeeSignatureDataUrl && (
                          <img
                            src={hist.employeeSignatureDataUrl}
                            alt={`Tanda tangan ${hist.sequenceLabel}`}
                            className="h-9 w-20 object-contain bg-white border border-[#E2E8F0] rounded-[3px] p-0.5"
                          />
                        )}
                        {hist.uploadedSignedFileDataUrl && (
                          <a
                            href={hist.uploadedSignedFileDataUrl}
                            download={hist.uploadedSignedFileName || `${hist.contractNumber}.pdf`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] whitespace-nowrap"
                          >
                            <Download className="w-3 h-3" aria-hidden="true" />
                            <span>Unduh Arsip</span>
                          </a>
                        )}
                        {onOpenPkwt && hist.contractType === 'PKWT' && (
                          <button
                            type="button"
                            onClick={() => onOpenPkwt(employee, hist)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] whitespace-nowrap cursor-pointer"
                          >
                            <FileText className="w-3 h-3" aria-hidden="true" />
                            <span>Lihat PKWT</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-form-title"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4 bg-[#F5F7FA] shrink-0">
          <div>
            <h2 id="employee-form-title" className="text-lg font-bold text-[#102B69]">
              {mode === 'edit' ? `Edit Data Karyawan — ${employee?.fullName}` : 'Tambah Data Karyawan Baru'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Lengkapi biodata kepegawaian, kontak Email &amp; WhatsApp, KTP, KK, dan rekening
              administratif
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form karyawan"
            className="p-1.5 text-[#64748B] hover:text-[#102B69] border border-[#E2E8F0] bg-white rounded-[4px] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-[#DC3545]"
            >
              <p className="font-bold">Periksa kembali isian formulir:</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                {Object.values(errors).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 01. Kepegawaian, Kontak, Tanggal Join & End of Contract */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
              01. Kepegawaian, Kontak (Email &amp; WhatsApp) &amp; Kontrak
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  NIK (Nomor Induk Karyawan) *
                </label>
                <input
                  type="text"
                  value={form.employeeCode}
                  onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                  placeholder="Contoh: ADR-001"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                {errors.employeeCode && (
                  <p className="text-[#DC3545] mt-1">{errors.employeeCode}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Nama Lengkap (Sesuai KTP) *
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                {errors.fullName && <p className="text-[#DC3545] mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Email Aktif *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nama@perusahaan.co.id"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                {errors.email && <p className="text-[#DC3545] mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  No. WhatsApp Aktif *
                </label>
                <input
                  type="tel"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums"
                />
                {errors.whatsappNumber && (
                  <p className="text-[#DC3545] mt-1">{errors.whatsappNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="emp-modal-entity" className="block font-semibold text-[#172033] mb-1">
                  Unit Internal / Klien Penempatan *
                </label>
                <select
                  id="emp-modal-entity"
                  value={form.entityName}
                  onChange={(e) => handleEntityChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-medium"
                >
                  {entityOptions.map((ent) => (
                    <option key={ent.id} value={ent.name}>
                      {ent.name} ({ent.category === 'Internal' ? 'Internal' : 'Klien'})
                    </option>
                  ))}
                </select>
                {errors.entityName && <p className="text-[#DC3545] mt-1">{errors.entityName}</p>}
              </div>

              <div>
                <label htmlFor="emp-modal-position" className="block font-semibold text-[#172033] mb-1">
                  Jabatan / Posisi *
                </label>
                {entitySupportedPositions.length > 0 ? (
                  <select
                    id="emp-modal-position"
                    value={form.position}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      const matchedPos = entitySupportedPositions.find(
                        (p) => p.title === nextTitle
                      );
                      setForm({
                        ...form,
                        position: nextTitle,
                        department: matchedPos ? matchedPos.department : form.department,
                        salaryMonthly: matchedPos ? matchedPos.baseSalary : form.salaryMonthly,
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-medium"
                  >
                    <option value="">-- Pilih Posisi Terdaftar --</option>
                    {entitySupportedPositions.map((p) => (
                      <option key={p.id} value={p.title}>
                        {p.title} ({p.department})
                      </option>
                    ))}
                    {form.position &&
                      !entitySupportedPositions.some((p) => p.title === form.position) && (
                        <option value={form.position}>{form.position} (Data Lama)</option>
                      )}
                  </select>
                ) : (
                  <input
                    id="emp-modal-position"
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="Isi posisi / jabatan"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                  />
                )}
                {errors.position && <p className="text-[#DC3545] mt-1">{errors.position}</p>}
              </div>

              <div>
                <label htmlFor="emp-modal-placement" className="block font-semibold text-[#172033] mb-1">
                  Penempatan Cabang / Area
                </label>
                {entitySupportedPlacements.length > 0 ? (
                  <select
                    id="emp-modal-placement"
                    value={form.placementId || ''}
                    onChange={(e) => {
                      const loc = entitySupportedPlacements.find((l) => l.id === e.target.value);
                      setForm({
                        ...form,
                        placementId: loc?.id ?? '',
                        placementName: loc?.name ?? '',
                        placementArea: loc?.area ?? '',
                        placementMapsUrl: loc?.mapsUrl ?? '',
                        placementLocation: loc?.name ?? form.placementLocation,
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-medium"
                  >
                    <option value="">-- Pilih Lokasi Cabang / Area --</option>
                    {entitySupportedPlacements.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} · {loc.area}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.placementName ?? form.placementLocation ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        placementName: e.target.value,
                        placementLocation: e.target.value,
                      })
                    }
                    placeholder="Lokasi kerja / cabang penempatan"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                  />
                )}
                {form.placementMapsUrl && isValidMapsUrl(form.placementMapsUrl) && (
                  <a
                    href={form.placementMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1468E8] hover:underline mt-1"
                  >
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    <span>Buka Maps Cabang</span>
                  </a>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Departemen / Tim</label>
                <input
                  type="text"
                  list="pevora-dept-suggestions"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Nama divisi / tim"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                <datalist id="pevora-dept-suggestions">
                  {departments.map((d) => (
                    <option key={d.id} value={d.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Status Karyawan</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as EmployeeFormInput['status'] })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Probation">Probation</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Jenis Kontrak</label>
                <select
                  value={form.contractType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contractType: e.target.value as 'PKWT' | 'PKWTT',
                    })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-medium"
                >
                  <option value="PKWT">PKWT (Kontrak Waktu Tertentu)</option>
                  <option value="PKWTT">PKWTT (Karyawan Tetap)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Nomor Kontrak</label>
                <input
                  type="text"
                  value={form.contractNumber}
                  onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                  placeholder="PKWT-CLN-2026/..."
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Tanggal Join *</label>
                <input
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums"
                />
                {errors.joinDate && <p className="text-[#DC3545] mt-1">{errors.joinDate}</p>}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  End of Contract (EOC) {form.contractType === 'PKWT' ? '*' : ''}
                </label>
                <input
                  type="date"
                  value={form.contractType === 'PKWTT' ? '' : form.contractEndDate}
                  disabled={form.contractType === 'PKWTT'}
                  onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums disabled:opacity-50"
                />
                {form.contractType === 'PKWTT' && (
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Otomatis nonaktif untuk karyawan tetap (PKWTT).
                  </p>
                )}
                {errors.contractEndDate && (
                  <p className="text-[#DC3545] mt-1">{errors.contractEndDate}</p>
                )}
              </div>
            </div>
          </section>

          {/* 02. Data KTP & Domisili */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
              02. Data KTP Lengkap &amp; Domisili
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  NIK KTP (16 Digit) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="16 digit angka"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono text-[#172033]"
                />
                {errors.nik && <p className="text-[#DC3545] mt-1">{errors.nik}</p>}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={form.birthPlace}
                  onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                  placeholder="Kota kelahiran"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Jenis Kelamin</label>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm({ ...form, gender: e.target.value as 'Laki-laki' | 'Perempuan' })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Agama</label>
                <select
                  value={form.religion}
                  onChange={(e) => setForm({ ...form, religion: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Status Pernikahan (KTP)
                </label>
                <select
                  value={form.maritalStatus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maritalStatus: e.target.value as EmployeeFormInput['maritalStatus'],
                    })
                  }
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                >
                  <option value="Belum Kawin">Belum Kawin</option>
                  <option value="Kawin">Kawin</option>
                  <option value="Cerai Hidup">Cerai Hidup</option>
                  <option value="Cerai Mati">Cerai Mati</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Golongan Darah</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                  <option value="-">Tidak Diketahui</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Pendidikan Terakhir
                </label>
                <input
                  type="text"
                  value={form.education}
                  onChange={(e) => setForm({ ...form, education: e.target.value })}
                  placeholder="Contoh: S1 Manajemen"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">NPWP (Opsional)</label>
                <input
                  type="text"
                  value={form.npwpNumber}
                  onChange={(e) => setForm({ ...form, npwpNumber: e.target.value })}
                  placeholder="99.999.999.9-999.000"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  No. BPJS Kesehatan (JKN-KIS)
                </label>
                <input
                  type="text"
                  maxLength={13}
                  value={form.bpjsKesehatanNumber ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bpjsKesehatanNumber: e.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  placeholder="13 digit kartu JKN-KIS"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono text-[#172033]"
                />
                {errors.bpjsKesehatanNumber && (
                  <p className="text-[#DC3545] mt-1">{errors.bpjsKesehatanNumber}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  No. BPJS Ketenagakerjaan (KPJ)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={form.bpjsKetenagakerjaanNumber ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bpjsKetenagakerjaanNumber: e.target.value.replace(/[^A-Za-z0-9]/g, ''),
                    })
                  }
                  placeholder="11–16 karakter nomor KPJ"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono text-[#172033]"
                />
                {errors.bpjsKetenagakerjaanNumber && (
                  <p className="text-[#DC3545] mt-1">{errors.bpjsKetenagakerjaanNumber}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#172033] mb-1">
                  Alamat Jalan Sesuai KTP *
                </label>
                <input
                  type="text"
                  value={form.ktpAddress.street}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ktpAddress: { ...form.ktpAddress, street: e.target.value },
                    })
                  }
                  placeholder="Nama jalan, nomor rumah / blok"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                {errors.ktpStreet && <p className="text-[#DC3545] mt-1">{errors.ktpStreet}</p>}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">RT / RW</label>
                <input
                  type="text"
                  value={form.ktpAddress.rtRw}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ktpAddress: { ...form.ktpAddress, rtRw: e.target.value },
                    })
                  }
                  placeholder="001/002"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Kelurahan / Desa</label>
                <input
                  type="text"
                  value={form.ktpAddress.kelurahan}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ktpAddress: { ...form.ktpAddress, kelurahan: e.target.value },
                    })
                  }
                  placeholder="Kelurahan"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Kecamatan</label>
                <input
                  type="text"
                  value={form.ktpAddress.kecamatan}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ktpAddress: { ...form.ktpAddress, kecamatan: e.target.value },
                    })
                  }
                  placeholder="Kecamatan"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Kota / Kabupaten *</label>
                <input
                  type="text"
                  value={form.ktpAddress.city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ktpAddress: { ...form.ktpAddress, city: e.target.value },
                    })
                  }
                  placeholder="Contoh: Jakarta Selatan"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Provinsi</label>
                <input
                  type="text"
                  value={form.ktpAddress.province}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ktpAddress: { ...form.ktpAddress, province: e.target.value },
                    })
                  }
                  placeholder="Contoh: DKI Jakarta"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Kode Pos</label>
                <input
                  type="text"
                  maxLength={5}
                  value={form.ktpAddress.postalCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ktpAddress: { ...form.ktpAddress, postalCode: e.target.value },
                    })
                  }
                  placeholder="12730"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="inline-flex items-center gap-2 font-semibold text-[#102B69] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.domicileSameAsKtp}
                  onChange={(e) =>
                    setForm({ ...form, domicileSameAsKtp: e.target.checked })
                  }
                />
                <span>Alamat domisili saat ini sama dengan alamat KTP</span>
              </label>
              {!form.domicileSameAsKtp && (
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Alamat Domisili Saat Ini
                  </label>
                  <input
                    type="text"
                    value={form.domicileAddress}
                    onChange={(e) => setForm({ ...form, domicileAddress: e.target.value })}
                    placeholder="Alamat lengkap tempat tinggal saat ini"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 03. Data Kartu Keluarga (KK) & Anggota Keluarga */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-xs font-bold text-[#102B69]">
                03. Data Kartu Keluarga (KK) &amp; Kontak Darurat
              </h3>
              <button
                type="button"
                onClick={addFamilyMemberRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Tambah Anggota KK</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Nomor Kartu Keluarga (16 Digit) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={form.kkNumber}
                  onChange={(e) =>
                    setForm({ ...form, kkNumber: e.target.value.replace(/[^0-9]/g, '') })
                  }
                  placeholder="16 digit nomor KK"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono text-[#172033]"
                />
                {errors.kkNumber && <p className="text-[#DC3545] mt-1">{errors.kkNumber}</p>}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Nama Kepala Keluarga (KK) *
                </label>
                <input
                  type="text"
                  value={form.headOfFamily}
                  onChange={(e) => setForm({ ...form, headOfFamily: e.target.value })}
                  placeholder="Sesuai lembaran KK"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                {errors.headOfFamily && (
                  <p className="text-[#DC3545] mt-1">{errors.headOfFamily}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Kontak Darurat (Nama)
                </label>
                <input
                  type="text"
                  value={form.emergencyContact.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact: { ...form.emergencyContact, name: e.target.value },
                    })
                  }
                  placeholder="Nama keluarga yang dapat dihubungi"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Hubungan Kontak Darurat
                </label>
                <input
                  type="text"
                  value={form.emergencyContact.relation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact: { ...form.emergencyContact, relation: e.target.value },
                    })
                  }
                  placeholder="Istri / Suami / Orang Tua"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Nomor Telepon / WA Darurat
                </label>
                <input
                  type="tel"
                  value={form.emergencyContact.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact: { ...form.emergencyContact, phone: e.target.value },
                    })
                  }
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] tabular-nums"
                />
              </div>
            </div>

            {form.familyMembers.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-[#64748B]">Daftar Anggota Keluarga dalam KK</p>
                {form.familyMembers.map((member, idx) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] items-center"
                  >
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateFamilyMember(idx, { name: e.target.value })}
                        placeholder="Nama anggota keluarga"
                        aria-label={`Nama anggota keluarga ${idx + 1}`}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        value={member.relation}
                        onChange={(e) =>
                          updateFamilyMember(idx, {
                            relation: e.target.value as FamilyMemberRecord['relation'],
                          })
                        }
                        aria-label={`Hubungan anggota keluarga ${idx + 1}`}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      >
                        <option value="Pasangan">Pasangan</option>
                        <option value="Anak">Anak</option>
                        <option value="Orang Tua">Orang Tua</option>
                        <option value="Saudara Kandung">Saudara Kandung</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="date"
                        value={member.birthDate}
                        onChange={(e) => updateFamilyMember(idx, { birthDate: e.target.value })}
                        aria-label={`Tanggal lahir anggota keluarga ${idx + 1}`}
                        className="w-full px-2 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        maxLength={16}
                        value={member.nik ?? ''}
                        onChange={(e) =>
                          updateFamilyMember(idx, { nik: e.target.value.replace(/[^0-9]/g, '') })
                        }
                        placeholder="NIK (opsional)"
                        className="w-full px-2 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                      />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeFamilyMember(idx)}
                        aria-label={`Hapus anggota keluarga ${idx + 1}`}
                        className="p-1.5 text-[#DC3545] hover:bg-white rounded-[4px] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 04. Data Rekening Administratif (Non-Payroll) */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
              04. Data Rekening Bank Administratif (Non-Payroll)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">Nama Bank *</label>
                <input
                  type="text"
                  list="pevora-bank-list"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="BCA / Mandiri / BRI / BNI"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                <datalist id="pevora-bank-list">
                  <option value="BCA" />
                  <option value="Bank Mandiri" />
                  <option value="BRI" />
                  <option value="BNI" />
                  <option value="CIMB Niaga" />
                  <option value="Bank Syariah Indonesia (BSI)" />
                </datalist>
                {errors.bankName && <p className="text-[#DC3545] mt-1">{errors.bankName}</p>}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Nomor Rekening *</label>
                <input
                  type="text"
                  value={form.bankAccountNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bankAccountNumber: e.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  placeholder="8–20 digit nomor rekening"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono text-[#172033]"
                />
                {errors.bankAccountNumber && (
                  <p className="text-[#DC3545] mt-1">{errors.bankAccountNumber}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Nama Penerima / Pemilik Rekening *
                </label>
                <input
                  type="text"
                  value={form.bankAccountHolder}
                  onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })}
                  placeholder="Sesuai buku tabungan"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
                {errors.bankAccountHolder && (
                  <p className="text-[#DC3545] mt-1">{errors.bankAccountHolder}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Cabang Bank (Opsional)
                </label>
                <input
                  type="text"
                  value={form.bankBranch}
                  onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                  placeholder="KCP / KC Cabang"
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                />
              </div>
            </div>
          </section>

          {/* 05. Kelengkapan Berkas */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
              05. Checklist Kelengkapan Dokumen Fisik / Digital (11 Berkas)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {DOCUMENT_CHECKLIST_ITEMS.map((doc) => (
                <label
                  key={doc.key}
                  className="flex items-center gap-2 p-2.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form.documents[doc.key])}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documents: { ...form.documents, [doc.key]: e.target.checked },
                      })
                    }
                  />
                  <span className="font-medium text-[#172033]">{doc.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] hover:bg-[#F5F7FA] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
          >
            {mode === 'edit' ? 'Simpan Perubahan Karyawan' : 'Simpan Karyawan Baru'}
          </button>
        </div>
      </form>
    </div>
  );
};
