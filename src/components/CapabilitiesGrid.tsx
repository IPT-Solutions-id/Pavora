import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { CAPABILITY_MODULES, CapabilityModule, END_TO_END_WORKFLOW } from '../data/hrisData';

function getSurfaceClasses(surface: CapabilityModule['surface']) {
  switch (surface) {
    case 'navy':
      return {
        card: 'bg-[#102B69] border-[#102B69] text-white',
        kicker: 'text-[#EAF2FF]/80',
        title: 'text-white',
        desc: 'text-[#EAF2FF]/90',
        divider: 'border-white/15',
        bulletText: 'text-white/95',
        checkColor: 'text-[#FF7A1A]',
        indexColor: 'text-[#FF7A1A]',
      };
    case 'light-blue':
      return {
        card: 'bg-[#EAF2FF] border-[#C9DDFB] text-[#172033]',
        kicker: 'text-[#1468E8]',
        title: 'text-[#102B69]',
        desc: 'text-[#475569]',
        divider: 'border-[#1468E8]/15',
        bulletText: 'text-[#172033]',
        checkColor: 'text-[#1468E8]',
        indexColor: 'text-[#1468E8]',
      };
    case 'light-gray':
      return {
        card: 'bg-[#F5F7FA] border-[#E2E8F0] text-[#172033]',
        kicker: 'text-[#64748B]',
        title: 'text-[#102B69]',
        desc: 'text-[#64748B]',
        divider: 'border-[#E2E8F0]',
        bulletText: 'text-[#172033]',
        checkColor: 'text-[#1468E8]',
        indexColor: 'text-[#1468E8]',
      };
    case 'white':
    default:
      return {
        card: 'bg-white border-[#E2E8F0] text-[#172033]',
        kicker: 'text-[#64748B]',
        title: 'text-[#102B69]',
        desc: 'text-[#64748B]',
        divider: 'border-[#E2E8F0]',
        bulletText: 'text-[#172033]',
        checkColor: 'text-[#1468E8]',
        indexColor: 'text-[#1468E8]',
      };
  }
}

export const CapabilitiesGrid: React.FC = () => {
  return (
    <section id="fitur" className="bg-[#F5F7FA] border-b border-[#E2E8F0] py-16 lg:py-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 items-end">
          <div className="lg:col-span-7">
            <p className="font-jakarta text-sm font-semibold text-[#1468E8] mb-2">
              Arsitektur Modul HRIS
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#102B69] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Satu grid operasional untuk seluruh siklus kerja karyawan.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
              Setiap modul dirancang dalam struktur grid yang bersih dan konsisten agar tim SDM,
              rekruter, dan pimpinan perusahaan mengambil keputusan lebih cepat tanpa spreadsheet
              terpisah.
            </p>
          </div>
        </div>

        {/* Asymmetric 3-column Bento Grid with crisp low-radius (6px) cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {CAPABILITY_MODULES.map((mod) => {
            const styles = getSurfaceClasses(mod.surface);
            const spanClass = mod.colSpan === 2 ? 'lg:col-span-2' : 'lg:col-span-1';

            return (
              <article
                key={mod.id}
                className={`${spanClass} ${styles.card} border rounded-[6px] p-6 sm:p-7 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className={`font-jakarta text-xs font-semibold ${styles.kicker}`}>
                      {mod.category}
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${styles.indexColor}`}>
                      {mod.index}.
                    </span>
                  </div>

                  <h3 className={`text-xl font-bold tracking-tight mb-3 ${styles.title}`}>
                    {mod.title}
                  </h3>

                  <p className={`text-sm leading-relaxed mb-6 ${styles.desc}`}>
                    {mod.description}
                  </p>
                </div>

                <ul className={`pt-4 border-t ${styles.divider} space-y-2 text-sm`}>
                  {mod.highlights.map((point) => (
                    <li key={point} className={`flex items-start gap-2.5 ${styles.bulletText}`}>
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${styles.checkColor}`}
                        aria-hidden="true"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* 5-Stage End-to-End Connected Portal Workflow Strip */}
        <div className="mt-10 bg-white border border-[#E2E8F0] rounded-[6px] p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 mb-5 border-b border-[#E2E8F0]">
            <div>
              <p className="font-jakarta text-xs font-semibold text-[#1468E8]">
                ALUR KERJA TERINTEGRASI 5 PORTAL
              </p>
              <h3 className="text-lg font-bold text-[#102B69] mt-0.5">
                Dari Portal Pelamar hingga Tata Kelola Master Admin
              </h3>
            </div>
            <span className="text-xs font-medium text-[#64748B]">
              Tanpa input ulang data kandidat ke karyawan aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {END_TO_END_WORKFLOW.map((item, idx) => (
              <div
                key={item.step}
                className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-jakarta text-xs font-bold text-[#FF7A1A] tabular-nums">
                      {item.step}
                    </span>
                    {idx < END_TO_END_WORKFLOW.length - 1 ? (
                      <ArrowRight
                        className="w-3.5 h-3.5 text-[#94A3B8] hidden lg:block"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-[#1468E8] mb-1">{item.role}</p>
                  <h4 className="text-sm font-bold text-[#102B69] mb-1.5 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">{item.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
