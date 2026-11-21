import {
  AttendanceLogRecord,
  EmployeeRecord,
  EntityRecord,
  LeaveAbsenceRecord,
} from '../data/masterAdminData';

export type OverviewPeriodMode = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface HeadcountPeriodPoint {
  key: string;
  label: string;
  subLabel: string;
  isoDateStart: string;
  isoDateEnd: string;
  internalCount: number;
  clientCount: number;
  totalCount: number;
  internalGrowth: number;
  clientGrowth: number;
  totalGrowth: number;
  newHires: number;
  exits: number;
  deltaFromPrev: number;
}

export interface PlacementPositionItem {
  id: string;
  title: string;
  unitOrDept: string;
  count: number;
}

export interface PlacementPeriodBreakdown {
  id: string;
  label: string;
  fullName: string;
  category: 'Internal' | 'Klien Penempatan';
  color: string;
  count: number;
  prevCount: number | null;
  deltaFromPrev: number | null;
  shareOfMaxPercent: number;
  shareOfTotalPercent: number;
  positions: PlacementPositionItem[];
}

export interface ClientTrendSeries {
  id: string;
  code: string;
  name: string;
  shortName: string;
  color: string;
  currentCount: number;
  quota: number;
  deltaInRange: number;
  values: number[];
  growthValues: number[];
}

export interface AttendanceIssueHighlight {
  id: string;
  employeeCode: string;
  employeeName: string;
  entityName: string;
  employmentType: 'Internal' | 'Penempatan Klien';
  dateLabel: string;
  status: 'Hadir' | 'Telat' | 'Cuti' | 'Izin' | 'Alpha';
  detailLabel: string;
  lateMinutes?: number;
}

export interface AttendanceCardsSummary {
  periodTitle: string;
  daysCovered: number;
  totalHadir: number;
  hadirTepatWaktu: number;
  karyawanTelat: number;
  izinSakit: number;
  cuti: number;
  izinSakitCuti: number;
  alphaMangkir: number;
  totalRecords: number;
  onTimeRatePercent: number;
  avgLateMinutes: number;
  internalPresent: number;
  clientPresent: number;
  internalLate: number;
  clientLate: number;
  internalAlpha: number;
  clientAlpha: number;
  lateHighlights: AttendanceIssueHighlight[];
  izinSakitHighlights: AttendanceIssueHighlight[];
  cutiHighlights: AttendanceIssueHighlight[];
  izinHighlights: AttendanceIssueHighlight[];
  alphaHighlights: AttendanceIssueHighlight[];
}

export type LiveAttendanceStatus =
  | 'Hadir'
  | 'Telat'
  | 'Sakit'
  | 'Izin'
  | 'Cuti'
  | 'Alpha';

export interface LiveAttendanceEntry {
  id: string;
  employeeCode: string;
  employeeName: string;
  employmentType: 'Internal' | 'Penempatan Klien';
  entityName: string;
  dateLabel: string;
  checkIn: string;
  checkOut: string;
  liveStatus: LiveAttendanceStatus;
  lateMinutes: number;
  detectionReason: string;
  locationOrSource: string;
  notes: string;
  faceVerified?: boolean;
  faceMatchScore?: number;
}

export interface WorkforceOverviewAnalytics {
  mode: OverviewPeriodMode;
  periodRangeLabel: string;
  points: HeadcountPeriodPoint[];
  clientSeries: ClientTrendSeries[];
  currentTotal: number;
  currentInternal: number;
  currentClient: number;
  internalSharePercent: number;
  clientSharePercent: number;
  netGrowthCount: number;
  netGrowthPercent: number;
  totalNewHiresInRange: number;
  totalExitsInRange: number;
  attendanceCards: AttendanceCardsSummary;
}

const ID_SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const ID_SHORT_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const CLIENT_LINE_PALETTE = [
  '#1468E8', // Cobalt Blue
  '#16A34A', // Emerald Green
  '#D97706', // Amber Orange
  '#7C3AED', // Violet
  '#DC3545', // Crimson
  '#DB2777', // Magenta / Pink
  '#4F46E5', // Indigo
  '#65A30D', // Lime Green
];

export function getClientSeriesColor(index: number): string {
  if (index < CLIENT_LINE_PALETTE.length) {
    return CLIENT_LINE_PALETTE[index];
  }
  // Golden angle distribution in HSL for unlimited new clients
  const hue = (index * 137.508) % 360;
  return `hsl(${Math.round(hue)}, 72%, 44%)`;
}

export interface ZeroAxisScale {
  yMin: number;
  yMax: number;
  step: number;
  ticks: number[];
}

/**
 * Computes a clean Y-axis scale anchored strictly at 0 with round integer step intervals
 * so all curves emerge evenly from the bottom baseline.
 */
export function computeNiceZeroAxisScale(rawMax: number, targetSteps = 4): ZeroAxisScale {
  const safeMax = Math.max(4, Math.ceil(rawMax));
  const roughStep = safeMax / Math.max(2, targetSteps);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let stepMultiplier = 10;
  if (normalized <= 1) stepMultiplier = 1;
  else if (normalized <= 2) stepMultiplier = 2;
  else if (normalized <= 5) stepMultiplier = 5;

  const step = Math.max(1, Math.round(stepMultiplier * magnitude));
  const tickCount = Math.max(2, Math.ceil(safeMax / step));
  const yMax = tickCount * step;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) {
    ticks.push(v);
  }

  return {
    yMin: 0,
    yMax,
    step,
    ticks,
  };
}

