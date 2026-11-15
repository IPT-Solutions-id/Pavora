import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import {
  formatIndonesianDateLong,
  calculateAgeYears,
  numberToIndonesianWords,
  formatRupiahDot,
  buildDefaultPkwtPayload,
  buildReferenceSamplePkwtPayload,
} from './pkwtDocument';
import {
  buildPkwtDownloadFilename,
  buildPkwtServerDownloadUrl,
  encodePkwtPayloadBase64Url,
  generatePkwtPdfBytes,
  PkwtPdfAssets,
} from './pkwtPdfGenerator';
import {
  validateDemoRequest,
  formatHeadcountLabel,
  validateLoginForm,
  validateForgotPasswordIdentifier,
  validateRegisterForm,
  authenticateMasterAdmin,
  authenticatePortalUser,
} from './validation';
import { getRoleById, getModulesForRole, ROLES } from '../data/hrisData';
import {
  DOCUMENT_CHECKLIST_ITEMS,
  INITIAL_APPROVALS,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONTRACTS,
  INITIAL_EMPLOYEES,
  INITIAL_ENTITIES,
  INITIAL_LEAVE_ABSENCES,
  INITIAL_ONBOARDING_CANDIDATES,
  INITIAL_POLICY,
  INITIAL_SETTINGS,
  INITIAL_USERS,
  RBAC_MATRIX_ROWS,
  buildAttendanceRecapMailtoUrl,
  buildAttendanceRecapWhatsappUrl,
  buildEmployeeAttendanceRecapCsv,
  buildEmployeeMailtoUrl,
  buildEmployeeWhatsappUrl,
  buildInternalUserMailtoUrl,
  buildInternalUserWhatsappUrl,
  buildLeaveFollowupMailtoUrl,
  buildLeaveFollowupWhatsappUrl,
  buildNewAccountShareDetails,
  buildPerEmployeeAttendanceRecap,
  buildPevoraLicenseSummary,
  validateSystemSettingsInput,
  calculateDaysRemaining,
  countExpiringPkwtContracts,
  countPendingApprovals,
  countUploadedDocuments,
  evaluateAttendanceAgainstPolicy,
  extractEntityNikPrefix,
  filterAttendanceLogs,
  filterAuditLogs,
  filterByAssignedScopes,
  filterContracts,
  filterEmployees,
  filterUsersByQueryAndRole,
  formatAssignedScopesSummary,
  formatIndonesianDate,
  buildSkdCertificatePreviewDataUrl,
  calculateEmployeeLeaveQuotaSummary,
  generateClientEmployeeNik,
  getContractEocIndicator,
  maskSensitiveNumber,
  resolveEmployeeWorkSchedule,
  splitActiveEntitiesByCategory,
  summarizeAttendanceLogs,
  summarizePortalAccountStats,
  syncAttendanceLocationsFromEntities,
  validateEmployeeInput,
  validateLeaveRequestSubmission,
} from '../data/masterAdminData';
import {
  buildLiveAttendanceFeed,
  buildPlacementBreakdownAtPoint,
  buildWorkforceOverviewAnalytics,
  computeNiceZeroAxisScale,
} from './overviewAnalytics';
import {
  INITIAL_APPLICANT_PROFILES,
  INITIAL_JOB_APPLICATIONS,
  INITIAL_VACANCIES,
  buildApplicantEmployeeFormPrefill,
  calculateAgeFromIsoDate,
  calculateApplicantProfileCompleteness,
  computeRemainingHeadcount,
  filterApplicationsForRecruiter,
  filterVacanciesForApplicant,
  formatSalaryRangeRupiah,
  getDistinctClientNames,
} from '../data/recruitmentData';
import {
  FACE_MATCH_THRESHOLD_PERCENT,
  FacePoint,
  computeFaceDescriptorSimilarity,
  computeHeadYawRatio,
  createInitialLivenessState,
  evaluateActiveLivenessFrame,
  extractGeometricFaceDescriptor,
  summarizeAttendanceGates,
} from './faceVerification';
import {
  buildGoogleMapsUrl,
  isValidMapsUrl,
  parseGoogleMapsUrl,
} from './mapsUrl';

