#!/usr/bin/env node

/**
 * Post-export script to add PWA meta tags to all HTML files.
 * Run this after `expo export --platform web`
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = process.argv[2] || 'dist';

const PWA_TAGS = `
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Edineros" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
    <!-- GitHub Pages SPA redirect handler + Service Worker registration -->
    <script>
      (function() {
        // Handle SPA redirects from 404.html
        var redirectPath = sessionStorage.getItem('spa-redirect-path');
        if (redirectPath) {
          sessionStorage.removeItem('spa-redirect-path');
          history.replaceState(null, '', redirectPath);
        }

        // Register service worker for auto-updates
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').then(function(reg) {
            // Check for updates when app comes to foreground
            document.addEventListener('visibilitychange', function() {
              if (document.visibilityState === 'visible') {
                reg.update();
              }
            });
          });
          // Reload when new service worker takes over
          navigator.serviceWorker.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'SW_UPDATED') {
              window.location.reload();
            }
          });
        }
      })();
    </script>
`;

function findHtmlFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
    } else if (item.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function addPwaTags(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has manifest link
  if (content.includes('rel="manifest"')) {
    console.log(`  Skipping ${filePath} (already has PWA tags)`);
    return;
  }

  // Insert PWA tags after the first <meta> tag or after <head>
  if (content.includes('<head>')) {
    content = content.replace('<head>', '<head>' + PWA_TAGS);
    fs.writeFileSync(filePath, content);
    console.log(`  Added PWA tags to ${filePath}`);
  }
}

console.log(`Adding PWA tags to HTML files in ${DIST_DIR}...`);

if (!fs.existsSync(DIST_DIR)) {
  console.error(`Error: Directory ${DIST_DIR} does not exist.`);
  process.exit(1);
}

const htmlFiles = findHtmlFiles(DIST_DIR);
console.log(`Found ${htmlFiles.length} HTML files`);

for (const file of htmlFiles) {
  addPwaTags(file);
}

// Create 404.html for GitHub Pages SPA routing
// Redirects to index.html while preserving the path in sessionStorage
const notFoundPath = path.join(DIST_DIR, '404.html');
const notFoundHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Store the path so index.html can restore it
    sessionStorage.setItem('spa-redirect-path', location.pathname + location.search + location.hash);
    location.replace('/');
  </script>
</head>
<body>
  Redirecting...
</body>
</html>`;

if (!fs.existsSync(notFoundPath)) {
  fs.writeFileSync(notFoundPath, notFoundHtml);
  console.log('Created 404.html for GitHub Pages SPA routing');
}

// Copy service worker to dist with build timestamp
const swSrc = path.join(__dirname, '..', 'public', 'sw.js');
const swDest = path.join(DIST_DIR, 'sw.js');
if (fs.existsSync(swSrc)) {
  let swContent = fs.readFileSync(swSrc, 'utf8');
  // Inject build timestamp so browser detects new version on each deploy
  const buildTime = new Date().toISOString();
  swContent = `// Build: ${buildTime}\n${swContent}`;
  fs.writeFileSync(swDest, swContent);
  console.log(`Copied sw.js to dist (build: ${buildTime})`);
}

// Copy manifest.json to dist if not already there
const manifestSrc = path.join(__dirname, '..', 'public', 'manifest.json');
const manifestDest = path.join(DIST_DIR, 'manifest.json');
if (fs.existsSync(manifestSrc) && !fs.existsSync(manifestDest)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('Copied manifest.json to dist');
}

console.log('Done!');
