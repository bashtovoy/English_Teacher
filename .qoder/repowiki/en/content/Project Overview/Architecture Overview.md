# Architecture Overview

<cite>
**Referenced Files in This Document**
- [src/index.ts](file://src/index.ts)
- [src/extension/bridge.ts](file://src/extension/bridge.ts)
- [src/bootstrap/bootState.ts](file://src/bootstrap/bootState.ts)
- [src/bootstrap/runtimeActivation.ts](file://src/bootstrap/runtimeActivation.ts)
- [src/bootstrap/videoObserverBinding.ts](file://src/bootstrap/videoObserverBinding.ts)
- [src/core/translationOrchestrator.ts](file://src/core/translationOrchestrator.ts)
- [src/core/translationHandler.ts](file://src/core/translationHandler.ts)
- [src/core/videoManager.ts](file://src/core/videoManager.ts)
- [src/videoHandler/shared.ts](file://src/videoHandler/shared.ts)
- [src/ui/manager.ts](file://src/ui/manager.ts)
- [src/subtitles/widget.ts](file://src/subtitles/widget.ts)
- [src/langLearn/LangLearnController.ts](file://src/langLearn/LangLearnController.ts)
- [src/utils/VideoObserver.ts](file://src/utils/VideoObserver.ts)
- [src/extension/webext.ts](file://src/extension/webext.ts)
- [src/config/config.ts](file://src/config/config.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the architecture of the English Teacher project, focusing on how the browser extension integrates with video players, translation services, and educational platforms. It explains the modular design separating the core translation engine, UI components, audio processing, and language learning features. Cross-browser compatibility is achieved via an extension bridge pattern, and the bootstrapping process coordinates initialization across environments. Component interaction diagrams illustrate the end-to-end flow from video detection through translation processing to UI updates. The project integrates with the VOT ecosystem and Yandex.Translate, and supports both userscript and native extension deployment modes. Architectural patterns such as mediator, observer, and strategy are used throughout.

## Project Structure
The project is organized into cohesive modules:
- Core orchestration and translation pipeline
- UI and overlays for controls and subtitles
- Audio processing and volume management
- Language learning features
- Extension bridge for cross-browser compatibility
- Bootstrapping and runtime activation
- Video detection and lifecycle management

```mermaid
graph TB
subgraph "Core"
VH["VideoHandler"]
VO["VOTVideoManager"]
TH["VOTTranslationHandler"]
TO["TranslationOrchestrator"]
end
subgraph "UI"
UM["UIManager"]
SW["SubtitlesWidget"]
LL["LangLearnController"]
end
subgraph "Extension"
BR["Bridge (content isolated world)"]
WX["webext (cross-browser API)"]
end
subgraph "Detection"
VOBS["VideoObserver"]
VOBIND["videoObserverBinding"]
end
subgraph "Config"
CFG["config.ts"]
end
VOBS --> VOBIND
VOBIND --> VH
VH --> VO
VH --> TH
VH --> TO
VH --> UM
UM --> SW
UM --> LL
BR --> WX
CFG --> VH
CFG --> UM
CFG --> BR
```

**Diagram sources**
- [src/utils/VideoObserver.ts:132-645](file://src/utils/VideoObserver.ts#L132-L645)
- [src/bootstrap/videoObserverBinding.ts:30-179](file://src/bootstrap/videoObserverBinding.ts#L30-L179)
- [src/index.ts:114-520](file://src/index.ts#L114-L520)
- [src/core/videoManager.ts:138-436](file://src/core/videoManager.ts#L138-L436)
- [src/core/translationHandler.ts:105-564](file://src/core/translationHandler.ts#L105-L564)
- [src/core/translationOrchestrator.ts:21-85](file://src/core/translationOrchestrator.ts#L21-L85)
- [src/ui/manager.ts:56-138](file://src/ui/manager.ts#L56-L138)
- [src/subtitles/widget.ts:110-800](file://src/subtitles/widget.ts#L110-L800)
- [src/langLearn/LangLearnController.ts:45-851](file://src/langLearn/LangLearnController.ts#L45-L851)
- [src/extension/bridge.ts:26-699](file://src/extension/bridge.ts#L26-L699)
- [src/extension/webext.ts:56-187](file://src/extension/webext.ts#L56-L187)
- [src/config/config.ts:1-63](file://src/config/config.ts#L1-L63)

**Section sources**
- [src/index.ts:1-1594](file://src/index.ts#L1-L1594)
- [src/utils/VideoObserver.ts:132-645](file://src/utils/VideoObserver.ts#L132-L645)
- [src/bootstrap/videoObserverBinding.ts:30-179](file://src/bootstrap/videoObserverBinding.ts#L30-L179)
- [src/config/config.ts:1-63](file://src/config/config.ts#L1-L63)

## Core Components
- VideoHandler: Central orchestrator composing managers, UI, and lifecycle. It holds state for translation, audio, subtitles, and volume synchronization.
- VOTVideoManager: Extracts and validates video metadata, detects language, and manages volume controls.
- VOTTranslationHandler: Implements translation workflow, handles audio downloads, retries, and error mapping.
- TranslationOrchestrator: Mediates auto-translation decisions and state transitions.
- UIManager: Initializes UI overlays, binds events, and coordinates settings and translation actions.
- SubtitlesWidget: Renders and positions subtitles with smart layout and interactivity.
- LangLearnController: Provides language learning mode with phrase segmentation, alignment, and playback.
- Extension Bridge: Bridges isolated content script world to privileged extension APIs for storage and XHR.
- VideoObserver: Detects video elements across DOM and Shadow DOM, filters ads and decorative videos, and emits events.

**Section sources**
- [src/index.ts:114-520](file://src/index.ts#L114-L520)
- [src/core/videoManager.ts:138-436](file://src/core/videoManager.ts#L138-L436)
- [src/core/translationHandler.ts:105-564](file://src/core/translationHandler.ts#L105-L564)
- [src/core/translationOrchestrator.ts:21-85](file://src/core/translationOrchestrator.ts#L21-L85)
- [src/ui/manager.ts:56-138](file://src/ui/manager.ts#L56-L138)
- [src/subtitles/widget.ts:110-800](file://src/subtitles/widget.ts#L110-L800)
- [src/langLearn/LangLearnController.ts:45-851](file://src/langLearn/LangLearnController.ts#L45-L851)
- [src/extension/bridge.ts:26-699](file://src/extension/bridge.ts#L26-L699)
- [src/utils/VideoObserver.ts:132-645](file://src/utils/VideoObserver.ts#L132-L645)

## Architecture Overview
The system follows a modular, layered architecture:
- Detection Layer: VideoObserver scans the DOM and Shadow DOM, emitting events for new or removed videos.
- Binding Layer: videoObserverBinding coordinates runtime activation, service discovery, container resolution, and VideoHandler creation.
- Orchestration Layer: VideoHandler composes managers and UI, delegating translation, video, and UI responsibilities.
- Extension Layer: Bridge mediates between isolated content script world and privileged extension APIs for storage and XHR.
- Configuration Layer: Centralized config defines service endpoints and defaults.

```mermaid
sequenceDiagram
participant Page as "Page DOM"
participant VOBS as "VideoObserver"
participant BIND as "videoObserverBinding"
participant ACT as "ensureRuntimeActivated"
participant SITE as "Service Discovery"
participant VH as "VideoHandler"
participant UI as "UIManager"
participant VM as "VOTVideoManager"
participant TH as "VOTTranslationHandler"
participant BR as "Bridge"
participant WX as "webext"
Page->>VOBS : "MutationObserver events"
VOBS-->>BIND : "onVideoAdded(video)"
BIND->>ACT : "ensureRuntimeActivated(reason)"
ACT-->>BIND : "ready"
BIND->>SITE : "findContainer(site, video)"
SITE-->>BIND : "container"
BIND->>VH : "createVideoHandler(video, container, site)"
VH->>VM : "init()"
VM-->>VH : "videoData"
VH->>UI : "initUI()"
UI-->>VH : "overlay + settings"
VH->>TH : "translateFunc(...)"
TH->>BR : "GM_fetch via bridge"
BR->>WX : "privileged fetch/storage"
WX-->>BR : "response"
BR-->>TH : "response"
TH-->>VH : "translation result"
VH-->>UI : "update UI"
```

**Diagram sources**
- [src/utils/VideoObserver.ts:132-645](file://src/utils/VideoObserver.ts#L132-L645)
- [src/bootstrap/videoObserverBinding.ts:30-179](file://src/bootstrap/videoObserverBinding.ts#L30-L179)
- [src/bootstrap/runtimeActivation.ts:20-58](file://src/bootstrap/runtimeActivation.ts#L20-L58)
- [src/index.ts:114-520](file://src/index.ts#L114-L520)
- [src/core/videoManager.ts:212-292](file://src/core/videoManager.ts#L212-L292)
- [src/core/translationHandler.ts:311-495](file://src/core/translationHandler.ts#L311-L495)
- [src/extension/bridge.ts:580-699](file://src/extension/bridge.ts#L580-L699)
- [src/extension/webext.ts:103-187](file://src/extension/webext.ts#L103-L187)

## Detailed Component Analysis

### VideoHandler: Orchestrator and State Hub
VideoHandler centralizes translation, UI, audio, and subtitles. It composes:
- Managers: VOTVideoManager, VOTTranslationHandler, TranslationOrchestrator
- UI: UIManager, OverlayVisibilityController, SubtitlesWidget
- Audio: Chaimu player, volume linking, smart ducking
- Lifecycle: Container updates, cache keys, abort controllers

```mermaid
classDiagram
class VideoHandler {
+video : HTMLVideoElement
+container : HTMLElement
+site : ServiceConf
+translateFromLang : RequestLang
+translateToLang : ResponseLang
+data : StorageData
+videoData : VideoData
+audioPlayer : Chaimu
+votClient : VOTClient|VOTWorkerClient
+uiManager : UIManager
+translationOrchestrator : TranslationOrchestrator
+translationHandler : VOTTranslationHandler
+videoManager : VOTVideoManager
+subtitlesWidget : SubtitlesWidget
+init()
+translateFunc(...)
+stopTranslation()
+updateTranslation(...)
}
class VOTVideoManager {
+getVideoData()
+videoValidator()
+setVideoVolume()
+getVideoVolume()
+setSelectMenuValues()
}
class VOTTranslationHandler {
+translateVideoImpl(...)
+onDownloadedAudio(...)
+onDownloadedPartialAudio(...)
+finishDownloadSuccess()
}
class TranslationOrchestrator {
+runAutoTranslationIfEligible()
+reset()
}
class UIManager {
+initUI()
+handleTranslationBtnClick()
+transformBtn(...)
}
class SubtitlesWidget {
+setSmartLayout()
+setFontsize()
+setOpacity()
+requestUpdate()
}
VideoHandler --> VOTVideoManager : "uses"
VideoHandler --> VOTTranslationHandler : "uses"
VideoHandler --> TranslationOrchestrator : "uses"
VideoHandler --> UIManager : "uses"
VideoHandler --> SubtitlesWidget : "creates"
```

**Diagram sources**
- [src/index.ts:114-520](file://src/index.ts#L114-L520)
- [src/core/videoManager.ts:138-436](file://src/core/videoManager.ts#L138-L436)
- [src/core/translationHandler.ts:105-564](file://src/core/translationHandler.ts#L105-L564)
- [src/core/translationOrchestrator.ts:21-85](file://src/core/translationOrchestrator.ts#L21-L85)
- [src/ui/manager.ts:56-138](file://src/ui/manager.ts#L56-L138)
- [src/subtitles/widget.ts:110-800](file://src/subtitles/widget.ts#L110-L800)

**Section sources**
- [src/index.ts:114-520](file://src/index.ts#L114-L520)

### Translation Pipeline: From Detection to UI Updates
The translation pipeline integrates VOT backend, audio downloader, and UI updates.

```mermaid
sequenceDiagram
participant UI as "UIManager"
participant VH as "VideoHandler"
participant VM as "VOTVideoManager"
participant TH as "VOTTranslationHandler"
participant AD as "AudioDownloader"
participant BR as "Bridge"
participant WX as "webext"
participant SW as "SubtitlesWidget"
UI->>VH : "handleTranslationBtnClick()"
VH->>VM : "getVideoData()"
VM-->>VH : "videoData"
VH->>TH : "translateVideoImpl(videoData, langs, help)"
TH->>BR : "GM_fetch via bridge"
BR->>WX : "fetch/storage"
WX-->>BR : "response"
BR-->>TH : "response"
TH->>AD : "runAudioDownload(...)"
AD-->>TH : "uploaded audio"
TH-->>VH : "translated result"
VH->>SW : "update subtitles"
VH-->>UI : "transformBtn + overlay"
```

**Diagram sources**
- [src/ui/manager.ts:735-800](file://src/ui/manager.ts#L735-L800)
- [src/core/videoManager.ts:212-292](file://src/core/videoManager.ts#L212-L292)
- [src/core/translationHandler.ts:311-495](file://src/core/translationHandler.ts#L311-L495)
- [src/extension/bridge.ts:580-699](file://src/extension/bridge.ts#L580-L699)
- [src/extension/webext.ts:103-187](file://src/extension/webext.ts#L103-L187)
- [src/subtitles/widget.ts:110-800](file://src/subtitles/widget.ts#L110-L800)

**Section sources**
- [src/ui/manager.ts:735-800](file://src/ui/manager.ts#L735-L800)
- [src/core/translationHandler.ts:311-495](file://src/core/translationHandler.ts#L311-L495)

### Extension Bridge Pattern: Cross-Browser Compatibility
The bridge pattern isolates the content script from privileged extension APIs. The bridge runs in an isolated world and relays requests to the background via ports, handling storage, notifications, and XHR with UA-CH normalization and binary response handling.

```mermaid
sequenceDiagram
participant CS as "Content Script (isolated)"
participant BR as "Bridge"
participant BG as "Background Service Worker"
participant WX as "webext"
participant NET as "Network"
CS->>BR : "GM_getValue/GM_setValue/GM_xmlhttpRequest"
BR->>BG : "runtime.connect(PORT)"
BG->>WX : "storage.get/set, runtime.sendMessage"
WX-->>BG : "results"
BG-->>BR : "XHR progress/load/error"
BR-->>CS : "events/results"
BR->>NET : "proxy XHR with UA-CH headers"
NET-->>BR : "binary chunks (base64)"
BR-->>CS : "ArrayBuffer/Blob"
```

**Diagram sources**
- [src/extension/bridge.ts:26-699](file://src/extension/bridge.ts#L26-L699)
- [src/extension/webext.ts:56-187](file://src/extension/webext.ts#L56-L187)

**Section sources**
- [src/extension/bridge.ts:26-699](file://src/extension/bridge.ts#L26-L699)
- [src/extension/webext.ts:56-187](file://src/extension/webext.ts#L56-L187)

### Bootstrapping and Runtime Activation
Bootstrapping ensures runtime readiness before video initialization. It activates localization, handles iframe contexts, and binds iframe interactor once.

```mermaid
flowchart TD
Start(["Start"]) --> CheckRuntime["Check runtimeActivated"]
CheckRuntime --> |true| Done["Return"]
CheckRuntime --> |false| CreatePromise["Create activation promise"]
CreatePromise --> OriginCheck{"Origin is auth server?"}
OriginCheck --> |Yes| InitAuth["initAuth()"]
OriginCheck --> |No| EnsureLoc["ensureLocalizationProviderReady()"]
EnsureLoc --> IsIframe{"isIframe()?"}
IsIframe --> |No| UpdateLoc["localizationProvider.update()"]
IsIframe --> |Yes| SkipLoc["Skip update"]
UpdateLoc --> BindIFrame["initIframeInteractor()"]
SkipLoc --> BindIFrame
BindIFrame --> SetFlag["runtimeActivated = true"]
SetFlag --> Resolve["Resolve promise"]
Resolve --> Done
```

**Diagram sources**
- [src/bootstrap/runtimeActivation.ts:20-58](file://src/bootstrap/runtimeActivation.ts#L20-L58)
- [src/bootstrap/bootState.ts:26-42](file://src/bootstrap/bootState.ts#L26-L42)

**Section sources**
- [src/bootstrap/runtimeActivation.ts:20-58](file://src/bootstrap/runtimeActivation.ts#L20-L58)
- [src/bootstrap/bootState.ts:26-42](file://src/bootstrap/bootState.ts#L26-L42)

### Video Detection and Lifecycle Management
VideoObserver scans DOM and Shadow DOM, filters ad-related and silent decorative videos, and emits events. videoObserverBinding coordinates runtime activation, service discovery, container resolution, and VideoHandler creation/replacement.

```mermaid
flowchart TD
Enable["enable()"] --> Scan["scan(documentElement)"]
Scan --> Observe["observeRoot(root)"]
Observe --> Mutations["onMutations(childList)"]
Mutations --> Enqueue["enqueueAdded/Removed"]
Enqueue --> Flush["scheduleFlush()"]
Flush --> Process["processPendingAdded/Removed"]
Process --> Track["trackVideo(video)"]
Track --> Validate{"isValidVideo(video)?"}
Validate --> |Yes| EmitAdd["onVideoAdded(video)"]
Validate --> |No| Ignore["Ignore ad/silent"]
EmitAdd --> Binding["videoObserverBinding.handleVideoAdded"]
Binding --> Activate["ensureRuntimeActivated"]
Activate --> Create["createVideoHandler(...)"]
Create --> Init["videoHandler.init()"]
Init --> CanPlay["videoHandler.setCanPlay()"]
```

**Diagram sources**
- [src/utils/VideoObserver.ts:580-645](file://src/utils/VideoObserver.ts#L580-L645)
- [src/bootstrap/videoObserverBinding.ts:90-179](file://src/bootstrap/videoObserverBinding.ts#L90-L179)

**Section sources**
- [src/utils/VideoObserver.ts:132-645](file://src/utils/VideoObserver.ts#L132-L645)
- [src/bootstrap/videoObserverBinding.ts:30-179](file://src/bootstrap/videoObserverBinding.ts#L30-L179)

### Language Learning Features
LangLearnController orchestrates phrase segmentation, alignment, refinement (Qwen API or local WebGPU), and synchronized playback of original and translated segments with timing logs and progress callbacks.

```mermaid
sequenceDiagram
participant UI as "UIManager"
participant LL as "LangLearnController"
participant VH as "VideoHandler"
participant Align as "SemanticSegmenter"
participant Refine as "Qwen/Local LLM"
participant Player as "Chaimu/AudioPlayer"
UI->>LL : "start(origSubtitles, transSubtitles)"
LL->>Align : "segment + align"
Align-->>LL : "phrases"
LL->>Refine : "refinePhrases(...)"
Refine-->>LL : "refined phrases"
LL->>VH : "pause translation player"
LL->>Player : "play translated segment"
LL->>VH : "play original segment"
LL-->>UI : "onStateChange/onPhraseChange"
```

**Diagram sources**
- [src/langLearn/LangLearnController.ts:91-203](file://src/langLearn/LangLearnController.ts#L91-L203)
- [src/ui/manager.ts:541-624](file://src/ui/manager.ts#L541-L624)

**Section sources**
- [src/langLearn/LangLearnController.ts:45-851](file://src/langLearn/LangLearnController.ts#L45-L851)
- [src/ui/manager.ts:541-624](file://src/ui/manager.ts#L541-L624)

## Dependency Analysis
The system exhibits clear separation of concerns:
- VideoHandler depends on managers and UI, mediating between them.
- VOTVideoManager depends on VOT helpers/utils and localization provider.
- VOTTranslationHandler depends on AudioDownloader and VOT client.
- UIManager depends on UI components and interacts with VideoHandler.
- SubtitlesWidget depends on layout/position utilities and UI components.
- LangLearnController depends on segmentation and refinement modules and VideoHandler.
- Bridge depends on webext for cross-browser API access.
- Config provides centralized endpoints and defaults.

```mermaid
graph LR
CFG["config.ts"] --> VH["VideoHandler"]
CFG --> UM["UIManager"]
CFG --> BR["Bridge"]
VOBS["VideoObserver"] --> VOBIND["videoObserverBinding"]
VOBIND --> VH
VH --> VO["VOTVideoManager"]
VH --> TH["VOTTranslationHandler"]
VH --> TO["TranslationOrchestrator"]
VH --> UM
UM --> SW["SubtitlesWidget"]
UM --> LL["LangLearnController"]
BR --> WX["webext"]
TH --> AD["AudioDownloader"]
VO --> VOT["@vot.js/*"]
UM --> UIComp["UI Components"]
```

**Diagram sources**
- [src/config/config.ts:1-63](file://src/config/config.ts#L1-L63)
- [src/utils/VideoObserver.ts:132-645](file://src/utils/VideoObserver.ts#L132-L645)
- [src/bootstrap/videoObserverBinding.ts:30-179](file://src/bootstrap/videoObserverBinding.ts#L30-L179)
- [src/index.ts:114-520](file://src/index.ts#L114-L520)
- [src/extension/bridge.ts:26-699](file://src/extension/bridge.ts#L26-L699)
- [src/extension/webext.ts:56-187](file://src/extension/webext.ts#L56-L187)

**Section sources**
- [src/index.ts:1-1594](file://src/index.ts#L1-L1594)
- [src/config/config.ts:1-63](file://src/config/config.ts#L1-L63)

## Performance Considerations
- Lazy initialization: UIManager and SubtitlesWidget are created on demand to reduce overhead.
- Debouncing and throttling: IntervalIdleChecker drives periodic tasks to minimize CPU usage.
- Single-flight language detection: Shared language state prevents duplicate detection requests.
- Retry and backoff: TranslationHandler schedules retries with exponential-like delays.
- Binary response handling: Bridge aggregates base64 chunks into ArrayBuffers efficiently.
- Smart layout caching: SubtitlesWidget caches layout computations and resets only on changes.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and diagnostics:
- Translation failures: VOTTranslationHandler maps backend errors to localized UI errors and notifies users. Check error translation cache and retry logic.
- Audio download failures: On failure, the handler attempts fallback routes and signals completion to resume translation polling.
- Bridge XHR errors: Bridge logs and summarizes request bodies, strips sensitive headers, and normalizes UA-CH headers for Yandex endpoints.
- Runtime activation failures: ensureRuntimeActivated guards against duplicate activations and handles iframe contexts.
- Video detection misses: Verify VideoObserver filters and Shadow DOM hooks are installed; confirm service configuration and container selectors.

**Section sources**
- [src/core/translationHandler.ts:68-98](file://src/core/translationHandler.ts#L68-L98)
- [src/extension/bridge.ts:580-699](file://src/extension/bridge.ts#L580-L699)
- [src/bootstrap/runtimeActivation.ts:20-58](file://src/bootstrap/runtimeActivation.ts#L20-L58)
- [src/utils/VideoObserver.ts:530-550](file://src/utils/VideoObserver.ts#L530-L550)

## Conclusion
The English Teacher project employs a robust, modular architecture that cleanly separates concerns across translation orchestration, UI, audio processing, and language learning. The extension bridge pattern ensures cross-browser compatibility by isolating privileged operations. The bootstrapping process guarantees runtime readiness, while the video detection subsystem efficiently discovers and manages video lifecycles. The documented component interactions and patterns provide a clear foundation for extending functionality, integrating new services, and maintaining performance and reliability.