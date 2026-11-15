import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Lock,
  PenTool,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  ContractRecord,
  EmployeeRecord,
  SystemSettingsConfig,
} from '../../data/masterAdminData';
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
  PkwtDocumentPayload,
  PkwtTextRun,
  buildDefaultPkwtPayload,
  buildReferenceSamplePkwtPayload,
  formatRupiahDot,
  getPkwtRecitals,
  numberToIndonesianWords,
} from '../../utils/pkwtDocument';
import {
  buildPkwtDownloadFilename,
  createPkwtPdfBlob,
  downloadPkwtPdf,
} from '../../utils/pkwtPdfGenerator';
import {
  isContractSignedLocked,
  isPkwtModalReadOnly,
} from '../../utils/pkwtLifecycle';
import { DigitalSignaturePad } from '../shared/DigitalSignaturePad';

interface PkwtDocumentModalProps {
  contract: ContractRecord;
  employee?: EmployeeRecord;
  settings?: Pick<
    SystemSettingsConfig,
    'companyName' | 'pkwtSignatoryName' | 'pkwtSignatoryTitle'
  >;
  readOnly?: boolean;
  canSignNow?: boolean;
  savedSignatureDataUrl?: string;
  onSignContract?: (signatureDataUrl: string) => { ok: boolean; message: string } | void;
  onGoToSignatureMenu?: () => void;
  onClose: () => void;
}

const FONT_STACK = "'Carlito', Calibri, Arial, sans-serif";

function renderRuns(runs: PkwtTextRun[]): React.ReactNode {
  return runs.map((run, idx) => {
    const style: React.CSSProperties = {
      fontWeight: run.bold ? 700 : 400,
      fontStyle: run.italic ? 'italic' : 'normal',
    };
    return (
      <span key={idx} style={style}>
        {run.text}
      </span>
    );
  });
}

interface A4SheetChromeProps {
  pageNumber: number;
  children: React.ReactNode;
}

const A4SheetChrome: React.FC<A4SheetChromeProps> = ({ pageNumber, children }) => (
  <article
    data-testid={`pkwt-preview-page-${pageNumber}`}
    style={{
      fontFamily: FONT_STACK,
      width: '595.44pt',
      height: '841.68pt',
      fontSize: '8.04pt',
      lineHeight: '10.15pt',
      color: '#0D0D0D',
    }}
    className="relative bg-white shadow-md mx-auto shrink-0 overflow-hidden select-text"
  >
    {/* Kop Surat Top */}
    <div style={{ padding: '18pt 24pt 0 24pt' }}>
      <img
        src="/assets/pkwt/swapro-logo.png"
        alt="PT. SWAPRO INTERNATIONAL Kop Surat"
        style={{ width: '548pt', height: 'auto', display: 'block' }}
      />
    </div>

    {/* Document Body */}
    <div style={{ padding: '8pt 42pt 58pt 42pt' }}>{children}</div>

    {/* Footer Chrome: Page X of 4 + Paraf + Orange Gradient Bar */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '52pt',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '30pt',
          textAlign: 'center',
          fontSize: '7.5pt',
          color: '#1A1A1A',
        }}
      >
        Page {pageNumber} of 4
      </div>

      <div
        style={{
          position: 'absolute',
          right: '28pt',
          bottom: '26pt',
          fontSize: '7.5pt',
          color: '#1A1A1A',
        }}
      >
        <span>Paraf ______ _____ _______</span>
        <img
          src="/assets/pkwt/swapro-paraf.png"
          alt="Paraf SWAPRO"
          style={{
            position: 'absolute',
            left: '18pt',
            bottom: '-2pt',
            height: '38pt',
            width: 'auto',
          }}
        />
      </div>

      <img
        src="/assets/pkwt/footer-bar.jpg"
        alt=""
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '595.44pt',
          height: '23pt',
          objectFit: 'fill',
          display: 'block',
        }}
      />
    </div>
  </article>
);

