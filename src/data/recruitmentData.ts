import type {
  EmployeeDocumentsRecord,
  EmployeeFormInput,
  EmploymentCategory,
  EntityRecord,
  EmergencyContactRecord,
  FamilyMemberRecord,
  KtpAddressRecord,
} from './masterAdminData.ts';

export type VacancyStatus = 'Aktif' | 'Mendesak' | 'Ditutup' | 'Draft';

export interface JobVacancyRecord {
  id: string;
  code: string;
  clientName: string;
  showClientNameToApplicants: boolean;
  clientIndustryLabel: string;
  employmentType: EmploymentCategory;
  position: string;
  department: string;
  placementLocation: string;
  headcountNeeded: number;
  headcountFilled: number;
  contractType: 'PKWT' | 'PKWTT';
  salaryMin: number;
  salaryMax: number;
  salaryNote: string;
  jobdesk: string[];
  requirements: string[];
  deadlineDate: string;
  urgency: 'Normal' | 'Mendesak';
  status: VacancyStatus;
  recruiterName: string;
  createdAt: string;
}

export interface ApplicantOcrSourceState {
  ktpVerifiedByOcr: boolean;
  kkVerifiedByOcr: boolean;
  lastKtpScanAt?: string;
  lastKkScanAt?: string;
}

export interface ApplicantProfileRecord {
  id: string;
  applicantCode: string;
  loginId: string;
  fullName: string;
  email: string;
  password: string;
  whatsappNumber: string;
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
  latestExperience: string;
  skillsSummary: string;
  documents: EmployeeDocumentsRecord;
  documentFileNames: Partial<Record<keyof EmployeeDocumentsRecord, string>>;
  ocrSources: ApplicantOcrSourceState;
  accountDisabled?: boolean;
  convertedToEmployeeCode?: string;
}

export type ApplicationStage =
  | 'Lamaran Masuk'
  | 'Screening Berkas'
  | 'Jadwal Interview'
  | 'Offering'
  | 'Lolos & Siap Onboarding'
  | 'Tidak Lolos';

export interface InterviewScheduleRecord {
  date: string;
  time: string;
  mode: 'Online (Video Call)' | 'Offline (Datang ke Kantor)';
  locationOrLink: string;
  interviewerName: string;
  notesToApplicant: string;
  evaluationScore?: number;
  evaluationSummary?: string;
}

export interface JobApplicationRecord {
  id: string;
  applicationCode: string;
  vacancyId: string;
  applicantId: string;
  appliedAt: string;
  stage: ApplicationStage;
  requiresFullProfile: boolean;
  recruiterNotes: string;
  interview?: InterviewScheduleRecord;
  handedOffToOnboarding: boolean;
  onboardingCandidateId?: string;
}

export const APPLICATION_STAGES_ORDER: ApplicationStage[] = [
  'Lamaran Masuk',
  'Screening Berkas',
  'Jadwal Interview',
  'Offering',
  'Lolos & Siap Onboarding',
  'Tidak Lolos',
];

