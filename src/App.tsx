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
import { useWorkspaceStore } from './hooks/useWorkspaceStore';
import { MasterAdminUser } from './utils/validation';

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
        <HeroSection />
        <CapabilitiesGrid />
        <RoleExplorerSection />
        <ImpactProofSection />
        <DemoRequestSection />
      </main>

      <Footer />
    </div>
  );
}
