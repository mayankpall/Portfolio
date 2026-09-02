/**
 * Pre-deploy checks, driven over CDP against the built site.
 *
 * Guards the specific failures this rebuild exists to fix:
 *   · content stuck at opacity 0 (the old site shipped three blank sections)
 *   · horizontal overflow on small screens
 *   · reduced-motion users getting hidden content
 *   · missing alt text / accessible names
 *
 * Usage: node scripts/verify.mjs [baseUrl]
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.argv[2] ?? 'http://localhost:4322';
const PORT = 9444;

const PAGES = ['/', '/work/recurtrack', '/work/chatnest', '/work/training-ledger', '/work/newstap-typing'];
const WIDTHS = [375, 768, 1440];

let ws;
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

const evaluate = async (expression) => {
  const { result } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return result.value;
};

const failures = [];
const pass = (msg) => console.log(`  [32m✓[0m ${msg}`);
const fail = (msg) => {
  console.log(`  [31m✗[0m ${msg}`);
  failures.push(msg);
};

async function connect(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

async function withChrome(extraArgs, fn) {
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--enable-unsafe-swiftshader',
      `--user-data-dir=/tmp/claude-verify-${Math.random().toString(36).slice(2)}`,
      ...extraArgs,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  try {
    const wsUrl = await connect(PORT);
    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        const { resolve, reject } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      }
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await fn();
  } finally {
    ws?.close();
    chrome.kill();
    await sleep(400);
  }
}

async function load(path, width, height = 900) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await send('Page.navigate', { url: BASE + path });
  await sleep(1600);
  const h = await evaluate('document.documentElement.scrollHeight');
  for (let y = 0; y < h; y += Math.floor(height * 0.7)) {
    await evaluate(`window.scrollTo(0, ${y})`);
    await sleep(150);
  }
  await sleep(1200);
}

/* ---------- 1. Nothing invisible, at every width ---------- */
console.log('\n[1mVisibility — the bug that started this[0m');
await withChrome([], async () => {
  for (const path of PAGES) {
    for (const width of WIDTHS) {
      await load(path, width);
      const hidden = await evaluate(`
        (() => {
          const bad = [];
          document.querySelectorAll('.reveal, .line-mask, section, main > *').forEach((el) => {
            const cs = getComputedStyle(el);
            if (parseFloat(cs.opacity) < 0.99 || cs.visibility === 'hidden') {
              bad.push((el.tagName + '.' + (el.className || '')).slice(0, 60));
            }
          });
          return bad;
        })()
      `);
      hidden.length === 0
        ? pass(`${path} @${width} — every element fully opaque`)
        : fail(`${path} @${width} — ${hidden.length} hidden: ${hidden.slice(0, 3).join(', ')}`);
    }
  }
});

/* ---------- 2. No horizontal overflow ---------- */
console.log('\n[1mHorizontal overflow[0m');
await withChrome([], async () => {
  for (const path of PAGES) {
    for (const width of WIDTHS) {
      await load(path, width);
      const over = await evaluate(`
        (() => {
          const docW = document.documentElement.clientWidth;
          const scrollW = document.documentElement.scrollWidth;
          const culprits = [];
          if (scrollW > docW + 1) {
            document.querySelectorAll('body *').forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.right > docW + 1 && getComputedStyle(el).position !== 'fixed') {
                culprits.push((el.tagName + '.' + (el.className || '')).slice(0, 50) + ' → ' + Math.round(r.right));
              }
            });
          }
          return { docW, scrollW, culprits: culprits.slice(0, 3) };
        })()
      `);
      over.scrollW <= over.docW + 1
        ? pass(`${path} @${width} — no overflow`)
        : fail(`${path} @${width} — scrollWidth ${over.scrollW} > ${over.docW}: ${over.culprits.join(' | ')}`);
    }
  }
});

