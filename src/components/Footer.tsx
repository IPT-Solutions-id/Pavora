import React from 'react';
import { PevoraLogo } from './PevoraLogo';

interface FooterProps {
  onOpenCookieSettings?: () => void;
  onOpenPrivacyPolicy?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenCookieSettings,
  onOpenPrivacyPolicy,
}) => {
  return (
    <footer className="bg-[#102B69] text-white border-t border-[#102B69]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
          <div className="md:col-span-5">
            <PevoraLogo variant="light" />
            <p className="mt-3 text-sm text-[#EAF2FF]/90 max-w-sm leading-relaxed">
              People Empowered Workforce — Platform HRIS terpadu untuk tata kelola sumber daya
              manusia yang tertib, aman, dan terukur.
            </p>
            <p className="mt-4 text-xs font-medium text-[#EAF2FF]/75">
              Developed by PT Iskandar Pratama Teknologi
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold text-[#EAF2FF]/70 mb-3">Navigasi</h2>
            <ul className="space-y-2.5 text-sm text-[#EAF2FF]/90">
              <li>
                <a href="#beranda" className="hover:text-white transition-colors">
                  Beranda
                </a>
              </li>
              <li>
                <a href="#fitur" className="hover:text-white transition-colors">
                  Modul HRIS
                </a>
              </li>
              <li>
                <a href="#peran" className="hover:text-white transition-colors">
                  Peran Pengguna
                </a>
              </li>
              <li>
                <a href="#keunggulan" className="hover:text-white transition-colors">
                  Keunggulan
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="text-xs font-semibold text-[#EAF2FF]/70 mb-3">Struktur 5 Portal Sistem</h2>
            <ul className="space-y-2 text-sm text-[#EAF2FF]/90">
              <li>Master Admin — Tata Kelola &amp; Multi-Entitas</li>
              <li>Admin — Operasional HR, Berkas &amp; PKWT</li>
              <li>Rekruter — Akuisisi Talenta &amp; ATS</li>
              <li>Karyawan — Biometrik, Menu TTD &amp; BPJS</li>
              <li>Pelamar — Portal Karier &amp; OCR Mandiri</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#EAF2FF]/75">
          <p>
            © {new Date().getFullYear()} PT Iskandar Pratama Teknologi. Seluruh hak cipta dilindungi.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="text-xs text-[#EAF2FF]/85 hover:text-white underline underline-offset-4 transition-colors py-1 cursor-pointer"
              >
                Kebijakan Privasi
              </button>
            )}
            {onOpenCookieSettings && (
              <button
                type="button"
                onClick={onOpenCookieSettings}
                className="text-xs text-[#EAF2FF]/85 hover:text-white underline underline-offset-4 transition-colors py-1 cursor-pointer"
              >
                Pengaturan Cookie
              </button>
            )}
            <span className="text-[#EAF2FF]/60">PEVORA · People Empowered Workforce</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
