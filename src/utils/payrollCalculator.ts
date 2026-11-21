import * as XLSX from 'xlsx';
import type {
  AttendanceLogRecord,
  EmployeeRecord,
  EntityRecord,
  LeaveAbsenceRecord,
} from '../data/masterAdminData';
import { formatRupiahDot } from './pkwtDocument';

export type PtkpStatus = 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3';

export type BaseSalarySourceTag =
  | 'Override Kontrak Individu'
  | 'Rate Card Klien & Posisi'
  | 'UMR Wilayah Penempatan'
  | 'Default Base Klien';

export type PayrollCalculationSource =
  | 'Dihitung Aplikasi'
  | 'Import Excel (Variabel)'
  | 'Import Excel (Override Final)';

export type PayrollRunStatus = 'Draft' | 'Menunggu ACC' | 'Disetujui' | 'Ditolak';

export type PayrollSettlementType = 'Reguler' | 'Final Settlement (Resign)';

export interface RegionalWageTier {
  id: string;
  name: string;
  areaKeywords: string[];
  umrMonthly: number;
  isCustom?: boolean;
}

export interface PayrollTariffConfig {
  bpjsKesEmpRate: number;
  bpjsKesCompRate: number;
  bpjsKesWageCap: number;
  bpjsJhtEmpRate: number;
  bpjsJhtCompRate: number;
  bpjsJpEmpRate: number;
  bpjsJpCompRate: number;
  bpjsJpWageCap: number;
  bpjsJkkCompRate: number;
  bpjsJkmCompRate: number;
  workingDaysPerMonth: number;
  alphaDeductionMode: 'prorate-base' | 'fixed';
  alphaFixedPerDay: number;
  lateDeductionPerMinute: number;
  pph21Enabled: boolean;
  pph21Scheme: 'Gross' | 'Nett (Ditanggung Perusahaan)';
  regionalTiers: RegionalWageTier[];
}

export interface BaseSalaryResolution {
  baseSalary: number;
  sourceTag: BaseSalarySourceTag;
  regionName: string;
  umrReference: number;
  belowUmrWarning: boolean;
}

export interface PayrollSlipEditableInput {
  baseSalaryOverride?: number;
  prorataDaysOverride?: number;
  fixedAllowance?: number;
  variableAllowance?: number;
  overtimePay?: number;
  incentiveBonus?: number;
  pkwtCompensation?: number;
  otherCompensation?: number;
  loanKasbonDeduction?: number;
  otherDeduction?: number;
  alphaDaysOverride?: number;
  lateMinutesOverride?: number;
  notes?: string;
}

