import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  PASAL_2_ITEMS,
  PASAL_3_PAGE1_ITEMS,
  PASAL_3_PAGE2_ITEMS,
  PASAL_4_ITEMS,
  PASAL_5_ITEMS,
  PASAL_5_SUBITEMS,
  PASAL_6_ITEMS,
  PASAL_6_SUBITEMS,
  PASAL_7_P1,
  PASAL_7_P2,
  PASAL_8_ITEMS_AFTER_3,
  PASAL_8_ITEMS_BEFORE_3,
  PASAL_8_ITEM_3_LIST,
  PENUTUP_RUNS,
  PKWT_PARTY_1_DESC,
  PKWT_PARTY_2_DESC,
  PKWT_RECITAL_INTRO,
  formatRupiahDot,
  getPkwtRecitals,
  numberToIndonesianWords,
} from './pkwtDocument.ts';
import type { PkwtDocumentPayload, PkwtTextRun } from './pkwtDocument.ts';

export interface PkwtPdfAssets {
  regularFont: Uint8Array;
  boldFont: Uint8Array;
  italicFont: Uint8Array;
  boldItalicFont: Uint8Array;
  logoPng: Uint8Array;
  footerJpg: Uint8Array;
  parafPng: Uint8Array;
  stampP3Jpg: Uint8Array;
  stampP4Jpg: Uint8Array;
}

const PAGE_W = 595.44;
const PAGE_H = 841.68;
const MARGIN_LEFT = 42;
const MARGIN_RIGHT = 553;
const CONTENT_TOP_Y = 710;
const CONTENT_BOTTOM_MIN_Y = 58;
const BODY_SIZE = 8.04;
const LINE_H = 10.15;

let cachedAssetsPromise: Promise<PkwtPdfAssets> | null = null;

async function fetchBinary(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal memuat aset dokumen PKWT (${url}): ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function fetchDefaultPkwtAssets(): Promise<PkwtPdfAssets> {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = Promise.all([
      fetchBinary('/fonts/carlito-latin-400-normal.ttf'),
      fetchBinary('/fonts/carlito-latin-700-normal.ttf'),
      fetchBinary('/fonts/carlito-latin-400-italic.ttf'),
      fetchBinary('/fonts/carlito-latin-700-italic.ttf'),
      fetchBinary('/assets/pkwt/swapro-logo.png'),
      fetchBinary('/assets/pkwt/footer-bar.jpg'),
      fetchBinary('/assets/pkwt/swapro-paraf.png'),
      fetchBinary('/assets/pkwt/stamp-p3.jpg'),
      fetchBinary('/assets/pkwt/stamp-p4.jpg'),
    ]).then(
      ([
        regularFont,
        boldFont,
        italicFont,
        boldItalicFont,
        logoPng,
        footerJpg,
        parafPng,
        stampP3Jpg,
        stampP4Jpg,
      ]) => ({
        regularFont,
        boldFont,
        italicFont,
        boldItalicFont,
        logoPng,
        footerJpg,
        parafPng,
        stampP3Jpg,
        stampP4Jpg,
      })
    );
  }
  return cachedAssetsPromise;
}

