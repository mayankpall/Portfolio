/**
 * Full-page screenshots via the Chrome DevTools Protocol.
 *
 * Plain `--screenshot` only captures one viewport, and this page's hero is
 * 100svh — so a tall window just produces a tall hero. This drives a real
 * viewport, scrolls the whole page to trigger every IntersectionObserver
 * reveal, returns to the top, then captures beyond the viewport.
 *
 * Usage: node scripts/shoot.mjs <url> <out.png> [width] [height]
 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [, , url, out, w = '1440', hh = '900'] = process.argv;
const width = Number(w);
const height = Number(hh);
const PORT = 9333;

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-extensions',
    `--window-size=${width},${height}`,
    '--user-data-dir=/tmp/claude-shoot-profile',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let ws;
let id = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not expose a debugging target');
}

try {
  const wsUrl = await connect();
  ws = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 768,
  });

  await send('Page.navigate', { url });
  await sleep(2500);

  // Walk the page so every reveal observer fires, then return to the top.
  const { result } = await send('Runtime.evaluate', {
    expression: 'document.documentElement.scrollHeight',
    returnByValue: true,
  });
  const pageHeight = result.value;

  for (let y = 0; y < pageHeight; y += Math.floor(height * 0.6)) {
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
    await sleep(260);
  }
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
  await sleep(1400);

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });

  await writeFile(out, Buffer.from(shot.data, 'base64'));
  console.log(`${out} — ${width}x${pageHeight}`);
} finally {
  ws?.close();
  chrome.kill();
}
