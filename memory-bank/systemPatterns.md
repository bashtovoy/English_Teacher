# System Patterns — English_Teacher (VOT)

## Architecture Layers

### 1. Core Layer (`src/core/`)
| File | Purpose |
|------|---------|
| `translationHandler.ts` | Translation processing |
| `translationOrchestrator.ts` | Translation orchestration |
| `videoLifecycleController.ts` | Video lifecycle management |
| `cacheManager.ts` | Caching layer |
| `auth.ts` | Authentication |

### 2. Extension Layer (`src/extension/`)
| File | Purpose |
|------|---------|
| `background.ts` | Service worker |
| Bridge system | Communication between content script and background |
| webext APIs | Browser-specific APIs |

### 3. UI Layer (`src/ui/`)
- Component-based with lit-html
- Overlay system with visibility controller
- Settings views

### 4. Subtitle System (`src/subtitles/`)
| File | Purpose |
|------|---------|
| `segmenter.ts` | Subtitle segmentation |
| `smartLayout.ts` | Smart layout algorithm |
| `smartWrap.ts` | Text wrapping |
| `widget.ts` | Subtitle widget rendering |

### 5. Audio System (`src/audioDownloader/`)
- Multiple download strategies
- YouTube audio extraction (`ytAudio/`)

### 6. Language Learning (`src/langLearn/`)
| File | Purpose |
|------|---------|
| `audioAligner.ts` | Audio alignment |
| `phraseAligner.ts` | Phrase alignment |
| `phraseSegmenter/` | Phrase segmentation (Qwen API, Local LLM) |

## Key Design Patterns

- **Strategy Pattern** — Different download strategies for different platforms
- **Observer Pattern** — Video observer for detecting video elements
- **Orchestrator Pattern** — Translation orchestration
- **Component Pattern** — UI components with lit-html