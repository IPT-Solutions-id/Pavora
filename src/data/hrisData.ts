export type RoleId = 'master-admin' | 'admin' | 'rekruter' | 'karyawan';

export interface RoleMetric {
  label: string;
  value: string;
}

export interface RoleTableRow {
  item: string;
  scope: string;
  status: string;
  tone: 'success' | 'warning' | 'info';
}

export interface RoleDefinition {
  id: RoleId;
  name: string;
  code: string;
  shortDesc: string;
  authoritySummary: string;
  permissions: string[];
  primaryModules: string[];
  metrics: RoleMetric[];
  previewTitle: string;
  previewColumns: [string, string, string];
  previewRows: RoleTableRow[];
}

export interface CapabilityModule {
  id: string;
  index: string;
  title: string;
  category: string;
  description: string;
  highlights: string[];
  colSpan: 1 | 2;
  surface: 'white' | 'navy' | 'light-blue' | 'light-gray';
  roles: RoleId[];
}

export interface ImpactStat {
  value: string;
  label: string;
  detail: string;
}

export interface WorkflowStep {
  step: string;
  role: string;
  title: string;
  summary: string;
}

export const ROLES: RoleDefinition[] = [
  {
    id: 'master-admin',
    name: 'Master Admin',
    code: 'Level 01 · Tata Kelola Korporat',
    shortDesc:
      'Kendali penuh lintas unit & klien penempatan, kebijakan jam kerja, pengawasan PKWT, serta audit sistem.',
    authoritySummary:
      'Memiliki otoritas tertinggi untuk mengatur struktur unit internal maupun klien penempatan, matriks RBAC, kebijakan absensi & geofence, serta persetujuan final.',
    permissions: [
      'Konfigurasi unit internal, klien penempatan, cabang lokasi & posisi kerja',
      'Pengaturan role RBAC, isolasi cakupan Admin/Rekruter, dan log audit aktivitas',
      'Penetapan kebijakan jam kerja, toleransi terlambat, dan lokasi presensi per klien',
      'Otorisasi final cuti/izin sakit (SKD), perpanjangan PKWT, dan pejabat penanda tangan',
    ],
    primaryModules: [
      'Unit & Klien',
      'Hak Akses RBAC',
      'Kebijakan Presensi',
      'Monitoring & PKWT',
    ],
    metrics: [
      { label: 'Unit & Klien Aktif', value: '5 Entitas' },
      { label: 'Kebijakan RBAC', value: '24 Matriks' },
      { label: 'Kepatuhan Audit', value: '100%' },
    ],
    previewTitle: 'Ringkasan Otoritas & Kebijakan Entitas',
    previewColumns: ['Entitas / Modul', 'Cakupan Akses', 'Status'],
    previewRows: [
      {
        item: 'Adira Finance — Penempatan Regional',
        scope: 'Cabang Tebet & Bekasi · Override Jadwal Klien',
        status: 'Terverifikasi',
        tone: 'success',
      },
      {
        item: 'Kebijakan Biometrik & Lokasi Presensi',
        scope: 'Anti-Spoof 4 Gerbang · Radius GPS Terkunci',
        status: 'Aktif',
        tone: 'info',
      },
      {
        item: 'Penerbitan Perpanjangan PKWT Ke-2',
        scope: 'Menunggu Tinjauan & TTD Digital Karyawan',
        status: 'Perlu Tinjauan',
        tone: 'warning',
      },
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    code: 'Level 02 · Operasional HR & Berkas',
    shortDesc:
      'Pengelolaan data karyawan, verifikasi 11 berkas, kepesertaan BPJS, penerbitan PKWT, dan rekap absensi.',
    authoritySummary:
      'Menangani operasional SDM harian sesuai unit/klien yang ditugaskan, mulai dari onboarding karyawan baru hingga pemantauan absensi, EOC kontrak, dan dokumen.',
    permissions: [
      'Pemeliharaan database karyawan, NIK KTP/KK, dan kelengkapan 11 berkas administrasi',
      'Pengelolaan nomor & kartu kepesertaan BPJS Kesehatan (JKN-KIS) serta BPJS Ketenagakerjaan',
      'Penerbitan dokumen PKWT 4 halaman 1:1 dan usulan perpanjangan kontrak sebelum EOC',
      'Pemantauan rekap absensi harian, keterlambatan, Alpha, dan tindak lanjut SKD',
    ],
    primaryModules: [
      'Data Karyawan',
      'Onboarding & PKWT',
      'Kartu BPJS & 11 Berkas',
      'Rekap Kehadiran',
    ],
    metrics: [
      { label: 'Kehadiran Tim Klien', value: '97,4%' },
      { label: 'Kelengkapan 11 Berkas', value: '94%' },
      { label: 'Antrean Onboarding', value: 'Terpantau' },
    ],
    previewTitle: 'Antrean Operasional HR Harian',
    previewColumns: ['Aktivitas Operasional', 'Unit / Penempatan', 'Status'],
    previewRows: [
      {
        item: 'Rekapitulasi Hadir, Telat & Klarifikasi Alpha',
        scope: 'Unit Internal & Klien BAF',
        status: 'Sinkronisasi Selesai',
        tone: 'success',
      },
      {
        item: 'Verifikasi Kartu BPJS & 11 Berkas Karyawan',
        scope: 'Karyawan Probation Adira Finance',
        status: 'Dalam Validasi',
        tone: 'warning',
      },
      {
        item: 'Penerbitan Dokumen PKWT Ke-1 (4 Halaman)',
        scope: 'Siap TTD Karyawan di Menu TTD',
        status: 'Terjadwal',
        tone: 'info',
      },
    ],
  },
  {
    id: 'rekruter',
    name: 'Rekruter',
    code: 'Level 03 · Akuisisi Talenta (ATS)',
    shortDesc:
      'Publikasi lowongan per klien, pipeline seleksi, jadwal wawancara, dan konversi otomatis ke karyawan.',
    authoritySummary:
      'Fokus pada pemenuhan kuota posisi di setiap klien melalui seleksi terstruktur, sinkron dengan jabatan & cabang resmi, hingga handoff otomatis menjadi NIK karyawan.',
    permissions: [
      'Publikasi lowongan berdasarkan daftar posisi & cabang resmi dari Master Klien',
      'Pelacakan kandidat lintas tahap (Screening, Wawancara, Offering, Lolos Onboarding)',
      'Verifikasi kelengkapan biodata & dokumen hasil OCR KTP/KK dari Portal Pelamar',
      'Konversi pelamar lolos menjadi karyawan aktif dengan NIK klien otomatis (mis. ADR-001)',
    ],
    primaryModules: [
      'Lowongan Klien',
      'Pipeline ATS',
      'Jadwal Wawancara',
      'Handoff Onboarding',
    ],
    metrics: [
      { label: 'Posisi Terbuka', value: '14 Posisi' },
      { label: 'Kandidat Aktif', value: '186 Pelamar' },
      { label: 'Rata-Rata Time to Hire', value: '18 Hari' },
    ],
    previewTitle: 'Pipeline Kandidat & Handoff Aktif',
    previewColumns: ['Posisi & Kandidat', 'Tahapan Saat Ini', 'Status'],
    previewRows: [
      {
        item: 'Field Collection Officer — Rizky Ramadhan',
        scope: 'Adira Finance · Data & OCR KTP/KK 100%',
        status: 'Siap Handoff NIK',
        tone: 'success',
      },
      {
        item: 'Customer Service Cabang — Sari Wulandari',
        scope: 'BAF Regional · Penawaran (Offering)',
        status: 'Menunggu Konfirmasi',
        tone: 'warning',
      },
      {
        item: 'Surveyor Pembiayaan — Hendra Saputra',
        scope: 'FIFGROUP · Jadwal Wawancara HR',
        status: 'Dalam Proses',
        tone: 'info',
      },
    ],
  },
  {
    id: 'karyawan',
    name: 'Karyawan',
    code: 'Level 04 · Layanan Mandiri (ESS)',
    shortDesc:
      'Presensi biometrik wajah live, pengajuan cuti/SKD, Menu TTD PKWT terkunci, serta kartu BPJS digital.',
    authoritySummary:
      'Memberikan kendali mandiri yang aman dan transparan bagi setiap karyawan untuk presensi anti-spoof, meninjau & menandatangani PKWT, serta mengakses dokumen kerja.',
    permissions: [
      'Registrasi biometrik & Clock-In/Out otomatis dengan deteksi kedip mata + toleh 3D',
      'Pengajuan cuti tahunan, izin sakit wajib lampiran SKD, serta klarifikasi Alpha',
      'Menu TTD khusus untuk meninjau draf PKWT 4 halaman lalu mengunci TTD secara permanen',
      'Pantauan Tanggal Join, EOC, Kartu Digital BPJS (JKN-KIS & KPJ), dan upload scan kartu',
    ],
    primaryModules: [
      'Presensi Biometrik',
      'Cuti & Izin SKD',
      'Menu TTD & Arsip PKWT',
      'Profil & Kartu BPJS',
    ],
    metrics: [
      { label: 'Sisa Cuti Tahunan', value: '12 Hari' },
      { label: 'Status Biometrik', value: 'Terverifikasi' },
      { label: 'Arsip PKWT & BPJS', value: 'Terkunci Aman' },
    ],
    previewTitle: 'Ringkasan Layanan Mandiri Karyawan',
    previewColumns: ['Layanan Pribadi', 'Periode / Detail', 'Status'],
    previewRows: [
      {
        item: 'Kontrak PKWT Ke-1 (4 Halaman PDF)',
        scope: 'Ditandatangani di Menu TTD · Read-Only',
        status: 'Terkunci & Siap Unduh',
        tone: 'success',
      },
      {
        item: 'Kartu Digital JKN-KIS & BPJAMSOSTEK',
        scope: 'Sinkron dengan Database Admin & Super Admin',
        status: 'Aktif Terdaftar',
        tone: 'success',
      },
      {
        item: 'Presensi Wajah Live (Kedip & Toleh 3D)',
        scope: 'Jadwal Cabang Penempatan Klien',
        status: 'Tervalidasi',
        tone: 'info',
      },
    ],
  },
];

export const CAPABILITY_MODULES: CapabilityModule[] = [
  {
    id: 'org-governance',
    index: '01',
    title: 'Tata Kelola Multi-Unit, Klien Penempatan & Kontrol Akses (RBAC)',
    category: 'Struktur & Keamanan',
    description:
      'Pemetaan unit internal, klien penempatan, lokasi cabang beserta titik Google Maps, serta isolasi wewenang ketat antar Master Admin, Admin, Rekruter, Karyawan, dan Pelamar.',
    highlights: [
      'Isolasi cakupan otomatis per Admin dan Rekruter sesuai unit/klien binaan',
      'Matriks otorisasi terpusat dan jejak audit setiap perubahan data',
      'Konfigurasi jam kerja wajib & toleransi telat global maupun khusus per klien',
    ],
    colSpan: 2,
    surface: 'navy',
    roles: ['master-admin', 'admin'],
  },
  {
    id: 'recruitment-ats',
    index: '02',
    title: 'Rekrutmen ATS, Portal Pelamar & OCR KTP/KK Otomatis',
    category: 'Akuisisi Talenta Terstruktur',
    description:
      'Kelola lowongan berbasis kuota posisi klien, seleksi kandidat terstandar, pengisian profil mandiri pelamar dengan OCR KTP/KK, hingga konversi otomatis ke NIK karyawan.',
    highlights: [
      'Portal Pelamar mandiri untuk pantau progres lamaran dan lengkapi berkas',
      'Ekstraksi data KTP & Kartu Keluarga cepat untuk mempercepat screening',
      'Konversi langsung pelamar lolos menjadi karyawan ber-NIK klien (mis. ADR-001)',
    ],
    colSpan: 1,
    surface: 'white',
    roles: ['rekruter', 'master-admin'],
  },
  {
    id: 'attendance-leave',
    index: '03',
    title: 'Presensi Biometrik Wajah Anti-Spoof Live & Pengajuan Cuti/SKD',
    category: 'Operasional Waktu & Kehadiran',
    description:
      'Validasi kehadiran 4 gerbang (wajah terdaftar, kamera langsung, kedip mata & toleh kepala 3D, serta kecocokan wajah ≥ 82%) lengkap dengan aturan cuti dan lampiran SKD.',
    highlights: [
      'Clock-In/Out otomatis saat seluruh verifikasi liveness 3D terpenuhi',
      'Deteksi telat & Alpha otomatis berbasis kebijakan jadwal masing-masing klien',
      'Pengajuan cuti tahunan, izin sakit dengan lampiran SKD, dan klarifikasi Alpha',
    ],
    colSpan: 1,
    surface: 'light-blue',
    roles: ['admin', 'karyawan'],
  },
  {
    id: 'pkwt-bpjs-compliance',
    index: '04',
    title: 'Kontrak PKWT Digital 4 Halaman, Menu TTD Terkunci & Kartu BPJS',
    category: 'Kepatuhan Kontrak & Dokumen',
    description:
      'Penerbitan kontrak PKWT 4 halaman A4 siap cetak dengan stempel & paraf resmi, penandatanganan sadar lewat Menu TTD, arsip permanen anti-edit, serta Kartu Digital BPJS & 11 berkas.',
    highlights: [
      'Perpanjangan PKWT (Ke-2, dst.) tidak menempelkan TTD otomatis — wajib ditinjau karyawan',
      'Dokumen selesai TTD langsung terkunci permanen (hanya lihat & unduh PDF)',
      'Kartu Digital JKN-KIS & BPJS Ketenagakerjaan (KPJ) beserta upload scan fisik tersinkron',
    ],
    colSpan: 2,
    surface: 'light-gray',
    roles: ['master-admin', 'admin', 'karyawan'],
  },
];

export const END_TO_END_WORKFLOW: WorkflowStep[] = [
  {
    step: '01',
    role: 'Portal Pelamar',
    title: 'Daftar & Lengkapi OCR KTP/KK',
    summary: 'Pelamar memilih lowongan klien dan mengisi biodata serta unggah dokumen sekali saja.',
  },
  {
    step: '02',
    role: 'Rekruter (ATS)',
    title: 'Seleksi & Handoff Otomatis',
    summary: 'Kandidat lolos wawancara langsung terkonversi menjadi NIK klien tanpa input ulang.',
  },
  {
    step: '03',
    role: 'Admin HR',
    title: 'Verifikasi 11 Berkas & BPJS',
    summary: 'Admin melengkapi nomor/kartu BPJS, memastikan 11 berkas, dan memantau EOC PKWT.',
  },
  {
    step: '04',
    role: 'Karyawan (ESS)',
    title: 'Menu TTD PKWT & Biometrik',
    summary: 'Karyawan membaca kontrak 4 halaman, menandatangani di Menu TTD, lalu absen live 3D.',
  },
  {
    step: '05',
    role: 'Master Admin',
    title: 'Analitik Lintas Klien & Audit',
    summary: 'Pimpinan memantau grafik pertumbuhan SDM, rekap presensi, cuti SKD, dan audit log.',
  },
];

export const IMPACT_STATS: ImpactStat[] = [
  {
    value: '4 Gerbang',
    label: 'Biometrik Wajah Anti-Spoof',
    detail: 'Kamera langsung, kedip mata, toleh kepala 3D & ambang kecocokan wajah ≥ 82%',
  },
  {
    value: '5 Portal',
    label: 'Akses Terisolasi RBAC',
    detail: 'Master Admin, Admin, Rekruter, Karyawan, dan Pelamar terhubung real-time',
  },
  {
    value: '100%',
    label: 'Kepatuhan 11 Berkas & BPJS',
    detail: 'Pelacakan kelengkapan berkas, Kartu Digital JKN-KIS/KPJ & status TTD PKWT',
  },
  {
    value: '4 Halaman',
    label: 'PKWT Digital 1:1 & Kunci TTD',
    detail: 'Siap unduh PDF dengan stempel, paraf, dan arsip permanen anti-ubah setelah TTD',
  },
];

export function getRoleById(roleId: RoleId): RoleDefinition {
  const found = ROLES.find((role) => role.id === roleId);
  return found ?? ROLES[0];
}

export function getModulesForRole(roleId: RoleId): CapabilityModule[] {
  return CAPABILITY_MODULES.filter((mod) => mod.roles.includes(roleId));
}
