# Voice Over Translation - Documentation Index

Welcome to the Voice Over Translation (VOT) project documentation. This index provides links to all available documentation files.

## Quick Links

- [Main README](../README.md) - Project overview and installation guide
- [English README](../README-EN.md) - English version of the main README
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- [Supported Languages](../LANG_SUPPORT.md) - List of supported languages
- [Changelog](../changelog.md) - Version history and changes

---

## Documentation

### Getting Started

- [Main README](../README.md)
  - Installation instructions
  - Feature list
  - Supported sites
  - Build instructions
  - Browser compatibility

### Core Documentation

| Document | Description |
|----------|-------------|
| [API Documentation](./API.md) | Detailed API reference for all classes, interfaces, and modules |
| [Architecture Documentation](./ARCHITECTURE.md) | System architecture, data flow, and design patterns |
| [AudioDownloader](./AUDIODOWNLOADER.md) | Audio extraction module documentation |

### Module Documentation

#### Bootstrap Layer
- `src/bootstrap/bootState.ts` - Bootstrap state management
- `src/bootstrap/iframeInteractor.ts` - iframe communication
- `src/bootstrap/runtimeActivation.ts` - Runtime activation
- `src/bootstrap/videoObserverBinding.ts` - Video observer binding

#### Core Modules
- `src/core/auth.ts` - Yandex OAuth authentication
- `src/core/cacheManager.ts` - Translation caching
- `src/core/translationHandler.ts` - Translation API handling
- `src/core/translationOrchestrator.ts` - Translation workflow
- `src/core/videoManager.ts` - Video element management
- `src/core/videoLifecycleController.ts` - Video lifecycle control

#### Subtitles System
- `src/subtitles/segmenter.ts` - Text segmentation
- `src/subtitles/smartLayout.ts` - Intelligent subtitle layout
- `src/subtitles/widget.ts` - Subtitle display widget
- `src/subtitles/positionController.ts` - Subtitle positioning

#### UI System
- `src/ui/manager.ts` - UI state management
- `src/ui/components/` - UI component implementations
- `src/ui/views/` - View implementations

#### Language Learning
- `src/langLearn/LangLearnController.ts` - Learning features controller
- `src/langLearn/LangLearnPanel.ts` - Learning panel UI
- `src/langLearn/phraseSegmenter/` - Phrase segmentation
- `src/langLearn/phraseAligner.ts` - Audio-text alignment
- `src/langLearn/audioAligner.ts` - Timestamp alignment

#### Audio Downloader
- [AudioDownloader Documentation](./AUDIODOWNLOADER.md)
- `src/audioDownloader/index.ts` - Main module
- `src/audioDownloader/strategies/` - Extraction strategies
- `src/audioDownloader/ytAudio/` - YouTube extraction

### Utilities

| Utility | Purpose |
|---------|---------|
| `utils/storage.ts` | GM Storage wrapper |
| `utils/debug.ts` | Debug logging |
| `utils/VideoObserver.ts` | Video element detection |
| `utils/translateApis.ts` | Translation API wrappers |
| `utils/timeFormatting.ts` | Time formatting |
| `utils/dom.ts` | DOM utilities |
| `utils/async.ts` | Async utilities |

### Extension Development

- `src/extension/background.ts` - Background script
- `src/extension/bridge.ts` - Content-background bridge
- `src/extension/webext.ts` - Web extension utilities

### Build System

