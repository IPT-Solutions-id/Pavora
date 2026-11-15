import React from 'react';

interface PevoraLogoProps {
  variant?: 'dark' | 'light';
}

export const PevoraLogo: React.FC<PevoraLogoProps> = ({ variant = 'dark' }) => {
  const textColor = variant === 'light' ? 'text-white' : 'text-[#102B69]';
  const primaryFill = variant === 'light' ? '#FFFFFF' : '#102B69';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="2" y="2" width="14" height="22" rx="2" fill={primaryFill} />
        <rect x="11" y="2" width="13" height="13" rx="2" fill="#1468E8" />
        <rect x="18" y="18" width="6" height="6" rx="1" fill="#FF7A1A" />
      </svg>
      <span className={`text-xl font-extrabold tracking-tight leading-none ${textColor}`}>
        PEVORA
      </span>
    </span>
  );
};
