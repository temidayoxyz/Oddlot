# Oddlot

Oddlot is a lightweight, client-side multi-game browser arcade platform. Each game runs as an independent, self-contained experience with local persistence via IndexedDB and `localStorage`, while sharing Oddlot's discovery catalog, navigation, and static GitHub Pages deployment setup.

## Available Games

- **SkyPop** (`/games/skypop`) — Pop iridescent soap bubbles across 7 shifting weather fronts, chain high-speed combos, activate 8 tactical power-ups, complete rotating daily challenges, and track lifetime stats & achievements locally.
- **Meteor Shower** (`/games/meteor-shower`) — Protect a photorealistic 3D Earth from incoming regular, heavy, armored, splitting, explosive, and cosmic meteors across progressive waves, 8 orbital power-ups, and 5 cosmic sectors.

---

## Project Structure

```text
├── .github/workflows/deploy.yml   # Automated GitHub Pages build & deployment
├── public/404.html                # Fallback SPA redirector for GitHub Pages
├── src/
│   ├── App.tsx                    # Oddlot platform shell & subpath-aware router
│   ├── platform/
│   │   ├── games.ts               # Central data-driven game registry
│   │   ├── router.ts              # Subpath routing & GitHub Pages helpers
│   │   └── components/            # Shared Oddlot landing page & header
│   ├── games/
│   │   ├── skypop/SkyPopGame.tsx  # SkyPop game entry component
│   │   └── meteor-shower/         # Meteor Shower Three.js scene, engine, audio & HUD
│   ├── game/                      # SkyPop simulation, renderer, audio, storage
│   └── components/                # SkyPop HUD, title, pause & stats modals
└── vite.config.ts                 # Dynamic GitHub Pages base path & dist/404.html generator
```

---

## Local Development

Install dependencies (this repository tracks dependencies with `bun.lock`) and start the Vite development server:

```bash
bun install
bun run dev
```

Open `http://localhost:3000` in your browser.

### Useful Scripts

- `npm run dev` — Start local development server on port `3000`
- `npm test` — Run Node unit tests (`tsx --test`) for routing, progression, daily challenges, and game engine logic
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm run build` — Build the production static bundle into `dist/`
- `npm run preview` — Preview the built `dist/` bundle locally

To test locally with a simulated GitHub Pages repository subpath:

```bash
VITE_BASE_PATH=/oddlot/ npm run build
npx vite preview --port 4173 --base /oddlot/
```

---

## Adding a New Game to Oddlot

1. **Create the game module** under `src/games/<slug>/` (e.g., `src/games/meteor-shower/MeteorShowerGame.tsx`), accepting `OddlotGameProps` (`{ onExitToPlatform }`).
2. **Add cover artwork** under `src/assets/images/` and import it via ES module import so Vite automatically applies the configured `base` path.
3. **Register the game** in `src/platform/games.ts` by appending a new `GameRegistryEntry` to `ODDLOT_GAMES` with `status: 'playable'` and `loadComponent: () => import('../games/<slug>/...')`.

The game will immediately appear in Oddlot's catalog and be routable at `/games/<slug>` (and `<repo-base>/games/<slug>` on GitHub Pages) without modifying the platform shell.

---

## Deploying to GitHub Pages

Oddlot is configured for automated static deployment via **GitHub Actions** (`/.github/workflows/deploy.yml`).

### One-Time Repository Setup

1. Push this repository to GitHub with `main` as your default deployment branch (or update the branch trigger in `.github/workflows/deploy.yml`).
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.

### How Deployment Works

Whenever you push to `main` (or trigger **Actions → Deploy Oddlot to GitHub Pages → Run workflow** manually):

1. GitHub Actions installs dependencies, runs `npm test` and `npm run lint`.
2. `actions/configure-pages` automatically determines your Pages `base_path` (for `https://USERNAME.github.io/REPOSITORY-NAME/` or a custom domain at `/`).
3. `vite build` bundles all scripts, styles, and game images relative to `VITE_BASE_PATH` and generates `dist/404.html` so direct visits or browser refreshes on routes like `/REPOSITORY-NAME/games/skypop` redirect seamlessly back into the SPA without losing the route.
4. `actions/deploy-pages` publishes `dist/` to GitHub Pages.