export const INITIAL_VACANCIES: JobVacancyRecord[] = [
  {
    id: 'vac-1',
    code: 'LOW-2026-01',
    clientName: 'Adira Finance — Penempatan Regional',
    showClientNameToApplicants: true,
    clientIndustryLabel: 'Mitra Pembiayaan Otomotif Nasional',
    employmentType: 'Penempatan Klien',
    position: 'Staff Verifikasi & Remedial Lapangan',
    department: 'Tim Lapangan & Dukungan Klien Adira',
    placementLocation: 'Jakarta Pusat & Jabodetabek',
    headcountNeeded: 10,
    headcountFilled: 3,
    contractType: 'PKWT',
    salaryMin: 5300000,
    salaryMax: 5850000,
    salaryNote: 'Sesuai UMK DKI Jakarta + Insentif Kinerja & BPJS Lengkap',
    jobdesk: [
      'Melakukan verifikasi data lapangan dan kelengkapan berkas nasabah sesuai SOP klien.',
      'Menyusun laporan kunjungan harian melalui aplikasi operasional dan koordinasi cabang.',
      'Menjaga kepuasan layanan serta kepatuhan terhadap kerahasiaan data nasabah.',
    ],
    requirements: [
      'Pendidikan minimal SMA/SMK atau D3/S1 semua jurusan.',
      'Usia 20 – 35 tahun, memiliki komunikasi yang baik dan teliti.',
      'Memiliki SIM C aktif & kendaraan pribadi (nilai tambah untuk area lapangan).',
      'Siap ditempatkan di area cabang Jakarta Pusat / Jabodetabek.',
    ],
    deadlineDate: '2026-12-15',
    urgency: 'Mendesak',
    status: 'Mendesak',
    recruiterName: 'Dina Lestari',
    createdAt: '10 Nov 2026',
  },
  {
    id: 'vac-2',
    code: 'LOW-2026-02',
    clientName: 'BAF — Layanan Operasional Cabang',
    showClientNameToApplicants: true,
    clientIndustryLabel: 'Mitra Multifinance Cabang Utama',
    employmentType: 'Penempatan Klien',
    position: 'Customer Service & Administrasi Cabang',
    department: 'Tim Layanan Klien BAF',
    placementLocation: 'Jakarta Pusat',
    headcountNeeded: 6,
    headcountFilled: 2,
    contractType: 'PKWT',
    salaryMin: 5200000,
    salaryMax: 5500000,
    salaryNote: 'Gaji Pokok + Tunjangan Kehadiran + THR Proporsional',
    jobdesk: [
      'Melayani konsultasi pelanggan cabang secara ramah, cepat, dan akurat.',
      'Memeriksa validitas dokumen pengajuan serta menginput data transaksi ke sistem cabang.',
      'Berkoordinasi dengan tim administrasi pusat terkait arsip dokumen kontrak.',
    ],
    requirements: [
      'Pendidikan minimal D3 / S1 Administrasi, Manajemen, atau bidang relevan.',
      'Mampu mengoperasikan Microsoft Excel & administrasi perkantoran dengan baik.',
      'Berpenampilan rapi, komunikatif, dan bersedia bekerja sesuai jam operasional cabang.',
    ],
    deadlineDate: '2026-12-20',
    urgency: 'Normal',
    status: 'Aktif',
    recruiterName: 'Dina Lestari',
    createdAt: '08 Nov 2026',
  },
  {
    id: 'vac-3',
    code: 'LOW-2026-03',
    clientName: 'FIFGROUP — Area Jawa Timur',
    showClientNameToApplicants: true,
    clientIndustryLabel: 'Mitra Pembiayaan Konsumen Jawa Timur',
    employmentType: 'Penempatan Klien',
    position: 'Surveyor Pembiayaan Regional',
    department: 'Tim Operasional Klien FIFGROUP',
    placementLocation: 'Surabaya & Sidoarjo',
    headcountNeeded: 8,
    headcountFilled: 4,
    contractType: 'PKWT',
    salaryMin: 4950000,
    salaryMax: 5450000,
    salaryNote: 'UMK Surabaya + Uang Transportasi + Insentif Bulanan',
    jobdesk: [
      'Melakukan survei kelayakan domisili dan tempat usaha calon debitur di area Surabaya.',
      'Memastikan dokumentasi foto, wawancara singkat, dan validasi identitas sesuai target SLA.',
      'Mengirimkan hasil evaluasi survei ke koordinator area tepat waktu.',
    ],
    requirements: [
      'Pria/Wanita usia maksimal 33 tahun, pendidikan min. SMA/SMK sederajat.',
      'Menguasai wilayah Surabaya dan sekitarnya, memiliki SIM C aktif.',
      'Jujur, disiplin, dan terbiasa bekerja dengan target harian.',
    ],
    deadlineDate: '2026-12-10',
    urgency: 'Mendesak',
    status: 'Mendesak',
    recruiterName: 'Dina Lestari',
    createdAt: '06 Nov 2026',
  },
  {
    id: 'vac-4',
    code: 'LOW-2026-04',
    clientName: 'PT Telkom Akses (Proyek Fiber Barat)',
    showClientNameToApplicants: false,
    clientIndustryLabel: 'Mitra Infrastruktur Telekomunikasi Nasional',
    employmentType: 'Penempatan Klien',
    position: 'Admin Proyek & Dokumentasi Jaringan',
    department: 'Operasional Klien Telekomunikasi',
    placementLocation: 'Bandung & Jawa Barat',
    headcountNeeded: 4,
    headcountFilled: 1,
    contractType: 'PKWT',
    salaryMin: 4600000,
    salaryMax: 5100000,
    salaryNote: 'Gaji Pokok + BPJS Kesehatan & Ketenagakerjaan',
    jobdesk: [
      'Merekap laporan progres instalasi harian tim teknisi lapangan.',
      'Memverifikasi berita acara penyelesaian pekerjaan (BAPP) dan absensi proyek.',
      'Menyusun laporan mingguan untuk diserahkan kepada koordinator proyek klien.',
    ],
    requirements: [
      'Pendidikan minimal D3 Teknik / Administrasi / Komputer.',
      'Mahir menggunakan rumus pengolahan data spreadsheet (VLOOKUP, Pivot).',
      'Teliti dalam pengelolaan dokumen legal & berita acara proyek.',
    ],
    deadlineDate: '2026-12-28',
    urgency: 'Normal',
    status: 'Aktif',
    recruiterName: 'Dina Lestari',
    createdAt: '05 Nov 2026',
  },
];

