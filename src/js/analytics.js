/* ============================================
   ClewByte — analytics.js
   Google Consent Mode v2, баннер согласия, отслеживание
   переходов в Google Play.

   Скрипт получает идентификаторы тегов из data-атрибутов
   на своём же <script id="site-analytics">, которые
   подставляет build.js из build-config.js.
   ============================================ */

(function () {
    'use strict';

    var tag = document.getElementById('site-analytics');
    if (!tag) return;

    var GA4_ID = tag.getAttribute('data-ga4') || '';
    var ADS_ID = tag.getAttribute('data-ads') || '';
    var ADS_LABEL = tag.getAttribute('data-ads-label') || '';
    var STORAGE_KEY = 'cb_consent_v1';

    /* ----- Хранилище выбора посетителя ----- */

    function readConsent() {
        try {
            return window.localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null; // приватный режим — считаем, что выбора не было
        }
    }

    function writeConsent(value) {
        try {
            window.localStorage.setItem(STORAGE_KEY, value);
        } catch (e) {
            /* не критично: спросим при следующем визите */
        }
    }

    /* ----- Загрузка gtag.js ----- */

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    var stored = readConsent();

    // Consent Mode v2. По умолчанию запрещено всё: до согласия тег
    // не пишет и не читает cookie, отправляя только обезличенные пинги.
    gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
        security_storage: 'granted',
        wait_for_update: 500
    });

    // Пока согласия нет — вырезать идентификаторы рекламных кликов
    // и передавать gclid через параметр URL, а не через cookie.
    gtag('set', 'ads_data_redaction', true);
    gtag('set', 'url_passthrough', true);

    if (stored === 'granted') {
        grantConsent();
    }

    gtag('js', new Date());
    if (GA4_ID) gtag('config', GA4_ID);
    if (ADS_ID) gtag('config', ADS_ID);

    (function loadGtag() {
        var id = GA4_ID || ADS_ID;
        if (!id) return;
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
        document.head.appendChild(script);
    })();

    function grantConsent() {
        gtag('consent', 'update', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
            analytics_storage: 'granted',
            functionality_storage: 'granted',
            personalization_storage: 'granted'
        });
        gtag('set', 'ads_data_redaction', false);
    }

    function denyConsent() {
        gtag('consent', 'update', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'denied',
            personalization_storage: 'denied'
        });
    }

    /* ----- Баннер согласия ----- */

    function initBanner() {
        var banner = document.getElementById('cookieBanner');
        if (!banner) return;

        var accept = document.getElementById('cookieAccept');
        var decline = document.getElementById('cookieDecline');

        function close(choice) {
            writeConsent(choice);
            banner.classList.remove('visible');
            window.setTimeout(function () { banner.hidden = true; }, 300);
        }

        if (accept) {
            accept.addEventListener('click', function () {
                grantConsent();
                close('granted');
            });
        }
        if (decline) {
            decline.addEventListener('click', function () {
                denyConsent();
                close('denied');
            });
        }

        if (stored) return; // выбор уже сделан — баннер не показываем

        banner.hidden = false;
        // Отдельный кадр, чтобы сработал transition появления.
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                banner.classList.add('visible');
            });
        });
    }

    /* ----- Переходы в Google Play ----- */

    // Play Store читает метки кампании из параметра referrer. Параметры
    // рекламного клика с текущей страницы передаются дальше, чтобы в
    // Firebase было видно, какая кампания привела установку.
    function playReferrer() {
        var pageParams = new URLSearchParams(window.location.search);
        var referrer = new URLSearchParams();
        var passthrough = [
            'utm_source', 'utm_medium', 'utm_campaign',
            'utm_term', 'utm_content', 'gclid'
        ];

        passthrough.forEach(function (key) {
            var value = pageParams.get(key);
            if (value) referrer.set(key, value);
        });

        if (!referrer.has('utm_source')) {
            var lang = document.documentElement.getAttribute('lang') || 'en';
            referrer.set('utm_source', 'clewbyte.com');
            referrer.set('utm_medium', 'website');
            referrer.set('utm_campaign', 'site_' + lang);
        }

        return referrer.toString();
    }

    function initPlayLinks() {
        var links = document.querySelectorAll('a[href^="https://play.google.com/"]');
        if (!links.length) return;

        var referrer = playReferrer();

        links.forEach(function (link) {
            var href = link.getAttribute('href');
            if (referrer && href.indexOf('referrer=') === -1) {
                link.setAttribute(
                    'href',
                    href + (href.indexOf('?') === -1 ? '?' : '&') +
                    'referrer=' + encodeURIComponent(referrer)
                );
            }

            link.addEventListener('click', function () {
                if (GA4_ID) {
                    gtag('event', 'click_google_play', {
                        link_id: link.getAttribute('data-play-source') || 'button',
                        page_language: document.documentElement.getAttribute('lang') || 'en'
                    });
                }
                if (ADS_ID && ADS_LABEL) {
                    gtag('event', 'conversion', {
                        send_to: ADS_ID + '/' + ADS_LABEL
                    });
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initBanner();
            initPlayLinks();
        });
    } else {
        initBanner();
        initPlayLinks();
    }

})();
