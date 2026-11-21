/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CapabilitiesGrid } from './components/CapabilitiesGrid';
import { RoleExplorerSection } from './components/RoleExplorerSection';
import { ImpactProofSection } from './components/ImpactProofSection';
import { DemoRequestSection } from './components/DemoRequestSection';
import { Footer } from './components/Footer';
import { LoginPage } from './components/LoginPage';
import { MasterAdminDashboard } from './components/dashboard/MasterAdminDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RecruiterDashboard } from './components/recruiter/RecruiterDashboard';
import { ApplicantDashboard } from './components/applicant/ApplicantDashboard';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { PayrollDashboard } from './components/payroll/PayrollDashboard';
import { useWorkspaceStore } from './hooks/useWorkspaceStore';
import { isPortalRoleTemporarilyDisabled, MasterAdminUser } from './utils/validation';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import {
  CookieConsentPreferences,
  createAcceptAllConsent,
  createCustomConsent,
  createEssentialOnlyConsent,
  loadCookieConsent,
  saveCookieConsent,
  shouldShowCookieBanner,
} from './utils/cookieConsent';

type ActiveView = 'landing' | 'login' | 'dashboard';

function getInitialView(): ActiveView {
  if (typeof window !== 'undefined' && window.location.hash === '#login') {
    return 'login';
  }
  return 'landing';
}

