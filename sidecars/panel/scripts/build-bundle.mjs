/**
 * @fileoverview Assembles the modular ES files under src/ into the root
 * classic scripts (/styles.css and /app.js) required by the Antigravity
 * Sidecar Webview sandbox.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PANEL_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

const cssOrder = [
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/styles/animations.css',
  'src/styles/components.css',
];

const cssBundle =
  cssOrder
    .map((rel) => `/* --- ${rel} --- */\n${readFileSync(join(PANEL_DIR, rel), 'utf8').trim()}`)
    .join('\n\n') + '\n';

writeFileSync(join(PANEL_DIR, 'styles.css'), cssBundle, 'utf8');

const jsOrder = [
  'src/icons/svgRegistry.js',
  'src/icons/SvgIcon.js',
  'src/core/reactive.js',
  'src/core/domPatch.js',
  'src/core/component.js',
  'src/core/formatters.js',
  'src/core/httpClient.js',
  'src/store/uiStore.js',
  'src/store/telemetryStore.js',
  'src/components/ui/TopLongPillNav.js',
  'src/components/ui/CustomSelect.js',
  'src/components/ui/CustomNumberInput.js',
  'src/components/ui/CustomDateTimePicker.js',
  'src/components/ui/CustomScrollbar.js',
  'src/components/ui/SegmentedControl.js',
  'src/components/ui/ContextSegmentMeter.js',
  'src/components/layout/TopSessionHeader.js',
  'src/views/LiveOverviewView.js',
  'src/views/ConsumptionView.js',
  'src/views/StepsDetailView.js',
  'src/views/SettingsView.js',
  'src/App.js',
  'src/main.js',
];

const jsBundle =
  jsOrder
    .map((rel) => {
      const raw = readFileSync(join(PANEL_DIR, rel), 'utf8');
      const stripped = raw
        .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\r?\n/gm, '')
        .replace(/^export\s+(?=(?:async\s+)?function|const|let|class)/gm, '');
      return `// --- ${rel} ---\n${stripped.trim()}`;
    })
    .join('\n\n') + '\n';

writeFileSync(join(PANEL_DIR, 'app.js'), jsBundle, 'utf8');

const ver = Date.now();
const indexHtmlPath = join(PANEL_DIR, 'index.html');
if (existsSync(indexHtmlPath)) {
  const html = readFileSync(indexHtmlPath, 'utf8')
    .replace(/href="\/styles\.css(?:\?v=[^"]*)?"/, `href="/styles.css?v=${ver}"`)
    .replace(/src="\/app\.js(?:\?v=[^"]*)?"/, `src="/app.js?v=${ver}"`);
  writeFileSync(indexHtmlPath, html, 'utf8');
}

console.log(
  `Built styles.css (${cssBundle.length} bytes) and app.js (${jsBundle.length} bytes) [v=${ver}]`
);
