import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  Building2,
  CheckCircle2,
  FileSignature,
  Headphones,
  Mail,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  INITIAL_SETTINGS,
  SystemSettingsConfig,
  buildPevoraLicenseSummary,
  validateSystemSettingsInput,
} from '../../data/masterAdminData';

interface SettingsPanelProps {
  settings: SystemSettingsConfig;
  activeEntityCount?: number;
  activeEmployeeCount?: number;
  onSaveSettings: (next: SystemSettingsConfig) => void;
  onResetSimulation?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  activeEntityCount = 5,
  activeEmployeeCount = 6,
  onSaveSettings,
  onResetSimulation,
}) => {
  const [draft, setDraft] = useState<SystemSettingsConfig>(settings);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const licenseSummary = buildPevoraLicenseSummary({
    companyName: draft.companyName || settings.companyName,
    activeEntityCount,
    activeEmployeeCount,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateSystemSettingsInput(draft);
    if (!check.ok) {
      setErrorNotice(check.error ?? 'Mohon periksa kembali isian pengaturan instansi.');
      setSavedNotice(null);
      return;
    }
    setErrorNotice(null);
    onSaveSettings(draft);
    setSavedNotice(
      'Pengaturan profil instansi, pejabat PKWT, dan aturan peringatan dini berhasil disimpan.'
    );
  };

  const handleConfirmReset = () => {
    if (onResetSimulation) {
      onResetSimulation();
    }
    setDraft(INITIAL_SETTINGS);
    setConfirmReset(false);
    setErrorNotice(null);
    setSavedNotice('Seluruh data simulasi workspace telah dikembalikan ke kondisi awal bawaan.');
  };

  const supportWaUrl = `https://wa.me/${licenseSummary.vendorSupportWhatsapp}?text=${encodeURIComponent(
    `Halo Tim Teknis PT Iskandar Pratama Teknologi, kami dari Master Admin ${licenseSummary.licensedTenantName} (Lisensi: ${licenseSummary.licenseCode}) membutuhkan dukungan teknis aplikasi PEVORA.`
  )}`;

  const supportMailUrl = `mailto:${licenseSummary.vendorSupportEmail}?subject=${encodeURIComponent(
    `[Dukungan Teknis PEVORA] ${licenseSummary.licensedTenantName} — ${licenseSummary.licenseCode}`
  )}&body=${encodeURIComponent(
    `Halo Tim Enterprise PT Iskandar Pratama Teknologi,\n\nInstansi Pengguna: ${licenseSummary.licensedTenantName}\nKode Lisensi: ${licenseSummary.licenseCode}\nVersi Sistem: ${licenseSummary.versionLabel}\n\nKebutuhan / Kendala Teknis:\n- `
  )}`;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {savedNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 px-4 py-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[6px] text-xs font-semibold text-[#065F46]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" aria-hidden="true" />
            <span>{savedNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {errorNotice && (
        <div
          role="alert"
          className="flex items-center gap-2.5 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] text-xs font-semibold text-[#991B1B]"
        >
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" aria-hidden="true" />
          <span>{errorNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: IDENTITAS INSTANSI & PEJABAT PENANDATANGAN PKWT */}
        <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
          <div className="pb-4 border-b border-[#E2E8F0] flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[4px] bg-[#EAF2FF] text-[#1468E8] flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#102B69]">
                  1. Identitas Instansi Pengguna &amp; Pejabat Penandatangan PKWT
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Konfigurasi profil resmi perusahaan pengguna, kontak layanan HR, serta pejabat Pihak Pertama pada dokumen kontrak kerja PKWT.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-bold bg-[#F8FAFC] text-[#102B69] border border-[#CBD5E1] rounded-[4px]">
              Profil Tenant Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sysCompany" className="block text-xs font-semibold text-[#102B69] mb-1.5">
                Nama Resmi Perusahaan Pengguna
              </label>
              <input
                id="sysCompany"
                type="text"
                value={draft.companyName}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, companyName: e.target.value }));
                  setSavedNotice(null);
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Tampil di header sistem, kop dokumen, dan portal karyawan.
              </p>
            </div>

            <div>
              <label htmlFor="sysEmail" className="block text-xs font-semibold text-[#102B69] mb-1.5">
                Email Resmi Layanan HR
              </label>
              <input
                id="sysEmail"
                type="email"
                value={draft.supportEmail}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, supportEmail: e.target.value }));
                  setSavedNotice(null);
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Email tujuan korespondensi karyawan &amp; pelamar kerja.
              </p>
            </div>

            <div>
              <label htmlFor="sysWhatsapp" className="block text-xs font-semibold text-[#102B69] mb-1.5">
                Nomor WhatsApp Helpdesk HR
              </label>
              <input
                id="sysWhatsapp"
                type="text"
                value={draft.hrWhatsappHelpdesk ?? ''}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, hrWhatsappHelpdesk: e.target.value }));
                  setSavedNotice(null);
                }}
                placeholder="Contoh: 081199881024"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Nomor bantuan cepat untuk kendala presensi atau kontrak.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="sysAddress" className="block text-xs font-semibold text-[#102B69] mb-1.5">
              Alamat Lengkap Kantor Pusat Perusahaan
            </label>
            <input
              id="sysAddress"
              type="text"
              value={draft.headquartersAddress}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, headquartersAddress: e.target.value }));
                setSavedNotice(null);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
            />
          </div>

          {/* Sub-box Pejabat Penandatangan Kontrak PKWT & Standar Penomoran */}
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] space-y-4">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
              <h3 className="text-xs font-bold text-[#102B69] uppercase tracking-wider">
                Otoritas Pihak Pertama Kontrak PKWT &amp; Standar Akun Baru
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="sysPkwtSignerName"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Nama Pejabat Pihak Pertama (PKWT)
                </label>
                <input
                  id="sysPkwtSignerName"
                  type="text"
                  value={draft.pkwtSignatoryName ?? ''}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, pkwtSignatoryName: e.target.value }));
                    setSavedNotice(null);
                  }}
                  placeholder="Nama lengkap & gelar"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="sysPkwtSignerTitle"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Jabatan Pejabat Penandatangan
                </label>
                <input
                  id="sysPkwtSignerTitle"
                  type="text"
                  value={draft.pkwtSignatoryTitle ?? ''}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, pkwtSignatoryTitle: e.target.value }));
                    setSavedNotice(null);
                  }}
                  placeholder="Contoh: Direktur Operasional HR"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="sysPkwtPrefix"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  Format Prefix Nomor Surat PKWT
                </label>
                <input
                  id="sysPkwtPrefix"
                  type="text"
                  value={draft.pkwtContractPrefix ?? ''}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, pkwtContractPrefix: e.target.value }));
                    setSavedNotice(null);
                  }}
                  placeholder="Contoh: PKWT-CLN-2026"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                />
              </div>

              <div>
                <label
                  htmlFor="sysDefaultPin"
                  className="block text-xs font-semibold text-[#102B69] mb-1.5"
                >
                  PIN / Sandi Default Karyawan Baru
                </label>
                <input
                  id="sysDefaultPin"
                  type="text"
                  value={draft.defaultEmployeePin ?? ''}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, defaultEmployeePin: e.target.value }));
                    setSavedNotice(null);
                  }}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#CBD5E1] rounded-[4px] text-[#172033] focus:outline-none focus:border-[#1468E8]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: ATURAN PERINGATAN DINI (EARLY WARNING & NOTIFIKASI) */}
        <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
          <div className="pb-4 border-b border-[#E2E8F0] flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[4px] bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                <BellRing className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#102B69]">
                  2. Aturan Peringatan Dini (Early Warning System &amp; Lonceng Notifikasi)
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Atur kapan sistem mengirimkan peringatan otomatis masa berakhir kontrak PKWT (EOC) dan pengajuan operasional ke lonceng Master Admin &amp; Admin.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sysEocThreshold" className="text-xs font-semibold text-[#102B69]">
                Ambang Peringatan EOC PKWT:
              </label>
              <select
                id="sysEocThreshold"
                value={draft.eocWarningDaysThreshold ?? 30}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    eocWarningDaysThreshold: Number(e.target.value) as 30 | 14 | 7,
                  }));
                  setSavedNotice(null);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] text-[#102B69] focus:outline-none focus:border-[#1468E8]"
              >
                <option value={30}>H-30 Hari Sebelum Habis</option>
                <option value={14}>H-14 Hari Sebelum Habis</option>
                <option value={7}>H-7 Hari (Mendesak)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <label className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] cursor-pointer hover:border-[#CBD5E1]">
              <input
                type="checkbox"
                checked={draft.notifyExpiringContract}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, notifyExpiringContract: e.target.checked }));
                  setSavedNotice(null);
                }}
                className="mt-0.5 w-4 h-4 rounded-[2px] border-[#CBD5E1] text-[#1468E8]"
              />
              <div>
                <p className="text-xs font-bold text-[#102B69]">
                  Peringatan Kontrak PKWT Segera Berakhir (EOC H-{draft.eocWarningDaysThreshold ?? 30})
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Munculkan notifikasi otomatis di lonceng saat sisa masa kontrak karyawan mencapai batas H-{draft.eocWarningDaysThreshold ?? 30} hari.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] cursor-pointer hover:border-[#CBD5E1]">
              <input
                type="checkbox"
                checked={draft.notifyLeaveAndSickSkd ?? true}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, notifyLeaveAndSickSkd: e.target.checked }));
                  setSavedNotice(null);
                }}
                className="mt-0.5 w-4 h-4 rounded-[2px] border-[#CBD5E1] text-[#1468E8]"
              />
              <div>
                <p className="text-xs font-bold text-[#102B69]">
                  Notifikasi Pengajuan Cuti &amp; Izin Sakit (Wajib Lampiran SKD)
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Kirim notifikasi real-time ke Admin/Master Admin saat karyawan mengajukan cuti atau mengunggah SKD.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] cursor-pointer hover:border-[#CBD5E1]">
              <input
                type="checkbox"
                checked={draft.notifyOnboardingCandidate ?? true}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, notifyOnboardingCandidate: e.target.checked }));
                  setSavedNotice(null);
                }}
                className="mt-0.5 w-4 h-4 rounded-[2px] border-[#CBD5E1] text-[#1468E8]"
              />
              <div>
                <p className="text-xs font-bold text-[#102B69]">
                  Notifikasi Kandidat Lulus Seleksi &amp; Siap Onboarding
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Beritahu Admin saat Rekruter menyerahkan kandidat baru untuk penerbitan NIK &amp; kontrak PKWT.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] cursor-pointer hover:border-[#CBD5E1]">
              <input
                type="checkbox"
                checked={draft.notifyNewUserSignup}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, notifyNewUserSignup: e.target.checked }));
                  setSavedNotice(null);
                }}
                className="mt-0.5 w-4 h-4 rounded-[2px] border-[#CBD5E1] text-[#1468E8]"
              />
              <div>
                <p className="text-xs font-bold text-[#102B69]">
                  Notifikasi Aktivasi Akun Baru &amp; Perubahan Cakupan Klien
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Kirim peringatan saat ada akun pengguna baru yang menunggu aktivasi atau perubahan penugasan klien.
                </p>
              </div>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
            >
              Simpan Pengaturan Instansi
            </button>
          </div>
        </section>
      </form>

      {/* SECTION 3: INFORMASI LISENSI PEVORA & DUKUNGAN TEKNIS (PT ISKANDAR PRATAMA TEKNOLOGI) */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
        <div className="pb-4 border-b border-[#E2E8F0] flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-[4px] bg-[#102B69] text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                3. Informasi Lisensi Platform PEVORA &amp; Dukungan Teknis Developer
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Status lisensi penggunaan aplikasi HRIS oleh{' '}
                <span className="font-semibold text-[#102B69]">{licenseSummary.licensedTenantName}</span>{' '}
                yang dikembangkan dan dikelola oleh{' '}
                <span className="font-semibold text-[#102B69]">{licenseSummary.vendorCompany}</span>.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-[4px]">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{licenseSummary.licenseStatus}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px]">
            <p className="text-[11px] font-semibold text-[#64748B]">Produk &amp; Pengembang Resmi</p>
            <p className="text-sm font-bold text-[#102B69] mt-1">{licenseSummary.productName}</p>
            <p className="text-xs font-semibold text-[#1468E8] mt-0.5">
              {licenseSummary.vendorCompany}
            </p>
          </div>

          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px]">
            <p className="text-[11px] font-semibold text-[#64748B]">Kode Lisensi &amp; Paket</p>
            <p className="text-sm font-bold font-mono text-[#102B69] mt-1">
              {licenseSummary.licenseCode}
            </p>
            <p className="text-xs text-[#475569] mt-0.5">{licenseSummary.licenseTier}</p>
          </div>

          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px]">
            <p className="text-[11px] font-semibold text-[#64748B]">Kapasitas Entitas &amp; SDM</p>
            <p className="text-sm font-bold text-[#102B69] mt-1">
              {licenseSummary.activeEntityCount} / {licenseSummary.maxEntityQuota} Unit &amp; Klien
            </p>
            <p className="text-xs text-[#475569] mt-0.5">
              {licenseSummary.activeEmployeeCount} / {licenseSummary.maxEmployeeQuota.toLocaleString('id-ID')} Karyawan Aktif
            </p>
          </div>

          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px]">
            <p className="text-[11px] font-semibold text-[#64748B]">Versi Rilis &amp; Masa Berlaku</p>
            <p className="text-sm font-bold text-[#102B69] mt-1">{licenseSummary.versionLabel}</p>
            <p className="text-xs text-[#475569] mt-0.5">Berlaku s/d {licenseSummary.validThroughLabel}</p>
          </div>
        </div>

        <div className="p-4 bg-[#EAF2FF]/60 border border-[#BFDBFE] rounded-[6px] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Headphones className="w-5 h-5 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-[#102B69]">
                Jalur Bantuan Teknis &amp; Kustomisasi Modul ({licenseSummary.vendorCompany})
              </p>
              <p className="text-[11px] text-[#475569] mt-0.5">
                Hubungi tim engineer {licenseSummary.vendorCompany} apabila instansi Anda memerlukan penambahan kuota klien, penyesuaian format PKWT, atau pendampingan teknis.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={supportWaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#15803D] rounded-[4px] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>WhatsApp Tim Teknis</span>
            </a>
            <a
              href={supportMailUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#102B69] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
              <span>Email Support Developer</span>
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 4: UTILITAS DATA WORKSPACE */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#F1F5F9] text-[#475569] flex items-center justify-center shrink-0 mt-0.5">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#102B69]">
              4. Utilitas Pemulihan Data Simulasi Workspace
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Kembalikan seluruh data karyawan, absensi, pengajuan cuti/SKD, dan pengaturan ke kondisi awal bawaan sistem setelah selesai melakukan demo atau pengujian.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-[4px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Data Simulasi ke Awal</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-[4px] transition-colors cursor-pointer"
              >
                Ya, Konfirmasi Reset Data
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-2 text-xs font-semibold text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-[4px] transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

