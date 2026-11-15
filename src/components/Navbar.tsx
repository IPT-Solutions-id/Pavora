import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { PevoraLogo } from './PevoraLogo';

const NAV_LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#peran', label: 'Peran' },
  { href: '#keunggulan', label: 'Keunggulan' },
  { href: '#kontak', label: 'Kontak' },
] as const;

interface NavbarProps {
  onLoginClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  const handleLoginAction = () => {
    setMobileOpen(false);
    onLoginClick();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#beranda"
          className="inline-flex items-center whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1468E8] rounded-[4px]"
          aria-label="PEVORA Beranda"
        >
          <PevoraLogo variant="dark" />
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748B]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-[#102B69] hover:underline underline-offset-4 decoration-[#1468E8] decoration-2 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1468E8] rounded-[2px]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleLoginAction}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] cursor-pointer"
          >
            Masuk
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4">
          <nav aria-label="Navigasi seluler" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="px-3 py-3 text-sm font-medium text-[#172033] hover:bg-[#F5F7FA] hover:text-[#1468E8] rounded-[4px] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={handleLoginAction}
              className="mt-2 inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
            >
              Masuk
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
