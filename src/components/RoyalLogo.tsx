import React from 'react';

interface RoyalLogoProps {
  className?: string;
}

export const RoyalLogo: React.FC<RoyalLogoProps> = ({ className = 'w-11 h-11' }) => {
  return (
    <svg
      className={`${className} shrink-0 drop-shadow-[0_0_10px_rgba(212,173,93,0.35)]`}
      viewBox="0 0 100 100"
      aria-label="AAC Royal Art Creation Crest"
    >
      <defs>
        <linearGradient id="crestGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8db" />
          <stop offset="30%" stopColor="#f5ce75" />
          <stop offset="65%" stopColor="#c99738" />
          <stop offset="100%" stopColor="#694813" />
        </linearGradient>
      </defs>
      <path
        d="M16 44 L25 18 L42 32 L50 12 L58 32 L75 18 L84 44 L78 56 L22 56 Z"
        fill="url(#crestGoldGrad)"
      />
      <circle cx="25" cy="16" r="3.5" fill="#fff8db" />
      <circle cx="50" cy="10" r="4.5" fill="#fff8db" />
      <circle cx="75" cy="16" r="3.5" fill="#fff8db" />
      <rect x="22" y="58" width="56" height="6" rx="3" fill="url(#crestGoldGrad)" />
      <text
        x="50"
        y="80"
        fontFamily="'Cinzel', Georgia, serif"
        fontWeight="900"
        fontSize="21"
        fill="url(#crestGoldGrad)"
        textAnchor="middle"
        letterSpacing="2"
      >
        AAC
      </text>
      <text
        x="50"
        y="92"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="6.5"
        fill="#d4ad5d"
        textAnchor="middle"
        letterSpacing="1.5"
      >
        ROYAL ART CREATION
      </text>
    </svg>
  );
};
