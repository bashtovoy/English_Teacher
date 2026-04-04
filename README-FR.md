# Traduction Voix Off

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

[firemonkey-how-to]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BFR%5D-FAQ
[user-js-and-css-how-to]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BFR%5D-FAQ
[devmode-enable]: https://www.tampermonkey.net/faq.php#Q209
[opera-search-results-access]: https://help.opera.com/en/extensions/content-scripts/
[vot-faq]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BFR%5D-FAQ
[vot-supported-sites]: https://github.com/ilyhalight/voice-over-translation/wiki/%5BFR%5D-Supported-sites
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
> Avant de créer des Issues, nous vous recommandons fortement de lire la section [FAQ][vot-faq] et les [Issues][vot-issues] existantes.

> Tous les droits sur le logiciel original appartiennent à leurs propriétaires respectifs. Cette extension n'est pas affiliée aux détenteurs des droits originaux.

La traduction vocale est désormais disponible au-delà du [Yandex Browser][yabrowser-link]. Merci à l'équipe **[Yandex.Translate][yatranslate-link]** et à tous les [contributeurs][contributors-link] qui aident à améliorer ce projet.

## Installation de l'extension :

> [!WARNING]
> **Important pour les utilisateurs de Tampermonkey 5.2+ (MV3) :**
> Dans les navigateurs basés sur **Chromium** (Chrome, Edge, Brave, Vivaldi, etc.) vous devez :
> 1. Ouvrir la page des extensions (`chrome://extensions`) et activer le **« Mode développeur »** (détails dans la [documentation Tampermonkey][devmode-enable]).
> 2. Si vous utilisez **Chromium 138+**, ouvrez les détails de l'extension et activez **« Autoriser les scripts utilisateur »**.
>
> **Pour les utilisateurs d'Opera :**
> 1. Utilisez **[Violentmonkey][violentmonkey-opera]** au lieu de Tampermonkey.
> 2. Dans les paramètres de l'extension, activez **« Autoriser l'accès aux résultats de la page de recherche »** (guide Opera : [où trouver ce paramètre][opera-search-results-access]), sinon le script ne fonctionnera pas.

1. Installez un gestionnaire de userscripts : **[Tampermonkey][tampermonkey-link]** (ou [Violentmonkey][violentmonkey-opera] pour Opera)
2. **[Installer le script][vot-dist]**

### Installer l'extension native pour Chrome / Chromium

1. Ouvrez [Releases][vot-releases] et téléchargez `vot-extension-chrome-<version>.zip`
2. Ouvrez votre page d'extensions :
   - Chrome : `chrome://extensions`
   - Edge : `edge://extensions`
   - Brave : `brave://extensions`
   - Opera : `opera://extensions`
3. Activez le **« Mode développeur »**
4. Glissez-déposez le fichier `.zip` téléchargé sur la page des extensions

### Installer l'extension native pour Firefox

1. Ouvrez [Releases][vot-releases], cliquez sur `vot-extension-firefox-<version>.xpi` et confirmez l'installation dans Firefox

## Liste des fonctionnalités :

- Traduire des vidéos en russe, anglais ou kazakh à partir des [langues sources prises en charge][vot-langs]
- Traduction automatique des vidéos à l'ouverture
- Activation automatique des sous-titres à l'ouverture
- Disposition intelligente des sous-titres qui adapte la largeur des lignes et la taille du texte aux dimensions du lecteur
- Affichage des sous-titres générés par IA
- Affichage des sous-titres fournis par le site (par exemple, sous-titres YouTube traduits automatiquement)
- Sauvegarder les sous-titres aux formats `.srt`, `.vtt` et `.json`
- Sauvegarder l'audio traduit en `.mp3`
- Curseurs de volume séparés pour l'audio original et traduit
- Volume adaptatif : atténuation de l'audio original pendant la lecture de la traduction
- Limiter la traduction pour les vidéos dans votre langue maternelle (la langue peut être sélectionnée dans le menu)
- Lier le volume de traduction au volume de la vidéo
- Limiter la traduction à partir des langues sélectionnées
- Raccourcis clavier pour la traduction et les sous-titres (y compris les combinaisons de touches)
- Personnalisation facile de l'apparence des sous-titres
- Traduction mot à mot directement dans les sous-titres