/* ---------- 3. Reduced motion ---------- */
console.log('\n[1mprefers-reduced-motion: reduce[0m');
await withChrome(['--force-prefers-reduced-motion'], async () => {
  await load('/', 1440);
  const state = await evaluate(`
    (() => {
      const root = document.documentElement;
      const hidden = [...document.querySelectorAll('.reveal, .line-mask')]
        .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).length;
      const shifted = [...document.querySelectorAll('.line-mask > span')]
        .filter((el) => getComputedStyle(el).transform !== 'none').length;
      return {
        matched: matchMedia('(prefers-reduced-motion: reduce)').matches,
        flagged: root.classList.contains('reduced-motion'),
        hidden,
        shifted,
        canvas: !!document.querySelector('[data-hero3d] canvas'),
      };
    })()
  `);
  state.matched ? pass('media query active') : fail('media query did not apply');
  state.flagged ? pass('html.reduced-motion set before paint') : fail('html.reduced-motion missing');
  state.hidden === 0 ? pass('no hidden reveals') : fail(`${state.hidden} reveals still hidden`);
  state.shifted === 0 ? pass('no shifted line masks') : fail(`${state.shifted} masks still translated`);
  !state.canvas ? pass('three.js not loaded (correct)') : fail('three.js loaded despite reduced motion');
});

/* ---------- 4. three.js budget ---------- */
// What matters is not whether a canvas exists but whether the 176KB chunk was
// fetched, and whether the capability gate actually gates. Headless Chrome
// reports desktop-class memory and cores, so the constrained cases are
// simulated by overriding navigator before any page script runs.
console.log('\n\x1b[1mthree.js budget & capability gate\x1b[0m');

const LOADED_THREE = `
  performance.getEntriesByType('resource').some((r) => /three\\..*\\.js$/.test(r.name))
`;

async function fetchedThreeWith(overrideScript, width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
  });
  if (overrideScript) {
    await send('Page.addScriptToEvaluateOnNewDocument', { source: overrideScript });
  }
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(1500);
  await evaluate('window.scrollTo(0, 200)');
  // The stage starts on requestIdleCallback with a 2.2s timeout — wait past it.
  await sleep(3400);
  return evaluate(LOADED_THREE);
}

await withChrome([], async () => {
  const on = await fetchedThreeWith(null, 1440, 900);
  const live = await evaluate(`!!document.querySelector('[data-stage-gl] canvas')`);
  on ? pass('desktop — three.js fetched') : fail('desktop — three.js never fetched');
  live ? pass('desktop — stage canvas present') : fail('desktop — stage canvas missing');
});

await withChrome([], async () => {
  const on = await fetchedThreeWith(
    `Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });`,
    375, 812,
  );
  !on ? pass('low-memory phone — three.js withheld') : fail('low-memory phone — three.js fetched anyway');
});

await withChrome([], async () => {
  const on = await fetchedThreeWith(
    `Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }) });`,
    375, 812,
  );
  !on ? pass('Save-Data on — three.js withheld') : fail('Save-Data on — three.js fetched anyway');
});

await withChrome([], async () => {
  const on = await fetchedThreeWith(
    `Object.defineProperty(navigator, 'connection', { get: () => ({ effectiveType: '3g' }) });`,
    375, 812,
  );
  !on ? pass('3G — three.js withheld') : fail('3G — three.js fetched anyway');
});

/* ---------- 4b. The pinned manifesto ---------- */
console.log('\n\x1b[1mPinned manifesto\x1b[0m');
await withChrome([], async () => {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(2000);

  const section = await evaluate(`
    (() => {
      const el = document.querySelector('[data-pinned]');
      return el ? { top: el.offsetTop, height: el.offsetHeight } : null;
    })()
  `);

  if (!section) {
    fail('no [data-pinned] section found');
  } else {
    // Never two paragraphs legible at once — the double-exposure bug.
    let worstCount = 0;
    let everLegible = 0;
    for (let f = 0.05; f <= 0.95; f += 0.05) {
      const y = Math.round(section.top + section.height * f - 450);
      await evaluate(`window.scrollTo(0, ${y})`);
      await sleep(320);
      const legible = await evaluate(`
        [...document.querySelectorAll('[data-panel]')]
          .filter((p) => parseFloat(getComputedStyle(p).opacity) > 0.5).length
      `);
      worstCount = Math.max(worstCount, legible);
      everLegible = Math.max(everLegible, legible);
    }
    worstCount <= 1
      ? pass('never more than one panel legible at a time')
      : fail(`${worstCount} panels legible simultaneously — double exposure`);
    everLegible >= 1 ? pass('panels do become legible') : fail('no panel ever reached opacity 0.5');
  }
});

