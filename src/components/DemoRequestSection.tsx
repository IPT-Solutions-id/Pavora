import React, { useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import {
  DemoRequestErrors,
  DemoRequestInput,
  EMPLOYEE_COUNT_OPTIONS,
  PRIORITY_ROLE_OPTIONS,
  formatHeadcountLabel,
  validateDemoRequest,
} from '../utils/validation';

const INITIAL_FORM: DemoRequestInput = {
  fullName: '',
  workEmail: '',
  companyName: '',
  employeeCount: '',
  priorityRole: '',
};

export const DemoRequestSection: React.FC = () => {
  const [form, setForm] = useState<DemoRequestInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<DemoRequestErrors>({});
  const [submittedData, setSubmittedData] = useState<DemoRequestInput | null>(null);

  const handleChange = (field: keyof DemoRequestInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDemoRequest(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmittedData({ ...form });
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmittedData(null);
  };

  return (
    <section id="kontak" className="bg-white py-16 lg:py-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left 5 cols: Corporate Consultation Info */}
          <div className="lg:col-span-5">
            <p className="font-jakarta text-sm font-semibold text-[#1468E8] mb-2">
              Konsultasi Implementasi
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#102B69] tracking-tight mb-4"
              style={{ textWrap: 'balance' }}
            >
              Mulai transformasi HRIS bersama tim PT Iskandar Pratama Teknologi.
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] leading-relaxed mb-8">
              Jadwalkan sesi demo terpandu untuk melihat bagaimana alur kerja Master Admin, Admin,
              Rekruter, dan Karyawan dapat disesuaikan dengan struktur perusahaan Anda.
            </p>

            <div className="border-t border-[#E2E8F0] pt-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#64748B] mb-1">Pengembang Platform</p>
                <p className="text-sm font-bold text-[#102B69]">PT Iskandar Pratama Teknologi</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748B] mb-1">Cakupan Implementasi</p>
                <p className="text-sm text-[#172033]">
                  Migrasi data karyawan, konfigurasi matriks persetujuan, pelatihan admin, dan
                  dukungan teknis khusus.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748B] mb-1">Kontak Resmi</p>
                <p className="text-sm font-medium text-[#1468E8]">
                  enterprise@iskandarpratama.co.id
                </p>
              </div>
            </div>
          </div>

          {/* Right 7 cols: Validated Demo Request Form */}
          <div className="lg:col-span-7">
            <div className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-[6px] p-6 sm:p-8">
              {submittedData ? (
                <div role="status" aria-live="polite" className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 sm:p-8">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle2
                      className="w-6 h-6 text-[#16A36A] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-[#102B69]">
                        Permintaan Demo Berhasil Dicatat
                      </h3>
                      <p className="text-sm text-[#64748B] mt-1">
                        Tim implementasi PT Iskandar Pratama Teknologi akan menghubungi Anda
                        melalui email perusahaan untuk penjadwalan sesi presentasi PEVORA.
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 my-4 border-y border-[#E2E8F0] text-sm">
                    <div>
                      <dt className="text-xs text-[#64748B]">Nama Pemohon</dt>
                      <dd className="font-semibold text-[#172033]">{submittedData.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748B]">Email Perusahaan</dt>
                      <dd className="font-semibold text-[#172033]">{submittedData.workEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748B]">Perusahaan</dt>
                      <dd className="font-semibold text-[#172033]">{submittedData.companyName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748B]">Skala & Peran Prioritas</dt>
                      <dd className="font-semibold text-[#172033]">
                        {formatHeadcountLabel(submittedData.employeeCount)} ·{' '}
                        {submittedData.priorityRole}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>Kirim Permintaan Lain</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-xs font-semibold text-[#102B69] mb-1.5"
                      >
                        Nama Lengkap
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={form.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        aria-invalid={Boolean(errors.fullName)}
                        className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                          errors.fullName ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                        }`}
                      />
                      {errors.fullName && (
                        <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="workEmail"
                        className="block text-xs font-semibold text-[#102B69] mb-1.5"
                      >
                        Email Perusahaan
                      </label>
                      <input
                        id="workEmail"
                        name="workEmail"
                        type="email"
                        value={form.workEmail}
                        onChange={(e) => handleChange('workEmail', e.target.value)}
                        placeholder="nama@perusahaan.co.id"
                        aria-invalid={Boolean(errors.workEmail)}
                        className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                          errors.workEmail ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                        }`}
                      />
                      {errors.workEmail && (
                        <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                          {errors.workEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="companyName"
                      className="block text-xs font-semibold text-[#102B69] mb-1.5"
                    >
                      Nama Perusahaan
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={form.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      placeholder="PT Contoh Perusahaan Indonesia"
                      aria-invalid={Boolean(errors.companyName)}
                      className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                        errors.companyName ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                      }`}
                    />
                    {errors.companyName && (
                      <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                        {errors.companyName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="employeeCount"
                        className="block text-xs font-semibold text-[#102B69] mb-1.5"
                      >
                        Jumlah Karyawan
                      </label>
                      <select
                        id="employeeCount"
                        name="employeeCount"
                        value={form.employeeCount}
                        onChange={(e) => handleChange('employeeCount', e.target.value)}
                        aria-invalid={Boolean(errors.employeeCount)}
                        className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                          errors.employeeCount ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                        }`}
                      >
                        <option value="">Pilih rentang karyawan</option>
                        {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.employeeCount && (
                        <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                          {errors.employeeCount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="priorityRole"
                        className="block text-xs font-semibold text-[#102B69] mb-1.5"
                      >
                        Peran Prioritas Evaluasi
                      </label>
                      <select
                        id="priorityRole"
                        name="priorityRole"
                        value={form.priorityRole}
                        onChange={(e) => handleChange('priorityRole', e.target.value)}
                        aria-invalid={Boolean(errors.priorityRole)}
                        className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                          errors.priorityRole ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                        }`}
                      >
                        <option value="">Pilih peran utama</option>
                        {PRIORITY_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.priorityRole && (
                        <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                          {errors.priorityRole}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs text-[#64748B]">
                      Data Anda digunakan khusus untuk penjadwalan konsultasi PEVORA.
                    </p>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8]"
                    >
                      Kirim Permintaan Demo
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
