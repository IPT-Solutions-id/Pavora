import React, { useState } from 'react';
import { ArrowRight, Building2 } from 'lucide-react';

const HERO_IMAGE_PATH = '/src/assets/images/pevora_hero_workspace_1794510324026.jpg';

const HERO_STRIPS = [
  {
    code: '01 · Master Admin',
    title: 'Tata Kelola Multi-Entitas',
    detail: 'Kontrol kebijakan korporat & audit sistem terpusat',
  },
  {
    code: '02 · Admin',
    title: 'Operasional HR & Payroll',
    detail: 'Presensi harian, PPh 21, dan iuran BPJS otomatis',
  },
  {
    code: '03 · Rekruter',
    title: 'Akuisisi Talenta Terpadu',
    detail: 'Pelacakan kandidat hingga konversi karyawan aktif',
  },
  {
    code: '04 · Karyawan',
    title: 'Layanan Mandiri (ESS)',
    detail: 'Absensi, cuti, dan akses slip gaji digital aman',
  },
] as const;

export const HeroSection: React.FC = () => {
  const [imgFailed, setImgFailed] = useState(false);

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
                style={{ fontSize: 'clamp(2.125rem, 3.6vw, 2.95rem)', textWrap: 'balance' }}
              >
                Sistem HRIS terstruktur untuk tata kelola SDM perusahaan modern.
              </h1>

              <p className="text-base sm:text-[17px] text-[#64748B] leading-[1.65] max-w-[56ch] mb-8">
                PEVORA menyatukan manajemen karyawan, rekrutmen, absensi, dan penggajian dalam satu
                platform dengan pembagian peran yang jelas untuk Master Admin, Admin, Rekruter, dan
                Karyawan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#kontak"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8]"
              >
                <span>Jadwalkan Demo Platform</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>

              <a
                href="#peran"
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8]"
              >
                Jelajahi 4 Peran Sistem
              </a>
            </div>
          </div>

          {/* Right visual column — crisp low-radius architectural frame */}
          <div className="lg:col-span-6 flex">
            <div className="relative w-full min-h-[300px] lg:min-h-[400px] rounded-[6px] overflow-hidden border border-[#E2E8F0] bg-[#F5F7FA]">
              {!imgFailed ? (
                <img
                  src={HERO_IMAGE_PATH}
                  alt="Tim HR dan manajemen perusahaan berkolaborasi menggunakan platform PEVORA di ruang kerja modern"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover lg:h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#102B69] to-[#1468E8] text-white text-center">
                  <Building2 className="w-10 h-10 mb-3 text-[#FF7A1A]" aria-hidden="true" />
                  <p className="text-lg font-bold">PEVORA Enterprise Workspace</p>
                  <p className="text-sm text-[#EAF2FF] mt-1">
                    People Empowered Workforce · PT Iskandar Pratama Teknologi
                  </p>
                </div>
              )}
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
