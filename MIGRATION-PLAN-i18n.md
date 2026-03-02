# План миграции сайта ClewByte.com на мультиязычность

## 1. Текущее состояние

### Стек технологий
- Статический HTML-сайт (без фреймворка, без сборки)
- 5 HTML-файлов, 1 CSS, 1 JS
- Весь текст захардкожен в HTML

### Текущая структура файлов
```
/
├── index.html          ← Главная (RU)
├── floorisplan.html    ← Продукт (RU)
├── contact.html        ← Контакты (RU)
├── privacy.html        ← Политика конфиденциальности (RU) ⚠️ URL зафиксирован
├── privacy-en.html     ← Privacy Policy (EN) ⚠️ URL зафиксирован
├── css/style.css
├── js/main.js
└── images/favicon.svg
```

### Критическое ограничение
Приложение FloorisPlan опубликовано в Play Store. Ссылки на политику конфиденциальности **нельзя менять**:
- `https://clewbyte.com/privacy.html` — русская версия
- `https://clewbyte.com/privacy-en.html` — английская версия

---

## 2. Целевая архитектура

### Принципы
1. **Английский — основной язык** (корневой уровень `/`)
2. **Русский — перевод** (подкаталог `/ru/`)
3. **Расширяемость** — новые языки = новый JSON-файл + `npm run build`
4. **Шаблонизация** — один HTML-шаблон на страницу, все тексты в JSON
5. **Privacy-страницы** — фиксированные URL, обрабатываются build-скриптом как особый случай
6. **Нет хардкода** — ни одного текста в HTML-шаблонах

### Целевая структура URL

| Страница | EN (основной) | RU (перевод) | DE (пример) |
|----------|---------------|--------------|-------------|
| Главная | `/` | `/ru/` | `/de/` |
| FloorisPlan | `/floorisplan.html` | `/ru/floorisplan.html` | `/de/floorisplan.html` |
| Контакты | `/contact.html` | `/ru/contact.html` | `/de/contact.html` |
| Privacy Policy | `/privacy-en.html` ⚠️ | `/privacy.html` ⚠️ | `/de/privacy.html` |

> ⚠️ Privacy для EN и RU — исключение: обе в корне для обратной совместимости с Play Store.
> Все остальные языки используют стандартную схему `/{lang}/privacy.html`.

### Целевая структура проекта

```
/
├── src/                            ← ИСХОДНИКИ (редактируем только здесь)
│   ├── templates/                  ← HTML-шаблоны с плейсхолдерами
│   │   ├── index.html
│   │   ├── floorisplan.html
│   │   ├── contact.html
│   │   ├── privacy.html
│   │   └── partials/
│   │       ├── head.html           ← <head>: мета-теги, CSP, hreflang
│   │       ├── header.html         ← Навигация + переключатель языка
│   │       └── footer.html         ← Футер
│   ├── i18n/                       ← Переводы (один файл = один язык)
│   │   ├── en.json
│   │   ├── ru.json
│   │   └── [новый_язык].json       ← Добавить файл = добавить язык
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── images/
│       └── favicon.svg
│
├── build.js                        ← Скрипт сборки
├── build-config.js                 ← Конфигурация: список страниц, особые URL
├── package.json
│
└── dist/                           ← РЕЗУЛЬТАТ СБОРКИ (деплоится на хостинг)
    ├── index.html                  (EN)
    ├── floorisplan.html            (EN)
    ├── contact.html                (EN)
    ├── privacy-en.html             (EN) ← фиксированный URL
    ├── privacy.html                (RU) ← фиксированный URL
    ├── ru/
    │   ├── index.html
    │   ├── floorisplan.html
    │   └── contact.html
    ├── de/                         (пример нового языка)
    │   ├── index.html
    │   ├── floorisplan.html
    │   ├── contact.html
    │   └── privacy.html
    ├── css/style.css               (скопировано)
    ├── js/main.js                  (скопировано)
    └── images/favicon.svg          (скопировано)
```

---

## 3. Система шаблонов и переводов

### 3.1. Формат шаблонов

