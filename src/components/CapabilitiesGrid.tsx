import React from 'react';
import { Check } from 'lucide-react';
import { CAPABILITY_MODULES, CapabilityModule } from '../data/hrisData';

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
      </div>
    </section>
  );
};
