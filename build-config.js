module.exports = {
  siteUrl: 'https://clewbyte.com',
  defaultLang: 'en',

  pages: [
    { template: 'index.html', slug: 'index' },
    { template: 'floorisplan.html', slug: 'floorisplan' },
    { template: 'contact.html', slug: 'contact' },
    { template: 'privacy.html', slug: 'privacy' },
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
