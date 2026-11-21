import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  EmployeeLeaveQuotaSummary,
  EmployeeRecord,
  LeaveAbsenceRecord,
  isPartialDayLeaveType,
} from '../../data/masterAdminData';
import {
  buildSwaproLeavePdfFilename,
  generateSwaproLeavePdfBytes,
} from '../../utils/leaveFormPdfGenerator';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface LeaveFormPdfModalProps {
  record: LeaveAbsenceRecord;
  employee?: EmployeeRecord;
  quotaSummary?: EmployeeLeaveQuotaSummary;
  onClose: () => void;
}

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 1.75;
const ZOOM_STEP = 0.25;

export const LeaveFormPdfModal: React.FC<LeaveFormPdfModalProps> = ({
  record,
  employee,
  quotaSummary,
  onClose,
}) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fileName = buildSwaproLeavePdfFilename(record);

  // 1. Generate the exact official SWAPRO PDF bytes (identical bytes used for preview & download)
  useEffect(() => {
    let active = true;
    setLoadingPdf(true);
    setCanvasReady(false);
    setRenderError(null);
    setPdfBytes(null);

    generateSwaproLeavePdfBytes({
      record,
      employee,
      quotaSummary,
    })
      .then((bytes) => {
        if (!active) return;
        setPdfBytes(bytes);
        setLoadingPdf(false);
      })
      .catch((err) => {
        if (!active) return;
        setRenderError(
          err instanceof Error
            ? err.message
            : 'Gagal menyusun dokumen Formulir Cuti/Izin SWAPRO.'
        );
        setLoadingPdf(false);
      });

    return () => {
      active = false;
    };
  }, [record, employee, quotaSummary]);

  // 2. Render the exact generated PDF bytes onto a HiDPI <canvas> using PDF.js (1:1 pixel match)
  useEffect(() => {
    if (!pdfBytes || !canvasRef.current) return;

    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      setCanvasReady(false);
      setRenderError(null);

      try {
        // Always pass a fresh Uint8Array copy so pdf.js worker transfer never detaches pdfBytes
        const dataCopy = new Uint8Array(pdfBytes.byteLength);
        dataCopy.set(pdfBytes);

        loadingTask = pdfjsLib.getDocument({ data: dataCopy });
        pdfDoc = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy().catch(() => undefined);
          return;
        }

        setPageCount(pdfDoc.numPages);
        const page = await pdfDoc.getPage(1);
        if (cancelled) {
          await loadingTask.destroy().catch(() => undefined);
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          await loadingTask.destroy().catch(() => undefined);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Konteks kanvas browser tidak tersedia untuk pratinjau PDF.');
        }

        // Base display width ~760px at 100% zoom, supersampled at >= 2x for razor-sharp typography & logo
        const unscaledViewport = page.getViewport({ scale: 1 });
        const baseCssWidth = 760 * zoom;
        const cssScale = baseCssWidth / unscaledViewport.width;
        const renderRatio = Math.max(Math.min(window.devicePixelRatio || 1, 2.5), 2);
        const renderViewport = page.getViewport({ scale: cssScale * renderRatio });

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(renderViewport.width / renderRatio)}px`;
        canvas.style.height = `${Math.floor(renderViewport.height / renderRatio)}px`;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvasContext: ctx,
          viewport: renderViewport,
          canvas,
        });

        await renderTask.promise;
        if (!cancelled) {
          setCanvasReady(true);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('cancel')) return;
        setRenderError(
          msg || 'Gagal menampilkan pratinjau PDF langsung. Anda tetap dapat mengunduh file PDF resmi.'
        );
        setCanvasReady(true);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // Ignore cancel errors during unmount
        }
      }
      if (loadingTask && typeof loadingTask.destroy === 'function') {
        loadingTask.destroy().catch(() => undefined);
      } else if (pdfDoc) {
        pdfDoc.cleanup().catch(() => undefined);
      }
    };
  }, [pdfBytes, zoom]);

  const handleDownload = () => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  const partialDay = isPartialDayLeaveType(record.type);
  const durationSummary = partialDay
    ? record.type === 'Meninggalkan Pekerjaan' && record.leaveTimeStart && record.leaveTimeEnd
      ? `${record.leaveTimeStart} s/d ${record.leaveTimeEnd}`
      : record.timeDetail
        ? `Pukul ${record.timeDetail} WIB`
        : 'Izin Parsial'
    : `${record.daysCount} Hari Kerja`;

  const nikValue = record.employeeCode || employee?.employeeCode || '-';
  const nameValue = record.employeeName || employee?.fullName || '-';
  const rep = record.replacementStaff;
  const isBusy = loadingPdf || !canvasReady;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Formulir Permohonan Cuti dan Izin SWAPRO"
      data-testid="leave-form-pdf-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/65"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-[#102B69] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#102B69] truncate">
                Formulir Permohonan Cuti / Izin — PT. SWAPRO INTERNATIONAL
              </h3>
              <p className="text-xs text-[#64748B] truncate tabular-nums">
                FORM HCREV-17102023 · {nameValue} ({nikValue}) · {record.type} · Pratinjau PDF Asli 1:1
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-leave-pdf-modal"
            onClick={onClose}
            aria-label="Tutup pratinjau formulir PDF"
            className="p-1.5 text-[#64748B] hover:text-[#102B69] rounded-[4px] hover:bg-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata, Zoom & Action Bar */}
        <div className="px-6 py-3 border-b border-[#E2E8F0] bg-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#64748B]">
            <span className="font-semibold text-[#172033]">{record.dateRange}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{durationSummary}</span>
            {rep?.fullName && (
              <>
                <span aria-hidden="true">·</span>
                <span>Pengganti: {rep.fullName}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span
              className={`font-semibold ${
                record.status === 'Disetujui'
                  ? 'text-[#16A36A]'
                  : record.status === 'Ditolak'
                    ? 'text-[#DC3545]'
                    : 'text-[#B87D00]'
              }`}
            >
              Status: {record.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="inline-flex items-center border border-[#E2E8F0] rounded-[4px] bg-[#F8FAFC] overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Number((z - ZOOM_STEP).toFixed(2))))}
                disabled={zoom <= ZOOM_MIN || loadingPdf}
                aria-label="Perkecil pratinjau PDF"
                className="p-1.5 text-[#102B69] hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="px-2 text-[11px] font-bold text-[#102B69] tabular-nums select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Number((z + ZOOM_STEP).toFixed(2))))}
                disabled={zoom >= ZOOM_MAX || loadingPdf}
                aria-label="Perbesar pratinjau PDF"
                className="p-1.5 text-[#102B69] hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  aria-label="Reset zoom ke 100%"
                  className="p-1.5 text-[#64748B] hover:text-[#102B69] hover:bg-white border-l border-[#E2E8F0] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfBytes || loadingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              data-testid="download-leave-pdf-btn"
              disabled={!pdfBytes || loadingPdf}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
            >
              {loadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{loadingPdf ? 'Menyusun PDF...' : 'Unduh Formulir PDF Resmi'}</span>
            </button>
          </div>
        </div>

        {renderError && (
          <div className="px-6 py-2.5 bg-[#FEF2F2] border-b border-[#FECACA] text-xs font-semibold text-[#DC3545] flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{renderError}</span>
          </div>
        )}

        {/* Authentic 1:1 Rendered PDF Canvas Sheet */}
        <div
          data-testid="leave-form-preview-sheet"
          className="flex-1 overflow-auto bg-[#CBD5E1]/60 p-4 sm:p-6"
        >
          <div className="mx-auto flex flex-col items-center">
            <div
              className={`relative bg-white border border-[#94A3B8]/60 shadow-md overflow-hidden ${
                !canvasReady ? 'w-full max-w-[760px] min-h-[540px]' : ''
              }`}
            >
              {isBusy && !renderError && (
                <div
                  data-testid="leave-form-pdf-loading"
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/90"
                >
                  <Loader2 className="w-6 h-6 text-[#1468E8] animate-spin" aria-hidden="true" />
                  <p className="text-xs font-semibold text-[#102B69]">
                    {loadingPdf
                      ? 'Menyusun PDF Formulir Cuti SWAPRO...'
                      : 'Merender pratinjau PDF asli 1:1...'}
                  </p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                data-testid="leave-form-pdf-canvas"
                aria-label="Pratinjau halaman 1 Formulir Permohonan Cuti dan Izin PT. SWAPRO INTERNATIONAL"
                className={`block max-w-full h-auto ${canvasReady ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>

            {canvasReady && !renderError && (
              <p
                data-testid="leave-form-pdf-caption"
                className="mt-3 text-[11px] font-medium text-[#475569] tabular-nums"
              >
                Halaman 1 dari {pageCount} · Ditampilkan langsung dari berkas PDF asli (100% identik dengan hasil unduhan)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
