/**
 * Renders src/pages/og-card.astro to public/og.png at 1200x630.
 *
 * Run manually (`npm run og`) after changing the name, role or palette.
 * The result is committed so CI never needs a browser.
 *
 * Expects `astro preview` (or dev) to be serving on PORT.
 */
import { spawn } from 'node:child_process';

const PORT = process.env.PORT ?? '4322';
const url = `http://localhost:${PORT}/og-card`;

const child = spawn(
  'node',
  ['scripts/shoot.mjs', url, 'public/og.png', '1200', '630'],
  { stdio: 'inherit' },
);
child.on('exit', (code) => process.exit(code ?? 0));
