import React from 'react';
import skypopCoverImg from '../assets/images/skypop_cover_1794605851564.jpg';

export type GameAvailability = 'playable' | 'coming-soon';

export interface OddlotGameProps {
  onExitToPlatform: () => void;
}

export interface GameRegistryEntry {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  genre: string;
  controlsSummary: string;
  status: GameAvailability;
  coverImage?: string;
  accentColor: string;
  highlights: string[];
  loadComponent?: () => Promise<{ default: React.ComponentType<OddlotGameProps> }>;
}

const lazyCache = new Map<
  string,
  React.LazyExoticComponent<React.ComponentType<OddlotGameProps>>
>();

export const ODDLOT_GAMES: GameRegistryEntry[] = [
  {
    slug: 'skypop',
    title: 'SkyPop',
    tagline: 'Pop iridescent bubbles across a living, shifting sky.',
    description:
      'Chain high-speed bubble streaks, trigger chain lightning, survive shifting weather fronts, and climb persistent arcade ranks with daily challenges.',
    genre: 'Arcade · Score Attack',
    controlsSummary: 'Click or Tap · Keys 1–8 Power-Ups · P Pause',
    status: 'playable',
    coverImage: skypopCoverImg,
    accentColor: '#38BDF8',
    highlights: [
      '7 dynamic weather fronts',
      '8 tactical power-ups',
      'Daily challenges & local XP ranks',
    ],
    loadComponent: () => import('../games/skypop/SkyPopGame'),
  },
];

export function getGameBySlug(slug: string): GameRegistryEntry | undefined {
  return ODDLOT_GAMES.find((game) => game.slug === slug);
}

export function getPlayableGames(): GameRegistryEntry[] {
  return ODDLOT_GAMES.filter((game) => game.status === 'playable');
}

export function getLazyGameComponent(
  entry: GameRegistryEntry
): React.LazyExoticComponent<React.ComponentType<OddlotGameProps>> | null {
  if (entry.status !== 'playable' || !entry.loadComponent) return null;
  let cached = lazyCache.get(entry.slug);
  if (!cached) {
    cached = React.lazy(entry.loadComponent);
    lazyCache.set(entry.slug, cached);
  }
  return cached;
}
