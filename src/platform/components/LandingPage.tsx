import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Compass, Gamepad2, Play } from 'lucide-react';
import heroShowcaseImg from '../../assets/images/oddlot_hero_showcase_1794605851504.jpg';
import { getLevelFromXp } from '../../game/progression';
import { loadLifetimeStats } from '../../game/storage';
import { LifetimeStats } from '../../game/types';
import { getLevelFromXp as getMeteorLevelFromXp } from '../../games/meteor-shower/progression';
import { loadLifetimeStats as loadMeteorStats } from '../../games/meteor-shower/storage';
import { LifetimeStats as MeteorLifetimeStats } from '../../games/meteor-shower/types';
import { GameRegistryEntry, ODDLOT_GAMES, getPlayableGames } from '../games';
import { buildAppUrl, resolveGitHubRepositoryUrl } from '../router';
import { OddlotLogoMark, PlatformHeader } from './PlatformHeader';

interface LandingPageProps {
  basePath: string;
  onPlayGame: (slug: string) => void;
  onNavigateHome: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  basePath,
  onPlayGame,
  onNavigateHome,
}) => {
  const playableGames = getPlayableGames();
  const featuredGame = playableGames[0] ?? ODDLOT_GAMES[0];
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedCovers, setFailedCovers] = useState<Record<string, boolean>>({});
  const [skyPopStats, setSkyPopStats] = useState<LifetimeStats | null>(null);
  const [meteorStats, setMeteorStats] = useState<MeteorLifetimeStats | null>(null);

  useEffect(() => {
    document.title = 'Oddlot — Original Browser Games';
    document.body.dataset.state = 'platform';

    let active = true;
    void Promise.all([loadLifetimeStats(), loadMeteorStats()]).then(([sky, meteor]) => {
      if (!active) return;
      setSkyPopStats(sky);
      setMeteorStats(meteor);
    });
    return () => {
      active = false;
    };
  }, []);

  const homeHref = buildAppUrl({ kind: 'home' }, basePath);
  const primaryGameHref = featuredGame
    ? buildAppUrl({ kind: 'game', slug: featuredGame.slug }, basePath)
    : homeHref;

  const githubUrl = resolveGitHubRepositoryUrl(
    import.meta.env.VITE_GITHUB_REPO_URL,
    typeof window !== 'undefined'
      ? { hostname: window.location.hostname, pathname: window.location.pathname }
      : undefined
  );

  const handleLinkToGame = (slug: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onPlayGame(slug);
  };

  const handleLinkHome = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigateHome();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      <PlatformHeader
        homeHref={homeHref}
        primaryGameHref={primaryGameHref}
        githubUrl={githubUrl}
        onNavigateHome={handleLinkHome}
        onPlayPrimary={
          featuredGame ? handleLinkToGame(featuredGame.slug) : handleLinkHome
        }
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-8 py-12 sm:py-16 lg:py-20">
            <div className="relative rounded-3xl border border-white/10 bg-[#101623] overflow-hidden">
              {/* Hero Visual Backdrop */}
              <div className="absolute inset-0">
                {!heroImgFailed ? (
                  <img
                    src={heroShowcaseImg}
                    alt="Tactile glass polyhedra, iridescent bubbles, and arcade tokens floating in a dark studio space"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="h-full w-full object-cover object-center lg:object-right opacity-90"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-full w-full bg-[radial-gradient(circle_at_75%_40%,rgba(56,189,248,0.22),transparent_52%),radial-gradient(circle_at_60%_75%,rgba(245,158,11,0.14),transparent_48%)]"
                  />
                )}
                {/* Scrim ensuring crisp >7:1 typography contrast across mobile and desktop */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[#0B0F17]/55 md:bg-transparent"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#0B0F17] via-[#0B0F17]/92 to-[#0B0F17]/30"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/85 via-transparent to-transparent lg:hidden"
                />
              </div>

              {/* Hero Copy & Single Primary Action */}
              <div className="relative z-10 max-w-2xl px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
                <p className="text-xs sm:text-sm font-medium text-sky-300 tracking-wide">
                  Independent Browser Arcade
                </p>

                <h1 className="mt-3 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-extrabold leading-[1.06] tracking-tight text-white text-balance">
                  Small, sharp browser games made for instant play.
                </h1>

                <p className="mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-slate-300">
                  Oddlot is a growing home for original arcade experiments and focused mini-games. Open any title in your browser, play immediately, and keep your progress saved locally.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-5">
                  {featuredGame && (
                    <a
                      href={primaryGameHref}
                      onClick={handleLinkToGame(featuredGame.slug)}
                      className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-sky-400 px-6 py-3 font-display text-base font-bold text-slate-950 transition-colors hover:bg-sky-300 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play {featuredGame.title}</span>
                    </a>
                  )}

                  <a
                    href="#games"
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white transition-colors hover:underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    <span>Browse games</span>
                    <ArrowDownRight className="w-4 h-4 text-sky-300" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data-Driven Game Collection */}
        <section id="games" className="scroll-mt-16 py-16 sm:py-20 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Game Collection
                </h2>
                <p className="mt-2 max-w-xl text-base text-slate-400">
                  Every game in Oddlot runs directly in your browser with self-contained mechanics and local progress storage.
                </p>
              </div>
              <div className="text-sm font-mono-num text-slate-400 whitespace-nowrap">
                {playableGames.length} {playableGames.length === 1 ? 'playable game' : 'playable games'}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {ODDLOT_GAMES.map((game) => {
                const statSummary =
                  game.slug === 'skypop' && skyPopStats && (skyPopStats.gamesPlayed > 0 || skyPopStats.highScore > 0)
                    ? {
                        highScore: skyPopStats.highScore,
                        level: getLevelFromXp(skyPopStats.totalXp).level,
                        totalXp: skyPopStats.totalXp,
                      }
                    : game.slug === 'meteor-shower' &&
                        meteorStats &&
                        (meteorStats.gamesPlayed > 0 || meteorStats.highScore > 0)
                      ? {
                          highScore: meteorStats.highScore,
                          level: getMeteorLevelFromXp(meteorStats.totalXp).level,
                          totalXp: meteorStats.totalXp,
                        }
                      : null;

                return (
                  <GameCatalogCard
                    key={game.slug}
                    game={game}
                    basePath={basePath}
                    coverFailed={Boolean(failedCovers[game.slug])}
                    onCoverError={() =>
                      setFailedCovers((prev) => ({ ...prev, [game.slug]: true }))
                    }
                    onPlay={handleLinkToGame(game.slug)}
                    statSummary={statSummary}
                  />
                );
              })}

              {/* Honest Studio Expansion Slot */}
              <div className="lg:col-span-12 rounded-2xl border border-dashed border-white/15 bg-[#101623]/70 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Compass className="w-4 h-4 text-amber-300/80" />
                    <span>Coming Soon</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                    More Oddlot titles on the way
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
                    Oddlot is structured so new standalone games drop straight into this catalog without changing the platform around them. Expect new score-attack experiments and tactile puzzles over time.
                  </p>
                </div>

                <div className="shrink-0 text-xs text-slate-400">
                  Built incrementally · No accounts or installs required
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Oddlot */}
        <section id="about" className="scroll-mt-16 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              <div className="lg:col-span-5">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
                  Why Oddlot exists
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-300">
                  Browser games used to mean opening a tab and immediately playing something weird, crisp, and fun. Oddlot brings that spirit back as a personal arcade workshop — one clean home for distinct games, each with its own rules, soundscape, and feel.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="border-t border-white/15 pt-4">
                  <div className="font-mono-num text-xs text-sky-300">01</div>
                  <h3 className="mt-2 font-display text-lg font-bold text-white">
                    Instant Browser Play
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Lightweight static builds load fast on desktop and mobile with zero downloads or sign-up gates.
                  </p>
                </div>

                <div className="border-t border-white/15 pt-4">
                  <div className="font-mono-num text-xs text-sky-300">02</div>
                  <h3 className="mt-2 font-display text-lg font-bold text-white">
                    Distinct Per Game
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Each game owns its own canvas loop, audio synthesis, and visual atmosphere while sharing Oddlot navigation.
                  </p>
                </div>

                <div className="border-t border-white/15 pt-4">
                  <div className="font-mono-num text-xs text-sky-300">03</div>
                  <h3 className="mt-2 font-display text-lg font-bold text-white">
                    Local-First Saves
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    High scores, XP ranks, and daily challenges persist right in your browser via IndexedDB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-white/10 bg-[#080B12]">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-4 sm:px-8 py-8">
          <div className="flex items-center gap-3">
            <OddlotLogoMark className="w-5 h-5" />
            <span className="font-display text-base font-bold text-white">Oddlot</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-xs text-slate-400">
              Original browser arcade collection
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
            <a href="#games" className="hover:text-white transition-colors whitespace-nowrap">
              Games
            </a>
            <a href="#about" className="hover:text-white transition-colors whitespace-nowrap">
              About
            </a>
            {featuredGame && (
              <a
                href={primaryGameHref}
                onClick={handleLinkToGame(featuredGame.slug)}
                className="hover:text-white transition-colors whitespace-nowrap"
              >
                Play {featuredGame.title}
              </a>
            )}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
              >
                <span>GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
            <span className="text-xs text-slate-500">
              © {new Date().getFullYear()} Oddlot
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface GameCatalogCardProps {
  game: GameRegistryEntry;
  basePath: string;
  coverFailed: boolean;
  onCoverError: () => void;
  onPlay: (e: React.MouseEvent) => void;
  statSummary: { highScore: number; level: number; totalXp: number } | null;
}

const GameCatalogCard: React.FC<GameCatalogCardProps> = ({
  game,
  basePath,
  coverFailed,
  onCoverError,
  onPlay,
  statSummary,
}) => {
  const href = buildAppUrl({ kind: 'game', slug: game.slug }, basePath);
  const isPlayable = game.status === 'playable';

  return (
    <article className="lg:col-span-6 rounded-2xl border border-white/12 bg-[#121826] overflow-hidden flex flex-col">
      {/* Thumbnail Cover */}
      <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
        {game.coverImage && !coverFailed ? (
          <img
            src={game.coverImage}
            alt={`${game.title} game artwork`}
            referrerPolicy="no-referrer"
            onError={onCoverError}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full flex flex-col items-center justify-center p-6 text-center"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${game.accentColor}33, #0F172A 75%)`,
            }}
          >
            <Gamepad2 className="w-12 h-12 text-sky-300/80" />
            <span className="mt-2 font-display text-lg font-bold text-white">{game.title}</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex-1 p-6 sm:p-7 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{game.genre}</span>
            <span aria-hidden="true">·</span>
            <span className={isPlayable ? 'text-emerald-300 font-medium' : 'text-amber-300'}>
              {isPlayable ? 'Playable Now' : 'Coming Soon'}
            </span>
          </div>

          <h3 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {game.title}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {game.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
            {game.highlights.map((item, idx) => (
              <React.Fragment key={item}>
                {idx > 0 && <span aria-hidden="true" className="text-slate-600">·</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10">
          {statSummary && (
            <div className="mb-4 flex items-center justify-between text-xs text-slate-300 tabular-nums">
              <span>
                Your Best:{' '}
                <strong className="text-white font-semibold">
                  {statSummary.highScore.toLocaleString()}
                </strong>
              </span>
              <span className="font-mono-num text-sky-300">
                Lv {statSummary.level} · {statSummary.totalXp.toLocaleString()} XP
              </span>
            </div>
          )}

          {isPlayable ? (
            <a
              href={href}
              onClick={onPlay}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-2.5 font-display text-sm font-bold text-slate-950 transition-colors hover:bg-sky-300 active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>Play {game.title}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <div className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-400">
              In Development
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