function getShortClientName(fullName: string): string {
  const dashSplit = fullName.split('—')[0]?.trim();
  if (dashSplit && dashSplit.length <= 24) return dashSplit;
  const hyphenSplit = fullName.split(' - ')[0]?.trim();
  if (hyphenSplit && hyphenSplit.length <= 24) return hyphenSplit;
  return fullName.length > 22 ? `${fullName.slice(0, 20)}…` : fullName;
}

function parseIsoDateUTC(iso: string): Date {
  const clean = iso.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!match) {
    return new Date('2026-11-14T00:00:00Z');
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
}

function toIsoDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatShortDayMonth(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = ID_SHORT_MONTHS[date.getUTCMonth()] ?? '';
  return `${d} ${m}`;
}

function formatShortDayMonthYear(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = ID_SHORT_MONTHS[date.getUTCMonth()] ?? '';
  const y = date.getUTCFullYear();
  return `${d} ${m} ${y}`;
}

/**
 * Computes current active internal & client baselines from entities (or employees fallback).
 */
export function resolveCurrentWorkforceBaseline(
  entities: EntityRecord[],
  employees: EmployeeRecord[]
): { internalCount: number; clientCount: number; totalCount: number } {
  const activeEntities = entities.filter((e) => e.status === 'Aktif');
  if (activeEntities.length > 0) {
    const internalCount = activeEntities
      .filter((e) => e.category === 'Internal')
      .reduce((sum, item) => sum + item.employeeCount, 0);
    const clientCount = activeEntities
      .filter((e) => e.category === 'Klien Penempatan')
      .reduce((sum, item) => sum + item.employeeCount, 0);
    return {
      internalCount,
      clientCount,
      totalCount: internalCount + clientCount,
    };
  }

  const activeEmployees = employees.filter(
    (e) => e.status !== 'Nonaktif' && e.status !== 'Resign'
  );
  const internalCount = activeEmployees.filter((e) => e.employmentType === 'Internal').length;
  const clientCount = activeEmployees.filter((e) => e.employmentType === 'Penempatan Klien').length;
  return {
    internalCount,
    clientCount,
    totalCount: internalCount + clientCount,
  };
}

const CROSSOVER_WAVE_PATTERNS: number[][] = [
  [0, 0.3, 0.6, 0.45, 0.8, 1],
  [0, 0.5, 0.32, 0.77, 0.68, 1],
  [0, 0.17, 0.56, 0.83, 0.67, 1],
  [0, 0.25, 0.69, 0.44, 0.94, 1],
  [0, 0.62, 0.4, 0.88, 0.55, 1],
  [0, 0.12, 0.45, 0.95, 0.78, 1],
];

