import React, { useEffect, useState } from 'react';
import { ShieldCheck, SlidersHorizontal, X, FileText, Lock, Check } from 'lucide-react';
import {
  COOKIE_CATEGORIES,
  CookieConsentPreferences,
} from '../utils/cookieConsent';

interface CookieConsentBannerProps {
  visibleBanner: boolean;
  consent: CookieConsentPreferences | null;
  isPreferencesOpen: boolean;
  isPolicyOpen: boolean;
  onAcceptAll: () => void;
  onAcceptEssential: () => void;
  onSaveCustom: (options: { preferences: boolean; analytics: boolean }) => void;
  onOpenPreferences: () => void;
  onClosePreferences: () => void;
  onOpenPolicy: () => void;
  onClosePolicy: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  visibleBanner,
  consent,
  isPreferencesOpen,
  isPolicyOpen,
  onAcceptAll,
  onAcceptEssential,
  onSaveCustom,
  onOpenPreferences,
  onClosePreferences,
  onOpenPolicy,
  onClosePolicy,
}) => {
  const [draftPreferences, setDraftPreferences] = useState<boolean>(consent?.preferences ?? true);
  const [draftAnalytics, setDraftAnalytics] = useState<boolean>(consent?.analytics ?? false);

  useEffect(() => {
    if (isPreferencesOpen) {
      setDraftPreferences(consent?.preferences ?? true);
      setDraftAnalytics(consent?.analytics ?? false);
    }
  }, [isPreferencesOpen, consent]);

  useEffect(() => {
    if (!isPreferencesOpen && !isPolicyOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isPolicyOpen) {
          onClosePolicy();
        } else if (isPreferencesOpen) {
          onClosePreferences();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreferencesOpen, isPolicyOpen, onClosePolicy, onClosePreferences]);

  return (
    <>
      {visibleBanner && !isPreferencesOpen && !isPolicyOpen && (
        <aside
          aria-label="Pemberitahuan Cookie dan Privasi PEVORA"
          className="fixed bottom-3 left-3 right-3 sm:bottom-5 sm:right-5 sm:left-auto sm:w-[440px] z-40 bg-white border border-[#E2E8F0] rounded-[6px] shadow-[0_12px_32px_rgba(16,43,105,0.14)] p-3.5 sm:p-5"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-[#EAF2FF] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-bold text-[#102B69] tracking-tight">
                Preferensi Privasi &amp; Penyimpanan Lokal
              </h2>
              <p className="mt-1 text-[11px] sm:text-xs text-[#475569] leading-snug sm:leading-relaxed">
                PEVORA memakai penyimpanan lokal esensial untuk keamanan sesi portal serta opsi
                antarmuka sesuai UU PDP No. 27/2022.
              </p>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAcceptEssential}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] min-h-[40px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
            >
              Hanya Esensial
            </button>
            <button
              type="button"
              onClick={onAcceptAll}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] border border-transparent rounded-[4px] min-h-[40px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
            >
              Terima Semua
            </button>
          </div>

          <div className="mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={onOpenPreferences}
              className="inline-flex items-center gap-1.5 font-semibold text-[#102B69] hover:text-[#1468E8] py-0.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Atur Preferensi</span>
            </button>
            <button
              type="button"
              onClick={onOpenPolicy}
              className="inline-flex items-center gap-1 font-medium text-[#64748B] hover:text-[#102B69] underline underline-offset-2 py-0.5 transition-colors cursor-pointer"
            >
              <span>Kebijakan Privasi &amp; Cookie</span>
            </button>
          </div>
        </aside>
      )}

      {isPreferencesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102B69]/45 backdrop-blur-[1px] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClosePreferences();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
            className="w-full max-w-[540px] max-h-[90vh] flex flex-col bg-white border border-[#E2E8F0] rounded-[6px] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-[#EAF2FF] flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="cookie-prefs-title"
                    className="text-base font-bold text-[#102B69] tracking-tight"
                  >
                    Pengaturan Privasi &amp; Cookie
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Transparansi penyimpanan lokal PEVORA · UU PDP No. 27/2022
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClosePreferences}
                aria-label="Tutup pengaturan cookie"
                className="w-9 h-9 rounded-[4px] inline-flex items-center justify-center text-[#64748B] hover:text-[#102B69] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto space-y-3.5">
              <p className="text-xs text-[#475569] leading-relaxed">
                Anda memiliki kendali penuh atas kategori penyimpanan non-esensial di browser ini.
                Data kamera, koordinat GPS presensi, serta pemindaian KTP/KK hanya diproses saat
                Anda memicu fitur terkait di dalam portal terautentikasi.
              </p>

              {COOKIE_CATEGORIES.map((category) => {
                const isChecked =
                  category.id === 'essential'
                    ? true
                    : category.id === 'preferences'
                      ? draftPreferences
                      : draftAnalytics;

                const handleToggle = () => {
                  if (category.required) return;
                  if (category.id === 'preferences') {
                    setDraftPreferences((prev) => !prev);
                  } else if (category.id === 'analytics') {
                    setDraftAnalytics((prev) => !prev);
                  }
                };

                return (
                  <div
                    key={category.id}
                    className="p-3.5 border border-[#E2E8F0] rounded-[6px] bg-[#F8FAFC]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-sm font-bold text-[#102B69]">{category.title}</h3>
                          <span
                            className={`text-[11px] font-semibold ${
                              category.required ? 'text-[#1468E8]' : 'text-[#64748B]'
                            }`}
                          >
                            {category.statusLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                          {category.description}
                        </p>
                        <p className="mt-1.5 text-[11px] text-[#64748B]">
                          <span className="font-semibold text-[#334155]">Cakupan:</span>{' '}
                          {category.examples}
                        </p>
                      </div>

                      {category.required ? (
                        <div
                          aria-label={`${category.title} selalu aktif`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#102B69] shrink-0 pt-0.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                          <span>Aktif</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isChecked}
                          aria-label={`Aktifkan ${category.title}`}
                          onClick={handleToggle}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer ${
                            isChecked
                              ? 'bg-[#1468E8] border-[#1468E8]'
                              : 'bg-[#CBD5E1] border-[#CBD5E1]'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              isChecked ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onClosePreferences();
                    onOpenPolicy();
                  }}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#1468E8] hover:text-[#102B69] underline underline-offset-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Baca Kebijakan Privasi &amp; Cookie</span>
                </button>
                {consent && (
                  <span className="text-[11px] text-[#64748B] inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#16A34A]" aria-hidden="true" />
                    Preferensi tersimpan
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                type="button"
                onClick={onAcceptEssential}
                className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[4px] min-h-[40px] whitespace-nowrap cursor-pointer"
              >
                Hanya Esensial
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSaveCustom({
                      preferences: draftPreferences,
                      analytics: draftAnalytics,
                    })
                  }
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[#102B69] bg-[#EAF2FF] hover:bg-[#DCE9FE] border border-[#C9DDFB] rounded-[4px] min-h-[40px] whitespace-nowrap cursor-pointer"
                >
                  Simpan Preferensi
                </button>
                <button
                  type="button"
                  onClick={onAcceptAll}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] min-h-[40px] whitespace-nowrap cursor-pointer"
                >
                  Terima Semua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPolicyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102B69]/45 backdrop-blur-[1px] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClosePolicy();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-policy-title"
            className="w-full max-w-[640px] max-h-[90vh] flex flex-col bg-white border border-[#E2E8F0] rounded-[6px] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-[#EAF2FF] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="privacy-policy-title"
                    className="text-base font-bold text-[#102B69] tracking-tight"
                  >
                    Kebijakan Privasi &amp; Penggunaan Cookie
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    PT Iskandar Pratama Teknologi · Kepatuhan UU PDP No. 27 Tahun 2022
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClosePolicy}
                aria-label="Tutup kebijakan privasi"
                className="w-9 h-9 rounded-[4px] inline-flex items-center justify-center text-[#64748B] hover:text-[#102B69] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="px-5 py-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#334155] leading-relaxed">
              <section>
                <h3 className="text-sm font-bold text-[#102B69]">
                  1. Pengendali Data &amp; Ruang Lingkup
                </h3>
                <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                  Platform <strong>PEVORA — People Empowered Workforce</strong> dikembangkan oleh{' '}
                  <strong>PT Iskandar Pratama Teknologi</strong> untuk mendukung tata kelola
                  rekrutmen, administrasi berkas karyawan, tanda tangan PKWT/PKWTT digital,
                  kepatuhan BPJS, serta presensi biometrik sesuai ketentuan Undang-Undang No. 27
                  Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold text-[#102B69]">
                  2. Jenis Data Operasional yang Diproses
                </h3>
                <ul className="mt-1.5 space-y-1.5 text-xs text-[#475569] list-disc pl-4">
                  <li>
                    <strong>Identitas &amp; Dokumen Ketenagakerjaan:</strong> Data KTP/KK hasil
                    pemindaian OCR mandiri pelamar maupun verifikasi berkas oleh HR hanya disimpan
                    setelah dikonfirmasi pengguna.
                  </li>
                  <li>
                    <strong>Biometrik Wajah &amp; Lokasi Presensi:</strong> Kamera liveness dan titik
                    koordinat GPS hanya diakses saat karyawan memulai registrasi wajah atau
                    melakukan presensi masuk/pulang.
                  </li>
                  <li>
                    <strong>Kontrak Kerja &amp; Catatan Audit:</strong> Riwayat penandatanganan PKWT
                    digital dan jejak perubahan akun dicatat untuk kebutuhan audit internal klien.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-bold text-[#102B69]">
                  3. Cookie &amp; Penyimpanan Lokal Browser
                </h3>
                <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                  PEVORA tidak menggunakan cookie pelacakan iklan pihak ketiga. Penyimpanan lokal
                  hanya dipakai untuk kategori esensial keamanan sesi serta preferensi antarmuka dan
                  analitik performa apabila Anda memberikan persetujuan.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold text-[#102B69]">
                  4. Hak Subjek Data &amp; Kontak Resmi
                </h3>
                <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                  Anda dapat mengubah preferensi penyimpanan lokal kapan saja melalui menu{' '}
                  <strong>Pengaturan Cookie</strong> di bagian footer halaman utama. Untuk
                  permintaan akses, pembaruan data, atau pertanyaan privasi, hubungi tim tata kelola
                  data di{' '}
                  <a
                    href="mailto:enterprise@iskandarpratama.co.id"
                    className="font-semibold text-[#1468E8] underline underline-offset-2"
                  >
                    enterprise@iskandarpratama.co.id
                  </a>
                  .
                </p>
              </section>
            </div>

            <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onClosePolicy();
                  onOpenPreferences();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-[4px] min-h-[40px] whitespace-nowrap cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Atur Preferensi Cookie</span>
              </button>
              <button
                type="button"
                onClick={onClosePolicy}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#102B69] hover:bg-[#1468E8] rounded-[4px] min-h-[40px] whitespace-nowrap cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
