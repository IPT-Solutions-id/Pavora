import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SystemSettingsConfig } from '../data/masterAdminData';
import type { PayrollSlipRecord } from './payrollCalculator';
import { formatRupiahDot, numberToIndonesianWords } from './pkwtDocument';

export interface SlipGajiPdfAssets {
  regularFont: Uint8Array;
  boldFont: Uint8Array;
  logoPng?: Uint8Array;
}

const FONT_REGULAR_URL = '/fonts/carlito-latin-400-normal.ttf';
const FONT_BOLD_URL = '/fonts/carlito-latin-700-normal.ttf';
const LOGO_PNG_URL = '/assets/pkwt/swapro-logo.png';

let cachedBrowserAssets: SlipGajiPdfAssets | null = null;

export async function loadSlipGajiBrowserAssets(): Promise<SlipGajiPdfAssets> {
  if (cachedBrowserAssets) return cachedBrowserAssets;
  const fetchBytes = async (url: string): Promise<Uint8Array | undefined> => {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return undefined;
      return new Uint8Array(await resp.arrayBuffer());
    } catch {
      return undefined;
    }
  };
  const [regularFont, boldFont, logoPng] = await Promise.all([
    fetchBytes(FONT_REGULAR_URL),
    fetchBytes(FONT_BOLD_URL),
    fetchBytes(LOGO_PNG_URL),
  ]);
  if (!regularFont || !boldFont) {
    throw new Error('Font resmi PDF tidak tersedia untuk mencetak Slip Gaji.');
  }
  cachedBrowserAssets = { regularFont, boldFont, logoPng };
  return cachedBrowserAssets;
}

export function buildSlipGajiDownloadFilename(slip: PayrollSlipRecord): string {
  const safeCode = slip.employeeCode.replace(/[^A-Za-z0-9_-]+/g, '_');
  const safePeriod = slip.period.replace(/[^A-Za-z0-9_-]+/g, '_');
  return `Slip_Gaji_${safeCode}_${safePeriod}.pdf`;
}

