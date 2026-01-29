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

console.log('Done!');
