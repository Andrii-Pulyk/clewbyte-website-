const fs = require('fs');
const path = require('path');
const config = require('./build-config');

const SRC = path.join(__dirname, 'src');
const DIST = __dirname; // Output to repo root for GitHub Pages
const I18N_DIR = path.join(SRC, 'i18n');
const TEMPLATES_DIR = path.join(SRC, 'templates');
const PARTIALS_DIR = path.join(TEMPLATES_DIR, 'partials');
const CONTENT_DIR = path.join(SRC, 'content');

// ─── 1. Discover languages ────────────────────────────────────────────────────

const languages = fs.readdirSync(I18N_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''));

console.log(`Languages found: ${languages.join(', ')}`);

// ─── 2. Load translations ─────────────────────────────────────────────────────

const translations = {};
for (const lang of languages) {
  translations[lang] = JSON.parse(
    fs.readFileSync(path.join(I18N_DIR, `${lang}.json`), 'utf8')
  );
}

// ─── 3. Load partials ──────────────────────────────────────────────────────────

const partials = {};
for (const file of fs.readdirSync(PARTIALS_DIR)) {
  if (!file.endsWith('.html')) continue;
  const name = file.replace('.html', '');
  partials[name] = fs.readFileSync(path.join(PARTIALS_DIR, file), 'utf8');
}

console.log(`Partials loaded: ${Object.keys(partials).join(', ')}`);

// ─── 4. Helper functions ───────────────────────────────────────────────────────

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function getOutputPath(pageSlug, template, lang) {
  // Check urlOverrides first
  if (config.urlOverrides[pageSlug] && config.urlOverrides[pageSlug][lang]) {
    return config.urlOverrides[pageSlug][lang];
  }
  // Default language → root
  if (lang === config.defaultLang) {
    return '/' + template;
  }
  // Other languages → /{lang}/template
  return '/' + lang + '/' + template;
}

function getPageUrl(pageSlug, template, lang) {
  const outputPath = getOutputPath(pageSlug, template, lang);
  // Clean up /index.html → /
  return config.siteUrl + outputPath.replace(/\/index\.html$/, '/');
}

function generateHreflangTags(page, langs) {
  const tags = [];
  for (const lang of langs) {
    const url = getPageUrl(page.slug, page.template, lang);
    tags.push(`    <link rel="alternate" hreflang="${lang}" href="${url}">`);
  }
  // x-default points to the default language
  const defaultUrl = getPageUrl(page.slug, page.template, config.defaultLang);
  tags.push(`    <link rel="alternate" hreflang="x-default" href="${defaultUrl}">`);
  return tags.join('\n');
}

function generateNavUrls(lang) {
  const urls = {};
  for (const p of config.pages) {
    const outputPath = getOutputPath(p.slug, p.template, lang);
    const key = p.slug;
    // For index, use directory path
    if (p.slug === 'index') {
      urls[key] = outputPath.replace(/index\.html$/, '');
    } else {
      urls[key] = outputPath;
    }
  }
  return urls;
}

function generateLangSwitcher(currentLang, currentPage, langs) {
  if (langs.length < 2) return '';

  // For 2 languages: simple toggle link
  if (langs.length === 2) {
    const otherLang = langs.find(l => l !== currentLang);
    const otherUrl = getOutputPath(currentPage.slug, currentPage.template, otherLang);
    const cleanUrl = currentPage.slug === 'index'
      ? otherUrl.replace(/index\.html$/, '')
      : otherUrl;
    return `<a href="${cleanUrl}" class="lang-toggle" title="${translations[otherLang].meta.lang.toUpperCase()}">${otherLang.toUpperCase()}</a>`;
  }

  // For 3+ languages: dropdown
  let html = '<div class="lang-selector">';
  html += `<button class="lang-selector-toggle" aria-expanded="false" aria-label="Language">${currentLang.toUpperCase()} &#9662;</button>`;
  html += '<ul class="lang-selector-menu">';
  for (const lang of langs) {
    const url = getOutputPath(currentPage.slug, currentPage.template, lang);
    const cleanUrl = currentPage.slug === 'index'
      ? url.replace(/index\.html$/, '')
      : url;
    const activeClass = lang === currentLang ? ' class="active"' : '';
    html += `<li><a href="${cleanUrl}"${activeClass}>${lang.toUpperCase()}</a></li>`;
  }
  html += '</ul></div>';
  return html;
}

function generateLangSwitcherMobile(currentLang, currentPage, langs) {
  if (langs.length < 2) return '';

  // For 2 languages: simple link in mobile nav
  if (langs.length === 2) {
    const otherLang = langs.find(l => l !== currentLang);
    const otherUrl = getOutputPath(currentPage.slug, currentPage.template, otherLang);
    const cleanUrl = currentPage.slug === 'index'
      ? otherUrl.replace(/index\.html$/, '')
      : otherUrl;
    return `<a href="${cleanUrl}" class="lang-toggle-mobile">${otherLang.toUpperCase()}</a>`;
  }

  // For 3+ languages: list in mobile nav
  let html = '';
  for (const lang of langs) {
    if (lang === currentLang) continue;
    const url = getOutputPath(currentPage.slug, currentPage.template, lang);
    const cleanUrl = currentPage.slug === 'index'
      ? url.replace(/index\.html$/, '')
      : url;
    html += `<a href="${cleanUrl}" class="lang-toggle-mobile">${lang.toUpperCase()}</a>`;
  }
  return html;
}

