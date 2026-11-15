import type {
  ContractRecord,
  EmployeeRecord,
  SystemSettingsConfig,
} from '../data/masterAdminData.ts';

export interface PkwtTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface PkwtDocumentPayload {
  pkwtNumber: string;
  signerName: string;
  signerPosition: string;
  clientLegalName: string;
  employeeName: string;
  ktpNumber: string;
  birthPlaceDate: string;
  ageYears: number;
  gender: 'Laki-Laki' | 'Perempuan';
  address: string;
  departmentDivision: string;
  position: string;
  placementLocation: string;
  placementShort: string;
  startDateText: string;
  endDateText: string;
  employeeInternalId: string;
  signingCity: string;
  signingDateText: string;
  monthlySalary: number;
  incentiveClientNote: string;
  overtimeClientNote: string;
  employeeSignatureDataUrl?: string;
  employeeSignedDateText?: string;
}

const ID_LONG_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const ID_SHORT_MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  mei: '05',
  may: '05',
  jun: '06',
  jul: '07',
  agu: '08',
  aug: '08',
  sep: '09',
  okt: '10',
  oct: '10',
  nov: '11',
  des: '12',
  dec: '12',
};

export function parseFlexibleDateToIso(dateStr: string): string {
  const clean = dateStr.trim();
  if (!clean) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const shortMatch = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(clean);
  if (shortMatch) {
    const [, dayRaw, monthWord, year] = shortMatch;
    const key = monthWord.slice(0, 3).toLowerCase();
    const mm = ID_SHORT_MONTH_MAP[key];
    if (mm) {
      return `${year}-${mm}-${dayRaw.padStart(2, '0')}`;
    }
  }
  return '';
}

export function formatIndonesianDateLong(dateInput: string): string {
  const clean = dateInput.trim();
  if (!clean) return '—';
  const iso = parseFlexibleDateToIso(clean);
  if (!iso) return clean;
  const [, year, monthStr, dayStr] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)!;
  const day = Number(dayStr);
  const monthName = ID_LONG_MONTHS[Number(monthStr) - 1] ?? monthStr;
  return `${day} ${monthName} ${year}`;
}

export function calculateAgeYears(birthDateInput: string, refDateInput: string): number {
  const birthIso = parseFlexibleDateToIso(birthDateInput);
  const refIso = parseFlexibleDateToIso(refDateInput) || '2026-11-12';
  if (!birthIso) return 24;

  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [ry, rm, rd] = refIso.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) {
    age -= 1;
  }
  return Math.max(17, age);
}

const BASIC_WORDS = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
  'sebelas',
];

function underThousandToWords(n: number): string {
  if (n === 0) return '';
  if (n < 12) return BASIC_WORDS[n];
  if (n < 20) return `${BASIC_WORDS[n - 10]} belas`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem = n % 10;
    return `${BASIC_WORDS[tens]} puluh${rem ? ` ${underThousandToWords(rem)}` : ''}`;
  }
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const prefix = hundreds === 1 ? 'seratus' : `${BASIC_WORDS[hundreds]} ratus`;
  return `${prefix}${rem ? ` ${underThousandToWords(rem)}` : ''}`;
}

