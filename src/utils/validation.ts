export interface DemoRequestInput {
  fullName: string;
  workEmail: string;
  companyName: string;
  employeeCount: string;
  priorityRole: string;
}

export interface DemoRequestErrors {
  fullName?: string;
  workEmail?: string;
  companyName?: string;
  employeeCount?: string;
  priorityRole?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: DemoRequestErrors;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const EMPLOYEE_COUNT_OPTIONS = [
  { value: '1-50', label: '1 – 50 Karyawan' },
  { value: '51-200', label: '51 – 200 Karyawan' },
  { value: '201-500', label: '201 – 500 Karyawan' },
  { value: '500+', label: 'Lebih dari 500 Karyawan' },
] as const;

export const PRIORITY_ROLE_OPTIONS = [
  { value: 'Master Admin', label: 'Master Admin (Tata Kelola & Multi-Entitas)' },
  { value: 'Admin', label: 'Admin (Operasional HR, Berkas & PKWT)' },
  { value: 'Rekruter', label: 'Rekruter (Akuisisi Talenta & ATS)' },
  { value: 'Karyawan', label: 'Karyawan (Layanan Mandiri / ESS)' },
] as const;

export function validateDemoRequest(input: DemoRequestInput): ValidationResult {
  const errors: DemoRequestErrors = {};

  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    errors.fullName = 'Masukkan nama lengkap Anda minimal 2 karakter.';
  }

  const trimmedEmail = input.workEmail.trim();
  if (!trimmedEmail) {
    errors.workEmail = 'Masukkan alamat email perusahaan Anda.';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.workEmail = 'Format alamat email tidak valid (contoh: nama@perusahaan.co.id).';
  }

  if (!input.companyName.trim() || input.companyName.trim().length < 2) {
    errors.companyName = 'Masukkan nama perusahaan atau instansi Anda.';
  }

  if (!input.employeeCount.trim()) {
    errors.employeeCount = 'Pilih rentang jumlah karyawan.';
  }

  if (!input.priorityRole.trim()) {
    errors.priorityRole = 'Pilih peran prioritas yang ingin dievaluasi.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatHeadcountLabel(value: string): string {
  const match = EMPLOYEE_COUNT_OPTIONS.find((opt) => opt.value === value);
  return match ? match.label : value;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface LoginErrors {
  identifier?: string;
  password?: string;
}

export interface LoginValidationResult {
  isValid: boolean;
  errors: LoginErrors;
}

const EMPLOYEE_ID_REGEX = /^[A-Za-z0-9._-]{3,32}$/;

export function isValidIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes('@')) {
    return EMAIL_REGEX.test(trimmed);
  }
  return EMPLOYEE_ID_REGEX.test(trimmed);
}

