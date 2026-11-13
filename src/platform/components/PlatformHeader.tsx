import React from 'react';
import { ArrowUpRight, Play } from 'lucide-react';

interface PlatformHeaderProps {
  homeHref: string;
  primaryGameHref: string;
  githubUrl: string | null;
  onNavigateHome: (e: React.MouseEvent) => void;
  onPlayPrimary: (e: React.MouseEvent) => void;
}

export const OddlotLogoMark: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <circle cx="11" cy="14" r="7.5" stroke="#38BDF8" strokeWidth="2.4" />
    <rect x="14.5" y="6.5" width="9.5" height="9.5" rx="2.5" stroke="#F59E0B" strokeWidth="2.2" />
  </svg>
);

export const PlatformHeader: React.FC<PlatformHeaderProps> = ({
  homeHref,
  primaryGameHref,
  githubUrl,
  onNavigateHome,
  onPlayPrimary,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B0F17]/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-8">
        {/* Zone 1: Single-line Wordmark */}
        <a
          href={homeHref}
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
        >
          <OddlotLogoMark className="w-6 h-6 shrink-0" />
          <span>Oddlot</span>
        </a>

        {/* Zone 2: Clean Typography Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-4 sm:gap-7 text-sm font-medium text-slate-300"
        >
          <a
            href="#games"
            className="hover:text-white transition-colors hover:underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            Games
          </a>
          <a
            href="#about"
            className="hover:text-white transition-colors hover:underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            About
          </a>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 hover:text-white transition-colors hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <a
            href={primaryGameHref}
            onClick={onPlayPrimary}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-sky-400 px-3.5 sm:px-4 py-2 font-display text-xs sm:text-sm font-bold text-slate-950 transition-colors hover:bg-sky-300 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play SkyPop</span>
          </a>
        </div>
      </div>
    </header>
  );
};
