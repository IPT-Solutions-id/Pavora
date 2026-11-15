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

export const ROLES: RoleDefinition[] = [
  {
    id: 'master-admin',
    name: 'Master Admin',
    code: 'Level 01 · Tata Kelola Korporat',
    shortDesc: 'Kendali penuh lintas entitas, konfigurasi kebijakan perusahaan, dan audit keamanan sistem.',
    authoritySummary:
      'Memiliki otoritas tertinggi untuk mengatur struktur anak perusahaan, matriks persetujuan, hak akses RBAC, dan jejak audit.',
    permissions: [
      'Konfigurasi multi-entitas dan struktur cabang perusahaan',
      'Pengaturan role, izin akses, dan kebijakan keamanan data',
      'Persetujuan final anggaran penggajian dan perubahan jabatan',
      'Akses penuh log aktivitas dan laporan eksekutif lintas divisi',
    ],
    primaryModules: ['Struktur Organisasi', 'Manajemen RBAC', 'Audit Log', 'Eksekutif Analitik'],
    metrics: [
      { label: 'Entitas Aktif', value: '6 Unit' },
      { label: 'Kebijakan RBAC', value: '24 Matriks' },
      { label: 'Kepatuhan Audit', value: '100%' },
    ],
    previewTitle: 'Ringkasan Otoritas & Kebijakan Entitas',
    previewColumns: ['Entitas / Modul', 'Cakupan Akses', 'Status'],
    previewRows: [
      {
        item: 'PT Mitra Karya Nusantara — Pusat',
        scope: 'Seluruh Divisi · 420 Karyawan',
        status: 'Terverifikasi',
        tone: 'success',
      },
      {
        item: 'Kebijakan Penggajian & PPh 21 TER',
        scope: 'Otomatisasi Bulanan',
        status: 'Aktif',
        tone: 'info',
      },
      {
        item: 'Persetujuan Perubahan Struktur Divisi',
        scope: 'Menunggu Otorisasi Final',
        status: 'Perlu Tinjauan',
        tone: 'warning',
      },
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    code: 'Level 02 · Operasional HR',
    shortDesc: 'Pengelolaan administrasi karyawan, jadwal shift, rekap presensi, cuti, dan pemrosesan payroll.',
    authoritySummary:
      'Menangani operasional SDM harian secara terpusat mulai dari pemutakhiran data pegawai hingga eksekusi payroll dan pelaporan BPJS.',
    permissions: [
      'Pemeliharaan database karyawan, kontrak kerja, dan dokumen PKWT/PKWTT',
      'Verifikasi absensi harian, lembur, serta jadwal kerja shift',
      'Eksekusi kalkulasi gaji bulanan, PPh 21, dan potongan BPJS',
      'Validasi pengajuan cuti tahunan, izin, dan klaim tunjangan',
    ],
    primaryModules: ['Direktori Karyawan', 'Absensi & Shift', 'Payroll & Pajak', 'Manajemen Cuti'],
    metrics: [
      { label: 'Kehadiran Hari Ini', value: '97,4%' },
      { label: 'Payroll Periode', value: 'Siap Proses' },
      { label: 'Tiket Administrasi', value: '12 Tertangani' },
    ],
    previewTitle: 'Antrean Operasional HR Harian',
    previewColumns: ['Aktivitas Operasional', 'Departemen', 'Status'],
    previewRows: [
      {
        item: 'Rekapitulasi Kehadiran & Lembur',
        scope: 'Operasional & Teknik',
        status: 'Sinkronisasi Selesai',
        tone: 'success',
      },
      {
        item: 'Perhitungan Slip Gaji & PPh 21',
        scope: 'Seluruh Karyawan Tetap',
        status: 'Dalam Validasi',
        tone: 'warning',
      },
      {
        item: 'Pembaruan Kontrak Kerja PKWT',
        scope: '5 Karyawan Periode Q4',
        status: 'Terjadwal',
        tone: 'info',
      },
    ],
  },
  {
    id: 'rekruter',
    name: 'Rekruter',
    code: 'Level 03 · Akuisisi Talenta',
    shortDesc: 'Pipeline rekrutmen end-to-end dari publikasi lowongan, penyaringan CV, hingga offering letter.',
    authoritySummary:
      'Fokus pada efektivitas perekrutan dengan pelacakan kandidat terstruktur, penjadwalan wawancara, dan serah terima data kandidat ke Admin.',
    permissions: [
      'Publikasi kebutuhan posisi dan pengelolaan portal lowongan internal/eksternal',
      'Pelacakan kandidat lintas tahap (Screening, Tes Teknis, Wawancara HR/User)',
      'Penjadwalan wawancara terkoordinasi dengan manajer perekrut',
      'Pembuatan surat penawaran kerja dan konversi kandidat menjadi karyawan aktif',
    ],
    primaryModules: ['Applicant Tracking', 'Jadwal Wawancara', 'Bank Talenta', 'Offering Digital'],
    metrics: [
      { label: 'Posisi Terbuka', value: '14 Posisi' },
      { label: 'Kandidat Aktif', value: '186 Pelamar' },
      { label: 'Rata-Rata Time to Hire', value: '18 Hari' },
    ],
    previewTitle: 'Pipeline Kandidat Aktif',
    previewColumns: ['Posisi & Kandidat', 'Tahapan Saat Ini', 'Status'],
    previewRows: [
      {
        item: 'Senior Backend Engineer — R. Pratama',
        scope: 'Wawancara Teknis Lanjutan',
        status: 'Direkomendasikan',
        tone: 'success',
      },
      {
        item: 'HR Compliance Specialist — D. Lestari',
        scope: 'Penawaran Kerja (Offering)',
        status: 'Menunggu Tanda Tangan',
        tone: 'warning',
      },
      {
        item: 'Product Designer — N. Kusuma',
        scope: 'Evaluasi Portofolio',
        status: 'Dalam Proses',
        tone: 'info',
      },
    ],
  },
  {
    id: 'karyawan',
    name: 'Karyawan',
    code: 'Level 04 · Layanan Mandiri (ESS)',
    shortDesc: 'Akses mandiri untuk presensi, pengajuan cuti/lembur, unduh slip gaji, dan pembaruan profil.',
    authoritySummary:
      'Memberikan transparansi dan kemudahan bagi setiap karyawan untuk mengakses layanan SDM tanpa proses manual berulang.',
    permissions: [
      'Presensi masuk/keluar berbasis lokasi dan riwayat jam kerja real-time',
      'Pengajuan cuti, izin, lembur, dan reimbursement dengan pelacakan persetujuan',
      'Akses aman slip gaji bulanan dan bukti potong pajak tahunan',
      'Pembaruan data personal, tanggungan keluarga, dan riwayat pelatihan',
    ],
    primaryModules: ['Presensi Mandiri', 'Pengajuan Cuti', 'Slip Gaji Digital', 'Profil & Dokumen'],
    metrics: [
      { label: 'Sisa Cuti Tahunan', value: '9 Hari' },
      { label: 'Jam Kerja Bulan Ini', value: '164 Jam' },
      { label: 'Slip Gaji Terbaru', value: 'Tersedia' },
    ],
    previewTitle: 'Ringkasan Layanan Mandiri Karyawan',
    previewColumns: ['Layanan Pribadi', 'Periode / Detail', 'Status'],
    previewRows: [
      {
        item: 'Slip Gaji & Rincian Tunjangan',
        scope: 'Periode Berjalan',
        status: 'Siap Diunduh',
        tone: 'success',
      },
      {
        item: 'Pengajuan Cuti Tahunan (2 Hari)',
        scope: 'Persetujuan Kepala Divisi',
        status: 'Disetujui',
        tone: 'success',
      },
      {
        item: 'Pembaruan Data NPWP & Rekening',
        scope: 'Verifikasi Administrasi',
        status: 'Tercatat',
        tone: 'info',
      },
    ],
  },
];

export const CAPABILITY_MODULES: CapabilityModule[] = [
  {
    id: 'org-governance',
    index: '01',
    title: 'Tata Kelola Organisasi & Kontrol Akses Berbasis Peran',
    category: 'Struktur & Keamanan',
    description:
      'Pemetaan hierarki departemen, cabang, dan persetujuan berjenjang dengan pemisahan wewenang ketat antara Master Admin, Admin, Rekruter, dan Karyawan.',
    highlights: [
      'Bagan organisasi dinamis lintas unit bisnis',
      'Matriks otorisasi dan jejak audit tersimpan otomatis',
      'Sinkronisasi data kepegawaian terpusat',
    ],
    colSpan: 2,
    surface: 'navy',
    roles: ['master-admin', 'admin'],
  },
  {
    id: 'recruitment-ats',
    index: '02',
    title: 'Akuisisi Talenta & Pelacakan Kandidat',
    category: 'Rekrutmen Terstruktur',
    description:
      'Kelola permintaan tenaga kerja, penyaringan pelamar, catatan wawancara terstandar, hingga konversi otomatis ke profil karyawan baru.',
    highlights: [
      'Pipeline kandidat dengan filter kualifikasi cepat',
      'Kartu skor wawancara antar pewawancara',
      'Transisi data pelamar ke onboarding tanpa input ulang',
    ],
    colSpan: 1,
    surface: 'white',
    roles: ['rekruter', 'master-admin'],
  },
  {
    id: 'attendance-leave',
    index: '03',
    title: 'Presensi, Jadwal Shift & Persetujuan Cuti',
    category: 'Operasional Waktu',
    description:
      'Pantau kehadiran harian, pola shift operasional, pengajuan lembur, dan saldo cuti secara real-time dengan aturan kebijakan yang dapat disesuaikan.',
    highlights: [
      'Rekap keterlambatan dan lembur otomatis ke payroll',
      'Kalender cuti tim untuk menjaga kapasitas kerja',
      'Pengajuan mandiri dari portal Karyawan',
    ],
    colSpan: 1,
    surface: 'light-blue',
    roles: ['admin', 'karyawan'],
  },
  {
    id: 'payroll-compliance',
    index: '04',
    title: 'Penggajian Otomatis & Kepatuhan Regulasi Indonesia',
    category: 'Kompensasi & Pajak',
    description:
      'Kalkulasi gaji pokok, tunjangan, potongan, PPh 21, serta iuran BPJS Kesehatan dan Ketenagakerjaan dengan slip gaji digital siap distribusi.',
    highlights: [
      'Perhitungan PPh 21 dan iuran BPJS terstandarisasi',
      'Validasi bertingkat oleh Admin dan Master Admin sebelum pencairan',
      'Distribusi slip gaji aman langsung ke akun Karyawan',
    ],
    colSpan: 2,
    surface: 'light-gray',
    roles: ['master-admin', 'admin', 'karyawan'],
  },
];

export const IMPACT_STATS: ImpactStat[] = [
  {
    value: '42%',
    label: 'Pemrosesan Payroll Lebih Cepat',
    detail: 'Rekonsiliasi absensi dan lembur otomatis per siklus gaji',
  },
  {
    value: '4 Peran',
    label: 'Akses Terisolasi RBAC',
    detail: 'Master Admin, Admin, Rekruter, dan Karyawan terpisah rapi',
  },
  {
    value: '100%',
    label: 'Kepatuhan Pajak & BPJS',
    detail: 'Format kalkulasi PPh 21 dan pelaporan iuran perusahaan',
  },
  {
    value: '18 Hari',
    label: 'Rata-Rata Siklus Rekrutmen',
    detail: 'Dari penyaringan kandidat hingga tanda tangan offering',
  },
];

export function getRoleById(roleId: RoleId): RoleDefinition {
  const found = ROLES.find((role) => role.id === roleId);
  return found ?? ROLES[0];
}

export function getModulesForRole(roleId: RoleId): CapabilityModule[] {
  return CAPABILITY_MODULES.filter((mod) => mod.roles.includes(roleId));
}