export function validateLoginForm(input: LoginInput): LoginValidationResult {
  const errors: LoginErrors = {};
  const trimmedId = input.identifier.trim();

  if (!trimmedId) {
    errors.identifier = 'Masukkan ID Karyawan atau email perusahaan Anda.';
  } else if (!isValidIdentifier(trimmedId)) {
    errors.identifier =
      'Format ID atau email tidak valid (contoh: EMP-1024 atau nama@perusahaan.co.id).';
  }

  if (!input.password) {
    errors.password = 'Masukkan kata sandi Anda.';
  } else if (input.password.length < 4) {
    errors.password = 'Kata sandi minimal terdiri dari 4 karakter.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ApplicantAuthCandidate {
  id: string;
  applicantCode: string;
  loginId: string;
  fullName: string;
  email: string;
  password: string;
  accountDisabled?: boolean;
  convertedToEmployeeCode?: string;
}

export interface EmployeeAuthCandidate {
  id: string;
  employeeCode: string;
  loginAlias?: string;
  fullName: string;
  email: string;
  entityName: string;
  employmentType: 'Internal' | 'Penempatan Klien';
  status: 'Aktif' | 'Probation' | 'Nonaktif';
  portalPassword?: string;
  originApplicantCode?: string;
  applicantId?: string;
  accountDisabled?: boolean;
}

export interface InternalUserAuthCandidate {
  id: string;
  employeeCode: string;
  loginAlias?: string;
  fullName: string;
  email: string;
  role: 'Master Admin' | 'Admin' | 'Rekruter' | 'Karyawan' | 'Pelamar';
  assignedScopes: string[];
  status: 'Aktif' | 'Menunggu Aktivasi' | 'Nonaktif';
  portalPassword?: string;
}

export interface MasterAdminUser {
  id: string;
  name: string;
  role: 'Master Admin' | 'Admin' | 'Rekruter' | 'Pelamar' | 'Karyawan';
  title: string;
  assignedScopes: string[];
  applicantId?: string;
  employeeId?: string;
  employeeCode?: string;
  email?: string;
}

export interface AuthAttemptResult {
  ok: boolean;
  user?: MasterAdminUser;
  error?: string;
}

export function authenticatePortalUser(
  identifier: string,
  password: string,
  registeredApplicants: ApplicantAuthCandidate[] = [],
  registeredEmployees: EmployeeAuthCandidate[] = [],
  registeredUsers: InternalUserAuthCandidate[] = []
): AuthAttemptResult {
  const normalizedId = identifier.trim().toLowerCase();

  // 1. Check registered internal management users if provided (Master Admin, Admin, Rekruter)
  const internalAliasMap: Record<string, string> = {
    'swa-fathur': 'ma-001',
    'swa-ulan': 'adm-014',
    'adm-siti': 'adm-014',
    'adm-bagus': 'adm-021',
    'swa-rama': 'rec-008',
    'rec-dina': 'rec-008',
  };
  const resolvedInternalCode = internalAliasMap[normalizedId] ?? normalizedId;

  const matchedInternalUser = registeredUsers.find(
    (u) =>
      (u.role === 'Master Admin' || u.role === 'Admin' || u.role === 'Rekruter') &&
      (u.employeeCode.toLowerCase() === resolvedInternalCode ||
        (u.loginAlias && u.loginAlias.toLowerCase() === normalizedId) ||
        u.email.toLowerCase() === normalizedId)
  );

  if (matchedInternalUser) {
    const expectedPwd = matchedInternalUser.portalPassword?.trim() || '1234';
    if (password !== expectedPwd) {
      return {
        ok: false,
        error: 'ID/Email atau kata sandi tidak sesuai. Periksa kembali kredensial Anda.',
      };
    }
    if (matchedInternalUser.status === 'Nonaktif') {
      return {
        ok: false,
        error: 'Akun pengelola ini sedang dinonaktifkan oleh Master Admin.',
      };
    }
    const roleTitle =
      matchedInternalUser.role === 'Master Admin'
        ? 'Master Admin · PT Swapro Nusantara'
        : matchedInternalUser.role === 'Rekruter'
          ? 'Talent Acquisition Lead · PT Swapro Nusantara'
          : `Admin Cakupan (${matchedInternalUser.assignedScopes.join(' & ') || 'Internal'})`;
    return {
      ok: true,
      user: {
        id:
          matchedInternalUser.role === 'Master Admin'
            ? matchedInternalUser.loginAlias || matchedInternalUser.employeeCode
            : matchedInternalUser.employeeCode,
        name: matchedInternalUser.fullName,
        role: matchedInternalUser.role,
        title: roleTitle,
        assignedScopes:
          matchedInternalUser.role === 'Admin' || matchedInternalUser.role === 'Rekruter'
            ? matchedInternalUser.assignedScopes
            : [],
        email: matchedInternalUser.email,
      },
    };
  }

  // Fallback built-in internal accounts when registeredUsers is not passed
  if (registeredUsers.length === 0) {
    if (normalizedId === 'swa-fathur' && password === '1234') {
      return {
        ok: true,
        user: {
          id: 'swa-fathur',
          name: 'Fathurrahman',
          role: 'Master Admin',
          title: 'Master Admin · PT Swapro Nusantara',
          assignedScopes: [],
        },
      };
    }
    if (
      (normalizedId === 'swa-ulan' ||
        normalizedId === 'swa-ulan@swapro-demo.co.id' ||
        normalizedId === 'adm-siti' ||
        normalizedId === 'siti.rahmawati@swapro-demo.co.id') &&
      password === '1234'
    ) {
      return {
        ok: true,
        user: {
          id: 'ADM-014',
          name: 'Ulan Rahmawati',
          role: 'Admin',
          title: 'Admin Cakupan Klien (Adira & BAF)',
          assignedScopes: [
            'Adira Finance — Penempatan Regional',
            'BAF — Layanan Operasional Cabang',
          ],
          email: 'swa-ulan@swapro-demo.co.id',
        },
      };
    }
    if (
      (normalizedId === 'adm-bagus' || normalizedId === 'bagus.prakoso@swapro-demo.co.id') &&
      password === '1234'
    ) {
      return {
        ok: true,
        user: {
          id: 'ADM-021',
          name: 'Bagus Prakoso',
          role: 'Admin',
          title: 'Admin Cakupan Pusat & FIFGROUP',
          assignedScopes: ['Kantor Pusat Operasional', 'FIFGROUP — Area Jawa Timur'],
        },
      };
    }
    if (
      (normalizedId === 'swa-rama' ||
        normalizedId === 'swa-rama@swapro-demo.co.id' ||
        normalizedId === 'rec-dina' ||
        normalizedId === 'rec-008' ||
        normalizedId === 'dina.lestari@swapro-demo.co.id') &&
      password === '1234'
    ) {
      return {
        ok: true,
        user: {
          id: 'REC-008',
          name: 'Rama Wijaya',
          role: 'Rekruter',
          title: 'Talent Acquisition Lead · PT Swapro Nusantara',
          assignedScopes: [
            'Pusat Rekrutmen & Pelatihan',
            'Adira Finance — Penempatan Regional',
            'FIFGROUP — Area Jawa Timur',
            'BAF — Layanan Operasional Cabang',
          ],
          email: 'swa-rama@swapro-demo.co.id',
        },
      };
    }
  }

  const applicantAliasMap: Record<string, string> = {
    'swa-pelamar': 'plm-2026-001',
    'plm-sari': 'plm-2026-001',
    'sari.wulandari@pelamar-demo.id': 'plm-2026-001',
  };
  const resolvedApplicantLookup = applicantAliasMap[normalizedId] ?? normalizedId;

  // 2. If user explicitly entered a Pelamar code/loginId (e.g. PLM-2026-002 or plm-rizky) that was already converted to an Employee NIK (e.g. ADR-001), inform them to use their new NIK
  const matchedApplicantByCode = registeredApplicants.find(
    (acc) =>
      acc.applicantCode.toLowerCase() === resolvedApplicantLookup ||
      (acc.loginId && !acc.loginId.includes('@') && acc.loginId.toLowerCase() === normalizedId)
  );
  if (matchedApplicantByCode) {
    const convertedEmp = registeredEmployees.find(
      (emp) =>
        emp.applicantId === matchedApplicantByCode.id ||
        (emp.originApplicantCode &&
          emp.originApplicantCode.toLowerCase() ===
            matchedApplicantByCode.applicantCode.toLowerCase())
    );
    const convertedNik =
      matchedApplicantByCode.convertedToEmployeeCode || convertedEmp?.employeeCode;
    if (convertedNik) {
      return {
        ok: false,
        error: `Akun pelamar ${matchedApplicantByCode.applicantCode} telah dialihkan menjadi akun Karyawan (NIK: ${convertedNik}). Silakan masuk menggunakan NIK ${convertedNik}.`,
      };
    }
  }

  // 3. Check registered / seeded Karyawan accounts (supports NIK Karyawan, email, loginAlias, and demo shortcuts swa-rudi / emp-nadia / emp-raka)
  const shortcutCodeMap: Record<string, string> = {
    'swa-rudi': 'new-209',
    'emp-rudi': 'new-209',
    'emp-nadia': 'out-318',
    'emp-raka': 'emp-1024',
  };
  const targetEmployeeLookup = shortcutCodeMap[normalizedId] ?? normalizedId;

  const matchedEmployee = registeredEmployees.find(
    (emp) =>
      emp.employeeCode.toLowerCase() === targetEmployeeLookup ||
      (emp.loginAlias && emp.loginAlias.toLowerCase() === normalizedId) ||
      emp.email.toLowerCase() === normalizedId ||
      emp.id.toLowerCase() === normalizedId
  );

  if (matchedEmployee) {
    const expectedEmployeePassword = matchedEmployee.portalPassword?.trim() || '1234';
    if (password === expectedEmployeePassword) {
      if (matchedEmployee.accountDisabled) {
        return {
          ok: false,
          error:
            'Akun karyawan Anda sedang dinonaktifkan sementara oleh Admin HR / Master Admin.',
        };
      }
      if (matchedEmployee.status === 'Nonaktif') {
        return {
          ok: false,
          error: 'Akun karyawan berstatus Nonaktif. Hubungi Admin HR atau Master Admin.',
        };
      }
      return {
        ok: true,
        user: {
          id: matchedEmployee.employeeCode,
          name: matchedEmployee.fullName,
          role: 'Karyawan',
          title: `Karyawan ${matchedEmployee.employmentType} · ${matchedEmployee.entityName}`,
          assignedScopes: [matchedEmployee.entityName],
          employeeId: matchedEmployee.id,
          employeeCode: matchedEmployee.employeeCode,
          email: matchedEmployee.email,
        },
      };
    }
  }

  // Fallback demo Karyawan if caller omitted registeredEmployees
  if (registeredEmployees.length === 0 && password === '1234') {
    if (
      normalizedId === 'swa-rudi' ||
      normalizedId === 'new-209' ||
      normalizedId === 'swa-rudi@swapro-demo.co.id'
    ) {
      return {
        ok: true,
        user: {
          id: 'NEW-209',
          name: 'Rudi Hartono',
          role: 'Karyawan',
          title: 'Karyawan Penempatan Klien · Adira Finance — Penempatan Regional',
          assignedScopes: ['Adira Finance — Penempatan Regional'],
          employeeId: 'emp-6',
          employeeCode: 'NEW-209',
          email: 'swa-rudi@swapro-demo.co.id',
        },
      };
    }
    if (
      normalizedId === 'emp-nadia' ||
      normalizedId === 'out-318' ||
      normalizedId === 'nadia.kusuma@swapro-demo.co.id'
    ) {
      return {
        ok: true,
        user: {
          id: 'OUT-318',
          name: 'Nadia Kusuma',
          role: 'Karyawan',
          title: 'Karyawan Penempatan Klien · BAF — Layanan Operasional Cabang',
          assignedScopes: ['BAF — Layanan Operasional Cabang'],
          employeeId: 'emp-2',
          employeeCode: 'OUT-318',
          email: 'nadia.kusuma@swapro-demo.co.id',
        },
      };
    }
  }

  // 4. Check registered / seeded Pelamar accounts
  const matchedApplicant = registeredApplicants.find(
    (acc) =>
      acc.loginId.toLowerCase() === normalizedId ||
      acc.email.toLowerCase() === normalizedId ||
      acc.applicantCode.toLowerCase() === resolvedApplicantLookup
  );
  if (matchedApplicant && matchedApplicant.password === password) {
    const convertedEmp = registeredEmployees.find(
      (emp) =>
        emp.applicantId === matchedApplicant.id ||
        (emp.originApplicantCode &&
          emp.originApplicantCode.toLowerCase() === matchedApplicant.applicantCode.toLowerCase())
    );
    const convertedNik = matchedApplicant.convertedToEmployeeCode || convertedEmp?.employeeCode;
    if (convertedNik) {
      return {
        ok: false,
        error: `Akun pelamar ${matchedApplicant.applicantCode} telah dialihkan menjadi akun Karyawan (NIK: ${convertedNik}). Silakan masuk menggunakan NIK ${convertedNik}.`,
      };
    }
    if (matchedApplicant.accountDisabled) {
      return {
        ok: false,
        error:
          'Akun pelamar ini sedang dinonaktifkan oleh Admin. Silakan hubungi tim Rekrutmen/HR.',
      };
    }
    return {
      ok: true,
      user: {
        id: matchedApplicant.applicantCode,
        name: matchedApplicant.fullName,
        role: 'Pelamar',
        title: 'Portal Pelamar Kerja PEVORA',
        assignedScopes: [],
        applicantId: matchedApplicant.id,
        email: matchedApplicant.email,
      },
    };
  }

  // Fallback default demo Pelamar if caller did not pass list
  if (
    registeredApplicants.length === 0 &&
    (normalizedId === 'swa-pelamar' ||
      normalizedId === 'swa-pelamar@pelamar-demo.id' ||
      normalizedId === 'plm-sari' ||
      normalizedId === 'sari.wulandari@pelamar-demo.id') &&
    password === '1234'
  ) {
    return {
      ok: true,
      user: {
        id: 'PLM-2026-001',
        name: 'Sari Wulandari',
        role: 'Pelamar',
        title: 'Portal Pelamar Kerja PEVORA',
        assignedScopes: [],
        applicantId: 'app-user-1',
        email: 'swa-pelamar@pelamar-demo.id',
      },
    };
  }

  return {
    ok: false,
    error: 'ID/Email atau kata sandi tidak sesuai. Periksa kembali kredensial Anda.',
  };
}

export const authenticateMasterAdmin = authenticatePortalUser;

export interface ForgotPasswordValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateForgotPasswordIdentifier(identifier: string): ForgotPasswordValidationResult {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Masukkan ID Karyawan atau email perusahaan terdaftar.',
    };
  }
  if (!isValidIdentifier(trimmed)) {
    return {
      isValid: false,
      error: 'Format ID atau email tidak valid (contoh: EMP-1024 atau nama@perusahaan.co.id).',
    };
  }
  return { isValid: true };
}

