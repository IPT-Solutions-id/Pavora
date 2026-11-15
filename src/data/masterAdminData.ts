export type DashboardMenuId =
  | 'overview'
  | 'entities'
  | 'employees'
  | 'users'
  | 'policies'
  | 'monitoring'
  | 'audit'
  | 'settings';

export type AdminMenuId =
  | 'admin-overview'
  | 'admin-employees'
  | 'admin-attendance'
  | 'admin-leave'
  | 'admin-onboarding'
  | 'admin-reports';

export type UserRoleName = 'Master Admin' | 'Admin' | 'Rekruter' | 'Karyawan' | 'Pelamar';

export type OrganizationScopeCategory = 'Internal' | 'Klien Penempatan';

export type EmploymentCategory = 'Internal' | 'Penempatan Klien';

export type AttendanceStatus = 'Hadir' | 'Telat' | 'Cuti' | 'Izin' | 'Alpha';

export interface SupportedClientPosition {
  id: string;
  title: string;
  department: string;
  quota?: number;
  baseSalary: number;
}

export interface SupportedPlacementLocation {
  id: string;
  name: string;
  area: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
}

export interface EntityRecord {
  id: string;
  code: string;
  name: string;
  category: OrganizationScopeCategory;
  city: string;
  lead: string;
  employeeCount: number;
  departmentCount: number;
  status: 'Aktif' | 'Nonaktif';
  placementPeriod?: string;
  legalCompanyName?: string;
  industryLabel?: string;
  placementAddress?: string;
  pksNumber?: string;
  headcountQuota?: number;
  defaultBaseSalary?: number;
  supportedPositions?: SupportedClientPosition[];
  supportedPlacements?: SupportedPlacementLocation[];
}

export interface DepartmentRecord {
  id: string;
  name: string;
  entityName: string;
  category: OrganizationScopeCategory;
  head: string;
  gradeRange: string;
  headcount: number;
}

export interface UserAccountRecord {
  id: string;
  employeeCode: string;
  loginAlias?: string;
  fullName: string;
  email: string;
  whatsappNumber?: string;
  employmentType: EmploymentCategory;
  assignedScopes: string[];
  role: UserRoleName;
  status: 'Aktif' | 'Menunggu Aktivasi' | 'Nonaktif';
  lastActive: string;
  portalPassword?: string;
}

export interface ApprovalRequestRecord {
  id: string;
  title: string;
  requester: string;
  requesterRole: UserRoleName;
  entityName: string;
  category: 'Struktur' | 'Rekrutmen' | 'Akses Akun' | 'Kebijakan' | 'Penempatan Klien';
  submittedAt: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
}

export interface OperationalSnapshot {
  id: string;
  entityName: string;
  category: OrganizationScopeCategory;
  attendanceRate: string;
  onLeaveToday: number;
  expiringContracts: number;
  openPositions: number;
  activeCandidates: number;
}

export type AttendanceLocationMode = 'Wajib di Radius Lokasi' | 'Fleksibel Lapangan';

export interface AttendanceLocationRecord {
  id: string;
  name: string;
  entityName: string;
  category: OrganizationScopeCategory;
  addressOrCoords: string;
  area?: string;
  mapsUrl?: string;
  radiusMeters: number;
  mode: AttendanceLocationMode;
  status: 'Aktif' | 'Nonaktif';
}

export interface AttendanceLogRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  employmentType: EmploymentCategory;
  entityName: string;
  dateLabel: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  lateMinutes: number;
  locationUsed: string;
  notes: string;
  faceVerified?: boolean;
  livenessPassed?: boolean;
  faceMatchScore?: number;
  selfieSnapshot?: string;
}

export interface LeaveAbsenceRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  employmentType: EmploymentCategory;
  entityName: string;
  type: 'Cuti Tahunan' | 'Izin Sakit' | 'Izin Keperluan' | 'Alpha / Tanpa Keterangan';
  dateRange: string;
  daysCount: number;
  reason: string;
  status:
    | 'Menunggu'
    | 'Disetujui'
    | 'Ditolak'
    | 'Alpha'
    | 'Perlu Klarifikasi'
    | 'Terkonfirmasi Izin';
  skdFileName?: string;
  skdFileDataUrl?: string;
  doctorOrClinicName?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ContractRecord {
  id: string;
  contractNumber: string;
  employeeCode: string;
  employeeName: string;
  employmentType: EmploymentCategory;
  entityName: string;
  contractType: 'PKWT' | 'PKWTT';
  startDate: string;
  endDate: string;
  daysRemaining: number | null;
  status: 'Aktif' | 'Segera Berakhir' | 'Diperpanjang';
  extensionRequested?: boolean;
}

export interface OnboardingCandidateRecord {
  id: string;
  candidateCode: string;
  applicantId?: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  position: string;
  employmentType: EmploymentCategory;
  entityName: string;
  recruiterName: string;
  targetJoinDate: string;
  proposedContractType: 'PKWT' | 'PKWTT';
  proposedEndDate: string;
  documentsReadyCount: number;
  salaryMonthly?: number;
  placementLocation?: string;
  prefillEmployeeData?: Partial<EmployeeFormInput>;
  status: 'Siap Onboarding' | 'Menunggu Aktivasi Master Admin' | 'Aktif Menjadi Karyawan';
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  category: 'RBAC' | 'Organisasi' | 'Persetujuan' | 'Kebijakan' | 'Keamanan' | 'Operasional';
  action: string;
  target: string;
}

export interface ClientPolicyOverride {
  entityId: string;
  entityName: string;
  checkInTime: string;
  checkOutTime: string;
  lateToleranceMinutes: number;
  workDays?: string;
  locationMode?: AttendanceLocationMode;
  useDefault: boolean;
}

export interface WorkPolicyConfig {
  checkInTime: string;
  checkOutTime: string;
  workDays: string;
  defaultLocationMode?: AttendanceLocationMode;
  earlyCheckInWindowMinutes: number;
  lateToleranceMinutes: number;
  annualLeaveQuota: number;
  leaveApprovalFlow: string;
  headcountApprovalFlow: string;
  requireGpsRadius: boolean;
  requireSelfie: boolean;
  enforceStrictDeviceCheck: boolean;
  attendanceLocations: AttendanceLocationRecord[];
  clientOverrides: ClientPolicyOverride[];
}

export interface SystemSettingsConfig {
  companyName: string;
  headquartersAddress: string;
  supportEmail: string;
  hrWhatsappHelpdesk?: string;
  pkwtSignatoryName?: string;
  pkwtSignatoryTitle?: string;
  pkwtContractPrefix?: string;
  defaultEmployeePin?: string;
  eocWarningDaysThreshold?: 30 | 14 | 7;
  notifyExpiringContract: boolean;
  notifyLeaveAndSickSkd?: boolean;
  notifyOnboardingCandidate?: boolean;
  notifyNewUserSignup: boolean;
  notifyRbacChanges: boolean;
}

export interface FamilyMemberRecord {
  id: string;
  name: string;
  relation: 'Pasangan' | 'Anak' | 'Orang Tua' | 'Saudara Kandung';
  birthDate: string;
  nik?: string;
}

export interface KtpAddressRecord {
  street: string;
  rtRw: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface EmergencyContactRecord {
  name: string;
  relation: string;
  phone: string;
}

export interface EmployeeDocumentsRecord {
  cvUploaded: boolean;
  ktpUploaded: boolean;
  kkUploaded: boolean;
  simUploaded: boolean;
  ijazahUploaded: boolean;
  sertifikatUploaded: boolean;
  passFotoUploaded: boolean;
  skckUploaded: boolean;
  transkripNilaiUploaded: boolean;
  bankBookUploaded: boolean;
  contractUploaded: boolean;
}

export const DOCUMENT_CHECKLIST_ITEMS: Array<{
  key: keyof EmployeeDocumentsRecord;
  label: string;
  shortLabel: string;
}> = [
  { key: 'cvUploaded', label: 'Daftar Riwayat Hidup (CV)', shortLabel: 'CV' },
  { key: 'ktpUploaded', label: 'Scan e-KTP', shortLabel: 'e-KTP' },
  { key: 'kkUploaded', label: 'Scan Kartu Keluarga (KK)', shortLabel: 'KK' },
  { key: 'simUploaded', label: 'Scan SIM Aktif', shortLabel: 'SIM' },
  { key: 'ijazahUploaded', label: 'Ijazah Pendidikan Terakhir', shortLabel: 'Ijazah' },
  { key: 'transkripNilaiUploaded', label: 'Transkrip Nilai', shortLabel: 'Transkrip' },
  { key: 'sertifikatUploaded', label: 'Sertifikat Keahlian / Pelatihan', shortLabel: 'Sertifikat' },
  { key: 'passFotoUploaded', label: 'Pas Foto Terbaru', shortLabel: 'Pas Foto' },
  { key: 'skckUploaded', label: 'SKCK Kepolisian Aktif', shortLabel: 'SKCK' },
  { key: 'bankBookUploaded', label: 'Buku Tabungan (Rekening)', shortLabel: 'Rekening' },
  { key: 'contractUploaded', label: 'Dokumen Kontrak PKWT / PKWTT', shortLabel: 'Kontrak' },
];

export interface EmployeeFaceBiometricRecord {
  enrolled: boolean;
  enrolledAt: string;
  descriptor: number[];
  referenceSnapshot?: string;
}

export interface ContractHistoryItem {
  id: string;
  sequenceLabel: string;
  contractType: 'PKWT' | 'PKWTT';
  contractNumber: string;
  startDate: string;
  endDate: string;
  entityName: string;
  placementName?: string;
  placementArea?: string;
  placementMapsUrl?: string;
  position: string;
  signatureStatus:
    | 'Menunggu TTD Karyawan'
    | 'Sudah TTD Digital'
    | 'Sudah Upload TTD Manual'
    | 'Selesai / Digantikan';
  signedAt?: string;
  signerEmployeeName?: string;
  employeeSignatureDataUrl?: string;
  uploadedSignedFileName?: string;
  uploadedSignedFileDataUrl?: string;
  uploadedAt?: string;
  notes?: string;
}

export interface WorkspaceNotificationRecord {
  id: string;
  type:
    | 'new-employee'
    | 'pkwt-signed'
    | 'pkwt-expiring'
    | 'pkwt-pending-sign'
    | 'pkwt-extension-requested'
    | 'approval-pending'
    | 'leave-submitted'
    | 'leave-approved'
    | 'leave-rejected'
    | 'alpha-clarified'
    | 'new-application'
    | 'applicant-ready'
    | 'interview-scheduled'
    | 'application-updated';
  title: string;
  message: string;
  createdAt: string;
  targetMenu?: string;
  employeeCode?: string;
  entityName?: string;
  leaveId?: string;
  applicationId?: string;
  applicantId?: string;
  recipientRole?: 'admin' | 'master-admin' | 'employee' | 'recruiter' | 'applicant';
  read: boolean;
}

export interface EmployeeRecord {
  id: string;
  employeeCode: string;
  loginAlias?: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  position: string;
  department: string;
  employmentType: EmploymentCategory;
  entityName: string;
  contractType: 'PKWT' | 'PKWTT';
  contractNumber: string;
  joinDate: string;
  contractEndDate: string;
  status: 'Aktif' | 'Probation' | 'Nonaktif';
  nik: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  maritalStatus: 'Belum Kawin' | 'Kawin' | 'Cerai Hidup' | 'Cerai Mati';
  bloodType: string;
  education: string;
  npwpNumber: string;
  bpjsKesehatanNumber?: string;
  bpjsKetenagakerjaanNumber?: string;
  ktpAddress: KtpAddressRecord;
  domicileSameAsKtp: boolean;
  domicileAddress: string;
  kkNumber: string;
  headOfFamily: string;
  familyMembers: FamilyMemberRecord[];
  emergencyContact: EmergencyContactRecord;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bankBranch: string;
  documents: EmployeeDocumentsRecord;
  salaryMonthly?: number;
  placementLocation?: string;
  placementId?: string;
  placementName?: string;
  placementArea?: string;
  placementMapsUrl?: string;
  originApplicantCode?: string;
  applicantId?: string;
  portalPassword?: string;
  accountDisabled?: boolean;
  passwordResetAt?: string;
  isNewHire?: boolean;
  createdAtIso?: string;
  contractHistory?: ContractHistoryItem[];
  faceBiometric?: EmployeeFaceBiometricRecord;
  savedSignatureDataUrl?: string;
  savedSignatureUpdatedAt?: string;
  bpjsKesehatanCardName?: string;
  bpjsKesehatanCardDataUrl?: string;
  bpjsKetenagakerjaanCardName?: string;
  bpjsKetenagakerjaanCardDataUrl?: string;
}

export interface EmployeeFormInput {
  employeeCode: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  position: string;
  department: string;
  employmentType: EmploymentCategory;
  entityName: string;
  contractType: 'PKWT' | 'PKWTT';
  contractNumber: string;
  joinDate: string;
  contractEndDate: string;
  status: 'Aktif' | 'Probation' | 'Nonaktif';
  nik: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  maritalStatus: 'Belum Kawin' | 'Kawin' | 'Cerai Hidup' | 'Cerai Mati';
  bloodType: string;
  education: string;
  npwpNumber: string;
  bpjsKesehatanNumber?: string;
  bpjsKetenagakerjaanNumber?: string;
  ktpAddress: KtpAddressRecord;
  domicileSameAsKtp: boolean;
  domicileAddress: string;
  kkNumber: string;
  headOfFamily: string;
  familyMembers: FamilyMemberRecord[];
  emergencyContact: EmergencyContactRecord;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bankBranch: string;
  documents: EmployeeDocumentsRecord;
  salaryMonthly?: number;
  placementLocation?: string;
  placementId?: string;
  placementName?: string;
  placementArea?: string;
  placementMapsUrl?: string;
  originApplicantCode?: string;
  applicantId?: string;
  portalPassword?: string;
  accountDisabled?: boolean;
  passwordResetAt?: string;
  isNewHire?: boolean;
  createdAtIso?: string;
  contractHistory?: ContractHistoryItem[];
  faceBiometric?: EmployeeFaceBiometricRecord;
  savedSignatureDataUrl?: string;
  savedSignatureUpdatedAt?: string;
  bpjsKesehatanCardName?: string;
  bpjsKesehatanCardDataUrl?: string;
  bpjsKetenagakerjaanCardName?: string;
  bpjsKetenagakerjaanCardDataUrl?: string;
}

export const INITIAL_ENTITIES: EntityRecord[] = [
  {
    id: 'ent-1',
    code: 'INT-HO',
    name: 'Kantor Pusat Operasional',
    category: 'Internal',
    city: 'Jakarta Selatan',
    lead: 'Fathurrahman',
    employeeCount: 68,
    departmentCount: 4,
    status: 'Aktif',
    legalCompanyName: 'PT. SWAPRO INTERNATIONAL',
    industryLabel: 'Manajemen SDM & Alih Daya Korporat',
    placementAddress:
      'Graha Swatama Jl. Raya Tanjung Barat No. 129, Jagakarsa, Jakarta Selatan 12530',
    headcountQuota: 75,
    defaultBaseSalary: 6200000,
    supportedPositions: [
      {
        id: 'pos-int-1',
        title: 'HR Operations Specialist',
        department: 'Operasional & Tata Kelola Internal',
        baseSalary: 6800000,
      },
      {
        id: 'pos-int-2',
        title: 'Payroll & Kontrak PKWT Officer',
        department: 'Layanan Administrasi Klien & Kontrak',
        baseSalary: 6200000,
      },
      {
        id: 'pos-int-3',
        title: 'IT & HRIS Support Officer',
        department: 'Operasional & Tata Kelola Internal',
        baseSalary: 7000000,
      },
    ],
    supportedPlacements: [
      {
        id: 'plc-int-ho-1',
        name: 'Graha Swatama — Tanjung Barat',
        area: 'Jakarta Selatan',
        mapsUrl: '',
      },
    ],
  },
  {
    id: 'ent-2',
    code: 'INT-REC',
    name: 'Pusat Rekrutmen & Pelatihan',
    category: 'Internal',
    city: 'Bandung',
    lead: 'Rama Wijaya',
    employeeCount: 24,
    departmentCount: 2,
    status: 'Aktif',
    legalCompanyName: 'PT. SWAPRO INTERNATIONAL',
    industryLabel: 'Pusat Akuisisi Talenta & Asesmen',
    placementAddress: 'Jl. Asia Afrika No. 44, Kota Bandung, Jawa Barat',
    headcountQuota: 30,
    defaultBaseSalary: 5100000,
    supportedPositions: [
      {
        id: 'pos-rec-1',
        title: 'Talent Acquisition Specialist',
        department: 'Akuisisi Talenta & Seleksi Klien',
        baseSalary: 5400000,
      },
      {
        id: 'pos-rec-2',
        title: 'Trainer & Onboarding Facilitator',
        department: 'Akuisisi Talenta & Seleksi Klien',
        baseSalary: 5100000,
      },
    ],
    supportedPlacements: [
      {
        id: 'plc-int-rec-1',
        name: 'Kantor Rekrutmen & Asesmen Bandung',
        area: 'Bandung & Jawa Barat',
        mapsUrl: '',
      },
    ],
  },
  {
    id: 'ent-3',
    code: 'CLN-ADR',
    name: 'Adira Finance — Penempatan Regional',
    category: 'Klien Penempatan',
    city: 'Jakarta & Jawa Barat',
    lead: 'Ulan Rahmawati',
    employeeCount: 142,
    departmentCount: 3,
    status: 'Aktif',
    placementPeriod: 'Berakhir 31 Des 2026',
    legalCompanyName: 'PT Adira Dinamika Multi Finance, Tbk.',
    industryLabel: 'Perusahaan Pembiayaan Otomotif & Multiguna Nasional',
    placementAddress:
      'PT Adira Dinamika Multi Finance, Tbk. Kantor Cabang Ketapang Jl. KH Zainul Arifin Blok A3-A4 No. 27, Gambir, Jakarta Pusat',
    pksNumber: 'PKS/SWP-ADIRA/014/I/2026',
    headcountQuota: 160,
    defaultBaseSalary: 5575000,
    supportedPositions: [
      {
        id: 'pos-adr-1',
        title: 'Field Collection Officer',
        department: 'Collection & Recovery Regional',
        baseSalary: 5575000,
      },
      {
        id: 'pos-adr-2',
        title: 'Customer Service & Verifikasi Klien',
        department: 'Frontliner & Layanan Cabang',
        baseSalary: 5450000,
      },
      {
        id: 'pos-adr-3',
        title: 'Credit Marketing Officer (CMO)',
        department: 'Sales & Akuisisi Pembiayaan',
        baseSalary: 5650000,
      },
    ],
    supportedPlacements: [
      {
        id: 'plc-adr-1',
        name: 'Adira Tebet',
        area: 'Jabodetabek',
        mapsUrl: '',
      },
      {
        id: 'plc-adr-2',
        name: 'Adira Ketapang',
        area: 'Jabodetabek',
        mapsUrl: '',
      },
    ],
  },
  {
    id: 'ent-4',
    code: 'CLN-FIF',
    name: 'FIFGROUP — Area Jawa Timur',
    category: 'Klien Penempatan',
    city: 'Surabaya',
    lead: 'Bagus Prakoso',
    employeeCount: 108,
    departmentCount: 3,
    status: 'Aktif',
    placementPeriod: 'Berakhir 31 Mar 2027',
    legalCompanyName: 'PT Federal International Finance (FIFGROUP)',
    industryLabel: 'Perusahaan Pembiayaan Konsumen & Armada Grup Astra',
    placementAddress:
      'PT Federal International Finance (FIFGROUP) Kantor Regional Surabaya, Jl. Basuki Rahmat No. 88, Kota Surabaya, Jawa Timur',
    pksNumber: 'PKS/SWP-FIF/029/III/2026',
    headcountQuota: 125,
    defaultBaseSalary: 5050000,
    supportedPositions: [
      {
        id: 'pos-fif-1',
        title: 'Kolektor Lapangan (Field Verifier)',
        department: 'Operasional Penagihan Jawa Timur',
        baseSalary: 5050000,
      },
      {
        id: 'pos-fif-2',
        title: 'Surveyor Pembiayaan Cabang',
        department: 'Survey & Verifikasi Kredit',
        baseSalary: 5100000,
      },
      {
        id: 'pos-fif-3',
        title: 'Admin Kontrak & BPKB Cabang',
        department: 'Administrasi Operasional Cabang',
        baseSalary: 4950000,
      },
    ],
    supportedPlacements: [
      {
        id: 'plc-fif-1',
        name: 'FIFGROUP Surabaya Kota',
        area: 'Jawa Timur',
        mapsUrl: '',
      },
    ],
  },
  {
    id: 'ent-5',
    code: 'CLN-BAF',
    name: 'BAF — Layanan Operasional Cabang',
    category: 'Klien Penempatan',
    city: 'Jakarta Pusat',
    lead: 'Ulan Rahmawati',
    employeeCount: 78,
    departmentCount: 2,
    status: 'Aktif',
    placementPeriod: 'Berakhir 30 Sep 2026',
    legalCompanyName: 'PT Bussan Auto Finance',
    industryLabel: 'Perusahaan Pembiayaan Otomotif Nasional',
    placementAddress:
      'PT Bussan Auto Finance Kantor Operasional Cabang Jakarta Pusat, Jl. Jend. Sudirman Kav. 21, Setiabudi, Jakarta Pusat',
    pksNumber: 'PKS/SWP-BAF/008/IX/2025',
    headcountQuota: 90,
    defaultBaseSalary: 5520000,
    supportedPositions: [
      {
        id: 'pos-baf-1',
        title: 'Customer Service Cabang',
        department: 'Layanan Operasional Cabang',
        baseSalary: 5520000,
      },
      {
        id: 'pos-baf-2',
        title: 'Petugas Operasional Cabang',
        department: 'Operasional & Administrasi Cabang',
        baseSalary: 5396761,
      },
      {
        id: 'pos-baf-3',
        title: 'Desk Collection Specialist',
        department: 'Telecollection & Reminder',
        baseSalary: 5400000,
      },
    ],
    supportedPlacements: [
      {
        id: 'plc-baf-1',
        name: 'BAF Jakarta Pusat (Sudirman)',
        area: 'Jabodetabek',
        mapsUrl: '',
      },
    ],
  },
];

export const INITIAL_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'dep-1',
    name: 'Operasional & Tata Kelola Internal',
    entityName: 'Kantor Pusat Operasional',
    category: 'Internal',
    head: 'Fathurrahman',
    gradeRange: 'Grade 3 – Grade 7',
    headcount: 42,
  },
  {
    id: 'dep-2',
    name: 'Layanan Administrasi Klien & Kontrak',
    entityName: 'Kantor Pusat Operasional',
    category: 'Internal',
    head: 'Ulan Rahmawati',
    gradeRange: 'Grade 3 – Grade 6',
    headcount: 26,
  },
  {
    id: 'dep-3',
    name: 'Akuisisi Talenta & Seleksi Klien',
    entityName: 'Pusat Rekrutmen & Pelatihan',
    category: 'Internal',
    head: 'Rama Wijaya',
    gradeRange: 'Grade 3 – Grade 5',
    headcount: 24,
  },
  {
    id: 'dep-4',
    name: 'Tim Lapangan & Dukungan Klien Adira',
    entityName: 'Adira Finance — Penempatan Regional',
    category: 'Klien Penempatan',
    head: 'Ulan Rahmawati',
    gradeRange: 'Grade 1 – Grade 4',
    headcount: 142,
  },
  {
    id: 'dep-5',
    name: 'Tim Operasional Klien FIFGROUP',
    entityName: 'FIFGROUP — Area Jawa Timur',
    category: 'Klien Penempatan',
    head: 'Bagus Prakoso',
    gradeRange: 'Grade 1 – Grade 4',
    headcount: 108,
  },
  {
    id: 'dep-6',
    name: 'Tim Layanan Klien BAF',
    entityName: 'BAF — Layanan Operasional Cabang',
    category: 'Klien Penempatan',
    head: 'Ulan Rahmawati',
    gradeRange: 'Grade 1 – Grade 4',
    headcount: 78,
  },
];

