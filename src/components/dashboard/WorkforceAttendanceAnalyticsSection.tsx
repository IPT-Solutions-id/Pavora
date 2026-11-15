import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AttendanceLogRecord,
  EmployeeRecord,
  EntityRecord,
  LeaveAbsenceRecord,
} from '../../data/masterAdminData';
import {
  OverviewPeriodMode,
  buildPlacementBreakdownAtPoint,
  buildWorkforceOverviewAnalytics,
  computeNiceZeroAxisScale,
} from '../../utils/overviewAnalytics';

interface WorkforceAttendanceAnalyticsSectionProps {
  entities: EntityRecord[];
  employees: EmployeeRecord[];
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences?: LeaveAbsenceRecord[];
  scopeTitle?: string;
}

const PERIOD_OPTIONS: Array<{ id: OverviewPeriodMode; label: string }> = [
  { id: 'daily', label: 'Per Hari' },
  { id: 'weekly', label: 'Per Minggu' },
  { id: 'monthly', label: 'Per Bulan' },
  { id: 'custom', label: 'Rentang Waktu' },
];

interface ChartCoord {
  x: number;
  y: number;
  value: number;
}

/**
 * Converts a sequence of points into a smooth SVG cubic bezier spline clamped strictly
 * inside [minY, maxY] so curves never dip below the 0 bottom baseline.
 */