### Liens utiles :

1. Bibliothèque JavaScript (vot.js) : **[Lien][votjs-link]**
2. Version terminal (vot-cli) : **[Lien][vot-cli-link]**
3. Wiki : **[Lien][vot-wiki]**

## Remarque :

1. Il est recommandé d'autoriser la lecture automatique pour l'audio/vidéo afin d'éviter les erreurs de lecture
2. L'extension ne peut pas traduire des vidéos de plus de 4 heures (limitation de l'API du traducteur)
3. Pour un flux de téléchargement audio stable, utilisez des gestionnaires de userscripts à jour et pris en charge (par exemple, Tampermonkey ou Violentmonkey)

## Liste des sites pris en charge :

Vous pouvez trouver la liste complète des sites web pris en charge et leurs limitations spécifiques dans le **[wiki][vot-supported-sites]**.

### Nos domaines :

Ces domaines peuvent être définis dans les paramètres de l'extension (seuls les domaines qui peuvent être modifiés sans reconstruction sont listés ici) :

#### Serveur Proxy

Nécessaire pour le proxy des requêtes lorsque l'accès direct aux serveurs Yandex n'est pas disponible.

- [vot-worker.toil.cc][vot-balancer] (Équilibreur de charge entre les serveurs proxy)
- [vot-worker-s1.toil.cc][vot-worker]
- [vot-worker-s2.toil.cc][vot-worker]
- [vot.deno.dev][vot-worker]
- [vot-new.toil-dump.workers.dev][vot-worker] (⚠️ ne fonctionne pas en Russie)

#### Serveur Proxy Média

Nécessaire pour le proxy des fichiers `.m3u8` et la correction de la traduction pour les liens indirects vers `.mp4` ou `.webm`.

- [media-proxy.toil.cc][media-proxy]

#### VOT-Backend

Nécessaire pour traduire des sites supplémentaires utilisant le format vidéo `.m3u8` ou `.mpd`.

- [vot.toil.cc][vot-backend]

#### VOT Status et Stats

Vérifiez le statut actuel et le temps de fonctionnement de tous les serveurs ici :

- [votstatus.toil.cc][vot-status]

Vérifiez les statistiques d'utilisation du serveur proxy (mises à jour toutes les 5 minutes) :

- [votstats.toil.cc][vot-stats]

## Comment construire une extension ?

1. Installez [Node.js 22+][nodejs-link] / [Bun.sh][bun-link]
2. Installez les dépendances :

NPM :

```bash
npm install
```

Bun :

```bash
bun install
```

3. Cibles de construction :

   3.0. Userscript (construction normale) :

   ```bash
   npm run build
   ```

   3.1. Userscript (construction minifiée) :

   ```bash
   npm run build:min
   ```

   3.2. Userscript (les deux variantes) :

   ```bash
   npm run build:all
   ```

   3.3. Packages d'extension native Chrome/Firefox :

   ```bash
   npm run build:ext
   ```

   3.4. Construction de développement userscript avec sourcemaps :

   ```bash
   npm run build:dev
   ```

Les artefacts userscript sont générés dans `dist/`, les artefacts d'extension native dans `dist-ext/`.

## Personnalisation de l'apparence :

L'extension prend en charge la personnalisation de l'apparence via Stylus, Stylish et outils similaires.

Exemple de remplacement de style :

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

## Navigateurs et chargeurs testés

Cette liste est mise à jour rarement mais reste généralement pertinente.

L'extension a été testée dans les navigateurs suivants :