export const INITIAL_USERS: UserAccountRecord[] = [
  {
    id: 'usr-1',
    employeeCode: 'MA-001',
    loginAlias: 'swa-fathur',
    fullName: 'Fathurrahman',
    email: 'swa-fathur@swapro-demo.co.id',
    whatsappNumber: '081199880001',
    employmentType: 'Internal',
    assignedScopes: ['Kantor Pusat Operasional'],
    role: 'Master Admin',
    status: 'Aktif',
    lastActive: 'Baru saja',
    portalPassword: '1234',
  },
  {
    id: 'usr-2',
    employeeCode: 'ADM-014',
    loginAlias: 'swa-ulan',
    fullName: 'Ulan Rahmawati',
    email: 'swa-ulan@swapro-demo.co.id',
    whatsappNumber: '081288770014',
    employmentType: 'Internal',
    assignedScopes: [
      'Adira Finance — Penempatan Regional',
      'BAF — Layanan Operasional Cabang',
    ],
    role: 'Admin',
    status: 'Aktif',
    lastActive: '18 menit lalu',
    portalPassword: '1234',
  },
  {
    id: 'usr-3',
    employeeCode: 'ADM-021',
    loginAlias: 'adm-bagus',
    fullName: 'Bagus Prakoso',
    email: 'bagus.prakoso@swapro-demo.co.id',
    whatsappNumber: '081377660021',
    employmentType: 'Internal',
    assignedScopes: ['Kantor Pusat Operasional', 'FIFGROUP — Area Jawa Timur'],
    role: 'Admin',
    status: 'Aktif',
    lastActive: '42 menit lalu',
    portalPassword: '1234',
  },
  {
    id: 'usr-4',
    employeeCode: 'REC-008',
    loginAlias: 'swa-rama',
    fullName: 'Rama Wijaya',
    email: 'swa-rama@swapro-demo.co.id',
    whatsappNumber: '081566550008',
    employmentType: 'Internal',
    assignedScopes: [
      'Pusat Rekrutmen & Pelatihan',
      'Adira Finance — Penempatan Regional',
      'FIFGROUP — Area Jawa Timur',
      'BAF — Layanan Operasional Cabang',
    ],
    role: 'Rekruter',
    status: 'Aktif',
    lastActive: '1 jam lalu',
    portalPassword: '1234',
  },
  {
    id: 'usr-5',
    employeeCode: 'EMP-1024',
    fullName: 'Raka Pratama',
    email: 'raka.pratama@swapro-demo.co.id',
    whatsappNumber: '081288901024',
    employmentType: 'Internal',
    assignedScopes: ['Kantor Pusat Operasional'],
    role: 'Karyawan',
    status: 'Aktif',
    lastActive: '2 jam lalu',
  },
  {
    id: 'usr-6',
    employeeCode: 'NEW-209',
    loginAlias: 'swa-rudi',
    fullName: 'Rudi Hartono',
    email: 'swa-rudi@swapro-demo.co.id',
    whatsappNumber: '081290010209',
    employmentType: 'Penempatan Klien',
    assignedScopes: ['Adira Finance — Penempatan Regional'],
    role: 'Karyawan',
    status: 'Menunggu Aktivasi',
    lastActive: 'Belum masuk',
    portalPassword: '1234',
  },
  {
    id: 'usr-7',
    employeeCode: 'OUT-318',
    fullName: 'Nadia Kusuma',
    email: 'nadia.kusuma@swapro-demo.co.id',
    whatsappNumber: '085691230318',
    employmentType: 'Penempatan Klien',
    assignedScopes: ['BAF — Layanan Operasional Cabang'],
    role: 'Karyawan',
    status: 'Aktif',
    lastActive: '3 jam lalu',
  },
];

export const INITIAL_APPROVALS: ApprovalRequestRecord[] = [
  {
    id: 'apr-1',
    title: 'Permintaan Pemenuhan 12 Staff Operasional Lapangan',
    requester: 'Rama Wijaya',
    requesterRole: 'Rekruter',
    entityName: 'Adira Finance — Penempatan Regional',
    category: 'Rekrutmen',
    submittedAt: '12 Nov 2026 · 09:40',
    status: 'Menunggu',
  },
  {
    id: 'apr-2',
    title: 'Aktivasi Akun Penempatan Klien — Rudi Hartono',
    requester: 'Ulan Rahmawati',
    requesterRole: 'Admin',
    entityName: 'Adira Finance — Penempatan Regional',
    category: 'Akses Akun',
    submittedAt: '12 Nov 2026 · 08:15',
    status: 'Menunggu',
  },
  {
    id: 'apr-3',
    title: 'Penambahan Cakupan Kelola Klien BAF untuk Admin Surabaya',
    requester: 'Bagus Prakoso',
    requesterRole: 'Admin',
    entityName: 'BAF — Layanan Operasional Cabang',
    category: 'Penempatan Klien',
    submittedAt: '11 Nov 2026 · 16:20',
    status: 'Menunggu',
  },
  {
    id: 'apr-4',
    title: 'Pembaruan Jadwal Shift Unit Internal Pusat Q4',
    requester: 'Bagus Prakoso',
    requesterRole: 'Admin',
    entityName: 'Kantor Pusat Operasional',
    category: 'Kebijakan',
    submittedAt: '10 Nov 2026 · 14:05',
    status: 'Disetujui',
  },
];

export const INITIAL_OPERATIONAL_SNAPSHOTS: OperationalSnapshot[] = [
  {
    id: 'op-1',
    entityName: 'Kantor Pusat Operasional',
    category: 'Internal',
    attendanceRate: '98,1%',
    onLeaveToday: 2,
    expiringContracts: 1,
    openPositions: 2,
    activeCandidates: 21,
  },
  {
    id: 'op-2',
    entityName: 'Pusat Rekrutmen & Pelatihan',
    category: 'Internal',
    attendanceRate: '97,5%',
    onLeaveToday: 1,
    expiringContracts: 0,
    openPositions: 1,
    activeCandidates: 12,
  },
  {
    id: 'op-3',
    entityName: 'Adira Finance — Penempatan Regional',
    category: 'Klien Penempatan',
    attendanceRate: '96,4%',
    onLeaveToday: 4,
    expiringContracts: 5,
    openPositions: 6,
    activeCandidates: 74,
  },
  {
    id: 'op-4',
    entityName: 'FIFGROUP — Area Jawa Timur',
    category: 'Klien Penempatan',
    attendanceRate: '95,8%',
    onLeaveToday: 3,
    expiringContracts: 3,
    openPositions: 4,
    activeCandidates: 48,
  },
  {
    id: 'op-5',
    entityName: 'BAF — Layanan Operasional Cabang',
    category: 'Klien Penempatan',
    attendanceRate: '96,9%',
    onLeaveToday: 2,
    expiringContracts: 2,
    openPositions: 3,
    activeCandidates: 31,
  },
];

export const INITIAL_ATTENDANCE_LOCATIONS: AttendanceLocationRecord[] = [
  {
    id: 'loc-1',
    name: 'Gedung Kantor Pusat TB Simatupang',
    entityName: 'Kantor Pusat Operasional',
    category: 'Internal',
    addressOrCoords: 'Jl. TB Simatupang Kav. 18, Jakarta Selatan',
    area: 'Jakarta Selatan',
    mapsUrl: 'https://www.google.com/maps?q=-6.292100,106.798400',
    radiusMeters: 100,
    mode: 'Wajib di Radius Lokasi',
    status: 'Aktif',
  },
  {
    id: 'loc-2',
    name: 'Pusat Pelatihan Bandung',
    entityName: 'Pusat Rekrutmen & Pelatihan',
    category: 'Internal',
    addressOrCoords: 'Jl. Asia Afrika No. 44, Bandung',
    area: 'Bandung Raya',
    mapsUrl: 'https://www.google.com/maps?q=-6.921400,107.607100',
    radiusMeters: 120,
    mode: 'Wajib di Radius Lokasi',
    status: 'Aktif',
  },
  {
    id: 'loc-3',
    name: 'Adira Tebet',
    entityName: 'Adira Finance — Penempatan Regional',
    category: 'Klien Penempatan',
    addressOrCoords: 'Cabang Adira Tebet · Area Jabodetabek',
    area: 'Jabodetabek',
    mapsUrl: 'https://www.google.com/maps?q=-6.229728,106.857342',
    radiusMeters: 150,
    mode: 'Fleksibel Lapangan',
    status: 'Aktif',
  },
  {
    id: 'loc-3b',
    name: 'Adira Kelapa Gading',
    entityName: 'Adira Finance — Penempatan Regional',
    category: 'Klien Penempatan',
    addressOrCoords: 'Cabang Adira Kelapa Gading · Area Jakarta Utara',
    area: 'Jakarta Utara',
    mapsUrl: 'https://www.google.com/maps?q=-6.157380,106.908210',
    radiusMeters: 150,
    mode: 'Fleksibel Lapangan',
    status: 'Aktif',
  },
  {
    id: 'loc-4',
    name: 'FIFGROUP Cabang Surabaya Pusat',
    entityName: 'FIFGROUP — Area Jawa Timur',
    category: 'Klien Penempatan',
    addressOrCoords: 'Jl. Basuki Rahmat No. 88, Surabaya',
    area: 'Surabaya Raya',
    mapsUrl: 'https://www.google.com/maps?q=-7.265400,112.742500',
    radiusMeters: 150,
    mode: 'Wajib di Radius Lokasi',
    status: 'Aktif',
  },
  {
    id: 'loc-5',
    name: 'BAF Cabang Sudirman',
    entityName: 'BAF — Layanan Operasional Cabang',
    category: 'Klien Penempatan',
    addressOrCoords: 'Jl. Jend. Sudirman Kav. 21, Jakarta Pusat',
    area: 'Jakarta Pusat',
    mapsUrl: 'https://www.google.com/maps?q=-6.211500,106.821100',
    radiusMeters: 100,
    mode: 'Wajib di Radius Lokasi',
    status: 'Aktif',
  },
];

