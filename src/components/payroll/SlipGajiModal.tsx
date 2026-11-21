import React, { useState } from 'react';
import { CheckCircle2, Download, FileText, Loader2, Lock, X } from 'lucide-react';
import type { SystemSettingsConfig } from '../../data/masterAdminData';
import type { PayrollSlipRecord } from '../../utils/payrollCalculator';
import { formatRupiahDot, numberToIndonesianWords } from '../../utils/pkwtDocument';
import {
  buildSlipGajiDownloadFilename,
  generateSlipGajiPdfBytes,
  loadSlipGajiBrowserAssets,
} from '../../utils/slipGajiPdfGenerator';

interface SlipGajiModalProps {
  slip: PayrollSlipRecord;
  settings: Pick<
    SystemSettingsConfig,
    'companyName' | 'headquartersAddress' | 'pkwtSignatoryName' | 'pkwtSignatoryTitle'
  >;
  onClose: () => void;
}

export const SlipGajiModal: React.FC<SlipGajiModalProps> = ({ slip, settings, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const assets = await loadSlipGajiBrowserAssets();
      const bytes = await generateSlipGajiPdfBytes([slip], settings, assets);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildSlipGajiDownloadFilename(slip);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'Gagal membuat file PDF Slip Gaji.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const totalEmployerBpjs =
    slip.bpjsKesCompany +
    slip.bpjsTkJhtCompany +
    slip.bpjsTkJpCompany +
    slip.bpjsTkJkkCompany +
    slip.bpjsTkJkmCompany;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slip-gaji-modal-title"
      className="fixed inset-0 z-50 bg-[#172033]/60 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#102B69] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-[#EAF2FF] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="slip-gaji-modal-title" className="text-base font-bold truncate">
                Slip Gaji Resmi · {slip.periodLabel}
              </h2>
              <p className="text-xs text-[#EAF2FF]/80 truncate">
                {slip.employeeCode} · {slip.fullName} · {slip.entityName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              data-testid="download-slip-gaji-pdf-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] rounded-[4px] transition-colors cursor-pointer disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{downloading ? 'Menyiapkan PDF...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau slip gaji"
              className="p-1.5 rounded-[4px] text-[#EAF2FF] hover:bg-white/15 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {downloadError && (
            <div
              role="alert"
              className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-[#DC3545] font-semibold"
            >
              {downloadError}
            </div>
          )}

          {/* Status & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
            <div>
              <p className="text-sm font-bold text-[#102B69]">
                {settings.companyName}
                {slip.settlementType === 'Final Settlement (Resign)'
                  ? ' · FINAL SETTLEMENT (RESIGN)'
                  : ''}
              </p>
              <p className="text-[#64748B] mt-0.5">
                {slip.position} · Penempatan {slip.placementName} ({slip.regionName})
              </p>
            </div>
            <div className="text-right">
              {slip.status === 'Disetujui' ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-[#16A36A]">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Disetujui Master Admin</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-bold text-[#B87D00]">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Status: {slip.status}</span>
                </span>
              )}
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Sumber: {slip.calculationSource} · Base: {slip.baseSalarySourceTag}
              </p>
            </div>
          </div>

          {/* Identity Grid */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
            <div>
              <dt className="text-[#64748B]">NIK Karyawan</dt>
              <dd className="font-mono font-bold text-[#102B69] mt-0.5">{slip.employeeCode}</dd>
            </div>
            <div>
              <dt className="text-[#64748B]">Status PTKP / NPWP</dt>
              <dd className="font-semibold text-[#172033] mt-0.5 tabular-nums">
                {slip.ptkpStatus} · {slip.npwpNumber}
              </dd>
            </div>
            <div>
              <dt className="text-[#64748B]">BPJS Kesehatan / TK</dt>
              <dd className="font-mono text-[#172033] mt-0.5 truncate">
                {slip.bpjsKesehatanNumber} / {slip.bpjsKetenagakerjaanNumber}
              </dd>
            </div>
            <div>
              <dt className="text-[#64748B]">Rekening Pencairan</dt>
              <dd className="font-mono font-semibold text-[#102B69] mt-0.5 truncate">
                {slip.bankName} · {slip.bankAccountNumber}
              </dd>
            </div>
          </dl>

          {/* Two-Column Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#102B69] text-white font-bold">
                A. Penerimaan &amp; Kompensasi
              </div>
              <div className="p-4 space-y-2.5 divide-y divide-[#E2E8F0]">
                {[
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
                ].map(([label, val]) => (
                  <div key={String(label)} className="pt-2 first:pt-0 flex justify-between gap-3">
                    <span className="text-[#64748B]">{label}</span>
                    <span className="font-semibold text-[#172033] tabular-nums">
                      {formatRupiahDot(Number(val))}
                    </span>
                  </div>
                ))}
                <div className="pt-2.5 flex justify-between gap-3 font-bold text-[#102B69]">
                  <span>Total Penghasilan Bruto</span>
                  <span className="tabular-nums">{formatRupiahDot(slip.grossIncome)}</span>
                </div>
              </div>
            </div>

            <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#DC3545] text-white font-bold">
                B. Potongan Karyawan
              </div>
              <div className="p-4 space-y-2.5 divide-y divide-[#E2E8F0]">
                {[
                  ['BPJS Kesehatan (1%)', slip.bpjsKesEmployee],
                  ['BPJS TK — JHT (2%)', slip.bpjsTkJhtEmployee],
                  ['BPJS TK — Jaminan Pensiun (1%)', slip.bpjsTkJpEmployee],
                  ['PPh 21 (Skema TER)', slip.pph21Employee],
                  [`Potongan Alpha (${slip.alphaDaysCount} hari)`, slip.alphaDeduction],
                  ['Potongan Keterlambatan', slip.lateDeduction],
                  ['Kasbon / Potongan Lainnya', slip.loanKasbonDeduction + slip.otherDeduction],
                ].map(([label, val]) => (
                  <div key={String(label)} className="pt-2 first:pt-0 flex justify-between gap-3">
                    <span className="text-[#64748B]">{label}</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        Number(val) > 0 ? 'text-[#DC3545]' : 'text-[#64748B]'
                      }`}
                    >
                      - {formatRupiahDot(Number(val))}
                    </span>
                  </div>
                ))}
                <div className="pt-2.5 flex justify-between gap-3 font-bold text-[#DC3545]">
                  <span>Total Potongan</span>
                  <span className="tabular-nums">- {formatRupiahDot(slip.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Take Home Pay Banner */}
          <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-[#16A36A] uppercase tracking-wide">
                Take Home Pay (Gaji Bersih Diterima)
              </p>
              <p className="text-[11px] text-[#172033] mt-1">
                Terbilang: <span className="font-semibold italic">{numberToIndonesianWords(slip.takeHomePay)} rupiah</span>
              </p>
            </div>
            <p className="text-2xl font-extrabold text-[#102B69] tabular-nums shrink-0">
              {formatRupiahDot(slip.takeHomePay)}
            </p>
          </div>

          {/* Employer Contributions */}
          <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-1.5">
            <p className="font-bold text-[#102B69]">
              C. Kontribusi Perusahaan (Tidak Memotong THP Karyawan)
            </p>
            <p className="text-[#64748B] tabular-nums">
              BPJS Kes 4%: {formatRupiahDot(slip.bpjsKesCompany)} · JHT 3,7%:{' '}
              {formatRupiahDot(slip.bpjsTkJhtCompany)} · JP 2%:{' '}
              {formatRupiahDot(slip.bpjsTkJpCompany)} · JKK:{' '}
              {formatRupiahDot(slip.bpjsTkJkkCompany)} · JKM:{' '}
              {formatRupiahDot(slip.bpjsTkJkmCompany)} · Total Iuran Perusahaan:{' '}
              <strong className="text-[#102B69]">{formatRupiahDot(totalEmployerBpjs)}</strong>
            </p>
            {slip.pph21CompanySubsidy > 0 && (
              <p className="text-[#1468E8] font-semibold tabular-nums">
                Subsidi Pajak PPh 21 Ditanggung Perusahaan (Nett):{' '}
                {formatRupiahDot(slip.pph21CompanySubsidy)}
              </p>
            )}
            <p className="text-[#102B69] font-semibold tabular-nums">
              Total Biaya Perusahaan (Cost-to-Company): {formatRupiahDot(slip.totalCompanyCost)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