test('validateDemoRequest rejects empty fields with Indonesian error messages', () => {
  const result = validateDemoRequest({
    fullName: '',
    workEmail: '',
    companyName: '',
    employeeCount: '',
    priorityRole: '',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.fullName);
  assert.ok(result.errors.workEmail);
  assert.ok(result.errors.companyName);
  assert.ok(result.errors.employeeCount);
  assert.ok(result.errors.priorityRole);
});

test('validateDemoRequest rejects malformed email address', () => {
  const result = validateDemoRequest({
    fullName: 'Budi Santoso',
    workEmail: 'budi-at-perusahaan',
    companyName: 'PT Maju Bersama',
    employeeCount: '51-200',
    priorityRole: 'Admin',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.workEmail);
  assert.equal(result.errors.fullName, undefined);
});

test('validateDemoRequest accepts complete valid inquiry payload', () => {
  const result = validateDemoRequest({
    fullName: 'Siti Rahmawati',
    workEmail: 'siti.rahmawati@ipt.co.id',
    companyName: 'PT Iskandar Pratama Teknologi',
    employeeCount: '201-500',
    priorityRole: 'Master Admin',
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('formatHeadcountLabel maps option value to readable label', () => {
  assert.equal(formatHeadcountLabel('51-200'), '51 – 200 Karyawan');
  assert.equal(formatHeadcountLabel('custom'), 'custom');
});

test('HRIS role helpers return all 4 required roles and relevant modules', () => {
  assert.equal(ROLES.length, 4);
  assert.equal(getRoleById('rekruter').name, 'Rekruter');
  assert.equal(getRoleById('karyawan').name, 'Karyawan');
  assert.ok(getModulesForRole('master-admin').length >= 2);
  assert.ok(getModulesForRole('karyawan').some((m) => m.id === 'payroll-compliance'));
});

test('validateLoginForm rejects empty or short (<4) password and invalid identifier', () => {
  const emptyResult = validateLoginForm({ identifier: '', password: '' });
  assert.equal(emptyResult.isValid, false);
  assert.ok(emptyResult.errors.identifier);
  assert.ok(emptyResult.errors.password);

  const shortPwd = validateLoginForm({ identifier: 'swa-fathur', password: '123' });
  assert.equal(shortPwd.isValid, false);
  assert.equal(shortPwd.errors.identifier, undefined);
  assert.ok(shortPwd.errors.password);
});

test('validateLoginForm accepts swa-fathur with 4-char password and corporate email', () => {
  const dummyLogin = validateLoginForm({ identifier: 'swa-fathur', password: '1234' });
  assert.equal(dummyLogin.isValid, true);

  const byEmail = validateLoginForm({
    identifier: 'admin@iskandarpratama.co.id',
    password: 'Password123',
  });
  assert.equal(byEmail.isValid, true);
});

test('authenticateMasterAdmin accepts swa-fathur / 1234 and rejects wrong credentials', () => {
  const ok = authenticateMasterAdmin('swa-fathur', '1234');
  assert.equal(ok.ok, true);
  assert.equal(ok.user?.role, 'Master Admin');
  assert.equal(ok.user?.id, 'swa-fathur');

  const wrongPwd = authenticateMasterAdmin('swa-fathur', '9999');
  assert.equal(wrongPwd.ok, false);
  assert.ok(wrongPwd.error);

  const wrongId = authenticateMasterAdmin('other-user', '1234');
  assert.equal(wrongId.ok, false);
});

test('validateForgotPasswordIdentifier validates ID or email properly', () => {
  assert.equal(validateForgotPasswordIdentifier('').isValid, false);
  assert.equal(validateForgotPasswordIdentifier('invalid@').isValid, false);
  assert.equal(validateForgotPasswordIdentifier('EMP-2048').isValid, true);
  assert.equal(validateForgotPasswordIdentifier('hr@ipt.co.id').isValid, true);
});

test('validateRegisterForm validates individual registration fields and password match', () => {
  const empty = validateRegisterForm({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  assert.equal(empty.isValid, false);
  assert.ok(empty.errors.fullName);
  assert.ok(empty.errors.email);
  assert.ok(empty.errors.password);
  assert.ok(empty.errors.confirmPassword);

  const mismatch = validateRegisterForm({
    fullName: 'Andi Wijaya',
    email: 'andi@perusahaan.co.id',
    password: 'Password123',
    confirmPassword: 'Password999',
  });
  assert.equal(mismatch.isValid, false);
  assert.ok(mismatch.errors.confirmPassword);

  const valid = validateRegisterForm({
    fullName: 'Andi Wijaya',
    email: 'andi@perusahaan.co.id',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.errors, {});
});

test('Master Admin data helpers filter users, scopes, audit logs, and count pending approvals', () => {
  assert.equal(countPendingApprovals(INITIAL_APPROVALS), 3);
  assert.equal(filterUsersByQueryAndRole(INITIAL_USERS, '', 'Admin').length, 2);
  assert.equal(filterUsersByQueryAndRole(INITIAL_USERS, 'Dina', 'Semua').length, 1);
  assert.equal(filterUsersByQueryAndRole(INITIAL_USERS, '', 'Semua', 'Penempatan Klien').length, 2);

  const { internalUnits, clientPlacements } = splitActiveEntitiesByCategory(INITIAL_ENTITIES);
  assert.equal(internalUnits.length, 2);
  assert.equal(clientPlacements.length, 3);

  assert.equal(formatAssignedScopesSummary(['Adira Finance', 'BAF']), 'Adira Finance (+1 lainnya)');
  assert.equal(filterAuditLogs(INITIAL_AUDIT_LOGS, '', 'RBAC').length, 1);
  assert.equal(filterAuditLogs(INITIAL_AUDIT_LOGS, 'FIFGROUP', 'Semua').length, 1);
});

test('Attendance log summary, filtering, and PKWT contract helpers work accurately', () => {
  const summary = summarizeAttendanceLogs(INITIAL_ATTENDANCE_LOGS);
  assert.equal(summary.hadir, 2);
  assert.equal(summary.telat, 1);
  assert.equal(summary.cutiIzin, 2);
  assert.equal(summary.alpha, 1);

  assert.equal(filterAttendanceLogs(INITIAL_ATTENDANCE_LOGS, '', 'Alpha').length, 1);
  assert.equal(
    filterAttendanceLogs(INITIAL_ATTENDANCE_LOGS, '', 'Semua', 'Penempatan Klien').length,
    4
  );

  assert.equal(countExpiringPkwtContracts(INITIAL_CONTRACTS), 2);
  assert.equal(filterContracts(INITIAL_CONTRACTS, '', 'Segera Berakhir').length, 2);
  assert.equal(filterContracts(INITIAL_CONTRACTS, '', 'PKWTT').length, 1);
});

test('Employee database helpers mask sensitive IDs, format dates, and filter records', () => {
  assert.equal(maskSensitiveNumber('3174051504960004'), '3174••••••••0004');
  assert.equal(formatIndonesianDate('2025-12-01'), '01 Des 2025');
  assert.equal(calculateDaysRemaining('2026-11-30', '2026-11-12'), 18);
  assert.equal(calculateDaysRemaining('', '2026-11-12'), null);

  assert.equal(INITIAL_EMPLOYEES.length, 6);
  assert.equal(filterEmployees(INITIAL_EMPLOYEES, '', 'Penempatan Klien').length, 4);
  assert.equal(filterEmployees(INITIAL_EMPLOYEES, '085691230318', 'Semua').length, 1);
  assert.equal(filterEmployees(INITIAL_EMPLOYEES, '', 'Semua', 'PKWTT').length, 1);
  assert.equal(filterEmployees(INITIAL_EMPLOYEES, '', 'Semua', 'Probation').length, 1);
});

test('validateEmployeeInput enforces KTP, KK, Bank, WA, Email, Join Date and PKWT End of Contract', () => {
  const baseValid = {
    ...INITIAL_EMPLOYEES[1],
  };

  assert.equal(validateEmployeeInput(baseValid).isValid, true);

  const invalid = validateEmployeeInput({
    ...baseValid,
    email: 'invalid-email',
    whatsappNumber: '0812',
    nik: '12345',
    kkNumber: '9876',
    bankAccountNumber: '123',
    contractType: 'PKWT',
    joinDate: '2026-11-12',
    contractEndDate: '2026-10-01',
  });

  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.whatsappNumber);
  assert.ok(invalid.errors.nik);
  assert.ok(invalid.errors.kkNumber);
  assert.ok(invalid.errors.bankAccountNumber);
  assert.ok(invalid.errors.contractEndDate);

  const pkwttWithoutEnd = validateEmployeeInput({
    ...baseValid,
    contractType: 'PKWTT',
    contractEndDate: '',
  });
  assert.equal(pkwttWithoutEnd.isValid, true);
});

test('authenticatePortalUser supports Admin accounts with assignedScopes and rejects invalid credentials', () => {
  const sitiById = authenticatePortalUser('adm-siti', '1234');
  assert.equal(sitiById.ok, true);
  assert.equal(sitiById.user?.role, 'Admin');
  assert.equal(sitiById.user?.name, 'Siti Rahmawati');
  assert.deepEqual(sitiById.user?.assignedScopes, [
    'Adira Finance — Penempatan Regional',
    'BAF — Layanan Operasional Cabang',
  ]);

  const sitiByEmail = authenticatePortalUser('siti.rahmawati@swapro-demo.co.id', '1234');
  assert.equal(sitiByEmail.ok, true);
  assert.equal(sitiByEmail.user?.id, 'ADM-014');

  const bagus = authenticatePortalUser('adm-bagus', '1234');
  assert.equal(bagus.ok, true);
  assert.equal(bagus.user?.role, 'Admin');
  assert.deepEqual(bagus.user?.assignedScopes, [
    'Kantor Pusat Operasional',
    'FIFGROUP — Area Jawa Timur',
  ]);

  const wrongPwd = authenticatePortalUser('adm-siti', '0000');
  assert.equal(wrongPwd.ok, false);
});

test('11-document checklist covers all required employee documents and calculates totals accurately', () => {
  assert.equal(DOCUMENT_CHECKLIST_ITEMS.length, 11);
  const keys = DOCUMENT_CHECKLIST_ITEMS.map((item) => item.key);
  for (const requiredKey of [
    'cvUploaded',
    'ktpUploaded',
    'kkUploaded',
    'simUploaded',
    'ijazahUploaded',
    'transkripNilaiUploaded',
    'sertifikatUploaded',
    'passFotoUploaded',
    'skckUploaded',
    'bankBookUploaded',
    'contractUploaded',
  ] as const) {
    assert.ok(keys.includes(requiredKey));
  }

  // Raka Pratama has all 11 uploaded
  const rakaProgress = countUploadedDocuments(INITIAL_EMPLOYEES[0].documents);
  assert.equal(rakaProgress.completed, 11);
  assert.equal(rakaProgress.total, 11);

  // Nadia Kusuma has 10/11 (missing SIM)
  const nadiaProgress = countUploadedDocuments(INITIAL_EMPLOYEES[1].documents);
  assert.equal(nadiaProgress.completed, 10);
  assert.equal(nadiaProgress.total, 11);
});

test('filterByAssignedScopes isolates employees, attendance, contracts, and candidates per Admin scope', () => {
  const sitiScopes = [
    'Adira Finance — Penempatan Regional',
    'BAF — Layanan Operasional Cabang',
  ];
  const sitiEmployees = filterByAssignedScopes(INITIAL_EMPLOYEES, sitiScopes);
  assert.ok(sitiEmployees.length > 0);
  assert.ok(sitiEmployees.every((e) => sitiScopes.includes(e.entityName)));
  assert.equal(
    sitiEmployees.some((e) => e.fullName === 'Raka Pratama'),
    false
  );
  assert.equal(
    sitiEmployees.some((e) => e.fullName === 'Teguh Santoso'),
    false
  );

  const adiraOnly = filterByAssignedScopes(
    INITIAL_EMPLOYEES,
    sitiScopes,
    'Adira Finance — Penempatan Regional'
  );
  assert.ok(adiraOnly.every((e) => e.entityName === 'Adira Finance — Penempatan Regional'));

  const sitiCandidates = filterByAssignedScopes(INITIAL_ONBOARDING_CANDIDATES, sitiScopes);
  assert.equal(sitiCandidates.length, 2);
});

test('PKWT document helpers format dates, calculate age, convert terbilang, and map employee contracts', () => {
  assert.equal(formatIndonesianDateLong('2026-01-02'), '2 Januari 2026');
  assert.equal(formatIndonesianDateLong('01 Des 2025'), '1 Desember 2025');
  assert.equal(calculateAgeYears('1999-08-21', '2025-12-01'), 26);
  assert.equal(calculateAgeYears('2005-06-12', '2026-07-01'), 21);

  assert.equal(
    numberToIndonesianWords(5729876),
    'lima juta tujuh ratus dua puluh sembilan ribu delapan ratus tujuh puluh enam'
  );
  assert.equal(numberToIndonesianWords(1000), 'seribu');
  assert.equal(formatRupiahDot(5729876), 'Rp. 5.729.876,-');

  const nadiaContract = INITIAL_CONTRACTS[0];
  const nadiaEmp = INITIAL_EMPLOYEES.find((e) => e.employeeCode === nadiaContract.employeeCode);
  const nadiaPayload = buildDefaultPkwtPayload(nadiaContract, nadiaEmp);
  assert.equal(nadiaPayload.employeeName, 'Nadia Kusuma');
  assert.equal(nadiaPayload.ktpNumber, '3171036108990003');
  assert.equal(nadiaPayload.gender, 'Perempuan');
  assert.equal(nadiaPayload.ageYears, 26);
  assert.equal(nadiaPayload.clientLegalName, 'PT Bussan Auto Finance');
  assert.equal(nadiaPayload.signerName, 'Farid Usman, S.Psi.');

  const refSample = buildReferenceSamplePkwtPayload();
  assert.equal(buildPkwtDownloadFilename(refSample), 'Satria_Suryo_Bernanto_PKWT_NEW_HIRE.pdf');
  const encoded = encodePkwtPayloadBase64Url(refSample);
  const url = buildPkwtServerDownloadUrl(refSample);
  assert.ok(url.startsWith('/api/pkwt/download?d='));
  const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  assert.equal(decoded.employeeName, refSample.employeeName);
  assert.equal(decoded.pkwtNumber, refSample.pkwtNumber);
});

test('generatePkwtPdfBytes renders exact 4 A4 pages with embedded SWAPRO fonts, stamp, and paraf', async () => {
  const pubDir = path.resolve(process.cwd(), 'public');
  const readAsset = (rel: string) => new Uint8Array(fs.readFileSync(path.join(pubDir, rel)));

  const assets: PkwtPdfAssets = {
    regularFont: readAsset('fonts/carlito-latin-400-normal.ttf'),
    boldFont: readAsset('fonts/carlito-latin-700-normal.ttf'),
    italicFont: readAsset('fonts/carlito-latin-400-italic.ttf'),
    boldItalicFont: readAsset('fonts/carlito-latin-700-italic.ttf'),
    logoPng: readAsset('assets/pkwt/swapro-logo.png'),
    footerJpg: readAsset('assets/pkwt/footer-bar.jpg'),
    parafPng: readAsset('assets/pkwt/swapro-paraf.png'),
    stampP3Jpg: readAsset('assets/pkwt/stamp-p3.jpg'),
    stampP4Jpg: readAsset('assets/pkwt/stamp-p4.jpg'),
  };

  const refBytes = await generatePkwtPdfBytes(buildReferenceSamplePkwtPayload(), assets);
  assert.ok(refBytes.byteLength > 20000);
  const loadedRef = await PDFDocument.load(refBytes);
  assert.equal(loadedRef.getPageCount(), 4);
  const pageSize = loadedRef.getPage(0).getSize();
  assert.ok(Math.abs(pageSize.width - 595.44) < 0.1);
  assert.ok(Math.abs(pageSize.height - 841.68) < 0.1);

  const nadiaContract = INITIAL_CONTRACTS[0];
  const nadiaEmp = INITIAL_EMPLOYEES.find((e) => e.employeeCode === nadiaContract.employeeCode);
  const nadiaBytes = await generatePkwtPdfBytes(
    buildDefaultPkwtPayload(nadiaContract, nadiaEmp),
    assets
  );
  const loadedNadia = await PDFDocument.load(nadiaBytes);
  assert.equal(loadedNadia.getPageCount(), 4);
});

test('authenticatePortalUser supports Rekruter, seeded Pelamar, and newly registered Pelamar accounts', () => {
  const rec = authenticatePortalUser('rec-dina', '1234', INITIAL_APPLICANT_PROFILES);
  assert.equal(rec.ok, true);
  assert.equal(rec.user?.role, 'Rekruter');
  assert.equal(rec.user?.name, 'Dina Lestari');

  const recByEmail = authenticatePortalUser(
    'dina.lestari@swapro-demo.co.id',
    '1234',
    INITIAL_APPLICANT_PROFILES
  );
  assert.equal(recByEmail.ok, true);
  assert.equal(recByEmail.user?.id, 'REC-008');

  const sari = authenticatePortalUser('plm-sari', '1234', INITIAL_APPLICANT_PROFILES);
  assert.equal(sari.ok, true);
  assert.equal(sari.user?.role, 'Pelamar');
  assert.equal(sari.user?.applicantId, 'app-user-1');

  const customApplicantList = [
    ...INITIAL_APPLICANT_PROFILES,
    {
      id: 'app-user-new',
      applicantCode: 'PLM-2026-009',
      loginId: 'plm-budi',
      fullName: 'Budi Cahyono',
      email: 'budi.cahyono@gmail.com',
      password: 'Password99',
    },
  ];
  const newPelamar = authenticatePortalUser('budi.cahyono@gmail.com', 'Password99', customApplicantList);
  assert.equal(newPelamar.ok, true);
  assert.equal(newPelamar.user?.role, 'Pelamar');
  assert.equal(newPelamar.user?.applicantId, 'app-user-new');

  const wrongWa = validateRegisterForm({
    fullName: 'Budi Cahyono',
    email: 'budi.cahyono@gmail.com',
    whatsappNumber: '0812',
    password: 'Password99',
    confirmPassword: 'Password99',
  });
  assert.equal(wrongWa.isValid, false);
  assert.ok(wrongWa.errors.whatsappNumber);
});

test('Recruitment ATS helpers track headcount quotas, client masking, completeness, and Onboarding prefill', () => {
  assert.equal(computeRemainingHeadcount(INITIAL_VACANCIES[0]), 7);
  assert.equal(formatSalaryRangeRupiah(5300000, 5850000), 'Rp 5.300.000 – Rp 5.850.000');
  assert.equal(calculateAgeFromIsoDate('1997-03-18', '2026-11-13'), 29);

  // Client name masking check: vac-4 has showClientNameToApplicants: false ("PT Telkom Akses")
  const searchMaskedName = filterVacanciesForApplicant(INITIAL_VACANCIES, 'Telkom Akses');
  assert.equal(searchMaskedName.length, 0);
  const searchMaskedIndustry = filterVacanciesForApplicant(INITIAL_VACANCIES, 'Telekomunikasi');
  assert.equal(searchMaskedIndustry.length, 1);

  const clientList = getDistinctClientNames(INITIAL_VACANCIES, INITIAL_ENTITIES);
  assert.ok(clientList.includes('Adira Finance — Penempatan Regional'));
  assert.ok(clientList.includes('PT Telkom Akses (Proyek Fiber Barat)'));

  const sariCompleteness = calculateApplicantProfileCompleteness(INITIAL_APPLICANT_PROFILES[0]);
  assert.equal(sariCompleteness.isEmployeeReady, false);
  assert.ok(sariCompleteness.missingEmployeeFields.includes('Nomor Kartu Keluarga (16 digit)'));

  const rizkyCompleteness = calculateApplicantProfileCompleteness(INITIAL_APPLICANT_PROFILES[1]);
  assert.equal(rizkyCompleteness.isEmployeeReady, true);
  assert.equal(rizkyCompleteness.percentage, 100);

  const offeringApps = filterApplicationsForRecruiter(
    INITIAL_JOB_APPLICATIONS,
    INITIAL_VACANCIES,
    INITIAL_APPLICANT_PROFILES,
    'Offering'
  );
  assert.equal(offeringApps.length, 1);

  const prefill = buildApplicantEmployeeFormPrefill(
    INITIAL_APPLICANT_PROFILES[1],
    INITIAL_VACANCIES[0],
    'ATS-2026-109',
    '2026-12-01',
    '2027-11-30'
  );
  assert.equal(prefill.fullName, 'Rizky Ramadhan');
  assert.equal(prefill.nik, '3173041803970002');
  assert.equal(prefill.kkNumber, '3173041109220004');
  assert.equal(prefill.entityName, 'Adira Finance — Penempatan Regional');
  assert.equal(prefill.salaryMonthly, 5575000);
  assert.equal(prefill.documents?.kkUploaded, true);
  assert.equal(prefill.documents?.bankBookUploaded, true);
});

test('authenticatePortalUser authenticates Aktif/Probation Karyawan by NIK/ID/email and blocks Nonaktif', () => {
  const nadiaByNip = authenticatePortalUser(
    'OUT-318',
    '1234',
    INITIAL_APPLICANT_PROFILES,
    INITIAL_EMPLOYEES
  );
  assert.equal(nadiaByNip.ok, true);
  assert.equal(nadiaByNip.user?.role, 'Karyawan');
  assert.equal(nadiaByNip.user?.employeeId, 'emp-2');
  assert.equal(nadiaByNip.user?.employeeCode, 'OUT-318');

  const rakaByShortcut = authenticatePortalUser(
    'emp-raka',
    '1234',
    INITIAL_APPLICANT_PROFILES,
    INITIAL_EMPLOYEES
  );
  assert.equal(rakaByShortcut.ok, true);
  assert.equal(rakaByShortcut.user?.employeeCode, 'EMP-1024');

  const nonaktifResult = authenticatePortalUser(
    'OUT-204',
    '1234',
    INITIAL_APPLICANT_PROFILES,
    [
      ...INITIAL_EMPLOYEES,
      {
        ...INITIAL_EMPLOYEES[1],
        id: 'emp-nonaktif',
        employeeCode: 'OUT-204',
        email: 'nonaktif@swapro-demo.co.id',
        status: 'Nonaktif',
      },
    ]
  );
  assert.equal(nonaktifResult.ok, false);
  assert.ok(nonaktifResult.error?.includes('Nonaktif'));
});

test('validateEmployeeInput validates optional BPJS Kesehatan and BPJS Ketenagakerjaan numbers', () => {
  const validWithBpjs = validateEmployeeInput({
    ...INITIAL_EMPLOYEES[1],
    bpjsKesehatanNumber: '0002194058124',
    bpjsKetenagakerjaanNumber: '25120948120',
  });
  assert.equal(validWithBpjs.isValid, true);

  const validWithoutBpjs = validateEmployeeInput({
    ...INITIAL_EMPLOYEES[5],
    bpjsKesehatanNumber: '',
    bpjsKetenagakerjaanNumber: '',
  });
  assert.equal(validWithoutBpjs.isValid, true);

  const invalidBpjs = validateEmployeeInput({
    ...INITIAL_EMPLOYEES[1],
    bpjsKesehatanNumber: '12345',
    bpjsKetenagakerjaanNumber: '999',
  });
  assert.equal(invalidBpjs.isValid, false);
  assert.ok(invalidBpjs.errors.bpjsKesehatanNumber);
  assert.ok(invalidBpjs.errors.bpjsKetenagakerjaanNumber);
});

function createSyntheticFaceLandmarks(options?: {
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  yawShiftNose?: number;
  cheekZDelta?: number;
  noseStretch?: number;
}): FacePoint[] {
  const ox = options?.offsetX ?? 0;
  const oy = options?.offsetY ?? 0;
  const s = options?.scale ?? 1;
  const noseShift = options?.yawShiftNose ?? 0;
  const zDelta = options?.cheekZDelta ?? 0;
  const noseStretch = options?.noseStretch ?? 0;

  const pts: FacePoint[] = Array.from({ length: 468 }, () => ({
    x: 0.5 + ox,
    y: 0.5 + oy,
    z: 0,
  }));

  const setPt = (idx: number, x: number, y: number, z = 0) => {
    pts[idx] = { x: 0.5 + (x - 0.5) * s + ox, y: 0.5 + (y - 0.5) * s + oy, z };
  };

  setPt(10, 0.5, 0.2); // forehead
  setPt(6, 0.5, 0.42); // nose bridge
  setPt(1, 0.5 + noseShift, 0.53 + noseStretch, -0.05); // nose tip
  setPt(2, 0.5 + noseShift * 0.5, 0.58 + noseStretch); // nose bottom
  setPt(98, 0.46, 0.56); // left nostril
  setPt(327, 0.54, 0.56); // right nostril

  setPt(33, 0.36, 0.4); // left eye outer
  setPt(133, 0.43, 0.4); // left eye inner
  setPt(159, 0.395, 0.388); // left eye top
  setPt(145, 0.395, 0.412); // left eye bottom

  setPt(362, 0.57, 0.4); // right eye inner
  setPt(263, 0.64, 0.4); // right eye outer
  setPt(386, 0.605, 0.388); // right eye top
  setPt(374, 0.605, 0.412); // right eye bottom

  setPt(70, 0.35, 0.35); // left brow outer
  setPt(107, 0.45, 0.35); // left brow inner
  setPt(336, 0.55, 0.35); // right brow inner
  setPt(300, 0.65, 0.35); // right brow outer

  setPt(234, 0.28, 0.5, -zDelta / 2); // left cheek
  setPt(454, 0.72, 0.5, zDelta / 2); // right cheek
  setPt(61, 0.42, 0.68); // mouth left
  setPt(291, 0.58, 0.68); // mouth right
  setPt(13, 0.5, 0.67); // upper lip
  setPt(172, 0.34, 0.72); // jaw left
  setPt(397, 0.66, 0.72); // jaw right
  setPt(152, 0.5, 0.84); // chin

  return pts;
}

test('faceVerification geometric descriptor is scale/translation invariant and distinguishes different faces', () => {
  const enrolledLandmarks = createSyntheticFaceLandmarks();
  const shiftedScaledLandmarks = createSyntheticFaceLandmarks({
    offsetX: 0.08,
    offsetY: -0.05,
    scale: 1.32,
  });
  const differentPersonLandmarks = createSyntheticFaceLandmarks({
    noseStretch: 0.09,
    scale: 1,
  });
  // Further alter mouth/jaw/eyes proportions for a distinct person
  differentPersonLandmarks[61] = { x: 0.36, y: 0.72, z: 0 };
  differentPersonLandmarks[291] = { x: 0.64, y: 0.72, z: 0 };
  differentPersonLandmarks[234] = { x: 0.2, y: 0.52, z: 0 };
  differentPersonLandmarks[454] = { x: 0.8, y: 0.52, z: 0 };
  differentPersonLandmarks[152] = { x: 0.5, y: 0.92, z: 0 };

  const d1 = extractGeometricFaceDescriptor(enrolledLandmarks);
  const d2 = extractGeometricFaceDescriptor(shiftedScaledLandmarks);
  const dOther = extractGeometricFaceDescriptor(differentPersonLandmarks);

  assert.equal(d1.length, 20);
  const sameFaceScore = computeFaceDescriptorSimilarity(d1, d2);
  const differentFaceScore = computeFaceDescriptorSimilarity(d1, dOther);

  assert.ok(sameFaceScore >= 98, `Expected >= 98% for scaled/shifted same face, got ${sameFaceScore}`);
  assert.ok(
    differentFaceScore < FACE_MATCH_THRESHOLD_PERCENT,
    `Expected < ${FACE_MATCH_THRESHOLD_PERCENT}% for different face, got ${differentFaceScore}`
  );
});

test('faceVerification active liveness state machine blocks static pas foto & mismatch, and passes real 4-gate sequence', () => {
  const frontalPose = computeHeadYawRatio(createSyntheticFaceLandmarks());
  assert.equal(frontalPose.isFrontal, true);
  assert.equal(frontalPose.isTurnedLeftOrRight, false);

  // Flat rotated photo without 3D Z-depth delta must NOT satisfy isTurnedLeftOrRight
  const flatPhotoTurn = computeHeadYawRatio(
    createSyntheticFaceLandmarks({ yawShiftNose: 0.12, cheekZDelta: 0.005 })
  );
  assert.equal(flatPhotoTurn.isTurnedLeftOrRight, false);

  // Real 3D head turn with cheek Z parallax satisfies 3D head turn
  const real3DTurn = computeHeadYawRatio(
    createSyntheticFaceLandmarks({ yawShiftNose: 0.12, cheekZDelta: 0.06 })
  );
  assert.equal(real3DTurn.isTurnedLeftOrRight, true);

  // Unenrolled account cannot proceed
  const unenrolled = evaluateActiveLivenessFrame(
    createInitialLivenessState(false),
    { faceCount: 1, blinkScore: 0.1, headPose: frontalPose, matchScore: 95 },
    false
  );
  assert.equal(unenrolled.phase, 'need_enrollment');

  // Static photo held steady never blinks -> stuck in challenge_blink
  let state = createInitialLivenessState(true);
  for (let i = 0; i < 6; i += 1) {
    state = evaluateActiveLivenessFrame(
      state,
      { faceCount: 1, blinkScore: 0.08, headPose: frontalPose, matchScore: 96 },
      true
    );
  }
  assert.equal(state.phase, 'challenge_blink');
  assert.equal(state.blinkCompleted, false);

  // Multiple faces resets progress immediately
  const multiFace = evaluateActiveLivenessFrame(
    state,
    { faceCount: 2, blinkScore: 0.6, headPose: frontalPose, matchScore: 96 },
    true
  );
  assert.equal(multiFace.phase, 'wait_single_face');
  assert.equal(multiFace.blinkCompleted, false);

  // Full live sequence: frontal -> blink close -> blink open -> 3D turn -> frontal -> match >= 82%
  let live = createInitialLivenessState(true);
  live = evaluateActiveLivenessFrame(
    live,
    { faceCount: 1, blinkScore: 0.1, headPose: frontalPose, matchScore: 93 },
    true
  );
  assert.equal(live.phase, 'challenge_blink');

  live = evaluateActiveLivenessFrame(
    live,
    { faceCount: 1, blinkScore: 0.55, headPose: frontalPose, matchScore: 93 },
    true
  );
  assert.equal(live.phase, 'blink_closing');

  live = evaluateActiveLivenessFrame(
    live,
    { faceCount: 1, blinkScore: 0.12, headPose: frontalPose, matchScore: 93 },
    true
  );
  assert.equal(live.phase, 'challenge_turn');
  assert.equal(live.blinkCompleted, true);

  live = evaluateActiveLivenessFrame(
    live,
    { faceCount: 1, blinkScore: 0.1, headPose: real3DTurn, matchScore: 80 },
    true
  );
  assert.equal(live.phase, 'turn_detected');

  live = evaluateActiveLivenessFrame(
    live,
    { faceCount: 1, blinkScore: 0.1, headPose: frontalPose, matchScore: 93 },
    true
  );
  assert.equal(live.phase, 'ready_to_match');
  assert.equal(live.headTurnCompleted, true);

  // Mismatch score < 82% over 5 consecutive frames gets rejected
  let mismatchState = live;
  for (let i = 0; i < 5; i += 1) {
    mismatchState = evaluateActiveLivenessFrame(
      mismatchState,
      { faceCount: 1, blinkScore: 0.1, headPose: frontalPose, matchScore: 61 },
      true
    );
  }
  assert.equal(mismatchState.phase, 'rejected_mismatch');
  assert.equal(summarizeAttendanceGates(true, mismatchState, 1).allGatesPassed, false);

  // Matching score >= 82% unlocks all 4 attendance gates
  const verifiedState = evaluateActiveLivenessFrame(
    live,
    { faceCount: 1, blinkScore: 0.1, headPose: frontalPose, matchScore: 93 },
    true
  );
  assert.equal(verifiedState.phase, 'verified');
  const gates = summarizeAttendanceGates(true, verifiedState, 1);
  assert.deepEqual(gates, {
    gate1Enrolled: true,
    gate2SingleLiveFace: true,
    gate3LivenessPassed: true,
    gate4FaceMatched: true,
    allGatesPassed: true,
  });
});

test('buildWorkforceOverviewAnalytics computes All = Internal + Client headcount points and attendance cards across daily, weekly, monthly, and custom modes', () => {
  const daily = buildWorkforceOverviewAnalytics({
    mode: 'daily',
    referenceIsoDate: '2026-11-14',
    entities: INITIAL_ENTITIES,
    employees: INITIAL_EMPLOYEES,
    attendanceLogs: INITIAL_ATTENDANCE_LOGS,
  });
  assert.equal(daily.points.length, 7);
  assert.equal(daily.currentInternal, 92);
  assert.equal(daily.currentClient, 328);
  assert.equal(daily.currentTotal, 420);
  for (const pt of daily.points) {
    assert.equal(pt.totalCount, pt.internalCount + pt.clientCount);
  }
  assert.ok(daily.attendanceCards.hadirTepatWaktu > 0);
  assert.ok(daily.attendanceCards.karyawanTelat > 0);
  assert.equal(
    daily.attendanceCards.totalHadir,
    daily.attendanceCards.hadirTepatWaktu + daily.attendanceCards.karyawanTelat
  );
  assert.equal(
    daily.attendanceCards.izinSakit + daily.attendanceCards.cuti,
    daily.attendanceCards.izinSakitCuti
  );
  assert.ok(daily.attendanceCards.lateHighlights.length > 0);
  assert.ok(daily.attendanceCards.alphaHighlights.length > 0);

  const weekly = buildWorkforceOverviewAnalytics({
    mode: 'weekly',
    referenceIsoDate: '2026-11-14',
    entities: INITIAL_ENTITIES,
    employees: INITIAL_EMPLOYEES,
    attendanceLogs: INITIAL_ATTENDANCE_LOGS,
  });
  assert.equal(weekly.points.length, 6);
  assert.equal(weekly.points[weekly.points.length - 1].totalCount, 420);

  const monthly = buildWorkforceOverviewAnalytics({
    mode: 'monthly',
    referenceIsoDate: '2026-11-14',
    entities: INITIAL_ENTITIES,
    employees: INITIAL_EMPLOYEES,
    attendanceLogs: INITIAL_ATTENDANCE_LOGS,
  });
  assert.equal(monthly.points.length, 6);
  assert.equal(monthly.points[monthly.points.length - 1].internalCount, 92);
  assert.equal(monthly.points[monthly.points.length - 1].clientCount, 328);
  assert.ok(monthly.netGrowthCount > 0);

  const custom = buildWorkforceOverviewAnalytics({
    mode: 'custom',
    customStartDate: '2026-10-01',
    customEndDate: '2026-11-14',
    referenceIsoDate: '2026-11-14',
    entities: INITIAL_ENTITIES,
    employees: INITIAL_EMPLOYEES,
    attendanceLogs: INITIAL_ATTENDANCE_LOGS,
  });
  assert.ok(custom.points.length >= 2 && custom.points.length <= 7);
  assert.equal(custom.attendanceCards.daysCovered, 45);

  // Dynamic client line generation: adding a 4th client creates a 4th distinct colored line
  assert.equal(monthly.clientSeries.length, 3);
  const withNewClient = buildWorkforceOverviewAnalytics({
    mode: 'monthly',
    referenceIsoDate: '2026-11-14',
    entities: [
      ...INITIAL_ENTITIES,
      {
        id: 'ent-extra',
        code: 'CLN-WOM',
        name: 'WOM Finance — Jabodetabek',
        category: 'Klien Penempatan',
        city: 'Jakarta',
        lead: 'Budi',
        employeeCount: 40,
        departmentCount: 1,
        status: 'Aktif',
      },
    ],
    employees: INITIAL_EMPLOYEES,
    attendanceLogs: INITIAL_ATTENDANCE_LOGS,
  });
  assert.equal(withNewClient.clientSeries.length, 4);
  const uniqueColors = new Set(withNewClient.clientSeries.map((c) => c.color));
  assert.equal(uniqueColors.size, 4);
  assert.equal(withNewClient.currentClient, 368);
  assert.equal(withNewClient.currentTotal, 460);

  // Placement & position breakdown inside Detail Periode sums positions to exact placement headcount
  const breakdownAtLatest = buildPlacementBreakdownAtPoint({
    analytics: monthly,
    pointIndex: monthly.points.length - 1,
    entities: INITIAL_ENTITIES,
    employees: INITIAL_EMPLOYEES,
    hasInternal: true,
  });
  assert.equal(breakdownAtLatest.length, 4); // Internal + 3 active clients
  for (const item of breakdownAtLatest) {
    assert.ok(item.positions.length > 0);
    const posSum = item.positions.reduce((s, p) => s + p.count, 0);
    assert.equal(posSum, item.count);
  }

  // Live attendance feed distinguishes Sakit vs Izin and surfaces clear detection reasons
  const liveFeed = buildLiveAttendanceFeed(INITIAL_ATTENDANCE_LOGS, INITIAL_LEAVE_ABSENCES);
  const sakitEntry = liveFeed.find((e) => e.employeeName === 'Hendrik Gunawan');
  const izinEntry = liveFeed.find(
    (e) => e.employeeName === 'Raka Pratama' && e.liveStatus === 'Izin'
  );
  const telatEntry = liveFeed.find((e) => e.employeeName === 'Nadia Kusuma');
  const alphaEntry = liveFeed.find((e) => e.employeeName === 'Teguh Santoso');
  assert.equal(sakitEntry?.liveStatus, 'Sakit');
  assert.equal(izinEntry?.liveStatus, 'Izin');
  assert.equal(telatEntry?.liveStatus, 'Telat');
  assert.ok(telatEntry?.detectionReason.includes('+28 menit'));
  assert.equal(alphaEntry?.liveStatus, 'Alpha');

  // Option 1 chart guarantees: all growth curves start at 0, never drop below 0, and cross over
  for (const dataset of [daily, weekly, monthly, custom]) {
    assert.equal(dataset.points[0].internalGrowth, 0);
    assert.equal(dataset.points[0].totalGrowth, 0);
    for (const pt of dataset.points) {
      assert.ok(pt.internalGrowth >= 0);
      assert.ok(pt.totalGrowth >= 0);
    }
    for (const cs of dataset.clientSeries) {
      assert.equal(cs.growthValues[0], 0);
      assert.ok(cs.growthValues.every((v) => v >= 0));
      assert.equal(cs.values[cs.values.length - 1], cs.currentCount);
    }
  }

  // Verify visible crossover ("saling melewati") between clients across monthly buckets
  const adiraGrowth = monthly.clientSeries[0].growthValues;
  const fifGrowth = monthly.clientSeries[1].growthValues;
  const fifLeadsSomewhere = fifGrowth.some((val, idx) => val > adiraGrowth[idx]);
  const adiraLeadsSomewhere = adiraGrowth.some((val, idx) => val > fifGrowth[idx]);
  assert.equal(fifLeadsSomewhere, true);
  assert.equal(adiraLeadsSomewhere, true);

  // Nice zero-based Y-axis scale always anchors at 0 with clean round ticks
  const scale22 = computeNiceZeroAxisScale(22, 4);
  assert.equal(scale22.yMin, 0);
  assert.equal(scale22.ticks[0], 0);
  assert.ok(scale22.yMax >= 22);
  assert.ok(scale22.step >= 5);
});

test('mapsUrl helpers parse Google Maps URLs, build canonical URLs, and validate HTTP(S) links', () => {
  const fromAt = parseGoogleMapsUrl(
    'https://www.google.com/maps/place/Adira+Finance+Tebet/@-6.229728,106.857342,17z'
  );
  assert.deepEqual(fromAt, { lat: -6.229728, lng: 106.857342 });

  const fromQuery = parseGoogleMapsUrl('https://maps.google.com/?q=-6.241200,106.812300');
  assert.deepEqual(fromQuery, { lat: -6.2412, lng: 106.8123 });

  const fromLl = parseGoogleMapsUrl('https://www.google.com/maps?ll=-7.257472,112.752088&z=15');
  assert.deepEqual(fromLl, { lat: -7.257472, lng: 112.752088 });

  const fromDataPin = parseGoogleMapsUrl(
    'https://www.google.com/maps/place/Example/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-6.208763!4d106.845599'
  );
  assert.deepEqual(fromDataPin, { lat: -6.208763, lng: 106.845599 });

  const fromPlain = parseGoogleMapsUrl(' -6.175392 , 106.827153 ');
  assert.deepEqual(fromPlain, { lat: -6.175392, lng: 106.827153 });

  assert.equal(parseGoogleMapsUrl(''), null);
  assert.equal(parseGoogleMapsUrl('https://maps.app.goo.gl/abc123'), null);
  assert.equal(parseGoogleMapsUrl('95.123, 106.85'), null); // invalid lat > 90
  assert.equal(parseGoogleMapsUrl('0, 0'), null);

  assert.equal(
    buildGoogleMapsUrl(-6.2297284, 106.8573421),
    'https://www.google.com/maps?q=-6.229728,106.857342'
  );

  assert.equal(isValidMapsUrl('https://www.google.com/maps?q=-6.229728,106.857342'), true);
  assert.equal(isValidMapsUrl('http://maps.google.com/?q=-6.2,106.8'), true);
  assert.equal(isValidMapsUrl('javascript:alert(1)'), false);
  assert.equal(isValidMapsUrl('bukan-url'), false);
  assert.equal(isValidMapsUrl('   '), false);
});

test('INITIAL_ENTITIES includes supportedPlacements (without fabricated coords) and supportedPositions without quota', () => {
  const adira = INITIAL_ENTITIES.find((e) => e.code === 'CLN-ADR');
  assert.ok(adira);
  assert.ok(Array.isArray(adira.supportedPlacements) && adira.supportedPlacements.length >= 2);
  const tebet = adira.supportedPlacements.find((loc) => loc.name === 'Adira Tebet');
  assert.ok(tebet);
  assert.equal(tebet.area, 'Jabodetabek');
  assert.equal(tebet.mapsUrl, '');
  assert.equal(tebet.lat, undefined);
  assert.equal(tebet.lng, undefined);

  assert.ok(Array.isArray(adira.supportedPositions) && adira.supportedPositions.length > 0);
  for (const pos of adira.supportedPositions) {
    assert.ok(pos.title.length > 0);
    assert.ok(pos.baseSalary > 0);
    assert.equal(pos.quota, undefined);
  }
});

test('extractEntityNikPrefix and generateClientEmployeeNik produce sequential client-prefixed NIKs (e.g. ADR-001)', () => {
  const adira = INITIAL_ENTITIES.find((e) => e.code === 'CLN-ADR');
  const baf = INITIAL_ENTITIES.find((e) => e.code === 'CLN-BAF');
  const hq = INITIAL_ENTITIES.find((e) => e.code === 'INT-HO');
  assert.ok(adira && baf && hq);

  assert.equal(extractEntityNikPrefix(adira), 'ADR');
  assert.equal(extractEntityNikPrefix(baf), 'BAF');
  assert.equal(extractEntityNikPrefix(hq), 'INT');

  const firstAdr = generateClientEmployeeNik(adira, INITIAL_EMPLOYEES);
  assert.equal(firstAdr, 'ADR-001');

  const secondAdr = generateClientEmployeeNik(adira, [
    ...INITIAL_EMPLOYEES,
    { ...INITIAL_EMPLOYEES[1], id: 'emp-adr-1', employeeCode: 'ADR-001' },
  ]);
  assert.equal(secondAdr, 'ADR-002');
});

test('getContractEocIndicator detects expiring PKWT windows cleanly', () => {
  const danger = getContractEocIndicator('PKWT', '2026-11-18', '2026-11-12');
  assert.equal(danger.isExpiring, true);
  assert.equal(danger.severity, 'danger');

  const warning = getContractEocIndicator('PKWT', '2026-11-30', '2026-11-12');
  assert.equal(warning.isExpiring, true);
  assert.equal(warning.severity, 'warning');

  const expired = getContractEocIndicator('PKWT', '2026-11-05', '2026-11-12');
  assert.equal(expired.isExpiring, true);
  assert.equal(expired.severity, 'danger');

  const normal = getContractEocIndicator('PKWT', '2027-06-30', '2026-11-12');
  assert.equal(normal.isExpiring, false);
  assert.equal(normal.severity, 'normal');

  const pkwtt = getContractEocIndicator('PKWTT', '', '2026-11-12');
  assert.equal(pkwtt.isExpiring, false);
});

test('Account share helpers build WhatsApp (wa.me/62) and Mailto URLs and authenticate converted ADR-001 accounts', () => {
  const convertedEmp = {
    ...INITIAL_EMPLOYEES[1],
    id: 'emp-adr-1',
    employeeCode: 'ADR-001',
    originApplicantCode: 'PLM-2026-002',
    portalPassword: 'PasswordKandidat99',
    whatsappNumber: '081298765432',
    email: 'rizky.ramadhan@gmail.com',
  };

  const share = buildNewAccountShareDetails(convertedEmp, true);
  assert.ok(share.subject.includes('ADR-001'));
  assert.ok(share.body.includes('NIK (Nomor Induk Karyawan): ADR-001'));
  assert.ok(share.body.includes('PKWT'));

  const waUrl = buildEmployeeWhatsappUrl(convertedEmp, 'account-pkwt');
  assert.ok(waUrl.startsWith('https://wa.me/6281298765432?text='));

  const mailUrl = buildEmployeeMailtoUrl(convertedEmp, 'account-pkwt');
  assert.ok(mailUrl.startsWith('mailto:rizky.ramadhan@gmail.com?subject='));

  const authConverted = authenticatePortalUser(
    'ADR-001',
    'PasswordKandidat99',
    INITIAL_APPLICANT_PROFILES,
    [...INITIAL_EMPLOYEES, convertedEmp]
  );
  assert.equal(authConverted.ok, true);
  assert.equal(authConverted.user?.role, 'Karyawan');
  assert.equal(authConverted.user?.employeeCode, 'ADR-001');

  const missingCodeValidation = validateEmployeeInput({
    ...INITIAL_EMPLOYEES[1],
    employeeCode: '',
  });
  assert.equal(missingCodeValidation.isValid, false);
  assert.equal(missingCodeValidation.errors.employeeCode, 'NIK (Nomor Induk Karyawan) wajib diisi.');
});

test('Centralized Account Management: summarizePortalAccountStats, PIN reset, account lock, and PLM->ADR conversion notice', () => {
  // 1. Account stats summary on initial data
  const initialStats = summarizePortalAccountStats(
    INITIAL_USERS,
    INITIAL_EMPLOYEES,
    INITIAL_APPLICANT_PROFILES
  );
  assert.equal(initialStats.activeInternalCount, 4);
  assert.equal(initialStats.activeEmployeeCount, 6);
  assert.equal(initialStats.activeApplicantCount, 2);
  assert.equal(initialStats.totalActiveAccounts, 12);
  assert.ok(initialStats.pendingPkwtEmployeeAccounts >= 1);
  assert.equal(initialStats.disabledOrLockedAccounts, 0);

  // 2. Resetting an employee password updates WA/Email credential message and login authentication
  const resetNadia = {
    ...INITIAL_EMPLOYEES[1],
    portalPassword: '5678',
    passwordResetAt: '15 Nov 2026',
  };
  const nadiaShare = buildNewAccountShareDetails(resetNadia, false);
  assert.ok(nadiaShare.body.includes('Kata Sandi / PIN Login: 5678'));

  const loginOldPin = authenticatePortalUser(
    'OUT-318',
    '1234',
    INITIAL_APPLICANT_PROFILES,
    [INITIAL_EMPLOYEES[0], resetNadia, ...INITIAL_EMPLOYEES.slice(2)],
    INITIAL_USERS
  );
  assert.equal(loginOldPin.ok, false);

  const loginNewPin = authenticatePortalUser(
    'OUT-318',
    '5678',
    INITIAL_APPLICANT_PROFILES,
    [INITIAL_EMPLOYEES[0], resetNadia, ...INITIAL_EMPLOYEES.slice(2)],
    INITIAL_USERS
  );
  assert.equal(loginNewPin.ok, true);
  assert.equal(loginNewPin.user?.employeeCode, 'OUT-318');

  // 3. Disabling an employee account blocks portal login immediately
  const disabledRaka = {
    ...INITIAL_EMPLOYEES[0],
    accountDisabled: true,
  };
  const loginDisabledEmp = authenticatePortalUser(
    'EMP-1024',
    '1234',
    INITIAL_APPLICANT_PROFILES,
    [disabledRaka, ...INITIAL_EMPLOYEES.slice(1)],
    INITIAL_USERS
  );
  assert.equal(loginDisabledEmp.ok, false);
  assert.ok(loginDisabledEmp.error?.includes('dinonaktifkan'));

  // 4. Disabling an internal user account blocks portal login immediately
  const disabledSiti = INITIAL_USERS.map((u) =>
    u.employeeCode === 'ADM-014' ? { ...u, status: 'Nonaktif' as const } : u
  );
  const loginDisabledAdmin = authenticatePortalUser(
    'adm-siti',
    '1234',
    INITIAL_APPLICANT_PROFILES,
    INITIAL_EMPLOYEES,
    disabledSiti
  );
  assert.equal(loginDisabledAdmin.ok, false);
  assert.ok(loginDisabledAdmin.error?.includes('dinonaktifkan'));

  // 5. Converted applicant account (PLM-2026-002 -> ADR-001) informs user to log in with ADR-001
  const convertedApplicants = INITIAL_APPLICANT_PROFILES.map((a) =>
    a.applicantCode === 'PLM-2026-002'
      ? { ...a, convertedToEmployeeCode: 'ADR-001', accountDisabled: true }
      : a
  );
  const loginConvertedPlm = authenticatePortalUser(
    'PLM-2026-002',
    '1234',
    convertedApplicants,
    INITIAL_EMPLOYEES,
    INITIAL_USERS
  );
  assert.equal(loginConvertedPlm.ok, false);
  assert.ok(loginConvertedPlm.error?.includes('ADR-001'));
});

test('Mandatory Attendance Policy: resolveEmployeeWorkSchedule (Global vs Per-Client), evaluateAttendanceAgainstPolicy, and syncAttendanceLocationsFromEntities', () => {
  // 1. Internal unit follows Standar Perusahaan (08:30–17:30, 15m tolerance)
  const hqSchedule = resolveEmployeeWorkSchedule('Kantor Pusat Operasional', INITIAL_POLICY);
  assert.equal(hqSchedule.isCustomClientOverride, false);
  assert.equal(hqSchedule.policySourceLabel, 'Standar Perusahaan');
  assert.equal(hqSchedule.checkInTime, '08:30');
  assert.equal(hqSchedule.checkOutTime, '17:30');
  assert.equal(hqSchedule.lateToleranceMinutes, 15);
  assert.equal(hqSchedule.workDays, 'Senin – Jumat');

  // 2. FIFGROUP (useDefault: true) follows Standar Perusahaan
  const fifSchedule = resolveEmployeeWorkSchedule('FIFGROUP — Area Jawa Timur', INITIAL_POLICY);
  assert.equal(fifSchedule.isCustomClientOverride, false);
  assert.equal(fifSchedule.policySourceLabel, 'Standar Perusahaan');
  assert.equal(fifSchedule.checkInTime, '08:30');

  // 3. Adira Finance (useDefault: false) enforces Kebijakan Khusus Klien (08:00–17:00, 10m tolerance, Senin – Sabtu, Fleksibel Lapangan)
  const adiraSchedule = resolveEmployeeWorkSchedule(
    'Adira Finance — Penempatan Regional',
    INITIAL_POLICY,
    'Adira Kelapa Gading'
  );
  assert.equal(adiraSchedule.isCustomClientOverride, true);
  assert.equal(adiraSchedule.policySourceLabel, 'Kebijakan Khusus Klien');
  assert.equal(adiraSchedule.checkInTime, '08:00');
  assert.equal(adiraSchedule.checkOutTime, '17:00');
  assert.equal(adiraSchedule.lateToleranceMinutes, 10);
  assert.equal(adiraSchedule.workDays, 'Senin – Sabtu');
  assert.equal(adiraSchedule.locationMode, 'Fleksibel Lapangan');
  assert.equal(adiraSchedule.matchedLocation?.name, 'Adira Kelapa Gading');

  // 4. evaluateAttendanceAgainstPolicy strictly calculates Hadir vs Telat & Early-Out
  // At 08:12 WIB:
  // - For Adira employee (08:00 + 10m tol = 08:10 max), 08:12 is TELAT (12m late)
  // - For HQ / FIFGROUP employee (08:30 + 15m tol = 08:45 max), 08:12 is HADIR (0m late)
  const adiraAt0812 = evaluateAttendanceAgainstPolicy('checkin', '08:12', adiraSchedule);
  assert.equal(adiraAt0812.status, 'Telat');
  assert.equal(adiraAt0812.lateMinutes, 12);
  assert.ok(adiraAt0812.policyNote.includes('Kebijakan Khusus Klien'));

  const hqAt0812 = evaluateAttendanceAgainstPolicy('checkin', '08:12', hqSchedule);
  assert.equal(hqAt0812.status, 'Hadir');
  assert.equal(hqAt0812.lateMinutes, 0);
  assert.ok(hqAt0812.policyNote.includes('Standar Perusahaan'));

  // Clock-out evaluation against BAF custom checkOutTime (16:30)
  const bafSchedule = resolveEmployeeWorkSchedule(
    'BAF — Layanan Operasional Cabang',
    INITIAL_POLICY
  );
  const bafOut1600 = evaluateAttendanceAgainstPolicy('checkout', '16:00', bafSchedule);
  assert.equal(bafOut1600.isEarlyOut, true);
  assert.equal(bafOut1600.earlyOutMinutes, 30);

  const bafOut1635 = evaluateAttendanceAgainstPolicy('checkout', '16:35', bafSchedule);
  assert.equal(bafOut1635.isEarlyOut, false);
  assert.equal(bafOut1635.earlyOutMinutes, 0);

  // 5. syncAttendanceLocationsFromEntities adds any missing branches from INITIAL_ENTITIES
  const syncResult = syncAttendanceLocationsFromEntities(
    INITIAL_POLICY.attendanceLocations.slice(0, 2),
    INITIAL_ENTITIES,
    INITIAL_POLICY.clientOverrides
  );
  assert.ok(syncResult.addedCount >= 3);
  assert.ok(syncResult.nextLocations.some((l) => l.name === 'Adira Tebet'));
  assert.ok(syncResult.nextLocations.some((l) => l.name === 'BAF Jakarta Pusat (Sudirman)'));
});

test('Leave Quota Deduction, Mandatory SKD for Izin Sakit, and Strict Alpha Enforcement', () => {
  // 1. Larasati Dewi (INT-118) has 2 approved Cuti Tahunan days out of 12 -> remaining 10 days
  const larasatiQuota = calculateEmployeeLeaveQuotaSummary(
    'INT-118',
    INITIAL_LEAVE_ABSENCES,
    INITIAL_POLICY.annualLeaveQuota
  );
  assert.equal(larasatiQuota.annualLeaveQuota, 12);
  assert.equal(larasatiQuota.approvedLeaveDays, 2);
  assert.equal(larasatiQuota.remainingLeaveQuota, 10);
  assert.equal(larasatiQuota.alphaDays, 0);

  // 2. Nadia Kusuma (OUT-318) has 3 pending Cuti Tahunan days -> remaining still 12 until approved; once approved -> remaining becomes 9
  const nadiaBefore = calculateEmployeeLeaveQuotaSummary(
    'OUT-318',
    INITIAL_LEAVE_ABSENCES,
    12
  );
  assert.equal(nadiaBefore.pendingLeaveDays, 3);
  assert.equal(nadiaBefore.approvedLeaveDays, 0);
  assert.equal(nadiaBefore.remainingLeaveQuota, 12);

  const afterApprovingNadia = INITIAL_LEAVE_ABSENCES.map((lv) =>
    lv.id === 'lv-2' ? { ...lv, status: 'Disetujui' as const } : lv
  );
  const nadiaAfter = calculateEmployeeLeaveQuotaSummary('OUT-318', afterApprovingNadia, 12);
  assert.equal(nadiaAfter.approvedLeaveDays, 3);
  assert.equal(nadiaAfter.remainingLeaveQuota, 9);

  // 3. Bima Saputra (OUT-405) has 1 pending Izin Sakit with SKD; approving it increments approvedSickDays
  const bimaBefore = calculateEmployeeLeaveQuotaSummary('OUT-405', INITIAL_LEAVE_ABSENCES, 12);
  assert.equal(bimaBefore.pendingSickDays, 1);
  assert.equal(bimaBefore.approvedSickDays, 0);

  const afterApprovingBima = INITIAL_LEAVE_ABSENCES.map((lv) =>
    lv.id === 'lv-5' ? { ...lv, status: 'Disetujui' as const } : lv
  );
  const bimaAfter = calculateEmployeeLeaveQuotaSummary('OUT-405', afterApprovingBima, 12);
  assert.equal(bimaAfter.approvedSickDays, 1);
  assert.equal(bimaAfter.remainingLeaveQuota, 12);

  // 4. Teguh Santoso (OUT-512) has strict Alpha record
  const teguhQuota = calculateEmployeeLeaveQuotaSummary('OUT-512', INITIAL_LEAVE_ABSENCES, 12);
  assert.equal(teguhQuota.alphaDays, 1);

  // 5. Mandatory SKD validation for Izin Sakit
  const sickWithoutSkd = validateLeaveRequestSubmission({
    type: 'Izin Sakit',
    dateRange: '20 Nov 2026',
    daysCount: 2,
    reason: 'Demam tinggi',
    skdFileName: '',
    remainingLeaveQuota: 12,
  });
  assert.equal(sickWithoutSkd.ok, false);
  assert.ok(sickWithoutSkd.error?.includes('SKD'));

  const sickWithSkd = validateLeaveRequestSubmission({
    type: 'Izin Sakit',
    dateRange: '20 Nov 2026',
    daysCount: 2,
    reason: 'Demam tinggi',
    skdFileName: 'SKD_RS_Mitra_Keluarga.pdf',
    remainingLeaveQuota: 12,
  });
  assert.equal(sickWithSkd.ok, true);

  // 6. Cuti Tahunan exceeding remaining quota is rejected
  const exceedQuota = validateLeaveRequestSubmission({
    type: 'Cuti Tahunan',
    dateRange: '01 – 05 Des 2026',
    daysCount: 5,
    reason: 'Liburan akhir tahun',
    remainingLeaveQuota: 3,
  });
  assert.equal(exceedQuota.ok, false);
  assert.ok(exceedQuota.error?.includes('melebihi sisa kuota'));

  // 7. SKD certificate SVG preview builder returns valid data URL
  const skdPreview = buildSkdCertificatePreviewDataUrl({
    employeeName: 'Bima Saputra',
    employeeCode: 'OUT-405',
    dateRange: '13 Nov 2026',
    daysCount: 1,
    reason: 'Demam tinggi & observasi',
  });
  assert.ok(skdPreview.startsWith('data:image/svg+xml;utf8,'));
  assert.ok(decodeURIComponent(skdPreview).includes('&amp;'));
});

test('System Settings validation and PEVORA License Summary (PT Iskandar Pratama Teknologi)', () => {
  // Valid initial settings pass
  const validRes = validateSystemSettingsInput(INITIAL_SETTINGS);
  assert.equal(validRes.ok, true);

  // Empty company name fails
  assert.equal(
    validateSystemSettingsInput({ ...INITIAL_SETTINGS, companyName: '   ' }).ok,
    false
  );

  // Empty PKWT first-party signatory name fails
  assert.equal(
    validateSystemSettingsInput({ ...INITIAL_SETTINGS, pkwtSignatoryName: '  ' }).ok,
    false
  );

  // Short default PIN (<4 chars) fails
  assert.equal(
    validateSystemSettingsInput({ ...INITIAL_SETTINGS, defaultEmployeePin: '12' }).ok,
    false
  );

  // License summary reflects PT Iskandar Pratama Teknologi and tenant counts
  const license = buildPevoraLicenseSummary({
    companyName: 'PT Swapro Nusantara',
    activeEntityCount: 5,
    activeEmployeeCount: 6,
  });
  assert.equal(license.vendorCompany, 'PT Iskandar Pratama Teknologi');
  assert.equal(license.licensedTenantName, 'PT Swapro Nusantara');
  assert.equal(license.activeEntityCount, 5);
  assert.equal(license.activeEmployeeCount, 6);
  assert.equal(license.licenseStatus, 'Aktif · Terverifikasi');
});

test('Per-Employee Attendance Recap aggregates present days, late frequency & minutes, leave quotas, SKD sick days, alpha, and CSV export', () => {
  const recapRows = buildPerEmployeeAttendanceRecap({
    employees: INITIAL_EMPLOYEES,
    attendanceLogs: INITIAL_ATTENDANCE_LOGS,
    leaveAbsences: INITIAL_LEAVE_ABSENCES,
    policy: INITIAL_POLICY,
  });

  // Includes all active employees (6) + additional log/leave subjects (Hendrik Gunawan OUT-429) = 7
  assert.ok(recapRows.length >= 7);

  // Raka Pratama (EMP-1024) — Internal, 0 late, Disiplin Tertib
  const raka = recapRows.find((r) => r.employeeCode === 'EMP-1024');
  assert.ok(raka);
  assert.equal(raka.telatCount, 0);
  assert.equal(raka.totalLateMinutes, 0);
  assert.equal(raka.disciplineStatus, 'Disiplin Tertib');
  assert.ok(raka.dailyHistory.length >= 8);

  // Nadia Kusuma (OUT-318) — BAF custom client override (08:00 - 16:30), 2x late (28 + 15 = 43 mins), Perlu Pembinaan Telat
  const nadia = recapRows.find((r) => r.employeeCode === 'OUT-318');
  assert.ok(nadia);
  assert.equal(nadia.isCustomClientOverride, true);
  assert.equal(nadia.checkInTime, '08:00');
  assert.equal(nadia.telatCount, 2);
  assert.equal(nadia.totalLateMinutes, 43);
  assert.equal(nadia.disciplineStatus, 'Perlu Pembinaan Telat');

  // Teguh Santoso (OUT-512) — has 1 Alpha record -> Evaluasi Disiplin (Alpha)
  const teguh = recapRows.find((r) => r.employeeCode === 'OUT-512');
  assert.ok(teguh);
  assert.equal(teguh.alphaDays, 1);
  assert.equal(teguh.disciplineStatus, 'Evaluasi Disiplin (Alpha)');

  // Larasati Dewi (INT-118) — has 2 approved Cuti Tahunan days -> remaining 10/12
  const larasati = recapRows.find((r) => r.employeeCode === 'INT-118');
  assert.ok(larasati);
  assert.equal(larasati.approvedLeaveDays, 2);
  assert.equal(larasati.remainingLeaveQuota, 10);

  // CSV exporter produces valid header and rows including Email & WhatsApp
  const csv = buildEmployeeAttendanceRecapCsv(recapRows);
  assert.ok(csv.includes('NIK Karyawan,Nama Lengkap,Email,WhatsApp,Jabatan'));
  assert.ok(csv.includes('Nadia Kusuma'));
  assert.ok(csv.includes('Perlu Pembinaan Telat'));

  // Attendance recap WA & Email URL builders produce valid wa.me and mailto links
  const nadiaWa = buildAttendanceRecapWhatsappUrl(nadia);
  const nadiaMail = buildAttendanceRecapMailtoUrl(nadia);
  assert.ok(nadiaWa.startsWith('https://wa.me/6285691230318?text='));
  assert.ok(nadiaMail.startsWith('mailto:nadia.kusuma@swapro-demo.co.id?subject='));
});

test('Role Admin WA & Email follow-up builders and RBAC Cuti/SKD authority separation (ACC by Master Admin)', () => {
  // All internal accounts (Master Admin, Admin, Rekruter) have email and whatsappNumber
  const internalUsers = INITIAL_USERS.filter(
    (u) => u.role === 'Master Admin' || u.role === 'Admin' || u.role === 'Rekruter'
  );
  assert.equal(internalUsers.length, 4);
  for (const u of internalUsers) {
    assert.ok(u.email.includes('@'));
    assert.ok(u.whatsappNumber && u.whatsappNumber.length >= 10);
    const waUrl = buildInternalUserWhatsappUrl(u);
    const mailUrl = buildInternalUserMailtoUrl(u);
    assert.ok(waUrl.startsWith('https://wa.me/62'));
    assert.ok(mailUrl.startsWith(`mailto:${u.email}?subject=`));
  }

  // Leave / SKD follow-up WA & Email builders state Master Admin ACC authority for pending requests
  const pendingLeave = INITIAL_LEAVE_ABSENCES.find((l) => l.status === 'Menunggu');
  assert.ok(pendingLeave);
  const matchedEmp = INITIAL_EMPLOYEES.find(
    (e) => e.employeeCode.toLowerCase() === pendingLeave.employeeCode.toLowerCase()
  );
  const leaveWa = buildLeaveFollowupWhatsappUrl(pendingLeave, matchedEmp);
  const leaveMail = buildLeaveFollowupMailtoUrl(pendingLeave, matchedEmp);
  assert.ok(leaveWa.startsWith('https://wa.me/62'));
  assert.ok(decodeURIComponent(leaveWa).includes('Master Admin'));
  assert.ok(leaveMail.startsWith('mailto:'));
  assert.ok(decodeURIComponent(leaveMail).includes('Master Admin'));

  // RBAC Matrix explicitly separates Master Admin ACC authority from Admin monitoring
  const presensiRbac = RBAC_MATRIX_ROWS.find((r) => r.module.includes('Presensi'));
  assert.ok(presensiRbac);
  assert.ok(presensiRbac.masterAdmin.includes('ACC Cuti/SKD'));
  assert.ok(presensiRbac.admin.includes('ACC Master Admin'));
});

