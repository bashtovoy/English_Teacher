# Закадровий переклад відео

<!-- loaders links (website > github > store) -->

[tampermonkey-link]: https://www.tampermonkey.net/index.php
[violentmonkey-opera]: https://chrome.google.com/webstore/detail/violent-monkey/jinjaccalgkegednnccohejagnlnfdag
[userscripts-safari]: https://github.com/quoid/userscripts
[violetmonkey-link]: https://violentmonkey.github.io
[adguard-userscripts]: https://kb.adguard.com/en/general/userscripts#supported-apps
[firemonkey-link]: https://erosman.github.io/firemonkey/
[greasemonkey-link]: https://github.com/greasemonkey/greasemonkey
[user-js-and-css-link]: https://tenrabbits.github.io/user-js-css-docs/

<!-- FAQs / Wiki -->

[firemonkey-how-to]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BUK%5D-FAQ
[user-js-and-css-how-to]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BUK%5D-FAQ
[devmode-enable]: https://www.tampermonkey.net/faq.php#Q209
[opera-search-results-access]: https://help.opera.com/en/extensions/content-scripts/
[vot-faq]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BUK%5D-FAQ
[vot-supported-sites]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BUK%5D-Supported-sites
[vot-wiki]: https://github.com/ilyhalight/voice-over-translation/wiki

<!-- Our servers -->

[vot-balancer]: https://vot-worker.toil.cc/health
[vot-worker]: https://github.com/FOSWLY/vot-worker
[media-proxy]: https://github.com/FOSWLY/media-proxy
[vot-backend]: https://github.com/FOSWLY/vot-backend
[vot-status]: https://votstatus.toil.cc
[vot-stats]: https://votstats.toil.cc

<!-- Install / Build -->

[vot-dist]: https://raw.githubusercontent.com/ilyhalight/voice-over-translation/master/dist/vot.user.js
[vot-releases]: https://github.com/ilyhalight/voice-over-translation/releases
[nodejs-link]: https://nodejs.org
[bun-link]: https://bun.sh/

<!-- Badges -->

[badge-en]: https://img.shields.io/badge/lang-English-white
[badge-ru]: https://img.shields.io/badge/%D1%8F%D0%B7%D1%8B%D0%BA-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-white
[badge-de]: https://img.shields.io/badge/Sprache-Deutsch-white
[badge-uk]: https://img.shields.io/badge/%D0%BC%D0%BE%D0%B2%D0%B0-%D0%A3%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D1%81%D1%8C%D0%BA%D0%B0-white
[badge-fr]: https://img.shields.io/badge/langue-Fran%C3%A7ais-white

<!-- Other -->

[vot-readme-ru]: README-RU.md
[vot-readme-en]: README-EN.md
[vot-readme-de]: README-DE.md
[vot-readme-uk]: README-UK.md
[vot-readme-fr]: README-FR.md
[vot-langs]: LANG_SUPPORT.md
[vot-issues]: https://github.com/ilyhalight/voice-over-translation/issues
[votjs-link]: https://github.com/FOSWLY/vot.js
[vot-cli-link]: https://github.com/FOSWLY/vot-cli
[yabrowser-link]: https://browser.yandex.com
[yatranslate-link]: https://translate.yandex.ru/
[contributors-link]: https://github.com/ilyhalight/voice-over-translation/graphs/contributors

<!-- Content -->

[![ru][badge-ru]][vot-readme-ru]
[![en][badge-en]][vot-readme-en]
[![de][badge-de]][vot-readme-de]
[![uk][badge-uk]][vot-readme-uk]
[![fr][badge-fr]][vot-readme-fr]

> [!CAUTION]
> Перед створенням Issues наполегливо рекомендуємо ознайомитися з розділом [FAQ][vot-faq] та вже існуючими [Issues][vot-issues].

> Усі права на оригінальне програмне забезпечення належать їхнім відповідним власникам. Це розширення не пов'язане з оригінальними правовласниками.