function buildSmoothSplinePath(
  coords: ChartCoord[],
  minY = 0,
  maxY = Number.POSITIVE_INFINITY
): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  if (coords.length === 2) {
    return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)} L ${coords[1].x.toFixed(1)} ${coords[1].y.toFixed(1)}`;
  }

  const clampY = (y: number) => Math.max(minY, Math.min(maxY, y));
  const tension = 0.22;
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = clampY(p1.y + (p2.y - p0.y) * tension);
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = clampY(p2.y - (p3.y - p1.y) * tension);

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

interface SeriesLineItem {
  id: string;
  label: string;
  color: string;
  values: number[];
  headcounts: number[];
  isPrimary?: boolean;
}

export const WorkforceAttendanceAnalyticsSection: React.FC<
  WorkforceAttendanceAnalyticsSectionProps
> = ({
  entities,
  employees,
  attendanceLogs,
  leaveAbsences = [],
  scopeTitle = 'Seluruh Unit & Klien',
}) => {
  const [periodMode, setPeriodMode] = useState<OverviewPeriodMode>('monthly');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-11-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-11-14');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  // Option 1: toggle off 'Keseluruhan' by default so individual units & clients start at 0, fill 100% chart height, and cross clearly
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<Record<string, boolean>>({ all: true });

  const analytics = useMemo(
    () =>
      buildWorkforceOverviewAnalytics({
        mode: periodMode,
        customStartDate,
        customEndDate,
        referenceIsoDate: '2026-11-14',
        entities,
        employees,
        attendanceLogs,
        leaveAbsences,
      }),
    [periodMode, customStartDate, customEndDate, entities, employees, attendanceLogs, leaveAbsences]
  );

  // Reset selected point to the latest point when period length changes
  useEffect(() => {
    setSelectedPointIndex(null);
  }, [periodMode, customStartDate, customEndDate]);

  const activeInternalUnits = entities.filter(
    (e) => e.status === 'Aktif' && e.category === 'Internal'
  );
  const hasInternal = activeInternalUnits.length > 0 || analytics.currentInternal > 0;

  // Build unified list of zero-anchored crossover curves + actual headcounts
  const allSeries: SeriesLineItem[] = useMemo(() => {
    const items: SeriesLineItem[] = [
      {
        id: 'all',
        label: 'Keseluruhan',
        color: '#102B69',
        values: analytics.points.map((p) => p.totalGrowth),
        headcounts: analytics.points.map((p) => p.totalCount),
        isPrimary: true,
      },
    ];
    if (hasInternal) {
      items.push({
        id: 'internal',
        label: 'Internal',
        color: '#0891B2',
        values: analytics.points.map((p) => p.internalGrowth),
        headcounts: analytics.points.map((p) => p.internalCount),
      });
    }
    analytics.clientSeries.forEach((client) => {
      items.push({
        id: client.id,
        label: client.shortName,
        color: client.color,
        values: client.growthValues,
        headcounts: client.values,
      });
    });
    return items;
  }, [analytics, hasInternal]);

  const visibleSeries = useMemo(() => {
    const filtered = allSeries.filter((s) => !hiddenSeriesIds[s.id]);
    return filtered.length > 0 ? filtered : [allSeries[0]].filter(Boolean);
  }, [allSeries, hiddenSeriesIds]);

  const toggleSeries = (id: string) => {
    setHiddenSeriesIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const remaining = allSeries.filter((s) => !next[s.id]);
      if (remaining.length === 0) return prev; // Keep at least 1 series visible
      return next;
    });
  };

  const pointsCount = analytics.points.length;
  const activeIdx =
    selectedPointIndex !== null && selectedPointIndex >= 0 && selectedPointIndex < pointsCount
      ? selectedPointIndex
      : Math.max(0, pointsCount - 1);

  const activePoint = analytics.points[activeIdx];
  const [expandedPlacementId, setExpandedPlacementId] = useState<string | null>(null);

  const placementBreakdown = useMemo(
    () =>
      buildPlacementBreakdownAtPoint({
        analytics,
        pointIndex: activeIdx,
        entities,
        employees,
        hasInternal,
      }),
    [analytics, activeIdx, entities, employees, hasInternal]
  );

  const effectiveExpandedId = useMemo(() => {
    if (expandedPlacementId === 'NONE') return null;
    if (expandedPlacementId === 'ALL') return 'ALL';
    if (expandedPlacementId && placementBreakdown.some((p) => p.id === expandedPlacementId)) {
      return expandedPlacementId;
    }
    return placementBreakdown[0]?.id ?? null;
  }, [expandedPlacementId, placementBreakdown]);

  const totalPositionsCount = useMemo(
    () => placementBreakdown.reduce((sum, item) => sum + item.positions.length, 0),
    [placementBreakdown]
  );

  // SVG chart dimensions & strict zero-based nice Y-scale
  const svgWidth = 720;
  const svgHeight = 250;
  const padLeft = 42;
  const padRight = 40;
  const padTop = 26;
  const padBottom = 38;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const bottomY = padTop + plotHeight;

  const visibleValues = visibleSeries.flatMap((s) => s.values);
  const rawMax = visibleValues.length > 0 ? Math.max(...visibleValues) : 8;
  const axisScale = computeNiceZeroAxisScale(rawMax, 4);
  const yMin = axisScale.yMin;
  const ySpan = Math.max(1, axisScale.yMax - yMin);

  const xForIndex = (idx: number) =>
    pointsCount <= 1
      ? padLeft + plotWidth / 2
      : padLeft + (idx / (pointsCount - 1)) * plotWidth;

  const yForValue = (val: number) =>
    bottomY - ((Math.max(0, val) - yMin) / ySpan) * plotHeight;

  const gridTicks = axisScale.ticks.map((val) => ({
    value: val,
    y: yForValue(val),
    label: val === 0 ? '0' : `+${val}`,
  }));

  const { attendanceCards } = analytics;
  const firstAlpha = attendanceCards.alphaHighlights[0];
  const izinSakitSummaryNames = attendanceCards.izinSakitHighlights
    .slice(0, 2)
    .map((i) => i.employeeName)
    .join(', ');
  const cutiSummaryNames = attendanceCards.cutiHighlights
    .slice(0, 2)
    .map((i) => i.employeeName)
    .join(', ');

  const activeInternalShare =
    activePoint && activePoint.totalCount > 0
      ? Math.round((activePoint.internalCount / activePoint.totalCount) * 100)
      : 0;
  const activeClientShare = activePoint ? 100 - activeInternalShare : 0;

  return (
    <div className="space-y-6">
      {/* Row 2 (Above Chart): Pantauan Absensi — 4 Plain White Cards (Hadir, Izin / Sakit, Cuti, Alpha) + Periode Dropdown */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#102B69]">
              Pantauan Absensi ({attendanceCards.periodTitle})
            </h2>
            <p className="text-xs text-[#64748B] tabular-nums">
              Disiplin tepat waktu:{' '}
              <strong className="text-[#16A36A]">{attendanceCards.onTimeRatePercent}%</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B]">
              <span>Periode:</span>
              <select
                aria-label="Pilih periode waktu"
                value={periodMode}
                onChange={(e) => setPeriodMode(e.target.value as OverviewPeriodMode)}
                className="px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-white border border-[#CBD5E1] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {periodMode === 'custom' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  aria-label="Dari Tanggal"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[4px] text-[#102B69] focus:outline-none focus:border-[#1468E8]"
                />
                <span className="text-xs text-[#64748B]">–</span>
                <input
                  type="date"
                  aria-label="Sampai Tanggal"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] rounded-[4px] text-[#102B69] focus:outline-none focus:border-[#1468E8]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
            <p className="text-xs font-semibold text-[#64748B] mb-1">Hadir</p>
            <p className="text-2xl font-extrabold text-[#16A36A] tabular-nums">
              {attendanceCards.totalHadir}{' '}
              {periodMode === 'daily' ? 'Orang' : 'Kehadiran'}
            </p>
            <p className="text-xs text-[#64748B] mt-1 tabular-nums truncate">
              {attendanceCards.hadirTepatWaktu} tepat waktu · {attendanceCards.karyawanTelat} telat (
              {attendanceCards.avgLateMinutes} mnt)
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
            <p className="text-xs font-semibold text-[#64748B] mb-1">Izin / Sakit</p>
            <p className="text-2xl font-extrabold text-[#B87D00] tabular-nums">
              {attendanceCards.izinSakit} {periodMode === 'daily' ? 'Orang' : 'Hari'}
            </p>
            <p className="text-xs text-[#64748B] mt-1 truncate">
              {izinSakitSummaryNames || 'Pengajuan izin & sakit resmi'}
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
            <p className="text-xs font-semibold text-[#64748B] mb-1">Cuti</p>
            <p className="text-2xl font-extrabold text-[#102B69] tabular-nums">
              {attendanceCards.cuti} {periodMode === 'daily' ? 'Orang' : 'Hari'}
            </p>
            <p className="text-xs text-[#64748B] mt-1 truncate">
              {cutiSummaryNames || 'Pengajuan cuti resmi'}
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
            <p className="text-xs font-semibold text-[#64748B] mb-1">Alpha</p>
            <p
              className={`text-2xl font-extrabold tabular-nums ${
                attendanceCards.alphaMangkir > 0 ? 'text-[#DC3545]' : 'text-[#16A36A]'
              }`}
            >
              {attendanceCards.alphaMangkir} {periodMode === 'daily' ? 'Orang' : 'Kasus'}
            </p>
            <p className="text-xs text-[#64748B] mt-1 tabular-nums truncate">
              {firstAlpha
                ? `${firstAlpha.employeeName} (${firstAlpha.entityName})`
                : `${attendanceCards.internalAlpha} internal · ${attendanceCards.clientAlpha} client`}
            </p>
          </div>
        </div>
      </div>

      {/* Row 3 (Below Attendance Cards): 1 Unified Interactive Smooth Line Chart Card (Left 8 cols) + Detail Card (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Cols: 1 Single Chart Card */}
        <section className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex flex-col justify-between">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">Tren Karyawan</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {scopeTitle} · {analytics.periodRangeLabel} · Semua garis mulai dari 0
              </p>
            </div>
            <span className="text-xs font-semibold text-[#64748B] tabular-nums shrink-0">
              {analytics.netGrowthCount >= 0
                ? `+${analytics.netGrowthCount}`
                : analytics.netGrowthCount}{' '}
              org ({analytics.netGrowthPercent >= 0 ? `+${analytics.netGrowthPercent}` : analytics.netGrowthPercent}%)
            </span>
          </div>

          {/* Interactive Multi-Color Series Legend Chips (Compact Single-Row Layout) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-2">
            {allSeries.map((series) => {
              const isHidden = Boolean(hiddenSeriesIds[series.id]);
              const headcountAtActive = series.headcounts[activeIdx] ?? 0;
              const growthAtActive = series.values[activeIdx] ?? 0;
              return (
                <button
                  key={series.id}
                  type="button"
                  onClick={() => toggleSeries(series.id)}
                  aria-pressed={!isHidden}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-[4px] border transition-all cursor-pointer ${
                    isHidden
                      ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] opacity-60'
                      : 'bg-white border-[#CBD5E1] text-[#172033] hover:border-[#102B69]'
                  }`}
                  title="Klik untuk tampilkan / sembunyikan garis ini"
                >
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{
                      backgroundColor: isHidden ? '#CBD5E1' : series.color,
                    }}
                  />
                  <span>{series.label}</span>
                  <span className="font-bold text-[#102B69] tabular-nums">
                    {headcountAtActive}
                  </span>
                  <span className="text-[10px] font-semibold text-[#0F9F6E] tabular-nums">
                    ({growthAtActive === 0 ? '0' : `+${growthAtActive}`})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Smooth Wavy Multi-Line SVG Canvas (Zero-Anchored Crossovers) */}
          <div className="w-full overflow-x-auto py-1">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full min-w-[440px] h-[245px]"
              role="img"
              aria-label="Grafik kurva tren pertumbuhan karyawan dari titik awal 0"
            >
              <defs>
                {visibleSeries.map((series) => (
                  <linearGradient
                    key={`grad-${series.id}`}
                    id={`grad-unified-${series.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={series.color} stopOpacity="0.14" />
                    <stop offset="100%" stopColor={series.color} stopOpacity="0.01" />
                  </linearGradient>
                ))}
              </defs>

              {/* Horizontal Grid Lines + Solid Zero Baseline */}
              {gridTicks.map((tick, idx) => {
                const isZeroLine = tick.value === 0;
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={tick.y}
                      x2={svgWidth - padRight}
                      y2={tick.y}
                      stroke={isZeroLine ? '#CBD5E1' : '#E2E8F0'}
                      strokeDasharray={isZeroLine ? undefined : '3 3'}
                      strokeWidth={isZeroLine ? '1.25' : '1'}
                    />
                    <text
                      x={padLeft - 8}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight={isZeroLine ? '700' : '500'}
                      fill={isZeroLine ? '#475569' : '#94A3B8'}
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              })}

              {/* Active Vertical Crosshair Line at Clicked Period */}
              {activePoint && (
                <line
                  x1={xForIndex(activeIdx)}
                  y1={padTop - 8}
                  x2={xForIndex(activeIdx)}
                  y2={bottomY}
                  stroke="#94A3B8"
                  strokeDasharray="4 3"
                  strokeWidth="1.25"
                />
              )}

              {/* Smooth Zero-Anchored Crossover Curves */}
              {(() => {
                const placedLabelYs: number[] = [];
                const showSingleAreaFill = visibleSeries.length === 1;
                const isLastActive = activeIdx === pointsCount - 1;
                const activeDotYs = visibleSeries.map((s) =>
                  yForValue(s.values[activeIdx] ?? 0)
                );

                return visibleSeries.map((series, sIdx) => {
                  const coords: ChartCoord[] = series.values.map((val, idx) => ({
                    x: xForIndex(idx),
                    y: yForValue(val),
                    value: val,
                  }));
                  const smoothPath = buildSmoothSplinePath(coords, padTop, bottomY);
                  const areaPath =
                    coords.length > 0 && showSingleAreaFill
                      ? `${smoothPath} L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${bottomY.toFixed(1)} Z`
                      : '';
                  const lineWidth = series.isPrimary ? 2.75 : 2.35;

                  return (
                    <g key={series.id}>
                      {areaPath && (
                        <path d={areaPath} fill={`url(#grad-unified-${series.id})`} />
                      )}
                      {/* Crisp white halo casing makes every crossover intersection distinct */}
                      <path
                        d={smoothPath}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeOpacity={0.92}
                        strokeWidth={lineWidth + 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={smoothPath}
                        fill="none"
                        stroke={series.color}
                        strokeWidth={lineWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {coords.map((c, idx) => {
                        const isActive = idx === activeIdx;
                        let showLabel = false;
                        let labelX = c.x;
                        let labelY = Math.max(padTop + 10, c.y - 10);
                        let anchor: 'start' | 'middle' = 'middle';

                        if (isActive && idx > 0) {
                          if (isLastActive) {
                            labelX = c.x + 8;
                            labelY = c.y + 3.5;
                            anchor = 'start';
                            const collides = placedLabelYs.some(
                              (prevY) => Math.abs(prevY - labelY) < 13
                            );
                            if (!collides) {
                              placedLabelYs.push(labelY);
                              showLabel = true;
                            }
                          } else {
                            const hitsOtherDot = activeDotYs.some(
                              (dotY, dotSeriesIdx) =>
                                dotSeriesIdx !== sIdx && Math.abs(dotY - labelY) < 13
                            );
                            const collidesLabel = placedLabelYs.some(
                              (prevY) => Math.abs(prevY - labelY) < 15
                            );
                            if (!hitsOtherDot && !collidesLabel) {
                              placedLabelYs.push(labelY);
                              showLabel = true;
                            }
                          }
                        }

                        return (
                          <g key={`${series.id}-pt-${idx}`}>
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r={isActive ? 5 : idx === 0 ? 3.75 : 3}
                              fill="#FFFFFF"
                              stroke={series.color}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                            {showLabel && (
                              <text
                                x={labelX}
                                y={labelY}
                                textAnchor={anchor}
                                fontSize="10.5"
                                fontWeight="800"
                                fill={series.color}
                                stroke="#FFFFFF"
                                strokeWidth="3"
                                paintOrder="stroke"
                              >
                                {c.value === 0 ? '0' : `+${c.value}`}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                });
              })()}

              {/* Shared Zero Baseline Origin Anchor Dot & Label */}
              {pointsCount > 0 && (
                <g pointerEvents="none">
                  <circle
                    cx={xForIndex(0)}
                    cy={bottomY}
                    r={4.25}
                    fill="#102B69"
                    stroke="#FFFFFF"
                    strokeWidth={1.75}
                  />
                  {activeIdx === 0 && (
                    <text
                      x={xForIndex(0) + 10}
                      y={bottomY - 8}
                      textAnchor="start"
                      fontSize="10.5"
                      fontWeight="800"
                      fill="#102B69"
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      0 (Awal)
                    </text>
                  )}
                </g>
              )}

              {/* X-Axis Labels + Generous Clickable Column Hit Zones */}
              {analytics.points.map((pt, idx) => {
                const cx = xForIndex(idx);
                const isActive = idx === activeIdx;
                const colWidth =
                  pointsCount <= 1 ? plotWidth : plotWidth / Math.max(1, pointsCount - 1);
                const hitX = Math.max(0, cx - colWidth / 2);

                return (
                  <g
                    key={pt.key}
                    onClick={() => setSelectedPointIndex(idx)}
                    className="outline-none focus:outline-none"
                    style={{ cursor: 'pointer', outline: 'none' }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Pilih periode ${pt.label} (${pt.totalCount} karyawan)`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPointIndex(idx);
                      }
                    }}
                  >
                    <rect
                      x={hitX}
                      y={padTop - 10}
                      width={colWidth}
                      height={plotHeight + 44}
                      fill="transparent"
                    />
                    {isActive && (
                      <rect
                        x={cx - 26}
                        y={svgHeight - 25}
                        width={52}
                        height={20}
                        rx={4}
                        fill="#EAF2FF"
                      />
                    )}
                    <text
                      x={cx}
                      y={svgHeight - 11}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight={isActive ? '800' : '500'}
                      fill={isActive ? '#102B69' : '#64748B'}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Right 4 Cols: Detail Card Beside the Chart Card (Updates Immediately on Point Click) */}
        <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex flex-col justify-between space-y-4">
          {activePoint && (
            <>
              <div className="space-y-3">
                {/* Header with Prev/Next Period Stepper */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#64748B]">Detail Periode</p>
                    <h3 className="text-sm font-bold text-[#102B69] truncate">
                      {activePoint.label} · {activePoint.subLabel}
                    </h3>
                  </div>

                  <div className="inline-flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={activeIdx <= 0}
                      onClick={() => setSelectedPointIndex(Math.max(0, activeIdx - 1))}
                      aria-label="Periode sebelumnya"
                      className="p-1.5 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={activeIdx >= pointsCount - 1}
                      onClick={() =>
                        setSelectedPointIndex(Math.min(pointsCount - 1, activeIdx + 1))
                      }
                      aria-label="Periode berikutnya"
                      className="p-1.5 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Overall Total at Clicked Point */}
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">Karyawan Keseluruhan</p>
                  <div className="flex items-baseline justify-between gap-2 mt-0.5">
                    <p className="text-2xl font-extrabold text-[#102B69] tabular-nums">
                      {activePoint.totalCount} Orang
                    </p>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        activePoint.deltaFromPrev >= 0 ? 'text-[#0F9F6E]' : 'text-[#DC3545]'
                      }`}
                    >
                      {activePoint.deltaFromPrev >= 0
                        ? `+${activePoint.deltaFromPrev}`
                        : activePoint.deltaFromPrev}{' '}
                      org
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                    Internal {activeInternalShare}% · Client {activeClientShare}% ·{' '}
                    {totalPositionsCount} posisi aktif
                  </p>
                </div>

                {/* Merged Distribution + Position Breakdown per Placement */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#64748B]">
                      Sebaran Penempatan &amp; Posisi
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPlacementId((prev) => (prev === 'ALL' ? 'NONE' : 'ALL'))
                      }
                      className="text-[11px] font-semibold text-[#1468E8] hover:text-[#102B69] cursor-pointer"
                    >
                      {effectiveExpandedId === 'ALL' ? 'Ringkas Posisi' : 'Semua Posisi'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {placementBreakdown.map((item) => {
                      const isExpanded =
                        effectiveExpandedId === 'ALL' || effectiveExpandedId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="border border-[#E2E8F0] rounded-[4px] p-2.5 bg-[#F8FAFC]/60"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPlacementId(isExpanded && effectiveExpandedId !== 'ALL' ? 'NONE' : item.id)
                            }
                            aria-expanded={isExpanded}
                            className="w-full text-left cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="inline-flex items-center gap-2 text-[#172033] font-semibold truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="truncate">{item.label}</span>
                                <span className="text-[10px] font-normal text-[#64748B] shrink-0">
                                  · {item.positions.length} posisi
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1 tabular-nums font-bold text-[#102B69] shrink-0">
                                <span>{item.count} org</span>
                                {item.deltaFromPrev !== null && (
                                  <span
                                    className={`font-normal ${
                                      item.deltaFromPrev >= 0
                                        ? 'text-[#0F9F6E]'
                                        : 'text-[#DC3545]'
                                    }`}
                                  >
                                    (
                                    {item.deltaFromPrev >= 0
                                      ? `+${item.deltaFromPrev}`
                                      : item.deltaFromPrev}
                                    )
                                  </span>
                                )}
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </span>
                            </div>

                            {/* Distribution Bar merged from old Sebaran Karyawan card */}
                            <div className="mt-1.5 w-full h-1.5 bg-white border border-[#E2E8F0] rounded-[2px] overflow-hidden">
                              <div
                                className="h-full rounded-[1px] transition-all duration-200"
                                style={{
                                  width: `${item.shareOfMaxPercent}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </button>

                          {isExpanded && item.positions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#E2E8F0] space-y-1">
                              {item.positions.map((pos) => (
                                <div
                                  key={pos.id}
                                  className="flex items-center justify-between gap-2 text-[11px] text-[#475569]"
                                >
                                  <span className="truncate" title={`${pos.title} (${pos.unitOrDept})`}>
                                    • {pos.title}
                                  </span>
                                  <span className="font-semibold text-[#102B69] tabular-nums shrink-0">
                                    {pos.count} org
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Mutation Summary on Selected Period */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] tabular-nums">
                <span>
                  Masuk: <strong className="text-[#0F9F6E]">+{activePoint.newHires} org</strong>
                </span>
                <span>
                  Selesai Kontrak:{' '}
                  <strong className="text-[#102B69]">{activePoint.exits} org</strong>
                </span>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