function loadPageContent(pageSlug, lang) {
  const contentFile = path.join(CONTENT_DIR, `${pageSlug}.${lang}.html`);
  if (fs.existsSync(contentFile)) {
    return fs.readFileSync(contentFile, 'utf8');
  }
  return '';
}

// ─── 5. Clean output files ──────────────────────────────────────────────────────

function cleanOutput() {
  // Remove only generated language subdirs (e.g. /ru/)
  for (const lang of languages) {
    if (lang === config.defaultLang) continue;
    const langDir = path.join(DIST, lang);
    if (fs.existsSync(langDir)) {
      fs.rmSync(langDir, { recursive: true });
    }
  }
}

// ─── 6. Copy static assets ────────────────────────────────────────────────────

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── 7. Build ──────────────────────────────────────────────────────────────────

cleanOutput();

let pagesGenerated = 0;

for (const page of config.pages) {
  const templatePath = path.join(TEMPLATES_DIR, page.template);
  const template = fs.readFileSync(templatePath, 'utf8');

  for (const lang of languages) {
    const t = translations[lang];
    const navUrls = generateNavUrls(lang);

    // Compute output path
    const outputPath = getOutputPath(page.slug, page.template, lang);

    // Assets prefix based on directory depth
    const pathWithoutLeadingSlash = outputPath.replace(/^\//, '');
    const depth = pathWithoutLeadingSlash.split('/').length - 1;
    const assetsPrefix = depth > 0 ? '../'.repeat(depth) : '';

    // Canonical URL
    const canonicalUrl = getPageUrl(page.slug, page.template, lang);

    // Privacy switch URL (for privacy pages)
    let privacySwitchUrl = '';
    if (page.slug === 'privacy') {
      // Find the "other" language for the switch link
      // For 2 languages, toggle to the other
      // For 3+, link to the default lang (or the first different one)
      const otherLang = languages.length === 2
        ? languages.find(l => l !== lang)
        : (lang === config.defaultLang ? languages.find(l => l !== lang) : config.defaultLang);
      if (otherLang) {
        privacySwitchUrl = getOutputPath('privacy', 'privacy.html', otherLang);
      }
    }

    // Load page content from content files (for privacy etc.)
    const pageContent = loadPageContent(page.slug, lang);

    // Build context object
    const context = {
      meta: t.meta,
      nav: t.nav,
      footer: t.footer,
      page: t[page.slug],
      // Computed values (prefixed with _ to distinguish)
      _assets: assetsPrefix,
      _canonical_url: canonicalUrl,
      _hreflang_tags: generateHreflangTags(page, languages),
      _lang_switcher: generateLangSwitcher(lang, page, languages),
      _lang_switcher_mobile: generateLangSwitcherMobile(lang, page, languages),
      _nav_home_url: navUrls.index,
      _nav_floorisplan_url: navUrls.floorisplan,
      _nav_contacts_url: navUrls.contact,
      _privacy_url: getOutputPath('privacy', 'privacy.html', lang),
      _privacy_switch_url: privacySwitchUrl,
      _page_content: pageContent,
    };

    // Process template
    let html = template;

    // 1. Include partials: {{> name}}
    html = html.replace(/\{\{>\s*(\w+)\s*\}\}/g, (match, name) => {
      return partials[name] || match;
    });

    // 2. Replace placeholders: {{key.subkey}}
    html = html.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g, (match, keyPath) => {
      const value = getNestedValue(context, keyPath);
      return value !== undefined ? String(value) : match;
    });

    // Write output file
    const outputFile = path.join(DIST, pathWithoutLeadingSlash);
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, html, 'utf8');
    pagesGenerated++;

    console.log(`  ${lang.toUpperCase()} → ${outputPath}`);
  }
}

// Copy static assets
copyDirRecursive(path.join(SRC, 'css'), path.join(DIST, 'css'));
copyDirRecursive(path.join(SRC, 'js'), path.join(DIST, 'js'));
copyDirRecursive(path.join(SRC, 'images'), path.join(DIST, 'images'));

// ─── 8. Generate sitemap.xml ────────────────────────────────────────────────

const sitemapUrls = [];
for (const page of config.pages) {
  for (const lang of languages) {
    const url = getPageUrl(page.slug, page.template, lang);
    const priority = page.slug === 'index' ? '1.0'
      : page.slug === 'privacy' ? '0.3'
      : '0.8';
    sitemapUrls.push(`  <url>\n    <loc>${url}</loc>\n    <priority>${priority}</priority>\n  </url>`);
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');
console.log('  sitemap.xml generated');

// ─── 9. Generate robots.txt ─────────────────────────────────────────────────

const robots = `User-agent: *
Allow: /

Sitemap: ${config.siteUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(DIST, 'robots.txt'), robots, 'utf8');
console.log('  robots.txt generated');

console.log(`\nBuild complete: ${pagesGenerated} pages generated for ${languages.length} languages.`);
console.log(`Static assets copied.`);