| Statut | Navigateur                | Version min. du navigateur | Plateforme            | Extension                                                                                    |
| ------ | ------------------------- | -------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| ✅     | Firefox Developer Edition | v106                       | Windows               | Tampermonkey (MV2), FireMonkey, Violentmonkey, Greasemonkey                                  |
| ✅     | Firefox                   | v116.0.2                   | Windows, Linux, Android | Tampermonkey (MV2), Violentmonkey                                                            |
| ✅     | Firefox Nightly           | v118.0a1                   | Windows, Android      | Tampermonkey (MV2)                                                                           |
| ✅     | LibreWolf                 | v100.0.2-1                 | Windows               | Tampermonkey (MV2)                                                                           |
| ✅     | Brave                     | v1.46                      | Windows               | Tampermonkey (MV2)                                                                           |
| ✅     | MS Edge                   | v106.0.1370.34             | Windows, Linux        | Tampermonkey (MV2)                                                                           |
| ✅     | Cent Browser              | v4.3.9.248                 | Windows               | Tampermonkey (MV2)                                                                           |
| ✅     | Cent Browser Beta         | v5.0.1002.182              | Windows               | Tampermonkey (MV2)                                                                           |
| ✅     | Google Chrome             | v106                       | Windows, MacOS, Linux | Tampermonkey (MV2), Tampermonkey (MV3), Violentmonkey, User Javascript and CSS |
| ✅     | Opera GX (LVL4)           | core91                     | Windows               | Violentmonkey                                                                                |
| ✅     | Opera GX (LVL5)           | core109                    | Windows               | Violentmonkey                                                                                |
| ✅     | Opera                     | v92.0.4561.43              | Windows               | Violentmonkey                                                                                |
| ✅     | Vivaldi                   | 5.7.2921.63                | Windows, Linux        | Tampermonkey (MV2)                                                                           |
| ✅     | Safari                    | v15.6.1                    | MacOS, iOS            | Userscripts, Tampermonkey                                                                    |
| ✅     | Kiwi Browser              | v116.0.5845.61             | Android               | Tampermonkey (MV2)                                                                           |
| ✅     | Yandex Browser            | v24.4                      | Windows               | Tampermonkey (MV2), Tampermonkey (MV3)                                                       |
| ✅     | Arc                       | v1.6.1                     | Windows               | Tampermonkey (MV3)                                                                           |
| ✅     | Incognition               | v4.1.1.0 (v125)            | Windows               | Tampermonkey (MV3), Tampermonkey (MV2)                                                       |

La version min. du navigateur est la version la plus basse sur laquelle l'extension a été testée. Cela ne garantit pas le comportement sur les versions plus anciennes. Veuillez noter que nous **ne** prenons **pas** en charge ou ne corrigeons pas les problèmes dans les navigateurs obsolètes.

Pour activer le script dans Tampermonkey (MV3), vous devez [activer le « Mode développeur »][devmode-enable].

Testé dans les extensions de gestionnaire de userscripts suivantes :

| Statut                    | Navigateur | Extension                                       |
| ------------------------- | ---------- | ----------------------------------------------- |
| ✅                        | Tout       | [Tampermonkey Legacy (MV2)][tampermonkey-link]  |
| ✅                        | Opera      | [Violentmonkey][violentmonkey-opera]            |
| ✅                        | Chrome     | [Tampermonkey (MV3)][tampermonkey-link]         |
| ⚠️¹                       | Safari     | [Userscripts][userscripts-safari]               |
| ✅                        | Tout       | [Violentmonkey][violetmonkey-link]              |
| ❔                        | Tout       | [AdGuard Userscripts][adguard-userscripts]      |
| [Guide d'installation][firemonkey-how-to] | Firefox | [Firemonkey][firemonkey-link]                   |
| ✅                        | Firefox    | [Greasemonkey][greasemonkey-link]               |
| [Guide d'installation][user-js-and-css-how-to]¹ | Tout | [User Javascript and CSS][user-js-and-css-link] |

¹ - Fonctionne en mode proxy, la désactivation de la fonction « Utiliser le téléchargement audio » peut causer des problèmes avec les traductions nouvellement demandées.

## Contribuer

Veuillez vous référer au [guide de contribution](./CONTRIBUTING.md).

![example btn](https://github.com/ilyhalight/voice-over-translation/blob/master/img/example_en.png "btn")

> Basé sur le projet [sodapng/voice-over-translation](https://github.com/sodapng/voice-over-translation) (licence MIT)