/* ---------- 4c. Without JS the pinned section must collapse ---------- */
console.log('\n\x1b[1mPinned section without JS\x1b[0m');
await withChrome([], async () => {
  // --disable-javascript is not honoured by headless=new; this CDP call is.
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE + '/' });
  await sleep(1500);

  // evaluate() cannot run while script execution is disabled, so the page is
  // inspected through the DOM and CSS agents instead.
  await send('DOM.enable');
  await send('CSS.enable');
  const { root } = await send('DOM.getDocument', { depth: -1 });

  const { nodeId: htmlNode } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: 'html' });
  const htmlAttrs = (await send('DOM.getAttributes', { nodeId: htmlNode })).attributes;
  const classIdx = htmlAttrs.indexOf('class');
  const htmlClass = classIdx === -1 ? '' : htmlAttrs[classIdx + 1];
  !htmlClass.includes('js')
    ? pass('html.js absent (JS really is off)')
    : fail(`JS still ran — html class "${htmlClass}"`);

  const styleOf = async (selector, prop) => {
    const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) return null;
    const { computedStyle } = await send('CSS.getComputedStyleForNode', { nodeId });
    return computedStyle.find((c) => c.name === prop)?.value ?? null;
  };

  const pos = await styleOf('.manifesto__sticky', 'position');
  pos === 'static'
    ? pass('sticky released — panels stack as prose')
    : fail(`still position: ${pos} without JS`);

  const { nodeIds } = await send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-panel]' });
  let hidden = 0;
  for (const nodeId of nodeIds) {
    const { computedStyle } = await send('CSS.getComputedStyleForNode', { nodeId });
    const o = parseFloat(computedStyle.find((c) => c.name === 'opacity')?.value ?? '1');
    if (o < 0.99) hidden++;
  }
  hidden === 0
    ? pass(`all ${nodeIds.length} panels readable`)
    : fail(`${hidden} panels hidden with JS off`);
});

/* ---------- 5. Accessible names ---------- */
console.log('\n[1mAccessibility basics[0m');
await withChrome([], async () => {
  await load('/', 1440);
  const a11y = await evaluate(`
    (() => {
      const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
      const linksNoName = [...document.querySelectorAll('a')]
        .filter((a) => !(a.textContent || '').trim() && !a.getAttribute('aria-label')).length;
      const btnsNoName = [...document.querySelectorAll('button')]
        .filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label')).length;
      const h1 = document.querySelectorAll('h1').length;
      return { imgsNoAlt, linksNoName, btnsNoName, h1, lang: document.documentElement.lang };
    })()
  `);
  a11y.imgsNoAlt === 0 ? pass('every img has alt') : fail(`${a11y.imgsNoAlt} img without alt`);
  a11y.linksNoName === 0 ? pass('every link has an accessible name') : fail(`${a11y.linksNoName} unnamed links`);
  a11y.btnsNoName === 0 ? pass('every button has an accessible name') : fail(`${a11y.btnsNoName} unnamed buttons`);
  a11y.h1 === 1 ? pass('exactly one h1') : fail(`${a11y.h1} h1 elements`);
  a11y.lang ? pass(`lang="${a11y.lang}"`) : fail('no lang attribute');
});

console.log(
  failures.length === 0
    ? '\n[32m[1mAll checks passed.[0m\n'
    : `\n[31m[1m${failures.length} failure(s).[0m\n`,
);
process.exit(failures.length ? 1 : 0);