Шаблоны используют плейсхолдеры `{{ключ}}` для подстановки текста:

```html
<!-- src/templates/index.html -->
{{> head}}
<body>
{{> header}}

<section class="hero">
    <h1 class="fade-in">{{hero_title}}</h1>
    <p class="fade-in">{{hero_subtitle}}</p>
    <a href="{{floorisplan_url}}" class="btn btn-primary fade-in">{{hero_cta}}</a>
</section>

<!-- ... остальные секции ... -->

{{> footer}}
</body>
</html>
```

`{{> partial_name}}` — вставка partial (header, footer, head).

### 3.2. Формат файлов перевода

Каждый JSON-файл содержит **все** тексты для одного языка — и UI, и контент:

```jsonc
// src/i18n/en.json
{
  "meta": {
    "lang": "en",
    "locale": "en_US",
    "dir": "ltr"
  },

  // === ОБЩИЕ UI-ЭЛЕМЕНТЫ (shared across all pages) ===
  "nav": {
    "home": "Home",
    "floorisplan": "FloorisPlan",
    "contacts": "Contacts"
  },
  "footer": {
    "navigation": "Navigation",
    "legal": "Legal",
    "privacy_policy": "Privacy Policy",
    "copyright": "© 2026 Dabudinwst Sp. z o.o. All rights reserved.",
    "brand_description": "We develop professional mobile applications that solve real problems."
  },
  "lang_switch": {
    "aria_label": "Switch language"
  },

  // === ГЛАВНАЯ СТРАНИЦА (index) ===
  "index": {
    "title": "ClewByte — App Development",
    "meta_description": "ClewByte — IT company developing professional mobile applications.",
    "hero_title": "We create <span class=\"accent\">apps</span><br>that work",
    "hero_subtitle": "Professional mobile development for business and everyday tasks",
    "hero_cta": "Learn more"
    // ... все тексты страницы
  },

  // === FLOORISPLAN ===
  "floorisplan": {
    "title": "FloorisPlan — Floor Plan App",
    // ...
  },

  // === КОНТАКТЫ ===
  "contact": {
    "title": "Contacts — ClewByte",
    // ...
  },

  // === PRIVACY ===
  "privacy": {
    "title": "Privacy Policy — FloorisPlan",
    // ...
  }
}
```

```jsonc
// src/i18n/ru.json
{
  "meta": {
    "lang": "ru",
    "locale": "ru_RU",
    "dir": "ltr"
  },

  "nav": {
    "home": "Главная",
    "floorisplan": "FloorisPlan",
    "contacts": "Контакты"
  },
  "footer": {
    "navigation": "Навигация",
    "legal": "Правовая информация",
    "privacy_policy": "Политика конфиденциальности",
    "copyright": "© 2026 Dabudinwst Sp. z o.o. Все права защищены.",
    "brand_description": "Разрабатываем профессиональные мобильные приложения, которые решают реальные задачи."
  },

  "index": {
    "title": "ClewByte — Разработка приложений",
    "hero_title": "Создаём <span class=\"accent\">приложения</span>,<br>которые работают",
    // ...
  }
  // ...
}
```

### 3.3. Partials (переиспользуемые блоки)

**`src/templates/partials/head.html`:**
```html
<!DOCTYPE html>
<html lang="{{meta.lang}}" dir="{{meta.dir}}">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{page_meta_description}}">
    <meta property="og:title" content="{{page_title}}">
    <meta property="og:description" content="{{page_meta_description}}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{page_canonical_url}}">
    <meta property="og:locale" content="{{meta.locale}}">
    <title>{{page_title}}</title>
    {{hreflang_tags}}
    <link rel="canonical" href="{{page_canonical_url}}">
    <link rel="icon" type="image/svg+xml" href="{{assets_prefix}}images/favicon.svg">
    <link rel="stylesheet" href="{{assets_prefix}}css/style.css">
</head>
```

> `{{hreflang_tags}}` и `{{assets_prefix}}` — генерируются автоматически build-скриптом.

