import React from 'react';
import { ArrowRight, FileSignature, LogIn, ScanFace, ShieldCheck, UserCheck } from 'lucide-react';

interface HeroSectionProps {
  onLoginClick?: () => void;
}

const HERO_STRIPS = [
  {
    code: '01 · Master Admin',
    title: 'Tata Kelola Multi-Entitas',
    detail: 'Unit internal, klien penempatan, kebijakan jam kerja & audit sistem',
  },
  {
    code: '02 · Admin',
    title: 'Operasional HR & Berkas',
    detail: 'Rekap presensi, verifikasi 11 berkas, kartu BPJS & penerbitan PKWT',
  },
  {
    code: '03 · Rekruter',
    title: 'Akuisisi Talenta (ATS)',
    detail: 'Lowongan per klien, seleksi kandidat & handoff otomatis ke NIK',
  },
  {
    code: '04 · Karyawan',
    title: 'Layanan Mandiri (ESS)',
    detail: 'Absen biometrik live, cuti/SKD, Menu TTD PKWT & Kartu BPJS',
  },
] as const;

const HERO_PILLARS = [
  {
    code: 'GERBANG BIOMETRIK',
    title: 'Presensi Wajah Anti-Spoof Live',
    metric: '4 Gerbang 3D · ≥ 82%',
    detail: 'Wajah terdaftar, kamera langsung, kedip mata & toleh kepala 3D otomatis Clock-In/Out.',
    icon: ScanFace,
  },
  {
    code: 'KONTRAK DIGITAL',
    title: 'PKWT 4 Halaman & Menu TTD',
    metric: '1:1 PDF · Anti-Edit',
    detail: 'Perpanjangan PKWT non-otomatis wajib ditinjau karyawan lalu terkunci permanen setelah TTD.',
    icon: FileSignature,
  },
  {
    code: 'KEPATUHAN SDM',
    title: 'Kartu Digital BPJS & 11 Berkas',
    metric: 'JKN-KIS · KPJ Sinkron',
    detail: 'Kartu kepesertaan digital, upload scan kartu fisik, dan pemantauan kelengkapan 11 berkas.',
    icon: ShieldCheck,
  },
  {
    code: 'REKRUTMEN KE NIK',
    title: 'Portal Pelamar & OCR KTP/KK',
    metric: 'Handoff → NIK Klien',
    detail: 'Ekstraksi KTP/KK pelamar langsung tersambung ke onboarding hingga terbit NIK klien.',
    icon: UserCheck,
  },
] as const;

export const HeroSection: React.FC<HeroSectionProps> = ({ onLoginClick }) => {
  return (
    <section id="beranda" className="bg-white border-b border-[#E2E8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
        {/* Main 12-column editorial split grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left proposition column */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="font-jakarta text-sm font-semibold text-[#1468E8] tracking-normal mb-4">
                People Empowered Workforce · PT Iskandar Pratama Teknologi
              </p>

              <h1
                className="font-extrabold text-[#102B69] tracking-tight leading-[1.12] mb-5"
                style={{ fontSize: 'clamp(2.05rem, 3.4vw, 2.85rem)', textWrap: 'balance' }}
              >
                Sistem HRIS terstruktur untuk tata kelola SDM &amp; penempatan klien modern.
              </h1>

              <p className="text-base sm:text-[17px] text-[#64748B] leading-[1.65] max-w-[56ch] mb-8">
                PEVORA menyatukan rekrutmen ATS, Portal Pelamar OCR KTP/KK, presensi biometrik
                anti-spoof, kontrak PKWT digital terkunci, hingga pemantauan 11 berkas &amp; kartu
                BPJS dalam lima portal peran yang saling terhubung.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              {onLoginClick ? (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>Masuk ke Portal</span>
                </button>
              ) : null}

              <a
                href="#kontak"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8]"
              >
                <span>Jadwalkan Demo Platform</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>

              <a
                href="#peran"
                className="inline-flex items-center justify-center px-3 py-3 text-sm font-semibold text-[#1468E8] hover:text-[#102B69] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8]"
              >
                Jelajahi Peran &amp; Alur
              </a>
            </div>
          </div>

          {/* Right visual column — crisp architectural live capabilities showcase */}
          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-[6px] border border-[#102B69] bg-[#102B69] p-5 sm:p-6 flex flex-col justify-between text-white">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/15 mb-4">
                <div>
                  <p className="font-jakarta text-xs font-semibold text-[#FF7A1A]">
                    ARSITEKTUR OPERASIONAL TERPADU
                  </p>
                  <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                    Kapabilitas Inti Platform PEVORA
                  </h2>
                </div>
                <span className="text-xs font-semibold text-[#EAF2FF] bg-white/10 border border-white/15 px-2.5 py-1 rounded-[4px] tabular-nums">
                  5 Portal RBAC
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {HERO_PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.code}
                      className="bg-white text-[#172033] border border-[#E2E8F0] rounded-[4px] p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-jakarta text-[11px] font-semibold text-[#1468E8]">
                            {pillar.code}
                          </span>
                          <Icon className="w-4 h-4 text-[#102B69] shrink-0" aria-hidden="true" />
                        </div>
                        <h3 className="text-sm font-bold text-[#102B69] leading-snug mb-1.5">
                          {pillar.title}
                        </h3>
                        <p className="text-xs text-[#64748B] leading-relaxed">{pillar.detail}</p>
                      </div>
                      <p className="mt-3 pt-2.5 border-t border-[#E2E8F0] text-[11px] font-bold text-[#102B69] tabular-nums">
                        {pillar.metric}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column role grid strip below hero split */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HERO_STRIPS.map((item) => (
            <div
              key={item.code}
              className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] p-4 flex flex-col justify-between"
            >
              <span className="font-jakarta text-xs font-semibold text-[#1468E8] mb-1.5">
                {item.code}
              </span>
              <h2 className="text-sm font-bold text-[#102B69] mb-1">{item.title}</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
