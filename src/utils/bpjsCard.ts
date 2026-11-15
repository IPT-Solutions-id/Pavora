export function formatBpjsKesDisplay(raw?: string): string {
  const digits = (raw ?? '').replace(/[^0-9]/g, '');
  if (!digits) return 'Belum Terdaftar';
  return digits.replace(/(.{4})(?=.)/g, '$1 ');
}

export function formatBpjsTkDisplay(raw?: string): string {
  const clean = (raw ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!clean) return 'Belum Terdaftar';
  return clean.replace(/(.{4})(?=.)/g, '$1 ');
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildDigitalBpjsCardSvgDataUrl(
  kind: 'kesehatan' | 'ketenagakerjaan',
  info: {
    fullName: string;
    employeeCode: string;
    nik: string;
    cardNumber: string;
    birthDateFormatted: string;
    entityName: string;
    joinDateFormatted: string;
  }
): string {
  const isKes = kind === 'kesehatan';
  const cardTitle = isKes ? 'KARTU PESERTA JKN - KIS' : 'KARTU PESERTA BPJS KETENAGAKERJAAN';
  const programSubtitle = isKes
    ? 'BPJS KESEHATAN · PPU BADAN USAHA'
    : 'BPJAMSOSTEK · JHT · JKK · JKM · JP';
  const formattedNo = isKes
    ? formatBpjsKesDisplay(info.cardNumber)
    : formatBpjsTkDisplay(info.cardNumber);
  const bgStart = isKes ? '#0D6E52' : '#102B69';
  const bgEnd = isKes ? '#16A36A' : '#1468E8';
  const accentStrip = isKes ? '#A7F3D0' : '#FF7A1A';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgStart}"/>
      <stop offset="100%" stop-color="${bgEnd}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="380" rx="16" fill="url(#cardBg)"/>
  <rect x="0" y="68" width="640" height="4" fill="${accentStrip}" opacity="0.85"/>
  <text x="32" y="38" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(cardTitle)}</text>
  <text x="32" y="56" fill="#E2E8F0" font-family="Arial, sans-serif" font-size="11" font-weight="600">${escapeXml(programSubtitle)}</text>
  <text x="608" y="40" text-anchor="end" fill="#FFFFFF" font-family="monospace" font-size="12" font-weight="700">${escapeXml(info.employeeCode)}</text>
  <text x="32" y="110" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="11">NOMOR KARTU KEPESERTAAN</text>
  <text x="32" y="142" fill="#FFFFFF" font-family="monospace" font-size="26" font-weight="700" letter-spacing="1.5">${escapeXml(formattedNo)}</text>
  <text x="32" y="186" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="11">NAMA PESERTA</text>
  <text x="32" y="210" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="19" font-weight="700">${escapeXml(info.fullName.toUpperCase())}</text>
  <text x="32" y="252" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="11">NIK KTP</text>
  <text x="32" y="272" fill="#FFFFFF" font-family="monospace" font-size="15" font-weight="700">${escapeXml(info.nik)}</text>
  <text x="270" y="252" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="11">TANGGAL LAHIR</text>
  <text x="270" y="272" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="14" font-weight="700">${escapeXml(info.birthDateFormatted)}</text>
  <text x="450" y="252" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="11">TERHITUNG MULAI</text>
  <text x="450" y="272" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="14" font-weight="700">${escapeXml(info.joinDateFormatted)}</text>
  <rect x="28" y="302" width="584" height="50" rx="8" fill="#000000" fill-opacity="0.2"/>
  <text x="44" y="324" fill="#CBD5E1" font-family="Arial, sans-serif" font-size="10">BADAN USAHA / PENEMPATAN</text>
  <text x="44" y="342" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="13" font-weight="700">${escapeXml(info.entityName)}</text>
  <text x="596" y="335" text-anchor="end" fill="${accentStrip}" font-family="Arial, sans-serif" font-size="12" font-weight="700">${info.cardNumber ? 'AKTIF TERDAFTAR' : 'BELUM TERDAFTAR'}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