export function numberToIndonesianWords(amount: number): string {
  const value = Math.floor(Math.max(0, Number.isFinite(amount) ? amount : 0));
  if (value === 0) return 'nol';

  const billions = Math.floor(value / 1_000_000_000);
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const remainder = value % 1_000;

  const parts: string[] = [];
  if (billions > 0) parts.push(`${underThousandToWords(billions)} miliar`);
  if (millions > 0) parts.push(`${underThousandToWords(millions)} juta`);
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'seribu' : `${underThousandToWords(thousands)} ribu`);
  }
  if (remainder > 0) parts.push(underThousandToWords(remainder));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function formatRupiahDot(amount: number): string {
  const value = Math.floor(Math.max(0, Number.isFinite(amount) ? amount : 0));
  const formatted = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp. ${formatted},-`;
}

function resolveClientDefaults(entityName: string, employmentType: 'Internal' | 'Penempatan Klien') {
  const lower = entityName.toLowerCase();
  if (lower.includes('adira')) {
    return {
      clientLegalName: 'PT Adira Dinamika Multi Finance, Tbk.',
      clientPolicyName: 'PT Adira Dinamika Multi Finance,Tbk',
      placementLocation:
        'PT Adira Dinamika Multi Finance, Tbk. Kantor Cabang Ketapang Jalan KH Zainul Arifin Blok A3-A4 No. 27, Jl. Kyai Haji Zainul Arifin No.27A RT.8/RW.1, Petojo Utara, Kecamatan Gambir, Kota Jakarta Pusat, 10130',
      placementShort: 'PT Adira Dinamika Multi Finance, Tbk. Kantor Cabang Ketapang',
      city: 'Jakarta Pusat',
      defaultSalary: 5729876,
    };
  }
  if (lower.includes('baf')) {
    return {
      clientLegalName: 'PT Bussan Auto Finance',
      clientPolicyName: 'PT Bussan Auto Finance',
      placementLocation:
        'PT Bussan Auto Finance Kantor Operasional Cabang Jakarta Pusat, Jl. Jend. Sudirman Kav. 21, Karet, Setiabudi, Kota Jakarta Pusat',
      placementShort: 'PT Bussan Auto Finance Kantor Operasional Jakarta Pusat',
      city: 'Jakarta Pusat',
      defaultSalary: 5396761,
    };
  }
  if (lower.includes('fif')) {
    return {
      clientLegalName: 'PT Federal International Finance (FIFGROUP)',
      clientPolicyName: 'PT Federal International Finance',
      placementLocation:
        'PT Federal International Finance (FIFGROUP) Kantor Regional Surabaya, Jl. Basuki Rahmat No. 88, Embong Kaliasin, Kota Surabaya, Jawa Timur',
      placementShort: 'PT Federal International Finance (FIFGROUP) Area Jawa Timur',
      city: 'Surabaya',
      defaultSalary: 5050000,
    };
  }
  if (lower.includes('bandung') || lower.includes('pelatihan')) {
    return {
      clientLegalName: 'PT. SWAPRO INTERNATIONAL',
      clientPolicyName: 'PT. SWAPRO INTERNATIONAL',
      placementLocation:
        'PT. SWAPRO INTERNATIONAL Pusat Rekrutmen & Pelatihan, Jl. Asia Afrika No. 44, Kota Bandung, Jawa Barat',
      placementShort: 'PT. SWAPRO INTERNATIONAL Pusat Rekrutmen & Pelatihan Bandung',
      city: 'Bandung',
      defaultSalary: 4750000,
    };
  }
  return {
    clientLegalName:
      employmentType === 'Internal' ? 'PT. SWAPRO INTERNATIONAL' : entityName || 'PT. SWAPRO INTERNATIONAL',
    clientPolicyName:
      employmentType === 'Internal' ? 'PT. SWAPRO INTERNATIONAL' : entityName || 'PT. SWAPRO INTERNATIONAL',
    placementLocation:
      'PT. SWAPRO INTERNATIONAL Graha Swatama Jl. Raya Tanjung Barat No. 129, Jagakarsa, Jakarta Selatan 12530',
    placementShort: 'PT. SWAPRO INTERNATIONAL Graha Swatama Jakarta Selatan',
    city: 'Jakarta Selatan',
    defaultSalary: 5396761,
  };
}

function formatFullKtpAddress(emp?: EmployeeRecord): string {
  if (!emp) {
    return 'Jakarta Selatan, DKI Jakarta';
  }
  const { street, rtRw, kelurahan, kecamatan, city, province } = emp.ktpAddress;
  return [
    street,
    rtRw ? `RT/RW ${rtRw}` : '',
    kelurahan ? `Kel. ${kelurahan}` : '',
    kecamatan ? `Kec. ${kecamatan}` : '',
    city,
    province,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatDepartmentLabel(rawDepartment: string, position: string): string {
  const lowerPos = position.toLowerCase();
  if (lowerPos.includes('remedial') || lowerPos.includes('collection')) return 'Collection';
  if (lowerPos.includes('customer service') || lowerPos.includes('layanan')) return 'Customer Service & Layanan';
  if (lowerPos.includes('surveyor')) return 'Survey & Operasional';
  if (lowerPos.includes('talent') || lowerPos.includes('training')) return 'Rekrutmen & Pelatihan';
  return rawDepartment || 'Operasional';
}

export function buildDefaultPkwtPayload(
  contract: ContractRecord,
  employee?: EmployeeRecord,
  settings?: Pick<SystemSettingsConfig, 'companyName' | 'pkwtSignatoryName' | 'pkwtSignatoryTitle'>
): PkwtDocumentPayload {
  const entityName = employee?.entityName || contract.entityName;
  const employmentType = employee?.employmentType || contract.employmentType;
  const clientDefaults = resolveClientDefaults(entityName, employmentType);

  const matchingHistory =
    employee?.contractHistory?.find((h) => h.contractNumber === contract.contractNumber) ??
    employee?.contractHistory?.[employee.contractHistory.length - 1];

  const startIso =
    parseFlexibleDateToIso(
      matchingHistory?.startDate || contract.startDate || employee?.joinDate || ''
    ) || '2026-01-02';
  const endIso =
    parseFlexibleDateToIso(
      matchingHistory?.endDate || contract.endDate || employee?.contractEndDate || ''
    ) || '2027-01-01';

  const startDateText = formatIndonesianDateLong(startIso);
  const endDateText = formatIndonesianDateLong(endIso);
  const birthPlace = employee?.birthPlace || 'Jakarta';
  const birthDateLong = formatIndonesianDateLong(employee?.birthDate || '1999-01-01');
  const ageYears = calculateAgeYears(employee?.birthDate || '1999-01-01', startIso);

  const rawGender = employee?.gender ?? 'Laki-laki';
  const gender: 'Laki-Laki' | 'Perempuan' =
    rawGender.toLowerCase() === 'perempuan' ? 'Perempuan' : 'Laki-Laki';

  const position = matchingHistory?.position || employee?.position || 'Staff Operasional';
  const departmentDivision = formatDepartmentLabel(employee?.department || '', position);

  const resolvedPlacement =
    employee?.placementName && employee?.placementArea
      ? `${employee.placementName} (${employee.placementArea})`
      : employee?.placementLocation || clientDefaults.placementLocation;

  return {
    pkwtNumber: contract.contractNumber,
    signerName: settings?.pkwtSignatoryName?.trim() || 'Farid Usman, S.Psi.',
    signerPosition: settings?.pkwtSignatoryTitle?.trim() || 'Direktur Operasional',
    clientLegalName: clientDefaults.clientLegalName,
    employeeName: employee?.fullName || contract.employeeName,
    ktpNumber: employee?.nik || '3174010101990001',
    birthPlaceDate: `${birthPlace}, ${birthDateLong}`,
    ageYears,
    gender,
    address: formatFullKtpAddress(employee),
    departmentDivision,
    position,
    placementLocation: resolvedPlacement,
    placementShort: employee?.placementName || employee?.placementLocation || clientDefaults.placementShort,
    startDateText,
    endDateText,
    employeeInternalId: employee?.employeeCode || contract.employeeCode,
    signingCity: clientDefaults.city,
    signingDateText: startDateText,
    monthlySalary:
      typeof employee?.salaryMonthly === 'number' && employee.salaryMonthly > 0
        ? employee.salaryMonthly
        : clientDefaults.defaultSalary,
    incentiveClientNote: `Sesuai ketentuan ${clientDefaults.clientPolicyName}`,
    overtimeClientNote: `Sesuai ketentuan ${clientDefaults.clientPolicyName}`,
    employeeSignatureDataUrl: matchingHistory?.employeeSignatureDataUrl,
    employeeSignedDateText: matchingHistory?.signedAt,
  };
}

export function buildReferenceSamplePkwtPayload(): PkwtDocumentPayload {
  return {
    pkwtNumber: '1898 / PKWT / SI - ADMF / I / 2026',
    signerName: 'Farid Usman, S.Psi.',
    signerPosition: 'Direktur Operasional',
    clientLegalName: 'PT Adira Dinamika Multi Finance, Tbk.',
    employeeName: 'Satria Suryo Bernanto',
    ktpNumber: '3174011206050011',
    birthPlaceDate: 'Jakarta, 12 Juni 2005',
    ageYears: 21,
    gender: 'Laki-Laki',
    address: 'Bukit Duri Selatan No 9 Kel Bukit Duri Kec Tebet Kab Jakarta Selatan Dki Jakarta',
    departmentDivision: 'Collection',
    position: 'Asa-Remedial Officer Mcy-Jkbr',
    placementLocation:
      'PT Adira Dinamika Multi Finance , Tbk. Kantor Cabang Ketapang Jalan KH Zainul Arifin Blok A3-A4 No. 27, Jl. Kyai Haji Zainul Arifin No.27A RT.8, RT.8/RW.1, Petojo Utara, Kecamatan Gambir, Kota Jakarta Pusat, 10130',
    placementShort: 'PT Adira Dinamika Multi Finance, Tbk. Kantor Cabang Ketapang',
    startDateText: '2 Januari 2026',
    endDateText: '1 Januari 2027',
    employeeInternalId: 'ADMF2579971',
    signingCity: 'Jakarta Pusat',
    signingDateText: '1 Januari 2026',
    monthlySalary: 5729876,
    incentiveClientNote: 'Sesuai ketentuan PT Adira Dinamika Multi Finance,Tbk',
    overtimeClientNote: 'Sesuai ketentuan PT Adira Dinamika Multi Finance,Tbk',
  };
}

// ============================================================================
// EXACT CLAUSE CONTENT BUILDERS (1:1 MATCH TO REFERENCE PDF PAGES 1 - 4)
// ============================================================================

export const PKWT_PARTY_1_DESC: PkwtTextRun[] = [
  { text: 'Bertindak untuk dan atas nama serta mewakili ' },
  { text: 'PT. SWAPRO INTERNATIONAL', bold: true },
  {
    text: ' berkedudukan di Jalan Raya Tanjung Barat No.129, Jagakarsa, Jakarta Selatan - 12530, yang selanjutnya dalam perjanjian kerja waktu tertentu ini disebut ',
  },
  { text: 'SWAPRO.', bold: true },
];

export const PKWT_PARTY_2_DESC: PkwtTextRun[] = [
  { text: 'Bertindak untuk dan atas nama diri sendiri yang selanjutnya dalam perjanjian kerja waktu tertentu ini disebut ' },
  { text: 'PEKERJA.', bold: true },
];

export const PKWT_RECITAL_INTRO: PkwtTextRun[] = [
  { text: 'SWAPRO', bold: true },
  { text: ' dan ' },
  { text: 'PEKERJA', bold: true },
  { text: ' secara bersama-sama selanjutnya disebut sebagai “' },
  { text: 'Para Pihak', bold: true },
  { text: '” dan secara sendiri disebut “' },
  { text: 'Pihak', bold: true },
  { text: '”, telah saling bersepakat untuk mengadakan Perjanjian Kerja Waktu Tertentu (selanjutnya disebut sebagai “' },
  { text: 'PKWT', bold: true },
  { text: '”), dengan terlebih dahulu menjelaskan beberapa hal sebagai berikut :' },
];

export function getPkwtRecitals(p: PkwtDocumentPayload): Array<{ label: string; runs: PkwtTextRun[] }> {
  return [
    {
      label: 'A.',
      runs: [
        { text: 'Bahwa ' },
        { text: 'SWAPRO', bold: true },
        {
          text: ' adalah Perusahaan alih daya yang bergerak di bidang jasa penyediaan sumber daya manusia dan manajemen fungsi sumber daya manusia, aktivitas penyedia gabungan jasa penunjang fasilitas, aktivitas penyedia gabungan jasa administrasi kantor, dan aktivitas konsultasi manajemen lainnya, serta ',
        },
        { text: 'PEKERJA', bold: true },
        { text: ' adalah individu pribadi yang telah dewasa dan memenuhi syarat sebagai subjek hukum.' },
      ],
    },
    {
      label: 'B.',
      runs: [
        { text: 'Bahwa ' },
        { text: 'Para Pihak', bold: true },
        { text: ' dalam ' },
        { text: 'PKWT', bold: true },
        { text: ' ini telah memahami, Pekerjaan yang akan dilakukan oleh ' },
        { text: 'PEKERJA', bold: true },
        {
          text: ' adalah pekerjaan yang bersifat sekali selesai untuk jangka waktu tidak lebih dari lima tahun, berdasarkan Perjanjian Kerjasama Tentang Alih Daya Pekerjaan antara ',
        },
        { text: 'SWAPRO', bold: true },
        { text: `, selaku Penerima Pekerjaan dengan ${p.clientLegalName} selaku Pemberi Pekerjaan (selanjutnya disebut sebagai “` },
        { text: 'KLIEN', bold: true },
        { text: '”), baik dalam satuan tenaga kerja atau pemborongan pekerjaan, dimana Pekerjaan yang akan dilakukan merupakan kegiatan penunjang perusahaan ' },
        { text: 'SWAPRO', bold: true },
        { text: ' dan/atau ' },
        { text: 'KLIEN', bold: true },
        { text: ' secara keseluruhan.' },
      ],
    },
    {
      label: 'C.',
      runs: [
        { text: 'Bahwa ' },
        { text: 'SWAPRO', bold: true },
        { text: ' menyatakan bersedia menerima ' },
        { text: 'PEKERJA', bold: true },
        { text: ' sebagai karyawan untuk jangka waktu tertentu dan ' },
        { text: 'PEKERJA', bold: true },
        { text: ' menyatakan setuju untuk menjadi karyawan ' },
        { text: 'SWAPRO', bold: true },
        { text: ' selama jangka waktu tertentu.' },
      ],
    },
    {
      label: 'D.',
      runs: [
        { text: 'Bahwa ' },
        { text: 'Para Pihak', bold: true },
        { text: ' bersepakat untuk mematuhi syarat-syarat dan ketentuan-ketentuan sebagai berikut :' },
      ],
    },
  ];
}

export const PASAL_2_ITEMS: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(1)',
    runs: [
      { text: 'Upah ' },
      { text: 'PEKERJA', bold: true },
      {
        text: ' sekurang-kurangnya adalah sesuai dengan besaran Upah Minimum yang berlaku di Kota/Kabupaten penempatan, sesuai peraturan perundang-undangan yang berlaku di lokasi penempatan.',
      },
    ],
  },
  {
    num: '(2)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' berhak atas jaminan sosial tenaga kerja sesuai dengan peraturan perundang-undangan yang berlaku.' },
    ],
  },
  {
    num: '(3)',
    runs: [
      { text: 'SWAPRO', bold: true },
      { text: ' akan memberikan Tunjangan Hari Raya (THR) kepada ' },
      { text: 'PEKERJA', bold: true },
      { text: ' sesuai dengan lokasi penempatan ' },
      { text: 'PEKERJA', bold: true },
      {
        text: ' sepanjang tidak bertentangan dengan peraturan peundang-undangan yang berlaku. Tunjangan Hari Raya (THR) diberikan paling lambat 7 (tujuh) hari sebelum hari raya Idul Fitri dan hanya diberikan kepada ',
      },
      { text: 'PEKERJA', bold: true },
      { text: ' jika pada tanggal hari raya Idul Fitri ' },
      { text: 'PEKERJA', bold: true },
      { text: ' masih terikat hubungan kerja dengan ' },
      { text: 'SWAPRO', bold: true },
      { text: ' berdasarkan ' },
      { text: 'PKWT', bold: true },
      { text: ' ini.' },
    ],
  },
  {
    num: '(4)',
    runs: [{ text: 'Pembayaran atas upah dilakukan paling lambat pada akhir bulan secara tunai atau transfer bank.' }],
  },
];

export const PASAL_3_PAGE1_ITEMS: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(1)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' berhak atas pembayaran pengupahan sesuai kesepakatan dalam PKWT ini.' },
    ],
  },
  {
    num: '(2)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' berhak atas jaminan terpenuhinya hak-hak dalam hubungan kerja sebagaimana diatur secara tegas dalam peraturan perundang-undangan.' },
    ],
  },
  {
    num: '(3)',
    runs: [
      {
        text: 'Hak-hak dalam hubungan kerja sebagaimana dimaksud dalam ayat (2) tersebut meliputi cuti tahunan apabila telah memenuhi persyaratan masa kerja, jaminan sosial, tunjangan hari raya dan hak istirahat 1 (satu) hari dalam 1 (satu) minggu kecuali jika menggunakan Waktu Kerja Khusus, hak menerima ganti rugi dalam hal hubungan kerja diakhiri oleh ',
      },
      { text: 'SWAPRO', bold: true },
      { text: ' sebelum jangka waktu PKWT ini berakhir bukan karena ketentuan sebagaimana dimaksud dalam PKWT ini dan/atau peraturan perundang-undangan ketenagakerjaan yang berlaku, hak menerima kompensasi dalam hal salah satu ' },
      { text: 'Pihak', bold: true },
      { text: ' mengakhiri hubungan kerja sesuai jangka waktu yang ditetapkan dalam PKWT ini dengan besaran perhitungan berdasarkan jangka waktu PKWT yang telah dilaksanakan oleh ' },
      { text: 'PEKERJA', bold: true },
      { text: ' dan/atau sesuai peraturan perundang-undangan ketenagakerjaan yang berlaku, hak atas penyesuaian upah yang diperhitungkan dari akumulasi masa kerja yang telah dilalui, hak-hak lain yang telah diatur secara tegas dalam peraturan perundang-undangan dan/atau PKWT sebelumnya.' },
    ],
  },
];

export const PASAL_3_PAGE2_ITEMS: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(4)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' berhak atas jaminan prinsip pengalihan perlindungan hak (' },
      { text: 'Transfer of Undertaking Protection Employmen', italic: true },
      { text: ' “TUPE”) apabila terjadi pergantian perusahaan penerima pemborongan atau perusahaan penyedia jasa pekerja.' },
    ],
  },
  {
    num: '(5)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' wajib menjalankan pekerjaan sehari-hari dengan sebaik-baiknya, mencurahkan segala keahlian dan pengetahuan, berusaha untuk selalu memperbaiki prestasi kerja untuk kepentingan ' },
      { text: 'SWAPRO', bold: true },
      { text: ' dan mencapai standar pretasi kerja yang telah ditentukan oleh ' },
      { text: 'SWAPRO', bold: true },
      { text: ' yaitu : ' },
      { text: 'KLIEN', bold: true },
      { text: ' merasa sangat puas karena menerima pelayanan yang sangat baik.' },
    ],
  },
  {
    num: '(6)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' wajib mentaati semua peraturan dan ketentuan yang berlaku di Perusahaan ' },
      { text: 'SWAPRO', bold: true },
      { text: ' dan ' },
      { text: 'KLIEN.', bold: true },
    ],
  },
  {
    num: '(7)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' wajib turut menjaga/memelihara harta milik ' },
      { text: 'SWAPRO', bold: true },
      { text: ' dan ' },
      { text: 'KLIEN.', bold: true },
    ],
  },
  {
    num: '(8)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' harus dapat mengusahakan kerjasama yang harmonis dengan ' },
      { text: 'SWAPRO', bold: true },
      { text: ', ' },
      { text: 'KLIEN', bold: true },
      { text: ' maupun dengan pekerja lainnya, bertingkah laku yang wajar baik di tempat kerja maupun di tengah masyarakat.' },
    ],
  },
  {
    num: '(9)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' wajib melaporkan kepada atasan langsungnya segala kejadian yang berpotensi merugikan ' },
      { text: 'SWAPRO', bold: true },
      { text: ' dan/atau ' },
      { text: 'KLIEN.', bold: true },
    ],
  },
];

export const PASAL_4_ITEMS: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(1)',
    runs: [
      { text: 'SWAPRO', bold: true },
      { text: ' berhak mendapatkan hasil kerja maksimal dari ' },
      { text: 'PEKERJA.', bold: true },
    ],
  },
  {
    num: '(2)',
    runs: [
      { text: 'SWAPRO', bold: true },
      { text: ' wajib membayar upah ' },
      { text: 'PEKERJA', bold: true },
      { text: ' sesuai kesepakatan dalam PKWT ini.' },
    ],
  },
  {
    num: '(3)',
    runs: [
      { text: 'SWAPRO', bold: true },
      { text: ' berhak menjalankan, mengatur dan menegakkan ketentuan disiplin kerja sesuai dengan Peraturan/Ketentuan Perusahaan yang ditetapkan maupun syarat-syarat kerja yang diatur dalam peraturan perundang-undangan yang berlaku.' },
    ],
  },
  {
    num: '(4)',
    runs: [
      { text: 'SWAPRO', bold: true },
      { text: ' berhak memberikan kesempatan pada ' },
      { text: 'PEKERJA', bold: true },
      { text: ' untuk ke arah usaha-usaha mendapat keterampilan menurut bakat, kemampuan, dan prestasi dari ' },
      { text: 'PEKERJA.', bold: true },
    ],
  },
  {
    num: '(5)',
    runs: [
      { text: 'Dalam hal ' },
      { text: 'SWAPRO', bold: true },
      { text: ' tidak mendapatkan pekerjaan lagi dari Pemberi Kerja untuk suatu proyek yang sama, tetapi pekerjaan tersebut masih ada, ' },
      { text: 'SWAPRO', bold: true },
      { text: ' wajib melaporkan kepada Pemberi Kerja, nama Pekerja beserta hak-hak Pekerja untuk dialihkan dan dipekerjakan pada Perusahaan Penerima Pemborongan Pekerjaan atau Perusahaan Penyedia Jasa Pekerja/Buruh yang baru. Hak yang dimaksud disini adalah Tunjangan Hari Raya (THR) secara proporsional.' },
    ],
  },
];

export const PASAL_5_SUBITEMS: Array<{ label: string; runs: PkwtTextRun[] }> = [
  {
    label: 'a.',
    runs: [
      {
        text: 'Maksimum 8 (Delapan) jam sehari untuk 5 (lima) hari kerja seminggu, atau Maksimum 7 (tujuh) jam sehari untuk 6 (enam) hari kerja seminggu, sesuai peraturan perundang-undangan yang berlaku; atau',
      },
    ],
  },
  {
    label: 'b.',
    runs: [
      { text: 'Waktu Kerja Khusus, yaitu waktu kerja yang bervariasi jamnya dan sesuai permintaan ' },
      { text: 'KLIEN', bold: true },
      { text: ' sepanjang tidak menyalahi peraturan perundang-undangan yang berlaku, termasuk namun tidak terbatas pada angkutan jarak jauh, waktu kerja tambang, ' },
      { text: 'shift', italic: true },
      { text: ' atau ' },
      { text: 'split shift.', italic: true },
    ],
  },
];

export const PASAL_5_ITEMS: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(2)',
    runs: [
      { text: 'Upah Lembur hanya dibayarkan jika ada Surat Perintah Lembur (SPL) yang ditandatangani ' },
      { text: 'SWAPRO.', bold: true },
    ],
  },
  {
    num: '(3)',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' yang sudah mendapatkan uang insentif atau uang ' },
      { text: 'service hour', italic: true },
      { text: ', tidak berhak lagi atas uang lembur.' },
    ],
  },
  {
    num: '(4)',
    runs: [
      { text: 'Jika ada waktu tunggu/' },
      { text: 'stand by', italic: true },
      { text: ' di mana ' },
      { text: 'PEKERJA', bold: true },
      { text: ' tidak sedang melayani ' },
      { text: 'KLIEN', bold: true },
      { text: ', maka ' },
      { text: 'Para Pihak', bold: true },
      { text: ' sepakat bahwa itu bukanlah waktu kerja yang dimaksud dalam PKWT ini.' },
    ],
  },
  {
    num: '(5)',
    runs: [
      { text: 'Waktu Kerja sebagaimana dimaksud dalam Pasal ini tidak termasuk apabila ' },
      { text: 'PEKERJA', bold: true },
      { text: ' diikutsertakan dalam proyek yang memiliki aturan target dan pengupahan tertentu yang bersifat borongan, sehingga oleh karenanya tidak berhak atas upah lembur.' },
    ],
  },
];

export const PASAL_6_SUBITEMS: Array<{ label: string; runs: PkwtTextRun[] }> = [
  {
    label: 'a.',
    runs: [
      { text: 'Setiap informasi, laporan dan/atau hasil riset, yang dibuat oleh ' },
      { text: 'SWAPRO', bold: true },
      { text: ' dan/atau atas nama ' },
      { text: 'KLIEN;', bold: true },
    ],
  },
  {
    label: 'b.',
    runs: [
      { text: 'Setiap rahasia ' },
      { text: 'SWAPRO', bold: true },
      { text: ' atau ' },
      { text: 'KLIEN', bold: true },
      { text: ', termasuk ' },
      { text: 'know – how', italic: true },
      { text: ' dan transaksi yang sifatnya rahasia;' },
    ],
  },
  {
    label: 'c.',
    runs: [
      { text: 'Jenis-jenis informasi lainnya yang dianggap rahasia oleh ' },
      { text: 'SWAPRO', bold: true },
      { text: ' atau ' },
      { text: 'KLIEN', bold: true },
      { text: ' yang diketahui oleh ' },
      { text: 'PEKERJA', bold: true },
      { text: ' selama hubungan kerja dan setelah berakhirnya hubungan kerja.' },
    ],
  },
  {
    label: 'd.',
    runs: [
      { text: 'Seluruh isi dokumen dan informasi, baik verbal maupun non-verbal, termasuk namun tidak terbatas pada ' },
      { text: 'Job Description,', italic: true },
      { text: ' Struktur Organisasi, Catatan Mutu, Instruksi Kerja, Prosedur dan dokumen-dokumen lain yang tidak disebutkan namun berkaitan erat untuk dipergunakan dalam mendukung Bisnis Unit atau Divisi.' },
    ],
  },
];

export const PASAL_6_ITEMS: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(2)',
    runs: [
      { text: 'Kewajiban sebagaimana dinyatakan dalam ayat (1) di atas berlaku baik selama berlakunya hubungan kerja maupun setelah berakhirnya hubungan kerja.' },
    ],
  },
  {
    num: '(3)',
    runs: [
      { text: 'Dalam hal ' },
      { text: 'SWAPRO', bold: true },
      { text: ' atau ' },
      { text: 'KLIEN', bold: true },
      { text: ' mengalami kerugian akibat pelanggaran ketentuan dalam ayat (1) dan (2) di atas oleh ' },
      { text: 'PEKERJA', bold: true },
      { text: ' dengan telah melalui proses pembuktian, maka ' },
      { text: 'PEKERJA', bold: true },
      { text: ' wajib memberikan ganti rugi/kompensasi atas kerugian yang dialami ' },
      { text: 'SWAPRO', bold: true },
      { text: ' atau ' },
      { text: 'KLIEN', bold: true },
      { text: ' tersebut dan/atau ' },
      { text: 'SWAPRO', bold: true },
      { text: ' berhak untuk melakukan/mengajukan gugatan/tuntutan/tindakan hukum atas pelanggaran ' },
      { text: 'PEKERJA', bold: true },
      { text: ' tersebut.' },
    ],
  },
  {
    num: '(4)',
    runs: [
      { text: 'Pada waktu penugasan ' },
      { text: 'PEKERJA', bold: true },
      { text: ' berakhir, maka ' },
      { text: 'PEKERJA', bold: true },
      { text: ' akan segera mengembalikan semua data, dokumen dan hal-hal lain milik ' },
      { text: 'SWAPRO', bold: true },
      { text: ' atau ' },
      { text: 'KLIEN', bold: true },
      { text: ' yang dikelola oleh ' },
      { text: 'PEKERJA', bold: true },
      { text: ' kepada ' },
      { text: 'SWAPRO', bold: true },
      { text: ' atau ' },
      { text: 'KLIEN', bold: true },
      { text: ' dan berjanji untuk tidak mengungkapkan atau menggunakan Informasi Rahasia tersebut kepada pihak lain.' },
    ],
  },
];

export const PASAL_7_P1: PkwtTextRun[] = [
  { text: 'Para Pihak', bold: true },
  { text: ' sepakat bahwa seluruh dokumen termasuk namun tidak terbatas pada materi mengajar, form-form internal dan dokumen-dokumen internal ' },
  { text: 'SWAPRO', bold: true },
  { text: ' lainnya yang dipergunakan dalam seluruh kegiatan ' },
  { text: 'SWAPRO', bold: true },
  { text: ' atau ' },
  { text: 'KLIEN', bold: true },
  { text: ', baik yang disusun oleh ' },
  { text: 'PEKERJA', bold: true },
  { text: ' dalam rangka menjalankan fungsi profesionalnya maupun dokumen-dokumen yang memang telah disediakan oleh ' },
  { text: 'SWAPRO', bold: true },
  { text: ' atau ' },
  { text: 'KLIEN', bold: true },
  { text: ', merupakan hak kekayaan intelektual milik ' },
  { text: 'SWAPRO', bold: true },
  { text: ' atau ' },
  { text: 'KLIEN.', bold: true },
  { text: ' Oleh karena itu hak kekayaan intelektual/seluruh dokumen tersebut tidak dapat dipergunakan, dipinjamkan, diperbanyak atau dijual kepada pihak lain di Indonesia dan/atau di manapun juga.' },
];

export const PASAL_7_P2: PkwtTextRun[] = [
  { text: 'Para Pihak', bold: true },
  { text: ' sepakat bahwa hak kekayaan intelektual/seluruh dokumen yang timbul dalam jangka waktu PKWT dan hubungan kerja ini merupakan hak ' },
  { text: 'SWAPRO', bold: true },
  { text: ' atau ' },
  { text: 'KLIEN', bold: true },
  { text: ', termasuk namun tidak terbatas kepada hasil karya ' },
  { text: 'PEKERJA', bold: true },
  { text: ' yang timbul selama jangka waktu hubungan kerja.' },
];

export const PASAL_8_ITEM_3_LIST: PkwtTextRun[] = [
  { text: '(a)', bold: true },
  { text: ' Tidak dapat masuk bekerja karena ditahan/dikurung oleh pihak berwajib akibat melakukan perbuatan yang berdasarkan bukti permulaan yang cukup dikategorikan tindak pidana berdasarkan peraturan perundang-undangan yang berlaku; ' },
  { text: '(b)', bold: true },
  { text: ' Berkata atau memberikan informasi yang tidak benar atau melakukan perbuatan yang berbeda dengan yang diketahui oleh ' },
  { text: 'SWAPRO', bold: true },
  { text: ' atau ' },
  { text: 'KLIEN;', bold: true },
  { text: ' ' },
  { text: '(c)', bold: true },
  { text: ' Mengambil barang yang bukan hak miliknya atau memindahkan barang ke tempat yang tidak sesuai dengan yang diperintahkan; ' },
  { text: '(d)', bold: true },
  { text: ' Mempengaruhi, meminta, memaksa atau memerintahkan orang lain untuk bertindak di luar norma-norma yang berlaku di masyarakat; ' },
  { text: '(e)', bold: true },
  { text: ' Melakukan perbuatan atau tindakan yang mengancam keselamatan ' },
  { text: 'SWAPRO, KLIEN', bold: true },
  { text: ' atau orang lain; ' },
  { text: '(f)', bold: true },
  { text: ' Membongkar atau membocorkan rahasia ' },
  { text: 'SWAPRO', bold: true },
  { text: ' dan/atau ' },
  { text: 'KLIEN;', bold: true },
  { text: ' ' },
  { text: '(g)', bold: true },
  { text: ' Memperoleh sesuatu berdasarkan tebakan atau mempertaruhkan sesuatu untuk memiliki lebih banyak uang atau barang dengan selain dari apa yang diperkenankan oleh peraturan perundang-undangan yang berlaku; ' },
  { text: '(h)', bold: true },
  { text: ' Membuat citra ' },
  { text: 'SWAPRO', bold: true },
  { text: ' dan/atau ' },
  { text: 'KLIEN', bold: true },
  { text: ' menjadi tidak baik, atau meminta/menerima imbalan jasa/gratifikasi dari siapapun tanpa sepengetahuan atasan, dan/atau ditujukan untuk melakukan hal-hal yang merugikan perusahaan; ' },
  { text: '(i)', bold: true },
  { text: ' Melakukan perbuatan kekerasan seksual di dalam maupun di luar tempat kerja sedemikian rupa sehingga dapat dianggap mencemarkan nama baik perusahaan; ' },
  { text: '(j)', bold: true },
  { text: ' Membawa pulang dan/atau menyalahgunakan benda/barang, terutama kendaraan, milik ' },
  { text: 'SWAPRO', bold: true },
  { text: ' dan/atau ' },
  { text: 'KLIEN', bold: true },
  { text: ' tanpa ijin tertulis dari pejabat yang berwenang/pimpinan ' },
  { text: 'SWAPRO', bold: true },
  { text: ' dan/atau ' },
  { text: 'KLIEN;', bold: true },
  { text: ' ' },
  { text: '(k)', bold: true },
  { text: ' Tidak menjaga dengan baik atau merusak barang, kendaraan bermotor atau komponen kendaraan bermotor milik ' },
  { text: 'SWAPRO', bold: true },
  { text: ' atau milik ' },
  { text: 'KLIEN', bold: true },
  { text: ', sehingga rusak atau hilang; ' },
  { text: '(l)', bold: true },
  { text: ' Penggandaan atau penduplikasian dalam bentuk apapun yang merugikan atau berpotensi merugikan ' },
  { text: 'SWAPRO', bold: true },
  { text: ' dan/atau ' },
  { text: 'KLIEN;', bold: true },
  { text: ' ' },
  { text: '(m)', bold: true },
  { text: ' Membocorkan atau membuat rahasia ' },
  { text: 'SWAPRO', bold: true },
  { text: ' dan/atau ' },
  { text: 'KLIEN', bold: true },
  { text: ' diketahui orang atau pihak lain yang tidak berhak untuk tahu; ' },
  { text: '(n)', bold: true },
  { text: ' Tindakan ' },
  { text: 'PEKERJA', bold: true },
  { text: ' yang meninggalkan pekerjaan 3 (tiga) hari berturut-turut tanpa keterangan secara tertulis yang dilengkapi dengan bukti yang sah; ' },
  { text: '(o)', bold: true },
  { text: ' Memiliki hubungan kerja dengan pihak lain, tanpa ijin tertulis dari ' },
  { text: 'SWAPRO;', bold: true },
  { text: ' ' },
  { text: '(p)', bold: true },
  { text: ' Memanfaatkan atau berusaha memiliki barang milik ' },
  { text: 'SWAPRO', bold: true },
  { text: ' atau ' },
  { text: 'KLIEN', bold: true },
  { text: ' yang dipercayakan/dititipkan kepadanya; ' },
  { text: '(q)', bold: true },
  { text: ' Membawa atau menggunakan barang yang tidak boleh untuk dikonsumsi atau dimiliki tanpa izin berdasarkan peraturan perundang-undangan yang berlaku; ' },
  { text: '(r)', bold: true },
  { text: ' Melakukan perbuatan sehingga membuat orang lain terluka secara fisik dan/atau mental; ' },
  { text: '(s)', bold: true },
  { text: ' Mencapai batas usia 56 (lima puluh enam) Tahun; ' },
  { text: '(t)', bold: true },
  { text: ' Terikat kontrak atau memiliki hubungan kerja secara langsung/tidak langsung, atau bekerja di Perusahan lain atau pihak lain selain ' },
  { text: 'SWAPRO;', bold: true },
  { text: ' ' },
  { text: '(u)', bold: true },
  { text: ' Tidak memenuhi ' },
  { text: 'target/goal setting', italic: true },
  { text: ' pekerjaan yang ditentukan ' },
  { text: 'SWAPRO', bold: true },
  { text: ' dan/atau ' },
  { text: 'KLIEN;', bold: true },
  { text: ' ' },
  { text: '(v)', bold: true },
  {
    text: ' Membongkar dan/atau membocorkan rahasia perusahaan termasuk dan tidak terbatas pada data nasabah dengan cara memperjualbelikan dan/atau mengalihkan data nasabah tersebut kepada pihak lain guna untuk kepentingan pribadi yang tidak sesuai dengan ketentuan yang berlaku di perusahaan atau mencemarkan nama baik pimpinan perusahaan dan/atau keluarga pimpinan perusahaan yang seharusnya dirahasiakan terkecuali diperlukan guna untuk kepentingan Negara.',
  },
];

export const PASAL_8_ITEMS_BEFORE_3: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(1).',
    runs: [
      { text: 'Dalam hal ' },
      { text: 'PEKERJA', bold: true },
      { text: ' secara sepihak mengakhiri hubungan kerja sebelum masa berlaku PKWT ini berakhir, maka ' },
      { text: 'PEKERJA', bold: true },
      { text: ' wajib memberitahukan secara tertulis kepada ' },
      { text: 'SWAPRO', bold: true },
      { text: ' 30 (tiga puluh) hari sebelumnya. Apabila pemberitahuan tertulis disampaikan ' },
      { text: 'PEKERJA', bold: true },
      { text: ' kepada ' },
      { text: 'SWAPRO', bold: true },
      { text: ' kurang dari 30 (tiga puluh) hari ' },
      { text: 'Para Pihak', bold: true },
      { text: ' sepakat untuk menangguhkan hak-hak dan hal-hal yang bersifat administrasi.' },
    ],
  },
  {
    num: '(2).',
    runs: [
      { text: 'Dengan berakhirnya PKWT ini atas sebab sebagaimana dimaksud dalam ayat (1) Pasal ini, maka hubungan kerja antara ' },
      { text: 'SWAPRO', bold: true },
      { text: ' dan ' },
      { text: 'PEKERJA putus dengan sendirinya, tanpa ganti rugi dan/atau kompensasi apapun dari SWAPRO.', bold: true, italic: true },
    ],
  },
];

export const PASAL_8_ITEMS_AFTER_3: Array<{ num: string; runs: PkwtTextRun[] }> = [
  {
    num: '(4).',
    runs: [
      { text: 'Tanpa mengurangi ketentuan ayat terdahulu, maka ' },
      { text: 'PEKERJA', bold: true },
      {
        text: ' yang mangkir bekerja tanpa surat resmi akan dikenakan Denda sebesar Upah dibagi 25 (dua puluh lima) atau jumlah hari kerja dalam sebulan untuk tiap hari mangkir, yang diperhitungkan proporsional pada saat pembayaran upah bulanan dan/atau dikenakan ganti rugi sebesar upah bulanan dikali sisa masa jangka waktu PKWT;',
      },
    ],
  },
  {
    num: '(5).',
    runs: [
      { text: 'PEKERJA', bold: true },
      { text: ' yang melakukan suatu perbuatan baik disengaja ataupun tidak, sehingga menimbulkan kerugian bagi ' },
      { text: 'SWAPRO, KLIEN', bold: true },
      { text: ' atau pihak lain, maka ' },
      { text: 'PEKERJA', bold: true },
      { text: ' wajib bertanggung jawab sepenuhnya atas kerugian tersebut dan akan dikenakan sanksisesuai ketentuan yang berlaku di Perusahaan ' },
      { text: 'SWAPRO.', bold: true },
    ],
  },
];

export const PENUTUP_RUNS: PkwtTextRun[] = [
  { text: 'PKWT ini telah dibaca dengan baik dan ditandatangani oleh ' },
  { text: 'Para Pihak', bold: true },
  { text: ' dengan kesadaran penuh dan tanpa ada paksaan, dimana ' },
  { text: 'Para Pihak', bold: true },
  {
    text: ' telah memahami dan menyatakan kesanggupannya untuk melaksanakan isi PKWT ini. Demikian PKWT ini dibuat dalam rangkap 2 (dua), yang masing-masing mempunyai kekuatan hukum mengikat.',
  },
];