**`src/templates/partials/header.html`:**
```html
<header class="header">
    <div class="container">
        <a href="{{nav_home_url}}" class="logo">clewbyte<span>.</span></a>
        <nav class="nav" id="nav">
            <a href="{{nav_home_url}}">{{nav.home}}</a>
            <a href="{{nav_floorisplan_url}}">{{nav.floorisplan}}</a>
            <a href="{{nav_contacts_url}}">{{nav.contacts}}</a>
        </nav>
        {{lang_switcher}}
        <button class="menu-toggle" id="menuToggle" aria-label="{{nav.menu_aria}}">
            <span></span><span></span><span></span>
        </button>
    </div>
</header>
```

> `{{lang_switcher}}` — генерируется build-скриптом на основе списка доступных языков.

---

## 4. Build-скрипт

### 4.1. Конфигурация `build-config.js`

```js
module.exports = {
  // Базовый URL сайта
  siteUrl: 'https://clewbyte.com',

  // Основной язык (корневой уровень /)
  defaultLang: 'en',

  // Все поддерживаемые языки (считываются автоматически из i18n/*.json)
  // Этот массив генерируется автоматически — не нужно обновлять руками

  // Страницы сайта
  pages: [
    { template: 'index.html',       slug: 'index' },
    { template: 'floorisplan.html',  slug: 'floorisplan' },
    { template: 'contact.html',     slug: 'contact' },
    { template: 'privacy.html',     slug: 'privacy' },
  ],

  // Особые URL (переопределение стандартной схемы /{lang}/page.html)
  urlOverrides: {
    'privacy': {
      'en': '/privacy-en.html',   // вместо /privacy.html
      'ru': '/privacy.html',      // вместо /ru/privacy.html
    }
  }
};
```

### 4.2. Что делает `build.js`

1. **Сканирует `src/i18n/`** — находит все `*.json` файлы → список языков
2. **Для каждого языка, для каждой страницы:**
   - Загружает шаблон из `src/templates/`
   - Загружает partials и подставляет `{{> partial}}`
   - Подставляет все `{{ключ}}` из JSON-перевода
   - Генерирует `{{hreflang_tags}}` — автоматически для всех найденных языков
   - Генерирует `{{lang_switcher}}` — список/dropdown всех языков
   - Вычисляет `{{assets_prefix}}` — `../` для подкаталогов, пустая строка для корня
   - Определяет выходной путь (стандартный или из `urlOverrides`)
3. **Копирует статические ресурсы** (`css/`, `js/`, `images/`) в `dist/`
4. **Выводит отчёт:** сколько страниц сгенерировано, для каких языков

### 4.3. Генерация hreflang

Build-скрипт автоматически генерирует hreflang для **всех** найденных языков:

```html
<!-- Автоматически для страницы index при 3 языках (en, ru, de): -->
<link rel="alternate" hreflang="en" href="https://clewbyte.com/">
<link rel="alternate" hreflang="ru" href="https://clewbyte.com/ru/">
<link rel="alternate" hreflang="de" href="https://clewbyte.com/de/">
<link rel="alternate" hreflang="x-default" href="https://clewbyte.com/">
```

Добавили `de.json` → при следующей сборке hreflang появится на **всех** страницах автоматически.

### 4.4. Генерация переключателя языка

При 2 языках — простая кнопка-toggle:
```html
<a href="/ru/" class="lang-toggle">RU</a>
```

При 3+ языках — dropdown-меню:
```html
<div class="lang-selector">
    <button class="lang-selector-toggle" aria-label="Switch language">EN ▾</button>
    <ul class="lang-selector-menu">
        <li><a href="/" class="active">EN</a></li>
        <li><a href="/ru/">RU</a></li>
        <li><a href="/de/">DE</a></li>
    </ul>
</div>
```

Формат определяется автоматически по количеству языков.

### 4.5. package.json

```json
{
  "name": "clewbyte-website",
  "private": true,
  "scripts": {
    "build": "node build.js",
    "dev": "node build.js --watch",
    "clean": "rm -rf dist"
  }
}
```

Нет внешних зависимостей — только Node.js встроенные модули (`fs`, `path`).

