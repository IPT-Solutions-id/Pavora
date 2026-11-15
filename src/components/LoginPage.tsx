import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Info, Lock, ShieldCheck } from 'lucide-react';
import { PevoraLogo } from './PevoraLogo';
import {
  ApplicantAuthCandidate,
  EmployeeAuthCandidate,
  InternalUserAuthCandidate,
  LoginErrors,
  MasterAdminUser,
  RegisterErrors,
  RegisterInput,
  authenticatePortalUser,
  validateForgotPasswordIdentifier,
  validateLoginForm,
  validateRegisterForm,
} from '../utils/validation';

const HERO_IMAGE_PATH = '/src/assets/images/pevora_hero_workspace_1794510324026.jpg';

interface LoginPageProps {
  onBackToHome: () => void;
  onLoginSuccess: (user: MasterAdminUser) => void;
  registeredApplicants?: ApplicantAuthCandidate[];
  registeredEmployees?: EmployeeAuthCandidate[];
  registeredUsers?: InternalUserAuthCandidate[];
  onRegisterApplicant?: (input: RegisterInput) => {
    ok: boolean;
    user?: MasterAdminUser;
    error?: string;
  };
}

type AuthPanelMode = 'login' | 'register' | 'forgot';

const INITIAL_REGISTER_FORM: RegisterInput = {
  fullName: '',
  email: '',
  whatsappNumber: '',
  password: '',
  confirmPassword: '',
};