function sampleNormalizedWave(patternIdx: number, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const pattern = CROSSOVER_WAVE_PATTERNS[patternIdx % CROSSOVER_WAVE_PATTERNS.length];
  const scaled = t * (pattern.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(pattern.length - 1, lo + 1);
  const frac = scaled - lo;
  return pattern[lo] + (pattern[hi] - pattern[lo]) * frac;
}

function computeTargetGrowth(
  liveCount: number,
  stepScale: 'daily' | 'weekly' | 'monthly',
  variantIdx: number
): number {
  if (liveCount <= 1) return 0;
  const rateByVariant = [0.141, 0.204, 0.231, 0.174, 0.188, 0.162];
  const baseRate = rateByVariant[variantIdx % rateByVariant.length];
  const scaleFactor =
    stepScale === 'daily' ? 0.36 : stepScale === 'weekly' ? 0.62 : 1;
  const rawGrowth = Math.max(2, Math.round(liveCount * baseRate * scaleFactor));
  return Math.min(liveCount - 1, rawGrowth);
}

/**
 * Generates dynamic per-client time-series lines anchored to each active client entity's
 * live employeeCount, with normalized growthValues starting strictly at 0 and realistic
 * phase-shifted waves so client lines naturally cross over one another ("saling melewati").
 */
function buildDynamicClientSeries(
  activeClients: EntityRecord[],
  buckets: Array<{ stepScale: 'daily' | 'weekly' | 'monthly' }>
): ClientTrendSeries[] {
  const totalBuckets = buckets.length;
  if (totalBuckets === 0) return [];

  const dominantScale = buckets[totalBuckets - 1]?.stepScale ?? 'monthly';

  return activeClients.map((client, clientIdx) => {
    const liveCount = Math.max(0, client.employeeCount);
    const color = getClientSeriesColor(clientIdx);

    if (liveCount === 0) {
      const zeros = buckets.map(() => 0);
      return {
        id: client.id,
        code: client.code,
        name: client.name,
        shortName: getShortClientName(client.name),
        color,
        currentCount: 0,
        quota: client.headcountQuota ?? 0,
        deltaInRange: 0,
        values: zeros,
        growthValues: zeros,
      };
    }

    const targetGrowth = computeTargetGrowth(liveCount, dominantScale, clientIdx);
    const startCount = Math.max(1, liveCount - targetGrowth);

    const values = buckets.map((_, idx) => {
      if (idx === 0) return startCount;
      if (idx === totalBuckets - 1) return liveCount;
      const t = totalBuckets <= 1 ? 1 : idx / (totalBuckets - 1);
      const progress = sampleNormalizedWave(clientIdx, t);
      return Math.min(liveCount, Math.max(startCount, Math.round(startCount + targetGrowth * progress)));
    });

    const firstVal = values[0] ?? startCount;
    const growthValues = values.map((v) => Math.max(0, v - firstVal));

    return {
      id: client.id,
      code: client.code,
      name: client.name,
      shortName: getShortClientName(client.name),
      color,
      currentCount: liveCount,
      quota: client.headcountQuota ?? liveCount,
      deltaInRange: (values[values.length - 1] ?? liveCount) - firstVal,
      values,
      growthValues,
    };
  });
}

function buildHeadcountPointsForBuckets(
  buckets: Array<{
    key: string;
    label: string;
    subLabel: string;
    isoDateStart: string;
    isoDateEnd: string;
    stepScale: 'daily' | 'weekly' | 'monthly';
  }>,
  baseInternal: number,
  baseClientFallback: number,
  clientSeries: ClientTrendSeries[]
): HeadcountPeriodPoint[] {
  const totalBuckets = buckets.length;
  if (totalBuckets === 0) return [];

  const dominantScale = buckets[totalBuckets - 1]?.stepScale ?? 'monthly';
  const internalTargetGrowth = computeTargetGrowth(baseInternal, dominantScale, 3);
  const internalStart = Math.max(baseInternal > 0 ? 1 : 0, baseInternal - internalTargetGrowth);

  const clientFallbackGrowth = computeTargetGrowth(baseClientFallback, dominantScale, 1);
  const clientFallbackStart = Math.max(
    baseClientFallback > 0 ? 1 : 0,
    baseClientFallback - clientFallbackGrowth
  );

  const rawPoints = buckets.map((bucket, idx) => {
    const t = totalBuckets <= 1 ? 1 : idx / (totalBuckets - 1);
    const internalCount =
      baseInternal === 0
        ? 0
        : idx === 0
        ? internalStart
        : idx === totalBuckets - 1
        ? baseInternal
        : Math.round(internalStart + internalTargetGrowth * sampleNormalizedWave(3, t));

    const summedClientsAtIdx =
      clientSeries.length > 0
        ? clientSeries.reduce((sum, series) => sum + (series.values[idx] ?? 0), 0)
        : baseClientFallback === 0
        ? 0
        : idx === 0
        ? clientFallbackStart
        : idx === totalBuckets - 1
        ? baseClientFallback
        : Math.round(clientFallbackStart + clientFallbackGrowth * sampleNormalizedWave(1, t));

    return {
      ...bucket,
      internalCount,
      clientCount: summedClientsAtIdx,
      totalCount: internalCount + summedClientsAtIdx,
    };
  });

  const firstInternal = rawPoints[0]?.internalCount ?? baseInternal;
  const firstClient = rawPoints[0]?.clientCount ?? baseClientFallback;
  const firstTotal = rawPoints[0]?.totalCount ?? baseInternal + baseClientFallback;

  return rawPoints.map((pt, idx) => {
    const prevTotal = idx > 0 ? rawPoints[idx - 1].totalCount : pt.totalCount;
    const deltaFromPrev = pt.totalCount - prevTotal;

    const baseExits =
      pt.stepScale === 'daily'
        ? 1 + (idx % 2)
        : pt.stepScale === 'weekly'
        ? 2 + (idx % 3)
        : 4 + (idx % 4);
    const exits = deltaFromPrev < 0 ? baseExits + Math.abs(deltaFromPrev) : baseExits;
    const newHires =
      idx === 0
        ? baseExits + (pt.stepScale === 'daily' ? 2 : pt.stepScale === 'weekly' ? 4 : 7)
        : Math.max(1, deltaFromPrev + exits);

    return {
      key: pt.key,
      label: pt.label,
      subLabel: pt.subLabel,
      isoDateStart: pt.isoDateStart,
      isoDateEnd: pt.isoDateEnd,
      internalCount: pt.internalCount,
      clientCount: pt.clientCount,
      totalCount: pt.totalCount,
      internalGrowth: Math.max(0, pt.internalCount - firstInternal),
      clientGrowth: Math.max(0, pt.clientCount - firstClient),
      totalGrowth: Math.max(0, pt.totalCount - firstTotal),
      newHires,
      exits,
      deltaFromPrev: idx === 0 ? newHires - exits : deltaFromPrev,
    };
  });
}

export function buildWorkforceOverviewAnalytics(params: {
  mode: OverviewPeriodMode;
  customStartDate?: string;
  customEndDate?: string;
  referenceIsoDate?: string;
  entities: EntityRecord[];
  employees: EmployeeRecord[];
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences?: LeaveAbsenceRecord[];
}): WorkforceOverviewAnalytics {
  const {
    mode,
    customStartDate = '2026-11-01',
    customEndDate = '2026-11-14',
    referenceIsoDate = '2026-11-14',
    entities,
    employees,
    attendanceLogs,
    leaveAbsences = [],
  } = params;

  const refDate = parseIsoDateUTC(referenceIsoDate);
  const { internalCount: baseInternal, clientCount: baseClient } =
    resolveCurrentWorkforceBaseline(entities, employees);

  const activeClients = entities.filter(
    (e) => e.status === 'Aktif' && e.category === 'Klien Penempatan'
  );

  const buckets: Array<{
    key: string;
    label: string;
    subLabel: string;
    isoDateStart: string;
    isoDateEnd: string;
    stepScale: 'daily' | 'weekly' | 'monthly';
  }> = [];
  let periodRangeLabel = '';
  let daysCovered = 1;

  if (mode === 'daily') {
    daysCovered = 7;
    const startDay = addDaysUTC(refDate, -6);
    periodRangeLabel = `${formatShortDayMonth(startDay)} – ${formatShortDayMonthYear(refDate)}`;
    for (let i = 6; i >= 0; i -= 1) {
      const d = addDaysUTC(refDate, -i);
      const iso = toIsoDateUTC(d);
      const dayName = ID_SHORT_DAYS[d.getUTCDay()] ?? '';
      buckets.push({
        key: `day-${iso}`,
        label: formatShortDayMonth(d),
        subLabel: i === 0 ? 'Hari Ini' : dayName,
        isoDateStart: iso,
        isoDateEnd: iso,
        stepScale: 'daily',
      });
    }
  } else if (mode === 'weekly') {
    daysCovered = 42;
    const earliest = addDaysUTC(refDate, -35);
    periodRangeLabel = `${formatShortDayMonth(earliest)} – ${formatShortDayMonthYear(refDate)}`;
    for (let w = 5; w >= 0; w -= 1) {
      const endW = addDaysUTC(refDate, -w * 7);
      const startW = addDaysUTC(endW, -6);
      buckets.push({
        key: `week-${w}`,
        label: w === 0 ? 'Minggu Ini' : `Mgg -${w}`,
        subLabel: `${formatShortDayMonth(startW)}–${formatShortDayMonth(endW)}`,
        isoDateStart: toIsoDateUTC(startW),
        isoDateEnd: toIsoDateUTC(endW),
        stepScale: 'weekly',
      });
    }
  } else if (mode === 'monthly') {
    daysCovered = 180;
    const refYear = refDate.getUTCFullYear();
    const refMonth = refDate.getUTCMonth();
    const firstMonthDate = new Date(Date.UTC(refYear, refMonth - 5, 1));
    periodRangeLabel = `${ID_SHORT_MONTHS[firstMonthDate.getUTCMonth()]} – ${ID_SHORT_MONTHS[refMonth]} ${refYear}`;

    for (let m = 5; m >= 0; m -= 1) {
      const mDate = new Date(Date.UTC(refYear, refMonth - m, 1));
      const mEnd = new Date(Date.UTC(mDate.getUTCFullYear(), mDate.getUTCMonth() + 1, 0));
      const mLabel = `${ID_SHORT_MONTHS[mDate.getUTCMonth()]} ${String(mDate.getUTCFullYear()).slice(-2)}`;
      buckets.push({
        key: `month-${mDate.getUTCFullYear()}-${mDate.getUTCMonth() + 1}`,
        label: mLabel,
        subLabel:
          m === 0
            ? 'Bulan Ini'
            : `${ID_SHORT_MONTHS[mDate.getUTCMonth()]} ${mDate.getUTCFullYear()}`,
        isoDateStart: toIsoDateUTC(mDate),
        isoDateEnd: toIsoDateUTC(mEnd),
        stepScale: 'monthly',
      });
    }
  } else {
    let startD = parseIsoDateUTC(customStartDate);
    let endD = parseIsoDateUTC(customEndDate);
    if (startD.getTime() > endD.getTime()) {
      const tmp = startD;
      startD = endD;
      endD = tmp;
    }
    const diffDays = Math.max(
      1,
      Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    daysCovered = diffDays;
    periodRangeLabel = `${formatShortDayMonthYear(startD)} – ${formatShortDayMonthYear(endD)} (${diffDays} Hari)`;

    const bucketCount = Math.min(7, Math.max(2, diffDays));
    const stepDays = Math.max(1, Math.floor(diffDays / bucketCount));

    for (let idx = 0; idx < bucketCount; idx += 1) {
      const bStart = addDaysUTC(startD, idx * stepDays);
      const bEnd =
        idx === bucketCount - 1 ? endD : addDaysUTC(startD, (idx + 1) * stepDays - 1);
      const stepScale: 'daily' | 'weekly' | 'monthly' =
        diffDays <= 14 ? 'daily' : diffDays <= 60 ? 'weekly' : 'monthly';
      buckets.push({
        key: `custom-${idx}`,
        label: formatShortDayMonth(bEnd),
        subLabel:
          toIsoDateUTC(bStart) === toIsoDateUTC(bEnd)
            ? ID_SHORT_DAYS[bEnd.getUTCDay()] ?? ''
            : `${formatShortDayMonth(bStart)}–${formatShortDayMonth(bEnd)}`,
        isoDateStart: toIsoDateUTC(bStart),
        isoDateEnd: toIsoDateUTC(bEnd),
        stepScale,
      });
    }
  }

  const clientSeries = buildDynamicClientSeries(activeClients, buckets);
  const points = buildHeadcountPointsForBuckets(
    buckets,
    baseInternal,
    baseClient,
    clientSeries
  );
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const currentTotal = lastPoint ? lastPoint.totalCount : baseInternal + baseClient;
  const currentInternal = lastPoint ? lastPoint.internalCount : baseInternal;
  const currentClient = lastPoint ? lastPoint.clientCount : baseClient;

  const internalSharePercent =
    currentTotal > 0 ? Math.round((currentInternal / currentTotal) * 100) : 0;
  const clientSharePercent = currentTotal > 0 ? 100 - internalSharePercent : 0;

  const netGrowthCount =
    firstPoint && lastPoint ? lastPoint.totalCount - firstPoint.totalCount : 0;
  const netGrowthPercent =
    firstPoint && firstPoint.totalCount > 0
      ? Number(((netGrowthCount / firstPoint.totalCount) * 100).toFixed(1))
      : 0;

  const totalNewHiresInRange = points.reduce((sum, p) => sum + p.newHires, 0);
  const totalExitsInRange = points.reduce((sum, p) => sum + p.exits, 0);

  const baseHadirLogs = attendanceLogs.filter((l) => l.status === 'Hadir');
  const baseTelatLogs = attendanceLogs.filter((l) => l.status === 'Telat');
  const baseIzinOnlyLogs = attendanceLogs.filter((l) => l.status === 'Izin');
  const baseCutiOnlyLogs = attendanceLogs.filter((l) => l.status === 'Cuti');
  const baseIzinCutiLogs = [...baseIzinOnlyLogs, ...baseCutiOnlyLogs];
  const baseAlphaLogs = attendanceLogs.filter((l) => l.status === 'Alpha');

  const periodMultiplier =
    mode === 'daily'
      ? 1
      : mode === 'weekly'
      ? 6
      : mode === 'monthly'
      ? 22
      : Math.max(1, Math.min(30, Math.round(daysCovered * 0.85)));

  const rawTelatCount = Math.max(baseTelatLogs.length, Math.round(currentTotal * 0.032));
  const rawIzinOnlyCount = Math.max(
    baseIzinOnlyLogs.length,
    leaveAbsences.filter((l) => l.type === 'Izin Sakit' || l.type === 'Izin Keperluan').length,
    Math.round(currentTotal * 0.014)
  );
  const rawCutiOnlyCount = Math.max(
    baseCutiOnlyLogs.length,
    leaveAbsences.filter((l) => l.type === 'Cuti Tahunan').length,
    Math.round(currentTotal * 0.01)
  );
  const rawAlphaCount = Math.max(baseAlphaLogs.length, Math.round(currentTotal * 0.008));

  const dailyTelat = baseTelatLogs.length > 0 ? rawTelatCount : 0;
  const dailyIzinSakit =
    baseIzinOnlyLogs.length > 0 || leaveAbsences.some((l) => l.type.startsWith('Izin'))
      ? rawIzinOnlyCount
      : 0;
  const dailyCuti =
    baseCutiOnlyLogs.length > 0 || leaveAbsences.some((l) => l.type === 'Cuti Tahunan')
      ? rawCutiOnlyCount
      : 0;
  const dailyAlpha = baseAlphaLogs.length > 0 ? rawAlphaCount : 0;
  const dailyHadir = Math.max(
    baseHadirLogs.length,
    currentTotal - dailyTelat - dailyIzinSakit - dailyCuti - dailyAlpha
  );

  const hadirTepatWaktu = mode === 'daily' ? dailyHadir : dailyHadir * periodMultiplier;
  const karyawanTelat =
    mode === 'daily'
      ? dailyTelat
      : Math.max(
          baseTelatLogs.length,
          Math.round(dailyTelat * (1 + (periodMultiplier - 1) * 0.45))
        );
  const totalHadir = hadirTepatWaktu + karyawanTelat;

  const izinSakit =
    mode === 'daily'
      ? dailyIzinSakit
      : Math.max(
          baseIzinOnlyLogs.length,
          Math.round(dailyIzinSakit * (1 + (periodMultiplier - 1) * 0.4))
        );
  const cuti =
    mode === 'daily'
      ? dailyCuti
      : Math.max(
          baseCutiOnlyLogs.length,
          Math.round(dailyCuti * (1 + (periodMultiplier - 1) * 0.4))
        );
  const izinSakitCuti = izinSakit + cuti;

  const alphaMangkir =
    mode === 'daily'
      ? dailyAlpha
      : Math.max(
          baseAlphaLogs.length,
          Math.round(dailyAlpha * (1 + (periodMultiplier - 1) * 0.35))
        );

  const totalRecords = Math.max(
    1,
    hadirTepatWaktu + karyawanTelat + izinSakitCuti + alphaMangkir
  );
  const onTimeRatePercent = Number(((hadirTepatWaktu / totalRecords) * 100).toFixed(1));

  const avgLateMinutes =
    baseTelatLogs.length > 0
      ? Math.round(
          baseTelatLogs.reduce((sum, item) => sum + (item.lateMinutes || 18), 0) /
            baseTelatLogs.length
        )
      : 19;

  const internalPresent = Math.round(totalHadir * (internalSharePercent / 100));
  const clientPresent = Math.max(0, totalHadir - internalPresent);

  const internalLate = Math.max(
    baseTelatLogs.filter((l) => l.employmentType === 'Internal').length,
    Math.round(karyawanTelat * (internalSharePercent / 100))
  );
  const clientLate = Math.max(0, karyawanTelat - internalLate);

  const internalAlpha = baseAlphaLogs.filter((l) => l.employmentType === 'Internal').length;
  const clientAlpha = Math.max(0, alphaMangkir - internalAlpha);

  const lateHighlights: AttendanceIssueHighlight[] = baseTelatLogs.map((l) => ({
    id: l.id,
    employeeCode: l.employeeCode,
    employeeName: l.employeeName,
    entityName: l.entityName,
    employmentType: l.employmentType,
    dateLabel: l.dateLabel,
    status: 'Telat',
    detailLabel: `Masuk ${l.checkIn} · Telat ${l.lateMinutes} mnt`,
    lateMinutes: l.lateMinutes,
  }));

  const izinSakitHighlights: AttendanceIssueHighlight[] = baseIzinOnlyLogs.map((l) => ({
    id: l.id,
    employeeCode: l.employeeCode,
    employeeName: l.employeeName,
    entityName: l.entityName,
    employmentType: l.employmentType,
    dateLabel: l.dateLabel,
    status: 'Izin',
    detailLabel: l.notes || 'Izin / Sakit terlampir',
  }));

  const cutiHighlights: AttendanceIssueHighlight[] = baseCutiOnlyLogs.map((l) => ({
    id: l.id,
    employeeCode: l.employeeCode,
    employeeName: l.employeeName,
    entityName: l.entityName,
    employmentType: l.employmentType,
    dateLabel: l.dateLabel,
    status: 'Cuti',
    detailLabel: l.notes || 'Cuti tahunan disetujui',
  }));

  const izinHighlights: AttendanceIssueHighlight[] = baseIzinCutiLogs.map((l) => ({
    id: l.id,
    employeeCode: l.employeeCode,
    employeeName: l.employeeName,
    entityName: l.entityName,
    employmentType: l.employmentType,
    dateLabel: l.dateLabel,
    status: l.status,
    detailLabel: `${l.status} · ${l.notes}`,
  }));

  const alphaHighlights: AttendanceIssueHighlight[] = baseAlphaLogs.map((l) => ({
    id: l.id,
    employeeCode: l.employeeCode,
    employeeName: l.employeeName,
    entityName: l.entityName,
    employmentType: l.employmentType,
    dateLabel: l.dateLabel,
    status: 'Alpha',
    detailLabel: l.notes || 'Tanpa keterangan',
  }));

  const periodTitle =
    mode === 'daily'
      ? 'Hari Ini'
      : mode === 'weekly'
      ? 'Mingguan'
      : mode === 'monthly'
      ? 'Bulanan'
      : `${daysCovered} Hari`;

  return {
    mode,
    periodRangeLabel,
    points,
    clientSeries,
    currentTotal,
    currentInternal,
    currentClient,
    internalSharePercent,
    clientSharePercent,
    netGrowthCount,
    netGrowthPercent,
    totalNewHiresInRange,
    totalExitsInRange,
    attendanceCards: {
      periodTitle,
      daysCovered,
      totalHadir,
      hadirTepatWaktu,
      karyawanTelat,
      izinSakit,
      cuti,
      izinSakitCuti,
      alphaMangkir,
      totalRecords,
      onTimeRatePercent,
      avgLateMinutes,
      internalPresent,
      clientPresent,
      internalLate,
      clientLate,
      internalAlpha,
      clientAlpha,
      lateHighlights,
      izinSakitHighlights,
      cutiHighlights,
      izinHighlights,
      alphaHighlights,
    },
  };
}

function distributeHeadcountAcrossPositions(
  rawTemplates: Array<{ id: string; title: string; unitOrDept: string; weight: number }>,
  targetTotal: number
): PlacementPositionItem[] {
  if (rawTemplates.length === 0 || targetTotal <= 0) {
    return rawTemplates.map((t) => ({
      id: t.id,
      title: t.title,
      unitOrDept: t.unitOrDept,
      count: 0,
    }));
  }

  const totalWeight = rawTemplates.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  const exactQuotas = rawTemplates.map((item) => {
    const exact = (Math.max(1, item.weight) / totalWeight) * targetTotal;
    const floored = Math.floor(exact);
    return {
      ...item,
      count: floored,
      remainder: exact - floored,
    };
  });

  let remaining = targetTotal - exactQuotas.reduce((sum, item) => sum + item.count, 0);
  const sortedByRemainder = [...exactQuotas].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < sortedByRemainder.length && remaining > 0; i += 1) {
    sortedByRemainder[i].count += 1;
    remaining -= 1;
  }

  const countById = new Map(sortedByRemainder.map((item) => [item.id, item.count]));
  return rawTemplates.map((item) => ({
    id: item.id,
    title: item.title,
    unitOrDept: item.unitOrDept,
    count: countById.get(item.id) ?? 0,
  }));
}

/**
 * Builds the merged placement & position distribution for a selected period point index,
 * combining the entity/client bar distribution with per-placement position headcounts.
 */
export function buildPlacementBreakdownAtPoint(params: {
  analytics: WorkforceOverviewAnalytics;
  pointIndex: number;
  entities: EntityRecord[];
  employees: EmployeeRecord[];
  hasInternal: boolean;
}): PlacementPeriodBreakdown[] {
  const { analytics, pointIndex, entities, employees, hasInternal } = params;
  const pointsCount = analytics.points.length;
  if (pointsCount === 0) return [];

  const safeIdx =
    pointIndex >= 0 && pointIndex < pointsCount ? pointIndex : Math.max(0, pointsCount - 1);
  const activePoint = analytics.points[safeIdx];
  const prevPoint = safeIdx > 0 ? analytics.points[safeIdx - 1] : null;
  if (!activePoint) return [];

  const activeEntities = entities.filter((e) => e.status === 'Aktif');
  const internalEntities = activeEntities.filter((e) => e.category === 'Internal');

  const rawItems: Array<Omit<PlacementPeriodBreakdown, 'shareOfMaxPercent' | 'shareOfTotalPercent'>> =
    [];

  if (hasInternal) {
    const internalTemplates: Array<{ id: string; title: string; unitOrDept: string; weight: number }> =
      [];
    internalEntities.forEach((ent) => {
      (ent.supportedPositions ?? []).forEach((pos) => {
        internalTemplates.push({
          id: `${ent.id}-${pos.id}`,
          title: pos.title,
          unitOrDept: ent.name,
          weight: Math.max(1, pos.quota ?? 1),
        });
      });
    });

    employees
      .filter(
        (emp) =>
          emp.status !== 'Nonaktif' &&
          emp.status !== 'Resign' &&
          emp.employmentType === 'Internal'
      )
      .forEach((emp) => {
        const exists = internalTemplates.some(
          (t) => t.title.toLowerCase() === emp.position.toLowerCase()
        );
        if (!exists && emp.position.trim()) {
          internalTemplates.push({
            id: `emp-int-${emp.id}`,
            title: emp.position,
            unitOrDept: emp.entityName || emp.department,
            weight: 6,
          });
        }
      });

    if (internalTemplates.length === 0) {
      internalTemplates.push({
        id: 'int-default-ops',
        title: 'Staf Operasional Internal',
        unitOrDept: 'Kantor Pusat Operasional',
        weight: Math.max(1, activePoint.internalCount),
      });
    }

    const prevCount = prevPoint ? prevPoint.internalCount : null;
    rawItems.push({
      id: 'internal',
      label: 'Karyawan Internal',
      fullName:
        internalEntities.map((e) => e.name).join(' · ') || 'Unit Internal Perusahaan',
      category: 'Internal',
      color: '#0891B2',
      count: activePoint.internalCount,
      prevCount,
      deltaFromPrev: prevCount !== null ? activePoint.internalCount - prevCount : null,
      positions: distributeHeadcountAcrossPositions(internalTemplates, activePoint.internalCount),
    });
  }

  analytics.clientSeries.forEach((client) => {
    const entityObj = activeEntities.find((e) => e.id === client.id || e.name === client.name);
    const clientTemplates: Array<{ id: string; title: string; unitOrDept: string; weight: number }> =
      [];

    (entityObj?.supportedPositions ?? []).forEach((pos) => {
      clientTemplates.push({
        id: `${client.id}-${pos.id}`,
        title: pos.title,
        unitOrDept: pos.department || client.shortName,
        weight: Math.max(1, pos.quota ?? 1),
      });
    });

    employees
      .filter(
        (emp) =>
          emp.status !== 'Nonaktif' &&
          emp.status !== 'Resign' &&
          emp.entityName.toLowerCase() === client.name.toLowerCase()
      )
      .forEach((emp) => {
        const exists = clientTemplates.some(
          (t) => t.title.toLowerCase() === emp.position.toLowerCase()
        );
        if (!exists && emp.position.trim()) {
          clientTemplates.push({
            id: `emp-cln-${emp.id}`,
            title: emp.position,
            unitOrDept: emp.department || client.shortName,
            weight: 8,
          });
        }
      });

    if (clientTemplates.length === 0) {
      clientTemplates.push({
        id: `${client.id}-default-pos`,
        title: 'Personel Operasional Penempatan',
        unitOrDept: entityObj?.city || client.shortName,
        weight: Math.max(1, client.currentCount),
      });
    }

    const countAtPoint = client.values[safeIdx] ?? client.currentCount;
    const prevCount = prevPoint ? client.values[safeIdx - 1] ?? countAtPoint : null;

    rawItems.push({
      id: client.id,
      label: client.shortName,
      fullName: client.name,
      category: 'Klien Penempatan',
      color: client.color,
      count: countAtPoint,
      prevCount,
      deltaFromPrev: prevCount !== null ? countAtPoint - prevCount : null,
      positions: distributeHeadcountAcrossPositions(clientTemplates, countAtPoint),
    });
  });

  const maxCount = Math.max(...rawItems.map((i) => i.count), 1);
  const totalCount = Math.max(activePoint.totalCount, 1);

  return rawItems.map((item) => ({
    ...item,
    shareOfMaxPercent: Math.round((item.count / maxCount) * 100),
    shareOfTotalPercent: Math.round((item.count / totalCount) * 100),
  }));
}

function isMedicalSakitReason(text: string): boolean {
  return /\b(sakit|dokter|klinik|puskesmas|rumah sakit|demam|medis|rawat)\b/i.test(text);
}

/**
 * Builds the live attendance feed by combining real-time check-in/out logs
 * with leave/sick absence records, separating Sakit and Izin distinctly.
 */
export function buildLiveAttendanceFeed(
  attendanceLogs: AttendanceLogRecord[],
  leaveAbsences: LeaveAbsenceRecord[] = []
): LiveAttendanceEntry[] {
  const entries: LiveAttendanceEntry[] = attendanceLogs.map((log) => {
    const combinedText = `${log.notes} ${log.locationUsed}`;

    if (log.status === 'Hadir') {
      return {
        id: log.id,
        employeeCode: log.employeeCode,
        employeeName: log.employeeName,
        employmentType: log.employmentType,
        entityName: log.entityName,
        dateLabel: log.dateLabel,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        liveStatus: 'Hadir',
        lateMinutes: 0,
        detectionReason: 'Check-in valid sesuai jadwal & toleransi',
        locationOrSource: log.locationUsed,
        notes: log.notes || 'Tepat waktu',
        faceVerified: log.faceVerified,
        faceMatchScore: log.faceMatchScore,
      };
    }

    if (log.status === 'Telat') {
      return {
        id: log.id,
        employeeCode: log.employeeCode,
        employeeName: log.employeeName,
        employmentType: log.employmentType,
        entityName: log.entityName,
        dateLabel: log.dateLabel,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        liveStatus: 'Telat',
        lateMinutes: log.lateMinutes,
        detectionReason: `Check-in melewati batas masuk (+${log.lateMinutes} menit)`,
        locationOrSource: log.locationUsed,
        notes: log.notes || `Terlambat ${log.lateMinutes} menit`,
        faceVerified: log.faceVerified,
        faceMatchScore: log.faceMatchScore,
      };
    }

    if (log.status === 'Cuti') {
      return {
        id: log.id,
        employeeCode: log.employeeCode,
        employeeName: log.employeeName,
        employmentType: log.employmentType,
        entityName: log.entityName,
        dateLabel: log.dateLabel,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        liveStatus: 'Cuti',
        lateMinutes: 0,
        detectionReason: 'Pengajuan cuti resmi disetujui',
        locationOrSource: log.locationUsed || 'Pengajuan cuti',
        notes: log.notes || 'Cuti terjadwal',
      };
    }

    if (log.status === 'Alpha') {
      return {
        id: log.id,
        employeeCode: log.employeeCode,
        employeeName: log.employeeName,
        employmentType: log.employmentType,
        entityName: log.entityName,
        dateLabel: log.dateLabel,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        liveStatus: 'Alpha',
        lateMinutes: 0,
        detectionReason: 'Tidak ada check-in & tanpa pengajuan izin/sakit/cuti',
        locationOrSource: log.locationUsed || 'Belum ada presensi',
        notes: log.notes || 'Tanpa keterangan',
      };
    }

    // Status === 'Izin': separate Sakit vs Izin Keperluan
    const matchingLeave = leaveAbsences.find(
      (lv) => lv.employeeCode.toLowerCase() === log.employeeCode.toLowerCase()
    );
    const isSakit =
      isMedicalSakitReason(combinedText) || matchingLeave?.type === 'Izin Sakit';

    if (isSakit) {
      return {
        id: log.id,
        employeeCode: log.employeeCode,
        employeeName: log.employeeName,
        employmentType: log.employmentType,
        entityName: log.entityName,
        dateLabel: log.dateLabel,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        liveStatus: 'Sakit',
        lateMinutes: 0,
        detectionReason: 'Keterangan sakit / surat dokter terlampir',
        locationOrSource: log.locationUsed || 'Surat keterangan sakit',
        notes: log.notes || 'Izin sakit',
      };
    }

    return {
      id: log.id,
      employeeCode: log.employeeCode,
      employeeName: log.employeeName,
      employmentType: log.employmentType,
      entityName: log.entityName,
      dateLabel: log.dateLabel,
      checkIn: log.checkIn,
      checkOut: log.checkOut,
      liveStatus: 'Izin',
      lateMinutes: 0,
      detectionReason: 'Izin keperluan pribadi / tugas terkonfirmasi',
      locationOrSource: log.locationUsed || 'Pengajuan izin',
      notes: log.notes || 'Izin keperluan',
    };
  });

  // Include active/submitted LeaveAbsence records (Izin Sakit / Izin Keperluan / Cuti) not yet in logs
  leaveAbsences.forEach((lv) => {
    if (lv.status === 'Ditolak' || lv.type === 'Alpha / Tanpa Keterangan') return;

    const mappedStatus: LiveAttendanceStatus =
      lv.type === 'Izin Sakit'
        ? 'Sakit'
        : lv.type === 'Izin Keperluan'
        ? 'Izin'
        : 'Cuti';

    const alreadyLoggedSameStatus = entries.some(
      (e) =>
        e.employeeCode.toLowerCase() === lv.employeeCode.toLowerCase() &&
        e.liveStatus === mappedStatus
    );
    if (alreadyLoggedSameStatus) return;

    entries.push({
      id: `live-${lv.id}`,
      employeeCode: lv.employeeCode,
      employeeName: lv.employeeName,
      employmentType: lv.employmentType,
      entityName: lv.entityName,
      dateLabel: lv.dateRange,
      checkIn: '—',
      checkOut: '—',
      liveStatus: mappedStatus,
      lateMinutes: 0,
      detectionReason:
        mappedStatus === 'Sakit'
          ? `Pengajuan Izin Sakit (${lv.status})`
          : mappedStatus === 'Izin'
          ? `Pengajuan Izin Keperluan (${lv.status})`
          : `Pengajuan Cuti (${lv.status})`,
      locationOrSource: `${lv.type} · ${lv.daysCount} hari`,
      notes: lv.reason,
    });
  });

  return entries;
}