interface FontBundle {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

interface WordToken {
  text: string;
  bold: boolean;
  italic: boolean;
  width: number;
  spaceAfterWidth: number;
  trailingSpace: boolean;
}

function selectFont(fonts: FontBundle, bold?: boolean, italic?: boolean): PDFFont {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

function tokenizeRuns(runs: PkwtTextRun[], fonts: FontBundle, size: number): WordToken[] {
  const tokens: WordToken[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const font = selectFont(fonts, run.bold, run.italic);
    const spaceW = font.widthOfTextAtSize(' ', size);

    // If this run begins with whitespace, ensure the previous token gets trailingSpace = true
    if (/^\s/.test(run.text) && tokens.length > 0) {
      tokens[tokens.length - 1].trailingSpace = true;
    }

    const pieces = run.text.split(/(\s+)/);
    for (let i = 0; i < pieces.length; i++) {
      const part = pieces[i];
      if (!part || /^\s+$/.test(part)) continue;
      const nextPiece = pieces[i + 1];
      const hasSpaceAfter = typeof nextPiece === 'string' && /^\s+$/.test(nextPiece);
      tokens.push({
        text: part,
        bold: Boolean(run.bold),
        italic: Boolean(run.italic),
        width: font.widthOfTextAtSize(part, size),
        spaceAfterWidth: spaceW,
        trailingSpace: hasSpaceAfter,
      });
    }
  }
  return tokens;
}

interface BuiltLine {
  tokens: WordToken[];
  textWidth: number;
  spaceSlots: number[]; // index i where token i has space before token i+1
}

function layoutTokensToLines(
  tokens: WordToken[],
  maxWidth: number,
  firstLineMaxWidth = maxWidth
): BuiltLine[] {
  const lines: BuiltLine[] = [];
  let current: WordToken[] = [];
  let currentW = 0;
  let activeMaxW = firstLineMaxWidth;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prevTok = current[current.length - 1];
    const gap = prevTok && prevTok.trailingSpace ? prevTok.spaceAfterWidth : 0;

    if (current.length > 0 && currentW + gap + tok.width > activeMaxW) {
      const spaceSlots: number[] = [];
      let wordsW = 0;
      for (let j = 0; j < current.length; j++) {
        wordsW += current[j].width;
        if (j < current.length - 1 && current[j].trailingSpace) {
          spaceSlots.push(j);
        }
      }
      lines.push({ tokens: current, textWidth: wordsW, spaceSlots });
      current = [tok];
      currentW = tok.width;
      activeMaxW = maxWidth;
    } else {
      current.push(tok);
      currentW += gap + tok.width;
    }
  }

  if (current.length > 0) {
    const spaceSlots: number[] = [];
    let wordsW = 0;
    for (let j = 0; j < current.length; j++) {
      wordsW += current[j].width;
      if (j < current.length - 1 && current[j].trailingSpace) {
        spaceSlots.push(j);
      }
    }
    lines.push({ tokens: current, textWidth: wordsW, spaceSlots });
  }

  return lines;
}

function drawRichParagraph(
  page: PDFPage,
  fonts: FontBundle,
  runs: PkwtTextRun[],
  opts: {
    x: number;
    y: number;
    maxWidth: number;
    size?: number;
    lineHeight?: number;
    align?: 'left' | 'justify';
  }
): number {
  const size = opts.size ?? BODY_SIZE;
  const lineH = opts.lineHeight ?? LINE_H;
  const align = opts.align ?? 'justify';
  const tokens = tokenizeRuns(runs, fonts, size);
  const lines = layoutTokensToLines(tokens, opts.maxWidth);
  const ink = rgb(0.05, 0.05, 0.05);

  let y = opts.y;
  lines.forEach((line, lineIdx) => {
    const isLast = lineIdx === lines.length - 1;
    let naturalSpacesW = 0;
    for (const slotIdx of line.spaceSlots) {
      naturalSpacesW += line.tokens[slotIdx].spaceAfterWidth;
    }

    let extraPerSlot = 0;
    if (align === 'justify' && !isLast && line.spaceSlots.length > 0) {
      const freeSpace = opts.maxWidth - (line.textWidth + naturalSpacesW);
      if (freeSpace > 0 && freeSpace < opts.maxWidth * 0.45) {
        extraPerSlot = freeSpace / line.spaceSlots.length;
      }
    }

    let cx = opts.x;
    for (let i = 0; i < line.tokens.length; i++) {
      const tok = line.tokens[i];
      const font = selectFont(fonts, tok.bold, tok.italic);
      page.drawText(tok.text, { x: cx, y, size, font, color: ink });
      cx += tok.width;
      if (i < line.tokens.length - 1 && tok.trailingSpace) {
        cx += tok.spaceAfterWidth + extraPerSlot;
      }
    }
    y -= lineH;
  });

  return y;
}

function drawHangingItem(
  page: PDFPage,
  fonts: FontBundle,
  label: string,
  runs: PkwtTextRun[],
  opts: {
    labelX: number;
    textX: number;
    rightX: number;
    y: number;
    size?: number;
    lineHeight?: number;
    labelBold?: boolean;
    align?: 'left' | 'justify';
  }
): number {
  const size = opts.size ?? BODY_SIZE;
  const labelFont = opts.labelBold ? fonts.bold : fonts.regular;
  page.drawText(label, {
    x: opts.labelX,
    y: opts.y,
    size,
    font: labelFont,
    color: rgb(0.05, 0.05, 0.05),
  });
  return drawRichParagraph(page, fonts, runs, {
    x: opts.textX,
    y: opts.y,
    maxWidth: opts.rightX - opts.textX,
    size,
    lineHeight: opts.lineHeight ?? LINE_H,
    align: opts.align ?? 'justify',
  });
}

function drawKeyValueRow(
  page: PDFPage,
  fonts: FontBundle,
  label: string,
  valueRuns: PkwtTextRun[],
  opts: {
    labelX: number;
    colonX: number;
    valueX: number;
    rightX: number;
    y: number;
    size?: number;
    lineHeight?: number;
    labelBold?: boolean;
  }
): number {
  const size = opts.size ?? BODY_SIZE;
  const ink = rgb(0.05, 0.05, 0.05);
  page.drawText(label, {
    x: opts.labelX,
    y: opts.y,
    size,
    font: opts.labelBold ? fonts.bold : fonts.regular,
    color: ink,
  });
  page.drawText(':', {
    x: opts.colonX,
    y: opts.y,
    size,
    font: fonts.regular,
    color: ink,
  });
  return drawRichParagraph(page, fonts, valueRuns, {
    x: opts.valueX,
    y: opts.y,
    maxWidth: opts.rightX - opts.valueX,
    size,
    lineHeight: opts.lineHeight ?? LINE_H,
    align: 'left',
  });
}

function drawCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  underline = false
): void {
  const w = font.widthOfTextAtSize(text, size);
  const x = (PAGE_W - w) / 2;
  const ink = rgb(0.05, 0.05, 0.05);
  page.drawText(text, { x, y, size, font, color: ink });
  if (underline) {
    page.drawLine({
      start: { x, y: y - 1.5 },
      end: { x: x + w, y: y - 1.5 },
      thickness: 0.75,
      color: ink,
    });
  }
}

