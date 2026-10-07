#!/usr/bin/env node

/**
 * Post-build script for GitHub Pages:
 * - generates a 404.html that redirects back to index.html (SPA routing fallback,
 *   since GitHub Pages has no server-side rewrites)
 * - stamps public/sw.js with a build timestamp so the browser detects it as a new
 *   service worker on every deploy and triggers the auto-update/reload in index.html
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = process.argv[2] || 'dist';

if (!fs.existsSync(DIST_DIR)) {
  console.error(`Error: Directory ${DIST_DIR} does not exist.`);
  process.exit(1);
}

// Create 404.html for GitHub Pages SPA routing.
// Redirects to index.html while preserving the path in sessionStorage.
const notFoundPath = path.join(DIST_DIR, '404.html');
const notFoundHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    sessionStorage.setItem('spa-redirect-path', location.pathname + location.search + location.hash);
    location.replace('/');
  </script>
</head>
<body>
  Redirecting...
</body>
</html>`;

fs.writeFileSync(notFoundPath, notFoundHtml);
console.log('Created 404.html for GitHub Pages SPA routing');

// Stamp the already-copied sw.js (Vite copies public/ to dist/ automatically)
// with a build timestamp so its content changes on every deploy.
const swPath = path.join(DIST_DIR, 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  const buildTime = new Date().toISOString();
  swContent = `// Build: ${buildTime}\n${swContent}`;
  fs.writeFileSync(swPath, swContent);
  console.log(`Stamped sw.js with build timestamp (${buildTime})`);
}

console.log('Done!');