export async function generateSlipGajiPdfBytes(
  slips: PayrollSlipRecord[],
  settings: Pick<
    SystemSettingsConfig,
    'companyName' | 'headquartersAddress' | 'pkwtSignatoryName' | 'pkwtSignatoryTitle'
  >,
  assets: SlipGajiPdfAssets
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regular = await pdfDoc.embedFont(assets.regularFont, { subset: true });
  const bold = await pdfDoc.embedFont(assets.boldFont, { subset: true });
  const logoImage = assets.logoPng ? await pdfDoc.embedPng(assets.logoPng) : null;

  const navy = rgb(16 / 255, 43 / 255, 105 / 255);
  const blue = rgb(20 / 255, 104 / 255, 232 / 255);
  const darkText = rgb(23 / 255, 32 / 255, 51 / 255);
  const mutedText = rgb(100 / 255, 116 / 255, 139 / 255);
  const green = rgb(22 / 255, 163 / 255, 106 / 255);
  const red = rgb(220 / 255, 53 / 255, 69 / 255);
  const borderLine = rgb(226 / 255, 232 / 255, 240 / 255);
  const softBg = rgb(245 / 255, 247 / 255, 250 / 255);

  for (const slip of slips) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
    const marginX = 42;
    const contentWidth = 595.28 - marginX * 2;
    let y = 795;

    // Header bar
    if (logoImage) {
      const scaled = logoImage.scaleToFit(96, 36);
      page.drawImage(logoImage, {
        x: marginX,
        y: y - scaled.height + 6,
        width: scaled.width,
        height: scaled.height,
      });
    }

    const companyTitleX = logoImage ? marginX + 108 : marginX;
    page.drawText(settings.companyName || 'PT. SWAPRO INTERNATIONAL', {
      x: companyTitleX,
      y: y - 4,
      size: 13,
      font: bold,
      color: navy,
    });
    page.drawText(
      settings.headquartersAddress || 'Jakarta Selatan · Platform HRIS & Payroll PEVORA',
      {
        x: companyTitleX,
        y: y - 18,
        size: 8.5,
        font: regular,
        color: mutedText,
        maxWidth: contentWidth - 190,
      }
    );

    page.drawText(
      slip.settlementType === 'Final Settlement (Resign)'
        ? 'FINAL SETTLEMENT (RESIGN)'
        : 'SLIP GAJI RESMI',
      {
        x: 595.28 - marginX - 150,
        y: y - 2,
        size: 11,
        font: bold,
        color: blue,
      }
    );
    page.drawText(`Periode: ${slip.periodLabel}`, {
      x: 595.28 - marginX - 150,
      y: y - 16,
      size: 9,
      font: bold,
      color: darkText,
    });

    y -= 42;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: 595.28 - marginX, y },
      thickness: 1.5,
      color: navy,
    });

    // Employee Info Box
    y -= 14;
    page.drawRectangle({
      x: marginX,
      y: y - 92,
      width: contentWidth,
      height: 92,
      color: softBg,
      borderColor: borderLine,
      borderWidth: 1,
    });

    const leftX = marginX + 12;
    const rightX = marginX + contentWidth / 2 + 8;

    const drawMeta = (x: number, rowY: number, label: string, value: string) => {
      page.drawText(label, { x, y: rowY, size: 8, font: regular, color: mutedText });
      page.drawText(`: ${value}`, {
        x: x + 82,
        y: rowY,
        size: 8.5,
        font: bold,
        color: darkText,
        maxWidth: contentWidth / 2 - 96,
      });
    };

    drawMeta(leftX, y - 16, 'NIK / Nama', `${slip.employeeCode} · ${slip.fullName}`);
    drawMeta(leftX, y - 32, 'Jabatan', slip.position);
    drawMeta(leftX, y - 48, 'Unit / Klien', slip.entityName);
    drawMeta(leftX, y - 64, 'Penempatan', `${slip.placementName} (${slip.regionName})`);
    drawMeta(leftX, y - 80, 'Sumber Hitung', slip.calculationSource);

    drawMeta(rightX, y - 16, 'Status Pajak / NPWP', `${slip.ptkpStatus} · ${slip.npwpNumber}`);
    drawMeta(rightX, y - 32, 'No. BPJS Kes', slip.bpjsKesehatanNumber);
    drawMeta(rightX, y - 48, 'No. BPJS TK', slip.bpjsKetenagakerjaanNumber);
    drawMeta(rightX, y - 64, 'Rekening Bank', `${slip.bankName} · ${slip.bankAccountNumber}`);
    drawMeta(rightX, y - 80, 'Status Pengesahan', slip.status === 'Disetujui' ? 'Disetujui Master Admin' : slip.status);

    y -= 114;

    // Two-column earnings & deductions
    const colW = (contentWidth - 16) / 2;
    const col1X = marginX;
    const col2X = marginX + colW + 16;

    const drawSectionHeader = (x: number, headerY: number, title: string, accent: typeof blue) => {
      page.drawRectangle({
        x,
        y: headerY - 20,
        width: colW,
        height: 20,
        color: accent,
      });
      page.drawText(title, {
        x: x + 8,
        y: headerY - 14,
        size: 9,
        font: bold,
        color: rgb(1, 1, 1),
      });
    };

    drawSectionHeader(col1X, y, 'A. PENERIMAAN & KOMPENSASI', navy);
    drawSectionHeader(col2X, y, 'B. POTONGAN KARYAWAN', red);

    const earningsRows: Array<[string, number]> = [
      [
        slip.settlementType === 'Final Settlement (Resign)' &&
        typeof slip.prorataActiveDays === 'number'
          ? `Gaji Pokok (Prorata ${slip.prorataActiveDays}/${slip.prorataTotalDays} hr)`
          : 'Gaji Pokok',
        slip.baseSalary,
      ],
      ['Tunjangan Tetap', slip.fixedAllowance],
      ['Tunjangan Tidak Tetap', slip.variableAllowance],
      ['Lembur (Overtime)', slip.overtimePay],
      ['Insentif / Bonus', slip.incentiveBonus],
      ['Kompensasi PKWT (PP 35/2021)', slip.pkwtCompensation],
      ['Kompensasi / THR Lainnya', slip.otherCompensation],
    ];

    const deductionRows: Array<[string, number]> = [
      ['BPJS Kesehatan (1%)', slip.bpjsKesEmployee],
      ['BPJS TK — JHT (2%)', slip.bpjsTkJhtEmployee],
      ['BPJS TK — Jaminan Pensiun (1%)', slip.bpjsTkJpEmployee],
      ['PPh 21 (TER)', slip.pph21Employee],
      [`Potongan Alpha (${slip.alphaDaysCount} hari)`, slip.alphaDeduction],
      ['Potongan Keterlambatan', slip.lateDeduction],
      ['Kasbon / Potongan Lainnya', slip.loanKasbonDeduction + slip.otherDeduction],
    ];

    let rowY = y - 36;
    for (let i = 0; i < Math.max(earningsRows.length, deductionRows.length); i++) {
      const eRow = earningsRows[i];
      if (eRow) {
        page.drawText(eRow[0], { x: col1X + 4, y: rowY, size: 8.5, font: regular, color: darkText });
        page.drawText(formatRupiahDot(eRow[1]), {
          x: col1X + colW - 76,
          y: rowY,
          size: 8.5,
          font: bold,
          color: darkText,
        });
      }
      const dRow = deductionRows[i];
      if (dRow) {
        page.drawText(dRow[0], { x: col2X + 4, y: rowY, size: 8.5, font: regular, color: darkText });
        page.drawText(`- ${formatRupiahDot(dRow[1])}`, {
          x: col2X + colW - 82,
          y: rowY,
          size: 8.5,
          font: bold,
          color: dRow[1] > 0 ? red : mutedText,
        });
      }
      page.drawLine({
        start: { x: col1X, y: rowY - 5 },
        end: { x: col1X + colW, y: rowY - 5 },
        thickness: 0.5,
        color: borderLine,
      });
      page.drawLine({
        start: { x: col2X, y: rowY - 5 },
        end: { x: col2X + colW, y: rowY - 5 },
        thickness: 0.5,
        color: borderLine,
      });
      rowY -= 22;
    }

    // Subtotals
    page.drawText('Total Penghasilan Bruto', {
      x: col1X + 4,
      y: rowY - 4,
      size: 9,
      font: bold,
      color: navy,
    });
    page.drawText(formatRupiahDot(slip.grossIncome), {
      x: col1X + colW - 80,
      y: rowY - 4,
      size: 9.5,
      font: bold,
      color: navy,
    });

    page.drawText('Total Potongan', {
      x: col2X + 4,
      y: rowY - 4,
      size: 9,
      font: bold,
      color: red,
    });
    page.drawText(`- ${formatRupiahDot(slip.totalDeductions)}`, {
      x: col2X + colW - 84,
      y: rowY - 4,
      size: 9.5,
      font: bold,
      color: red,
    });

    // Take Home Pay Box
    y = rowY - 26;
    page.drawRectangle({
      x: marginX,
      y: y - 62,
      width: contentWidth,
      height: 62,
      color: rgb(236 / 255, 253 / 255, 245 / 255),
      borderColor: green,
      borderWidth: 1.2,
    });
    page.drawText('GAJI BERSIH DITERIMA (TAKE HOME PAY)', {
      x: marginX + 14,
      y: y - 20,
      size: 9,
      font: bold,
      color: green,
    });
    page.drawText(formatRupiahDot(slip.takeHomePay), {
      x: 595.28 - marginX - 150,
      y: y - 24,
      size: 16,
      font: bold,
      color: navy,
    });
    const terbilangText = `Terbilang: # ${numberToIndonesianWords(slip.takeHomePay)} rupiah #`;
    page.drawText(terbilangText, {
      x: marginX + 14,
      y: y - 44,
      size: 8.5,
      font: regular,
      color: darkText,
      maxWidth: contentWidth - 28,
    });

    // Employer contribution transparency box
    y -= 82;
    page.drawRectangle({
      x: marginX,
      y: y - 64,
      width: contentWidth,
      height: 64,
      color: softBg,
      borderColor: borderLine,
      borderWidth: 1,
    });
    page.drawText('C. KONTRIBUSI DITANGGUNG PERUSAHAAN (TIDAK MEMOTONG THP)', {
      x: marginX + 12,
      y: y - 16,
      size: 8.5,
      font: bold,
      color: navy,
    });
    page.drawText(
      `BPJS Kesehatan 4%: ${formatRupiahDot(slip.bpjsKesCompany)}  |  JHT 3,7%: ${formatRupiahDot(slip.bpjsTkJhtCompany)}  |  JP 2%: ${formatRupiahDot(slip.bpjsTkJpCompany)}`,
      { x: marginX + 12, y: y - 34, size: 8, font: regular, color: darkText }
    );
    page.drawText(
      `JKK: ${formatRupiahDot(slip.bpjsTkJkkCompany)}  |  JKM: ${formatRupiahDot(slip.bpjsTkJkmCompany)}  |  Subsidi PPh 21: ${formatRupiahDot(slip.pph21CompanySubsidy)}  |  Total Biaya Perusahaan: ${formatRupiahDot(slip.totalCompanyCost)}`,
      { x: marginX + 12, y: y - 49, size: 8, font: regular, color: darkText }
    );

    // Footer & Approval signature
    y -= 92;
    page.drawText('Dicetak otomatis melalui Portal Payroll PEVORA (bersifat rahasia / pribadi).', {
      x: marginX,
      y,
      size: 8,
      font: regular,
      color: mutedText,
    });
    page.drawText(
      slip.approvedBy
        ? `Disahkan oleh: ${slip.approvedBy} (${slip.approvedAt ?? ''})`
        : `Status Draft · ${settings.pkwtSignatoryName || 'Master Admin'} (${settings.pkwtSignatoryTitle || 'Pimpinan Operasional'})`,
      {
        x: marginX,
        y: y - 14,
        size: 8.5,
        font: bold,
        color: navy,
      }
    );
  }

  return pdfDoc.save();
}
