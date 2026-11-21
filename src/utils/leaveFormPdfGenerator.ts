import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import {
  EmployeeLeaveQuotaSummary,
  EmployeeRecord,
  LeaveAbsenceRecord,
  doesLeaveDeductAnnualQuota,
  isPartialDayLeaveType,
} from '../data/masterAdminData';

export const SWAPRO_LEAVE_FORM_TEMPLATE_URL =
  '/assets/aistudio/Form_Cuti_SWAPRO_NEW_e00fd5e1.pdf';

let cachedTemplateBytes: Uint8Array | null = null;

const INDONESIAN_MONTHS_SHORT = [
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

export async function fetchSwaproLeaveTemplateBytes(): Promise<Uint8Array> {
  if (cachedTemplateBytes) {
    return cachedTemplateBytes;
  }
  const response = await fetch(SWAPRO_LEAVE_FORM_TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(
      `Gagal memuat template Formulir Cuti/Izin SWAPRO (${response.status}).`
    );
  }
  const buffer = await response.arrayBuffer();
  cachedTemplateBytes = new Uint8Array(buffer);
  return cachedTemplateBytes;
}

/**
 * Sanitizes text to safe WinAnsi characters so standard PDF fonts never throw encoding errors.
 */
function sanitizePdfText(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022|\u00B7/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatIsoToShortIndoDate(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!isoMatch) return sanitizePdfText(trimmed);
  const year = isoMatch[1];
  const monthIdx = Number(isoMatch[2]) - 1;
  const day = isoMatch[3];
  const monthLabel = INDONESIAN_MONTHS_SHORT[monthIdx] ?? isoMatch[2];
  return `${day} ${monthLabel} ${year}`;
}

export function resolveDateFieldsFromRecord(record: LeaveAbsenceRecord): {
  startDateLabel: string;
  endDateLabel: string;
  returnToWorkLabel: string;
  submittedDateLabel: string;
} {
  let startLabel = formatIsoToShortIndoDate(record.startDate);
  let endLabel = formatIsoToShortIndoDate(record.endDate);

  if (!startLabel && record.dateRange) {
    const cleanRange = sanitizePdfText(record.dateRange);
    const rangeMatch = /^(\d{1,2})\s*-\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})$/.exec(cleanRange);
    if (rangeMatch) {
      const restParts = rangeMatch[2].split(/\s+/);
      startLabel = `${rangeMatch[1]} ${restParts.slice(1).join(' ')}`;
      endLabel = rangeMatch[2];
    } else if (cleanRange.includes(' - ')) {
      const [left, right] = cleanRange.split(' - ');
      startLabel = left.trim();
      endLabel = (right || left).trim();
    } else {
      startLabel = cleanRange;
      endLabel = cleanRange;
    }
  }
  if (!endLabel) {
    endLabel = startLabel;
  }

  let returnLabel = formatIsoToShortIndoDate(record.returnToWorkDate);
  if (!returnLabel && record.endDate && /^\d{4}-\d{2}-\d{2}$/.test(record.endDate)) {
    const dt = new Date(`${record.endDate}T00:00:00`);
    if (!Number.isNaN(dt.getTime())) {
      dt.setDate(dt.getDate() + 1);
      // Skip Sunday to Monday if needed
      if (dt.getDay() === 0) dt.setDate(dt.getDate() + 1);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      returnLabel = formatIsoToShortIndoDate(`${y}-${m}-${d}`);
    }
  }

  let submittedDateLabel = '';
  if (record.submittedAt) {
    const cleaned = sanitizePdfText(record.submittedAt);
    if (cleaned.toLowerCase().startsWith('hari ini')) {
      const now = new Date();
      submittedDateLabel = `${String(now.getDate()).padStart(2, '0')} ${
        INDONESIAN_MONTHS_SHORT[now.getMonth()]
      } ${now.getFullYear()}`;
    } else {
      submittedDateLabel = cleaned.split('-')[0].trim();
    }
  }
  if (!submittedDateLabel) {
    const now = new Date();
    submittedDateLabel = `${String(now.getDate()).padStart(2, '0')} ${
      INDONESIAN_MONTHS_SHORT[now.getMonth()]
    } ${now.getFullYear()}`;
  }

  return {
    startDateLabel: startLabel,
    endDateLabel: endLabel,
    returnToWorkLabel: returnLabel,
    submittedDateLabel,
  };
}

function fitTextToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string {
  const clean = sanitizePdfText(text);
  if (!clean) return '';
  if (font.widthOfTextAtSize(clean, fontSize) <= maxWidth) {
    return clean;
  }
  let truncated = clean;
  while (
    truncated.length > 1 &&
    font.widthOfTextAtSize(`${truncated}...`, fontSize) > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated.trimEnd()}...`;
}

function drawFittedText(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    font: PDFFont;
    size: number;
    maxWidth: number;
    color?: ReturnType<typeof rgb>;
  }
) {
  const fitted = fitTextToWidth(text, opts.font, opts.size, opts.maxWidth);
  if (!fitted) return;
  page.drawText(fitted, {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? rgb(0.07, 0.13, 0.25),
  });
}

function drawCenteredFittedText(
  page: PDFPage,
  text: string,
  opts: {
    centerX: number;
    y: number;
    font: PDFFont;
    size: number;
    maxWidth: number;
    color?: ReturnType<typeof rgb>;
  }
) {
  const fitted = fitTextToWidth(text, opts.font, opts.size, opts.maxWidth);
  if (!fitted) return;
  const textWidth = opts.font.widthOfTextAtSize(fitted, opts.size);
  page.drawText(fitted, {
    x: opts.centerX - textWidth / 2,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? rgb(0.07, 0.13, 0.25),
  });
}

/**
 * Draws a crisp vector checkmark inside a template checkbox rectangle.
 */
function drawVectorCheckmark(
  page: PDFPage,
  boxCenterX: number,
  boxCenterY: number
) {
  const ink = rgb(0.06, 0.17, 0.41);
  page.drawLine({
    start: { x: boxCenterX - 4.2, y: boxCenterY + 0.2 },
    end: { x: boxCenterX - 1.1, y: boxCenterY - 3.2 },
    thickness: 1.8,
    color: ink,
  });
  page.drawLine({
    start: { x: boxCenterX - 1.3, y: boxCenterY - 3.2 },
    end: { x: boxCenterX + 4.8, y: boxCenterY + 3.8 },
    thickness: 1.8,
    color: ink,
  });
}

function decodeDataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64 = match[2];
  try {
    if (typeof Buffer !== 'undefined') {
      return { mime, bytes: Uint8Array.from(Buffer.from(base64, 'base64')) };
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { mime, bytes };
  } catch {
    return null;
  }
}

export function buildSwaproLeavePdfFilename(record: LeaveAbsenceRecord): string {
  const safeNik = sanitizePdfText(record.employeeCode).replace(/[^A-Za-z0-9_-]/g, '_');
  const safeName = sanitizePdfText(record.employeeName)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeType = sanitizePdfText(record.type)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `Form_Cuti_SWAPRO_${safeNik}_${safeName}_${safeType}.pdf`;
}

export interface GenerateSwaproLeavePdfParams {
  record: LeaveAbsenceRecord;
  employee?: EmployeeRecord;
  quotaSummary?: EmployeeLeaveQuotaSummary;
  templatePdfBytes?: Uint8Array;
}

/**
 * Generates an exact 1:1 filled PDF overlaid directly onto PT. SWAPRO INTERNATIONAL's
 * FORMULIR PERMOHONAN CUTI/IZIN (FORM HCREV-17102023).
 */
export async function generateSwaproLeavePdfBytes(
  params: GenerateSwaproLeavePdfParams
): Promise<Uint8Array> {
  const { record, employee, quotaSummary } = params;
  const templateBytes = params.templatePdfBytes ?? (await fetchSwaproLeaveTemplateBytes());

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.14, 0.30);

  // 1. Box 1 — Applicant Identity ("Saya yang bertanda tangan di bawah ini :")
  const nikValue = record.employeeCode || employee?.employeeCode || '-';
  const nameValue = record.employeeName || employee?.fullName || '-';
  const divisionValue = record.division || employee?.department || record.employmentType || '-';
  const positionValue = record.position || employee?.position || '-';
  const unitKerjaValue =
    record.unitKerja || employee?.placementName || record.entityName || '-';

  drawFittedText(page, nikValue, {
    x: 126,
    y: 668,
    font: fontBold,
    size: 9,
    maxWidth: 420,
    color: ink,
  });
  drawFittedText(page, nameValue, {
    x: 126,
    y: 654,
    font: fontBold,
    size: 9,
    maxWidth: 420,
    color: ink,
  });
  drawFittedText(page, divisionValue, {
    x: 126,
    y: 640,
    font: fontRegular,
    size: 9,
    maxWidth: 420,
    color: ink,
  });
  drawFittedText(page, positionValue, {
    x: 126,
    y: 626,
    font: fontRegular,
    size: 9,
    maxWidth: 420,
    color: ink,
  });
  drawFittedText(page, unitKerjaValue, {
    x: 126,
    y: 612,
    font: fontRegular,
    size: 9,
    maxWidth: 420,
    color: ink,
  });

  // 2. Box 2 — Request Type Checkboxes ("Mengajukan Permohonan :")
  if (record.type === 'Cuti Tahunan') {
    drawVectorCheckmark(page, 44.5, 574.5);
    drawFittedText(page, record.categoryDetail || 'Tahunan', {
      x: 132,
      y: 572,
      font: fontBold,
      size: 8.2,
      maxWidth: 74,
      color: ink,
    });
  } else if (record.type === 'Izin Sakit') {
    drawVectorCheckmark(page, 44.5, 557.5);
  } else if (record.type === 'Izin Keperluan') {
    drawVectorCheckmark(page, 44.5, 541.5);
    drawFittedText(page, record.categoryDetail || record.reason || 'Keperluan', {
      x: 132,
      y: 539,
      font: fontBold,
      size: 8.2,
      maxWidth: 74,
      color: ink,
    });
  } else if (record.type === 'Datang Terlambat') {
    drawVectorCheckmark(page, 291, 574.5);
    if (record.timeDetail) {
      drawFittedText(page, `${record.timeDetail} WIB`, {
        x: 458,
        y: 572,
        font: fontBold,
        size: 8.5,
        maxWidth: 78,
        color: ink,
      });
    }
  } else if (record.type === 'Pulang Lebih Awal') {
    drawVectorCheckmark(page, 291, 557.5);
    if (record.timeDetail) {
      drawFittedText(page, `${record.timeDetail} WIB`, {
        x: 458,
        y: 555,
        font: fontBold,
        size: 8.5,
        maxWidth: 78,
        color: ink,
      });
    }
  } else if (record.type === 'Meninggalkan Pekerjaan') {
    drawVectorCheckmark(page, 291, 541.5);
    if (record.leaveTimeStart) {
      drawFittedText(page, record.leaveTimeStart, {
        x: 458,
        y: 539,
        font: fontBold,
        size: 8.5,
        maxWidth: 30,
        color: ink,
      });
    }
    if (record.leaveTimeEnd) {
      drawFittedText(page, record.leaveTimeEnd, {
        x: 504,
        y: 539,
        font: fontBold,
        size: 8.5,
        maxWidth: 34,
        color: ink,
      });
    }
  }

  // 3. Keterangan block (Dates, Working Days, Return Date, Contact Phone, Reason note)
  const { startDateLabel, endDateLabel, returnToWorkLabel, submittedDateLabel } =
    resolveDateFieldsFromRecord(record);

  drawFittedText(page, startDateLabel, {
    x: 68,
    y: 509,
    font: fontBold,
    size: 8.4,
    maxWidth: 112,
    color: ink,
  });
  drawFittedText(page, endDateLabel, {
    x: 204,
    y: 509,
    font: fontBold,
    size: 8.4,
    maxWidth: 94,
    color: ink,
  });

  const workingDaysDisplay = isPartialDayLeaveType(record.type)
    ? '0'
    : String(Math.max(0, record.daysCount));
  drawCenteredFittedText(page, workingDaysDisplay, {
    centerX: 327,
    y: 509,
    font: fontBold,
    size: 8.6,
    maxWidth: 34,
    color: ink,
  });

  drawFittedText(page, returnToWorkLabel || endDateLabel, {
    x: 106,
    y: 493.5,
    font: fontBold,
    size: 8.4,
    maxWidth: 120,
    color: ink,
  });

  // Short reason note neatly placed to the right of Kembali bekerja tgl (empty white space on the right)
  if (record.reason) {
    drawFittedText(page, `Ket: ${record.reason}`, {
      x: 232,
      y: 493.5,
      font: fontRegular,
      size: 7.8,
      maxWidth: 322,
      color: rgb(0.24, 0.31, 0.42),
    });
  }

  const contactPhoneValue =
    record.contactPhone || employee?.whatsappNumber || '-';
  drawFittedText(page, contactPhoneValue, {
    x: 304,
    y: 477,
    font: fontBold,
    size: 8.6,
    maxWidth: 230,
    color: ink,
  });

  // 4. Box 3 — Diisi oleh HC (Hak Cuti saat ini / Akan diambil / Sisa hak cuti)
  const deductsQuota = doesLeaveDeductAnnualQuota(record.type);
  const currentQuota =
    record.hcQuotaBefore ??
    (quotaSummary
      ? record.status === 'Disetujui' && deductsQuota
        ? quotaSummary.remainingLeaveQuota + record.daysCount
        : quotaSummary.remainingLeaveQuota
      : 12);
  const takenQuota =
    record.hcQuotaTaken ?? (deductsQuota ? Math.max(0, record.daysCount) : 0);
  const remainingQuota =
    record.hcQuotaRemaining ?? Math.max(0, currentQuota - takenQuota);

  drawCenteredFittedText(page, String(currentQuota), {
    centerX: 256,
    y: 443,
    font: fontBold,
    size: 8.8,
    maxWidth: 70,
    color: ink,
  });
  drawCenteredFittedText(page, String(takenQuota), {
    centerX: 256,
    y: 433,
    font: fontBold,
    size: 8.8,
    maxWidth: 70,
    color: ink,
  });
  drawCenteredFittedText(page, String(remainingQuota), {
    centerX: 256,
    y: 423,
    font: fontBold,
    size: 8.8,
    maxWidth: 70,
    color: ink,
  });

  // 5. Replacement Staff ("Selama tidak masuk kerja, akan digantikan oleh :")
  const rep = record.replacementStaff;
  if (rep) {
    drawFittedText(page, rep.employeeCode || '-', {
      x: 126,
      y: 393,
      font: fontBold,
      size: 8.5,
      maxWidth: 420,
      color: ink,
    });
    drawFittedText(page, rep.fullName || '-', {
      x: 126,
      y: 383,
      font: fontBold,
      size: 8.5,
      maxWidth: 420,
      color: ink,
    });
    drawFittedText(page, rep.division || '-', {
      x: 126,
      y: 373,
      font: fontRegular,
      size: 8.5,
      maxWidth: 420,
      color: ink,
    });
    drawFittedText(page, rep.position || '-', {
      x: 126,
      y: 363,
      font: fontRegular,
      size: 8.5,
      maxWidth: 420,
      color: ink,
    });
    drawFittedText(page, rep.unitKerja || '-', {
      x: 126,
      y: 353,
      font: fontRegular,
      size: 8.5,
      maxWidth: 420,
      color: ink,
    });
  }

  // 6. Submission City & Date ("Diajukan di .... ,Pada tanggal ....")
  const cityLabel = record.submittedCity || 'Jakarta';
  drawFittedText(page, cityLabel, {
    x: 80,
    y: 327,
    font: fontBold,
    size: 8.6,
    maxWidth: 96,
    color: ink,
  });
  drawFittedText(page, submittedDateLabel, {
    x: 235,
    y: 327,
    font: fontBold,
    size: 8.6,
    maxWidth: 98,
    color: ink,
  });

  // 7. Signature Box 1 — Pemohon & Staff Pengganti
  const sigDataUrl = record.applicantSignatureDataUrl || employee?.savedSignatureDataUrl;
  if (sigDataUrl) {
    const decoded = decodeDataUrlToBytes(sigDataUrl);
    if (decoded) {
      try {
        const embeddedImg =
          decoded.mime === 'image/png'
            ? await pdfDoc.embedPng(decoded.bytes)
            : await pdfDoc.embedJpg(decoded.bytes);
        const dims = embeddedImg.scaleToFit(94, 40);
        page.drawImage(embeddedImg, {
          x: 160 - dims.width / 2,
          y: 254 + (40 - dims.height) / 2,
          width: dims.width,
          height: dims.height,
        });
      } catch {
        // Ignore malformed signature image gracefully
      }
    }
  }

  drawCenteredFittedText(page, nameValue, {
    centerX: 160,
    y: 239,
    font: fontBold,
    size: 8.4,
    maxWidth: 106,
    color: ink,
  });

  if (rep?.fullName) {
    drawCenteredFittedText(page, rep.fullName, {
      centerX: 445,
      y: 239,
      font: fontBold,
      size: 8.4,
      maxWidth: 100,
      color: ink,
    });
  }

  // 8. Signature Box 2 — Atasan Langsung, Area/Head, Human Capital
  if (record.approverDirectName) {
    drawCenteredFittedText(page, record.approverDirectName, {
      centerX: 159,
      y: 132,
      font: fontBold,
      size: 8.2,
      maxWidth: 104,
      color: ink,
    });
  }
  if (record.approverAreaHeadName) {
    drawCenteredFittedText(page, record.approverAreaHeadName, {
      centerX: 301,
      y: 132,
      font: fontBold,
      size: 8.2,
      maxWidth: 118,
      color: ink,
    });
  }

  const hcName = record.approverHcName || record.reviewedBy || '';
  if (hcName) {
    drawCenteredFittedText(page, hcName, {
      centerX: 445,
      y: 132,
      font: fontBold,
      size: 8.2,
      maxWidth: 102,
      color: ink,
    });
  }

  // Official digital approval stamp when approved by Master Admin / HC
  if (record.status === 'Disetujui') {
    const stampColor = rgb(0.08, 0.45, 0.28);
    page.drawRectangle({
      x: 396,
      y: 151,
      width: 98,
      height: 29,
      borderColor: stampColor,
      borderWidth: 1.1,
      color: rgb(0.95, 0.99, 0.97),
    });
    drawCenteredFittedText(page, 'DISETUJUI HC', {
      centerX: 445,
      y: 168,
      font: fontBold,
      size: 8.2,
      maxWidth: 90,
      color: stampColor,
    });
    drawCenteredFittedText(page, sanitizePdfText(record.reviewedAt || 'Terverifikasi'), {
      centerX: 445,
      y: 156,
      font: fontRegular,
      size: 6.8,
      maxWidth: 90,
      color: stampColor,
    });
  } else if (record.status === 'Ditolak') {
    const rejectColor = rgb(0.76, 0.14, 0.18);
    page.drawRectangle({
      x: 396,
      y: 151,
      width: 98,
      height: 29,
      borderColor: rejectColor,
      borderWidth: 1.1,
      color: rgb(0.99, 0.95, 0.95),
    });
    drawCenteredFittedText(page, 'DITOLAK HC', {
      centerX: 445,
      y: 168,
      font: fontBold,
      size: 8.2,
      maxWidth: 90,
      color: rejectColor,
    });
    drawCenteredFittedText(page, sanitizePdfText(record.reviewedAt || 'Ditolak'), {
      centerX: 445,
      y: 156,
      font: fontRegular,
      size: 6.8,
      maxWidth: 90,
      color: rejectColor,
    });
  }

  return pdfDoc.save();
}