function drawPasalHeader(
  page: PDFPage,
  fonts: FontBundle,
  pasalTitle: string,
  subtitle: string,
  y: number
): number {
  drawCenteredText(page, fonts.bold, pasalTitle, y, BODY_SIZE);
  drawCenteredText(page, fonts.bold, subtitle, y - 10, BODY_SIZE);
  return y - 21;
}

export async function generatePkwtPdfBytes(
  payload: PkwtDocumentPayload,
  providedAssets?: PkwtPdfAssets
): Promise<Uint8Array> {
  const assets = providedAssets ?? (await fetchDefaultPkwtAssets());
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const noLigatures = {
    liga: false,
    clig: false,
    dlig: false,
    rlig: false,
  };

  const fonts: FontBundle = {
    regular: await pdfDoc.embedFont(assets.regularFont, { features: noLigatures }),
    bold: await pdfDoc.embedFont(assets.boldFont, { features: noLigatures }),
    italic: await pdfDoc.embedFont(assets.italicFont, { features: noLigatures }),
    boldItalic: await pdfDoc.embedFont(assets.boldItalicFont, { features: noLigatures }),
  };

  const logoImg = await pdfDoc.embedPng(assets.logoPng);
  const footerImg = await pdfDoc.embedJpg(assets.footerJpg);
  const parafImg = await pdfDoc.embedPng(assets.parafPng);
  const stampP3Img = await pdfDoc.embedJpg(assets.stampP3Jpg);
  const stampP4Img = await pdfDoc.embedJpg(assets.stampP4Jpg);

  const logoW = 548;
  const logoH = logoW * (logoImg.height / logoImg.width);
  const logoX = 24;
  const logoY = PAGE_H - 18 - logoH;

  const drawChrome = (page: PDFPage, pageNumber: number) => {
    // Top Kop Surat + Divider Line
    page.drawImage(logoImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });

    // Footer Orange Bar edge-to-edge at bottom
    page.drawImage(footerImg, {
      x: -2,
      y: 0,
      width: PAGE_W + 4,
      height: 23,
    });

    // Centered Page X of 4
    const pageText = `Page ${pageNumber} of 4`;
    const ptW = fonts.regular.widthOfTextAtSize(pageText, 7.5);
    page.drawText(pageText, {
      x: (PAGE_W - ptW) / 2,
      y: 31,
      size: 7.5,
      font: fonts.regular,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Right Paraf + Paraf Signature Image
    const parafLabel = 'Paraf ______ _____ _______';
    const plW = fonts.regular.widthOfTextAtSize(parafLabel, 7.5);
    const plX = PAGE_W - 28 - plW;
    page.drawText(parafLabel, {
      x: plX,
      y: 26,
      size: 7.5,
      font: fonts.regular,
      color: rgb(0.1, 0.1, 0.1),
    });

    const pH = 38;
    const pW = pH * (parafImg.width / parafImg.height);
    page.drawImage(parafImg, {
      x: plX + 18,
      y: 23,
      width: pW,
      height: pH,
    });
  };

  // ============================================================================
  // PAGE 1
  // ============================================================================
  const p1 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawChrome(p1, 1);

  let y = CONTENT_TOP_Y - 12;
  drawCenteredText(p1, fonts.bold, 'PERJANJIAN KERJA WAKTU TERTENTU', y, 9.96, true);
  y -= 11.5;
  drawCenteredText(p1, fonts.bold, `Nomor : ${payload.pkwtNumber}`, y, BODY_SIZE);
  y -= 20;

  p1.drawText('Yang bertanda tangan di bawah ini:', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: rgb(0.05, 0.05, 0.05),
  });
  y -= 11;

  p1.drawText('I.', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: rgb(0.05, 0.05, 0.05),
  });
  y = drawKeyValueRow(p1, fonts, 'Nama lengkap', [{ text: payload.signerName, bold: true }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawKeyValueRow(p1, fonts, 'Jabatan', [{ text: payload.signerPosition }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawRichParagraph(p1, fonts, PKWT_PARTY_1_DESC, {
    x: MARGIN_LEFT,
    y,
    maxWidth: MARGIN_RIGHT - MARGIN_LEFT,
  });
  y -= 8;

  p1.drawText('II.', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: rgb(0.05, 0.05, 0.05),
  });
  y = drawKeyValueRow(p1, fonts, 'Nama lengkap', [{ text: payload.employeeName, bold: true }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawKeyValueRow(p1, fonts, 'Nomor KTP', [{ text: payload.ktpNumber }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawKeyValueRow(p1, fonts, 'Tempat/Tanggal Lahir', [{ text: payload.birthPlaceDate }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawKeyValueRow(p1, fonts, 'Umur', [{ text: `${payload.ageYears} Tahun` }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawKeyValueRow(p1, fonts, 'Jenis kelamin', [{ text: payload.gender }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawKeyValueRow(p1, fonts, 'Alamat', [{ text: payload.address }], {
    labelX: 58,
    colonX: 162,
    valueX: 170,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawRichParagraph(p1, fonts, PKWT_PARTY_2_DESC, {
    x: MARGIN_LEFT,
    y,
    maxWidth: MARGIN_RIGHT - MARGIN_LEFT,
  });
  y -= 8;

  y = drawRichParagraph(p1, fonts, PKWT_RECITAL_INTRO, {
    x: MARGIN_LEFT,
    y,
    maxWidth: MARGIN_RIGHT - MARGIN_LEFT,
  });
  y -= 2;

  for (const item of getPkwtRecitals(payload)) {
    y = drawHangingItem(p1, fonts, item.label, item.runs, {
      labelX: 46,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.8,
    });
  }
  y -= 6;

  // PASAL 1
  y = drawPasalHeader(p1, fonts, 'PASAL 1', 'PENEMPATAN DAN JANGKA WAKTU', y);
  y = drawHangingItem(
    p1,
    fonts,
    '(1)',
    [
      { text: 'SWAPRO', bold: true },
      { text: ' menerima ' },
      { text: 'PEKERJA', bold: true },
      { text: ' untuk dipekerjakan untuk jangka waktu tertentu pada :' },
    ],
    {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.8,
    }
  );
  y = drawKeyValueRow(p1, fonts, 'Bagian', [{ text: payload.departmentDivision }], {
    labelX: 90,
    colonX: 170,
    valueX: 178,
    rightX: MARGIN_RIGHT,
    y,
    lineHeight: 9.8,
  });
  y = drawKeyValueRow(p1, fonts, 'Jabatan', [{ text: payload.position }], {
    labelX: 90,
    colonX: 170,
    valueX: 178,
    rightX: MARGIN_RIGHT,
    y,
    lineHeight: 9.8,
  });
  y = drawKeyValueRow(p1, fonts, 'Lokasi Penempatan', [{ text: payload.placementLocation }], {
    labelX: 90,
    colonX: 170,
    valueX: 178,
    rightX: MARGIN_RIGHT,
    y,
    lineHeight: 9.8,
  });

  y = drawHangingItem(
    p1,
    fonts,
    '(2)',
    [
      { text: 'Jangka waktu PKWT ini mulai tanggal ' },
      { text: payload.startDateText, bold: true },
      { text: ' dan akan berakhir pada tanggal ' },
      { text: payload.endDateText, bold: true },
      { text: ' atau karena suatu sebab yang diatur di dalam PKWT ini.' },
    ],
    { labelX: MARGIN_LEFT, textX: 64, rightX: MARGIN_RIGHT, y, lineHeight: 9.8 }
  );
  y = drawHangingItem(
    p1,
    fonts,
    '(3)',
    [
      { text: 'Bagian, Jabatan, dan/atau Lokasi Penempatan ' },
      { text: 'PEKERJA', bold: true },
      { text: ' adalah hak sepenuhnya dari ' },
      { text: 'SWAPRO', bold: true },
      { text: ' dan merupakan perintah yang wajib ditaati ' },
      { text: 'PEKERJA.', bold: true },
    ],
    { labelX: MARGIN_LEFT, textX: 64, rightX: MARGIN_RIGHT, y, lineHeight: 9.8 }
  );
  y = drawHangingItem(
    p1,
    fonts,
    '(4)',
    [
      { text: 'Apabila masa jangka waktu PKWT ini telah berakhir, ' },
      { text: 'Para Pihak', bold: true },
      {
        text: ' sepakat untuk tidak akan melakukan tuntutan hukum dalam bentuk apapun di kemudian hari, baik secara perdata, pidana, maupun ketenagakerjaan.',
      },
    ],
    { labelX: MARGIN_LEFT, textX: 64, rightX: MARGIN_RIGHT, y, lineHeight: 9.8 }
  );
  y -= 4;

  // PASAL 2
  y = drawPasalHeader(p1, fonts, 'PASAL 2', 'PENGUPAHAN DAN JAMINAN SOSIAL', y);
  for (const item of PASAL_2_ITEMS) {
    y = drawHangingItem(p1, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.8,
    });
  }
  y -= 4;

  // PASAL 3 (1)-(3)
  y = drawPasalHeader(p1, fonts, 'PASAL 3', 'HAK DAN KEWAJIBAN PEKERJA', y);
  for (const item of PASAL_3_PAGE1_ITEMS) {
    y = drawHangingItem(p1, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.7,
    });
  }

  // ============================================================================
  // PAGE 2
  // ============================================================================
  const p2 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawChrome(p2, 2);

  y = CONTENT_TOP_Y;
  for (const item of PASAL_3_PAGE2_ITEMS) {
    y = drawHangingItem(p2, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.9,
    });
  }
  y -= 4;

  // PASAL 4
  y = drawPasalHeader(p2, fonts, 'PASAL 4', 'HAK DAN KEWAJIBAN SWAPRO', y);
  for (const item of PASAL_4_ITEMS) {
    y = drawHangingItem(p2, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.9,
    });
  }
  y -= 4;

  // PASAL 5
  y = drawPasalHeader(p2, fonts, 'PASAL 5', 'WAKTU KERJA DAN UANG LEMBUR', y);
  y = drawHangingItem(
    p2,
    fonts,
    '(1)',
    [{ text: 'Para Pihak', bold: true }, { text: ' sepakat Pekerjaan dilaksanakan dengan ketentuan waktu kerja (di luar kerja lembur) sebagai berikut :' }],
    { labelX: MARGIN_LEFT, textX: 64, rightX: MARGIN_RIGHT, y, lineHeight: 9.9 }
  );
  for (const sub of PASAL_5_SUBITEMS) {
    y = drawHangingItem(p2, fonts, sub.label, sub.runs, {
      labelX: 64,
      textX: 80,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.9,
    });
  }
  for (const item of PASAL_5_ITEMS) {
    y = drawHangingItem(p2, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.9,
    });
  }
  y -= 4;

  // PASAL 6
  y = drawPasalHeader(p2, fonts, 'PASAL 6', 'KERAHASIAAN', y);
  y = drawHangingItem(
    p2,
    fonts,
    '(1)',
    [
      { text: 'PEKERJA', bold: true },
      { text: ' berjanji dan wajib menjaga segala keterangan/ informasi rahasia yang berhubungan dengan ' },
      { text: 'SWAPRO', bold: true },
      { text: ' atau ' },
      { text: 'KLIEN', bold: true },
      { text: ', termasuk namun tidak terbatas pada:' },
    ],
    { labelX: MARGIN_LEFT, textX: 64, rightX: MARGIN_RIGHT, y, lineHeight: 9.9 }
  );
  for (const sub of PASAL_6_SUBITEMS) {
    y = drawHangingItem(p2, fonts, sub.label, sub.runs, {
      labelX: 64,
      textX: 80,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.9,
    });
  }
  for (const item of PASAL_6_ITEMS) {
    y = drawHangingItem(p2, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 9.9,
    });
  }
  y -= 4;

  // PASAL 7 (1)
  y = drawPasalHeader(p2, fonts, 'PASAL 7', 'HAK KEKAYAAN INTELEKTUAL', y);
  y = drawHangingItem(p2, fonts, '(1)', PASAL_7_P1, {
    labelX: MARGIN_LEFT,
    textX: 64,
    rightX: MARGIN_RIGHT,
    y,
    lineHeight: 9.9,
  });

  // ============================================================================
  // PAGE 3
  // ============================================================================
  const p3 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawChrome(p3, 3);

  y = CONTENT_TOP_Y;
  y = drawHangingItem(p3, fonts, '(2)', PASAL_7_P2, {
    labelX: MARGIN_LEFT,
    textX: 64,
    rightX: MARGIN_RIGHT,
    y,
    lineHeight: 10.0,
  });
  y -= 6;

  // PASAL 8
  y = drawPasalHeader(p3, fonts, 'PASAL 8', 'BERAKHIRNYA PERJANJIAN & DENDA', y);
  for (const item of PASAL_8_ITEMS_BEFORE_3) {
    y = drawHangingItem(p3, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 10.0,
    });
  }

  y = drawHangingItem(
    p3,
    fonts,
    '(3).',
    [
      { text: 'PKWT ini pun dapat diakhiri oleh ' },
      { text: 'SWAPRO', bold: true },
      { text: ' secara sepihak tanpa adanya ganti rugi dan/atau kompensasi apapun, apabila ' },
      { text: 'PEKERJA', bold: true },
      { text: ' melakukan salah satu dari tindakan-tindakan/keadaan sebagai berikut :' },
    ],
    { labelX: MARGIN_LEFT, textX: 64, rightX: MARGIN_RIGHT, y, lineHeight: 10.0 }
  );

  y = drawHangingItem(p3, fonts, 'a.', PASAL_8_ITEM_3_LIST, {
    labelX: 64,
    textX: 80,
    rightX: MARGIN_RIGHT,
    y,
    lineHeight: 9.85,
  });

  for (const item of PASAL_8_ITEMS_AFTER_3) {
    y = drawHangingItem(p3, fonts, item.num, item.runs, {
      labelX: MARGIN_LEFT,
      textX: 64,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: 10.0,
    });
  }

  y -= 8;
  drawCenteredText(p3, fonts.bold, 'P E N U T U P', y, BODY_SIZE);
  y -= 13;

  y = drawRichParagraph(p3, fonts, PENUTUP_RUNS, {
    x: MARGIN_LEFT,
    y,
    maxWidth: MARGIN_RIGHT - MARGIN_LEFT,
    lineHeight: 10.1,
  });

  y -= 8;
  y = drawKeyValueRow(p3, fonts, 'Ditandatangani di Kota', [{ text: payload.signingCity }], {
    labelX: MARGIN_LEFT,
    colonX: 152,
    valueX: 160,
    rightX: MARGIN_RIGHT,
    y,
  });
  y = drawKeyValueRow(p3, fonts, 'Pada tanggal', [{ text: payload.signingDateText }], {
    labelX: MARGIN_LEFT,
    colonX: 152,
    valueX: 160,
    rightX: MARGIN_RIGHT,
    y,
  });

  y -= 14;
  // Signature block Page 3 with automatic Stamp + TTD
  const p3LeftSigX = 180;
  const p3RightSigX = 434;
  const ink = rgb(0.05, 0.05, 0.05);

  const swaproTitleW = fonts.bold.widthOfTextAtSize('SWAPRO,', BODY_SIZE);
  p3.drawText('SWAPRO,', {
    x: p3LeftSigX - swaproTitleW / 2,
    y,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });
  const pekerjaTitleW = fonts.bold.widthOfTextAtSize('PEKERJA,', BODY_SIZE);
  p3.drawText('PEKERJA,', {
    x: p3RightSigX - pekerjaTitleW / 2,
    y,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });

  // Draw SWAPRO Stamp + Farid signature automatically
  const sp3W = 84;
  const sp3H = sp3W * (stampP3Img.height / stampP3Img.width);
  const sigLineY3 = Math.max(CONTENT_BOTTOM_MIN_Y + 6, y - 50);
  p3.drawImage(stampP3Img, {
    x: p3LeftSigX - sp3W / 2,
    y: sigLineY3 + 8,
    width: sp3W,
    height: sp3H,
  });

  const signerLabel = `(${payload.signerName})`;
  const slW = fonts.bold.widthOfTextAtSize(signerLabel, BODY_SIZE);
  p3.drawText(signerLabel, {
    x: p3LeftSigX - slW / 2,
    y: sigLineY3,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });

  const workerLabel = `(${payload.employeeName})`;
  const wlW = fonts.bold.widthOfTextAtSize(workerLabel, BODY_SIZE);

  let embeddedEmpSig: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (payload.employeeSignatureDataUrl?.startsWith('data:image/')) {
    try {
      const base64Part = payload.employeeSignatureDataUrl.split(',')[1] ?? '';
      const binaryStr = atob(base64Part);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      embeddedEmpSig = payload.employeeSignatureDataUrl.includes('image/jpeg')
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);
    } catch {
      embeddedEmpSig = null;
    }
  }

  if (embeddedEmpSig) {
    const empSigH = 30;
    const empSigW = Math.min(96, empSigH * (embeddedEmpSig.width / Math.max(1, embeddedEmpSig.height)));
    p3.drawImage(embeddedEmpSig, {
      x: p3RightSigX - empSigW / 2,
      y: sigLineY3 + 10,
      width: empSigW,
      height: empSigH,
    });
  }

  p3.drawText(workerLabel, {
    x: p3RightSigX - wlW / 2,
    y: sigLineY3,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });

  // ============================================================================
  // PAGE 4 (LAMPIRAN)
  // ============================================================================
  const p4 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawChrome(p4, 4);

  y = CONTENT_TOP_Y - 22;
  p4.drawText('Lampiran :', {
    x: MARGIN_LEFT,
    y,
    size: 8.5,
    font: fonts.bold,
    color: ink,
  });
  y -= 20;

  const p4ColonX = 200;
  const p4ValueX = 208;
  const p4RowH = 14;

  const topRows: Array<{ label: string; runs: PkwtTextRun[] }> = [
    { label: 'PKWT Nomor', runs: [{ text: payload.pkwtNumber, bold: true }] },
    { label: 'Nama Lengkap', runs: [{ text: payload.employeeName, bold: true }] },
    { label: 'Nomor Kartu Tanda Penduduk (KTP)', runs: [{ text: payload.ktpNumber }] },
    { label: 'Tempat / Tanggal Lahir', runs: [{ text: payload.birthPlaceDate }] },
    { label: 'Jenis Kelamin', runs: [{ text: payload.gender }] },
    { label: 'Alamat', runs: [{ text: payload.address }] },
    { label: 'Nomor Induk Karyawan ( NIK )', runs: [{ text: payload.employeeInternalId }] },
    { label: 'Jabatan', runs: [{ text: payload.position }] },
    { label: 'Penempatan', runs: [{ text: payload.placementShort }] },
    {
      label: 'Jangka Waktu PKWT',
      runs: [{ text: `${payload.startDateText} s/d ${payload.endDateText}` }],
    },
    { label: 'Tanggal Mulai Bekerja', runs: [{ text: payload.startDateText }] },
  ];

  for (const row of topRows) {
    y = drawKeyValueRow(p4, fonts, row.label, row.runs, {
      labelX: MARGIN_LEFT,
      colonX: p4ColonX,
      valueX: p4ValueX,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: p4RowH,
    });
  }

  y -= 6;
  p4.drawText('Pendapatan/Upah', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: ink,
  });
  p4.drawText(':', {
    x: p4ColonX,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: ink,
  });
  y -= p4RowH;

  const formattedSalary = formatRupiahDot(payload.monthlySalary);
  const terbilangSalary = numberToIndonesianWords(payload.monthlySalary);

  const incomeRows: Array<{ label: string; value: string }> = [
    {
      label: 'a. Gaji Pokok',
      value: `${formattedSalary} ( ${terbilangSalary} )`,
    },
    {
      label: 'b. Insentif (jika ada)',
      value: payload.incentiveClientNote,
    },
    {
      label: 'c. Biaya lembur (jika ada)',
      value: payload.overtimeClientNote,
    },
    {
      label: 'd. BPJS Ketenagakerjaan',
      value: '4,24 % (empat koma dua puluh empat persen) dari Gaji Pokok per bulan.',
    },
    {
      label: 'e. BPJS Jaminan Pensiun',
      value: '2 % (dua persen) dari Gaji Pokok per bulan.',
    },
    {
      label: 'f. BPJS Kesehatan',
      value: '4 % (empat persen) dari Gaji Pokok per bulan.',
    },
    {
      label: 'g. THR gross',
      value: 'Sesuai dengan peraturan perundang-undangan yang berlaku.',
    },
  ];

  for (const row of incomeRows) {
    y = drawKeyValueRow(p4, fonts, row.label, [{ text: row.value }], {
      labelX: 60,
      colonX: p4ColonX,
      valueX: p4ValueX,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: p4RowH,
    });
  }

  y -= 6;
  p4.drawText('Potongan-potongan', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: ink,
  });
  p4.drawText(':', {
    x: p4ColonX,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: ink,
  });
  y -= p4RowH;

  const deductionRows: Array<{ label: string; value: string }> = [
    {
      label: 'a. BPJS Ketenagakerjaan',
      value: '2 % (dua persen) dari Gaji Pokok per bulan.',
    },
    {
      label: 'b. BPJS Jaminan Pensiun',
      value: '1 % (satu persen) dari Gaji Pokok per bulan.',
    },
    {
      label: 'c. BPJS Kesehatan',
      value: '1 % (satu persen) dari Gaji Pokok per bulan.',
    },
    {
      label: 'd. Pajak Penghasilan (PPh) Pasal 21',
      value: 'Sesuai Ketentuan Undang-Undang Perpajakan yang berlaku.',
    },
  ];

  for (const row of deductionRows) {
    y = drawKeyValueRow(p4, fonts, row.label, [{ text: row.value }], {
      labelX: 60,
      colonX: p4ColonX,
      valueX: p4ValueX,
      rightX: MARGIN_RIGHT,
      y,
      lineHeight: p4RowH,
    });
  }

  y -= 6;
  p4.drawText('Lampiran ini merupakan bagian yang tidak terpisahkan dari PKWT.', {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: ink,
  });
  y -= 18;
  p4.drawText(`${payload.signingCity}, ${payload.signingDateText}`, {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font: fonts.regular,
    color: ink,
  });
  y -= 14;

  // Signature block Page 4 with automatic Stamp + TTD
  const p4LeftSigX = 162;
  const p4RightSigX = 406;

  p4.drawText('SWAPRO,', {
    x: p4LeftSigX - swaproTitleW / 2,
    y,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });
  p4.drawText('PEKERJA,', {
    x: p4RightSigX - pekerjaTitleW / 2,
    y,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });

  const sp4W = 92;
  const sp4H = sp4W * (stampP4Img.height / stampP4Img.width);
  const sigLineY4 = Math.max(CONTENT_BOTTOM_MIN_Y + 8, y - 62);
  p4.drawImage(stampP4Img, {
    x: p4LeftSigX - sp4W / 2,
    y: sigLineY4 + 8,
    width: sp4W,
    height: sp4H,
  });

  p4.drawText(signerLabel, {
    x: p4LeftSigX - slW / 2,
    y: sigLineY4,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });
  if (embeddedEmpSig) {
    const empSigH4 = 32;
    const empSigW4 = Math.min(104, empSigH4 * (embeddedEmpSig.width / Math.max(1, embeddedEmpSig.height)));
    p4.drawImage(embeddedEmpSig, {
      x: p4RightSigX - empSigW4 / 2,
      y: sigLineY4 + 10,
      width: empSigW4,
      height: empSigH4,
    });
  }

  p4.drawText(workerLabel, {
    x: p4RightSigX - wlW / 2,
    y: sigLineY4,
    size: BODY_SIZE,
    font: fonts.bold,
    color: ink,
  });

  return pdfDoc.save();
}

export function buildPkwtDownloadFilename(payload: PkwtDocumentPayload): string {
  const safeName = payload.employeeName
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_') || 'Karyawan';
  return `${safeName}_PKWT_NEW_HIRE.pdf`;
}

export function encodePkwtPayloadBase64Url(payload: PkwtDocumentPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildPkwtServerDownloadUrl(payload: PkwtDocumentPayload): string {
  const encoded = encodePkwtPayloadBase64Url(payload);
  return `/api/pkwt/download?d=${encoded}`;
}

export async function createPkwtPdfBlob(payload: PkwtDocumentPayload): Promise<Blob> {
  const pdfBytes = await generatePkwtPdfBytes(payload);
  const filename = buildPkwtDownloadFilename(payload);
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  if (typeof File !== 'undefined') {
    return new File([arrayBuffer], filename, { type: 'application/pdf' });
  }
  return new Blob([arrayBuffer], { type: 'application/pdf' });
}

export function triggerBlobPdfDownload(blob: Blob, filename: string): void {
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  const pdfBlob =
    typeof File !== 'undefined' && !(blob instanceof File)
      ? new File([blob], safeFilename, { type: 'application/pdf' })
      : blob;
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadPkwtPdf(payload: PkwtDocumentPayload): Promise<Uint8Array> {
  const pdfBytes = await generatePkwtPdfBytes(payload);
  const filename = buildPkwtDownloadFilename(payload);
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  const blob =
    typeof File !== 'undefined'
      ? new File([arrayBuffer], filename, { type: 'application/pdf' })
      : new Blob([arrayBuffer], { type: 'application/pdf' });
  triggerBlobPdfDownload(blob, filename);
  return pdfBytes;
}