export const INITIAL_ATTENDANCE_LOGS: AttendanceLogRecord[] = [
  {
    id: 'att-1',
    employeeCode: 'EMP-1024',
    employeeName: 'Raka Pratama',
    employmentType: 'Internal',
    entityName: 'Kantor Pusat Operasional',
    dateLabel: '12 Nov 2026',
    checkIn: '08:22 WIB',
    checkOut: '17:35 WIB',
    status: 'Hadir',
    lateMinutes: 0,
    locationUsed: 'Gedung Kantor Pusat TB Simatupang (42m)',
    notes: 'Tepat waktu',
  },
  {
    id: 'att-2',
    employeeCode: 'OUT-318',
    employeeName: 'Nadia Kusuma',
    employmentType: 'Penempatan Klien',
    entityName: 'BAF — Layanan Operasional Cabang',
    dateLabel: '12 Nov 2026',
    checkIn: '08:28 WIB',
    checkOut: '—',
    status: 'Telat',
    lateMinutes: 28,
    locationUsed: 'Kantor Operasional BAF Jakarta Pusat (65m)',
    notes: 'Terlambat 28 menit dari jam masuk klien (08:00)',
  },
  {
    id: 'att-3',
    employeeCode: 'OUT-405',
    employeeName: 'Bima Saputra',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    dateLabel: '12 Nov 2026',
    checkIn: '07:54 WIB',
    checkOut: '—',
    status: 'Hadir',
    lateMinutes: 0,
    locationUsed: 'Cabang Adira Jakarta Selatan (Mode Lapangan)',
    notes: 'Check-in dengan swafoto & GPS',
  },
  {
    id: 'att-4',
    employeeCode: 'OUT-512',
    employeeName: 'Teguh Santoso',
    employmentType: 'Penempatan Klien',
    entityName: 'FIFGROUP — Area Jawa Timur',
    dateLabel: '12 Nov 2026',
    checkIn: '—',
    checkOut: '—',
    status: 'Alpha',
    lateMinutes: 0,
    locationUsed: 'Belum ada presensi',
    notes: 'Tanpa keterangan hingga pukul 10:30 WIB',
  },
  {
    id: 'att-5',
    employeeCode: 'INT-118',
    employeeName: 'Larasati Dewi',
    employmentType: 'Internal',
    entityName: 'Pusat Rekrutmen & Pelatihan',
    dateLabel: '12 Nov 2026',
    checkIn: '—',
    checkOut: '—',
    status: 'Cuti',
    lateMinutes: 0,
    locationUsed: 'Pengajuan disetujui',
    notes: 'Cuti tahunan hari ke-1 dari 2',
  },
  {
    id: 'att-6',
    employeeCode: 'OUT-429',
    employeeName: 'Hendrik Gunawan',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    dateLabel: '12 Nov 2026',
    checkIn: '—',
    checkOut: '—',
    status: 'Izin',
    lateMinutes: 0,
    locationUsed: 'Surat keterangan dokter',
    notes: 'Izin sakit 1 hari terlampir',
  },
];