export default function App() {
  const [view, setView] = useState<ActiveView>(getInitialView);
  const [currentUser, setCurrentUser] = useState<MasterAdminUser | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<CookieConsentPreferences | null>(() =>
    loadCookieConsent()
  );
  const [isCookiePrefsOpen, setIsCookiePrefsOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const store = useWorkspaceStore();

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#login') {
        setView('login');
      } else if (window.location.hash === '#dashboard' && currentUser) {
        setView('dashboard');
      } else if (view === 'login' || (view === 'dashboard' && window.location.hash !== '#dashboard')) {
        setView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [view, currentUser]);

  const navigateToLogin = () => {
    window.location.hash = 'login';
    setView('login');
    window.scrollTo({ top: 0 });
  };

  const navigateToHome = () => {
    if (window.location.hash === '#login' || window.location.hash === '#dashboard') {
      window.location.hash = 'beranda';
    }
    setView('landing');
    window.scrollTo({ top: 0 });
  };

  const handleLoginSuccess = (user: MasterAdminUser) => {
    setCurrentUser(user);
    window.location.hash = 'dashboard';
    setView('dashboard');
    window.scrollTo({ top: 0 });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.location.hash = 'login';
    setView('login');
    window.scrollTo({ top: 0 });
  };

  const handleAcceptAllCookies = () => {
    setCookieConsent(saveCookieConsent(createAcceptAllConsent()));
    setIsCookiePrefsOpen(false);
  };

  const handleAcceptEssentialCookies = () => {
    setCookieConsent(saveCookieConsent(createEssentialOnlyConsent()));
    setIsCookiePrefsOpen(false);
  };

  const handleSaveCustomCookies = (options: { preferences: boolean; analytics: boolean }) => {
    setCookieConsent(saveCookieConsent(createCustomConsent(options)));
    setIsCookiePrefsOpen(false);
  };

  const quotaBanner = mapsQuotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-center gap-3">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
      <button
        type="button"
        onClick={() => setMapsQuotaExceeded(false)}
        className="text-amber-900 hover:text-amber-950 font-semibold underline shrink-0 cursor-pointer"
      >
        Tutup
      </button>
    </div>
  ) : null;

  if (view === 'dashboard' && currentUser) {
    if (currentUser.role === 'Admin') {
      return (
        <>
          {quotaBanner}
          <AdminDashboard user={currentUser} store={store} onLogout={handleLogout} />
        </>
      );
    }
    if (isPortalRoleTemporarilyDisabled(currentUser.role)) {
      return (
        <>
          {quotaBanner}
          <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-[6px] p-6 text-center space-y-4">
              <h1 className="text-lg font-bold text-[#102B69]">
                Role {currentUser.role} Dinonaktifkan Sementara
              </h1>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Sistem saat ini difokuskan untuk Master Admin, Admin, Payroll, dan Karyawan.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer transition-colors"
              >
                Kembali ke Halaman Masuk
              </button>
            </div>
          </div>
        </>
      );
    }
    if (currentUser.role === 'Rekruter') {
      return (
        <>
          {quotaBanner}
          <RecruiterDashboard user={currentUser} store={store} onLogout={handleLogout} />
        </>
      );
    }
    if (currentUser.role === 'Pelamar') {
      return (
        <>
          {quotaBanner}
          <ApplicantDashboard user={currentUser} store={store} onLogout={handleLogout} />
        </>
      );
    }
    if (currentUser.role === 'Karyawan') {
      return (
        <>
          {quotaBanner}
          <EmployeeDashboard user={currentUser} store={store} onLogout={handleLogout} />
        </>
      );
    }
    if (currentUser.role === 'Payroll') {
      return (
        <>
          {quotaBanner}
          <PayrollDashboard user={currentUser} store={store} onLogout={handleLogout} />
        </>
      );
    }
    return (
      <>
        {quotaBanner}
        <MasterAdminDashboard user={currentUser} store={store} onLogout={handleLogout} />
      </>
    );
  }

  if (view === 'login') {
    return (
      <>
        {quotaBanner}
        <LoginPage
          onBackToHome={navigateToHome}
          onLoginSuccess={handleLoginSuccess}
          registeredApplicants={store.applicants}
          registeredEmployees={store.employees}
          registeredUsers={store.users}
          onRegisterApplicant={store.registerApplicantAccount}
        />
        <CookieConsentBanner
          visibleBanner={shouldShowCookieBanner('login', cookieConsent)}
          consent={cookieConsent}
          isPreferencesOpen={isCookiePrefsOpen}
          isPolicyOpen={isPrivacyPolicyOpen}
          onAcceptAll={handleAcceptAllCookies}
          onAcceptEssential={handleAcceptEssentialCookies}
          onSaveCustom={handleSaveCustomCookies}
          onOpenPreferences={() => setIsCookiePrefsOpen(true)}
          onClosePreferences={() => setIsCookiePrefsOpen(false)}
          onOpenPolicy={() => setIsPrivacyPolicyOpen(true)}
          onClosePolicy={() => setIsPrivacyPolicyOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#172033]">
      {quotaBanner}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#102B69] focus:text-white focus:rounded-[4px] focus:text-sm focus:font-semibold"
      >
        Lompat ke konten utama
      </a>

      <Navbar onLoginClick={navigateToLogin} />

      <main id="konten-utama" className="flex-1">
        <HeroSection onLoginClick={navigateToLogin} />
        <CapabilitiesGrid />
        <RoleExplorerSection />
        <ImpactProofSection />
        <DemoRequestSection />
      </main>

      <Footer
        onOpenCookieSettings={() => setIsCookiePrefsOpen(true)}
        onOpenPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)}
      />

      <CookieConsentBanner
        visibleBanner={shouldShowCookieBanner('landing', cookieConsent)}
        consent={cookieConsent}
        isPreferencesOpen={isCookiePrefsOpen}
        isPolicyOpen={isPrivacyPolicyOpen}
        onAcceptAll={handleAcceptAllCookies}
        onAcceptEssential={handleAcceptEssentialCookies}
        onSaveCustom={handleSaveCustomCookies}
        onOpenPreferences={() => setIsCookiePrefsOpen(true)}
        onClosePreferences={() => setIsCookiePrefsOpen(false)}
        onOpenPolicy={() => setIsPrivacyPolicyOpen(true)}
        onClosePolicy={() => setIsPrivacyPolicyOpen(false)}
      />
    </div>
  );
}