export const INITIAL_APPLICANT_PROFILES: ApplicantProfileRecord[] = [
  {
    id: 'app-user-1',
    applicantCode: 'PLM-2026-001',
    loginId: 'plm-sari',
    fullName: 'Sari Wulandari',
    email: 'sari.wulandari@pelamar-demo.id',
    password: '1234',
    whatsappNumber: '081294550112',
    nik: '3174025407000003',
    birthPlace: 'Jakarta',
    birthDate: '2000-07-14',
    gender: 'Perempuan',
    religion: 'Islam',
    maritalStatus: 'Belum Kawin',
    bloodType: 'O',
    education: 'S1 Manajemen',
    npwpNumber: '',
    bpjsKesehatanNumber: '',
    bpjsKetenagakerjaanNumber: '',
    ktpAddress: {
      street: 'Jl. Tebet Timur Dalam III No. 14',
      rtRw: '004/005',
      kelurahan: 'Tebet Timur',
      kecamatan: 'Tebet',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12820',
    },
    domicileSameAsKtp: true,
    domicileAddress: 'Jl. Tebet Timur Dalam III No. 14, RT/RW 004/005, Tebet Timur, Jakarta Selatan',
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
    bankAccountHolder: 'Sari Wulandari',
    bankBranch: '',
    latestExperience: '2 Tahun sebagai Customer Relation & Administrasi Cabang di Jakarta Selatan',
    skillsSummary: 'Pelayanan Pelanggan, Microsoft Excel, Verifikasi Berkas Kredit',
    documents: {
      cvUploaded: true,
      ktpUploaded: true,
      kkUploaded: false,
      simUploaded: false,
      ijazahUploaded: true,
      sertifikatUploaded: false,
      passFotoUploaded: true,
      skckUploaded: false,
      transkripNilaiUploaded: true,
      bankBookUploaded: false,
      contractUploaded: false,
    },
    documentFileNames: {
      cvUploaded: 'CV_Sari_Wulandari_2026.pdf',
      ktpUploaded: 'KTP_Sari_Wulandari.jpg',
      ijazahUploaded: 'Ijazah_S1_Manajemen.pdf',
      passFotoUploaded: 'Pas_Foto_Sari_3x4.jpg',
      transkripNilaiUploaded: 'Transkrip_Sari.pdf',
    },
    ocrSources: {
      ktpVerifiedByOcr: false,
      kkVerifiedByOcr: false,
    },
  },
  {
    id: 'app-user-2',
    applicantCode: 'PLM-2026-002',
    loginId: 'plm-rizky',
    fullName: 'Rizky Ramadhan',
    email: 'rizky.ramadhan@pelamar-demo.id',
    password: '1234',
    whatsappNumber: '085219880224',
    nik: '3173041803970002',
    birthPlace: 'Bekasi',
    birthDate: '1997-03-18',
    gender: 'Laki-laki',
    religion: 'Islam',
    maritalStatus: 'Kawin',
    bloodType: 'A',
    education: 'D3 Administrasi Perkantoran',
    npwpNumber: '91.440.112.4-019.000',
    bpjsKesehatanNumber: '',
    bpjsKetenagakerjaanNumber: '',
    ktpAddress: {
      street: 'Jl. Kalimalang Raya Blok B2 No. 7',
      rtRw: '002/006',
      kelurahan: 'Pondok Kelapa',
      kecamatan: 'Duren Sawit',
      city: 'Jakarta Timur',
      province: 'DKI Jakarta',
      postalCode: '13450',
    },
    domicileSameAsKtp: true,
    domicileAddress: 'Jl. Kalimalang Raya Blok B2 No. 7, Duren Sawit, Jakarta Timur',
    kkNumber: '3173041109220004',
    headOfFamily: 'Rizky Ramadhan',
    familyMembers: [
      {
        id: 'fam-app-1',
        name: 'Nisa Fitriani',
        relation: 'Pasangan',
        birthDate: '1998-06-21',
        nik: '3173046106980001',
      },
    ],
    emergencyContact: {
      name: 'Nisa Fitriani',
      relation: 'Istri',
      phone: '085219889900',
    },
    bankName: 'Bank Mandiri',
    bankAccountNumber: '1250094812031',
    bankAccountHolder: 'Rizky Ramadhan',
    bankBranch: 'KCP Pondok Kelapa',
    latestExperience: '3 Tahun Field Collector & Remedial Officer Jabodetabek',
    skillsSummary: 'Survei Lapangan, Negosiasi, Pelaporan Harian Mobile',
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
      contractUploaded: false,
    },
    documentFileNames: {
      cvUploaded: 'CV_Rizky_Ramadhan.pdf',
      ktpUploaded: 'eKTP_Rizky.jpg',
      kkUploaded: 'KK_Rizky_Ramadhan.jpg',
      simUploaded: 'SIM_C_Rizky.jpg',
      ijazahUploaded: 'Ijazah_D3_Rizky.pdf',
      sertifikatUploaded: 'Sertifikat_SPPI.pdf',
      passFotoUploaded: 'Foto_Rizky.jpg',
      skckUploaded: 'SKCK_Polres_Jaktim.pdf',
      transkripNilaiUploaded: 'Transkrip_Rizky.pdf',
      bankBookUploaded: 'Rekening_Mandiri_Rizky.jpg',
    },
    ocrSources: {
      ktpVerifiedByOcr: true,
      kkVerifiedByOcr: true,
      lastKtpScanAt: '11 Nov 2026 · 14:20',
      lastKkScanAt: '11 Nov 2026 · 14:22',
    },
  },
];

