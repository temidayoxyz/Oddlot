import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LandingPage } from './platform/components/LandingPage';
import { getGameBySlug, getLazyGameComponent } from './platform/games';
import { AppRoute, buildAppUrl, normalizeBasePath, parseAppRoute } from './platform/router';

export default function App() {
  const basePath = useMemo(() => normalizeBasePath(import.meta.env.BASE_URL), []);

  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(window.location.pathname, basePath)
  );

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseAppRoute(window.location.pathname, basePath));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [basePath]);

  const navigateTo = useCallback(
    (nextRoute: AppRoute, options?: { scrollToTop?: boolean }) => {
      const targetUrl = buildAppUrl(nextRoute, basePath);
      if (window.location.pathname + window.location.search + window.location.hash !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
      setRoute(nextRoute);
      if (options?.scrollToTop !== false) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    },
    [basePath]
  );

  const navigateHome = useCallback(() => {
    navigateTo({ kind: 'home' });
  }, [navigateTo]);

  const navigateToGame = useCallback(
    (slug: string) => {
      navigateTo({ kind: 'game', slug });
    },
    [navigateTo]
  );

  if (route.kind === 'home') {
    return (
      <LandingPage
        basePath={basePath}
        onPlayGame={navigateToGame}
        onNavigateHome={navigateHome}
      />
    );
  }

  if (route.kind === 'game') {
    const entry = getGameBySlug(route.slug);
    const GameComponent = entry ? getLazyGameComponent(entry) : null;

    if (entry && GameComponent) {
      return (
        <Suspense
          fallback={
            <div className="flex h-dvh w-screen items-center justify-center bg-[#0B0F17] text-slate-300">
              <div className="text-center">
                <div className="font-display text-xl font-bold text-white">
                  Loading {entry.title}
                </div>
                <p className="mt-1 text-xs text-slate-400">Preparing arena...</p>
              </div>
            </div>
          }
        >
          <GameComponent onExitToPlatform={navigateHome} />
        </Suspense>
      );
    }

    return (
      <NotFoundView
        title={entry ? `${entry.title} is coming soon` : 'Game not found'}
        description={
          entry
            ? 'This title is currently in development for Oddlot and is not playable yet.'
            : `No game is registered at "/games/${route.slug}" yet.`
        }
        onReturnHome={navigateHome}
      />
    );
  }

  return (
    <NotFoundView
      title="Page not found"
      description={`The path "${route.path}" does not match any Oddlot page or game.`}
      onReturnHome={navigateHome}
    />
  );
}

interface NotFoundViewProps {
  title: string;
  description: string;
  onReturnHome: () => void;
}

const NotFoundView: React.FC<NotFoundViewProps> = ({
  title,
  description,
  onReturnHome,
}) => {
  useEffect(() => {
    document.title = 'Oddlot — Not Found';
    document.body.dataset.state = 'platform';
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F17] px-6 text-center text-slate-100">
      <div className="max-w-md rounded-2xl border border-white/12 bg-[#121826] p-8">
        <p className="font-mono-num text-xs text-sky-300">Oddlot</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
        <button
          type="button"
          onClick={onReturnHome}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-400 px-5 py-2.5 font-display text-sm font-bold text-slate-950 transition-colors hover:bg-sky-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Oddlot</span>
        </button>
      </div>
    </main>
  );
};
