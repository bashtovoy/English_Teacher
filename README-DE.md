# Voice Over Translation

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

[firemonkey-how-to]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BDE%5D-FAQ
[user-js-and-css-how-to]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BDE%5D-FAQ
[devmode-enable]: https://www.tampermonkey.net/faq.php#Q209
[opera-search-results-access]: https://help.opera.com/en/extensions/content-scripts/
[vot-faq]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BDE%5D-FAQ
[vot-supported-sites]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BDE%5D-Supported-sites
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

[![en][badge-en]][vot-readme-en]
[![de][badge-de]][vot-readme-de]
[![fr][badge-fr]][vot-readme-fr]
[![uk][badge-uk]][vot-readme-uk]
[![ru][badge-ru]][vot-readme-ru]

> [!CAUTION]
> Bevor Sie Issues erstellen, empfehlen wir dringend, den [FAQ][vot-faq]-Bereich und die bestehenden [Issues][vot-issues] zu lesen.

> Alle Rechte an der Originalsoftware gehören ihren jeweiligen Eigentümern. Diese Erweiterung ist nicht mit den ursprünglichen Rechteinhabern verbunden.

Die Sprachausgabe-Übersetzung ist jetzt auch außerhalb des [Yandex Browser][yabrowser-link] verfügbar. Dank des Teams von **[Yandex.Translate][yatranslate-link]** und allen [Mitwirkenden][contributors-link], die zur Verbesserung dieses Projekts beitragen.

## Installation der Erweiterung:

> [!WARNING]
> **Wichtig für Tampermonkey 5.2+ (MV3) Benutzer:**
> In **Chromium**-basierten Browsern (Chrome, Edge, Brave, Vivaldi usw.) müssen Sie:
> 1. Die Erweiterungsseite öffnen (`chrome://extensions`) und den **„Entwicklermodus"** aktivieren (Details in der [Tampermonkey-Dokumentation][devmode-enable]).
> 2. Wenn Sie **Chromium 138+** verwenden, öffnen Sie die Erweiterungsdetails und aktivieren **„Benutzerskripte zulassen"**.
>
> **Für Opera-Benutzer:**
> 1. Verwenden Sie **[Violentmonkey][violentmonkey-opera]** statt Tampermonkey.
> 2. Aktivieren Sie in den Erweiterungseinstellungen **„Zugriff auf Suchseitenergebnisse zulassen"** (Opera-Anleitung: [wo Sie diese Einstellung finden][opera-search-results-access]), sonst funktioniert das Skript nicht.

1. Installieren Sie einen Userscript-Manager: **[Tampermonkey][tampermonkey-link]** (oder [Violentmonkey][violentmonkey-opera] für Opera)
2. **[Skript installieren][vot-dist]**

### Native Erweiterung für Chrome / Chromium installieren

1. Öffnen Sie [Releases][vot-releases] und laden Sie `vot-extension-chrome-<version>.zip` herunter
2. Öffnen Sie Ihre Erweiterungsseite:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
3. Aktivieren Sie den **„Entwicklermodus"**
4. Ziehen Sie die heruntergeladene `.zip`-Datei auf die Erweiterungsseite

### Native Erweiterung für Firefox installieren

1. Öffnen Sie [Releases][vot-releases], klicken Sie auf `vot-extension-firefox-<version>.xpi` und bestätigen Sie die Installation in Firefox

## Liste der Funktionen:

- Übersetzen von Videos ins Russische, Englische oder Kasachische von [unterstützten Quellsprachen][vot-langs]
- Automatische Videoübersetzung beim Öffnen
- Automatische Aktivierung von Untertiteln beim Öffnen
- Intelligente Untertitel-Anordnung, die Zeilenbreite und Textgröße an die Player-Abmessungen anpasst
- Anzeige von KI-generierten Untertiteln
- Anzeige von Website-bereitgestellten Untertiteln (z. B. automatisch übersetzte YouTube-Untertitel)
- Untertitel in `.srt`, `.vtt` und `.json`-Formaten speichern
- Übersetzte Audiodatei als `.mp3` speichern
- Separate Lautstärkeregler für Original- und Übersetzungston
- Adaptive Lautstärke: Originalton wird gedämpft, wenn die Übersetzung läuft
- Übersetzung für Videos in Ihrer Muttersprache begrenzen (Sprache kann im Menü ausgewählt werden)
- Übersetzungslautstärke mit Videolautstärke verknüpfen
- Übersetzung aus ausgewählten Sprachen begrenzen
- Tastenkombinationen für Übersetzung und Untertitel (einschließlich Tastenkombinationen)
- Einfache Anpassung des Untertitel-Erscheinungsbilds
- Wort-für-Wort-Übersetzung direkt in den Untertiteln

### Nützliche Links:

1. JavaScript-Bibliothek (vot.js): **[Link][votjs-link]**
2. Terminal-Version (vot-cli): **[Link][vot-cli-link]**
3. Wiki: **[Link][vot-wiki]**

## Hinweis:

1. Es wird empfohlen, die automatische Wiedergabe für Audio/Video zuzulassen, um Laufzeitfehler bei der Wiedergabe zu vermeiden
2. Die Erweiterung kann keine Videos übersetzen, die länger als 4 Stunden sind (API-Beschränkung des Übersetzers)
3. Für einen stabilen Audio-Download verwenden Sie aktuelle und unterstützte Userscript-Manager (z. B. Tampermonkey oder Violentmonkey)