export const INITIAL_JOB_APPLICATIONS: JobApplicationRecord[] = [
  {
    id: 'lam-1',
    applicationCode: 'APP-2026-101',
    vacancyId: 'vac-2',
    applicantId: 'app-user-1',
    appliedAt: '11 Nov 2026 · 09:30',
    stage: 'Jadwal Interview',
    requiresFullProfile: true,
    recruiterNotes:
      'Kandidat sudah dihubungi via WhatsApp. Jadwal wawancara dikonfirmasi; wajib melengkapi data KK, rekening bank, dan sisa berkas sebelum Offering.',
    interview: {
      date: '2026-11-16',
      time: '10:00 WIB',
      mode: 'Offline (Datang ke Kantor)',
      locationOrLink: 'Graha Swatama SWAPRO Lt. 2, Jl. Raya Tanjung Barat No. 129, Jakarta Selatan',
      interviewerName: 'Dina Lestari & Koordinator Klien BAF',
      notesToApplicant:
        'Harap hadir 15 menit lebih awal membawa KTP asli & melengkapi No. KK serta Buku Rekening di Profil Pelamar.',
    },
    handedOffToOnboarding: false,
  },
  {
    id: 'lam-2',
    applicationCode: 'APP-2026-102',
    vacancyId: 'vac-1',
    applicantId: 'app-user-2',
    appliedAt: '10 Nov 2026 · 15:15',
    stage: 'Offering',
    requiresFullProfile: true,
    recruiterNotes:
      'Lolos wawancara HR & User Klien Adira (Skor 91/100). Data KTP, KK, SIM, SKCK, dan Rekening sudah 100% terverifikasi siap Onboarding PKWT.',
    interview: {
      date: '2026-11-11',
      time: '13:30 WIB',
      mode: 'Online (Video Call)',
      locationOrLink: 'https://meet.swapro-demo.co.id/rekrutmen-adira-102',
      interviewerName: 'Dina Lestari',
      notesToApplicant: 'Diskusi kompensasi dan penempatan wilayah Jakarta Pusat.',
      evaluationScore: 91,
      evaluationSummary: 'Komunikatif, memiliki SIM C aktif, memahami SOP verifikasi lapangan.',
    },
    handedOffToOnboarding: false,
  },
];

