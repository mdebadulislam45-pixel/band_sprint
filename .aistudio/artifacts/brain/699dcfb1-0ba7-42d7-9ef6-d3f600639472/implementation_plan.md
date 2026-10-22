# Deployment Artifact Upload Configuration & Build Fix

## 1. Problem Identification
- **Error:** `An error occurred during artifact upload: Build artifacts are empty.`
- **Root Causes:**
  1. The deployment pipeline expects build artifacts in the standard `build/` directory (or scans `build/` first), whereas Vite outputs strictly to `dist/` by default.
  2. In `package.json`, `"start"` was set to `"tsx server.ts"`, violating the environment constraint: `For full-stack, set "start": "node server.ts" in package.json`.
  3. `server.ts` and `src/server/payments/bkashService.ts` contained non-type imports of TypeScript types (`SpeechDeliveryProfileId`, `PaymentOrder`), causing Node.js v22's native type-stripping ESM loader to fail when executed with `node server.ts`.
  4. Monolithic bundle generation created a single >6MB JS chunk, risking artifact upload timeouts.

## 2. Solutions Implemented
1. **Dual Directory Synchronization (`dist/` and `build/`):**
   - Created `scripts/postBuild.js` which automatically copies and verifies all compiled static assets from `dist/` into `build/`.
   - Wired `package.json` to execute `postbuild: "node scripts/postBuild.js"` after every `vite build`.
   - Whichever directory the deployment pipeline uploads (`dist/` or `build/`), all production bundles, index HTML, CSS, manifests, and assets exist and are non-empty.
2. **Chunk Optimization in `vite.config.ts`:**
   - Configured `build.outDir = 'dist'`, `emptyOutDir = true`, and `chunkSizeWarningLimit = 2500`.
   - Configured `rollupOptions.output.manualChunks` separating `vendor` (React/ReactDOM) and `lucide` icons from the application bundle for reliable chunk staging.
3. **Node.js 22 Runtime Compatibility in `server.ts` & `bkashService.ts`:**
   - Converted type-only imports to use explicit `type` keyword (`type SpeechDeliveryProfileId` and `type PaymentOrder`).
   - `node server.ts` now starts directly in Node.js 22 with zero ESM import syntax errors.
   - Set `"start": "node server.ts"` in `package.json`.
   - Configured `server.ts` production static asset resolver to support both `dist/` and `build/` directories seamlessly.

## 3. Verification & Evidence
- `npm run build`: Success (`dist/` and `build/` both populated and verified).
- `tsc --noEmit` (`npm run lint`): 0 errors.
- `node server.ts`: Starts and listens cleanly.
- `compile_applet`: Production build succeeded.
- All 7 test suites passing.
