import { AppliedSessionDeltas } from './dailyChallenges';
import {
  DailyChallengesState,
  EndOfRunSummary,
  GameSettings,
  LifetimeStats,
  SavedActiveSession,
  UnlockedAchievement,
} from './types';

const DB_NAME = 'SkyPopArcadeDB';
const DB_VERSION = 2;
const SETTINGS_KEY = 'skypop_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  musicEnabled: true,
  masterVolume: 0.85,
  sfxVolume: 0.9,
  musicVolume: 0.45,
  reducedMotion: false,
  screenShake: true,
  weatherEffectsIntensity: 'full',
};

export const DEFAULT_LIFETIME_STATS: LifetimeStats = {
  highScore: 0,
  totalScore: 0,
  totalXp: 0,
  totalBubblesPopped: 0,
  smallBubblesPopped: 0,
  mediumBubblesPopped: 0,
  largeBubblesPopped: 0,
  highestCombo: 0,
  bestMultiplier: 1,
  totalPlaySeconds: 0,
  gamesPlayed: 0,
  powerUpsCollected: 0,
  powerUpsActivated: 0,
  goldenBubblesPopped: 0,
  chainReactionsTriggered: 0,
  weathersSeen: ['clear'],
};

export function loadSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = req.result;
        const oldVersion = event.oldVersion;
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('profile')) {
            db.createObjectStore('profile');
          }
          if (!db.objectStoreNames.contains('achievements')) {
            db.createObjectStore('achievements', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('activeSession')) {
            db.createObjectStore('activeSession');
          }
          if (!db.objectStoreNames.contains('runHistory')) {
            db.createObjectStore('runHistory', { autoIncrement: true });
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('dailyChallenges')) {
            db.createObjectStore('dailyChallenges');
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  return openDatabase().then((db) => {
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

function idbGetAll<T>(storeName: string): Promise<T[]> {
  return openDatabase().then((db) => {
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as T[]) ?? []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  });
}

function idbPut(storeName: string, value: unknown, key?: IDBValidKey): Promise<void> {
  return openDatabase().then((db) => {
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        if (key !== undefined) {
          store.put(value, key);
        } else {
          store.put(value);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

function idbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  return openDatabase().then((db) => {
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

export async function loadLifetimeStats(): Promise<LifetimeStats> {
  const saved = await idbGet<Partial<LifetimeStats>>('profile', 'main');
  if (!saved) return { ...DEFAULT_LIFETIME_STATS, weathersSeen: ['clear'] };
  return {
    ...DEFAULT_LIFETIME_STATS,
    ...saved,
    weathersSeen: Array.isArray(saved.weathersSeen) && saved.weathersSeen.length > 0
      ? saved.weathersSeen
      : ['clear'],
  };
}

export async function saveLifetimeStats(stats: LifetimeStats): Promise<void> {
  await idbPut('profile', stats, 'main');
}

export async function loadUnlockedAchievements(): Promise<UnlockedAchievement[]> {
  return idbGetAll<UnlockedAchievement>('achievements');
}

export async function saveUnlockedAchievements(items: UnlockedAchievement[]): Promise<void> {
  const db = await openDatabase();
  if (!db || items.length === 0) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction('achievements', 'readwrite');
      const store = tx.objectStore('achievements');
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadActiveSession(): Promise<SavedActiveSession | null> {
  const saved = await idbGet<SavedActiveSession>('activeSession', 'current');
  if (!saved || saved.version !== 1 || !saved.session) return null;
  // Expire stale saves older than 7 days
  if (Date.now() - saved.savedAt > 7 * 24 * 60 * 60 * 1000) {
    await clearActiveSession();
    return null;
  }
  return saved;
}

export async function saveActiveSession(session: SavedActiveSession): Promise<void> {
  await idbPut('activeSession', session, 'current');
}

export async function clearActiveSession(): Promise<void> {
  await idbDelete('activeSession', 'current');
}

export async function recordRunSummary(summary: EndOfRunSummary): Promise<void> {
  await idbPut('runHistory', summary);
}

export async function loadRecentRuns(): Promise<EndOfRunSummary[]> {
  const all = await idbGetAll<EndOfRunSummary>('runHistory');
  return all.slice(-10).reverse();
}

export async function loadDailyChallengesState(): Promise<DailyChallengesState | null> {
  return idbGet<DailyChallengesState>('dailyChallenges', 'current');
}

export async function saveDailyChallengesState(state: DailyChallengesState): Promise<void> {
  await idbPut('dailyChallenges', state, 'current');
}

export async function loadAppliedDailyDeltas(): Promise<AppliedSessionDeltas | null> {
  return idbGet<AppliedSessionDeltas>('dailyChallenges', 'appliedDeltas');
}

export async function saveAppliedDailyDeltas(deltas: AppliedSessionDeltas): Promise<void> {
  await idbPut('dailyChallenges', deltas, 'appliedDeltas');
}

export async function clearAllProgressData(): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(
        ['profile', 'achievements', 'activeSession', 'runHistory', 'dailyChallenges'],
        'readwrite'
      );
      tx.objectStore('profile').clear();
      tx.objectStore('achievements').clear();
      tx.objectStore('activeSession').clear();
      tx.objectStore('runHistory').clear();
      tx.objectStore('dailyChallenges').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