Закадровий переклад відео тепер доступний не лише в [Yandex Browser][yabrowser-link]. Велика подяка команді **[Yandex.Translate][yatranslate-link]** та всім [контриб'юторам][contributors-link], які допомагають покращувати цей проєкт.

## Встановлення розширення:

> [!WARNING]
> **Важливо для користувачів Tampermonkey 5.2+ (MV3):**
> У браузерах на рушії **Chromium** (Chrome, Edge, Brave, Vivaldi тощо) необхідно:
> 1. Відкрити сторінку розширень (`chrome://extensions`) та увімкнути **«Режим розробника»** (деталі в [документації Tampermonkey][devmode-enable]).
> 2. Якщо рушій **Chromium версії 138+**, у «Відомостях» розширення увімкнути **«Дозволити користувацькі скрипти»**.
>
> **Користувачам Opera:**
> 1. Використовуйте **[Violentmonkey][violentmonkey-opera]** замість Tampermonkey.
> 2. У налаштуваннях розширення обов'язково увімкніть **«Дозволити доступ до результатів на сторінці пошуку»** (гайд від Opera: [як знайти це налаштування][opera-search-results-access]), інакше скрипт не працюватиме.

1. Встановіть завантажувач юзерскриптів: **[Tampermonkey][tampermonkey-link]** (або [Violentmonkey][violentmonkey-opera] для Opera)
2. **[«Встановити скрипт»][vot-dist]**

### Встановлення нативного розширення для Chrome / Chromium

1. Відкрийте [Releases][vot-releases] та завантажте файл `vot-extension-chrome-<версія>.zip`
2. Відкрийте сторінку розширень:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
3. Увімкніть **«Режим розробника»**
4. Перетягніть завантажений `.zip`-файл на сторінку розширень

### Встановлення нативного розширення для Firefox

1. Відкрийте [Releases][vot-releases], натисніть на `vot-extension-firefox-<версія>.xpi` та підтвердьте встановлення у Firefox

## Список функціоналу:

- Переклад відео на російську, англійську або казахську з [підтримуваних мов][vot-langs]
- Автоматичний переклад відео при відкритті
- Автоматичне увімкнення субтитрів при відкритті
- Розумне розташування субтитрів: адаптація довжини рядків та розміру тексту під розмір плеєра
- Відображення субтитрів, згенерованих нейромережею
- Відображення субтитрів з сайту (наприклад, автоперекладені субтитри YouTube)
- Збереження субтитрів у форматах `.srt`, `.vtt`, `.json`
- Збереження аудіодоріжки перекладу у форматі `.mp3`
- Окремі повзунки гучності для оригінального та перекладеного звуку
- Адаптивна гучність: приглушення оригіналу, коли звучить переклад
- Обмеження перекладу відео рідною мовою (мову можна обрати в меню)
- Синхронізація гучності перекладу з гучністю відео
- Обмеження перекладу з обраних мов
- Гарячі клавіші для перекладу та керування субтитрами (включаючи комбінації клавіш)
- Просте налаштування зовнішнього вигляду субтитрів
- Відображення перекладу окремих слів у субтитрах

### Корисні посилання:

1. Бібліотека для JS (vot.js): **[Посилання][votjs-link]**
2. Версія для терміналу (vot-cli): **[Посилання][vot-cli-link]**
3. Вікі: **[Посилання][vot-wiki]**

## Примітка:

1. Рекомендується дозволити автовідтворення «аудіо та відео», щоб уникнути помилок під час роботи розширення
2. Розширення не може перекладати відео тривалістю понад 4 години (обмеження API перекладача)
3. Для стабільної роботи завантаження аудіо використовуйте актуальні та підтримувані завантажувачі користувацьких скриптів (наприклад, Tampermonkey або Violentmonkey)

## Список підтримуваних сайтів:

Повний список підтримуваних веб-сайтів та обмеження, пов'язані з їхньою підтримкою, доступні у **[вікі][vot-supported-sites]**.

### Наші домени:

Ці домени можна змінювати в налаштуваннях розширення без пересборки:

#### Proxy-сервер

Потрібен для проксіювання запитів, якщо прямий доступ до серверів Яндекса недоступний.

- [vot-worker.toil.cc][vot-balancer] (Балансувальник між проксі-серверами)
- [vot-worker-s1.toil.cc][vot-worker]
- [vot-worker-s2.toil.cc][vot-worker]
- [vot.deno.dev][vot-worker]
- [vot-new.toil-dump.workers.dev][vot-worker] (⚠️ не працює в Росії)

#### Media Proxy-сервер

Потрібен для проксіювання `.m3u8`-файлів та коректної обробки непрямих посилань на `.mp4` та `.webm`.

- [media-proxy.toil.cc][media-proxy]

#### VOT-Backend

Потрібен для перекладу додаткових сайтів з форматами відео, які не підтримуються серверами Яндекса напряму.

- [vot.toil.cc][vot-backend]

#### VOT Status and Stats

Перевірити поточний статус та аптайм усіх серверів можна тут:

- [votstatus.toil.cc][vot-status]

Перевірити статистику роботи проксі-серверів (оновлюється раз на 5 хвилин):

- [votstats.toil.cc][vot-stats]

## Як зібрати розширення?

1. Встановіть [Node.js 22+][nodejs-link] / [Bun.sh][bun-link]
2. Встановіть залежності:

NPM:

```bash
npm install
```

Bun:

```bash
bun install
```

3. Збірка розширення:

   3.0. Userscript (звичайна збірка):

   ```bash
   npm run build
   ```

   3.1. Userscript (мініфікована збірка):

   ```bash
   npm run build:min
   ```

   3.2. Userscript (обидві версії поспіль):

   ```bash
   npm run build:all
   ```

   3.3. Нативні розширення Chrome/Firefox:

   ```bash
   npm run build:ext
   ```

   3.4. Dev-збірка userscript з sourcemap:

   ```bash
   npm run build:dev
   ```

Артефакти userscript потрапляють у `dist/`, збірка нативних розширень — у `dist-ext/`.

## Кастомізація зовнішнього вигляду:

Розширення підтримує кастомізацію зовнішнього вигляду за допомогою Stylus, Stylish та інших подібних розширень.

Приклад зміни стилів:

```css
/* ==UserStyle==
@name         VOT-styles
@version      16.09.2023
@namespace    vot-styles
@description  LLL
@author       Toil
@license      No License
==/UserStyle== */

:root {
  --vot-font-family: "Roboto", "Segoe UI", BlinkMacSystemFont, system-ui,
    -apple-system;

  --vot-primary-rgb: 139, 180, 245;
  --vot-onprimary-rgb: 32, 33, 36;
  --vot-surface-rgb: 32, 33, 36;
  --vot-onsurface-rgb: 227, 227, 227;

  --vot-subtitles-color: rgb(var(--vot-onsurface-rgb, 227, 227, 227));
  --vot-subtitles-passed-color: rgb(var(--vot-primary-rgb, 33, 150, 243));
}
```

## Протестовані браузери та завантажувачі

Цей список оновлюється нечасто, але в більшості випадків залишається актуальним.

Розширення протестовано в наступних браузерах:

| Статус | Браузер                   | Мін. версія браузера | Платформа               | Розширення                                                                                   |
| ------ | ------------------------- | -------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| ✅     | Firefox Developer Edition | v106                 | Windows                 | Tampermonkey (MV2), FireMonkey, Violentmonkey, Greasemonkey                                  |
| ✅     | Firefox                   | v116.0.2             | Windows, Linux, Android | Tampermonkey (MV2), Violentmonkey                                                            |
| ✅     | Firefox Nightly           | v118.0a1             | Windows, Android        | Tampermonkey (MV2)                                                                           |
| ✅     | LibreWolf                 | v100.0.2-1           | Windows                 | Tampermonkey (MV2)                                                                           |
| ✅     | Brave                     | v1.46                | Windows                 | Tampermonkey (MV2)                                                                           |
| ✅     | MS Edge                   | v106.0.1370.34       | Windows, Linux          | Tampermonkey (MV2)                                                                           |
| ✅     | Cent Browser              | v4.3.9.248           | Windows                 | Tampermonkey (MV2)                                                                           |
| ✅     | Cent Browser Beta         | v5.0.1002.182        | Windows                 | Tampermonkey (MV2)                                                                           |
| ✅     | Google Chrome             | v106                 | Windows, MacOS, Linux   | Tampermonkey (MV2), Tampermonkey (MV3), Violentmonkey, User Javascript and CSS |
| ✅     | Opera GX (LVL4)           | core91               | Windows                 | Violentmonkey                                                                                |
| ✅     | Opera GX (LVL5)           | core109              | Windows                 | Violentmonkey                                                                                |
| ✅     | Opera                     | v92.0.4561.43        | Windows                 | Violentmonkey                                                                                |
| ✅     | Vivaldi                   | 5.7.2921.63          | Windows, Linux          | Tampermonkey (MV2)                                                                           |
| ✅     | Safari                    | v15.6.1              | MacOS, iOS              | Userscripts, Tampermonkey                                                                    |
| ✅     | Kiwi Browser              | v116.0.5845.61       | Android                 | Tampermonkey (MV2)                                                                           |
| ✅     | Yandex Browser            | v24.4                | Windows                 | Tampermonkey (MV2), Tampermonkey (MV3)                                                       |
| ✅     | Arc                       | v1.6.1               | Windows                 | Tampermonkey (MV3)                                                                           |
| ✅     | Incognition               | v4.1.1.0 (v125)      | Windows                 | Tampermonkey (MV3), Tampermonkey (MV2)                                                       |

Мін. версія браузера — це мінімальна версія, на якій розширення було протестовано. Це не означає, що воно не запуститься в старіших версіях. Зверніть увагу, що підтримкою та виправленням помилок у застарілих браузерах ми **не займаємося**.

Для активації скрипта в Tampermonkey (MV3) необхідно [увімкнути «Режим розробника»][devmode-enable].

Розширення протестовано в наступних завантажувачах юзерскриптів:

| Статус                    | Браузер | Розширення                                       |
| ------------------------- | ------- | ------------------------------------------------ |
| ✅                        | Будь-який| [Tampermonkey Legacy (MV2)][tampermonkey-link]  |
| ✅                        | Opera   | [Violentmonkey][violentmonkey-opera]            |
| ✅                        | Chrome  | [Tampermonkey (MV3)][tampermonkey-link]         |
| ⚠️¹                       | Safari  | [Userscripts][userscripts-safari]               |
| ✅                        | Будь-який| [Violentmonkey][violetmonkey-link]              |
| ❔                        | Будь-який| [AdGuard Userscripts][adguard-userscripts]      |
| [Гайд з встановлення][firemonkey-how-to] | Firefox | [Firemonkey][firemonkey-link]                   |
| ✅                        | Firefox | [Greasemonkey][greasemonkey-link]               |
| [Гайд з встановлення][user-js-and-css-how-to]¹ | Будь-який | [User Javascript and CSS][user-js-and-css-link] |

¹ - Працює в режимі проксіювання, вимкнення функції «Використовувати завантаження аудіо» може призводити до проблем з перекладом нових відео.

## Contributing

Будь ласка, ознайомтеся з [гайдом для контриб'юторів](./CONTRIBUTING.md).

![example btn](https://github.com/ilyhalight/voice-over-translation/blob/master/img/example_en.png "btn")

> Засновано на проєкті [sodapng/voice-over-translation](https://github.com/sodapng/voice-over-translation) (ліцензія MIT)