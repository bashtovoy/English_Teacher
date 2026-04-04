# Architecture Documentation

This document describes the architecture of the Voice Over Translation (VOT) project, a browser extension that provides voice-over translation for videos from various streaming platforms.

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Core Components](#core-components)
- [Module Structure](#module-structure)
- [Data Flow](#data-flow)
- [Extension Architecture](#extension-architecture)
- [Build System](#build-system)

---

## Overview

Voice Over Translation is a TypeScript-based browser extension/userscript that:

1. Detects video elements on supported websites
2. Extracts video metadata and subtitles
3. Requests translation from Yandex Translate API
4. Downloads and plays translated audio
5. Displays translated subtitles
6. Provides a rich UI for configuration

### Key Technologies

- **TypeScript** - Primary language
- **Vite** - Build system
- **SASS** - Styling
- **WebAudio API** - Audio processing
- **GM_API** - Userscript API
- **Protobuf** - Binary protocol for API

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser/Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                   Bootstrap Layer                     │     │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │     │
│  │  │ VideoObserver│  │ IframeInter. │  │ RuntimeAct. │ │     │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │     │
│  └─────────┼────────────────┼─────────────────┼────────┘     │
│            │                │                 │               │
│  ┌─────────▼────────────────▼─────────────────▼────────┐     │
│  │              VideoHandler (Main Class)               │     │
│  │  ┌──────────────┐  ┌──────────────────────────┐     │     │
│  │  │UIManager     │  │TranslationOrchestrator   │     │     │
│  │  │              │  │  ┌────────────────┐     │     │     │
│  │  │- Button      │  │  │Transl. Handler │     │     │     │
│  │  │- Menu        │  │  └────────────────┘     │     │     │
│  │  │- Sliders     │  │  ┌────────────────┐     │     │     │
│  │  │- Subtitles   │  │  │CacheManager    │     │     │     │
│  │  └──────────────┘  │  └────────────────┘     │     │     │
│  │                    └──────────────────────────┘     │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │         Audio Controller                      │  │     │
│  │  │  - WebAudio API  - Volume Control             │  │     │
│  │  │  - AudioContext    - Adaptive Ducking         │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                  Subtitles System                     │     │
│  │  ┌──────────┐  ┌──────────────┐  ┌───────────────┐ │     │
│  │  │Segmenter │->│SmartLayout   │->│PositionCtrl   │ │     │
│  │  └──────────┘  └──────────────┘  └───────────────┘ │     │
│  │                    ┌──────────────┐                 │     │
│  │                    │Widget (UI)   │                 │     │
│  │                    └──────────────┘                 │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                  LangLearn Module                     │     │
│  │  - Word Translation  - Phrase Segmentation           │     │
│  │  - Audio Alignment   - Interactive Learning          │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    External Services                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │Yandex API   │  │VOT Worker    │  │Media Proxy      │     │
│  │- Translate  │  │(Cloudflare)  │  │(M3U8/MP4)       │     │
│  │- TTS        │  │- Load Balance│  │                 │     │
│  │- Subtitles  │  │- Failover    │  │                 │     │
│  └─────────────┘  └──────────────┘  └─────────────────┘     │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │VOT Backend  │  │Auth Server   │                          │
│  │(Custom sites)│  │(Yandex OAuth)│                          │
│  └─────────────┘  └──────────────┘                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Bootstrap Layer

The bootstrap layer initializes the application and sets up video detection.

**Files:**
- `src/bootstrap/bootState.ts` - Bootstrap state management
- `src/bootstrap/iframeInteractor.ts` - iframe communication
- `src/bootstrap/runtimeActivation.ts` - Runtime activation logic
- `src/bootstrap/videoObserverBinding.ts` - Video observer binding

**Responsibilities:**
- Initialize application state
- Set up video element observers
- Handle iframe communication for embedded players
- Manage activation/deactivation

### 2. VideoHandler (Main Controller)

The central class that orchestrates all translation functionality.

**File:** `src/index.ts`

**Responsibilities:**
- Manage video lifecycle
- Coordinate translation pipeline
- Handle UI interactions
- Manage audio playback
- Handle subtitle display
- Volume synchronization

### 3. Core Modules

#### Translation Handler

**File:** `src/core/translationHandler.ts`

Handles communication with translation APIs.

```
Translation Request Flow:
1. Get video metadata
2. Extract subtitles
3. Request translation from API
4. Poll for completion
5. Get audio URL
```

#### Translation Orchestrator

**File:** `src/core/translationOrchestrator.ts`

Manages the overall translation workflow.

```
Orchestration Steps:
1. Validate video
2. Check cache
3. Request translation
4. Setup audio player
5. Enable subtitles
6. Start playback sync
```

#### Cache Manager

**File:** `src/core/cacheManager.ts`

Caches translations and subtitles to avoid redundant API calls.

#### Auth

**File:** `src/core/auth.ts`

Handles Yandex OAuth authentication for "live voices" feature.

#### Video Manager

**File:** `src/core/videoManager.ts`

Manages video element registration and lifecycle.

#### Video Lifecycle Controller

**File:** `src/core/videoLifecycleController.ts`

Controls video playback synchronization with translation.

### 4. Subtitles System

#### Segmenter

**File:** `src/subtitles/segmenter.ts`

Segments raw subtitle text into displayable segments.

#### Smart Layout

**File:** `src/subtitles/smartLayout.ts`

Intelligently lays out subtitles to fit the player size.

#### Widget

**File:** `src/subtitles/widget.ts`

UI component that displays subtitles.

#### Position Controller

**File:** `src/subtitles/positionController.ts`

Manages subtitle positioning on screen.

### 5. UI System

#### UI Manager

**File:** `src/ui/manager.ts`

Manages the overall UI state and component lifecycle.

#### Components

**Directory:** `src/ui/components/`

| Component | Purpose |
|-----------|---------|
| Button | Translation toggle button |
| Menu | Settings menu |
| Subtitles | Subtitle display |
| Loader | Loading indicators |
| Slider | Volume sliders |

#### Views

**Directory:** `src/ui/views/`

Different UI views for different contexts.

### 6. Audio Downloader

**File:** `src/audioDownloader/index.ts`

Handles audio file downloading from various sources.

#### Strategies

**Directory:** `src/audioDownloader/strategies/`

| Strategy | Platform |
|----------|----------|
| ytAudio | YouTube |
| directDownload | Direct URLs |
| streamProxy | HLS/M3U8 streams |

### 7. LangLearn Module

**Directory:** `src/langLearn/`

Provides language learning features.

**Components:**
- `LangLearnController.ts` - Main controller
- `LangLearnPanel.ts` - Learning panel UI
- `phraseSegmenter/` - Phrase segmentation
- `phraseAligner.ts` - Audio-text alignment
- `audioAligner.ts` - Timestamp alignment

### 8. Utils

**Directory:** `src/utils/`

| File | Purpose |
|------|---------|
| `storage.ts` | GM Storage wrapper with LocalStorage fallback |
| `debug.ts` | Debug utilities |
| `VideoObserver.ts` | DOM observer for video elements |
| `translateApis.ts` | Translation API wrappers |
| `timeFormatting.ts` | Time formatting utilities |
| `iframeConnector.ts` | iframe communication |
| `intervalIdleChecker.ts` | Idle state detection |
| `async.ts` | Async utilities |
| `dom.ts` | DOM utilities |
| `browserInfo.ts` | Browser detection |
| `download.ts` | Download utilities |
| `errors.ts` | Error handling |
| `gm.ts` | GM utilities |
| `localization.ts` | Localization utilities |
| `notify.ts` | Notification system |
| `platformEvents.ts` | Platform event handling |
| `text.ts` | Text utilities |
| `utils.ts` | General utilities |
| `volume.ts` | Volume management |
| `volumeLink.ts` | Volume synchronization |
| `VOTLocalizedError.ts` | Localized error types |

---

## Module Structure

```
src/
├── index.ts                    # Main entry (VideoHandler)
├── ui.ts                       # UI entry point
├── global.d.ts                 # Global type declarations
├── headers.json                # Extension manifest data
│
├── bootstrap/                  # Application bootstrap
│   ├── bootState.ts
│   ├── iframeInteractor.ts
│   ├── runtimeActivation.ts
│   └── videoObserverBinding.ts
│
├── config/                     # Configuration
│   └── config.ts
│
├── core/                       # Core business logic
│   ├── auth.ts
│   ├── bootstrapPolicy.ts
│   ├── cacheManager.ts
│   ├── containerResolution.ts
│   ├── eventImpl.ts
│   ├── hostPolicies.ts
│   ├── lifecycleShared.ts
│   ├── translationHandler.ts
│   ├── translationOrchestrator.ts
│   ├── videoLifecycleController.ts
│   └── videoManager.ts
│
├── extension/                  # Native extension code
│   ├── background.ts
│   ├── base64.ts
│   ├── bodySerialization.ts
│   ├── bridge.ts
│   ├── bridgeTransport.ts
│   ├── constants.ts
│   ├── prelude.ts
│   ├── webext.ts
│   ├── yandexHeaders.ts
│   └── icons/
│
├── langLearn/                  # Language learning features
│   ├── audioAligner.ts
│   ├── LangLearnController.ts
│   ├── LangLearnPanel.ts
│   ├── phraseAligner.ts
│   └── phraseSegmenter/
│
├── localization/               # Localization system
│   ├── hashes.json
│   ├── localizationProvider.ts
│   └── locales/
│
├── subtitles/                  # Subtitle system
│   ├── layoutController.ts
│   ├── positionController.ts
│   ├── processor.ts
│   ├── segmenter.ts
│   ├── smartLayout.ts
│   ├── smartWrap.ts
│   ├── types.ts
│   └── widget.ts
│
├── styles/                     # SASS stylesheets
│   ├── _mixins.scss
│   ├── langLearn.scss
│   ├── main.scss
│   ├── subtitles.scss
│   └── components/
│
├── types/                      # Type definitions
│   ├── audioDownloader.ts
│   ├── chrome.d.ts
│   ├── localization.ts
│   ├── storage.ts
│   ├── translateApis.ts
│   ├── uiManager.ts
│   ├── components/
│   ├── core/
│   ├── utils/
│   └── views/
│
├── ui/                         # UI components
│   ├── icons.ts
│   ├── manager.ts
│   ├── overlayVisibilityController.ts
│   ├── components/
│   └── views/
│
├── utils/                      # Utilities
│   └── [see Utils section above]
│
├── audioDownloader/            # Audio downloading
│   ├── index.ts
│   ├── README.md
│   └── strategies/
│
└── videoHandler/               # Video handling
    ├── shared.ts
    └── modules/
```

---

## Data Flow

### Translation Pipeline

```
1. Video Detection
   ┌─────────────────┐
   │ VideoObserver   │─── detects ──▶ video element
   └─────────────────┘
          │
          ▼
   ┌─────────────────┐
   │ Bootstrap       │─── creates ───▶ VideoHandler
   └─────────────────┘

2. Translation Request
   ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
   │ VideoHandler    │────▶│Translation Handler│────▶│ Yandex API      │
   │                 │     │                  │     │ / VOT Worker    │
   └─────────────────┘     └──────────────────┘     └─────────────────┘
          │                          │                       │
          │                    cache check            translate
          │                          │                       │
          ▼                          ▼                       ▼
   ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
   │ CacheManager    │     │  Poll status     │◀────│ Return task ID  │
   └─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                    │ ready
                                    ▼
                           ┌──────────────────┐
                           │ Get audio URL    │
                           └────────┬─────────┘
                                    │
                                    ▼

3. Audio Playback
   ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
   │ AudioDownloader │────▶│ AudioContext     │────▶│ Speaker         │
   └─────────────────┘     │ (WebAudio API)   │     └─────────────────┘
                           └──────────────────┘

4. Subtitle Display
   ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
   │ Translation     │────▶│ Subtitle         │────▶│ Widget Display  │
   │ Handler         │     │ Segmenter        │     │ (positioned)    │
   └─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Event Flow

```
User Clicks Translate
        │
        ▼
┌───────────────┐
│ VideoHandler  │
│ translateFunc │
└───────┬───────┘
        │
        ├────▶ Validate video
        │
        ├────▶ Get video data
        │
        ├────▶ Request translation
        │
        ├────▶ Setup audio player
        │      ├─▶ Create AudioContext
        │      ├─▶ Create audio element
        │      └─▶ Setup volume controls
        │
        ├────▶ Enable subtitles
        │      ├─▶ Create segmenter
        │      ├─▶ Create widget
        │      └─▶ Position on screen
        │
        └────▶ Start playback sync
               ├─▶ Listen to video events
               ├─▶ Sync audio position
               └─▶ Handle pauses/seeking
```

### Volume Synchronization

```
┌──────────────┐         ┌───────────────┐         ┌──────────────┐
│ Video Player │◀───────▶│VolumeLink     │◀───────▶│Translation   │
│ Volume       │  events │               │  events │ Audio Volume │
└──────────────┘         └───────────────┘         └──────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────┐         ┌───────────────┐         ┌──────────────┐
│ onVideoVol.  │         │ Apply linking │         │onTransVolume │
│ Changed()    │         │ rules         │         │ Changed()    │
└──────────────┘         └───────────────┘         └──────────────┘
```

---

## Extension Architecture

### Userscript Mode

The primary deployment mode as a userscript:

```
Browser
  │
  ├─▶ Tampermonkey/Violentmonkey
  │     │
  │     ├─▶ Load vot.user.js
  │     │
  │     └─▶ Execute in page context
  │           │
  │           └─▶ Access GM_* APIs
  │                 ├─▶ GM_getValue
  │                 ├─▶ GM_setValue
  │                 ├─▶ GM_xmlhttpRequest
  │                 └─▶ GM_addStyle
  │
  └─▶ Injected into page DOM
        │
        ├─▶ Access video elements
        ├─▶ Inject UI components
        └─▶ Handle events
```

### Native Extension Mode

For Chrome and Firefox:

```
┌───────────────────────────────────┐
│     Browser Extension              │
│                                   │
│  ┌─────────────┐  ┌────────────┐  │
│  │Background.ts│  │Content     │  │
│  │             │  │Script      │  │
│  │- Auth flow  │  │(injected)  │  │
│  │- Messaging  │  │            │  │
│  └──────┬──────┘  └─────┬──────┘  │
│         │ messaging     │         │
│         └───────────────┘         │
│                                   │
│  ┌──────────────────────────┐     │
│  │Manifest (manifest.json)  │     │
│  │- Permissions             │     │
│  │- Content scripts         │     │
│  │- Web accessible resource │     │
│  └──────────────────────────┘     │
└───────────────────────────────────┘
```

### Bridge Architecture

For native extension mode, a bridge connects the content script with the background:

```
Content Script              Background Script
     │                           │
     │◀──── Bridge Transport ───▶│
     │                           │
     │◀──── Message Protocol ───▶│
     │                           │
  Local State              Shared State
     │                        │
     └────────────────────────┘
           Synchronized
```

---

## Build System

### Vite Configuration

The project uses Vite with multiple configurations:

| Config File | Purpose |
|-------------|---------|
| `vite.config.ts` | Main userscript build |
| `vite.extension.config.ts` | Native extension build |
| `vite.extension.shared.ts` | Shared extension config |
| `vite.test-ui.config.ts` | Test UI build |

### Build Targets

```
npm run build        # Userscript (normal)
npm run build:min    # Userscript (minified)
npm run build:all    # Both userscript variants
npm run build:ext    # Native extensions (Chrome/Firefox)
npm run build:dev    # Dev build with sourcemaps
```

### Build Pipeline

```
Source (TypeScript)
      │
      ▼
┌─────────────┐
│ TypeScript  │
│ Compiler    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Vite        │
│ Bundler     │
└──────┬──────┘
       │
       ├─▶ Userscript Output
       │     └─▶ dist/vot.user.js
       │
       └─▶ Extension Output
             ├─▶ dist-ext/vot-extension-chrome-*.zip
             └─▶ dist-ext/vot-extension-firefox-*.xpi
```

---

## Server Infrastructure

### VOT Worker (Cloudflare)

Load balancer and proxy for translation requests.

| Endpoint | Purpose |
|----------|---------|
| `vot-worker.toil.cc` | Main balancer |
| `vot-worker-s1.toil.cc` | Proxy server 1 |
| `vot-worker-s2.toil.cc` | Proxy server 2 |

### Media Proxy

Handles M3U8 and indirect media URLs.

| Endpoint | Purpose |
|----------|---------|
| `media-proxy.toil.cc` | M3U8/MP4 proxy |

### VOT Backend

Handles custom site translations.

| Endpoint | Purpose |
|----------|---------|
| `vot.toil.cc` | Custom translation API |

### Status & Stats

| Endpoint | Purpose |
|----------|---------|
| `votstatus.toil.cc` | Server status |
| `votstats.toil.cc` | Usage statistics |

---

## Key Design Patterns

### 1. Strategy Pattern

Used in audio downloading with different strategies for different platforms.

### 2. Observer Pattern

VideoObserver watches DOM for video elements.

### 3. Factory Pattern

UI components are created through factory functions.

### 4. Singleton Pattern

Shared state managers use singleton pattern.

### 5. State Machine

Translation states managed through state machine.

---

## Error Handling

The project uses multiple error handling strategies:

1. **AbortController** - Cancel pending requests
2. **Retry Logic** - Retry failed requests
3. **Fallback URLs** - Multiple audio sources
4. **Graceful Degradation** - Disable features on unsupported platforms
5. **Localized Errors** - User-facing error messages

---

## Testing

### Test Files

| File | Purpose |
|------|---------|
| `tests/localization.test.ts` | Localization tests |
| `tests/smart-ducking.test.ts` | Audio ducking tests |

### Test Coverage

- Unit tests for utilities
- Integration tests for core modules
- UI tests for components