export function calculateAgeFromIsoDate(
  birthDateIso: string,
  refIsoDate = '2026-11-13'
): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateIso.trim());
  if (!match) return 0;
  const [, by, bm, bd] = match.map(Number);
  const [ry, rm, rd] = refIsoDate.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) {
    age -= 1;
  }
  return Math.max(0, age);
}

export function formatRupiahSimple(amount: number): string {
  const clean = Math.max(0, Math.round(Number(amount) || 0));
  return `Rp ${clean.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function formatSalaryRangeRupiah(min: number, max: number, note?: string): string {
  if (min <= 0 && max <= 0) {
    return note?.trim() || 'Kompetitif / Sesuai Penempatan';
  }
  if (max > min) {
    return `${formatRupiahSimple(min)} – ${formatRupiahSimple(max)}`;
  }
  return formatRupiahSimple(min || max);
}

export function computeRemainingHeadcount(
  vacancy: Pick<JobVacancyRecord, 'headcountNeeded' | 'headcountFilled'>
): number {
  return Math.max(0, vacancy.headcountNeeded - vacancy.headcountFilled);
}

export function getDistinctClientNames(
  vacancies: JobVacancyRecord[],
  entities: EntityRecord[]
): string[] {
  const set = new Set<string>();
  entities.forEach((e) => {
    if (e.name.trim()) set.add(e.name.trim());
  });
  vacancies.forEach((v) => {
    if (v.clientName.trim()) set.add(v.clientName.trim());
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export interface ApplicantCompletenessResult {
  completedFields: number;
  totalFields: number;
  percentage: number;
  missingEmployeeFields: string[];
  isEmployeeReady: boolean;
}

export function calculateApplicantProfileCompleteness(
  profile: ApplicantProfileRecord
): ApplicantCompletenessResult {
  const missing: string[] = [];

  const checks: Array<[boolean, string]> = [
    [Boolean(profile.fullName.trim()), 'Nama Lengkap sesuai KTP'],
    [/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()), 'Email Aktif'],
    [profile.whatsappNumber.replace(/[^0-9]/g, '').length >= 10, 'No. WhatsApp Aktif'],
    [/^\d{16}$/.test(profile.nik.replace(/\s+/g, '')), 'NIK e-KTP (16 digit)'],
    [Boolean(profile.birthPlace.trim()) && Boolean(profile.birthDate.trim()), 'Tempat & Tanggal Lahir'],
    [
      Boolean(profile.ktpAddress.street.trim()) && Boolean(profile.ktpAddress.city.trim()),
      'Alamat Jalan & Kota KTP',
    ],
    [/^\d{16}$/.test(profile.kkNumber.replace(/\s+/g, '')), 'Nomor Kartu Keluarga (16 digit)'],
    [Boolean(profile.headOfFamily.trim()), 'Nama Kepala Keluarga (KK)'],
    [
      Boolean(profile.emergencyContact.name.trim()) &&
        profile.emergencyContact.phone.replace(/[^0-9]/g, '').length >= 9,
      'Kontak Darurat Keluarga',
    ],
    [Boolean(profile.bankName.trim()), 'Nama Bank'],
    [/^\d{8,20}$/.test(profile.bankAccountNumber.replace(/\s+/g, '')), 'Nomor Rekening (8-20 digit)'],
    [Boolean(profile.bankAccountHolder.trim()), 'Nama Pemilik Rekening'],
    [Boolean(profile.documents.cvUploaded), 'Upload Berkas CV'],
    [Boolean(profile.documents.ktpUploaded), 'Upload Scan e-KTP'],
    [Boolean(profile.documents.kkUploaded), 'Upload Scan Kartu Keluarga (KK)'],
    [Boolean(profile.documents.ijazahUploaded), 'Upload Ijazah Terakhir'],
    [Boolean(profile.documents.passFotoUploaded), 'Upload Pas Foto'],
    [Boolean(profile.documents.bankBookUploaded), 'Upload Halaman Buku Rekening'],
  ];

  let completedFields = 0;
  for (const [ok, label] of checks) {
    if (ok) completedFields += 1;
    else missing.push(label);
  }

  const totalFields = checks.length;
  const percentage = Math.round((completedFields / totalFields) * 100);

  return {
    completedFields,
    totalFields,
    percentage,
    missingEmployeeFields: missing,
    isEmployeeReady: missing.length === 0,
  };
}

export function filterVacanciesForApplicant(
  vacancies: JobVacancyRecord[],
  query: string,
  locationFilter = 'Semua',
  urgencyFilter: 'Semua' | 'Mendesak' = 'Semua'
): JobVacancyRecord[] {
  const q = query.trim().toLowerCase();
  return vacancies.filter((vac) => {
    if (vac.status === 'Draft' || vac.status === 'Ditutup') return false;
    if (computeRemainingHeadcount(vac) <= 0) return false;
    const matchesLoc =
      locationFilter === 'Semua' ||
      vac.placementLocation.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesUrgency =
      urgencyFilter === 'Semua' || vac.urgency === 'Mendesak' || vac.status === 'Mendesak';

    const visibleClient = vac.showClientNameToApplicants
      ? vac.clientName
      : vac.clientIndustryLabel;

    const matchesQuery =
      !q ||
      vac.position.toLowerCase().includes(q) ||
      visibleClient.toLowerCase().includes(q) ||
      vac.placementLocation.toLowerCase().includes(q) ||
      vac.department.toLowerCase().includes(q) ||
      vac.jobdesk.some((j) => j.toLowerCase().includes(q)) ||
      vac.requirements.some((r) => r.toLowerCase().includes(q));

    return matchesLoc && matchesUrgency && matchesQuery;
  });
}

export function filterApplicationsForRecruiter(
  applications: JobApplicationRecord[],
  vacancies: JobVacancyRecord[],
  applicants: ApplicantProfileRecord[],
  stageFilter: ApplicationStage | 'Semua' = 'Semua',
  vacancyFilter = 'Semua',
  query = ''
): JobApplicationRecord[] {
  const q = query.trim().toLowerCase();
  return applications.filter((app) => {
    const matchesStage = stageFilter === 'Semua' || app.stage === stageFilter;
    const matchesVacancy = vacancyFilter === 'Semua' || app.vacancyId === vacancyFilter;
    if (!matchesStage || !matchesVacancy) return false;
    if (!q) return true;

    const applicant = applicants.find((a) => a.id === app.applicantId);
    const vacancy = vacancies.find((v) => v.id === app.vacancyId);

    return (
      app.applicationCode.toLowerCase().includes(q) ||
      Boolean(applicant?.fullName.toLowerCase().includes(q)) ||
      Boolean(applicant?.email.toLowerCase().includes(q)) ||
      Boolean(applicant?.nik.includes(q)) ||
      Boolean(vacancy?.position.toLowerCase().includes(q)) ||
      Boolean(vacancy?.clientName.toLowerCase().includes(q))
    );
  });
}

export function buildApplicantEmployeeFormPrefill(
  profile: ApplicantProfileRecord,
  vacancy: JobVacancyRecord,
  candidateCode: string,
  joinDate: string,
  contractEndDate: string
): Partial<EmployeeFormInput> {
  const suffix = candidateCode.replace(/\D/g, '').slice(-3) || '301';
  const empCodePrefix = vacancy.employmentType === 'Internal' ? 'INT' : 'OUT';
  const ctrPrefix = `${vacancy.contractType}-${vacancy.employmentType === 'Internal' ? 'INT' : 'CLN'}`;
  const monthlySalary =
    vacancy.salaryMax > 0
      ? Math.round((vacancy.salaryMin + vacancy.salaryMax) / 2)
      : vacancy.salaryMin;

  return {
    employeeCode: `${empCodePrefix}-${suffix}`,
    fullName: profile.fullName,
    email: profile.email,
    whatsappNumber: profile.whatsappNumber,
    position: vacancy.position,
    department: vacancy.department,
    employmentType: vacancy.employmentType,
    entityName: vacancy.clientName,
    contractType: vacancy.contractType,
    contractNumber: `${ctrPrefix}-2026/${suffix}`,
    joinDate,
    contractEndDate: vacancy.contractType === 'PKWT' ? contractEndDate : '',
    status: 'Probation',
    nik: profile.nik,
    birthPlace: profile.birthPlace,
    birthDate: profile.birthDate,
    gender: profile.gender,
    religion: profile.religion,
    maritalStatus: profile.maritalStatus,
    bloodType: profile.bloodType,
    education: profile.education,
    npwpNumber: profile.npwpNumber,
    bpjsKesehatanNumber: profile.bpjsKesehatanNumber ?? '',
    bpjsKetenagakerjaanNumber: profile.bpjsKetenagakerjaanNumber ?? '',
    ktpAddress: { ...profile.ktpAddress },
    domicileSameAsKtp: profile.domicileSameAsKtp,
    domicileAddress: profile.domicileAddress,
    kkNumber: profile.kkNumber,
    headOfFamily: profile.headOfFamily,
    familyMembers: profile.familyMembers.map((f) => ({ ...f })),
    emergencyContact: { ...profile.emergencyContact },
    bankName: profile.bankName,
    bankAccountNumber: profile.bankAccountNumber,
    bankAccountHolder: profile.bankAccountHolder || profile.fullName,
    bankBranch: profile.bankBranch,
    documents: {
      ...profile.documents,
      contractUploaded: false,
    },
    salaryMonthly: monthlySalary > 0 ? monthlySalary : undefined,
    placementLocation: `${vacancy.clientName} — ${vacancy.placementLocation}`,
  };
}