export function buildSkdCertificatePreviewDataUrl(params: {
  employeeName: string;
  employeeCode: string;
  dateRange: string;
  daysCount: number;
  reason: string;
  doctorOrClinicName?: string;
}): string {
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const clinic = escapeXml(params.doctorOrClinicName?.trim() || 'Klinik Pratama Medika Rekanan');
  const safeName = escapeXml(params.employeeName);
  const safeCode = escapeXml(params.employeeCode);
  const safeReason = escapeXml(params.reason);
  const safeDateRange = escapeXml(params.dateRange);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="440" viewBox="0 0 680 440">
    <rect width="680" height="440" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" rx="8"/>
    <rect x="20" y="20" width="640" height="72" fill="#102B69" rx="6"/>
    <text x="44" y="52" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="18" font-weight="bold">SURAT KETERANGAN DOKTER (SKD)</text>
    <text x="44" y="74" fill="#93C5FD" font-family="Arial, sans-serif" font-size="12">${clinic}</text>
    <text x="44" y="130" fill="#475569" font-family="Arial, sans-serif" font-size="13">Menerangkan bahwa pasien / karyawan di bawah ini:</text>
    <text x="44" y="162" fill="#102B69" font-family="Arial, sans-serif" font-size="15" font-weight="bold">Nama Lengkap : ${safeName} (${safeCode})</text>
    <text x="44" y="190" fill="#1E293B" font-family="Arial, sans-serif" font-size="13">Diagnosa / Keluhan : ${safeReason}</text>
    <rect x="44" y="212" width="592" height="76" fill="#EFF6FF" stroke="#BFDBFE" rx="6"/>
    <text x="64" y="242" fill="#1E3A8A" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Rekomendasi Medis: Istirahat Sakit selama ${params.daysCount} (${params.daysCount === 1 ? 'Satu' : params.daysCount}) Hari</text>
    <text x="64" y="268" fill="#1D4ED8" font-family="Arial, sans-serif" font-size="13">Terhitung Tanggal: ${safeDateRange}</text>
    <text x="44" y="340" fill="#64748B" font-family="Arial, sans-serif" font-size="12">Dokumen SKD terverifikasi untuk lampiran pengajuan Izin Sakit HRIS.</text>
    <rect x="460" y="316" width="176" height="84" fill="#FFFFFF" stroke="#94A3B8" stroke-dasharray="4 4" rx="4"/>
    <text x="482" y="348" fill="#0F766E" font-family="Arial, sans-serif" font-size="12" font-weight="bold">TERVERIFIKASI MEDIS</text>
    <text x="482" y="372" fill="#475569" font-family="Arial, sans-serif" font-size="11">Cap &amp; TTD Dokter Pemeriksa</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_LEAVE_ABSENCES: LeaveAbsenceRecord[] = [
  {
    id: 'lv-1',
    employeeCode: 'OUT-512',
    employeeName: 'Teguh Santoso',
    employmentType: 'Penempatan Klien',
    entityName: 'FIFGROUP — Area Jawa Timur',
    type: 'Alpha / Tanpa Keterangan',
    dateRange: '12 Nov 2026',
    daysCount: 1,
    reason: 'Tidak melakukan presensi masuk dan tanpa pengajuan cuti/izin resmi (Status Alpha Mengikat)',
    status: 'Alpha',
    submittedAt: '12 Nov 2026 · 10:30',
  },
  {
    id: 'lv-2',
    employeeCode: 'OUT-318',
    employeeName: 'Nadia Kusuma',
    employmentType: 'Penempatan Klien',
    entityName: 'BAF — Layanan Operasional Cabang',
    type: 'Cuti Tahunan',
    dateRange: '18 – 20 Nov 2026',
    daysCount: 3,
    reason: 'Keperluan acara keluarga di luar kota',
    status: 'Menunggu',
    submittedAt: '12 Nov 2026 · 09:15',
  },
  {
    id: 'lv-5',
    employeeCode: 'OUT-405',
    employeeName: 'Bima Saputra',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    type: 'Izin Sakit',
    dateRange: '13 Nov 2026',
    daysCount: 1,
    reason: 'Demam tinggi & observasi rawat jalan sesuai surat keterangan dokter terlampir',
    status: 'Menunggu',
    skdFileName: 'SKD_Klinik_Pratama_Bima_Saputra.svg',
    doctorOrClinicName: 'Klinik Pratama Medika Depok — dr. Hendra Wijaya',
    skdFileDataUrl: buildSkdCertificatePreviewDataUrl({
      employeeName: 'Bima Saputra',
      employeeCode: 'OUT-405',
      dateRange: '13 Nov 2026',
      daysCount: 1,
      reason: 'Demam tinggi & observasi rawat jalan',
      doctorOrClinicName: 'Klinik Pratama Medika Depok — dr. Hendra Wijaya',
    }),
    submittedAt: '12 Nov 2026 · 08:40',
  },
  {
    id: 'lv-3',
    employeeCode: 'EMP-1024',
    employeeName: 'Raka Pratama',
    employmentType: 'Internal',
    entityName: 'Kantor Pusat Operasional',
    type: 'Izin Keperluan',
    dateRange: '14 Nov 2026',
    daysCount: 1,
    reason: 'Pengurusan perpanjangan dokumen kendaraan operasional',
    status: 'Menunggu',
    submittedAt: '11 Nov 2026 · 16:10',
  },
  {
    id: 'lv-4',
    employeeCode: 'INT-118',
    employeeName: 'Larasati Dewi',
    employmentType: 'Internal',
    entityName: 'Pusat Rekrutmen & Pelatihan',
    type: 'Cuti Tahunan',
    dateRange: '12 – 13 Nov 2026',
    daysCount: 2,
    reason: 'Cuti tahunan terjadwal',
    status: 'Disetujui',
    submittedAt: '08 Nov 2026 · 14:00',
    reviewedBy: 'Fathurrahman (MGR-001)',
    reviewedAt: '09 Nov 2026 · 10:15',
  },
];

export const INITIAL_CONTRACTS: ContractRecord[] = [
  {
    id: 'ctr-1',
    contractNumber: 'PKWT-CLN-2025/089',
    employeeCode: 'OUT-318',
    employeeName: 'Nadia Kusuma',
    employmentType: 'Penempatan Klien',
    entityName: 'BAF — Layanan Operasional Cabang',
    contractType: 'PKWT',
    startDate: '01 Des 2025',
    endDate: '30 Nov 2026',
    daysRemaining: 18,
    status: 'Segera Berakhir',
  },
  {
    id: 'ctr-2',
    contractNumber: 'PKWT-CLN-2025/104',
    employeeCode: 'OUT-512',
    employeeName: 'Teguh Santoso',
    employmentType: 'Penempatan Klien',
    entityName: 'FIFGROUP — Area Jawa Timur',
    contractType: 'PKWT',
    startDate: '10 Des 2025',
    endDate: '09 Des 2026',
    daysRemaining: 27,
    status: 'Segera Berakhir',
  },
  {
    id: 'ctr-3',
    contractNumber: 'PKWT-INT-2025/041',
    employeeCode: 'INT-118',
    employeeName: 'Larasati Dewi',
    employmentType: 'Internal',
    entityName: 'Pusat Rekrutmen & Pelatihan',
    contractType: 'PKWT',
    startDate: '01 Jan 2026',
    endDate: '31 Des 2026',
    daysRemaining: 49,
    status: 'Aktif',
  },
  {
    id: 'ctr-4',
    contractNumber: 'PKWT-CLN-2026/012',
    employeeCode: 'OUT-405',
    employeeName: 'Bima Saputra',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    contractType: 'PKWT',
    startDate: '01 Apr 2026',
    endDate: '31 Mar 2027',
    daysRemaining: 139,
    status: 'Aktif',
  },
  {
    id: 'ctr-5',
    contractNumber: 'PKWTT-INT-2023/007',
    employeeCode: 'EMP-1024',
    employeeName: 'Raka Pratama',
    employmentType: 'Internal',
    entityName: 'Kantor Pusat Operasional',
    contractType: 'PKWTT',
    startDate: '15 Mar 2023',
    endDate: 'Karyawan Tetap',
    daysRemaining: null,
    status: 'Aktif',
  },
  {
    id: 'ctr-6',
    contractNumber: 'PKWT-CLN-2026/118',
    employeeCode: 'NEW-209',
    employeeName: 'Rudi Hartono',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    contractType: 'PKWT',
    startDate: '02 Nov 2026',
    endDate: '01 Mei 2027',
    daysRemaining: 170,
    status: 'Aktif',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'aud-1',
    timestamp: '12 Nov 2026 · 10:12',
    actor: 'Fathurrahman (swa-fathur)',
    category: 'Keamanan',
    action: 'Masuk ke portal Master Admin perusahaan',
    target: 'Sesi Konsol Pusat',
  },
  {
    id: 'aud-2',
    timestamp: '11 Nov 2026 · 15:48',
    actor: 'Fathurrahman (swa-fathur)',
    category: 'RBAC',
    action: 'Menetapkan cakupan multi-klien (Adira Finance & BAF)',
    target: 'Ulan Rahmawati (ADM-014)',
  },
  {
    id: 'aud-3',
    timestamp: '10 Nov 2026 · 14:10',
    actor: 'Fathurrahman (swa-fathur)',
    category: 'Persetujuan',
    action: 'Menyetujui pembaruan jadwal shift operasional Q4',
    target: 'Kantor Pusat Operasional',
  },
  {
    id: 'aud-4',
    timestamp: '09 Nov 2026 · 11:30',
    actor: 'Bagus Prakoso (ADM-021)',
    category: 'Organisasi',
    action: 'Memperbarui target pemenuhan area Jawa Timur',
    target: 'FIFGROUP — Area Jawa Timur',
  },
];

export const INITIAL_POLICY: WorkPolicyConfig = {
  checkInTime: '08:30',
  checkOutTime: '17:30',
  workDays: 'Senin – Jumat',
  defaultLocationMode: 'Wajib di Radius Lokasi',
  earlyCheckInWindowMinutes: 60,
  lateToleranceMinutes: 15,
  annualLeaveQuota: 12,
  leaveApprovalFlow: 'Kepala Unit / Koordinator → Admin HR',
  headcountApprovalFlow: 'Koordinator Klien / Unit → Master Admin',
  requireGpsRadius: true,
  requireSelfie: true,
  enforceStrictDeviceCheck: true,
  attendanceLocations: INITIAL_ATTENDANCE_LOCATIONS,
  clientOverrides: [
    {
      entityId: 'ent-3',
      entityName: 'Adira Finance — Penempatan Regional',
      checkInTime: '08:00',
      checkOutTime: '17:00',
      lateToleranceMinutes: 10,
      workDays: 'Senin – Sabtu',
      locationMode: 'Fleksibel Lapangan',
      useDefault: false,
    },
    {
      entityId: 'ent-4',
      entityName: 'FIFGROUP — Area Jawa Timur',
      checkInTime: '08:30',
      checkOutTime: '17:30',
      lateToleranceMinutes: 15,
      workDays: 'Senin – Jumat',
      locationMode: 'Wajib di Radius Lokasi',
      useDefault: true,
    },
    {
      entityId: 'ent-5',
      entityName: 'BAF — Layanan Operasional Cabang',
      checkInTime: '08:00',
      checkOutTime: '16:30',
      lateToleranceMinutes: 10,
      workDays: 'Senin – Jumat',
      locationMode: 'Wajib di Radius Lokasi',
      useDefault: false,
    },
  ],
};

export const INITIAL_SETTINGS: SystemSettingsConfig = {
  companyName: 'PT Swapro Nusantara',
  headquartersAddress: 'Jl. TB Simatupang Kav. 18, Jakarta Selatan',
  supportEmail: 'hris-admin@swapro-demo.co.id',
  hrWhatsappHelpdesk: '081199881024',
  pkwtSignatoryName: 'Fathurrahman, S.H., M.M.',
  pkwtSignatoryTitle: 'Direktur Operasional & Kepala Divisi HR',
  pkwtContractPrefix: 'PKWT-CLN-2026',
  defaultEmployeePin: '1234',
  eocWarningDaysThreshold: 30,
  notifyExpiringContract: true,
  notifyLeaveAndSickSkd: true,
  notifyOnboardingCandidate: true,
  notifyNewUserSignup: true,
  notifyRbacChanges: true,
};

export const RBAC_MATRIX_ROWS = [
  {
    module: 'Unit Internal & Klien Penempatan',
    masterAdmin: 'Penuh (Tambah Unit & Klien Opsional)',
    admin: 'Lihat Unit & Klien Sesuai Cakupan',
    rekruter: 'Lihat Kebutuhan Unit & Klien',
    karyawan: 'Lihat Unit / Klien Penempatan Sendiri',
  },
  {
    module: 'Pengguna & Cakupan Multi-Klien',
    masterAdmin: 'Penuh (Assign Peran & Multi-Klien)',
    admin: 'Kelola SDM di Cakupan Ditugaskan',
    rekruter: 'Tidak Ada Akses',
    karyawan: 'Ubah Profil Pribadi',
  },
  {
    module: 'Presensi, Lokasi, Cuti & PKWT',
    masterAdmin: 'Kebijakan, ACC Cuti/SKD, Audit Presensi & PKWT',
    admin: 'Rekap Absensi, Pantau Cuti/SKD (ACC Master Admin) & Usulan PKWT',
    rekruter: 'Pengajuan Pribadi',
    karyawan: 'Presensi Lokasi Penempatan & Cuti',
  },
  {
    module: 'Rekrutmen & Pemenuhan Klien (ATS)',
    masterAdmin: 'Otorisasi Kuota Unit / Klien',
    admin: 'Terima Data Onboarding',
    rekruter: 'Penuh Sesuai Cakupan Unit / Klien',
    karyawan: 'Lihat Lowongan Internal',
  },
  {
    module: 'Log Audit & Keamanan Sistem',
    masterAdmin: 'Penuh (Seluruh Internal & Klien)',
    admin: 'Terbatas Cakupan Sendiri',
    rekruter: 'Tidak Ada Akses',
    karyawan: 'Riwayat Login Pribadi',
  },
] as const;

export function countPendingApprovals(approvals: ApprovalRequestRecord[]): number {
  return approvals.filter((item) => item.status === 'Menunggu').length;
}

export function splitActiveEntitiesByCategory(entities: EntityRecord[]): {
  internalUnits: EntityRecord[];
  clientPlacements: EntityRecord[];
} {
  const active = entities.filter((e) => e.status === 'Aktif');
  return {
    internalUnits: active.filter((e) => e.category === 'Internal'),
    clientPlacements: active.filter((e) => e.category === 'Klien Penempatan'),
  };
}

export function formatAssignedScopesSummary(scopes: string[]): string {
  if (scopes.length === 0) return 'Belum ditetapkan';
  if (scopes.length === 1) return scopes[0];
  return `${scopes[0]} (+${scopes.length - 1} lainnya)`;
}

export function summarizeAttendanceLogs(logs: AttendanceLogRecord[]): {
  hadir: number;
  telat: number;
  cutiIzin: number;
  alpha: number;
} {
  return logs.reduce(
    (acc, item) => {
      if (item.status === 'Hadir') acc.hadir += 1;
      else if (item.status === 'Telat') acc.telat += 1;
      else if (item.status === 'Cuti' || item.status === 'Izin') acc.cutiIzin += 1;
      else if (item.status === 'Alpha') acc.alpha += 1;
      return acc;
    },
    { hadir: 0, telat: 0, cutiIzin: 0, alpha: 0 }
  );
}

export function filterAttendanceLogs(
  logs: AttendanceLogRecord[],
  query: string,
  statusFilter: AttendanceStatus | 'Semua',
  employmentFilter: EmploymentCategory | 'Semua' = 'Semua',
  entityFilter = 'Semua'
): AttendanceLogRecord[] {
  const q = query.trim().toLowerCase();
  return logs.filter((log) => {
    const matchesStatus = statusFilter === 'Semua' || log.status === statusFilter;
    const matchesEmp = employmentFilter === 'Semua' || log.employmentType === employmentFilter;
    const matchesEntity = entityFilter === 'Semua' || log.entityName === entityFilter;
    const matchesQuery =
      !q ||
      log.employeeName.toLowerCase().includes(q) ||
      log.employeeCode.toLowerCase().includes(q) ||
      log.entityName.toLowerCase().includes(q) ||
      log.locationUsed.toLowerCase().includes(q);
    return matchesStatus && matchesEmp && matchesEntity && matchesQuery;
  });
}

export function countExpiringPkwtContracts(contracts: ContractRecord[]): number {
  return contracts.filter(
    (c) =>
      c.contractType === 'PKWT' &&
      c.daysRemaining !== null &&
      c.daysRemaining <= 30 &&
      c.status !== 'Diperpanjang'
  ).length;
}

export function filterContracts(
  contracts: ContractRecord[],
  query: string,
  filterMode: 'Semua' | 'PKWT' | 'Segera Berakhir' | 'PKWTT'
): ContractRecord[] {
  const q = query.trim().toLowerCase();
  return contracts.filter((c) => {
    const matchesMode =
      filterMode === 'Semua' ||
      (filterMode === 'PKWT' && c.contractType === 'PKWT') ||
      (filterMode === 'PKWTT' && c.contractType === 'PKWTT') ||
      (filterMode === 'Segera Berakhir' &&
        (c.status === 'Segera Berakhir' || (c.daysRemaining !== null && c.daysRemaining <= 30)));
    const matchesQuery =
      !q ||
      c.employeeName.toLowerCase().includes(q) ||
      c.employeeCode.toLowerCase().includes(q) ||
      c.contractNumber.toLowerCase().includes(q) ||
      c.entityName.toLowerCase().includes(q);
    return matchesMode && matchesQuery;
  });
}

export function filterUsersByQueryAndRole(
  users: UserAccountRecord[],
  query: string,
  roleFilter: UserRoleName | 'Semua',
  employmentFilter: EmploymentCategory | 'Semua' = 'Semua'
): UserAccountRecord[] {
  const q = query.trim().toLowerCase();
  return users.filter((u) => {
    const matchesRole = roleFilter === 'Semua' || u.role === roleFilter;
    const matchesEmployment =
      employmentFilter === 'Semua' || u.employmentType === employmentFilter;
    const matchesQuery =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.employeeCode.toLowerCase().includes(q) ||
      (u.loginAlias ?? '').toLowerCase().includes(q) ||
      u.assignedScopes.some((scope) => scope.toLowerCase().includes(q));
    return matchesRole && matchesEmployment && matchesQuery;
  });
}

export function filterAuditLogs(
  logs: AuditLogRecord[],
  query: string,
  category: AuditLogRecord['category'] | 'Semua'
): AuditLogRecord[] {
  const q = query.trim().toLowerCase();
  return logs.filter((log) => {
    const matchesCat = category === 'Semua' || log.category === category;
    const matchesQuery =
      !q ||
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });
}

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp-1',
    employeeCode: 'EMP-1024',
    fullName: 'Raka Pratama',
    email: 'raka.pratama@swapro-demo.co.id',
    whatsappNumber: '081288901024',
    position: 'Staff Operasional & Tata Kelola',
    department: 'Operasional & Tata Kelola Internal',
    employmentType: 'Internal',
    entityName: 'Kantor Pusat Operasional',
    contractType: 'PKWTT',
    contractNumber: 'PKWTT-INT-2023/007',
    joinDate: '2023-03-15',
    contractEndDate: '',
    status: 'Aktif',
    nik: '3174051504960004',
    birthPlace: 'Jakarta',
    birthDate: '1996-04-15',
    gender: 'Laki-laki',
    religion: 'Islam',
    maritalStatus: 'Kawin',
    bloodType: 'O',
    education: 'S1 Manajemen',
    npwpNumber: '92.410.552.1-017.000',
    bpjsKesehatanNumber: '0002084192831',
    bpjsKetenagakerjaanNumber: '23018492014',
    salaryMonthly: 7450000,
    placementLocation: 'Kantor Pusat Operasional — Jakarta Selatan',
    ktpAddress: {
      street: 'Jl. Kemang Timur Raya No. 28',
      rtRw: '004/003',
      kelurahan: 'Bangka',
      kecamatan: 'Mampang Prapatan',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12730',
    },
    domicileSameAsKtp: true,
    domicileAddress: 'Jl. Kemang Timur Raya No. 28, RT 004/003, Bangka, Jakarta Selatan',
    kkNumber: '3174051908210012',
    headOfFamily: 'Raka Pratama',
    familyMembers: [
      {
        id: 'fam-1',
        name: 'Ayu Permatasari',
        relation: 'Pasangan',
        birthDate: '1997-09-12',
        nik: '3174055209970002',
      },
      {
        id: 'fam-2',
        name: 'Kenzo Pratama',
        relation: 'Anak',
        birthDate: '2023-01-20',
      },
    ],
    emergencyContact: {
      name: 'Ayu Permatasari',
      relation: 'Istri',
      phone: '081288909911',
    },
    bankName: 'Bank Mandiri',
    bankAccountNumber: '1240009812345',
    bankAccountHolder: 'Raka Pratama',
    bankBranch: 'KC Jakarta TB Simatupang',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: true,
      simUploaded: true,
      ijazahUploaded: true,
      sertifikatUploaded: true,
      passFotoUploaded: true,
      skckUploaded: true,
      transkripNilaiUploaded: true,
      bankBookUploaded: true,
      contractUploaded: true,
    },
  },
  {
    id: 'emp-2',
    employeeCode: 'OUT-318',
    fullName: 'Nadia Kusuma',
    email: 'nadia.kusuma@swapro-demo.co.id',
    whatsappNumber: '085691230318',
    position: 'Customer Service Cabang',
    department: 'Tim Layanan Klien BAF',
    employmentType: 'Penempatan Klien',
    entityName: 'BAF — Layanan Operasional Cabang',
    contractType: 'PKWT',
    contractNumber: 'PKWT-CLN-2025/089',
    joinDate: '2025-12-01',
    contractEndDate: '2026-11-30',
    status: 'Aktif',
    nik: '3171036108990003',
    birthPlace: 'Bekasi',
    birthDate: '1999-08-21',
    gender: 'Perempuan',
    religion: 'Islam',
    maritalStatus: 'Belum Kawin',
    bloodType: 'A',
    education: 'D3 Administrasi Bisnis',
    npwpNumber: '94.112.309.4-022.000',
    bpjsKesehatanNumber: '0002194058124',
    bpjsKetenagakerjaanNumber: '25120948120',
    salaryMonthly: 5520000,
    placementLocation: 'BAF Cabang Sudirman',
    placementId: 'loc-baf-sudirman',
    placementName: 'BAF Cabang Sudirman',
    placementArea: 'Jakarta Pusat',
    placementMapsUrl: 'https://maps.google.com/?q=Jl.+Jend.+Sudirman+Kav.+21,+Jakarta+Pusat',
    contractHistory: [
      {
        id: 'hist-emp-2-1',
        sequenceLabel: 'PKWT Ke-1',
        contractType: 'PKWT',
        contractNumber: 'PKWT-CLN-2025/089',
        startDate: '2025-12-01',
        endDate: '2026-11-30',
        entityName: 'BAF — Layanan Operasional Cabang',
        placementName: 'BAF Cabang Sudirman',
        placementArea: 'Jakarta Pusat',
        placementMapsUrl: 'https://maps.google.com/?q=Jl.+Jend.+Sudirman+Kav.+21,+Jakarta+Pusat',
        position: 'Customer Service Cabang',
        signatureStatus: 'Sudah TTD Digital',
        signedAt: '01 Des 2025 · 09:15',
        signerEmployeeName: 'Nadia Kusuma',
        notes: 'Kontrak tahun pertama — mendekati EOC.',
      },
    ],
    ktpAddress: {
      street: 'Jl. Cempaka Putih Tengah XVII No. 11',
      rtRw: '002/005',
      kelurahan: 'Cempaka Putih Timur',
      kecamatan: 'Cempaka Putih',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      postalCode: '10510',
    },
    domicileSameAsKtp: true,
    domicileAddress: 'Jl. Cempaka Putih Tengah XVII No. 11, Cempaka Putih, Jakarta Pusat',
    kkNumber: '3171030502140008',
    headOfFamily: 'Hendra Kusuma',
    familyMembers: [
      {
        id: 'fam-3',
        name: 'Hendra Kusuma',
        relation: 'Orang Tua',
        birthDate: '1969-05-03',
      },
      {
        id: 'fam-4',
        name: 'Sri Wahyuni',
        relation: 'Orang Tua',
        birthDate: '1973-11-18',
      },
    ],
    emergencyContact: {
      name: 'Hendra Kusuma',
      relation: 'Ayah Kandung',
      phone: '081310045588',
    },
    bankName: 'BCA',
    bankAccountNumber: '5220394810',
    bankAccountHolder: 'Nadia Kusuma',
    bankBranch: 'KCP Cempaka Putih',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: true,
      simUploaded: false,
      ijazahUploaded: true,
      sertifikatUploaded: true,
      passFotoUploaded: true,
      skckUploaded: true,
      transkripNilaiUploaded: true,
      bankBookUploaded: true,
      contractUploaded: true,
    },
  },
  {
    id: 'emp-3',
    employeeCode: 'OUT-512',
    fullName: 'Teguh Santoso',
    email: 'teguh.santoso@swapro-demo.co.id',
    whatsappNumber: '081331550512',
    position: 'Surveyor Lapangan Regional',
    department: 'Tim Operasional Klien FIFGROUP',
    employmentType: 'Penempatan Klien',
    entityName: 'FIFGROUP — Area Jawa Timur',
    contractType: 'PKWT',
    contractNumber: 'PKWT-CLN-2025/104',
    joinDate: '2025-12-10',
    contractEndDate: '2026-12-09',
    status: 'Aktif',
    nik: '3578041207950002',
    birthPlace: 'Surabaya',
    birthDate: '1995-07-12',
    gender: 'Laki-laki',
    religion: 'Islam',
    maritalStatus: 'Kawin',
    bloodType: 'B',
    education: 'S1 Ekonomi',
    npwpNumber: '88.331.418.2-611.000',
    bpjsKesehatanNumber: '0002019482716',
    bpjsKetenagakerjaanNumber: '25120994811',
    salaryMonthly: 5250000,
    placementLocation: 'FIFGROUP — Area Jawa Timur (Surabaya)',
    ktpAddress: {
      street: 'Jl. Gubeng Kertajaya V C No. 40',
      rtRw: '006/004',
      kelurahan: 'Kertajaya',
      kecamatan: 'Gubeng',
      city: 'Surabaya',
      province: 'Jawa Timur',
      postalCode: '60282',
    },
    domicileSameAsKtp: false,
    domicileAddress: 'Perum Taman Pondok Indah Blok D-14, Wiyung, Surabaya',
    kkNumber: '3578042209220007',
    headOfFamily: 'Teguh Santoso',
    familyMembers: [
      {
        id: 'fam-5',
        name: 'Rina Puspita',
        relation: 'Pasangan',
        birthDate: '1996-10-08',
      },
    ],
    emergencyContact: {
      name: 'Rina Puspita',
      relation: 'Istri',
      phone: '081331557700',
    },
    bankName: 'BRI',
    bankAccountNumber: '009601048291503',
    bankAccountHolder: 'Teguh Santoso',
    bankBranch: 'KC Surabaya Kaliasin',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: true,
      simUploaded: true,
      ijazahUploaded: true,
      sertifikatUploaded: false,
      passFotoUploaded: true,
      skckUploaded: true,
      transkripNilaiUploaded: true,
      bankBookUploaded: true,
      contractUploaded: true,
    },
  },
  {
    id: 'emp-4',
    employeeCode: 'INT-118',
    fullName: 'Larasati Dewi',
    email: 'larasati.dewi@swapro-demo.co.id',
    whatsappNumber: '082114090118',
    position: 'Talent & Training Specialist',
    department: 'Akuisisi Talenta & Seleksi Klien',
    employmentType: 'Internal',
    entityName: 'Pusat Rekrutmen & Pelatihan',
    contractType: 'PKWT',
    contractNumber: 'PKWT-INT-2025/041',
    joinDate: '2026-01-01',
    contractEndDate: '2026-12-31',
    status: 'Aktif',
    nik: '3273024403980005',
    birthPlace: 'Bandung',
    birthDate: '1998-03-04',
    gender: 'Perempuan',
    religion: 'Islam',
    maritalStatus: 'Belum Kawin',
    bloodType: 'AB',
    education: 'S1 Psikologi',
    npwpNumber: '93.774.210.8-423.000',
    bpjsKesehatanNumber: '0002291049582',
    bpjsKetenagakerjaanNumber: '26018492019',
    salaryMonthly: 6150000,
    placementLocation: 'Pusat Rekrutmen & Pelatihan — Bandung',
    ktpAddress: {
      street: 'Jl. Buah Batu Dalam No. 19',
      rtRw: '003/007',
      kelurahan: 'Turangga',
      kecamatan: 'Lengkong',
      city: 'Bandung',
      province: 'Jawa Barat',
      postalCode: '40264',
    },
    domicileSameAsKtp: true,
    domicileAddress: 'Jl. Buah Batu Dalam No. 19, Turangga, Bandung',
    kkNumber: '3273021406100019',
    headOfFamily: 'Bambang Wijanarko',
    familyMembers: [
      {
        id: 'fam-6',
        name: 'Bambang Wijanarko',
        relation: 'Orang Tua',
        birthDate: '1967-02-11',
      },
    ],
    emergencyContact: {
      name: 'Bambang Wijanarko',
      relation: 'Ayah Kandung',
      phone: '08112203940',
    },
    bankName: 'BNI',
    bankAccountNumber: '0419823711',
    bankAccountHolder: 'Larasati Dewi',
    bankBranch: 'KC Bandung Asia Afrika',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: true,
      simUploaded: true,
      ijazahUploaded: true,
      sertifikatUploaded: true,
      passFotoUploaded: true,
      skckUploaded: false,
      transkripNilaiUploaded: true,
      bankBookUploaded: true,
      contractUploaded: true,
    },
  },
  {
    id: 'emp-5',
    employeeCode: 'OUT-405',
    fullName: 'Bima Saputra',
    email: 'bima.saputra@swapro-demo.co.id',
    whatsappNumber: '081775220405',
    position: 'Field Coordinator Area',
    department: 'Tim Lapangan & Dukungan Klien Adira',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    contractType: 'PKWT',
    contractNumber: 'PKWT-CLN-2026/012',
    joinDate: '2026-04-01',
    contractEndDate: '2027-03-31',
    status: 'Aktif',
    nik: '3276010911940006',
    birthPlace: 'Depok',
    birthDate: '1994-11-09',
    gender: 'Laki-laki',
    religion: 'Kristen',
    maritalStatus: 'Kawin',
    bloodType: 'O',
    education: 'S1 Teknik Industri',
    npwpNumber: '86.992.104.5-412.000',
    bpjsKesehatanNumber: '0002309182745',
    bpjsKetenagakerjaanNumber: '26049182734',
    salaryMonthly: 5850000,
    placementLocation: 'Adira Tebet',
    placementId: 'loc-adr-tebet',
    placementName: 'Adira Tebet',
    placementArea: 'Jabodetabek',
    placementMapsUrl: 'https://maps.google.com/?q=Adira+Finance+Tebet,+Jakarta+Selatan',
    contractHistory: [
      {
        id: 'hist-emp-5-0',
        sequenceLabel: 'PKWT Ke-1',
        contractType: 'PKWT',
        contractNumber: 'PKWT-CLN-2025/012',
        startDate: '2025-04-01',
        endDate: '2026-03-31',
        entityName: 'Adira Finance — Penempatan Regional',
        placementName: 'Adira Bekasi',
        placementArea: 'Jabodetabek',
        position: 'Sales Officer',
        signatureStatus: 'Selesai / Digantikan',
        signedAt: '01 Apr 2025 · 10:00',
        signerEmployeeName: 'Bima Saputra',
        notes: 'Selesai periode pertama, diperpanjang ke PKWT Ke-2.',
      },
      {
        id: 'hist-emp-5-1',
        sequenceLabel: 'PKWT Ke-2',
        contractType: 'PKWT',
        contractNumber: 'PKWT-CLN-2026/012',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        entityName: 'Adira Finance — Penempatan Regional',
        placementName: 'Adira Tebet',
        placementArea: 'Jabodetabek',
        placementMapsUrl: 'https://maps.google.com/?q=Adira+Finance+Tebet,+Jakarta+Selatan',
        position: 'Field Coordinator Area',
        signatureStatus: 'Sudah TTD Digital',
        signedAt: '01 Apr 2026 · 08:45',
        signerEmployeeName: 'Bima Saputra',
        notes: 'Perpanjangan aktif penempatan Adira Tebet.',
      },
    ],
    ktpAddress: {
      street: 'Jl. Nusantara Raya No. 72',
      rtRw: '005/002',
      kelurahan: 'Depok Jaya',
      kecamatan: 'Pancoran Mas',
      city: 'Depok',
      province: 'Jawa Barat',
      postalCode: '16432',
    },
    domicileSameAsKtp: true,
    domicileAddress: 'Jl. Nusantara Raya No. 72, Depok Jaya, Depok',
    kkNumber: '3276010811210004',
    headOfFamily: 'Bima Saputra',
    familyMembers: [
      {
        id: 'fam-7',
        name: 'Clara Magdalena',
        relation: 'Pasangan',
        birthDate: '1995-06-27',
      },
    ],
    emergencyContact: {
      name: 'Clara Magdalena',
      relation: 'Istri',
      phone: '081775229988',
    },
    bankName: 'BCA',
    bankAccountNumber: '7401293847',
    bankAccountHolder: 'Bima Saputra',
    bankBranch: 'KCU Margonda Depok',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: true,
      simUploaded: true,
      ijazahUploaded: true,
      sertifikatUploaded: true,
      passFotoUploaded: true,
      skckUploaded: true,
      transkripNilaiUploaded: true,
      bankBookUploaded: true,
      contractUploaded: true,
    },
  },
  {
    id: 'emp-6',
    employeeCode: 'NEW-209',
    loginAlias: 'swa-rudi',
    portalPassword: '1234',
    fullName: 'Rudi Hartono',
    email: 'swa-rudi@swapro-demo.co.id',
    whatsappNumber: '087880110209',
    position: 'Staf Verifikasi Dokumen Klien',
    department: 'Tim Lapangan & Dukungan Klien Adira',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    contractType: 'PKWT',
    contractNumber: 'PKWT-CLN-2026/118',
    joinDate: '2026-11-02',
    contractEndDate: '2027-05-01',
    status: 'Probation',
    nik: '3674062502000001',
    birthPlace: 'Tangerang Selatan',
    birthDate: '2000-02-25',
    gender: 'Laki-laki',
    religion: 'Islam',
    maritalStatus: 'Belum Kawin',
    bloodType: 'B',
    education: 'S1 Akuntansi',
    npwpNumber: '96.201.884.1-411.000',
    bpjsKesehatanNumber: '',
    bpjsKetenagakerjaanNumber: '',
    salaryMonthly: 5300000,
    placementLocation: 'Adira Tebet',
    placementId: 'loc-adr-tebet',
    placementName: 'Adira Tebet',
    placementArea: 'Jabodetabek',
    placementMapsUrl: 'https://maps.google.com/?q=Adira+Finance+Tebet,+Jakarta+Selatan',
    isNewHire: true,
    createdAtIso: '2026-11-12',
    contractHistory: [
      {
        id: 'hist-emp-6-1',
        sequenceLabel: 'PKWT Ke-1',
        contractType: 'PKWT',
        contractNumber: 'PKWT-CLN-2026/118',
        startDate: '2026-11-02',
        endDate: '2027-05-01',
        entityName: 'Adira Finance — Penempatan Regional',
        placementName: 'Adira Tebet',
        placementArea: 'Jabodetabek',
        placementMapsUrl: 'https://maps.google.com/?q=Adira+Finance+Tebet,+Jakarta+Selatan',
        position: 'Staf Verifikasi Dokumen Klien',
        signatureStatus: 'Menunggu TTD Karyawan',
        notes: 'PKWT pertama menunggu tanda tangan digital di Portal Karyawan.',
      },
    ],
    ktpAddress: {
      street: 'Jl. Ciputat Raya Pondok Ranji No. 5',
      rtRw: '001/008',
      kelurahan: 'Pondok Ranji',
      kecamatan: 'Ciputat Timur',
      city: 'Tangerang Selatan',
      province: 'Banten',
      postalCode: '15412',
    },
    domicileSameAsKtp: true,
    domicileAddress: 'Jl. Ciputat Raya Pondok Ranji No. 5, Ciputat Timur, Tangerang Selatan',
    kkNumber: '3674061105160003',
    headOfFamily: 'Surya Wijaya',
    familyMembers: [
      {
        id: 'fam-8',
        name: 'Surya Wijaya',
        relation: 'Orang Tua',
        birthDate: '1970-08-17',
      },
    ],
    emergencyContact: {
      name: 'Surya Wijaya',
      relation: 'Ayah Kandung',
      phone: '081210948811',
    },
    bankName: 'Bank Mandiri',
    bankAccountNumber: '1640005129801',
    bankAccountHolder: 'Rudi Hartono',
    bankBranch: 'KCP Bintaro Sektor 9',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: true,
      simUploaded: false,
      ijazahUploaded: true,
      sertifikatUploaded: false,
      passFotoUploaded: true,
      skckUploaded: false,
      transkripNilaiUploaded: true,
      bankBookUploaded: false,
      contractUploaded: false,
    },
  },
];

