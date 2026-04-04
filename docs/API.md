# API Documentation

This document describes the main classes, interfaces, and modules of the Voice Over Translation (VOT) project.

## Table of Contents

- [VideoHandler](#videohandler)
- [UI Components](#ui-components)
- [Core Modules](#core-modules)
- [Utils](#utils)
- [Types](#types)

---

## VideoHandler

The main class responsible for managing video translation lifecycle.

### Class: `VideoHandler`

Handles video playback, translation, subtitles, and UI interactions.

#### Constructor

```typescript
constructor(
  container: HTMLElement,
  options: VideoHandlerOptions
)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `video` | `HTMLVideoElement` | Current video element reference |
| `site` | `string` | Current website identifier |
| `container` | `HTMLElement` | Container element for UI components |
| `firstPlay` | `boolean` | Whether this is the first play event |
| `uiManager` | `UIManager` | UI manager instance |
| `translateToLang` | `string` | Target language for translation |
| `data` | `VideoData` | Current video metadata |
| `subtitles` | `Subtitle[]` | Available subtitles |
| `videoData` | `VideoData` | Video information from API |
| `actionsAbortController` | `AbortController` | Controller for canceling pending actions |

#### Methods

##### Translation Management

```typescript
// Start automatic translation
runAutoTranslate(): Promise<void>

// Stop translation
stopTranslate(): Promise<void>

// Wait for pending stop to complete
waitForPendingStopTranslate(): Promise<void>

// Check if current action is stale
isActionStale(actionContext?: { gen: number; videoId: string }): boolean

// Reset abort controller
resetActionsAbortController(reason?: any): void

// Schedule translation refresh
scheduleTranslationRefresh(): void
```

##### Audio Control

```typescript
// Get audio context for WebAudio API
getAudioContext(): AudioContext

// Check if AudioContext is supported
get isAudioContextSupported(): boolean

// Get preferred audio mode
getPreferAudio(): string

// Create audio player
createPlayer(): void

// Get current video volume
getVideoVolume(): number

// Set video volume
setVideoVolume(volume: number): void

// Check if video is muted
isMuted(): boolean

// Proxy audio URL through worker
proxifyAudio(audioUrl: string): string

// Remove proxy from audio URL
unproxifyAudio(audioUrl: string): string
```

##### Subtitles

```typescript
// Get subtitles widget
getSubtitlesWidget(): SubtitlesWidget

// Check if subtitles widget exists
hasSubtitlesWidget(): boolean

// Reset subtitles widget
resetSubtitlesWidget(): void

// Enable subtitles for current language pair
enableSubtitlesForCurrentLangPair(): void

// Toggle subtitles for current language pair
toggleSubtitlesForCurrentLangPair(): void
```

##### Volume Synchronization

```typescript
// Handle video volume changes
onVideoVolumeSliderSynced(volumePercent: number): void

// Handle translation volume changes
onTranslationVolumeSliderSynced(volumePercent: number): void

// Reset volume link state
resetVolumeLinkState(videoPercent: number, translationPercent: number): void

// Sync volume between video and translation
syncVolumeWrapper(videoPercent: number, translationPercent: number): void
```

##### Events

```typescript
// Initialize event handlers
init(): Promise<void>

// Initialize VOT client
initVOTClient(): void

// Initialize extra events
initExtraEvents(): void

// Handle source change
handleSrcChanged(): void

// Release resources
release(): void

// Get event container
getEventContainer(): EventContainer
```

##### UI Helpers

```typescript
// Get UI root element
get uiRoot(): HTMLElement

// Get portal container
get portalContainer(): HTMLElement

// Get tooltip layout root
get tooltipLayoutRoot(): HTMLElement

// Transform button state
transformBtn(text: string, status: string, show: boolean): void

// Check if active source exists
hasActiveSource(): boolean

// Check overlay interactive node
isOverlayInteractiveNode(node: unknown): boolean

// Get auto hide delay
getAutoHideDelay(): number

// Setup audio settings UI
setupAudioSettings(): void
```

##### Utility

```typescript
// Get translation cache key
getTranslationCacheKey(from: string, to: string, videoId: string): string

// Get subtitles cache key
getSubtitlesCacheKey(videoId: string): string

// Get request language for translation
getRequestLangForTranslation(): string

// Check if lively voice is allowed
isLivelyVoiceAllowed(): boolean

// Set select menu values
setSelectMenuValues(from: string, to: string): void

// Get video data
getVideoData(): Promise<VideoData>

// Validate video source
videoValidator(): boolean

// Update translation error message
updateTranslationErrorMsg(error: Error, retry: boolean): void

// After updating translation
afterUpdateTranslation(audioUrl: string): void

// Validate audio URL
validateAudioUrl(url: string, retries?: number): Promise<string>

// Check if multi-method S3 URL
isMultiMethodS3(url: string): boolean

// Check if YouTube host
isYouTubeHosts(): boolean

// Translate function
translateFunc(
  text: string,
  from: string,
  to: string,
  service: string
): Promise<string>

// Collect report info
collectReportInfo(): object
```

---

## UI Components

The UI module provides components for building the extension interface.

### Manager: `UIManager`

Main UI manager class.

```typescript
class UIManager {
  // Initialize UI
  init(): void
  
  // Show/hide UI
  setVisible(visible: boolean): void
  
  // Update UI state
  updateState(state: UIState): void
}
```

### Base Components

| Component | Description |
|-----------|-------------|
| `createEl()` | Create generic element |
| `createHeader()` | Create header element (h1-h6) |
| `createButton()` | Create styled button |
| `createTextButton()` | Create text button |
| `createOutlinedButton()` | Create outlined button |
| `createIconButton()` | Create icon button |
| `createInlineLoader()` | Create loading indicator |
| `createPortal()` | Create portal container |
| `createInformation()` | Create information display |
| `createSubtitleInfo()` | Create subtitle info element |

### Helper Functions

```typescript
// Make element behave like a button (accessible)
makeButtonLike(el: HTMLElement, options: MakeButtonLikeOptions): void

// Initialize keyboard navigation mode
initKeyboardNavigationMode(): void
```

---

## Core Modules

### Authentication (`core/auth.ts`)

Handles Yandex OAuth authentication.

```typescript
class Auth {
  // Get auth token
  getToken(): Promise<string>
  
  // Check if authenticated
  isAuthenticated(): boolean
  
  // Refresh token
  refreshToken(): Promise<void>
  
  // Logout
  logout(): void
}
```

### Cache Manager (`core/cacheManager.ts`)

Manages caching of translations and subtitles.

```typescript
class CacheManager {
  // Get cached translation
  getTranslation(key: string): TranslationData | null
  
  // Cache translation
  setTranslation(key: string, data: TranslationData): void
  
  // Clear cache
  clear(): void
}
```

### Translation Handler (`core/translationHandler.ts`)

Handles translation requests and responses.

```typescript
class TranslationHandler {
  // Request translation
  requestTranslation(videoData: VideoData): Promise<TranslationResult>
  
  // Get translation status
  getTranslationStatus(taskId: string): Promise<TranslationStatus>
  
  // Cancel translation
  cancelTranslation(taskId: string): void
}
```

### Translation Orchestrator (`core/translationOrchestrator.ts`)

Orchestrates the translation workflow.

```typescript
class TranslationOrchestrator {
  // Start translation pipeline
  start(videoData: VideoData): Promise<void>
  
  // Stop translation
  stop(): void
  
  // Handle translation error
  handleError(error: Error): void
}
```

### Video Manager (`core/videoManager.ts`)

Manages video lifecycle and state.

```typescript
class VideoManager {
  // Register video element
  register(video: HTMLVideoElement): void
  
  // Unregister video element
  unregister(): void
  
  // Get current video
  getCurrentVideo(): HTMLVideoElement | null
}
```

### Video Lifecycle Controller (`core/videoLifecycleController.ts`)

Controls video playback and translation sync.

```typescript
class VideoLifecycleController {
  // Start lifecycle
  start(): void
  
  // Pause lifecycle
  pause(): void
  
  // Stop lifecycle
  stop(): void
  
  // Seek to position
  seek(time: number): void
}
```

### Bootstrap Policy (`core/bootstrapPolicy.ts`)

Controls bootstrap behavior.

```typescript
class BootstrapPolicy {
  // Check if should auto-translate
  shouldAutoTranslate(site: string): boolean
  
  // Check if should show subtitles
  shouldShowSubtitles(site: string): boolean
}
```

---

## Utils

### Storage (`utils/storage.ts`)

Wrapper for GM Storage API with LocalStorage fallback.

```typescript
class VOTStorage {
  // Get value
  get<T>(key: string, defaultValue?: T): Promise<T>
  
  // Set value
  set<T>(key: string, value: T): Promise<void>
  
  // Delete value
  delete(key: string): Promise<void>
  
  // List all keys
  list(): Promise<string[]>
}
```

### Debug (`utils/debug.ts`)

Debug utilities.

```typescript
// Debug logger
debugLog(module: string, ...args: any[]): void

// Check debug mode
isDebugMode(): boolean
```

### Time Formatting (`utils/timeFormatting.ts`)

Time utilities.

```typescript
// Format seconds to HH:MM:SS
formatTime(seconds: number): string

// Format seconds to display string
formatDuration(seconds: number): string
```

### Translate APIs (`utils/translateApis.ts`)

Translation API wrappers.

```typescript
// Translate text using Yandex API
translateYandex(text: string, from: string, to: string): Promise<string>

// Detect language
detectLanguage(text: string): Promise<string>

// Translate using edge API
translateEdge(text: string, from: string, to: string): Promise<string>
```

### Video Observer (`utils/VideoObserver.ts`)

Observes DOM for video elements.

```typescript
class VideoObserver {
  // Start observing
  start(): void
  
  // Stop observing
  stop(): void
  
  // Set callback
  onVideoFound(callback: (video: HTMLVideoElement) => void): void
}
```

---

## Types

### Localization

```typescript
type Phrase = 
  | "translate"
  | "stop"
  | "settings"
  | "volume"
  | /* ... */;

type Phrases = Record<Phrase, string>;

interface Locale {
  code: string;
  name: string;
  phrases: Phrases;
}
```

### Storage

```typescript
interface StorageData {
  translateTo: string;
  translateFrom: string;
  autoTranslate: boolean;
  autoSubtitles: boolean;
  volume: number;
  /* ... */
}
```

### Translate APIs

```typescript
interface TranslationResult {
  audioUrl: string;
  subtitles: Subtitle[];
  detectedLang: string;
  /* ... */
}

interface TranslationStatus {
  status: string;
  progress: number;
  estimatedTime: number;
  /* ... */
}
```

### UI Manager

```typescript
interface UIManagerOptions {
  container: HTMLElement;
  handler: VideoHandler;
  /* ... */
}

interface UIState {
  isTranslating: boolean;
  isLoading: boolean;
  error: Error | null;
  /* ... */
}
```

### Audio Downloader

```typescript
interface AudioDownloadOptions {
  url: string;
  title: string;
  format: string;
  /* ... */
}
```

---

## AudioDownloader

Module for downloading audio from various sources.

### Main Export

```typescript
interface AudioDownloader {
  // Download audio from URL
  download(options: AudioDownloadOptions): Promise<AudioData>
  
  // Check if URL is supported
  isSupported(url: string): boolean
}
```

### Strategies

Different strategies for different platforms:

| Strategy | Description |
|----------|-------------|
| `ytAudio` | YouTube audio extraction |
| `directDownload` | Direct URL download |
| `streamProxy` | HLS/M3U8 stream proxying |

---

## Subtitles Module

### Segmenter (`subtitles/segmenter.ts`)

Segments text for subtitles.

```typescript
class Segmenter {
  // Segment text
  segment(text: string): Segment[]
  
  // Merge segments
  merge(segments: Segment[]): MergedSegment[]
}
```

### Widget (`subtitles/widget.ts`)

Subtitle display widget.

```typescript
class SubtitlesWidget {
  // Show subtitle
  show(text: string): void
  
  // Hide subtitle
  hide(): void
  
  // Update style
  updateStyle(styles: SubtitleStyles): void
}
```

### Position Controller (`subtitles/positionController.ts`)

Controls subtitle positioning.

```typescript
class PositionController {
  // Calculate position
  calculatePosition(videoRect: DOMRect): Position
  
  // Apply position
  applyPosition(element: HTMLElement, position: Position): void
}
```

### Smart Layout (`subtitles/smartLayout.ts`)

Intelligent subtitle layout.

```typescript
class SmartLayout {
  // Layout subtitles
  layout(lines: string[], containerWidth: number): LayoutResult
  
  // Calculate font size
  calculateFontSize(containerWidth: number): number
}
```

---

## LangLearn Module

Module for language learning features.

### LangLearnController

Main controller for language learning.

```typescript
class LangLearnController {
  // Initialize
  init(): void
  
  // Show word translation
  showWordTranslation(word: string): void
  
  // Show sentence translation
  showSentenceTranslation(sentence: string): void
  
  // Highlight word
  highlightWord(element: HTMLElement): void
}
```

### Phrase Segmenter

Segments phrases for learning.

```typescript
class PhraseSegmenter {
  // Segment phrase
  segment(text: string): Segment[]
  
  // Get semantic segments
  getSemanticSegments(segments: Segment[]): SemanticSegment[]
}
```

### Phrase Aligner

Aligns audio with text.

```typescript
class PhraseAligner {
  // Align audio to text
  align(audioUrl: string, text: string): Promise<AlignmentResult>
}
```

### Audio Aligner

Aligns audio timestamps.

```typescript
class AudioAligner {
  // Align segments
  align(segments: Segment[]): Promise<AlignedSegment[]>
}
```

---

## Config System

### Config (`config/config.ts`)

Application configuration.

```typescript
interface AppConfig {
  // API endpoints
  api: {
    translate: string;
    detect: string;
    tts: string;
    proxy: string;
  };
  
  // Default settings
  defaults: {
    translateTo: string;
    translateFrom: string;
    autoTranslate: boolean;
    /* ... */
  };
  
  // Feature flags
  features: {
    livelyVoice: boolean;
    wordTranslation: boolean;
    /* ... */
  };
}
```

---

## Extension Module

Bridge between userscript and native extension.

```typescript
// Initialize bridge
initBridge(): void

// Send message to background
sendMessageToBackground(message: Message): Promise<Response>

// Handle message from background
handleMessage(message: Message): void
```

---

## Bootstrap

Bootstraps the application.

```typescript
// Bootstrap entry point
bootstrap(): void

// Initialize iframe interactor
initIframeInteractor(): void

// Bind video observer
bindVideoObserver(): void