export interface RegisterInput {
  fullName: string;
  email: string;
  whatsappNumber?: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterErrors {
  fullName?: string;
  email?: string;
  whatsappNumber?: string;
  password?: string;
  confirmPassword?: string;
}

export interface RegisterValidationResult {
  isValid: boolean;
  errors: RegisterErrors;
}

export function validateRegisterForm(input: RegisterInput): RegisterValidationResult {
  const errors: RegisterErrors = {};

  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    errors.fullName = 'Masukkan nama lengkap Anda minimal 2 karakter.';
  }

  const trimmedEmail = input.email.trim();
  if (!trimmedEmail) {
    errors.email = 'Masukkan alamat email aktif Anda.';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Format alamat email tidak valid (contoh: nama@email.com).';
  }

  if (typeof input.whatsappNumber === 'string' && input.whatsappNumber.trim().length > 0) {
    const digits = input.whatsappNumber.replace(/[^0-9]/g, '');
    if (digits.length < 10 || digits.length > 15) {
      errors.whatsappNumber = 'Nomor WhatsApp harus terdiri dari 10–15 digit angka.';
    }
  }

  if (!input.password) {
    errors.password = 'Buat kata sandi minimal 6 karakter.';
  } else if (input.password.length < 6) {
    errors.password = 'Kata sandi minimal terdiri dari 6 karakter.';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Ulangi kata sandi untuk konfirmasi.';
  } else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}


