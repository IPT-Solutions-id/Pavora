import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileImage,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { EmployeeRecord, formatIndonesianDate } from '../../data/masterAdminData';
import {
  buildDigitalBpjsCardSvgDataUrl,
  formatBpjsKesDisplay,
  formatBpjsTkDisplay,
} from '../../utils/bpjsCard';

interface BpjsCardsSectionProps {
  employee: EmployeeRecord;
  editable?: boolean;
  onUploadCard?: (
    kind: 'kesehatan' | 'ketenagakerjaan',
    fileName: string,
    dataUrl: string
  ) => void;
}

export const BpjsCardsSection: React.FC<BpjsCardsSectionProps> = ({
  employee,
  editable = false,
  onUploadCard,
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    title: string;
    fileName: string;
    dataUrl: string;
  } | null>(null);

  const birthDateFormatted = formatIndonesianDate(employee.birthDate);
  const joinDateFormatted = formatIndonesianDate(employee.joinDate);

  const kesSvgUrl = buildDigitalBpjsCardSvgDataUrl('kesehatan', {
    fullName: employee.fullName,
    employeeCode: employee.employeeCode,
    nik: employee.nik,
    cardNumber: employee.bpjsKesehatanNumber || '',
    birthDateFormatted,
    entityName: employee.entityName,
    joinDateFormatted,
  });

  const tkSvgUrl = buildDigitalBpjsCardSvgDataUrl('ketenagakerjaan', {
    fullName: employee.fullName,
    employeeCode: employee.employeeCode,
    nik: employee.nik,
    cardNumber: employee.bpjsKetenagakerjaanNumber || '',
    birthDateFormatted,
    entityName: employee.entityName,
    joinDateFormatted,
  });

  const handleFileSelect = (
    kind: 'kesehatan' | 'ketenagakerjaan',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      setUploadError('Ukuran file Kartu BPJS maksimal 800 KB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && onUploadCard) {
        onUploadCard(kind, file.name, reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderCardSlot = (options: {
    kind: 'kesehatan' | 'ketenagakerjaan';
    title: string;
    subtitle: string;
    numberDisplay: string;
    hasNumber: boolean;
    gradientClass: string;
    accentTextClass: string;
    digitalSvgUrl: string;
    digitalFilename: string;
    uploadedFileName?: string;
    uploadedDataUrl?: string;
  }) => {
    const isPdf = options.uploadedDataUrl?.startsWith('data:application/pdf');
    return (
      <div
        data-testid={`bpjs-card-${options.kind}`}
        className="border border-[#E2E8F0] rounded-[6px] bg-white overflow-hidden flex flex-col justify-between"
      >
        {/* Visual Digital Card */}
        <div className={`p-5 text-white ${options.gradientClass} space-y-4`}>
          <div className="flex items-start justify-between gap-3 border-b border-white/20 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              {options.kind === 'kesehatan' ? (
                <ShieldCheck className="w-5 h-5 shrink-0 text-white" aria-hidden="true" />
              ) : (
                <CreditCard className="w-5 h-5 shrink-0 text-white" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-wide truncate">{options.title}</p>
                <p className="text-[11px] text-white/80 truncate">{options.subtitle}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold font-mono tabular-nums text-white/95 shrink-0">
              {employee.employeeCode}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-white/75 uppercase tracking-wider">
              Nomor Kartu Kepesertaan
            </p>
            <p className="text-lg sm:text-xl font-extrabold font-mono tabular-nums tracking-wide mt-0.5">
              {options.numberDisplay}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <p className="text-[10px] text-white/75 uppercase">Nama Peserta</p>
              <p className="font-bold truncate mt-0.5">{employee.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/75 uppercase">NIK KTP</p>
              <p className="font-mono font-semibold tabular-nums truncate mt-0.5">
                {employee.nik}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/75 uppercase">Tanggal Join</p>
              <p className="font-semibold tabular-nums mt-0.5">{joinDateFormatted}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/75 uppercase">Status Kepesertaan</p>
              <p className={`font-bold mt-0.5 ${options.accentTextClass}`}>
                {options.hasNumber ? 'Aktif Terdaftar' : 'Nomor Belum Diisi'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2 text-[11px] text-white/90">
            <span className="truncate font-medium">{employee.entityName}</span>
            <span className="shrink-0 font-semibold">Tgl Lahir: {birthDateFormatted}</span>
          </div>
        </div>

        {/* Action Bar: Download Digital Card & Physical Scan Attachment */}
        <div className="p-4 bg-[#F5F7FA] border-t border-[#E2E8F0] space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={options.digitalSvgUrl}
              download={options.digitalFilename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
              <span>Unduh Kartu Digital</span>
            </a>

            {editable && onUploadCard && (
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] whitespace-nowrap cursor-pointer">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {options.uploadedDataUrl ? 'Ganti Scan Kartu' : 'Upload Scan / PDF Kartu'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,.pdf"
                  onChange={(e) => handleFileSelect(options.kind, e)}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0]">
            {options.uploadedDataUrl ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16A36A] min-w-0">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Lampiran Kartu: {options.uploadedFileName || 'Kartu_BPJS'}
                  </span>
                </span>
                <div className="inline-flex items-center gap-2 shrink-0">
                  {!isPdf && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewAttachment({
                          title: options.title,
                          fileName: options.uploadedFileName || 'Kartu_BPJS',
                          dataUrl: options.uploadedDataUrl!,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-[#1468E8]" aria-hidden="true" />
                      <span>Lihat Kartu</span>
                    </button>
                  )}
                  <a
                    href={options.uploadedDataUrl}
                    download={options.uploadedFileName || options.digitalFilename}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px]"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    <span>Unduh File</span>
                  </a>
                </div>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#64748B]">
                <FileImage className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {editable
                    ? 'Belum ada scan kartu fisik yang diunggah (opsional, maks 800 KB).'
                    : 'Belum ada lampiran scan kartu fisik dari karyawan.'}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <div
          role="alert"
          className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-xs font-semibold text-[#DC3545]"
        >
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {renderCardSlot({
          kind: 'kesehatan',
          title: 'KARTU PESERTA JKN - KIS',
          subtitle: 'BPJS Kesehatan · PPU Badan Usaha',
          numberDisplay: formatBpjsKesDisplay(employee.bpjsKesehatanNumber),
          hasNumber: Boolean(employee.bpjsKesehatanNumber?.trim()),
          gradientClass: 'bg-gradient-to-br from-[#0D6E52] to-[#16A36A]',
          accentTextClass: 'text-[#DCFCE7]',
          digitalSvgUrl: kesSvgUrl,
          digitalFilename: `Kartu_BPJS_Kesehatan_${employee.employeeCode}.svg`,
          uploadedFileName: employee.bpjsKesehatanCardName,
          uploadedDataUrl: employee.bpjsKesehatanCardDataUrl,
        })}

        {renderCardSlot({
          kind: 'ketenagakerjaan',
          title: 'KARTU PESERTA BPJS KETENAGAKERJAAN',
          subtitle: 'BPJAMSOSTEK · JHT · JKK · JKM · JP',
          numberDisplay: formatBpjsTkDisplay(employee.bpjsKetenagakerjaanNumber),
          hasNumber: Boolean(employee.bpjsKetenagakerjaanNumber?.trim()),
          gradientClass: 'bg-gradient-to-br from-[#102B69] to-[#1468E8]',
          accentTextClass: 'text-[#FED7AA]',
          digitalSvgUrl: tkSvgUrl,
          digitalFilename: `Kartu_BPJS_Ketenagakerjaan_${employee.employeeCode}.svg`,
          uploadedFileName: employee.bpjsKetenagakerjaanCardName,
          uploadedDataUrl: employee.bpjsKetenagakerjaanCardDataUrl,
        })}
      </div>

      {previewAttachment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${previewAttachment.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/65 p-4"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-xl overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-[#102B69] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">{previewAttachment.title}</h3>
                <p className="text-[11px] text-[#EAF2FF] truncate">
                  {previewAttachment.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                aria-label="Tutup pratinjau kartu BPJS"
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 bg-[#F8FAFC] flex items-center justify-center">
              <img
                src={previewAttachment.dataUrl}
                alt={previewAttachment.fileName}
                className="max-h-[380px] w-auto object-contain rounded-[4px] border border-[#E2E8F0] bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