| Config | Purpose |
|--------|---------|
| `vite.config.ts` | Main userscript build |
| `vite.extension.config.ts` | Native extension build |
| `vite.extension.shared.ts` | Shared extension config |
| `vite.test-ui.config.ts` | Test UI build |

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/wiki-gen/` | Wiki generator for supported sites |
| `scripts/generate_report.ts` | Report generation |

---

## Server Infrastructure

Our server infrastructure is documented in two places:

### README Section
- Main README - "Our domains" section

### Endpoints Overview

| Service | Endpoint | Purpose |
|---------|----------|---------|
| VOT Balancer | `vot-worker.toil.cc` | Load balancer |
| VOT Worker S1 | `vot-worker-s1.toil.cc` | Proxy server 1 |
| VOT Worker S2 | `vot-worker-s2.toil.cc` | Proxy server 2 |
| Media Proxy | `media-proxy.toil.cc` | M3U8/MP4 proxy |
| VOT Backend | `vot.toil.cc` | Custom translations |
| VOT Status | `votstatus.toil.cc` | Server status |
| VOT Stats | `votstats.toil.cc` | Usage statistics |

---

## Type System

Type definitions are located in `src/types/`:

| Type File | Contents |
|-----------|----------|
| `audioDownloader.ts` | Audio downloader types |
| `localization.ts` | Localization system types |
| `storage.ts` | Storage data types |
| `translateApis.ts` | Translation API types |
| `uiManager.ts` | UI management types |
| `chrome.d.ts` | Chrome extension types |

---

## Testing

| Test File | Coverage |
|-----------|----------|
| `tests/localization.test.ts` | Localization system |
| `tests/smart-ducking.test.ts` | Audio ducking |

---

## Contributing

Please see:
- [Contributing Guide](../CONTRIBUTING.md)
- [Localization Guide in CONTRIBUTING.md](../CONTRIBUTING.md#localization)
- [vot.js Repository](https://github.com/FOSWLY/vot.js)
- [vot-cli Repository](https://github.com/FOSWLY/vot-cli)

---

## External Resources

- [Project Wiki](https://github.com/ilyhalight/voice-over-translation/wiki)
- [FAQ (Russian)](https://github.com/ilyhalight/voice-over-translation/wiki/%5BRU%5D-FAQ)
- [FAQ (English)](https://github.com/ilyhalight/voice-over-translation/wiki/%5BEN%5D-FAQ)
- [Supported Sites (Russian)](https://github.com/ilyhalight/voice-over-translation/wiki/%5BRU%5D-Supported-sites)
- [Supported Sites (English)](https://github.com/ilyhalight/voice-over-translation/wiki/%5BEN%5D-Supported-sites)

---

## Project Structure

```
English_Teacher/
├── docs/
│   ├── README.md          ← You are here
│   ├── API.md             ← Full API reference
│   ├── ARCHITECTURE.md    ← System architecture
│   └── AUDIODOWNLOADER.md ← Audio extraction module
├── src/
│   ├── bootstrap/         # Application bootstrap
│   ├── config/            # Configuration
│   ├── core/              # Core business logic
│   ├── extension/         # Native extension code
│   ├── langLearn/         # Language learning features
│   ├── localization/      # Localization system
│   ├── subtitles/         # Subtitle system
│   ├── styles/            # SASS stylesheets
│   ├── types/             # Type definitions
│   ├── ui/                # UI components
│   ├── utils/             # Utilities
│   ├── audioDownloader/   # Audio downloading
│   └── videoHandler/      # Video handling
├── tests/                 # Test files
├── scripts/               # Build/generation scripts
├── demo/                  # Demo files
└── img/                   # Images
```

---

## Key Concepts

### Translation Pipeline

1. **Video Detection** - VideoObserver detects video elements
2. **Metadata Extraction** - Get video ID and metadata
3. **Translation Request** - Request translation from API
4. **Audio Download** - Extract and stream audio to API
5. **Translation Polling** - Wait for translation completion
6. **Audio Playback** - Play translated audio with sync
7. **Subtitle Display** - Show translated subtitles

### Audio Download Process

1. **Strategy Selection** - Choose extraction method
2. **URL Extraction** - Get audio stream URLs
3. **Chunk Streaming** - Stream audio in chunks
4. **Event Dispatch** - Notify listeners of chunks
5. **Upload to API** - Send chunks to translation service

### UI System

1. **Component Creation** - Factory functions create UI elements
2. **State Management** - UIManager handles state
3. **Event Handling** - Components emit events
4. **Style Customization** - CSS variables for theming

---

## Glossary

| Term | Definition |
|------|------------|
| VOT | Voice Over Translation |
| TTS | Text-to-Speech (Yandex voice synthesis) |
| HLS | HTTP Live Streaming (m3u8 format) |
| CSP | Content Security Policy |
| GM_* | Greasemonkey API functions |
| Userscript | Browser script loaded via manager |
| PiP | Picture-in-Picture mode |
| Worker | Cloudflare Workers (our proxy servers) |
| Lively Voices | Yandex neural voice synthesis |

---

## Version Information

Current version: See [changelog.md](../changelog.md) for latest changes

## License

See [LICENSE](../LICENSE) file for licensing information