## Liste der unterstützten Websites:

Die vollständige Liste der unterstützten Websites und ihre spezifischen Einschränkungen finden Sie im **[Wiki][vot-supported-sites]**.

### Unsere Domains:

Diese Domains können in den Erweiterungseinstellungen festgelegt werden (hier sind nur die Domains aufgeführt, die ohne Neukompilierung geändert werden können):

#### Proxy-Server

Erforderlich für die Weiterleitung von Anfragen, wenn der direkte Zugriff auf Yandex-Server nicht verfügbar ist.

- [vot-worker.toil.cc][vot-balancer] (Load Balancer zwischen Proxy-Servern)
- [vot-worker-s1.toil.cc][vot-worker]
- [vot-worker-s2.toil.cc][vot-worker]
- [vot.deno.dev][vot-worker]
- [vot-new.toil-dump.workers.dev][vot-worker] (⚠️ funktioniert nicht in Russland)

#### Media Proxy-Server

Erforderlich für die Weiterleitung von `.m3u8`-Dateien und die Korrektur der Übersetzung für indirekte Links zu `.mp4` oder `.webm`.

- [media-proxy.toil.cc][media-proxy]

#### VOT-Backend

Erforderlich für die Übersetzung zusätzlicher Websites, die das `.m3u8` oder `.mpd`-Videoformat verwenden.

- [vot.toil.cc][vot-backend]

#### VOT Status und Statistiken

Überprüfen Sie hier den aktuellen Status und die Betriebszeit aller Server:

- [votstatus.toil.cc][vot-status]

Überprüfen Sie die Nutzungsstatistiken der Proxy-Server (alle 5 Minuten aktualisiert):

- [votstats.toil.cc][vot-stats]

## Wie erstellt man eine Erweiterung?

1. Installieren Sie [Node.js 22+][nodejs-link] / [Bun.sh][bun-link]
2. Installieren Sie Abhängigkeiten:

NPM:

```bash
npm install
```

Bun:

```bash
bun install
```

3. Build-Ziele:

   3.0. Userscript (regulärer Build):

   ```bash
   npm run build
   ```

   3.1. Userscript (minifizierter Build):

   ```bash
   npm run build:min
   ```

   3.2. Userscript (beide Varianten):

   ```bash
   npm run build:all
   ```

   3.3. Native Chrome/Firefox Erweiterungspakete:

   ```bash
   npm run build:ext
   ```

   3.4. Entwicklung Userscript Build mit Sourcemaps:

   ```bash
   npm run build:dev
   ```

Userscript-Artefakte werden in `dist/` generiert, native Erweiterungsartefakte in `dist-ext/`.

## Anpassung des Erscheinungsbilds:

Die Erweiterung unterstützt die Anpassung des Erscheinungsbilds über Stylus, Stylish und ähnliche Tools.

Beispiel für Stilüberschreibung:

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

## Getestete Browser und Loader

Diese Liste wird nur selten aktualisiert, ist aber in der Regel noch relevant.

Die Erweiterung wurde in folgenden Browsern getestet:

| Status | Browser                   | Min. Browserversion | Plattform              | Erweiterung                                                                                  |
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

Die Min. Browserversion ist die niedrigste Version, auf der die Erweiterung getestet wurde. Dies garantiert kein Verhalten bei älteren Versionen. Bitte beachten Sie, dass wir **keine** Unterstützung oder Fehlerbehebung für veraltete Browser anbieten.

Um das Skript in Tampermonkey (MV3) zu aktivieren, müssen Sie den [„Entwicklermodus" aktivieren][devmode-enable].

Getestet in folgenden Userscript-Manager-Erweiterungen:

| Status                    | Browser | Erweiterung                                       |
| ------------------------- | ------- | ------------------------------------------------ |
| ✅                        | Beliebig| [Tampermonkey Legacy (MV2)][tampermonkey-link]  |
| ✅                        | Opera   | [Violentmonkey][violentmonkey-opera]            |
| ✅                        | Chrome  | [Tampermonkey (MV3)][tampermonkey-link]         |
| ⚠️¹                       | Safari  | [Userscripts][userscripts-safari]               |
| ✅                        | Beliebig| [Violentmonkey][violetmonkey-link]              |
| ❔                        | Beliebig| [AdGuard Userscripts][adguard-userscripts]      |
| [Installationsanleitung][firemonkey-how-to] | Firefox | [Firemonkey][firemonkey-link]                   |
| ✅                        | Firefox | [Greasemonkey][greasemonkey-link]               |
| [Installationsanleitung][user-js-and-css-how-to]¹ | Beliebig | [User Javascript and CSS][user-js-and-css-link] |

¹ - Funktioniert im Proxy-Modus. Das Deaktivieren der Funktion „Audio-Download verwenden" kann zu Problemen mit neu angeforderten Übersetzungen führen.

## Contributing

Bitte lesen Sie den [Beitragsleitfaden](./CONTRIBUTING.md).

![example btn](https://github.com/ilyhalight/voice-over-translation/blob/master/img/example_en.png "btn")

> Basierend auf dem Projekt [sodapng/voice-over-translation](https://github.com/sodapng/voice-over-translation) (Lizenz MIT)