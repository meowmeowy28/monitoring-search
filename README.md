# Monitoring Search — Redesign Scaffold (Stage 1)

This is the first stage of the redesign: a real Vite + React + TypeScript +
Tailwind project (instead of the old single `index.html` file), with the
fan-carousel component wired in and working as a proof of concept.

**Not included yet** (coming in the next stages): filters/sort/tags, the
sidebar folder browser, the Add Entry flow, the password gate, and connecting
back to your real Apps Script backend. Right now `App.tsx` just proves the
whole toolchain (Vite, TypeScript, Tailwind, the carousel, the HDI-derived
theme) builds and runs together, using placeholder demo photos.

---

## Running this locally (to check it before pushing)

You'll need **Node.js** installed on your PC first (if you don't have it:
nodejs.org → download the LTS version → install like any other program).

Then, in a terminal, inside this folder:

```bash
npm install
npm run dev
```

This starts a local dev server (usually at `http://localhost:5173`) — open
that in your browser to see it live, with hot-reload as you edit files.

To build the production version (the files that actually get deployed):

```bash
npm run build
```

This creates a `dist/` folder — that's what gets hosted.

---

## Cloudflare Pages build settings

When you connect this repo to Cloudflare Pages, use these settings (different
from before, since this project now has a real build step):

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`

Everything else (connecting the GitHub repo, auto-deploy on push) works the
same way as already set up.

---

## Project structure

```
src/
  main.tsx                        — React entry point
  App.tsx                         — top-level app (currently a scaffold test)
  index.css                       — global styles + HDI-derived theme variables
  components/ui/
    card-fan-carousel.tsx         — the fan carousel component, as provided
  lib/
    utils.ts                      — shadcn's cn() class-merging helper
tailwind.config.js                — design tokens (colors, fonts, radius) from HDI theme
```

## Design tokens already wired in (from the HDI reference)

- Primary: dark navy/slate `#0f172a`, light background `#f8fafc`
- Accents: indigo `#6366F1`, cyan `#22D3EE`
- Status colors: success/warning/danger/info, each with a light tint variant
- Fonts: Outfit (body/UI), Pragmatica reserved for display/headers (not yet
  loaded — swap in the real font file or a close Google Fonts match once you
  confirm you want to use it)
- Light/dark mode support via a `data-theme="dark"` attribute on a parent
  element (not yet wired to a toggle button — the CSS variables are ready,
  just needs a switch)

## Known gap to flag

`card-fan-carousel.tsx` was given without its companion CSS for exact card
sizing — I estimated reasonable sizes (`.fan-card`, `.fan-layout` in
`index.css`) based on the JS's internal height-budget comments, tuned for
tall/portrait billboard photos. Once you see it running with real photos, we
may need to adjust these dimensions to match your actual photo aspect ratios.
