# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Vue 3 frontend (views, reusable components, router, Pinia store, utils, and interfaces).
- `src/components/` holds visualization widgets (mostly ECharts-based, e.g. `*Comp.vue`).
- `src/views/` contains route-level pages (for example `HomeView.vue`, `PoetDetailsView.vue`).
- `src/assets/` stores static data (`assets/data/**`), map JSON, themes, fonts, and images.
- `src/style/global.scss` defines global styles and font faces.
- `proxy/` is a small Node/Express proxy used for chat API forwarding in local/dev deployment flows.

## Build, Test, and Development Commands
- `npm install`: install frontend dependencies.
- `npm run dev`: start Vite dev server.
- `npm run build`: create production build with Vite.
- `npm run preview`: preview the built app locally.
- `npx vue-tsc --noEmit`: run TypeScript/Vue type checks (recommended before PR).
- Proxy service (optional, from `proxy/`): `npm install && node index.js`.

## Coding Style & Naming Conventions
- Use Vue SFCs with `<script setup lang="ts">` for new code.
- Indentation: 2 spaces; keep templates, scripts, and styles consistently formatted.
- Component/view naming: PascalCase with `Comp` suffix for shared widgets (e.g. `WordCloudComp.vue`).
- Variables/functions: `camelCase`; constants: `UPPER_SNAKE_CASE` when truly constant.
- Keep chart config (`option`) close to data transformation logic; avoid magic numbers without a short comment.
- No lint/formatter is currently enforced in scripts, so keep changes minimal and style-consistent with nearby files.

## Testing Guidelines
- There is currently no automated test framework configured.
- Minimum quality gate for contributions:
  - run `npm run build`
  - run `npx vue-tsc --noEmit`
  - manually verify impacted routes/components in `npm run dev`.
- If adding tests, prefer Vitest + Vue Test Utils, and place specs as `*.spec.ts` next to source or under `src/__tests__/`.

## Commit & Pull Request Guidelines
- Existing history is minimal (for example `v1.0`), so adopt clear, scoped commits going forward.
- Recommended commit format: `type(scope): short summary` (e.g. `feat(charts): tune map tooltip layout`).
- PRs should include:
  - concise description of what changed and why
  - affected views/components and data files
  - screenshots/GIFs for UI or chart changes
  - verification notes (build/type-check/manual route checks).

## Security & Configuration Tips
- Do not commit secrets. Keep runtime values in `.env`.
- Configure chat endpoint via `VITE_CHAT_URL`; use the `proxy/` service or a deployed backend endpoint.