export const INITIAL_ONBOARDING_CANDIDATES: OnboardingCandidateRecord[] = [
  {
    id: 'onb-1',
    candidateCode: 'ATS-2026-081',
    fullName: 'Dewi Anggraini',
    email: 'dewi.anggraini@kandidat-mail.id',
    whatsappNumber: '081388770091',
    position: 'Customer Service & Verifikasi Klien',
    employmentType: 'Penempatan Klien',
    entityName: 'Adira Finance — Penempatan Regional',
    recruiterName: 'Rama Wijaya',
    targetJoinDate: '2026-11-18',
    proposedContractType: 'PKWT',
    proposedEndDate: '2027-11-17',
    documentsReadyCount: 9,
    status: 'Siap Onboarding',
  },
  {
    id: 'onb-2',
    candidateCode: 'ATS-2026-084',
    fullName: 'Galih Permana',
    email: 'galih.permana@kandidat-mail.id',
    whatsappNumber: '085711229934',
    position: 'Petugas Operasional Cabang',
    employmentType: 'Penempatan Klien',
    entityName: 'BAF — Layanan Operasional Cabang',
    recruiterName: 'Rama Wijaya',
    targetJoinDate: '2026-11-20',
    proposedContractType: 'PKWT',
    proposedEndDate: '2027-05-19',
    documentsReadyCount: 8,
    status: 'Siap Onboarding',
  },
  {
    id: 'onb-3',
    candidateCode: 'ATS-2026-089',
    fullName: 'Bagas Prakasa',
    email: 'bagas.prakasa@kandidat-mail.id',
    whatsappNumber: '081234901122',
    position: 'Surveyor Regional Surabaya',
    employmentType: 'Penempatan Klien',
    entityName: 'FIFGROUP — Area Jawa Timur',
    recruiterName: 'Rama Wijaya',
    targetJoinDate: '2026-11-25',
    proposedContractType: 'PKWT',
    proposedEndDate: '2027-11-24',
    documentsReadyCount: 10,
    status: 'Siap Onboarding',
  },
  {
    id: 'onb-4',
    candidateCode: 'ATS-2026-092',
    fullName: 'Melati Kartika',
    email: 'melati.kartika@kandidat-mail.id',
    whatsappNumber: '081908776655',
    position: 'Staff Tata Kelola Operasional',
    employmentType: 'Internal',
    entityName: 'Kantor Pusat Operasional',
    recruiterName: 'Rama Wijaya',
    targetJoinDate: '2026-12-01',
    proposedContractType: 'PKWT',
    proposedEndDate: '2027-11-30',
    documentsReadyCount: 11,
    status: 'Siap Onboarding',
  },
];

export function countUploadedDocuments(docs: EmployeeDocumentsRecord): {
  completed: number;
  total: number;
} {
  const total = DOCUMENT_CHECKLIST_ITEMS.length;
  const completed = DOCUMENT_CHECKLIST_ITEMS.filter((item) => Boolean(docs[item.key])).length;
  return { completed, total };
}

export function filterByAssignedScopes<T extends { entityName: string }>(
  items: T[],
  assignedScopes: string[],
  selectedScope = 'Semua Cakupan'
): T[] {
  if (assignedScopes.length === 0) return [];
  return items.filter((item) => {
    const inAssigned = assignedScopes.includes(item.entityName);
    if (!inAssigned) return false;
    return selectedScope === 'Semua Cakupan' || item.entityName === selectedScope;
  });
}

const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatIndonesianDate(isoDate: string): string {
  if (!isoDate) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const [, year, monthStr, day] = match;
  const monthIdx = Number(monthStr) - 1;
  const monthLabel = ID_MONTHS[monthIdx] ?? monthStr;
  return `${day} ${monthLabel} ${year}`;
}

export function calculateDaysRemaining(
  contractEndDate: string,
  referenceIsoDate = '2026-11-12'
): number | null {
  if (!contractEndDate) return null;
  const end = new Date(`${contractEndDate}T00:00:00Z`).getTime();
  const ref = new Date(`${referenceIsoDate}T00:00:00Z`).getTime();
  if (Number.isNaN(end) || Number.isNaN(ref)) return null;
  return Math.round((end - ref) / (1000 * 60 * 60 * 24));
}

export function maskSensitiveNumber(value: string, visibleStart = 4, visibleEnd = 4): string {
  const clean = value.trim();
  if (!clean) return '—';
  if (clean.length <= visibleStart + visibleEnd) {
    return `${clean.slice(0, 2)}${'•'.repeat(Math.max(2, clean.length - 2))}`;
  }
  const hiddenLen = Math.min(8, clean.length - visibleStart - visibleEnd);
  return `${clean.slice(0, visibleStart)}${'•'.repeat(hiddenLen)}${clean.slice(-visibleEnd)}`;
}

export type EmployeeContractFilterMode =
  | 'Semua'
  | 'PKWT'
  | 'PKWTT'
  | 'Probation'
  | 'Segera Habis'
  | 'Baru';

export interface EocIndicatorResult {
  daysRemaining: number | null;
  isExpiring: boolean;
  isExpired: boolean;
  severity: 'normal' | 'warning' | 'danger';
  badgeLabel: string;
}

export function getContractEocIndicator(
  contractType: 'PKWT' | 'PKWTT',
  contractEndDate: string,
  referenceIsoDate = '2026-11-12'
): EocIndicatorResult {
  if (contractType === 'PKWTT') {
    return {
      daysRemaining: null,
      isExpiring: false,
      isExpired: false,
      severity: 'normal',
      badgeLabel: 'Karyawan Tetap',
    };
  }
  const daysRemaining = calculateDaysRemaining(contractEndDate, referenceIsoDate);
  if (daysRemaining === null) {
    return {
      daysRemaining: null,
      isExpiring: false,
      isExpired: false,
      severity: 'normal',
      badgeLabel: '',
    };
  }
  if (daysRemaining < 0) {
    return {
      daysRemaining,
      isExpiring: true,
      isExpired: true,
      severity: 'danger',
      badgeLabel: `Lewat EOC (${Math.abs(daysRemaining)} hr)`,
    };
  }
  if (daysRemaining <= 7) {
    return {
      daysRemaining,
      isExpiring: true,
      isExpired: false,
      severity: 'danger',
      badgeLabel: `Habis ${daysRemaining} hr lagi`,
    };
  }
  if (daysRemaining <= 30) {
    return {
      daysRemaining,
      isExpiring: true,
      isExpired: false,
      severity: 'warning',
      badgeLabel: `Segera Habis (${daysRemaining} hr)`,
    };
  }
  return {
    daysRemaining,
    isExpiring: false,
    isExpired: false,
    severity: 'normal',
    badgeLabel: '',
  };
}

