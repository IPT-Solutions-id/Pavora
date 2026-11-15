import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { IMPACT_STATS } from '../data/hrisData';

const TEAM_IMAGE_PATH = '/src/assets/images/pevora_hr_team_1794510308095.jpg';

export const ImpactProofSection: React.FC = () => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section id="keunggulan" className="bg-[#F5F7FA] border-b border-[#E2E8F0] py-16 lg:py-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left 5 cols: Editorial photography */}
          <div className="lg:col-span-5 flex">
            <div className="w-full min-h-[280px] lg:min-h-full rounded-[6px] overflow-hidden border border-[#E2E8F0] bg-white">
              {!imgFailed ? (
                <img
                  src={TEAM_IMAGE_PATH}
                  alt="Manajer SDM dan rekruter meninjau analitik talenta di ruang rapat"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover lg:h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#EAF2FF] text-[#102B69] text-center">
                  <Users className="w-10 h-10 mb-3 text-[#1468E8]" aria-hidden="true" />
                  <p className="text-base font-bold">Analitik Talenta & Operasional SDM</p>
                </div>
              )}
            </div>
          </div>

          {/* Right 7 cols: Quantified Metrics Grid + Testimonial */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            <div>
              <p className="font-jakarta text-sm font-semibold text-[#1468E8] mb-2">
                Dampak Terukur & Keandalan Enterprise
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#102B69] tracking-tight mb-6"
                style={{ textWrap: 'balance' }}
              >
                Efisiensi operasional SDM dengan standar akuntabilitas tinggi.
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {IMPACT_STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white border border-[#E2E8F0] rounded-[6px] p-5"
                  >
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#102B69] tabular-nums mb-1">
                      {stat.value}
                    </p>
                    <h3 className="text-sm font-bold text-[#172033] mb-1">{stat.label}</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">{stat.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attributable Testimonial Card */}
            <blockquote className="bg-white border border-[#E2E8F0] rounded-[6px] p-6">
              <p className="text-sm sm:text-base text-[#172033] leading-relaxed mb-4">
                “Sebelum menggunakan PEVORA, rekapitulasi absensi cabang dan validasi penggajian
                memakan waktu lima hari kerja setiap bulan. Dengan pemisahan akses Admin dan
                Master Admin yang terstruktur, proses tutup buku payroll kini selesai dalam satu
                hari dengan jejak audit yang jelas.”
              </p>
              <footer className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                <span className="font-bold text-[#102B69]">Hendra Wijaya</span>
                <span aria-hidden="true">·</span>
                <span>Direktur Operasional SDM, PT Nusantara Logistik Mandiri</span>
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
};