const GoogleMark: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  onLoginSuccess,
  registeredApplicants = [],
  registeredEmployees = [],
  registeredUsers = [],
  onRegisterApplicant,
}) => {
  const [mode, setMode] = useState<AuthPanelMode>('login');

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [loginAuthError, setLoginAuthError] = useState<string | null>(null);

  // Register (Pelamar) state
  const [registerForm, setRegisterForm] = useState<RegisterInput>(INITIAL_REGISTER_FORM);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [registerAuthError, setRegisterAuthError] = useState<string | null>(null);
  const [registerSubmitted, setRegisterSubmitted] = useState<RegisterInput | null>(null);

  // Google Auth pending notice
  const [googleNoticeAction, setGoogleNoticeAction] = useState<'login' | 'register' | null>(null);

  // Forgot Password state
  const [recoveryId, setRecoveryId] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | undefined>(undefined);
  const [recoverySubmittedId, setRecoverySubmittedId] = useState<string | null>(null);

  const [imgFailed, setImgFailed] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleNoticeAction(null);
    setLoginAuthError(null);
    const validation = validateLoginForm({ identifier, password });
    if (!validation.isValid) {
      setLoginErrors(validation.errors);
      return;
    }
    setLoginErrors({});
    const authResult = authenticatePortalUser(
      identifier,
      password,
      registeredApplicants,
      registeredEmployees,
      registeredUsers
    );
    if (!authResult.ok || !authResult.user) {
      setLoginAuthError(
        authResult.error ?? 'ID/Email atau kata sandi tidak sesuai.'
      );
      return;
    }
    onLoginSuccess(authResult.user);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleNoticeAction(null);
    setRegisterAuthError(null);
    const validation = validateRegisterForm(registerForm);
    if (!validation.isValid) {
      setRegisterErrors(validation.errors);
      return;
    }
    setRegisterErrors({});
    if (onRegisterApplicant) {
      const regResult = onRegisterApplicant(registerForm);
      if (!regResult.ok || !regResult.user) {
        setRegisterAuthError(
          regResult.error ?? 'Pendaftaran akun pelamar gagal. Periksa email Anda.'
        );
        return;
      }
      onLoginSuccess(regResult.user);
      return;
    }
    setRegisterSubmitted({ ...registerForm });
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForgotPasswordIdentifier(recoveryId);
    if (!validation.isValid) {
      setRecoveryError(validation.error);
      return;
    }
    setRecoveryError(undefined);
    setRecoverySubmittedId(recoveryId.trim());
  };

  const handleGoogleAction = (action: 'login' | 'register') => {
    setGoogleNoticeAction(action);
  };

  const switchToForgot = () => {
    setRecoveryId(identifier);
    setRecoveryError(undefined);
    setRecoverySubmittedId(null);
    setGoogleNoticeAction(null);
    setLoginAuthError(null);
    setMode('forgot');
  };

  const switchToRegister = () => {
    setRegisterErrors({});
    setRegisterSubmitted(null);
    setGoogleNoticeAction(null);
    setLoginAuthError(null);
    setMode('register');
  };

  const switchToLogin = () => {
    setLoginErrors({});
    setLoginAuthError(null);
    setGoogleNoticeAction(null);
    setMode('login');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F5F7FA]">
      {/* Left 6 columns: Hero Panel */}
      <aside className="lg:col-span-6 relative bg-[#102B69] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden min-h-[300px] lg:min-h-screen">
        {!imgFailed && (
          <img
            src={HERO_IMAGE_PATH}
            alt="Lingkungan kerja perusahaan menggunakan platform PEVORA"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#102B69]/95 via-[#102B69]/90 to-[#1468E8]/75"
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white rounded-[4px] cursor-pointer"
            aria-label="Kembali ke beranda PEVORA"
          >
            <PevoraLogo variant="light" />
          </button>
          <span className="font-jakarta text-xs font-semibold text-[#EAF2FF]/85">
            Portal Autentikasi HRIS
          </span>
        </div>

        <div className="relative z-10 my-10 lg:my-0 max-w-lg">
          <p className="font-jakarta text-sm font-semibold text-[#FF7A1A] mb-3">
            People Empowered Workforce
          </p>
          <h1
            className="font-extrabold tracking-tight leading-[1.15] text-white mb-4"
            style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.65rem)', textWrap: 'balance' }}
          >
            {mode === 'register'
              ? 'Daftar sebagai Pelamar & akses lowongan aktif PEVORA secara instan.'
              : 'Satu akses aman untuk operasional SDM, Rekrutmen & Pelamar.'}
          </h1>
          <p className="text-sm sm:text-base text-[#EAF2FF]/90 leading-relaxed mb-8">
            {mode === 'register'
              ? 'Buat akun pelamar dan langsung masuk ke portal. Lengkapi profil karyawan dengan AI Vision OCR KTP & KK atau isi manual kapan saja.'
              : 'Masuk menggunakan NIK Karyawan / Kode Pelamar atau email Anda. Sistem otomatis mengarahkan ke ruang kerja Master Admin, Admin, Rekruter, Karyawan, atau Pelamar.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/15">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#FF7A1A] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-white">Proteksi Akses Terstruktur</p>
                <p className="text-xs text-[#EAF2FF]/80 mt-0.5">
                  Pemisahan hak akses terenkripsi dan jejak audit per sesi.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#EAF2FF] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-white">Kendali Kebijakan Korporat</p>
                <p className="text-xs text-[#EAF2FF]/80 mt-0.5">
                  Pemulihan kata sandi terverifikasi melalui administrasi HR.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-[#EAF2FF]/75">
          <span>Developed by PT Iskandar Pratama Teknologi</span>
          <span>PEVORA Enterprise HRIS</span>
        </div>
      </aside>

      {/* Right 6 columns: Auth Form Workspace */}
      <main className="lg:col-span-6 flex flex-col justify-center px-4 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-[460px] mx-auto">
          <div className="mb-6">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#102B69] hover:text-[#1468E8] transition-colors py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] rounded-[4px] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 sm:p-8">
            {mode === 'login' && (
              <>
                <div className="mb-6">
                      <p className="font-jakarta text-xs font-semibold text-[#1468E8] mb-1.5">
                        Masuk Sistem
                      </p>
                      <h2 className="text-2xl font-bold text-[#102B69] tracking-tight">
                        Masuk ke Akun PEVORA
                      </h2>
                      <p className="text-sm text-[#64748B] mt-1.5">
                        Masukkan ID Karyawan atau email perusahaan beserta kata sandi Anda.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoogleAction('login')}
                      className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#172033] bg-white hover:bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] transition-colors duration-150 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
                    >
                      <GoogleMark />
                      <span>Masuk dengan Google</span>
                    </button>

                    {googleNoticeAction === 'login' && (
                      <div
                        role="status"
                        className="mt-3 flex items-start gap-2.5 p-3 bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] text-xs text-[#102B69] leading-relaxed"
                      >
                        <Info className="w-4 h-4 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          Autentikasi Google akan aktif otomatis setelah integrasi penyedia
                          autentikasi (OAuth/Firebase) diaktifkan pada tahap berikutnya.
                        </span>
                      </div>
                    )}

                    <div className="relative my-5 flex items-center">
                      <div className="flex-grow border-t border-[#E2E8F0]" />
                      <span className="mx-3 text-xs font-medium text-[#64748B]">
                        atau masuk dengan ID &amp; kata sandi
                      </span>
                      <div className="flex-grow border-t border-[#E2E8F0]" />
                    </div>

                    <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                      {loginAuthError && (
                        <div
                          role="alert"
                          aria-live="assertive"
                          className="flex items-start gap-2.5 p-3 bg-[#DC3545]/10 border border-[#DC3545]/35 rounded-[4px] text-xs font-medium text-[#DC3545] leading-relaxed"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{loginAuthError}</span>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="loginIdentifier"
                          className="block text-xs font-semibold text-[#102B69] mb-1.5"
                        >
                          ID Karyawan atau Email Perusahaan
                        </label>
                        <input
                          id="loginIdentifier"
                          name="identifier"
                          type="text"
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            if (loginAuthError) setLoginAuthError(null);
                            if (loginErrors.identifier) {
                              setLoginErrors((prev) => ({ ...prev, identifier: undefined }));
                            }
                          }}
                          placeholder="swa-fathur, EMP-1024, atau nama@perusahaan.co.id"
                          aria-invalid={Boolean(loginErrors.identifier)}
                          className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                            loginErrors.identifier ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                          }`}
                        />
                        {loginErrors.identifier && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {loginErrors.identifier}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor="loginPassword"
                            className="block text-xs font-semibold text-[#102B69]"
                          >
                            Kata Sandi
                          </label>
                          <button
                            type="button"
                            onClick={switchToForgot}
                            className="text-xs font-semibold text-[#1468E8] hover:text-[#102B69] hover:underline underline-offset-2 transition-colors cursor-pointer"
                          >
                            Lupa kata sandi?
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            id="loginPassword"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (loginAuthError) setLoginAuthError(null);
                              if (loginErrors.password) {
                                setLoginErrors((prev) => ({ ...prev, password: undefined }));
                              }
                            }}
                            placeholder="Masukkan kata sandi"
                            aria-invalid={Boolean(loginErrors.password)}
                            className={`w-full pl-3.5 pr-11 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                              loginErrors.password ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                            }
                            className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-[#64748B] hover:text-[#102B69] cursor-pointer"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        {loginErrors.password && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {loginErrors.password}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <input
                          id="rememberDevice"
                          type="checkbox"
                          checked={rememberDevice}
                          onChange={(e) => setRememberDevice(e.target.checked)}
                          className="w-4 h-4 rounded-[2px] border-[#E2E8F0] text-[#1468E8] focus:ring-[#1468E8]"
                        />
                        <label htmlFor="rememberDevice" className="text-xs text-[#64748B]">
                          Ingat ID pada perangkat ini
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors duration-150 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
                      >
                        Masuk
                      </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-[#64748B]">Belum memiliki akun PEVORA?</span>
                      <button
                        type="button"
                        onClick={switchToRegister}
                        className="font-semibold text-[#1468E8] hover:text-[#102B69] hover:underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Daftar sekarang
                      </button>
                    </div>
              </>
            )}

            {mode === 'register' && (
              <>
                {registerSubmitted ? (
                  <div role="status" aria-live="polite" className="space-y-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-6 h-6 text-[#16A36A] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <h2 className="text-lg font-bold text-[#102B69]">
                          Data Pendaftaran Individu Tervalidasi
                        </h2>
                        <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
                          Akun individu untuk{' '}
                          <span className="font-semibold text-[#172033]">
                            {registerSubmitted.fullName}
                          </span>{' '}
                          ({registerSubmitted.email}) telah lolos validasi formulir.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] p-4 text-xs text-[#64748B] leading-relaxed">
                      Pembuatan akun permanen dan verifikasi email akan aktif setelah integrasi
                      layanan autentikasi dihubungkan pada tahap berikutnya.
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={switchToLogin}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
                      >
                        Ke Halaman Masuk
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRegisterSubmitted(null);
                          setRegisterForm(INITIAL_REGISTER_FORM);
                        }}
                        className="px-4 py-2.5 text-sm font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] transition-colors cursor-pointer"
                      >
                        Daftar Akun Lain
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <p className="font-jakarta text-xs font-semibold text-[#1468E8] mb-1.5">
                        Pendaftaran Akun Pelamar
                      </p>
                      <h2 className="text-2xl font-bold text-[#102B69] tracking-tight">
                        Daftar Pelamar Kerja
                      </h2>
                      <p className="text-sm text-[#64748B] mt-1.5">
                        Setelah mendaftar, Anda langsung masuk ke Portal Pelamar untuk melamar
                        lowongan &amp; memindai KTP/KK.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoogleAction('register')}
                      className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#172033] bg-white hover:bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] transition-colors duration-150 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
                    >
                      <GoogleMark />
                      <span>Daftar dengan Google</span>
                    </button>

                    {googleNoticeAction === 'register' && (
                      <div
                        role="status"
                        className="mt-3 flex items-start gap-2.5 p-3 bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] text-xs text-[#102B69] leading-relaxed"
                      >
                        <Info className="w-4 h-4 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          Pendaftaran melalui Google akan aktif otomatis setelah integrasi penyedia
                          autentikasi (OAuth/Firebase) diaktifkan pada tahap berikutnya.
                        </span>
                      </div>
                    )}

                    <div className="relative my-5 flex items-center">
                      <div className="flex-grow border-t border-[#E2E8F0]" />
                      <span className="mx-3 text-xs font-medium text-[#64748B]">
                        atau daftar langsung dengan formulir
                      </span>
                      <div className="flex-grow border-t border-[#E2E8F0]" />
                    </div>

                    <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
                      {registerAuthError && (
                        <div
                          role="alert"
                          aria-live="assertive"
                          className="flex items-start gap-2.5 p-3 bg-[#DC3545]/10 border border-[#DC3545]/35 rounded-[4px] text-xs font-medium text-[#DC3545] leading-relaxed"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{registerAuthError}</span>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="registerFullName"
                          className="block text-xs font-semibold text-[#102B69] mb-1.5"
                        >
                          Nama Lengkap (Sesuai KTP)
                        </label>
                        <input
                          id="registerFullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          value={registerForm.fullName}
                          onChange={(e) => {
                            setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }));
                            if (registerErrors.fullName) {
                              setRegisterErrors((prev) => ({ ...prev, fullName: undefined }));
                            }
                          }}
                          placeholder="Contoh: Andi Wijaya"
                          aria-invalid={Boolean(registerErrors.fullName)}
                          className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                            registerErrors.fullName ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                          }`}
                        />
                        {registerErrors.fullName && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {registerErrors.fullName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="registerEmail"
                          className="block text-xs font-semibold text-[#102B69] mb-1.5"
                        >
                          Email Aktif
                        </label>
                        <input
                          id="registerEmail"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={registerForm.email}
                          onChange={(e) => {
                            setRegisterForm((prev) => ({ ...prev, email: e.target.value }));
                            if (registerAuthError) setRegisterAuthError(null);
                            if (registerErrors.email) {
                              setRegisterErrors((prev) => ({ ...prev, email: undefined }));
                            }
                          }}
                          placeholder="nama@email.com"
                          aria-invalid={Boolean(registerErrors.email)}
                          className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                            registerErrors.email ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                          }`}
                        />
                        {registerErrors.email && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {registerErrors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="registerWhatsapp"
                          className="block text-xs font-semibold text-[#102B69] mb-1.5"
                        >
                          Nomor WhatsApp (Untuk Panggilan Interview)
                        </label>
                        <input
                          id="registerWhatsapp"
                          name="whatsappNumber"
                          type="tel"
                          autoComplete="tel"
                          value={registerForm.whatsappNumber ?? ''}
                          onChange={(e) => {
                            setRegisterForm((prev) => ({
                              ...prev,
                              whatsappNumber: e.target.value,
                            }));
                            if (registerErrors.whatsappNumber) {
                              setRegisterErrors((prev) => ({
                                ...prev,
                                whatsappNumber: undefined,
                              }));
                            }
                          }}
                          placeholder="081234567890"
                          aria-invalid={Boolean(registerErrors.whatsappNumber)}
                          className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                            registerErrors.whatsappNumber ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                          }`}
                        />
                        {registerErrors.whatsappNumber && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {registerErrors.whatsappNumber}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="registerPassword"
                          className="block text-xs font-semibold text-[#102B69] mb-1.5"
                        >
                          Kata Sandi
                        </label>
                        <div className="relative">
                          <input
                            id="registerPassword"
                            name="regPassword"
                            type={showRegPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={registerForm.password}
                            onChange={(e) => {
                              setRegisterForm((prev) => ({ ...prev, password: e.target.value }));
                              if (registerErrors.password) {
                                setRegisterErrors((prev) => ({ ...prev, password: undefined }));
                              }
                            }}
                            placeholder="Minimal 6 karakter"
                            aria-invalid={Boolean(registerErrors.password)}
                            className={`w-full pl-3.5 pr-11 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                              registerErrors.password ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword((prev) => !prev)}
                            aria-label={
                              showRegPassword
                                ? 'Sembunyikan kata sandi pendaftaran'
                                : 'Tampilkan kata sandi pendaftaran'
                            }
                            className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-[#64748B] hover:text-[#102B69] cursor-pointer"
                          >
                            {showRegPassword ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        {registerErrors.password && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {registerErrors.password}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="registerConfirmPassword"
                          className="block text-xs font-semibold text-[#102B69] mb-1.5"
                        >
                          Konfirmasi Kata Sandi
                        </label>
                        <div className="relative">
                          <input
                            id="registerConfirmPassword"
                            name="confirmPassword"
                            type={showRegConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={registerForm.confirmPassword}
                            onChange={(e) => {
                              setRegisterForm((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }));
                              if (registerErrors.confirmPassword) {
                                setRegisterErrors((prev) => ({
                                  ...prev,
                                  confirmPassword: undefined,
                                }));
                              }
                            }}
                            placeholder="Ulangi kata sandi"
                            aria-invalid={Boolean(registerErrors.confirmPassword)}
                            className={`w-full pl-3.5 pr-11 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                              registerErrors.confirmPassword
                                ? 'border-[#DC3545]'
                                : 'border-[#E2E8F0]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegConfirm((prev) => !prev)}
                            aria-label={
                              showRegConfirm
                                ? 'Sembunyikan konfirmasi kata sandi'
                                : 'Tampilkan konfirmasi kata sandi'
                            }
                            className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-[#64748B] hover:text-[#102B69] cursor-pointer"
                          >
                            {showRegConfirm ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        {registerErrors.confirmPassword && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {registerErrors.confirmPassword}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors duration-150 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
                      >
                        Daftar &amp; Masuk ke Portal Pelamar
                      </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-[#64748B]">Sudah memiliki akun PEVORA?</span>
                      <button
                        type="button"
                        onClick={switchToLogin}
                        className="font-semibold text-[#1468E8] hover:text-[#102B69] hover:underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Masuk di sini
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {mode === 'forgot' && (
              <>
                {recoverySubmittedId ? (
                  <div role="status" aria-live="polite" className="space-y-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-6 h-6 text-[#16A36A] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <h2 className="text-lg font-bold text-[#102B69]">
                          Permintaan Pemulihan Dikirim
                        </h2>
                        <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
                          Jika akun{' '}
                          <span className="font-semibold text-[#172033]">
                            {recoverySubmittedId}
                          </span>{' '}
                          terdaftar pada sistem perusahaan Anda, instruksi pembaruan kata sandi akan
                          dikirimkan ke email kerja terkait.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors min-h-[44px] cursor-pointer"
                    >
                      Kembali ke Halaman Masuk
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <p className="font-jakarta text-xs font-semibold text-[#1468E8] mb-1.5">
                        Pemulihan Akses
                      </p>
                      <h2 className="text-2xl font-bold text-[#102B69] tracking-tight">
                        Lupa Kata Sandi
                      </h2>
                      <p className="text-sm text-[#64748B] mt-1.5">
                        Masukkan ID Karyawan atau email perusahaan Anda untuk menerima tautan
                        pengaturan ulang kata sandi.
                      </p>
                    </div>

                    <form onSubmit={handleRecoverySubmit} noValidate className="space-y-5">
                      <div>
                        <label
                          htmlFor="recoveryIdentifier"
                          className="block text-xs font-semibold text-[#102B69] mb-1.5"
                        >
                          ID Karyawan atau Email Perusahaan
                        </label>
                        <input
                          id="recoveryIdentifier"
                          name="recoveryIdentifier"
                          type="text"
                          value={recoveryId}
                          onChange={(e) => {
                            setRecoveryId(e.target.value);
                            if (recoveryError) setRecoveryError(undefined);
                          }}
                          placeholder="EMP-1024 atau nama@perusahaan.co.id"
                          aria-invalid={Boolean(recoveryError)}
                          className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1468E8]/25 focus:border-[#1468E8] ${
                            recoveryError ? 'border-[#DC3545]' : 'border-[#E2E8F0]'
                          }`}
                        />
                        {recoveryError && (
                          <p role="alert" className="mt-1.5 text-xs font-medium text-[#DC3545]">
                            {recoveryError}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        <button
                          type="submit"
                          className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors min-h-[44px] cursor-pointer"
                        >
                          Kirim Instruksi Pemulihan
                        </button>
                        <button
                          type="button"
                          onClick={switchToLogin}
                          className="w-full inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] transition-colors min-h-[40px] cursor-pointer"
                        >
                          Batal, Kembali ke Masuk
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