export interface PayrollSlipRecord {
  id: string; // composite unique key `${period}::${employeeId}` (anti-double)
  period: string; // e.g. '2026-11'
  periodLabel: string; // e.g. 'November 2026'
  employeeId: string;
  employeeCode: string;
  fullName: string;
  position: string;
  department: string;
  employmentType: 'Internal' | 'Penempatan Klien';
  entityName: string;
  placementName: string;
  placementArea: string;
  ptkpStatus: PtkpStatus;
  npwpNumber: string;
  bpjsKesehatanNumber: string;
  bpjsKetenagakerjaanNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  calculationSource: PayrollCalculationSource;
  sourceFileName?: string;
  baseSalarySourceTag: BaseSalarySourceTag;
  regionName: string;
  umrReference: number;
  belowUmrWarning: boolean;
  excelBaseMismatchWarning?: string;
  employeeStatusAtCalculation?: 'Aktif' | 'Probation' | 'Resign' | 'Nonaktif';
  settlementType?: PayrollSettlementType;
  resignDate?: string;
  prorataActiveDays?: number;
  prorataTotalDays?: number;
  fullBaseSalary?: number;
  // Earnings & Compensation
  baseSalary: number;
  fixedAllowance: number;
  variableAllowance: number;
  overtimePay: number;
  incentiveBonus: number;
  pkwtCompensation: number;
  otherCompensation: number;
  grossIncome: number;
  // Employee Deductions
  bpjsKesEmployee: number;
  bpjsTkJhtEmployee: number;
  bpjsTkJpEmployee: number;
  pph21Employee: number;
  alphaDaysCount: number;
  alphaDeduction: number;
  lateMinutesCount: number;
  lateDeduction: number;
  loanKasbonDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  // Company Contributions (info & cost-to-company)
  bpjsKesCompany: number;
  bpjsTkJhtCompany: number;
  bpjsTkJpCompany: number;
  bpjsTkJkkCompany: number;
  bpjsTkJkmCompany: number;
  pph21CompanySubsidy: number;
  totalCompanyCost: number;
  // Net
  takeHomePay: number;
  // Status & Lock
  status: PayrollRunStatus;
  pkwtContractClaimedNumber?: string;
  notes?: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PayrollPeriodRun {
  period: string;
  periodLabel: string;
  status: PayrollRunStatus;
  locked: boolean;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  approvalRequestId?: string;
  totalEmployees: number;
  totalGross: number;
  totalCompensation: number;
  totalBpjsEmployee: number;
  totalPph21: number;
  totalDeductions: number;
  totalThp: number;
  totalCompanyCost: number;
  sourceSummary: string;
}

export type ExcelImportMode = 'variable-merge' | 'full-override';

export interface ExcelStagingRow {
  rowNumber: number;
  rawCode: string;
  rawName: string;
  status: 'valid' | 'warning' | 'duplicate' | 'error';
  message: string;
  matchedEmployeeId?: string;
  matchedEmployeeCode?: string;
  matchedEmployeeName?: string;
  excelBaseSalary?: number;
  masterBaseSalary?: number;
  slip?: PayrollSlipRecord;
}

export interface ExcelImportPreviewResult {
  fileName: string;
  mode: ExcelImportMode;
  totalRows: number;
  validCount: number;
  warningCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: ExcelStagingRow[];
}

export const INITIAL_REGIONAL_WAGE_TIERS: RegionalWageTier[] = [
  {
    id: 'umr-jkt',
    name: 'UMR DKI Jakarta',
    areaKeywords: ['jakarta', 'dki', 'jabodetabek'],
    umrMonthly: 5396761,
  },
  {
    id: 'umr-bodebek',
    name: 'UMK Bodetabek / Karawang',
    areaKeywords: ['bekasi', 'tangerang', 'bogor', 'depok', 'karawang'],
    umrMonthly: 5250000,
  },
  {
    id: 'umr-sby',
    name: 'UMK Surabaya & Ring 1 Jatim',
    areaKeywords: ['surabaya', 'jawa timur', 'sidoarjo', 'gresik'],
    umrMonthly: 4961753,
  },
  {
    id: 'umr-bdg',
    name: 'UMK Bandung & Jawa Barat',
    areaKeywords: ['bandung', 'jawa barat', 'cimahi'],
    umrMonthly: 4482914,
  },
  {
    id: 'umr-daerah-35',
    name: 'UMK Daerah / Jawa Tengah (Rp 3,5 Jt)',
    areaKeywords: ['semarang', 'solo', 'surakarta', 'yogyakarta', 'jogja', 'daerah', 'jawa tengah'],
    umrMonthly: 3500000,
  },
  {
    id: 'umr-custom',
    name: 'Nominal Khusus / Kesepakatan PKS',
    areaKeywords: ['khusus', 'custom', 'pks'],
    umrMonthly: 0,
    isCustom: true,
  },
];

export const INITIAL_PAYROLL_TARIFFS: PayrollTariffConfig = {
  bpjsKesEmpRate: 0.01,
  bpjsKesCompRate: 0.04,
  bpjsKesWageCap: 12000000,
  bpjsJhtEmpRate: 0.02,
  bpjsJhtCompRate: 0.037,
  bpjsJpEmpRate: 0.01,
  bpjsJpCompRate: 0.02,
  bpjsJpWageCap: 10042300,
  bpjsJkkCompRate: 0.0024,
  bpjsJkmCompRate: 0.003,
  workingDaysPerMonth: 22,
  alphaDeductionMode: 'prorate-base',
  alphaFixedPerDay: 250000,
  lateDeductionPerMinute: 0,
  pph21Enabled: true,
  pph21Scheme: 'Gross',
  regionalTiers: INITIAL_REGIONAL_WAGE_TIERS,
};

const MONTH_NAMES_ID = [
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

export function formatPayrollPeriodLabel(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!match) return period;
  const year = match[1];
  const monthIdx = Number(match[2]) - 1;
  return `${MONTH_NAMES_ID[monthIdx] ?? match[2]} ${year}`;
}

export function buildSlipUniqueKey(period: string, employeeId: string): string {
  return `${period.trim()}::${employeeId.trim()}`;
}

export function derivePtkpFromEmployee(emp: Pick<EmployeeRecord, 'maritalStatus' | 'familyMembers' | 'ptkpStatus'>): PtkpStatus {
  const explicit = emp.ptkpStatus as PtkpStatus | undefined;
  const validList: PtkpStatus[] = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'];
  if (explicit && validList.includes(explicit)) {
    return explicit;
  }
  const childDependents = Math.min(
    3,
    (emp.familyMembers ?? []).filter((m) => m.relation === 'Anak').length
  );
  if (emp.maritalStatus === 'Kawin') {
    return `K/${childDependents}` as PtkpStatus;
  }
  return `TK/${childDependents}` as PtkpStatus;
}

// Indonesian PP No. 58/2023 TER (Tarif Efektif Rata-Rata) Table (Monthly)
const TER_A_BRACKETS: Array<[number, number]> = [
  [5400000, 0],
  [5650000, 0.0025],
  [5950000, 0.005],
  [6300000, 0.0075],
  [6750000, 0.01],
  [7500000, 0.0125],
  [8550000, 0.015],
  [9650000, 0.0175],
  [10050000, 0.02],
  [10350000, 0.0225],
  [10700000, 0.025],
  [11050000, 0.03],
  [11600000, 0.035],
  [12500000, 0.04],
  [13750000, 0.05],
  [15100000, 0.06],
  [16950000, 0.07],
  [19750000, 0.08],
  [24150000, 0.09],
  [26450000, 0.1],
  [28000000, 0.11],
  [30050000, 0.12],
  [32400000, 0.13],
  [35400000, 0.14],
  [39100000, 0.15],
  [43850000, 0.16],
  [47800000, 0.17],
  [51400000, 0.18],
  [56300000, 0.19],
  [62200000, 0.2],
  [68600000, 0.21],
  [77500000, 0.22],
  [89000000, 0.23],
  [103000000, 0.24],
  [125000000, 0.25],
];

const TER_B_BRACKETS: Array<[number, number]> = [
  [6200000, 0],
  [6500000, 0.0025],
  [6850000, 0.005],
  [7300000, 0.0075],
  [9200000, 0.01],
  [10750000, 0.015],
  [11250000, 0.02],
  [11600000, 0.025],
  [12600000, 0.03],
  [13600000, 0.04],
  [14950000, 0.05],
  [16400000, 0.06],
  [18450000, 0.07],
  [21850000, 0.08],
  [26000000, 0.09],
  [27700000, 0.1],
  [29350000, 0.11],
  [31450000, 0.12],
  [33950000, 0.13],
  [37100000, 0.14],
  [41100000, 0.15],
  [45800000, 0.16],
  [49500000, 0.17],
  [53800000, 0.18],
  [58500000, 0.19],
  [64000000, 0.2],
  [71000000, 0.21],
  [80000000, 0.22],
  [93000000, 0.23],
  [109000000, 0.24],
  [129000000, 0.25],
];

const TER_C_BRACKETS: Array<[number, number]> = [
  [6600000, 0],
  [6950000, 0.0025],
  [7350000, 0.005],
  [7800000, 0.0075],
  [8850000, 0.01],
  [9800000, 0.0125],
  [10950000, 0.015],
  [11200000, 0.0175],
  [12050000, 0.02],
  [12950000, 0.03],
  [14150000, 0.04],
  [15550000, 0.05],
  [17050000, 0.06],
  [19500000, 0.07],
  [22700000, 0.08],
  [26600000, 0.09],
  [28100000, 0.1],
  [30100000, 0.11],
  [32600000, 0.12],
  [35400000, 0.13],
  [38900000, 0.14],
  [43000000, 0.15],
  [47400000, 0.16],
  [51200000, 0.17],
  [55800000, 0.18],
  [60400000, 0.19],
  [66700000, 0.2],
  [74500000, 0.21],
  [83200000, 0.22],
  [95600000, 0.23],
  [110000000, 0.24],
  [134000000, 0.25],
];

export function resolveTerCategory(ptkpStatus: PtkpStatus): 'TER A' | 'TER B' | 'TER C' {
  if (ptkpStatus === 'TK/0' || ptkpStatus === 'TK/1' || ptkpStatus === 'K/0') {
    return 'TER A';
  }
  if (ptkpStatus === 'K/3') {
    return 'TER C';
  }
  return 'TER B';
}

export function calculateIndonesianPph21Ter(grossMonthly: number, ptkpStatus: PtkpStatus): {
  category: 'TER A' | 'TER B' | 'TER C';
  rate: number;
  taxAmount: number;
} {
  const safeGross = Math.max(0, Math.round(grossMonthly));
  const category = resolveTerCategory(ptkpStatus);
  const brackets =
    category === 'TER A'
      ? TER_A_BRACKETS
      : category === 'TER C'
        ? TER_C_BRACKETS
        : TER_B_BRACKETS;

  let matchedRate = 0.26;
  for (const [maxGross, rate] of brackets) {
    if (safeGross <= maxGross) {
      matchedRate = rate;
      break;
    }
  }
  return {
    category,
    rate: matchedRate,
    taxAmount: Math.round(safeGross * matchedRate),
  };
}

export function matchRegionalWageTier(
  emp: Pick<EmployeeRecord, 'regionalWageId' | 'placementArea' | 'placementName' | 'placementLocation'>,
  entity: EntityRecord | undefined,
  tiers: RegionalWageTier[]
): RegionalWageTier {
  if (emp.regionalWageId) {
    const explicit = tiers.find((t) => t.id === emp.regionalWageId);
    if (explicit) return explicit;
  }
  const placementObj = entity?.supportedPlacements?.find(
    (p) => p.name === emp.placementName || p.area === emp.placementArea
  );
  if (placementObj?.regionalWageId) {
    const byPlacementId = tiers.find((t) => t.id === placementObj.regionalWageId);
    if (byPlacementId) return byPlacementId;
  }

  const haystack = [
    emp.placementArea ?? '',
    emp.placementName ?? '',
    emp.placementLocation ?? '',
    entity?.city ?? '',
  ]
    .join(' ')
    .toLowerCase();

  for (const tier of tiers) {
    if (tier.isCustom) continue;
    if (tier.areaKeywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return tier;
    }
  }

  return tiers[0] ?? INITIAL_REGIONAL_WAGE_TIERS[0];
}

/**
 * 4-Level Base Salary Hierarchy (Single Source of Truth):
 * 1. Override Kontrak Individu (salaryOverrideManual or salaryMonthly differs from position/default)
 * 2. Rate Card Klien & Posisi (supportedPositions.baseSalary)
 * 3. UMR Wilayah Penempatan (regionalTier.umrMonthly)
 * 4. Default Base Klien (entity.defaultBaseSalary)
 */
export function resolveEmployeeBaseSalary(
  emp: EmployeeRecord,
  entities: EntityRecord[],
  regionalTiers: RegionalWageTier[]
): BaseSalaryResolution {
  const entity = entities.find((e) => e.name === emp.entityName);
  const tier = matchRegionalWageTier(emp, entity, regionalTiers);
  const posMatch = entity?.supportedPositions?.find(
    (p) => p.title.toLowerCase() === emp.position.toLowerCase()
  );
  const umrRef = tier.isCustom ? 0 : tier.umrMonthly;

  let resolvedSalary = 0;
  let sourceTag: BaseSalarySourceTag = 'Default Base Klien';

  const empSalary = typeof emp.salaryMonthly === 'number' && emp.salaryMonthly > 0 ? emp.salaryMonthly : 0;

  if (emp.salaryOverrideManual && empSalary > 0) {
    resolvedSalary = empSalary;
    sourceTag = 'Override Kontrak Individu';
  } else if (empSalary > 0 && posMatch && empSalary !== posMatch.baseSalary) {
    resolvedSalary = empSalary;
    sourceTag = 'Override Kontrak Individu';
  } else if (posMatch && posMatch.baseSalary > 0) {
    resolvedSalary = posMatch.baseSalary;
    sourceTag = 'Rate Card Klien & Posisi';
  } else if (empSalary > 0) {
    resolvedSalary = empSalary;
    sourceTag = 'Override Kontrak Individu';
  } else if (umrRef > 0) {
    resolvedSalary = umrRef;
    sourceTag = 'UMR Wilayah Penempatan';
  } else {
    resolvedSalary = entity?.defaultBaseSalary ?? 5000000;
    sourceTag = 'Default Base Klien';
  }

  const belowUmrWarning = umrRef > 0 && resolvedSalary < umrRef && !tier.isCustom;

  return {
    baseSalary: Math.round(resolvedSalary),
    sourceTag,
    regionName: tier.name,
    umrReference: umrRef,
    belowUmrWarning,
  };
}

export function calculatePkwtTenureMonths(joinDate: string, contractEndDate: string): number {
  const start = new Date(`${joinDate}T00:00:00`);
  const end = new Date(`${contractEndDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayAdjust = end.getDate() + 1 >= start.getDate() ? 0 : -1;
  const total = yearDiff * 12 + monthDiff + dayAdjust;
  return Math.max(1, total);
}

/**
 * PP No. 35 Tahun 2021 PKWT End-of-Contract Compensation:
 * (Masa Kerja dalam bulan / 12) * (Gaji Pokok + Tunjangan Tetap)
 */
export function calculatePkwtCompensationAmount(
  emp: Pick<EmployeeRecord, 'contractType' | 'joinDate' | 'contractEndDate'>,
  baseSalary: number,
  fixedAllowance = 0
): {
  eligible: boolean;
  tenureMonths: number;
  amount: number;
} {
  if (emp.contractType !== 'PKWT') {
    return { eligible: false, tenureMonths: 0, amount: 0 };
  }
  const tenureMonths = calculatePkwtTenureMonths(emp.joinDate, emp.contractEndDate);
  if (tenureMonths < 1) {
    return { eligible: false, tenureMonths: 0, amount: 0 };
  }
  const amount = Math.round((tenureMonths / 12) * (baseSalary + fixedAllowance));
  return { eligible: true, tenureMonths, amount };
}

export function summarizeEmployeeAttendanceForPayroll(
  emp: EmployeeRecord,
  attendanceLogs: AttendanceLogRecord[],
  leaveAbsences: LeaveAbsenceRecord[]
): { alphaDays: number; lateMinutes: number } {
  const alphaFromLeaves = leaveAbsences
    .filter(
      (l) =>
        l.employeeCode === emp.employeeCode &&
        (l.status === 'Alpha' || l.type === 'Alpha / Tanpa Keterangan')
    )
    .reduce((sum, l) => sum + Math.max(1, l.daysCount || 1), 0);

  const alphaFromLogs = attendanceLogs.filter(
    (log) => log.employeeCode === emp.employeeCode && log.status === 'Alpha'
  ).length;

  const lateMinutes = attendanceLogs
    .filter((log) => log.employeeCode === emp.employeeCode)
    .reduce((sum, log) => sum + Math.max(0, log.lateMinutes || 0), 0);

  return {
    alphaDays: Math.max(alphaFromLeaves, alphaFromLogs),
    lateMinutes,
  };
}

export interface ResignProrataResult {
  fullBaseSalary: number;
  proratedBaseSalary: number;
  activeDays: number;
  totalDays: number;
  ratio: number;
  isInResignMonth: boolean;
  isProrated: boolean;
}

function countWeekdaysInMonth(year: number, month1To12: number, upToDay?: number): number {
  const daysInMonth = new Date(year, month1To12, 0).getDate();
  const limit = upToDay ? Math.min(daysInMonth, Math.max(1, upToDay)) : daysInMonth;
  let count = 0;
  for (let d = 1; d <= limit; d++) {
    const dayOfWeek = new Date(year, month1To12 - 1, d).getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      count += 1;
    }
  }
  return count;
}

/**
 * Calculates prorated base salary for Resign employees using working weekdays (Senin–Jumat)
 * up to resignDate in the resign month.
 */
export function calculateResignProrataRatio(
  period: string,
  resignDate: string | undefined,
  fullBaseSalary: number,
  workingDaysPerMonth = 22
): ResignProrataResult {
  const safeBase = Math.max(0, Math.round(fullBaseSalary));
  const cleanDate = resignDate?.trim() ?? '';
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate);
  const periodMatch = /^(\d{4})-(\d{2})$/.exec(period.trim());

  if (!dateMatch) {
    const fallbackTotal = Math.max(1, Math.round(workingDaysPerMonth));
    return {
      fullBaseSalary: safeBase,
      proratedBaseSalary: safeBase,
      activeDays: fallbackTotal,
      totalDays: fallbackTotal,
      ratio: 1,
      isInResignMonth: false,
      isProrated: false,
    };
  }

  const rYear = Number(dateMatch[1]);
  const rMonth = Number(dateMatch[2]);
  const rDay = Number(dateMatch[3]);
  const isInResignMonth = Boolean(
    periodMatch && Number(periodMatch[1]) === rYear && Number(periodMatch[2]) === rMonth
  );

  const totalWeekdays = Math.max(1, countWeekdaysInMonth(rYear, rMonth));
  const workedWeekdays = Math.max(1, countWeekdaysInMonth(rYear, rMonth, rDay));
  const activeDays = Math.min(totalWeekdays, workedWeekdays);
  const ratio = Math.min(1, activeDays / totalWeekdays);

  return {
    fullBaseSalary: safeBase,
    proratedBaseSalary: Math.round(safeBase * ratio),
    activeDays,
    totalDays: totalWeekdays,
    ratio,
    isInResignMonth,
    isProrated: activeDays < totalWeekdays,
  };
}

export function isEmployeeEligibleForPayrollRun(
  emp: Pick<EmployeeRecord, 'id' | 'status' | 'resignDate'>,
  period: string,
  settledResignEmployeeIds: string[] = []
): boolean {
  if (emp.status === 'Nonaktif') return false;
  if (emp.status === 'Aktif' || emp.status === 'Probation') return true;
  if (emp.status === 'Resign') {
    if (settledResignEmployeeIds.includes(emp.id)) return false;
    return Boolean(emp.resignDate?.trim().startsWith(period.trim()));
  }
  return false;
}

export interface PayrollHeadcountResignRow {
  employee: EmployeeRecord;
  isInPeriod: boolean;
  isSettled: boolean;
  hasSlipInPeriod: boolean;
  prorata: ResignProrataResult;
}

export interface PayrollHeadcountSummary {
  totalScoped: number;
  activeRegularCount: number;
  activeCount: number;
  probationCount: number;
  resignTotalCount: number;
  resignInPeriodCount: number;
  resignPendingSettlementCount: number;
  resignSettledCount: number;
  nonaktifCount: number;
  totalPayableThisPeriod: number;
  calculatedSlipCount: number;
  uncalculatedEligibleCount: number;
  resignEmployees: PayrollHeadcountResignRow[];
  nonaktifEmployees: EmployeeRecord[];
}

export function computePayrollHeadcountSummary(params: {
  period: string;
  employees: EmployeeRecord[];
  entities: EntityRecord[];
  tariffs: PayrollTariffConfig;
  periodSlips: PayrollSlipRecord[];
  settledResignEmployeeIds?: string[];
}): PayrollHeadcountSummary {
  const {
    period,
    employees,
    entities,
    tariffs,
    periodSlips,
    settledResignEmployeeIds = [],
  } = params;

  const activeCount = employees.filter((e) => e.status === 'Aktif').length;
  const probationCount = employees.filter((e) => e.status === 'Probation').length;
  const activeRegularCount = activeCount + probationCount;

  const nonaktifEmployees = employees.filter((e) => e.status === 'Nonaktif');
  const resignRaw = employees.filter((e) => e.status === 'Resign');
  const slipEmpIdSet = new Set(periodSlips.map((s) => s.employeeId));

  const resignEmployees: PayrollHeadcountResignRow[] = resignRaw.map((emp) => {
    const baseInfo = resolveEmployeeBaseSalary(emp, entities, tariffs.regionalTiers);
    const prorata = calculateResignProrataRatio(
      period,
      emp.resignDate,
      baseInfo.baseSalary,
      tariffs.workingDaysPerMonth
    );
    const hasSlipInPeriod = slipEmpIdSet.has(emp.id);
    const slipInPeriod = periodSlips.find((s) => s.employeeId === emp.id);
    const isSettled =
      settledResignEmployeeIds.includes(emp.id) || slipInPeriod?.status === 'Disetujui';
    return {
      employee: emp,
      isInPeriod: Boolean(emp.resignDate?.trim().startsWith(period.trim())),
      isSettled,
      hasSlipInPeriod,
      prorata,
    };
  });

  const resignInPeriodCount = resignEmployees.filter((r) => r.isInPeriod).length;
  const resignSettledCount = resignEmployees.filter((r) => r.isSettled).length;
  const resignPendingSettlementCount = resignEmployees.filter((r) => !r.isSettled).length;

  const eligibleRoutineIds = employees
    .filter((e) => isEmployeeEligibleForPayrollRun(e, period, settledResignEmployeeIds))
    .map((e) => e.id);
  const unionPayableSet = new Set<string>([
    ...eligibleRoutineIds,
    ...periodSlips.map((s) => s.employeeId),
  ]);
  const totalPayableThisPeriod = unionPayableSet.size;
  const calculatedSlipCount = periodSlips.length;
  const uncalculatedEligibleCount = eligibleRoutineIds.filter((id) => !slipEmpIdSet.has(id)).length;

  return {
    totalScoped: employees.length,
    activeRegularCount,
    activeCount,
    probationCount,
    resignTotalCount: resignEmployees.length,
    resignInPeriodCount,
    resignPendingSettlementCount,
    resignSettledCount,
    nonaktifCount: nonaktifEmployees.length,
    totalPayableThisPeriod,
    calculatedSlipCount,
    uncalculatedEligibleCount,
    resignEmployees,
    nonaktifEmployees,
  };
}

export function computePayrollSlip(params: {
  period: string;
  employee: EmployeeRecord;
  entities: EntityRecord[];
  tariffs: PayrollTariffConfig;
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  edits?: PayrollSlipEditableInput;
  calculationSource?: PayrollCalculationSource;
  sourceFileName?: string;
  excelBaseMismatchWarning?: string;
  pkwtContractClaimedNumber?: string;
  status?: PayrollRunStatus;
  overrides?: {
    bpjsKesEmployee?: number;
    bpjsTkEmployee?: number;
    pph21Employee?: number;
  };
}): PayrollSlipRecord {
  const {
    period,
    employee,
    entities,
    tariffs,
    attendanceLogs,
    leaveAbsences,
    edits = {},
    calculationSource = 'Dihitung Aplikasi',
    sourceFileName,
    excelBaseMismatchWarning,
    pkwtContractClaimedNumber,
    status = 'Draft',
    overrides,
  } = params;

  const baseInfo = resolveEmployeeBaseSalary(employee, entities, tariffs.regionalTiers);
  const isResign = employee.status === 'Resign';
  const prorata = calculateResignProrataRatio(
    period,
    employee.resignDate,
    baseInfo.baseSalary,
    tariffs.workingDaysPerMonth
  );

  let baseSalary = baseInfo.baseSalary;
  let prorataActiveDays: number | undefined;
  let prorataTotalDays: number | undefined;

  if (isResign) {
    prorataTotalDays = prorata.totalDays;
    if (typeof edits.prorataDaysOverride === 'number' && edits.prorataDaysOverride >= 0) {
      prorataActiveDays = Math.min(prorata.totalDays, Math.round(edits.prorataDaysOverride));
      baseSalary = Math.round(
        baseInfo.baseSalary * (prorataActiveDays / Math.max(1, prorata.totalDays))
      );
    } else if (typeof edits.baseSalaryOverride === 'number' && edits.baseSalaryOverride >= 0) {
      baseSalary = Math.round(edits.baseSalaryOverride);
      prorataActiveDays = prorata.activeDays;
    } else {
      baseSalary = prorata.proratedBaseSalary;
      prorataActiveDays = prorata.activeDays;
    }
  } else if (typeof edits.baseSalaryOverride === 'number' && edits.baseSalaryOverride >= 0) {
    baseSalary = Math.round(edits.baseSalaryOverride);
  }

  const settlementType: PayrollSettlementType = isResign
    ? 'Final Settlement (Resign)'
    : 'Reguler';

  const effectiveSourceTag: BaseSalarySourceTag =
    typeof edits.baseSalaryOverride === 'number' &&
    edits.baseSalaryOverride !== (isResign ? prorata.proratedBaseSalary : baseInfo.baseSalary)
      ? 'Override Kontrak Individu'
      : baseInfo.sourceTag;

  const effectiveBelowUmr =
    baseInfo.umrReference > 0 &&
    (isResign ? baseInfo.baseSalary < baseInfo.umrReference : baseSalary < baseInfo.umrReference);

  const fixedAllowance = Math.max(0, Math.round(edits.fixedAllowance ?? 0));
  const variableAllowance = Math.max(0, Math.round(edits.variableAllowance ?? 0));
  const overtimePay = Math.max(0, Math.round(edits.overtimePay ?? 0));
  const incentiveBonus = Math.max(0, Math.round(edits.incentiveBonus ?? 0));
  const pkwtCompensation = Math.max(0, Math.round(edits.pkwtCompensation ?? 0));
  const otherCompensation = Math.max(0, Math.round(edits.otherCompensation ?? 0));

  const grossIncome =
    baseSalary +
    fixedAllowance +
    variableAllowance +
    overtimePay +
    incentiveBonus +
    pkwtCompensation +
    otherCompensation;

  // BPJS Wage bases
  const bpjsKesBase = Math.min(baseSalary + fixedAllowance, tariffs.bpjsKesWageCap);
  const bpjsTkBase = baseSalary + fixedAllowance;
  const bpjsJpBase = Math.min(baseSalary + fixedAllowance, tariffs.bpjsJpWageCap);

  const bpjsKesEmployee =
    typeof overrides?.bpjsKesEmployee === 'number'
      ? Math.max(0, Math.round(overrides.bpjsKesEmployee))
      : Math.round(bpjsKesBase * tariffs.bpjsKesEmpRate);

  const bpjsTkJhtEmployee =
    typeof overrides?.bpjsTkEmployee === 'number'
      ? Math.max(0, Math.round(overrides.bpjsTkEmployee))
      : Math.round(bpjsTkBase * tariffs.bpjsJhtEmpRate);

  const bpjsTkJpEmployee =
    typeof overrides?.bpjsTkEmployee === 'number'
      ? 0
      : Math.round(bpjsJpBase * tariffs.bpjsJpEmpRate);

  const bpjsKesCompany = Math.round(bpjsKesBase * tariffs.bpjsKesCompRate);
  const bpjsTkJhtCompany = Math.round(bpjsTkBase * tariffs.bpjsJhtCompRate);
  const bpjsTkJpCompany = Math.round(bpjsJpBase * tariffs.bpjsJpCompRate);
  const bpjsTkJkkCompany = Math.round(bpjsTkBase * tariffs.bpjsJkkCompRate);
  const bpjsTkJkmCompany = Math.round(bpjsTkBase * tariffs.bpjsJkmCompRate);

  // Attendance deductions
  const attSummary = summarizeEmployeeAttendanceForPayroll(
    employee,
    attendanceLogs,
    leaveAbsences
  );
  const alphaDaysCount =
    typeof edits.alphaDaysOverride === 'number'
      ? Math.max(0, Math.round(edits.alphaDaysOverride))
      : attSummary.alphaDays;
  const perDayAlpha =
    tariffs.alphaDeductionMode === 'fixed'
      ? tariffs.alphaFixedPerDay
      : Math.round(baseSalary / Math.max(1, tariffs.workingDaysPerMonth));
  const alphaDeduction = alphaDaysCount * perDayAlpha;

  const lateMinutesCount =
    typeof edits.lateMinutesOverride === 'number'
      ? Math.max(0, Math.round(edits.lateMinutesOverride))
      : attSummary.lateMinutes;
  const lateDeduction =
    tariffs.lateDeductionPerMinute > 0
      ? Math.round(lateMinutesCount * tariffs.lateDeductionPerMinute)
      : 0;

  const loanKasbonDeduction = Math.max(0, Math.round(edits.loanKasbonDeduction ?? 0));
  const otherDeduction = Math.max(0, Math.round(edits.otherDeduction ?? 0));

  const ptkpStatus = derivePtkpFromEmployee(employee);
  const rawPph21 =
    typeof overrides?.pph21Employee === 'number'
      ? Math.max(0, Math.round(overrides.pph21Employee))
      : tariffs.pph21Enabled
        ? calculateIndonesianPph21Ter(grossIncome, ptkpStatus).taxAmount
        : 0;

  const pph21Employee = tariffs.pph21Scheme === 'Gross' ? rawPph21 : 0;
  const pph21CompanySubsidy = tariffs.pph21Scheme === 'Nett (Ditanggung Perusahaan)' ? rawPph21 : 0;

  const totalDeductions =
    bpjsKesEmployee +
    bpjsTkJhtEmployee +
    bpjsTkJpEmployee +
    pph21Employee +
    alphaDeduction +
    lateDeduction +
    loanKasbonDeduction +
    otherDeduction;

  const takeHomePay = Math.max(0, grossIncome - totalDeductions);
  const totalCompanyCost =
    grossIncome +
    bpjsKesCompany +
    bpjsTkJhtCompany +
    bpjsTkJpCompany +
    bpjsTkJkkCompany +
    bpjsTkJkmCompany +
    pph21CompanySubsidy;

  return {
    id: buildSlipUniqueKey(period, employee.id),
    period,
    periodLabel: formatPayrollPeriodLabel(period),
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    position: employee.position,
    department: employee.department,
    employmentType: employee.employmentType,
    entityName: employee.entityName,
    placementName: employee.placementName ?? '-',
    placementArea: employee.placementArea ?? '-',
    ptkpStatus,
    npwpNumber: employee.npwpNumber || '-',
    bpjsKesehatanNumber: employee.bpjsKesehatanNumber || '-',
    bpjsKetenagakerjaanNumber: employee.bpjsKetenagakerjaanNumber || '-',
    bankName: employee.bankName,
    bankAccountNumber: employee.bankAccountNumber,
    bankAccountHolder: employee.bankAccountHolder,
    calculationSource,
    sourceFileName,
    baseSalarySourceTag: effectiveSourceTag,
    regionName: baseInfo.regionName,
    umrReference: baseInfo.umrReference,
    belowUmrWarning: effectiveBelowUmr,
    excelBaseMismatchWarning,
    employeeStatusAtCalculation: employee.status,
    settlementType,
    resignDate: employee.resignDate,
    prorataActiveDays,
    prorataTotalDays,
    fullBaseSalary: baseInfo.baseSalary,
    baseSalary,
    fixedAllowance,
    variableAllowance,
    overtimePay,
    incentiveBonus,
    pkwtCompensation,
    otherCompensation,
    grossIncome,
    bpjsKesEmployee,
    bpjsTkJhtEmployee,
    bpjsTkJpEmployee,
    pph21Employee,
    alphaDaysCount,
    alphaDeduction,
    lateMinutesCount,
    lateDeduction,
    loanKasbonDeduction,
    otherDeduction,
    totalDeductions,
    bpjsKesCompany,
    bpjsTkJhtCompany,
    bpjsTkJpCompany,
    bpjsTkJkkCompany,
    bpjsTkJkmCompany,
    pph21CompanySubsidy,
    totalCompanyCost,
    takeHomePay,
    status,
    pkwtContractClaimedNumber,
    notes: edits.notes,
    updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

/**
 * Anti-Double Upsert:
 * Guarantees 1 slip per (period, employeeId). Existing locked ('Disetujui') slips are immutable.
 */
export function upsertPayrollSlipsIdempotent(
  existingSlips: PayrollSlipRecord[],
  incomingSlips: PayrollSlipRecord[]
): PayrollSlipRecord[] {
  const slipMap = new Map<string, PayrollSlipRecord>();
  for (const s of existingSlips) {
    slipMap.set(buildSlipUniqueKey(s.period, s.employeeId), s);
  }
  for (const inc of incomingSlips) {
    const key = buildSlipUniqueKey(inc.period, inc.employeeId);
    const prev = slipMap.get(key);
    if (prev && prev.status === 'Disetujui') {
      continue; // Immutable locked period slip
    }
    slipMap.set(key, { ...inc, id: key });
  }
  return Array.from(slipMap.values());
}

export function summarizePayrollPeriodRun(
  period: string,
  slips: PayrollSlipRecord[],
  prevRun?: PayrollPeriodRun
): PayrollPeriodRun {
  const periodSlips = slips.filter((s) => s.period === period);
  const totalGross = periodSlips.reduce((sum, s) => sum + s.grossIncome, 0);
  const totalCompensation = periodSlips.reduce(
    (sum, s) => sum + s.pkwtCompensation + s.otherCompensation,
    0
  );
  const totalBpjsEmployee = periodSlips.reduce(
    (sum, s) => sum + s.bpjsKesEmployee + s.bpjsTkJhtEmployee + s.bpjsTkJpEmployee,
    0
  );
  const totalPph21 = periodSlips.reduce((sum, s) => sum + s.pph21Employee, 0);
  const totalDeductions = periodSlips.reduce((sum, s) => sum + s.totalDeductions, 0);
  const totalThp = periodSlips.reduce((sum, s) => sum + s.takeHomePay, 0);
  const totalCompanyCost = periodSlips.reduce((sum, s) => sum + s.totalCompanyCost, 0);

  const sources = Array.from(new Set(periodSlips.map((s) => s.calculationSource)));
  const status: PayrollRunStatus =
    prevRun?.status ?? (periodSlips[0]?.status ?? 'Draft');

  return {
    period,
    periodLabel: formatPayrollPeriodLabel(period),
    status,
    locked: status === 'Disetujui',
    submittedBy: prevRun?.submittedBy,
    submittedAt: prevRun?.submittedAt,
    approvedBy: prevRun?.approvedBy,
    approvedAt: prevRun?.approvedAt,
    rejectedReason: prevRun?.rejectedReason,
    approvalRequestId: prevRun?.approvalRequestId,
    totalEmployees: periodSlips.length,
    totalGross,
    totalCompensation,
    totalBpjsEmployee,
    totalPph21,
    totalDeductions,
    totalThp,
    totalCompanyCost,
    sourceSummary: sources.length > 0 ? sources.join(' + ') : 'Belum Dihitung',
  };
}

export function buildPayrollTemplateWorkbookBytes(params: {
  period: string;
  employees: EmployeeRecord[];
  entities: EntityRecord[];
  tariffs: PayrollTariffConfig;
  settledResignEmployeeIds?: string[];
}): Uint8Array {
  const { period, employees, entities, tariffs, settledResignEmployeeIds = [] } = params;
  const activeEmployees = employees.filter(
    (e) =>
      e.status === 'Aktif' ||
      e.status === 'Probation' ||
      (e.status === 'Resign' && !settledResignEmployeeIds.includes(e.id))
  );
  const rows = activeEmployees.map((emp) => {
    const baseInfo = resolveEmployeeBaseSalary(emp, entities, tariffs.regionalTiers);
    const prorata =
      emp.status === 'Resign'
        ? calculateResignProrataRatio(
            period,
            emp.resignDate,
            baseInfo.baseSalary,
            tariffs.workingDaysPerMonth
          )
        : null;
    return {
      Periode: period,
      NIK_Karyawan: emp.employeeCode,
      Nama_Karyawan: emp.fullName,
      Status_Karyawan: emp.status,
      Jenis_Settlement: emp.status === 'Resign' ? 'Final Settlement (Resign)' : 'Reguler',
      Unit_Atau_Klien: emp.entityName,
      Penempatan: emp.placementName || emp.placementArea || '-',
      Acuan_Wilayah_UMR: baseInfo.regionName,
      Base_Gaji: prorata ? prorata.proratedBaseSalary : baseInfo.baseSalary,
      Tunjangan_Tetap: 0,
      Tunjangan_Tidak_Tetap: 0,
      Lembur: 0,
      Insentif_Bonus: 0,
      Kompensasi_PKWT: 0,
      Kompensasi_Lain: 0,
      Potongan_Alpha_Hari: 0,
      Potongan_Kasbon_Lain: 0,
      Override_BPJS_Kes_Karyawan: '',
      Override_BPJS_TK_Karyawan: '',
      Override_PPh21: '',
      Catatan: prorata
        ? `Prorata Resign ${prorata.activeDays}/${prorata.totalDays} hari kerja (${emp.resignDate ?? ''})`
        : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Payroll');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}

export function buildPayrollRecapWorkbookBytes(
  slips: PayrollSlipRecord[],
  periodLabel: string
): Uint8Array {
  const recapRows = slips.map((s) => ({
    Periode: s.periodLabel,
    NIK_Karyawan: s.employeeCode,
    Nama_Lengkap: s.fullName,
    Jenis_Settlement: s.settlementType ?? 'Reguler',
    Unit_Klien: s.entityName,
    Penempatan: s.placementName,
    Sumber_Hitungan: s.calculationSource,
    Sumber_Base_Gaji: s.baseSalarySourceTag,
    Gaji_Pokok: s.baseSalary,
    Tunjangan_Tetap: s.fixedAllowance,
    Tunjangan_Variabel: s.variableAllowance,
    Lembur: s.overtimePay,
    Insentif_Bonus: s.incentiveBonus,
    Kompensasi_PKWT: s.pkwtCompensation,
    Kompensasi_Lain: s.otherCompensation,
    Total_Bruto: s.grossIncome,
    Pot_BPJS_Kes_1pct: s.bpjsKesEmployee,
    Pot_BPJS_JHT_2pct: s.bpjsTkJhtEmployee,
    Pot_BPJS_JP_1pct: s.bpjsTkJpEmployee,
    Pot_PPh21: s.pph21Employee,
    Pot_Alpha: s.alphaDeduction,
    Pot_Kasbon_Lain: s.loanKasbonDeduction + s.otherDeduction,
    Total_Potongan: s.totalDeductions,
    THP_Diterima_Bersih: s.takeHomePay,
    Iuran_Perusahaan_BPJS:
      s.bpjsKesCompany +
      s.bpjsTkJhtCompany +
      s.bpjsTkJpCompany +
      s.bpjsTkJkkCompany +
      s.bpjsTkJkmCompany,
    Total_Biaya_Perusahaan: s.totalCompanyCost,
    Status_Slip: s.status,
  }));

  const transferRows = slips.map((s, idx) => ({
    No: idx + 1,
    NIK_Karyawan: s.employeeCode,
    Nama_Penerima: s.bankAccountHolder || s.fullName,
    Bank: s.bankName,
    No_Rekening: s.bankAccountNumber,
    Nominal_Transfer_THP: s.takeHomePay,
    Keterangan: `Gaji ${periodLabel} - ${s.entityName}`,
    Status: s.status,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recapRows), 'Rekap_Payroll');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transferRows), 'Transfer_Bank');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}

function parseExcelNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
  const str = String(raw)
    .replace(/Rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '');
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? Math.round(num) : undefined;
}

function pickCell(row: Record<string, unknown>, keys: string[]): unknown {
  const normalizedMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    normalizedMap.set(k.trim().toLowerCase().replace(/[^a-z0-9]/g, ''), v);
  }
  for (const key of keys) {
    const found = normalizedMap.get(key.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (found !== undefined && found !== '') return found;
  }
  return undefined;
}

export function parseAndValidatePayrollExcel(params: {
  fileBytes: ArrayBuffer | Uint8Array;
  fileName: string;
  period: string;
  mode: ExcelImportMode;
  employees: EmployeeRecord[];
  entities: EntityRecord[];
  tariffs: PayrollTariffConfig;
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  settledResignEmployeeIds?: string[];
}): ExcelImportPreviewResult {
  const {
    fileBytes,
    fileName,
    period,
    mode,
    employees,
    entities,
    tariffs,
    attendanceLogs,
    leaveAbsences,
    settledResignEmployeeIds = [],
  } = params;

  const wb = XLSX.read(fileBytes, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = firstSheetName ? wb.Sheets[firstSheetName] : undefined;
  const rawRows = sheet
    ? (XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) ?? [])
    : [];

  const seenEmployeeKeys = new Map<string, number>();
  const stagingRows: ExcelStagingRow[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2; // Excel 1-indexed + header row
    const rawCode = String(
      pickCell(raw, ['NIK_Karyawan', 'NIK', 'Employee_Code', 'ID_Karyawan', 'Kode']) ?? ''
    ).trim();
    const rawName = String(
      pickCell(raw, ['Nama_Karyawan', 'Nama_Lengkap', 'Nama', 'Full_Name']) ?? ''
    ).trim();

    if (!rawCode && !rawName) return;

    const matchedEmployee = employees.find(
      (e) =>
        e.employeeCode.toLowerCase() === rawCode.toLowerCase() ||
        (rawName && e.fullName.toLowerCase() === rawName.toLowerCase())
    );

    if (!matchedEmployee) {
      stagingRows.push({
        rowNumber,
        rawCode: rawCode || '-',
        rawName: rawName || '-',
        status: 'error',
        message: `NIK / Nama "${rawCode || rawName}" tidak ditemukan di data karyawan PEVORA.`,
      });
      return;
    }

    if (matchedEmployee.status === 'Nonaktif') {
      stagingRows.push({
        rowNumber,
        rawCode,
        rawName,
        status: 'error',
        matchedEmployeeId: matchedEmployee.id,
        matchedEmployeeCode: matchedEmployee.employeeCode,
        matchedEmployeeName: matchedEmployee.fullName,
        message: `Karyawan ${matchedEmployee.employeeCode} berstatus Nonaktif — diblokir agar tidak dibayar ganda.`,
      });
      return;
    }

    if (
      matchedEmployee.status === 'Resign' &&
      settledResignEmployeeIds.includes(matchedEmployee.id)
    ) {
      stagingRows.push({
        rowNumber,
        rawCode,
        rawName,
        status: 'error',
        matchedEmployeeId: matchedEmployee.id,
        matchedEmployeeCode: matchedEmployee.employeeCode,
        matchedEmployeeName: matchedEmployee.fullName,
        message: `Karyawan Resign ${matchedEmployee.employeeCode} sudah menerima Final Settlement yang disetujui — diblokir (Anti-Double Settlement).`,
      });
      return;
    }

    // Anti-Double Layer 2: Detect duplicate NIK inside the same Excel file
    const firstSeenRow = seenEmployeeKeys.get(matchedEmployee.id);
    if (firstSeenRow !== undefined) {
      stagingRows.push({
        rowNumber,
        rawCode,
        rawName,
        status: 'duplicate',
        matchedEmployeeId: matchedEmployee.id,
        matchedEmployeeCode: matchedEmployee.employeeCode,
        matchedEmployeeName: matchedEmployee.fullName,
        message: `Duplikat NIK terdeteksi! ${matchedEmployee.employeeCode} (${matchedEmployee.fullName}) sudah muncul di baris ${firstSeenRow}. Baris ganda diblokir otomatis.`,
      });
      return;
    }
    seenEmployeeKeys.set(matchedEmployee.id, rowNumber);

    const rawMasterBase = resolveEmployeeBaseSalary(
      matchedEmployee,
      entities,
      tariffs.regionalTiers
    ).baseSalary;
    const masterBase =
      matchedEmployee.status === 'Resign'
        ? calculateResignProrataRatio(
            period,
            matchedEmployee.resignDate,
            rawMasterBase,
            tariffs.workingDaysPerMonth
          ).proratedBaseSalary
        : rawMasterBase;

    const excelBase = parseExcelNumber(
      pickCell(raw, ['Base_Gaji', 'Gaji_Pokok', 'Base_Salary'])
    );
    const fixedAllowance =
      parseExcelNumber(pickCell(raw, ['Tunjangan_Tetap', 'Fixed_Allowance'])) ?? 0;
    const variableAllowance =
      parseExcelNumber(
        pickCell(raw, ['Tunjangan_Tidak_Tetap', 'Tunjangan_Variabel', 'Variable_Allowance'])
      ) ?? 0;
    const overtimePay = parseExcelNumber(pickCell(raw, ['Lembur', 'Overtime'])) ?? 0;
    const incentiveBonus =
      parseExcelNumber(pickCell(raw, ['Insentif_Bonus', 'Insentif', 'Bonus'])) ?? 0;
    const pkwtCompensation =
      parseExcelNumber(pickCell(raw, ['Kompensasi_PKWT', 'Kompensasi'])) ?? 0;
    const otherCompensation =
      parseExcelNumber(pickCell(raw, ['Kompensasi_Lain', 'THR', 'Other_Compensation'])) ?? 0;
    const alphaDaysOverride = parseExcelNumber(
      pickCell(raw, ['Potongan_Alpha_Hari', 'Alpha_Hari', 'Alpha'])
    );
    const loanKasbonDeduction =
      parseExcelNumber(pickCell(raw, ['Potongan_Kasbon_Lain', 'Kasbon', 'Potongan_Lain'])) ?? 0;
    const notes = String(pickCell(raw, ['Catatan', 'Notes']) ?? '').trim();

    const overrideBpjsKes =
      mode === 'full-override'
        ? parseExcelNumber(
            pickCell(raw, ['Override_BPJS_Kes_Karyawan', 'Pot_BPJS_Kes_1pct', 'BPJS_Kes'])
          )
        : undefined;
    const overrideBpjsTk =
      mode === 'full-override'
        ? parseExcelNumber(
            pickCell(raw, ['Override_BPJS_TK_Karyawan', 'Pot_BPJS_JHT_2pct', 'BPJS_TK'])
          )
        : undefined;
    const overridePph21 =
      mode === 'full-override'
        ? parseExcelNumber(pickCell(raw, ['Override_PPh21', 'Pot_PPh21', 'PPh21']))
        : undefined;

    let mismatchWarning: string | undefined;
    if (typeof excelBase === 'number' && excelBase !== masterBase) {
      mismatchWarning =
        mode === 'full-override'
          ? `Base Gaji Excel (${formatRupiahDot(excelBase)}) berbeda dari Master (${formatRupiahDot(masterBase)}) — memakai angka Excel.`
          : `Base Gaji Excel (${formatRupiahDot(excelBase)}) berbeda dari Master (${formatRupiahDot(masterBase)}) — Mode Variabel tetap memakai Base Master.`;
    }

    const slip = computePayrollSlip({
      period,
      employee: matchedEmployee,
      entities,
      tariffs,
      attendanceLogs,
      leaveAbsences,
      calculationSource:
        mode === 'full-override'
          ? 'Import Excel (Override Final)'
          : 'Import Excel (Variabel)',
      sourceFileName: fileName,
      excelBaseMismatchWarning: mismatchWarning,
      edits: {
        baseSalaryOverride: mode === 'full-override' ? excelBase : undefined,
        fixedAllowance,
        variableAllowance,
        overtimePay,
        incentiveBonus,
        pkwtCompensation,
        otherCompensation,
        alphaDaysOverride,
        loanKasbonDeduction,
        notes: notes || undefined,
      },
      overrides:
        mode === 'full-override'
          ? {
              bpjsKesEmployee: overrideBpjsKes,
              bpjsTkEmployee: overrideBpjsTk,
              pph21Employee: overridePph21,
            }
          : undefined,
    });

    const resignWarningText =
      matchedEmployee.status === 'Resign'
        ? `Final Settlement karyawan Resign (${matchedEmployee.resignDate ?? 'tgl belum diisi'}) · THP ${formatRupiahDot(slip.takeHomePay)}`
        : '';

    const hasWarning = Boolean(
      mismatchWarning || slip.belowUmrWarning || matchedEmployee.status === 'Resign'
    );
    stagingRows.push({
      rowNumber,
      rawCode,
      rawName,
      status: hasWarning ? 'warning' : 'valid',
      message:
        mismatchWarning ||
        (slip.belowUmrWarning
          ? `Gaji (${formatRupiahDot(slip.baseSalary)}) di bawah UMR wilayah ${slip.regionName} (${formatRupiahDot(slip.umrReference)}).`
          : resignWarningText || `Siap diterapkan · THP ${formatRupiahDot(slip.takeHomePay)}`),
      matchedEmployeeId: matchedEmployee.id,
      matchedEmployeeCode: matchedEmployee.employeeCode,
      matchedEmployeeName: matchedEmployee.fullName,
      excelBaseSalary: excelBase,
      masterBaseSalary: masterBase,
      slip,
    });
  });

  return {
    fileName,
    mode,
    totalRows: stagingRows.length,
    validCount: stagingRows.filter((r) => r.status === 'valid').length,
    warningCount: stagingRows.filter((r) => r.status === 'warning').length,
    duplicateCount: stagingRows.filter((r) => r.status === 'duplicate').length,
    errorCount: stagingRows.filter((r) => r.status === 'error').length,
    rows: stagingRows,
  };
}