---

## 5. Пошаговый план реализации

### Фаза 1: Инфраструктура сборки

**Цель:** настроить build-пайплайн, чтобы текущий сайт генерировался из шаблонов.

| # | Задача | Результат |
|---|--------|-----------|
| 1.1 | Создать `package.json` | `npm run build` доступен |
| 1.2 | Создать `build-config.js` | Конфигурация страниц и URL |
| 1.3 | Создать `build.js` | Скрипт сборки |
| 1.4 | Создать `src/templates/partials/` | head.html, header.html, footer.html |
| 1.5 | Перенести CSS, JS, images в `src/` | Ресурсы в исходниках |

**Критерий завершения:** `npm run build` генерирует `dist/` идентичный текущему сайту.

### Фаза 2: Шаблонизация существующих страниц

**Цель:** вынести все тексты из HTML в JSON, оставив в шаблонах только `{{плейсхолдеры}}`.

| # | Задача | Результат |
|---|--------|-----------|
| 2.1 | Создать `src/i18n/ru.json` с текстами ВСЕХ страниц | Полный русский перевод |
| 2.2 | Превратить `index.html` в шаблон | Вместо текста — `{{index.hero_title}}` |
| 2.3 | Превратить `floorisplan.html` в шаблон | Аналогично |
| 2.4 | Превратить `contact.html` в шаблон | Аналогично |
| 2.5 | Превратить `privacy.html` в шаблон | Аналогично |

**Критерий завершения:** `npm run build` генерирует русскую версию сайта идентичную текущей. Ни одного захардкоженного текста в шаблонах.

### Фаза 3: Английская версия

**Цель:** добавить английский как основной язык.

| # | Задача | Результат |
|---|--------|-----------|
| 3.1 | Создать `src/i18n/en.json` — перевод всех страниц | Полный английский перевод |
| 3.2 | Обновить `build-config.js`: `defaultLang: 'en'` | EN в корне, RU в `/ru/` |
| 3.3 | Настроить `urlOverrides` для privacy | Фиксированные URL работают |

**Критерий завершения:**
- `dist/index.html` — английский
- `dist/ru/index.html` — русский
- `dist/privacy.html` — русский (тот же URL)
- `dist/privacy-en.html` — английский (тот же URL)

### Фаза 4: Переключатель языка + CSS

**Цель:** пользователь может переключать язык.

| # | Задача | Результат |
|---|--------|-----------|
| 4.1 | Генерация `{{lang_switcher}}` в build.js | HTML-код переключателя |
| 4.2 | Добавить переключатель в `partials/header.html` | Видим в навигации |
| 4.3 | CSS-стили для `.lang-toggle` / `.lang-selector` | Стилизация toggle и dropdown |
| 4.4 | Обновить мобильное меню в `main.js` | Переключатель в бургер-меню |

### Фаза 5: SEO

**Цель:** правильные мета-теги для поисковиков.

| # | Задача | Результат |
|---|--------|-----------|
| 5.1 | Автогенерация `hreflang` в build.js | На всех страницах, все языки |
| 5.2 | Автогенерация `<link rel="canonical">` | Канонический URL каждой страницы |
| 5.3 | Корректные `og:locale`, `og:url` | Из JSON-метаданных |

### Фаза 6: Финализация и деплой

| # | Задача | Результат |
|---|--------|-----------|
| 6.1 | Обновить `.gitignore` — добавить `dist/` | Не коммитим сгенерированные файлы |
| 6.2 | Обновить деплой — указать `dist/` как корень | Хостинг берёт файлы из dist |
| 6.3 | Полное тестирование (см. чеклист) | Всё работает |

---

## 6. Добавление нового языка (после миграции)

### Пошаговая инструкция

```
Шаг 1:  Скопировать src/i18n/en.json → src/i18n/de.json
Шаг 2:  Перевести все значения в de.json
Шаг 3:  Обновить meta.lang → "de", meta.locale → "de_DE"
Шаг 4:  npm run build
Шаг 5:  Готово. Деплоим dist/
```

