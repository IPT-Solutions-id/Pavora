export type ActivityGpsStatus = 'locked' | 'unavailable' | 'denied';

export interface ActivityCameraCaptureResult {
  fileName: string;
  dataUrl: string;
  capturedAt: string;
  capturedAtIso: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracyMeters?: number;
  gpsAddress?: string;
  gpsStatus: ActivityGpsStatus;
}

export interface ActivityStampOverlayInput {
  capturedAtDisplay: string;
  employeeName: string;
  employeeCode: string;
  employmentType: 'Internal' | 'Penempatan Klien';
  targetEntityName: string;
  targetBranchName: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracyMeters?: number;
  gpsAddress?: string;
  gpsStatus: ActivityGpsStatus;
}

export interface ReverseGeocodeAddressParts {
  amenity?: string;
  building?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  hamlet?: string;
  city_district?: string;
  district?: string;
  municipality?: string;
  city?: string;
  town?: string;
  county?: string;
  state?: string;
  postcode?: string;
}

const SHORT_MONTHS_ID = [
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

function cleanAddressFragment(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function formatReverseGeocodeAddress(
  parts?: ReverseGeocodeAddressParts | null,
  displayName?: string
): string {
  const segments: string[] = [];
  const pushUnique = (value?: string) => {
    const cleaned = cleanAddressFragment(value);
    if (!cleaned) return;
    const lower = cleaned.toLowerCase();
    if (segments.some((existing) => existing.toLowerCase() === lower)) return;
    segments.push(cleaned);
  };

  if (parts) {
    const streetBase = cleanAddressFragment(
      parts.road || parts.pedestrian || parts.footway || parts.building || parts.amenity || parts.hamlet
    );
    const houseNo = cleanAddressFragment(parts.house_number);
    if (streetBase) {
      pushUnique(houseNo ? `${streetBase} No. ${houseNo}` : streetBase);
    }

    pushUnique(parts.village || parts.suburb || parts.neighbourhood);
    pushUnique(parts.city_district || parts.district || parts.municipality);
    pushUnique(parts.city || parts.town || parts.county);
    pushUnique(parts.state);
  }

  if (segments.length > 0) {
    return segments.join(', ').slice(0, 220);
  }

  const fallback = cleanAddressFragment(displayName);
  if (!fallback) return '';
  return fallback
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(', ')
    .slice(0, 220);
}

export function formatTimestampCameraLabel(date: Date = new Date()): {
  iso: string;
  display: string;
} {
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  const dd = String(valid.getDate()).padStart(2, '0');
  const mmm = SHORT_MONTHS_ID[valid.getMonth()] ?? 'Jan';
  const yyyy = valid.getFullYear();
  const hh = String(valid.getHours()).padStart(2, '0');
  const mm = String(valid.getMinutes()).padStart(2, '0');
  const ss = String(valid.getSeconds()).padStart(2, '0');
  return {
    iso: valid.toISOString(),
    display: `${dd} ${mmm} ${yyyy} · ${hh}:${mm}:${ss}`,
  };
}

export function formatGpsCoordinateText(
  lat?: number,
  lng?: number,
  accuracyMeters?: number,
  gpsStatus: ActivityGpsStatus = 'unavailable'
): string {
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    const accSuffix =
      typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters) && accuracyMeters > 0
        ? ` (±${Math.round(accuracyMeters)} m)`
        : '';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}${accSuffix}`;
  }
  if (gpsStatus === 'denied') {
    return 'Izin GPS ditolak browser';
  }
  return 'Koordinat GPS tidak tersedia';
}

export function buildActivityStampOverlayLines(input: ActivityStampOverlayInput): string[] {
  const jalur = input.employmentType === 'Internal' ? 'Internal' : 'Eksternal';
  const gpsText = formatGpsCoordinateText(
    input.gpsLat,
    input.gpsLng,
    input.gpsAccuracyMeters,
    input.gpsStatus
  );
  const cleanAddress = cleanAddressFragment(input.gpsAddress);
  const lines = [
    `LIVE TIMESTAMP: ${input.capturedAtDisplay}`,
    `GPS: ${gpsText}`,
  ];
  if (cleanAddress) {
    lines.push(`ALAMAT: ${cleanAddress}`);
  }
  lines.push(
    `${input.employeeName} (${input.employeeCode}) · ${jalur}`,
    `${input.targetEntityName} · ${input.targetBranchName}`
  );
  return lines;
}

function truncateCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 4 && ctx.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}...`;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  if (maxLines <= 1 || ctx.measureText(text).width <= maxWidth) {
    return [truncateCanvasText(ctx, text, maxWidth)];
  }
  const words = text.split(' ').filter(Boolean);
  const result: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else if (!current) {
      result.push(truncateCanvasText(ctx, word, maxWidth));
      if (result.length >= maxLines) return result;
    } else {
      result.push(current);
      if (result.length === maxLines - 1) {
        const remainder = words.slice(i).join(' ');
        result.push(truncateCanvasText(ctx, remainder, maxWidth));
        return result;
      }
      current = word;
    }
  }
  if (current) {
    result.push(truncateCanvasText(ctx, current, maxWidth));
  }
  return result.slice(0, maxLines);
}

