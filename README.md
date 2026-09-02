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
| `src/components/Scene.astro` | The persistent WebGL stage. Bare three.js, no React. |
| `src/lib/scroll.ts` | The scroll timeline. One rAF loop, many subscribers. |
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

**2. three.js is lazy and capability-gated.** `Scene.astro` dynamically imports
three only when reduced motion is off, a WebGL context can be created, and the
device can afford it — desktop always, phones only when Save-Data is off, the
connection is 4G, and there are ≥4 cores and ≥4GB of memory. Everything else
keeps the CSS wash, which is scroll-driven too and never looks broken.

A first page load without the stage is ~54KB gzipped including both preloaded
fonts. `scripts/verify.mjs` simulates a low-memory device, Save-Data and 3G to
prove the gate actually gates.

## The scroll story

The page is a five-act scroll timeline, Apple-product-page style: a fixed
visual that scrubs while pinned copy cross-fades over it. Apple does this with
a ~148-frame JPEG sequence (5-20MB); this scrubs a live scene instead, so it
costs 176KB once and stays sharp at any resolution.

| Act | Section | The stage |
| --- | --- | --- |
| 0 | Hero | One solid shard, slowly turning |
| 1 | Manifesto *(pinned, 360vh)* | It shatters; the camera pushes through the debris |
| 2 | Work | Fragments gather into a vertical helix |
| 3 | Proof | They settle into a flat lattice, behind the cards |
| 4 | Contact | They converge and the shard reforms |

Acts are `data-act` elements. `src/lib/scroll.ts` measures their **real
offsets** rather than assuming viewport multiples, so changing the length of
any section cannot desync the animation from the copy. Reordering the sections
reorders the story.

Everything scroll-driven — stage, pinned panels, nav progress bar — subscribes
to that one loop. Two components each adding their own scroll listener is how
pages start dropping frames.

The pinned panels use non-overlapping triangular windows, so **two paragraphs
are never legible at once**. Without JS the section unpins and the panels stack
as ordinary prose; `verify.mjs` asserts both.

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