export function extractEntityNikPrefix(
  entity?: Pick<EntityRecord, 'code' | 'name' | 'category'> | null
): string {
  if (!entity) return 'KRY';
  const rawCode = entity.code.trim().toUpperCase();
  const dashIdx = rawCode.indexOf('-');
  if (dashIdx !== -1) {
    const suffix = rawCode.slice(dashIdx + 1).replace(/[^A-Z0-9]/g, '');
    if (suffix.length >= 2 && suffix.length <= 5) {
      if (entity.category === 'Internal' && rawCode.startsWith('INT')) {
        return 'INT';
      }
      return suffix;
    }
  }
  const letters = entity.name
    .replace(/[^A-Za-z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.toUpperCase() !== 'PT' && w.toUpperCase() !== 'CV');
  if (letters.length > 0 && letters[0].length >= 3) {
    return letters[0].slice(0, 3).toUpperCase();
  }
  return entity.category === 'Internal' ? 'INT' : 'CLN';
}

export function generateClientEmployeeNik(
  entity: Pick<EntityRecord, 'code' | 'name' | 'category'> | null | undefined,
  existingEmployees: Array<Pick<EmployeeRecord, 'employeeCode'>>
): string {
  const prefix = extractEntityNikPrefix(entity);
  const matcher = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let maxSeq = 0;
  for (const emp of existingEmployees) {
    const m = matcher.exec(emp.employeeCode.trim());
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}

export function normalizeWhatsappNumberToInternational(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export function buildNewAccountShareDetails(
  emp: Pick<
    EmployeeRecord,
    | 'fullName'
    | 'employeeCode'
    | 'email'
    | 'entityName'
    | 'placementName'
    | 'placementLocation'
    | 'position'
    | 'originApplicantCode'
    | 'portalPassword'
  >,
  hasSelfRegisteredPassword = Boolean(emp.originApplicantCode)
): {
  subject: string;
  body: string;
} {
  const placementLabel = emp.placementName || emp.placementLocation || emp.entityName;
  const activePassword = emp.portalPassword?.trim() || '1234';
  const passwordHint = hasSelfRegisteredPassword
    ? `Kata Sandi / PIN Login: ${activePassword} (sesuai akun pendaftaran atau pembaruan HR)`
    : `Kata Sandi / PIN Login: ${activePassword}`;

  const subject = `Aktivasi Akun Karyawan & PKWT Digital PEVORA — ${emp.fullName} (${emp.employeeCode})`;
  const body = [
    `Halo ${emp.fullName},`,
    '',
    `Selamat! Anda telah resmi diterima sebagai Karyawan (${emp.position}) pada penempatan ${emp.entityName}${placementLabel && placementLabel !== emp.entityName ? ` — ${placementLabel}` : ''}.`,
    '',
    'Berikut akses Portal Karyawan PEVORA Anda:',
    `- NIK (Nomor Induk Karyawan): ${emp.employeeCode}`,
    `- Email Login: ${emp.email}`,
    `- ${passwordHint}`,
    '',
    'Setelah masuk ke Portal Karyawan, silakan buka menu Kontrak untuk membaca dan menandatangani dokumen PKWT Anda secara digital.',
    '',
    'Terima kasih,',
    'Tim HR PEVORA / PT Swapro Nusantara',
  ].join('\n');

  return { subject, body };
}

export interface PortalAccountStatsSummary {
  totalActiveAccounts: number;
  activeInternalCount: number;
  activeEmployeeCount: number;
  activeApplicantCount: number;
  pendingPkwtEmployeeAccounts: number;
  disabledOrLockedAccounts: number;
}

export function summarizePortalAccountStats(
  users: UserAccountRecord[],
  employees: EmployeeRecord[],
  applicants: Array<{
    id: string;
    applicantCode: string;
    accountDisabled?: boolean;
    convertedToEmployeeCode?: string;
  }> = []
): PortalAccountStatsSummary {
  const internalUsers = users.filter(
    (u) => u.role === 'Master Admin' || u.role === 'Admin' || u.role === 'Rekruter'
  );
  const activeInternalCount = internalUsers.filter((u) => u.status === 'Aktif').length;
  const disabledInternalCount = internalUsers.filter((u) => u.status !== 'Aktif').length;

  const activeEmployeeCount = employees.filter(
    (e) => e.status !== 'Nonaktif' && !e.accountDisabled
  ).length;
  const disabledEmployeeCount = employees.filter(
    (e) => e.status === 'Nonaktif' || Boolean(e.accountDisabled)
  ).length;

  const pendingPkwtEmployeeAccounts = employees.filter((e) => {
    if (e.status === 'Nonaktif' || e.accountDisabled) return false;
    const latest = e.contractHistory?.[e.contractHistory.length - 1];
    if (latest) {
      return latest.signatureStatus === 'Menunggu TTD Karyawan';
    }
    return e.contractType === 'PKWT' && !e.documents.contractUploaded;
  }).length;

  let activeApplicantCount = 0;
  let disabledApplicantCount = 0;
  for (const app of applicants) {
    const isConverted =
      Boolean(app.convertedToEmployeeCode) ||
      employees.some(
        (e) =>
          e.applicantId === app.id ||
          (e.originApplicantCode &&
            e.originApplicantCode.toLowerCase() === app.applicantCode.toLowerCase())
      );
    if (isConverted || app.accountDisabled) {
      disabledApplicantCount += 1;
    } else {
      activeApplicantCount += 1;
    }
  }

  return {
    totalActiveAccounts: activeInternalCount + activeEmployeeCount + activeApplicantCount,
    activeInternalCount,
    activeEmployeeCount,
    activeApplicantCount,
    pendingPkwtEmployeeAccounts,
    disabledOrLockedAccounts:
      disabledInternalCount + disabledEmployeeCount + disabledApplicantCount,
  };
}

export function buildEmployeeWhatsappUrl(
  emp: Pick<
    EmployeeRecord,
    | 'fullName'
    | 'employeeCode'
    | 'email'
    | 'whatsappNumber'
    | 'entityName'
    | 'placementName'
    | 'placementLocation'
    | 'position'
    | 'contractType'
    | 'contractEndDate'
    | 'originApplicantCode'
    | 'portalPassword'
    | 'contractHistory'
  >,
  mode: 'auto' | 'account-pkwt' | 'eoc-reminder' = 'auto'
): string {
  const intlWa = normalizeWhatsappNumberToInternational(emp.whatsappNumber);
  if (!intlWa) return '#';

  const latestHistory = emp.contractHistory?.[emp.contractHistory.length - 1];
  const eoc = getContractEocIndicator(emp.contractType, emp.contractEndDate);
  const resolvedMode =
    mode !== 'auto'
      ? mode
      : latestHistory?.signatureStatus === 'Menunggu TTD Karyawan'
        ? 'account-pkwt'
        : eoc.isExpiring
          ? 'eoc-reminder'
          : 'general';

  let text = '';
  if (resolvedMode === 'account-pkwt') {
    text = buildNewAccountShareDetails(emp).body;
  } else if (resolvedMode === 'eoc-reminder') {
    text = [
      `Halo ${emp.fullName} (NIK: ${emp.employeeCode}),`,
      '',
      `Menginformasikan bahwa kontrak PKWT Anda di ${emp.entityName}${emp.placementName ? ` (${emp.placementName})` : ''} berakhir pada ${formatIndonesianDate(emp.contractEndDate)} (${eoc.badgeLabel}).`,
      'Mohon konfirmasi kesiapan perpanjangan kontrak melalui pesan ini agar tim HR dapat memproses PKWT periode berikutnya.',
      '',
      'Terima kasih,',
      'Tim HR PEVORA / PT Swapro Nusantara',
    ].join('\n');
  } else {
    text = [
      `Halo ${emp.fullName} (NIK: ${emp.employeeCode}),`,
      `Kami dari Tim HR PEVORA (${emp.entityName}) ingin berkoordinasi terkait administrasi kepegawaian Anda.`,
    ].join('\n');
  }

  return `https://wa.me/${intlWa}?text=${encodeURIComponent(text)}`;
}

export function buildEmployeeMailtoUrl(
  emp: Pick<
    EmployeeRecord,
    | 'fullName'
    | 'employeeCode'
    | 'email'
    | 'entityName'
    | 'placementName'
    | 'placementLocation'
    | 'position'
    | 'contractType'
    | 'contractEndDate'
    | 'originApplicantCode'
    | 'portalPassword'
    | 'contractHistory'
  >,
  mode: 'auto' | 'account-pkwt' | 'eoc-reminder' = 'auto'
): string {
  if (!emp.email.trim()) return '#';
  const latestHistory = emp.contractHistory?.[emp.contractHistory.length - 1];
  const eoc = getContractEocIndicator(emp.contractType, emp.contractEndDate);
  const resolvedMode =
    mode !== 'auto'
      ? mode
      : latestHistory?.signatureStatus === 'Menunggu TTD Karyawan'
        ? 'account-pkwt'
        : eoc.isExpiring
          ? 'eoc-reminder'
          : 'general';

  let subject = `Koordinasi HR PEVORA — ${emp.fullName} (${emp.employeeCode})`;
  let body = `Halo ${emp.fullName} (NIK: ${emp.employeeCode}),\n\nKami dari Tim HR PEVORA (${emp.entityName}) ingin menghubungi Anda terkait administrasi kepegawaian.\n\nTerima kasih,\nTim HR PEVORA`;

  if (resolvedMode === 'account-pkwt') {
    const share = buildNewAccountShareDetails(emp);
    subject = share.subject;
    body = share.body;
  } else if (resolvedMode === 'eoc-reminder') {
    subject = `Pengingat Masa Berakhir Kontrak PKWT (${eoc.badgeLabel}) — ${emp.fullName} (${emp.employeeCode})`;
    body = [
      `Halo ${emp.fullName},`,
      '',
      `Kami menginformasikan bahwa masa kontrak PKWT Anda (${emp.position} · ${emp.entityName}) akan berakhir pada ${formatIndonesianDate(emp.contractEndDate)} (${eoc.badgeLabel}).`,
      'Silakan balas email ini atau hubungi Admin HR untuk konfirmasi proses perpanjangan kontrak.',
      '',
      'Terima kasih,',
      'Tim HR PEVORA / PT Swapro Nusantara',
    ].join('\n');
  }

  return `mailto:${emp.email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function filterEmployees(
  employees: EmployeeRecord[],
  query: string,
  employmentFilter: EmploymentCategory | 'Semua' = 'Semua',
  contractFilter: EmployeeContractFilterMode = 'Semua',
  entityFilter = 'Semua'
): EmployeeRecord[] {
  const q = query.trim().toLowerCase();
  return employees.filter((emp) => {
    const matchesEmp = employmentFilter === 'Semua' || emp.employmentType === employmentFilter;
    const matchesEntity = entityFilter === 'Semua' || emp.entityName === entityFilter;
    const eoc = getContractEocIndicator(emp.contractType, emp.contractEndDate);
    const matchesContract =
      contractFilter === 'Semua' ||
      (contractFilter === 'Probation'
        ? emp.status === 'Probation'
        : contractFilter === 'Segera Habis'
          ? eoc.isExpiring
          : contractFilter === 'Baru'
            ? Boolean(emp.isNewHire)
            : emp.contractType === contractFilter);
    const matchesQuery =
      !q ||
      emp.fullName.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.whatsappNumber.toLowerCase().includes(q) ||
      emp.nik.includes(q) ||
      emp.kkNumber.includes(q) ||
      emp.entityName.toLowerCase().includes(q) ||
      (emp.placementName ?? '').toLowerCase().includes(q) ||
      (emp.placementArea ?? '').toLowerCase().includes(q) ||
      emp.position.toLowerCase().includes(q);
    return matchesEmp && matchesEntity && matchesContract && matchesQuery;
  });
}

export function validateEmployeeInput(input: EmployeeFormInput): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const waDigits = input.whatsappNumber.replace(/[^0-9]/g, '');
  const nikDigits = input.nik.replace(/\s+/g, '');
  const kkDigits = input.kkNumber.replace(/\s+/g, '');
  const bankAcctDigits = input.bankAccountNumber.replace(/\s+/g, '');

  if (!input.employeeCode.trim()) errors.employeeCode = 'NIK (Nomor Induk Karyawan) wajib diisi.';
  if (!input.fullName.trim()) errors.fullName = 'Nama lengkap sesuai KTP wajib diisi.';
  if (!emailRegex.test(input.email.trim())) errors.email = 'Format email aktif tidak valid.';
  if (waDigits.length < 10 || waDigits.length > 15) {
    errors.whatsappNumber = 'Nomor WhatsApp harus terdiri dari 10–15 digit angka.';
  }
  if (!input.position.trim()) errors.position = 'Jabatan wajib diisi.';
  if (!input.entityName.trim()) errors.entityName = 'Unit internal atau klien penempatan wajib dipilih.';
  if (!input.joinDate.trim()) errors.joinDate = 'Tanggal join wajib diisi.';

  if (input.contractType === 'PKWT') {
    if (!input.contractEndDate.trim()) {
      errors.contractEndDate = 'End of contract wajib diisi untuk karyawan PKWT.';
    } else if (input.joinDate && input.contractEndDate < input.joinDate) {
      errors.contractEndDate = 'End of contract tidak boleh lebih awal dari tanggal join.';
    }
  }

  if (!/^\d{16}$/.test(nikDigits)) {
    errors.nik = 'NIK KTP wajib berisi tepat 16 digit angka.';
  }
  if (!/^\d{16}$/.test(kkDigits)) {
    errors.kkNumber = 'Nomor Kartu Keluarga (KK) wajib berisi tepat 16 digit angka.';
  }
  if (!input.headOfFamily.trim()) {
    errors.headOfFamily = 'Nama kepala keluarga pada KK wajib diisi.';
  }
  if (!input.ktpAddress.street.trim() || !input.ktpAddress.city.trim()) {
    errors.ktpStreet = 'Alamat jalan dan kota/kabupaten sesuai KTP wajib dilengkapi.';
  }
  if (!input.bankName.trim()) {
    errors.bankName = 'Nama bank wajib dipilih atau diisi.';
  }
  if (!/^\d{8,20}$/.test(bankAcctDigits)) {
    errors.bankAccountNumber = 'Nomor rekening administratif wajib berisi 8–20 digit angka.';
  }
  if (!input.bankAccountHolder.trim()) {
    errors.bankAccountHolder = 'Nama pemilik / penerima rekening wajib diisi.';
  }

  const bpjsKesDigits = (input.bpjsKesehatanNumber ?? '').replace(/\s+/g, '');
  if (bpjsKesDigits && !/^\d{11,13}$/.test(bpjsKesDigits)) {
    errors.bpjsKesehatanNumber =
      'Nomor BPJS Kesehatan (JKN-KIS) harus berupa 11–13 digit angka.';
  }

  const bpjsTkClean = (input.bpjsKetenagakerjaanNumber ?? '').replace(/\s+/g, '');
  if (bpjsTkClean && !/^[A-Za-z0-9]{11,16}$/.test(bpjsTkClean)) {
    errors.bpjsKetenagakerjaanNumber =
      'Nomor KPJ BPJS Ketenagakerjaan harus berupa 11–16 karakter alfanumerik.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ResolvedEmployeeAttendancePolicy {
  checkInTime: string;
  checkOutTime: string;
  lateToleranceMinutes: number;
  earlyCheckInWindowMinutes: number;
  workDays: string;
  locationMode: AttendanceLocationMode;
  isCustomClientOverride: boolean;
  policySourceLabel: string;
  matchedLocation: AttendanceLocationRecord | null;
}

export function resolveEmployeeWorkSchedule(
  entityName: string,
  policy: WorkPolicyConfig,
  placementName?: string
): ResolvedEmployeeAttendancePolicy {
  const activeEntityLocations = policy.attendanceLocations.filter(
    (loc) => loc.status === 'Aktif' && loc.entityName === entityName
  );
  const normalizedPlacement = (placementName ?? '').trim().toLowerCase();
  const matchedLocation =
    (normalizedPlacement
      ? activeEntityLocations.find(
          (loc) =>
            loc.name.toLowerCase() === normalizedPlacement ||
            loc.name.toLowerCase().includes(normalizedPlacement) ||
            normalizedPlacement.includes(loc.name.toLowerCase())
        )
      : undefined) ??
    activeEntityLocations[0] ??
    policy.attendanceLocations.find((loc) => loc.status === 'Aktif') ??
    null;

  const override = policy.clientOverrides.find((ov) => ov.entityName === entityName);
  if (override && !override.useDefault) {
    const resolvedMode =
      override.locationMode ??
      matchedLocation?.mode ??
      policy.defaultLocationMode ??
      'Wajib di Radius Lokasi';
    return {
      checkInTime: override.checkInTime,
      checkOutTime: override.checkOutTime,
      lateToleranceMinutes: override.lateToleranceMinutes,
      earlyCheckInWindowMinutes: policy.earlyCheckInWindowMinutes,
      workDays: override.workDays || policy.workDays,
      locationMode: resolvedMode,
      isCustomClientOverride: true,
      policySourceLabel: 'Kebijakan Khusus Klien',
      matchedLocation,
    };
  }

  return {
    checkInTime: policy.checkInTime,
    checkOutTime: policy.checkOutTime,
    lateToleranceMinutes: policy.lateToleranceMinutes,
    earlyCheckInWindowMinutes: policy.earlyCheckInWindowMinutes,
    workDays: policy.workDays,
    locationMode:
      matchedLocation?.mode ?? policy.defaultLocationMode ?? 'Wajib di Radius Lokasi',
    isCustomClientOverride: false,
    policySourceLabel: 'Standar Perusahaan',
    matchedLocation,
  };
}

export function evaluateAttendanceAgainstPolicy(
  mode: 'checkin' | 'checkout',
  currentHourMin: string,
  resolvedPolicy: Pick<
    ResolvedEmployeeAttendancePolicy,
    | 'checkInTime'
    | 'checkOutTime'
    | 'lateToleranceMinutes'
    | 'earlyCheckInWindowMinutes'
    | 'policySourceLabel'
  >
): {
  status: 'Hadir' | 'Telat';
  lateMinutes: number;
  isEarlyOut: boolean;
  earlyOutMinutes: number;
  policyNote: string;
} {
  const [curH, curM] = currentHourMin.split(':').map(Number);
  const nowTotalMins = (Number.isFinite(curH) ? curH : 8) * 60 + (Number.isFinite(curM) ? curM : 0);

  if (mode === 'checkin') {
    const [inH, inM] = resolvedPolicy.checkInTime.split(':').map(Number);
    const schedInMins = (Number.isFinite(inH) ? inH : 8) * 60 + (Number.isFinite(inM) ? inM : 30);
    const diffMins = nowTotalMins - schedInMins;
    const isLate = diffMins > resolvedPolicy.lateToleranceMinutes;
    const lateMinutes = isLate ? Math.max(1, diffMins) : 0;

    const policyNote = isLate
      ? `Terlambat ${lateMinutes} menit dari jam masuk wajib ${resolvedPolicy.checkInTime} WIB (Toleransi ${resolvedPolicy.lateToleranceMinutes} mnt · ${resolvedPolicy.policySourceLabel})`
      : `Tepat waktu sesuai ${resolvedPolicy.policySourceLabel} (Jam Masuk ${resolvedPolicy.checkInTime} WIB · Toleransi ${resolvedPolicy.lateToleranceMinutes} mnt)`;

    return {
      status: isLate ? 'Telat' : 'Hadir',
      lateMinutes,
      isEarlyOut: false,
      earlyOutMinutes: 0,
      policyNote,
    };
  }

  const [outH, outM] = resolvedPolicy.checkOutTime.split(':').map(Number);
  const schedOutMins = (Number.isFinite(outH) ? outH : 17) * 60 + (Number.isFinite(outM) ? outM : 30);
  const earlyDiff = schedOutMins - nowTotalMins;
  const isEarlyOut = earlyDiff > 0;
  const earlyOutMinutes = isEarlyOut ? earlyDiff : 0;

  const policyNote = isEarlyOut
    ? `Pulang lebih awal ${earlyOutMinutes} menit sebelum jam pulang wajib ${resolvedPolicy.checkOutTime} WIB (${resolvedPolicy.policySourceLabel})`
    : `Sesuai jam pulang wajib ${resolvedPolicy.checkOutTime} WIB (${resolvedPolicy.policySourceLabel})`;

  return {
    status: 'Hadir',
    lateMinutes: 0,
    isEarlyOut,
    earlyOutMinutes,
    policyNote,
  };
}

export function syncAttendanceLocationsFromEntities(
  existingLocations: AttendanceLocationRecord[],
  entities: EntityRecord[],
  clientOverrides: ClientPolicyOverride[] = []
): { nextLocations: AttendanceLocationRecord[]; addedCount: number; updatedCount: number } {
  const nextLocations = [...existingLocations];
  let addedCount = 0;
  let updatedCount = 0;

  for (const entity of entities) {
    if (entity.status !== 'Aktif') continue;
    const override = clientOverrides.find((ov) => ov.entityName === entity.name);
    const preferredMode: AttendanceLocationMode =
      override && !override.useDefault && override.locationMode
        ? override.locationMode
        : 'Wajib di Radius Lokasi';

    const placements = entity.supportedPlacements ?? [];
    if (placements.length > 0) {
      for (const branch of placements) {
        const branchName = branch.name.trim();
        if (!branchName) continue;
        const existingIdx = nextLocations.findIndex(
          (loc) =>
            loc.entityName === entity.name &&
            loc.name.toLowerCase() === branchName.toLowerCase()
        );
        if (existingIdx >= 0) {
          const current = nextLocations[existingIdx];
          const nextMapsUrl = branch.mapsUrl?.trim() || current.mapsUrl;
          const nextArea = branch.area?.trim() || current.area;
          if (nextMapsUrl !== current.mapsUrl || nextArea !== current.area) {
            nextLocations[existingIdx] = {
              ...current,
              area: nextArea,
              mapsUrl: nextMapsUrl,
              addressOrCoords:
                current.addressOrCoords || `${branchName} · Area ${nextArea || entity.city}`,
            };
            updatedCount += 1;
          }
        } else {
          nextLocations.push({
            id: `loc-sync-${entity.id}-${branch.id}`,
            name: branchName,
            entityName: entity.name,
            category: entity.category,
            area: branch.area || entity.city,
            mapsUrl: branch.mapsUrl || '',
            addressOrCoords: `${branchName} · Area ${branch.area || entity.city}`,
            radiusMeters: preferredMode === 'Fleksibel Lapangan' ? 200 : 100,
            mode: preferredMode,
            status: 'Aktif',
          });
          addedCount += 1;
        }
      }
    } else {
      const hasAnyForEntity = nextLocations.some((loc) => loc.entityName === entity.name);
      if (!hasAnyForEntity) {
        nextLocations.push({
          id: `loc-sync-${entity.id}`,
          name: `Kantor ${entity.name}`,
          entityName: entity.name,
          category: entity.category,
          area: entity.city,
          mapsUrl: '',
          addressOrCoords: `${entity.name} · ${entity.city}`,
          radiusMeters: 100,
          mode: preferredMode,
          status: 'Aktif',
        });
        addedCount += 1;
      }
    }
  }

  return { nextLocations, addedCount, updatedCount };
}

export interface EmployeeLeaveQuotaSummary {
  annualLeaveQuota: number;
  approvedLeaveDays: number;
  pendingLeaveDays: number;
  remainingLeaveQuota: number;
  approvedSickDays: number;
  pendingSickDays: number;
  alphaDays: number;
}

export function calculateEmployeeLeaveQuotaSummary(
  employeeCode: string,
  leaveAbsences: LeaveAbsenceRecord[],
  annualLeaveQuota: number
): EmployeeLeaveQuotaSummary {
  const cleanCode = employeeCode.trim().toLowerCase();
  const empRecords = leaveAbsences.filter(
    (item) => item.employeeCode.trim().toLowerCase() === cleanCode
  );

  const approvedLeaveDays = empRecords
    .filter(
      (item) =>
        (item.type === 'Cuti Tahunan' || item.type === 'Izin Keperluan') &&
        item.status === 'Disetujui'
    )
    .reduce((sum, item) => sum + item.daysCount, 0);

  const pendingLeaveDays = empRecords
    .filter(
      (item) =>
        (item.type === 'Cuti Tahunan' || item.type === 'Izin Keperluan') &&
        item.status === 'Menunggu'
    )
    .reduce((sum, item) => sum + item.daysCount, 0);

  const approvedSickDays = empRecords
    .filter((item) => item.type === 'Izin Sakit' && item.status === 'Disetujui')
    .reduce((sum, item) => sum + item.daysCount, 0);

  const pendingSickDays = empRecords
    .filter((item) => item.type === 'Izin Sakit' && item.status === 'Menunggu')
    .reduce((sum, item) => sum + item.daysCount, 0);

  const alphaDays = empRecords
    .filter(
      (item) =>
        item.type === 'Alpha / Tanpa Keterangan' ||
        item.status === 'Alpha' ||
        item.status === 'Perlu Klarifikasi'
    )
    .reduce((sum, item) => sum + item.daysCount, 0);

  return {
    annualLeaveQuota,
    approvedLeaveDays,
    pendingLeaveDays,
    remainingLeaveQuota: Math.max(0, annualLeaveQuota - approvedLeaveDays),
    approvedSickDays,
    pendingSickDays,
    alphaDays,
  };
}

export function validateLeaveRequestSubmission(input: {
  type: 'Cuti Tahunan' | 'Izin Sakit' | 'Izin Keperluan';
  dateRange: string;
  daysCount: number;
  reason: string;
  skdFileName?: string;
  skdFileDataUrl?: string;
  remainingLeaveQuota: number;
}): { ok: boolean; error?: string } {
  if (!input.dateRange.trim()) {
    return { ok: false, error: 'Rentang tanggal cuti / izin wajib diisi.' };
  }
  if (!Number.isFinite(input.daysCount) || input.daysCount < 1) {
    return { ok: false, error: 'Jumlah hari pengajuan minimal 1 hari kerja.' };
  }
  if (!input.reason.trim()) {
    return { ok: false, error: 'Alasan atau keterangan pengajuan wajib diisi.' };
  }
  if (input.type === 'Izin Sakit') {
    if (!input.skdFileName?.trim()) {
      return {
        ok: false,
        error:
          'Wajib mengunggah lampiran SKD (Surat Keterangan Dokter) untuk pengajuan Izin Sakit.',
      };
    }
  } else {
    if (input.daysCount > input.remainingLeaveQuota) {
      return {
        ok: false,
        error: `Jumlah hari yang diajukan (${input.daysCount} hari) melebihi sisa kuota cuti tahunan Anda (${input.remainingLeaveQuota} hari).`,
      };
    }
  }
  return { ok: true };
}

export function validateSystemSettingsInput(
  input: SystemSettingsConfig
): { ok: boolean; error?: string } {
  if (!input.companyName.trim()) {
    return { ok: false, error: 'Nama perusahaan pengguna wajib diisi.' };
  }
  if (!input.headquartersAddress.trim()) {
    return { ok: false, error: 'Alamat kantor pusat perusahaan wajib diisi.' };
  }
  if (!input.supportEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.supportEmail.trim())) {
    return { ok: false, error: 'Email resmi layanan HR wajib berformat email yang valid.' };
  }
  if (input.pkwtSignatoryName !== undefined && !input.pkwtSignatoryName.trim()) {
    return { ok: false, error: 'Nama pejabat penandatangan kontrak (Pihak Pertama PKWT) wajib diisi.' };
  }
  if (input.defaultEmployeePin !== undefined && input.defaultEmployeePin.trim().length < 4) {
    return { ok: false, error: 'PIN / kata sandi awal akun karyawan baru minimal 4 karakter.' };
  }
  return { ok: true };
}

export interface PevoraPlatformLicenseSummary {
  productName: string;
  vendorCompany: string;
  vendorSupportEmail: string;
  vendorSupportWhatsapp: string;
  licenseCode: string;
  licenseTier: string;
  licenseStatus: 'Aktif · Terverifikasi';
  versionLabel: string;
  validThroughLabel: string;
  licensedTenantName: string;
  activeEntityCount: number;
  maxEntityQuota: number;
  activeEmployeeCount: number;
  maxEmployeeQuota: number;
}

export function buildPevoraLicenseSummary(params: {
  companyName: string;
  activeEntityCount: number;
  activeEmployeeCount: number;
}): PevoraPlatformLicenseSummary {
  return {
    productName: 'PEVORA — People Empowered Workforce',
    vendorCompany: 'PT Iskandar Pratama Teknologi',
    vendorSupportEmail: 'enterprise@iskandarpratama.co.id',
    vendorSupportWhatsapp: '628119002026',
    licenseCode: 'PEV-ENT-2026-SWP01',
    licenseTier: 'Enterprise Multi-Entitas & Outsource',
    licenseStatus: 'Aktif · Terverifikasi',
    versionLabel: 'v2.6.0 Enterprise Release',
    validThroughLabel: '31 Desember 2027 (Perpanjangan Tahunan)',
    licensedTenantName: params.companyName.trim() || 'Perusahaan Pengguna',
    activeEntityCount: params.activeEntityCount,
    maxEntityQuota: 25,
    activeEmployeeCount: params.activeEmployeeCount,
    maxEmployeeQuota: 2500,
  };
}

export type EmployeeDisciplineStatus =
  | 'Disiplin Tertib'
  | 'Catatan Terlambat Ringan'
  | 'Perlu Pembinaan Telat'
  | 'Evaluasi Disiplin (Alpha)';

export interface EmployeeAttendanceRecapRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  email: string;
  whatsappNumber: string;
  position: string;
  employmentType: EmploymentCategory;
  entityName: string;
  placementLabel: string;
  checkInTime: string;
  checkOutTime: string;
  lateToleranceMinutes: number;
  workDays: string;
  locationMode: AttendanceLocationMode;
  policySourceLabel: string;
  isCustomClientOverride: boolean;
  hadirTepatWaktuDays: number;
  telatCount: number;
  totalPresentDays: number;
  totalLateMinutes: number;
  approvedLeaveDays: number;
  pendingLeaveDays: number;
  remainingLeaveQuota: number;
  annualLeaveQuota: number;
  approvedSickDays: number;
  pendingSickDays: number;
  alphaDays: number;
  effectiveScheduledDays: number;
  attendanceRatePercent: number;
  disciplineStatus: EmployeeDisciplineStatus;
  dailyHistory: AttendanceLogRecord[];
  leaveHistory: LeaveAbsenceRecord[];
}

const NOV_PRIOR_WORKDAYS = [
  '11 Nov 2026',
  '10 Nov 2026',
  '09 Nov 2026',
  '06 Nov 2026',
  '05 Nov 2026',
  '04 Nov 2026',
  '03 Nov 2026',
];

export function buildPerEmployeeAttendanceRecap(params: {
  employees: EmployeeRecord[];
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  policy: WorkPolicyConfig;
}): EmployeeAttendanceRecapRow[] {
  const { employees, attendanceLogs, leaveAbsences, policy } = params;

  const subjectMap = new Map<
    string,
    {
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      email: string;
      whatsappNumber: string;
      position: string;
      employmentType: EmploymentCategory;
      entityName: string;
      placementLabel: string;
    }
  >();

  for (const emp of employees) {
    if (emp.status === 'Nonaktif') continue;
    subjectMap.set(emp.employeeCode.trim().toUpperCase(), {
      employeeId: emp.id,
      employeeCode: emp.employeeCode.trim(),
      employeeName: emp.fullName,
      email: emp.email,
      whatsappNumber: emp.whatsappNumber,
      position: emp.position,
      employmentType: emp.employmentType,
      entityName: emp.entityName,
      placementLabel: emp.placementName || emp.placementLocation || emp.entityName,
    });
  }

  for (const log of attendanceLogs) {
    const key = log.employeeCode.trim().toUpperCase();
    if (!subjectMap.has(key)) {
      const slug = log.employeeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.');
      subjectMap.set(key, {
        employeeId: `emp-log-${log.employeeCode}`,
        employeeCode: log.employeeCode.trim(),
        employeeName: log.employeeName,
        email: `${slug}@swapro-demo.co.id`,
        whatsappNumber: '081288900429',
        position:
          log.employmentType === 'Internal' ? 'Staf Operasional Internal' : 'Staf Operasional Klien',
        employmentType: log.employmentType,
        entityName: log.entityName,
        placementLabel: log.locationUsed.split('(')[0].trim() || log.entityName,
      });
    }
  }

  for (const lv of leaveAbsences) {
    const key = lv.employeeCode.trim().toUpperCase();
    if (!subjectMap.has(key)) {
      const slug = lv.employeeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.');
      subjectMap.set(key, {
        employeeId: `emp-lv-${lv.employeeCode}`,
        employeeCode: lv.employeeCode.trim(),
        employeeName: lv.employeeName,
        email: `${slug}@swapro-demo.co.id`,
        whatsappNumber: '081288900429',
        position:
          lv.employmentType === 'Internal' ? 'Staf Operasional Internal' : 'Staf Operasional Klien',
        employmentType: lv.employmentType,
        entityName: lv.entityName,
        placementLabel: lv.entityName,
      });
    }
  }

  const rows: EmployeeAttendanceRecapRow[] = [];

  for (const subject of subjectMap.values()) {
    const codeUpper = subject.employeeCode.toUpperCase();
    const resolvedSchedule = resolveEmployeeWorkSchedule(
      subject.entityName,
      policy,
      subject.placementLabel
    );

    const empLiveLogs = attendanceLogs.filter(
      (l) => l.employeeCode.trim().toUpperCase() === codeUpper
    );
    const empLeaves = leaveAbsences.filter(
      (l) => l.employeeCode.trim().toUpperCase() === codeUpper
    );

    const existingDates = new Set(empLiveLogs.map((l) => l.dateLabel.trim()));
    const syntheticPriorLogs: AttendanceLogRecord[] = [];

    const [schedInH, schedInM] = resolvedSchedule.checkInTime.split(':').map(Number);
    const [schedOutH, schedOutM] = resolvedSchedule.checkOutTime.split(':').map(Number);
    const baseInH = String(Number.isFinite(schedInH) ? schedInH : 8).padStart(2, '0');
    const baseInM = String(Math.max(0, (Number.isFinite(schedInM) ? schedInM : 30) - 6)).padStart(
      2,
      '0'
    );
    const baseOutH = String(Number.isFinite(schedOutH) ? schedOutH : 17).padStart(2, '0');
    const baseOutM = String(Math.min(59, (Number.isFinite(schedOutM) ? schedOutM : 30) + 5)).padStart(
      2,
      '0'
    );

    NOV_PRIOR_WORKDAYS.forEach((dateStr, idx) => {
      if (existingDates.has(dateStr)) return;
      const isSecondLateForNadia = codeUpper === 'OUT-318' && idx === 2;
      const lateMins = isSecondLateForNadia ? 15 : 0;
      const checkInDisplay = isSecondLateForNadia
        ? `${baseInH}:${String(Math.min(59, (Number.isFinite(schedInM) ? schedInM : 0) + 15)).padStart(2, '0')} WIB`
        : `${baseInH}:${baseInM} WIB`;

      syntheticPriorLogs.push({
        id: `hist-${subject.employeeCode}-${idx}`,
        employeeCode: subject.employeeCode,
        employeeName: subject.employeeName,
        employmentType: subject.employmentType,
        entityName: subject.entityName,
        dateLabel: dateStr,
        checkIn: checkInDisplay,
        checkOut: `${baseOutH}:${baseOutM} WIB`,
        status: isSecondLateForNadia ? 'Telat' : 'Hadir',
        lateMinutes: lateMins,
        locationUsed:
          resolvedSchedule.matchedLocation?.name ?? subject.placementLabel ?? subject.entityName,
        notes: isSecondLateForNadia
          ? `Terlambat ${lateMins} menit dari jam masuk wajib ${resolvedSchedule.checkInTime} WIB (${resolvedSchedule.policySourceLabel})`
          : `Tepat waktu sesuai ${resolvedSchedule.policySourceLabel} (${resolvedSchedule.checkInTime} WIB)`,
      });
    });

    const dailyHistory = [...empLiveLogs, ...syntheticPriorLogs];

    const hadirTepatWaktuDays = dailyHistory.filter((l) => l.status === 'Hadir').length;
    const telatCount = dailyHistory.filter((l) => l.status === 'Telat').length;
    const totalPresentDays = hadirTepatWaktuDays + telatCount;
    const totalLateMinutes = dailyHistory.reduce((sum, l) => sum + (l.lateMinutes || 0), 0);

    const quota = calculateEmployeeLeaveQuotaSummary(
      subject.employeeCode,
      leaveAbsences,
      policy.annualLeaveQuota
    );

    const sickFromLogs = empLiveLogs.filter(
      (l) => l.status === 'Izin' && l.notes.toLowerCase().includes('sakit')
    ).length;
    const approvedSickDays = Math.max(quota.approvedSickDays, sickFromLogs);

    const alphaFromLogs = empLiveLogs.filter((l) => l.status === 'Alpha').length;
    const alphaDays = Math.max(quota.alphaDays, alphaFromLogs);

    const effectiveScheduledDays =
      totalPresentDays + quota.approvedLeaveDays + approvedSickDays + alphaDays;
    const attendanceRatePercent = Math.round(
      ((totalPresentDays + quota.approvedLeaveDays + approvedSickDays) /
        Math.max(1, effectiveScheduledDays)) *
        100
    );

    let disciplineStatus: EmployeeDisciplineStatus = 'Disiplin Tertib';
    if (alphaDays > 0) {
      disciplineStatus = 'Evaluasi Disiplin (Alpha)';
    } else if (telatCount >= 2 || totalLateMinutes >= 25) {
      disciplineStatus = 'Perlu Pembinaan Telat';
    } else if (telatCount === 1) {
      disciplineStatus = 'Catatan Terlambat Ringan';
    }

    rows.push({
      employeeId: subject.employeeId,
      employeeCode: subject.employeeCode,
      employeeName: subject.employeeName,
      email: subject.email,
      whatsappNumber: subject.whatsappNumber,
      position: subject.position,
      employmentType: subject.employmentType,
      entityName: subject.entityName,
      placementLabel: subject.placementLabel,
      checkInTime: resolvedSchedule.checkInTime,
      checkOutTime: resolvedSchedule.checkOutTime,
      lateToleranceMinutes: resolvedSchedule.lateToleranceMinutes,
      workDays: resolvedSchedule.workDays,
      locationMode: resolvedSchedule.locationMode,
      policySourceLabel: resolvedSchedule.policySourceLabel,
      isCustomClientOverride: resolvedSchedule.isCustomClientOverride,
      hadirTepatWaktuDays,
      telatCount,
      totalPresentDays,
      totalLateMinutes,
      approvedLeaveDays: quota.approvedLeaveDays,
      pendingLeaveDays: quota.pendingLeaveDays,
      remainingLeaveQuota: quota.remainingLeaveQuota,
      annualLeaveQuota: quota.annualLeaveQuota,
      approvedSickDays,
      pendingSickDays: quota.pendingSickDays,
      alphaDays,
      effectiveScheduledDays,
      attendanceRatePercent,
      disciplineStatus,
      dailyHistory,
      leaveHistory: empLeaves,
    });
  }

  return rows;
}

export function buildEmployeeAttendanceRecapCsv(rows: EmployeeAttendanceRecapRow[]): string {
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'NIK Karyawan',
    'Nama Lengkap',
    'Email',
    'WhatsApp',
    'Jabatan',
    'Kategori',
    'Unit / Klien Penempatan',
    'Jam Kerja Wajib',
    'Kebijakan Jam Kerja',
    'Hadir Tepat Waktu (Hari)',
    'Frekuensi Telat (Kali)',
    'Total Menit Telat',
    'Total Hari Masuk',
    'Cuti/Izin Dipakai (Hari)',
    'Sisa Kuota Cuti (Hari)',
    'Izin Sakit SKD (Hari)',
    'Alpha Tanpa Keterangan (Hari)',
    'Tingkat Kehadiran (%)',
    'Status Disiplin',
  ];

  const lines = [headers.map(escapeCsv).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.employeeCode,
        r.employeeName,
        r.email,
        r.whatsappNumber,
        r.position,
        r.employmentType,
        r.entityName,
        `${r.checkInTime} - ${r.checkOutTime} WIB`,
        r.policySourceLabel,
        r.hadirTepatWaktuDays,
        r.telatCount,
        r.totalLateMinutes,
        r.totalPresentDays,
        r.approvedLeaveDays,
        `${r.remainingLeaveQuota}/${r.annualLeaveQuota}`,
        r.approvedSickDays,
        r.alphaDays,
        `${r.attendanceRatePercent}%`,
        r.disciplineStatus,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }
  return lines.join('\n');
}

export function buildInternalUserWhatsappUrl(user: UserAccountRecord): string {
  const intlWa = normalizeWhatsappNumberToInternational(user.whatsappNumber || '081199881024');
  if (!intlWa) return '#';
  const pin = user.portalPassword?.trim() || '1234';
  const scopeLabel = formatAssignedScopesSummary(user.assignedScopes);
  const text = [
    `Halo ${user.fullName} (${user.role} · ${user.employeeCode}),`,
    '',
    `Berikut informasi akses akun pengelola PEVORA HRIS Anda:`,
    `• ID / Username Login: ${user.loginAlias || user.employeeCode}`,
    `• Email Kerja: ${user.email}`,
    `• Peran Sistem: ${user.role}`,
    `• Cakupan Unit / Klien: ${scopeLabel}`,
    `• PIN / Kata Sandi Portal: ${pin}`,
    '',
    'Terima kasih,',
    'Master Admin PEVORA',
  ].join('\n');
  return `https://wa.me/${intlWa}?text=${encodeURIComponent(text)}`;
}

export function buildInternalUserMailtoUrl(user: UserAccountRecord): string {
  const email = user.email.trim();
  if (!email) return '#';
  const pin = user.portalPassword?.trim() || '1234';
  const scopeLabel = formatAssignedScopesSummary(user.assignedScopes);
  const subject = `Akses Akun Pengelola PEVORA (${user.role}) — ${user.fullName} (${user.employeeCode})`;
  const body = [
    `Halo ${user.fullName},`,
    '',
    `Berikut rincian akun pengelola PEVORA HRIS Anda:`,
    `• ID / Username Login: ${user.loginAlias || user.employeeCode}`,
    `• Peran Sistem: ${user.role}`,
    `• Cakupan Unit / Klien: ${scopeLabel}`,
    `• PIN / Kata Sandi Portal: ${pin}`,
    '',
    'Silakan gunakan kredensial di atas untuk masuk ke Konsol PEVORA.',
    '',
    'Salam,',
    'Master Admin PEVORA',
  ].join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildLeaveFollowupWhatsappUrl(
  item: LeaveAbsenceRecord,
  emp?: Pick<EmployeeRecord, 'whatsappNumber' | 'email'>
): string {
  const rawWa = emp?.whatsappNumber || '081288901024';
  const intlWa = normalizeWhatsappNumberToInternational(rawWa);
  if (!intlWa) return '#';

  const statusNote =
    item.status === 'Menunggu'
      ? 'Saat ini pengajuan telah tercatat di Admin Operasional dan sedang menunggu persetujuan (ACC) akhir dari Master Admin.'
      : item.status === 'Alpha' || item.type === 'Alpha / Tanpa Keterangan'
        ? 'Tercatat ketidakhadiran tanpa keterangan (Alpha). Mohon segera konfirmasi alasan ketidakhadiran Anda kepada Admin Operasional.'
        : `Status pengajuan Anda saat ini: ${item.status}.`;

  const skdNote =
    item.type === 'Izin Sakit'
      ? `\n• Lampiran SKD: ${item.skdFileName || 'Belum terlampir'}`
      : '';

  const text = [
    `Halo ${item.employeeName} (NIK: ${item.employeeCode}),`,
    '',
    `Kami dari Admin Operasional PEVORA (${item.entityName}) menindaklanjuti catatan kehadiran / pengajuan Anda:`,
    `• Kategori: ${item.type}`,
    `• Tanggal: ${item.dateRange} (${item.daysCount} hari)${skdNote}`,
    `• Keterangan: ${item.reason}`,
    '',
    statusNote,
    '',
    'Terima kasih,',
    'Tim Admin Operasional PEVORA',
  ].join('\n');

  return `https://wa.me/${intlWa}?text=${encodeURIComponent(text)}`;
}

export function buildLeaveFollowupMailtoUrl(
  item: LeaveAbsenceRecord,
  emp?: Pick<EmployeeRecord, 'whatsappNumber' | 'email'>
): string {
  const slug = item.employeeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.');
  const email = (emp?.email || `${slug}@swapro-demo.co.id`).trim();
  const subject = `Konfirmasi ${item.type} (${item.dateRange}) — ${item.employeeName} (${item.employeeCode})`;
  const statusNote =
    item.status === 'Menunggu'
      ? 'Pengajuan Anda telah diverifikasi awal oleh Admin Operasional dan sedang menunggu persetujuan (ACC) dari Master Admin.'
      : item.status === 'Alpha' || item.type === 'Alpha / Tanpa Keterangan'
        ? 'Tercatat ketidakhadiran tanpa keterangan (Alpha). Mohon balas email ini untuk klarifikasi kehadiran.'
        : `Status pengajuan saat ini: ${item.status}.`;

  const body = [
    `Halo ${item.employeeName} (NIK: ${item.employeeCode}),`,
    '',
    `Kami dari Admin Operasional PEVORA (${item.entityName}) menginformasikan tindak lanjut atas catatan berikut:`,
    `• Kategori: ${item.type}`,
    `• Rentang Tanggal: ${item.dateRange} (${item.daysCount} hari)`,
    item.skdFileName ? `• Bukti SKD: ${item.skdFileName}` : null,
    `• Alasan / Catatan: ${item.reason}`,
    '',
    statusNote,
    '',
    'Terima kasih,',
    'Tim Admin Operasional PEVORA',
  ]
    .filter(Boolean)
    .join('\n');

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildAttendanceRecapWhatsappUrl(row: EmployeeAttendanceRecapRow): string {
  const intlWa = normalizeWhatsappNumberToInternational(row.whatsappNumber || '081288901024');
  if (!intlWa) return '#';
  const text = [
    `Halo ${row.employeeName} (NIK: ${row.employeeCode}),`,
    '',
    `Berikut ringkasan rekapan presensi berjalan Anda di ${row.entityName} (${row.placementLabel}):`,
    `• Total Hari Masuk: ${row.totalPresentDays} hari (${row.hadirTepatWaktuDays} hari tepat waktu)`,
    `• Frekuensi Terlambat: ${row.telatCount}x (Total ${row.totalLateMinutes} menit)`,
    `• Cuti Dipakai: ${row.approvedLeaveDays} hari (Sisa kuota: ${row.remainingLeaveQuota}/${row.annualLeaveQuota} hari)`,
    `• Izin Sakit (SKD): ${row.approvedSickDays} hari`,
    `• Catatan Alpha: ${row.alphaDays} hari`,
    `• Status Kedisiplinan: ${row.disciplineStatus} (Kehadiran ${row.attendanceRatePercent}%)`,
    '',
    'Terima kasih atas dedikasi dan ketertiban presensi Anda.',
    'Tim Admin Operasional PEVORA',
  ].join('\n');
  return `https://wa.me/${intlWa}?text=${encodeURIComponent(text)}`;
}

export function buildAttendanceRecapMailtoUrl(row: EmployeeAttendanceRecapRow): string {
  const email = row.email.trim();
  if (!email) return '#';
  const subject = `Rekapan Presensi & Kedisiplinan (${row.attendanceRatePercent}%) — ${row.employeeName} (${row.employeeCode})`;
  const body = [
    `Halo ${row.employeeName} (NIK: ${row.employeeCode}),`,
    '',
    `Berikut informasi rekapan akumulasi presensi Anda untuk periode berjalan di ${row.entityName}:`,
    `• Jam Kerja Wajib: ${row.checkInTime} - ${row.checkOutTime} WIB (Toleransi ${row.lateToleranceMinutes} menit)`,
    `• Total Hari Masuk: ${row.totalPresentDays} hari (${row.hadirTepatWaktuDays} hari tepat waktu)`,
    `• Frekuensi Terlambat: ${row.telatCount}x (Total ${row.totalLateMinutes} menit)`,
    `• Cuti Tahunan Dipakai: ${row.approvedLeaveDays} hari (Sisa kuota: ${row.remainingLeaveQuota}/${row.annualLeaveQuota} hari)`,
    `• Izin Sakit (SKD): ${row.approvedSickDays} hari`,
    `• Catatan Alpha: ${row.alphaDays} hari`,
    `• Evaluasi Disiplin: ${row.disciplineStatus}`,
    '',
    'Salam,',
    'Tim Admin Operasional PEVORA',
  ].join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function createAuditEntry(
  actor: string,
  category: AuditLogRecord['category'],
  action: string,
  target: string
): AuditLogRecord {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: `Hari ini · ${hh}:${mm}`,
    actor,
    category,
    action,
    target,
  };
}

export interface SnapshotVacancySlice {
  id: string;
  clientName: string;
  status: string;
}

export interface SnapshotApplicationSlice {
  vacancyId: string;
  stage: string;
  handedOffToOnboarding?: boolean;
}

export function buildLiveOperationalSnapshots(input: {
  entities: EntityRecord[];
  vacancies: SnapshotVacancySlice[];
  applications: SnapshotApplicationSlice[];
  contracts: ContractRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  attendanceLogs: AttendanceLogRecord[];
  baseSnapshots?: OperationalSnapshot[];
}): OperationalSnapshot[] {
  const {
    entities,
    vacancies,
    applications,
    contracts,
    leaveAbsences,
    attendanceLogs,
    baseSnapshots = INITIAL_OPERATIONAL_SNAPSHOTS,
  } = input;

  return entities.map((entity) => {
    const base = baseSnapshots.find(
      (b) => b.entityName.toLowerCase() === entity.name.toLowerCase()
    );

    const entityVacancies = vacancies.filter(
      (v) => v.clientName.trim().toLowerCase() === entity.name.trim().toLowerCase()
    );
    const openPositions = entityVacancies.filter(
      (v) => v.status === 'Aktif' || v.status === 'Mendesak'
    ).length;

    const entityVacancyIds = new Set(entityVacancies.map((v) => v.id));
    const activeCandidates = applications.filter(
      (app) =>
        entityVacancyIds.has(app.vacancyId) &&
        !app.handedOffToOnboarding &&
        app.stage !== 'Tidak Lolos'
    ).length;

    const expiringContracts = contracts.filter(
      (c) =>
        c.entityName.trim().toLowerCase() === entity.name.trim().toLowerCase() &&
        c.contractType === 'PKWT' &&
        c.status !== 'Diperpanjang' &&
        (c.status === 'Segera Berakhir' || (c.daysRemaining !== null && c.daysRemaining <= 30))
    ).length;

    const onLeaveToday = leaveAbsences.filter(
      (lv) =>
        lv.entityName.trim().toLowerCase() === entity.name.trim().toLowerCase() &&
        lv.type !== 'Alpha / Tanpa Keterangan' &&
        (lv.status === 'Disetujui' || lv.status === 'Menunggu')
    ).length;

    const entityLogs = attendanceLogs.filter(
      (log) => log.entityName.trim().toLowerCase() === entity.name.trim().toLowerCase()
    );
    const attendanceRate =
      entityLogs.length > 0
        ? `${(
            (entityLogs.filter((l) => l.status === 'Hadir' || l.status === 'Telat').length /
              entityLogs.length) *
            100
          )
            .toFixed(1)
            .replace('.', ',')}%`
        : base?.attendanceRate ?? '100,0%';

    return {
      id: base?.id ?? `op-${entity.id}`,
      entityName: entity.name,
      category: entity.category,
      attendanceRate,
      onLeaveToday,
      expiringContracts,
      openPositions,
      activeCandidates,
    };
  });
}