export const PkwtDocumentModal: React.FC<PkwtDocumentModalProps> = ({
  contract,
  employee,
  settings,
  readOnly = false,
  canSignNow = false,
  savedSignatureDataUrl,
  onSignContract,
  onGoToSignatureMenu,
  onClose,
}) => {
  const [payload, setPayload] = useState<PkwtDocumentPayload>(() =>
    buildDefaultPkwtPayload(contract, employee, settings)
  );
  const [readyBlobUrl, setReadyBlobUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [modalSigMode, setModalSigMode] = useState<'saved' | 'draw'>(() =>
    savedSignatureDataUrl ? 'saved' : 'draw'
  );
  const [modalDrawnSig, setModalDrawnSig] = useState('');
  const [modalConsent, setModalConsent] = useState(false);

  const matchingHistory =
    employee?.contractHistory?.find((h) => h.contractNumber === contract.contractNumber) ??
    employee?.contractHistory?.[employee.contractHistory.length - 1];

  const isSignedLocked =
    isContractSignedLocked(matchingHistory?.signatureStatus) ||
    Boolean(payload.employeeSignatureDataUrl);

  const effectiveReadOnly = isPkwtModalReadOnly({
    viewerRole: readOnly ? 'employee' : 'admin',
    signatureStatus: isSignedLocked ? 'Sudah TTD Digital' : matchingHistory?.signatureStatus,
  });

  useEffect(() => {
    setPayload(buildDefaultPkwtPayload(contract, employee, settings));
  }, [
    contract.contractNumber,
    contract.startDate,
    contract.endDate,
    employee?.id,
    matchingHistory?.employeeSignatureDataUrl,
    matchingHistory?.signatureStatus,
    settings?.companyName,
    settings?.pkwtSignatoryName,
    settings?.pkwtSignatoryTitle,
  ]);

  const downloadFilename = useMemo(() => buildPkwtDownloadFilename(payload), [payload]);

  useEffect(() => {
    let cancelled = false;
    let generatedUrl: string | null = null;
    setReadyBlobUrl(null);
    const timer = setTimeout(() => {
      createPkwtPdfBlob(payload)
        .then((blob) => {
          if (cancelled) return;
          generatedUrl = URL.createObjectURL(blob);
          setReadyBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return generatedUrl;
          });
        })
        .catch(() => {
          // Fallback handled in click handler
        });
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload]);

  useEffect(() => {
    return () => {
      if (readyBlobUrl) {
        URL.revokeObjectURL(readyBlobUrl);
      }
    };
  }, [readyBlobUrl]);

  const updateField = <K extends keyof PkwtDocumentPayload>(
    key: K,
    value: PkwtDocumentPayload[K]
  ) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    setStatusMessage(null);
    if (readyBlobUrl) {
      // Synchronous prebuilt in-memory Blob/File link download (never hits server proxy / Cookie Check)
      setStatusMessage({
        type: 'success',
        text: `File PDF berhasil diunduh (${downloadFilename}).`,
      });
      return;
    }

    e.preventDefault();
    setIsDownloading(true);
    try {
      await downloadPkwtPdf(payload);
      setStatusMessage({
        type: 'success',
        text: `File PDF berhasil diunduh (${downloadFilename}).`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat file PDF PKWT.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedSalary = formatRupiahDot(payload.monthlySalary);
  const terbilangSalary = numberToIndonesianWords(payload.monthlySalary);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/65 p-2 sm:p-4 print:static print:bg-white print:p-0 print:block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pkwt-modal-title"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-[1360px] h-[94vh] flex flex-col overflow-hidden print:border-0 print:rounded-none print:max-w-none print:h-auto print:overflow-visible print:block">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F5F7FA] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[4px] bg-[#102B69] text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="pkwt-modal-title" className="text-sm sm:text-base font-bold text-[#102B69] truncate">
                Pratinjau &amp; Download Dokumen PKWT 1:1 (4 Halaman A4)
              </h2>
              <p className="text-xs text-[#64748B] truncate">
                {payload.employeeName} · {payload.pkwtNumber} · Stempel, Paraf &amp; TTD SWAPRO Otomatis Terpasang
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!effectiveReadOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setPayload(buildDefaultPkwtPayload(contract, employee, settings))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Data Karyawan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayload(buildReferenceSamplePkwtPayload())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#1468E8]/30 rounded-[4px] cursor-pointer"
                >
                  <span>Preset Referensi PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cetak / Save PDF</span>
            </button>

            <a
              href={readyBlobUrl ?? '#'}
              download={downloadFilename}
              onClick={handleDownloadClick}
              data-testid="download-pkwt-pdf-btn"
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#FF7A1A] hover:bg-[#E0650E] rounded-[4px] cursor-pointer ${
                isDownloading || !readyBlobUrl ? 'opacity-75' : ''
              }`}
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {isDownloading ? 'Mengunduh PDF...' : 'Download PDF PKWT'}
              </span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau PKWT"
              className="p-1.5 text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Download Notification */}
        {statusMessage && (
          <div
            role="status"
            className={`px-5 py-2 text-xs font-semibold flex items-center gap-2 border-b shrink-0 print:hidden ${
              statusMessage.type === 'success'
                ? 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]'
                : 'bg-[#FEF2F2] text-[#DC3545] border-[#FECACA]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Split Body: Left Panel (Read-Only Lock / Sign / Editable Fields) | Right Live 4-Page A4 Preview */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden print:block print:overflow-visible">
          {effectiveReadOnly ? (
            <aside
              data-testid="pkwt-readonly-sidebar"
              className="w-full lg:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] bg-white overflow-y-auto p-4 space-y-4 max-h-[42vh] lg:max-h-none print:hidden"
            >
              <div className="p-3.5 rounded-[6px] border border-[#E2E8F0] bg-[#F5F7FA] space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#102B69]">
                  <Lock className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                  <span>
                    {isSignedLocked
                      ? 'Arsip PKWT Terkunci Permanen'
                      : 'Mode Baca Dokumen Resmi PKWT'}
                  </span>
                </p>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  {isSignedLocked
                    ? 'Dokumen ini telah selesai ditandatangani secara resmi sehingga isi surat & tanda tangan terkunci permanen (hanya dapat dilihat dan diunduh PDF-nya, tidak dapat diedit).'
                    : 'Isi perjanjian kerja diterbitkan oleh HR / Super Admin dan tidak dapat diubah oleh karyawan. Silakan baca seluruh pasal (Hal. 1–4) sebelum menyetujui & menandatangani.'}
                </p>
              </div>

              <dl className="space-y-2 text-xs border border-[#E2E8F0] rounded-[6px] p-3.5 bg-white">
                <div>
                  <dt className="text-[#64748B]">Nomor Kontrak</dt>
                  <dd className="font-mono font-bold text-[#102B69] mt-0.5">{payload.pkwtNumber}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Periode Berlaku</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5 tabular-nums">
                    {payload.startDateText} s/d {payload.endDateText}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Penempatan &amp; Jabatan</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {payload.position} · {payload.placementShort}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Status Tanda Tangan</dt>
                  <dd
                    className={`font-bold mt-0.5 ${
                      isSignedLocked ? 'text-[#16A36A]' : 'text-[#B87D00]'
                    }`}
                  >
                    {isSignedLocked
                      ? `Sudah TTD Digital${payload.employeeSignedDateText ? ` (${payload.employeeSignedDateText})` : ''}`
                      : 'Menunggu TTD Karyawan'}
                  </dd>
                </div>
              </dl>

              {canSignNow && !isSignedLocked && onSignContract && (
                <div className="p-4 border border-[#1468E8]/35 bg-[#F8FAFC] rounded-[6px] space-y-3 text-xs">
                  <h3 className="font-bold text-[#102B69] flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                    <span>Bubuhkan Tanda Tangan PKWT</span>
                  </h3>

                  {savedSignatureDataUrl && (
                    <div className="inline-flex p-1 bg-white border border-[#E2E8F0] rounded-[4px] w-full">
                      <button
                        type="button"
                        onClick={() => setModalSigMode('saved')}
                        className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded-[3px] cursor-pointer ${
                          modalSigMode === 'saved'
                            ? 'bg-[#1468E8] text-white'
                            : 'text-[#64748B] hover:text-[#102B69]'
                        }`}
                      >
                        Pakai TTD Tersimpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalSigMode('draw')}
                        className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded-[3px] cursor-pointer ${
                          modalSigMode === 'draw'
                            ? 'bg-[#1468E8] text-white'
                            : 'text-[#64748B] hover:text-[#102B69]'
                        }`}
                      >
                        Gores Ulang
                      </button>
                    </div>
                  )}

                  {modalSigMode === 'saved' && savedSignatureDataUrl ? (
                    <div className="p-3 bg-white border border-[#E2E8F0] rounded-[4px] space-y-1.5">
                      <p className="text-[11px] text-[#64748B] font-semibold">
                        Spesimen TTD Tersimpan (dari Menu TTD):
                      </p>
                      <img
                        src={savedSignatureDataUrl}
                        alt={`TTD tersimpan ${payload.employeeName}`}
                        className="h-20 w-full object-contain bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-1"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <DigitalSignaturePad
                        value={modalDrawnSig}
                        onChange={setModalDrawnSig}
                        signerLabel={payload.employeeName}
                      />
                      {onGoToSignatureMenu && !savedSignatureDataUrl && (
                        <button
                          type="button"
                          onClick={onGoToSignatureMenu}
                          className="text-[11px] font-semibold text-[#1468E8] hover:underline cursor-pointer"
                        >
                          Atau atur TTD permanen lewat Menu TTD →
                        </button>
                      )}
                    </div>
                  )}

                  <label className="inline-flex items-start gap-2 text-[#172033] font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalConsent}
                      onChange={(e) => setModalConsent(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Saya sudah membaca seluruh pasal PKWT (Hal. 1–4) dan menyetujui perjanjian kerja ini.
                    </span>
                  </label>

                  <button
                    type="button"
                    data-testid="pkwt-modal-sign-submit"
                    onClick={() => {
                      const activeSig =
                        modalSigMode === 'saved' && savedSignatureDataUrl
                          ? savedSignatureDataUrl
                          : modalDrawnSig;
                      if (!activeSig) {
                        setStatusMessage({
                          type: 'error',
                          text: 'Siapkan TTD terlebih dahulu (pilih TTD tersimpan atau goreskan pada kanvas).',
                        });
                        return;
                      }
                      if (!modalConsent) {
                        setStatusMessage({
                          type: 'error',
                          text: 'Centang pernyataan persetujuan isi PKWT terlebih dahulu.',
                        });
                        return;
                      }
                      const res = onSignContract(activeSig);
                      if (!res || res.ok) {
                        setPayload((prev) => ({
                          ...prev,
                          employeeSignatureDataUrl: activeSig,
                        }));
                        setStatusMessage({
                          type: 'success',
                          text:
                            res?.message ??
                            'PKWT berhasil ditandatangani, tersimpan permanen & terkunci (read-only).',
                        });
                      } else {
                        setStatusMessage({ type: 'error', text: res.message });
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#102B69] rounded-[4px] cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Setujui &amp; Tandatangani PKWT</span>
                  </button>
                </div>
              )}
            </aside>
          ) : (
            <aside className="w-full lg:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] bg-white overflow-y-auto p-4 space-y-4 max-h-[38vh] lg:max-h-none print:hidden">
              <div>
                <h3 className="text-xs font-bold text-[#102B69] pb-1.5 border-b border-[#E2E8F0]">
                  Data Dinamis Surat &amp; Identitas (Hal. 1, 3, 4)
                </h3>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Perubahan langsung memperbarui pratinjau 4 halaman dan hasil file PDF yang diunduh.
                </p>
              </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172033] mb-1">Nomor PKWT</label>
                <input
                  type="text"
                  value={payload.pkwtNumber}
                  onChange={(e) => updateField('pkwtNumber', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={payload.employeeName}
                    onChange={(e) => updateField('employeeName', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Nomor KTP</label>
                  <input
                    type="text"
                    value={payload.ktpNumber}
                    onChange={(e) => updateField('ktpNumber', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-[#172033] mb-1">
                    Tempat / Tanggal Lahir
                  </label>
                  <input
                    type="text"
                    value={payload.birthPlaceDate}
                    onChange={(e) => updateField('birthPlaceDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Umur (Thn)</label>
                  <input
                    type="number"
                    min={17}
                    max={70}
                    value={payload.ageYears}
                    onChange={(e) => updateField('ageYears', Number(e.target.value) || 17)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Jenis Kelamin</label>
                  <select
                    value={payload.gender}
                    onChange={(e) =>
                      updateField('gender', e.target.value as 'Laki-Laki' | 'Perempuan')
                    }
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  >
                    <option value="Laki-Laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    NIK Karyawan (Hal. 4)
                  </label>
                  <input
                    type="text"
                    value={payload.employeeInternalId}
                    onChange={(e) => updateField('employeeInternalId', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={payload.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Bagian</label>
                  <input
                    type="text"
                    value={payload.departmentDivision}
                    onChange={(e) => updateField('departmentDivision', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={payload.position}
                    onChange={(e) => updateField('position', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Nama Legal Klien (Poin B)
                </label>
                <input
                  type="text"
                  value={payload.clientLegalName}
                  onChange={(e) => updateField('clientLegalName', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Lokasi Penempatan (Pasal 1)
                </label>
                <textarea
                  rows={2}
                  value={payload.placementLocation}
                  onChange={(e) => updateField('placementLocation', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Penempatan Singkat (Lampiran Hal. 4)
                </label>
                <input
                  type="text"
                  value={payload.placementShort}
                  onChange={(e) => updateField('placementShort', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Tanggal Mulai PKWT
                  </label>
                  <input
                    type="text"
                    value={payload.startDateText}
                    onChange={(e) => updateField('startDateText', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Tanggal Berakhir PKWT
                  </label>
                  <input
                    type="text"
                    value={payload.endDateText}
                    onChange={(e) => updateField('endDateText', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold text-[#102B69] pt-2 pb-1 border-b border-[#E2E8F0]">
                Penandatanganan &amp; Lampiran Upah (Hal. 3 &amp; 4)
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Kota TTD</label>
                  <input
                    type="text"
                    value={payload.signingCity}
                    onChange={(e) => updateField('signingCity', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">Tanggal TTD</label>
                  <input
                    type="text"
                    value={payload.signingDateText}
                    onChange={(e) => updateField('signingDateText', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Penandatangan SWAPRO
                  </label>
                  <input
                    type="text"
                    value={payload.signerName}
                    onChange={(e) => updateField('signerName', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172033] mb-1">
                    Jabatan Penandatangan
                  </label>
                  <input
                    type="text"
                    value={payload.signerPosition}
                    onChange={(e) => updateField('signerPosition', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Gaji Pokok Bulanan (Angka)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={payload.monthlySalary}
                  onChange={(e) =>
                    updateField('monthlySalary', Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums focus:outline-none focus:border-[#1468E8]"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Terbilang: {formattedSalary} ({terbilangSalary})
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Keterangan Insentif (Hal. 4 poin b)
                </label>
                <input
                  type="text"
                  value={payload.incentiveClientNote}
                  onChange={(e) => updateField('incentiveClientNote', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1">
                  Keterangan Lembur (Hal. 4 poin c)
                </label>
                <input
                  type="text"
                  value={payload.overtimeClientNote}
                  onChange={(e) => updateField('overtimeClientNote', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              </div>
            </div>
            </aside>
          )}

          {/* Right Panel: Exact 4-Page A4 Document Preview */}
          <div
            id="pkwt-print-sheets"
            className="flex-1 bg-[#CBD5E1] overflow-auto p-4 sm:p-6 space-y-6 print:bg-white print:p-0 print:space-y-0 print:overflow-visible"
          >
            {/* ==================== PAGE 1 ==================== */}
            <A4SheetChrome pageNumber={1}>
              <div className="text-center" style={{ marginBottom: '10pt' }}>
                <div
                  style={{ fontSize: '9.96pt', fontWeight: 700, textDecoration: 'underline' }}
                >
                  PERJANJIAN KERJA WAKTU TERTENTU
                </div>
                <div style={{ fontWeight: 700 }}>Nomor : {payload.pkwtNumber}</div>
              </div>

              <div style={{ marginBottom: '3pt' }}>Yang bertanda tangan di bawah ini:</div>

              {/* Pihak I */}
              <div className="flex">
                <div style={{ width: '21pt', flexShrink: 0 }}>I.</div>
                <div className="flex-1">
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Nama lengkap</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div style={{ fontWeight: 700 }}>{payload.signerName}</div>
                  </div>
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Jabatan</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div>{payload.signerPosition}</div>
                  </div>
                </div>
              </div>
              <p className="text-justify" style={{ marginBottom: '6pt' }}>
                {renderRuns(PKWT_PARTY_1_DESC)}
              </p>

              {/* Pihak II */}
              <div className="flex">
                <div style={{ width: '21pt', flexShrink: 0 }}>II.</div>
                <div className="flex-1">
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Nama lengkap</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div style={{ fontWeight: 700 }}>{payload.employeeName}</div>
                  </div>
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Nomor KTP</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div>{payload.ktpNumber}</div>
                  </div>
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Tempat/Tanggal Lahir</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div>{payload.birthPlaceDate}</div>
                  </div>
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Umur</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div>{payload.ageYears} Tahun</div>
                  </div>
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Jenis kelamin</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div>{payload.gender}</div>
                  </div>
                  <div className="flex">
                    <div style={{ width: '89pt', flexShrink: 0 }}>Alamat</div>
                    <div style={{ width: '10pt', flexShrink: 0 }}>:</div>
                    <div>{payload.address}</div>
                  </div>
                </div>
              </div>
              <p className="text-justify" style={{ marginBottom: '6pt' }}>
                {renderRuns(PKWT_PARTY_2_DESC)}
              </p>

              <p className="text-justify" style={{ marginBottom: '2pt' }}>
                {renderRuns(PKWT_RECITAL_INTRO)}
              </p>
              <div style={{ marginBottom: '6pt' }}>
                {getPkwtRecitals(payload).map((item) => (
                  <div key={item.label} className="flex">
                    <div style={{ width: '18pt', paddingLeft: '4pt', flexShrink: 0 }}>
                      {item.label}
                    </div>
                    <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                  </div>
                ))}
              </div>

              {/* PASAL 1 */}
              <div className="text-center font-bold" style={{ marginTop: '4pt', marginBottom: '2pt' }}>
                <div>PASAL 1</div>
                <div>PENEMPATAN DAN JANGKA WAKTU</div>
              </div>
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(1)</div>
                <div className="flex-1">
                  <div>
                    <span className="font-bold">SWAPRO</span> menerima{' '}
                    <span className="font-bold">PEKERJA</span> untuk dipekerjakan untuk jangka
                    waktu tertentu pada :
                  </div>
                  <div style={{ paddingLeft: '26pt' }}>
                    <div className="flex">
                      <div style={{ width: '80pt', flexShrink: 0 }}>Bagian</div>
                      <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                      <div>{payload.departmentDivision}</div>
                    </div>
                    <div className="flex">
                      <div style={{ width: '80pt', flexShrink: 0 }}>Jabatan</div>
                      <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                      <div>{payload.position}</div>
                    </div>
                    <div className="flex">
                      <div style={{ width: '80pt', flexShrink: 0 }}>Lokasi Penempatan</div>
                      <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                      <div className="flex-1">{payload.placementLocation}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(2)</div>
                <div className="flex-1 text-justify">
                  Jangka waktu PKWT ini mulai tanggal{' '}
                  <span className="font-bold">{payload.startDateText}</span> dan akan berakhir pada
                  tanggal <span className="font-bold">{payload.endDateText}</span> atau karena suatu
                  sebab yang diatur di dalam PKWT ini.
                </div>
              </div>
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(3)</div>
                <div className="flex-1 text-justify">
                  Bagian, Jabatan, dan/atau Lokasi Penempatan{' '}
                  <span className="font-bold">PEKERJA</span> adalah hak sepenuhnya dari{' '}
                  <span className="font-bold">SWAPRO</span> dan merupakan perintah yang wajib
                  ditaati <span className="font-bold">PEKERJA.</span>
                </div>
              </div>
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(4)</div>
                <div className="flex-1 text-justify">
                  Apabila masa jangka waktu PKWT ini telah berakhir,{' '}
                  <span className="font-bold">Para Pihak</span> sepakat untuk tidak akan melakukan
                  tuntutan hukum dalam bentuk apapun di kemudian hari, baik secara perdata, pidana,
                  maupun ketenagakerjaan.
                </div>
              </div>

              {/* PASAL 2 */}
              <div className="text-center font-bold" style={{ marginTop: '4pt', marginBottom: '2pt' }}>
                <div>PASAL 2</div>
                <div>PENGUPAHAN DAN JAMINAN SOSIAL</div>
              </div>
              {PASAL_2_ITEMS.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}

              {/* PASAL 3 (1)-(3) */}
              <div className="text-center font-bold" style={{ marginTop: '4pt', marginBottom: '2pt' }}>
                <div>PASAL 3</div>
                <div>HAK DAN KEWAJIBAN PEKERJA</div>
              </div>
              {PASAL_3_PAGE1_ITEMS.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}
            </A4SheetChrome>

            {/* ==================== PAGE 2 ==================== */}
            <A4SheetChrome pageNumber={2}>
              {PASAL_3_PAGE2_ITEMS.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}

              {/* PASAL 4 */}
              <div className="text-center font-bold" style={{ marginTop: '4pt', marginBottom: '2pt' }}>
                <div>PASAL 4</div>
                <div>HAK DAN KEWAJIBAN SWAPRO</div>
              </div>
              {PASAL_4_ITEMS.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}

              {/* PASAL 5 */}
              <div className="text-center font-bold" style={{ marginTop: '4pt', marginBottom: '2pt' }}>
                <div>PASAL 5</div>
                <div>WAKTU KERJA DAN UANG LEMBUR</div>
              </div>
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(1)</div>
                <div className="flex-1">
                  <div>
                    <span className="font-bold">Para Pihak</span> sepakat Pekerjaan dilaksanakan
                    dengan ketentuan waktu kerja (di luar kerja lembur) sebagai berikut :
                  </div>
                  {PASAL_5_SUBITEMS.map((sub) => (
                    <div key={sub.label} className="flex">
                      <div style={{ width: '16pt', flexShrink: 0 }}>{sub.label}</div>
                      <div className="flex-1 text-justify">{renderRuns(sub.runs)}</div>
                    </div>
                  ))}
                </div>
              </div>
              {PASAL_5_ITEMS.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}

              {/* PASAL 6 */}
              <div className="text-center font-bold" style={{ marginTop: '4pt', marginBottom: '2pt' }}>
                <div>PASAL 6</div>
                <div>KERAHASIAAN</div>
              </div>
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(1)</div>
                <div className="flex-1">
                  <div>
                    <span className="font-bold">PEKERJA</span> berjanji dan wajib menjaga segala
                    keterangan/ informasi rahasia yang berhubungan dengan{' '}
                    <span className="font-bold">SWAPRO</span> atau{' '}
                    <span className="font-bold">KLIEN</span>, termasuk namun tidak terbatas pada:
                  </div>
                  {PASAL_6_SUBITEMS.map((sub) => (
                    <div key={sub.label} className="flex">
                      <div style={{ width: '16pt', flexShrink: 0 }}>{sub.label}</div>
                      <div className="flex-1 text-justify">{renderRuns(sub.runs)}</div>
                    </div>
                  ))}
                </div>
              </div>
              {PASAL_6_ITEMS.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}

              {/* PASAL 7 (1) */}
              <div className="text-center font-bold" style={{ marginTop: '4pt', marginBottom: '2pt' }}>
                <div>PASAL 7</div>
                <div>HAK KEKAYAAN INTELEKTUAL</div>
              </div>
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(1)</div>
                <div className="flex-1 text-justify">{renderRuns(PASAL_7_P1)}</div>
              </div>
            </A4SheetChrome>

            {/* ==================== PAGE 3 ==================== */}
            <A4SheetChrome pageNumber={3}>
              <div className="flex" style={{ marginBottom: '4pt' }}>
                <div style={{ width: '22pt', flexShrink: 0 }}>(2)</div>
                <div className="flex-1 text-justify">{renderRuns(PASAL_7_P2)}</div>
              </div>

              {/* PASAL 8 */}
              <div className="text-center font-bold" style={{ marginBottom: '2pt' }}>
                <div>PASAL 8</div>
                <div>BERAKHIRNYA PERJANJIAN &amp; DENDA</div>
              </div>
              {PASAL_8_ITEMS_BEFORE_3.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}
              <div className="flex">
                <div style={{ width: '22pt', flexShrink: 0 }}>(3).</div>
                <div className="flex-1">
                  <div>
                    PKWT ini pun dapat diakhiri oleh <span className="font-bold">SWAPRO</span>{' '}
                    secara sepihak tanpa adanya ganti rugi dan/atau kompensasi apapun, apabila{' '}
                    <span className="font-bold">PEKERJA</span> melakukan salah satu dari
                    tindakan-tindakan/keadaan sebagai berikut :
                  </div>
                  <div className="flex">
                    <div style={{ width: '16pt', flexShrink: 0 }}>a.</div>
                    <div className="flex-1 text-justify">{renderRuns(PASAL_8_ITEM_3_LIST)}</div>
                  </div>
                </div>
              </div>
              {PASAL_8_ITEMS_AFTER_3.map((item) => (
                <div key={item.num} className="flex">
                  <div style={{ width: '22pt', flexShrink: 0 }}>{item.num}</div>
                  <div className="flex-1 text-justify">{renderRuns(item.runs)}</div>
                </div>
              ))}

              {/* PENUTUP & TTD */}
              <div className="text-center font-bold" style={{ marginTop: '8pt', marginBottom: '3pt' }}>
                P E N U T U P
              </div>
              <p className="text-justify" style={{ marginBottom: '6pt' }}>
                {renderRuns(PENUTUP_RUNS)}
              </p>

              <div style={{ marginBottom: '10pt' }}>
                <div className="flex">
                  <div style={{ width: '110pt', flexShrink: 0 }}>Ditandatangani di Kota</div>
                  <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                  <div>{payload.signingCity}</div>
                </div>
                <div className="flex">
                  <div style={{ width: '110pt', flexShrink: 0 }}>Pada tanggal</div>
                  <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                  <div>{payload.signingDateText}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 text-center">
                <div className="flex flex-col items-center">
                  <div className="font-bold">SWAPRO,</div>
                  <div
                    className="flex items-center justify-center"
                    style={{ margin: '3pt 0', height: '36pt' }}
                  >
                    <img
                      src="/assets/pkwt/stamp-p3.jpg"
                      alt="Stempel dan TTD SWAPRO"
                      style={{ height: '32pt', width: 'auto' }}
                    />
                  </div>
                  <div className="font-bold">({payload.signerName})</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="font-bold">PEKERJA,</div>
                  <div
                    className="flex items-center justify-center"
                    style={{ margin: '3pt 0', height: '36pt' }}
                  >
                    {payload.employeeSignatureDataUrl && (
                      <img
                        src={payload.employeeSignatureDataUrl}
                        alt={`Tanda tangan digital ${payload.employeeName}`}
                        style={{ maxHeight: '32pt', maxWidth: '100pt', width: 'auto' }}
                      />
                    )}
                  </div>
                  <div className="font-bold">({payload.employeeName})</div>
                </div>
              </div>
            </A4SheetChrome>

            {/* ==================== PAGE 4 (LAMPIRAN) ==================== */}
            <A4SheetChrome pageNumber={4}>
              <div style={{ fontSize: '8.5pt', fontWeight: 700, marginTop: '14pt', marginBottom: '14pt' }}>
                Lampiran :
              </div>

              <div style={{ lineHeight: '14pt' }}>
                {[
                  { label: 'PKWT Nomor', val: <span className="font-bold">{payload.pkwtNumber}</span> },
                  { label: 'Nama Lengkap', val: <span className="font-bold">{payload.employeeName}</span> },
                  { label: 'Nomor Kartu Tanda Penduduk (KTP)', val: payload.ktpNumber },
                  { label: 'Tempat / Tanggal Lahir', val: payload.birthPlaceDate },
                  { label: 'Jenis Kelamin', val: payload.gender },
                  { label: 'Alamat', val: payload.address },
                  { label: 'Nomor Induk Karyawan ( NIK )', val: payload.employeeInternalId },
                  { label: 'Jabatan', val: payload.position },
                  { label: 'Penempatan', val: payload.placementShort },
                  {
                    label: 'Jangka Waktu PKWT',
                    val: `${payload.startDateText} s/d ${payload.endDateText}`,
                  },
                  { label: 'Tanggal Mulai Bekerja', val: payload.startDateText },
                ].map((row) => (
                  <div key={row.label} className="flex">
                    <div style={{ width: '158pt', flexShrink: 0 }}>{row.label}</div>
                    <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                    <div className="flex-1">{row.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ lineHeight: '14pt', marginTop: '8pt' }}>
                <div className="flex">
                  <div style={{ width: '158pt', flexShrink: 0 }}>Pendapatan/Upah</div>
                  <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                  <div className="flex-1" />
                </div>
                {[
                  {
                    label: 'a. Gaji Pokok',
                    val: `${formattedSalary} ( ${terbilangSalary} )`,
                  },
                  { label: 'b. Insentif (jika ada)', val: payload.incentiveClientNote },
                  { label: 'c. Biaya lembur (jika ada)', val: payload.overtimeClientNote },
                  {
                    label: 'd. BPJS Ketenagakerjaan',
                    val: '4,24 % (empat koma dua puluh empat persen) dari Gaji Pokok per bulan.',
                  },
                  {
                    label: 'e. BPJS Jaminan Pensiun',
                    val: '2 % (dua persen) dari Gaji Pokok per bulan.',
                  },
                  {
                    label: 'f. BPJS Kesehatan',
                    val: '4 % (empat persen) dari Gaji Pokok per bulan.',
                  },
                  {
                    label: 'g. THR gross',
                    val: 'Sesuai dengan peraturan perundang-undangan yang berlaku.',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex">
                    <div style={{ width: '158pt', paddingLeft: '18pt', flexShrink: 0 }}>
                      {row.label}
                    </div>
                    <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                    <div className="flex-1">{row.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ lineHeight: '14pt', marginTop: '8pt' }}>
                <div className="flex">
                  <div style={{ width: '158pt', flexShrink: 0 }}>Potongan-potongan</div>
                  <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                  <div className="flex-1" />
                </div>
                {[
                  {
                    label: 'a. BPJS Ketenagakerjaan',
                    val: '2 % (dua persen) dari Gaji Pokok per bulan.',
                  },
                  {
                    label: 'b. BPJS Jaminan Pensiun',
                    val: '1 % (satu persen) dari Gaji Pokok per bulan.',
                  },
                  {
                    label: 'c. BPJS Kesehatan',
                    val: '1 % (satu persen) dari Gaji Pokok per bulan.',
                  },
                  {
                    label: 'd. Pajak Penghasilan (PPh) Pasal 21',
                    val: 'Sesuai Ketentuan Undang-Undang Perpajakan yang berlaku.',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex">
                    <div style={{ width: '158pt', paddingLeft: '18pt', flexShrink: 0 }}>
                      {row.label}
                    </div>
                    <div style={{ width: '8pt', flexShrink: 0 }}>:</div>
                    <div className="flex-1">{row.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '8pt' }}>
                Lampiran ini merupakan bagian yang tidak terpisahkan dari PKWT.
              </div>
              <div style={{ marginTop: '14pt', marginBottom: '12pt' }}>
                {payload.signingCity}, {payload.signingDateText}
              </div>

              <div className="grid grid-cols-2 text-center">
                <div className="flex flex-col items-center">
                  <div className="font-bold">SWAPRO,</div>
                  <div
                    className="flex items-center justify-center"
                    style={{ margin: '3pt 0', height: '54pt' }}
                  >
                    <img
                      src="/assets/pkwt/stamp-p4.jpg"
                      alt="Stempel dan TTD SWAPRO Lampiran"
                      style={{ height: '50pt', width: 'auto' }}
                    />
                  </div>
                  <div className="font-bold">({payload.signerName})</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="font-bold">PEKERJA,</div>
                  <div
                    className="flex items-center justify-center"
                    style={{ margin: '3pt 0', height: '54pt' }}
                  >
                    {payload.employeeSignatureDataUrl && (
                      <img
                        src={payload.employeeSignatureDataUrl}
                        alt={`Tanda tangan digital ${payload.employeeName}`}
                        style={{ maxHeight: '46pt', maxWidth: '120pt', width: 'auto' }}
                      />
                    )}
                  </div>
                  <div className="font-bold">({payload.employeeName})</div>
                </div>
              </div>
            </A4SheetChrome>
          </div>
        </div>
      </div>
    </div>
  );
};