export function captureWatermarkedActivityPhoto(params: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  mirrorHorizontal: boolean;
  overlayInput: ActivityStampOverlayInput;
  maxWidth?: number;
  quality?: number;
}): string {
  const {
    video,
    canvas,
    mirrorHorizontal,
    overlayInput,
    maxWidth = 840,
    quality = 0.78,
  } = params;
  if (!video.videoWidth || !video.videoHeight) return '';

  const targetWidth = Math.min(maxWidth, video.videoWidth);
  const targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth);
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  if (mirrorHorizontal) {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  const padX = Math.max(12, Math.round(targetWidth * 0.02));
  const rawLines = buildActivityStampOverlayLines(overlayInput);
  const baseFontSize = Math.max(12, Math.round(targetWidth * 0.021));
  const lineHeight = Math.round(baseFontSize * 1.38);
  const availableTextWidth = targetWidth - padX * 2;

  const renderedEntries: Array<{ text: string; font: string; color: string }> = [];
  rawLines.forEach((rawLine, idx) => {
    const isPrimary = idx === 0;
    const isGps = idx === 1;
    const isAddress = rawLine.startsWith('ALAMAT:');
    const font = `${isPrimary || isGps ? '700' : isAddress ? '600' : '500'} ${baseFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    const color = isPrimary
      ? '#FDE68A'
      : isGps
        ? '#86EFAC'
        : isAddress
          ? '#BAE6FD'
          : '#F8FAFC';
    ctx.font = font;
    const wrapped = wrapCanvasText(ctx, rawLine, availableTextWidth, isAddress ? 2 : 1);
    wrapped.forEach((line) => {
      renderedEntries.push({ text: line, font, color });
    });
  });

  const stripHeight = renderedEntries.length * lineHeight + padX * 1.4;
  const stripTop = targetHeight - stripHeight;

  // Top-left live watermark badge
  const badgeText = 'LIVE KAMERA · TIMESTAMP & GPS';
  const badgeFont = Math.max(10, Math.round(baseFontSize * 0.85));
  ctx.font = `700 ${badgeFont}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  const badgeWidth = ctx.measureText(badgeText).width + 18;
  const badgeHeight = badgeFont + 12;
  ctx.fillStyle = 'rgba(16, 43, 105, 0.85)';
  ctx.fillRect(padX, padX, badgeWidth, badgeHeight);
  ctx.strokeStyle = 'rgba(255, 122, 26, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, padX, badgeWidth, badgeHeight);
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, padX + 9, padX + badgeHeight / 2);

  // Bottom HUD dark translucent strip
  ctx.fillStyle = 'rgba(11, 23, 54, 0.84)';
  ctx.fillRect(0, stripTop, targetWidth, stripHeight);
  ctx.fillStyle = '#FF7A1A';
  ctx.fillRect(0, stripTop, targetWidth, 3);

  ctx.textBaseline = 'top';
  renderedEntries.forEach((entry, idx) => {
    ctx.font = entry.font;
    ctx.fillStyle = entry.color;
    ctx.fillText(entry.text, padX, stripTop + padX * 0.65 + idx * lineHeight);
  });

  return canvas.toDataURL('image/jpeg', quality);
}
