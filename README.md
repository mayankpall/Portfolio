# portfolio.mayankpal.co.in

Personal portfolio. Astro, statically built, deployed to GitHub Pages by Actions.

## Running it

```bash
npm install
npm run dev          # http://localhost:4321
```

```bash
npm run build        # fetches LeetCode stats, then builds to dist/
npm run preview      # serve dist/ on :4322
```

## Where things live

| Path | What it is |
| --- | --- |
| `src/data/` | **All content.** Projects, achievements, profile. Edit here, not in markup. |
| `src/styles/tokens.css` | The design system — colour, type scale, spacing, reveal behaviour. |
| `src/components/Hero3D.astro` | The WebGL hero. Bare three.js, no React. |
| `src/components/Motion.astro` | Lenis smooth scroll + the single reveal observer. |
| `src/pages/work/[slug].astro` | Case-study pages, generated from `src/data/projects.ts`. |
| `src/pages/og-card.astro` | Source for the social share image. Not a real page. |
| `public/CNAME` | The custom domain. **Deleting this drops the domain.** |
| `scripts/` | Build-time stats fetch, screenshots, pre-deploy checks. |

### Adding a project

Append to `src/data/projects.ts`. The work list, the case-study page and the
sitemap entry all follow from it — there is no markup to touch.

## Two things that are load-bearing

**1. Content is visible by default.** The reveal animations only ever *hide*
things under `html.js:not(.reduced-motion) .reveal`, and that `js` class is
added by an inline script in `<head>`. If JavaScript fails, never loads, or is
switched off, nothing is hidden and the page reads normally.

The previous version of this site did the reverse — CSS hid each section and JS
was supposed to reveal it. The observer misfired and three whole sections
(`#projects`, `#achievements`, `#contact`) shipped stuck at `opacity: 0`. Do not
reintroduce that pattern. `scripts/verify.mjs` checks for it.

**2. three.js is desktop-only and lazy.** `Hero3D.astro` dynamically imports
three only when the viewport is ≥768px, reduced motion is off, the hero is on
screen, and a WebGL context can be created. Everything else gets the CSS poster
in `index.astro`, which is the whole artwork on mobile.

A first mobile page load is ~54KB gzipped including both preloaded fonts.

## Checks

```bash
npm run build && npm run preview
node scripts/verify.mjs
```

Covers: nothing stuck invisible (5 pages × 3 widths), no horizontal overflow,
reduced-motion correctness, three.js absent on mobile and present on desktop,
and accessible-name basics.

Screenshots, if you want them:

```bash
node scripts/shoot.mjs http://localhost:4322 out.png 1440 900
```

## Typefaces

All three are self-hosted from `public/fonts/` — no CDN, no runtime font request.

| Role | Face | Licence |
| --- | --- | --- |
| Display | Instrument Serif | SIL Open Font Licence |
| Text | Cabinet Grotesk | Free for commercial use — [Fontshare](https://fontshare.com), Indian Type Foundry |
| Mono | JetBrains Mono | SIL Open Font Licence |

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. A weekly cron re-runs it so the LeetCode counts on
the page stay current without a code change.

Repository Pages settings must be set to **build from GitHub Actions**, not from
a branch.

### Contact form

The contact section renders a working form only when `PUBLIC_WEB3FORMS_KEY` is
set — add a free [Web3Forms](https://web3forms.com) access key as a repository
secret named `WEB3FORMS_KEY`. Without it the section falls back to direct email,
LinkedIn, GitHub and phone links.

This is deliberate: the old site rendered a form that faded its button and threw
the message away. A form that does not send should not be shown.

### Regenerating the share image

```bash
npm run build && npm run preview   # then, in another shell:
npm run og
```

Writes `public/og.png` (1200×630). Committed, so CI needs no browser.