**Что происходит автоматически:**
- Каталог `/de/` создан со всеми страницами
- `hreflang` обновлён на ВСЕХ страницах ВСЕХ языков
- Переключатель языка включает DE на ВСЕХ страницах
- Если языков стало >2, переключатель стал dropdown-меню
- Privacy-страница: `/de/privacy.html` (стандартный URL для нового языка)
- Пути к CSS/JS корректные (`../css/style.css`)

**Ручная работа: НОЛЬ** (кроме самого перевода).

---

## 7. Маппинг ссылок (старые → новые)

| Старый URL | Новый URL | Примечание |
|------------|-----------|------------|
| `/index.html` (RU) | `/ru/index.html` | Контент переехал |
| `/floorisplan.html` (RU) | `/ru/floorisplan.html` | Контент переехал |
| `/contact.html` (RU) | `/ru/contact.html` | Контент переехал |
| — | `/index.html` (EN) | Новая страница |
| — | `/floorisplan.html` (EN) | Новая страница |
| — | `/contact.html` (EN) | Новая страница |
| `/privacy.html` (RU) | `/privacy.html` (RU) | **БЕЗ ИЗМЕНЕНИЙ** |
| `/privacy-en.html` (EN) | `/privacy-en.html` (EN) | **БЕЗ ИЗМЕНЕНИЙ** |

---

## 8. Чеклист перед деплоем

### Функциональность
- [ ] `npm run build` завершается без ошибок
- [ ] Все страницы сгенерированы для всех языков
- [ ] `privacy.html` доступен по прежнему URL
- [ ] `privacy-en.html` доступен по прежнему URL
- [ ] Переключатель языка работает на всех страницах
- [ ] Навигация ведёт на страницы нужного языка
- [ ] Мобильное бургер-меню работает
- [ ] Анимации `fade-in` работают
- [ ] Email-обфускация работает
- [ ] Форма на контактной странице работает

### SEO
- [ ] `hreflang` на всех страницах (включая privacy)
- [ ] `og:locale` корректен
- [ ] `<link rel="canonical">` на всех страницах
- [ ] `<html lang="...">` соответствует языку

### Пути и ресурсы
- [ ] CSS загружается на всех страницах (включая подкаталоги)
- [ ] JS загружается на всех страницах
- [ ] Favicon отображается
- [ ] Все изображения загружаются

### Мобильные устройства
- [ ] Проверить на мобильных (Android, iOS)
- [ ] Samsung Internet / WebView — privacy-страницы

---

## 9. Порядок выполнения

```
Фаза 1 → Фаза 2 → Фаза 3 → Фаза 4 → Фаза 5 → Фаза 6
  │          │          │          │          │         │
Build     Шаблоны    English   Switcher    SEO     Deploy
infra    из текущих  перевод    языка    hreflang
          страниц
```

### Оценка объёма

| Фаза | Новые файлы | Описание |
|------|-------------|----------|
| 1 | `package.json`, `build.js`, `build-config.js` | Инфраструктура |
| 2 | `src/i18n/ru.json`, 4 шаблона, 3 partials | Шаблонизация |
| 3 | `src/i18n/en.json` | Перевод |
| 4 | Правки в шаблонах и CSS | Переключатель |
| 5 | Правки в build.js | Автогенерация SEO |
| 6 | Правки в конфиге хостинга | Деплой |

---

## 10. Сравнение: было → стало

| Аспект | Было | Стало |
|--------|------|-------|
| Добавить язык | Скопировать все HTML, перевести, обновить hreflang везде | Создать 1 JSON, `npm run build` |
| Изменить хедер | Править в каждом HTML | Изменить 1 partial |
| Добавить страницу | Создать по файлу на каждый язык | 1 шаблон + ключи в JSON |
| Обновить hreflang | Руками в каждом HTML | Автоматически |
| Переключатель языка | Ручная правка HTML | Автогенерация |
| 10 языков × 4 страницы | 40 HTML-файлов руками | 4 шаблона + 10 JSON |
| Ошибка в футере | Исправить в 40 файлах | Исправить в 1 partial |
