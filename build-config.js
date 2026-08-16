module.exports = {
  siteUrl: 'https://clewbyte.com',
  defaultLang: 'en',

  // Google tags. Leave an id empty to keep the site tag-free: the cookie
  // banner and the relaxed CSP are emitted only for the ids that are set.
  analytics: {
    // GA4 web stream "clewbyte.com" (id 15445379251) in the profi-cad property
    ga4Id: 'G-E7NEFNDL1N',
    adsId: '',              // Google Ads tag, e.g. 'AW-XXXXXXXXX'
    adsConversionLabel: '', // conversion label for the Google Play click
  },

  // Google Play listing the download buttons point to.
  playUrl: 'https://play.google.com/store/apps/details?id=com.clewbyte.floorisplan',

  pages: [
    { template: 'index.html', slug: 'index' },
    { template: 'floorisplan.html', slug: 'floorisplan' },
    { template: 'contact.html', slug: 'contact' },
    // contentRequired: page body comes from src/content/{slug}.{lang}.html,
    // so the page is generated only for languages that have such a file.
    { template: 'privacy.html', slug: 'privacy', contentRequired: true },
  ],

  // Override default URL pattern for specific page+lang combos
  // Default pattern: /{lang}/page.html (for non-default lang), /page.html (for default lang)
  urlOverrides: {
    privacy: {
      en: '/privacy-en.html',
      ru: '/privacy.html',
    },
  },
};
