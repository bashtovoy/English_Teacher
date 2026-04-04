# AudioDownloader Module Documentation

This document provides detailed documentation for the AudioDownloader module, which handles extracting audio tracks from videos to send to the Yandex translation API.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [AudioDownloader Class](#audiodownloader-class)
- [Strategies](#strategies)
- [Events](#events)
- [Types](#types)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Implementation Details](#implementation-details)

---

## Overview

The AudioDownloader module is responsible for extracting audio tracks from video platforms (primarily YouTube) so they can be sent to Yandex Translate for voice-over translation. This is necessary when the Yandex server requires the client to upload the audio source before generating a translation.

### Purpose

- Extract audio from video sources
- Stream audio data in chunks for efficient processing
- Handle errors gracefully with event-driven feedback
- Support multiple extraction strategies

### Key Features

- **Chunked Streaming** - Audio is delivered in chunks rather than all at once, enabling processing of large files
- **Event-Driven** - Uses events to notify about downloaded audio, partial downloads, and errors
- **Abort Support** - All download operations support cancellation via `AbortSignal`
- **Strategy Pattern** - Extensible architecture allows adding new extraction strategies

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AudioDownloader                       │
│                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │  Strategy Registry  │   │  Event System           │  │
│  │                     │   │                         │  │
│  │  - ytAudio          │   │  - downloadedAudio      │  │
│  │  - (future)         │   │  - downloadedPartial    │  │
│  └─────────┬───────────┘   │  - downloadError        │  │
│            │               └────┬────────────────────┘  │
│            │                    │                       │
│  ┌─────────▼────────────────────▼──────────────────┐    │
│  │              Strategy Executor                   │    │
│  │                                                  │    │
│  │  1. Get audio data (URLs, fileId)               │    │
│  │  2. Validate media parts                       │    │
│  │  3. Stream chunks via async iterator           │    │
│  │  4. Dispatch events for each chunk             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │
         │ calls
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Strategies                           │
│                                                         │
│  ┌───────────────┐    ┌───────────────────────────────┐ │
│  │  ytAudio      │    │  (Future strategies)          │ │
│  │               │    │                               │ │
│  │  YouTube      │    │  - web_api_slow               │ │
│  │  extraction   │    │  - web_api_steal_sig_and_n    │ │
│  └───────────────┘    └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## AudioDownloader Class

### Constructor

```typescript
constructor(strategy: AvailableAudioDownloadType = YT_AUDIO_STRATEGY)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `strategy` | `AvailableAudioDownloadType` | `"ytAudio"` | The extraction strategy to use |

**Example:**

```typescript
import { AudioDownloader, YT_AUDIO_STRATEGY } from "./src/audioDownloader";

// Use default strategy (ytAudio)
const downloader = new AudioDownloader();

// Explicitly specify strategy
const downloader2 = new AudioDownloader(YT_AUDIO_STRATEGY);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `onDownloadedAudio` | `EventImpl<[string, DownloadedAudioData]>` | Event fired when complete audio is downloaded |
| `onDownloadedPartialAudio` | `EventImpl<[string, DownloadedPartialAudioData]>` | Event fired for each audio chunk |
| `onDownloadAudioError` | `EventImpl<[string]>` | Event fired when download fails |
| `strategy` | `AvailableAudioDownloadType` | Current extraction strategy |

### Methods

#### `runAudioDownload()`

Starts the audio download process for a given video.

```typescript
async runAudioDownload(
  videoId: string,
  translationId: string,
  signal: AbortSignal
): Promise<void>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `videoId` | `string` | Unique identifier for the video |
| `translationId` | `string` | Unique identifier for the translation session |
| `signal` | `AbortSignal` | AbortSignal to cancel the download if needed |

**Example:**

```typescript
const controller = new AbortController();

const downloader = new AudioDownloader();
downloader.runAudioDownload("abc123", "trans_001", controller.signal);

// To cancel:
controller.abort("Download cancelled");
```

#### `addEventListener()`

Registers event listeners for audio download events.

```typescript
// For complete audio
addEventListener(
  type: "downloadedAudio",
  listener: (translationId: string, data: DownloadedAudioData) => void
): this

// For partial audio chunks
addEventListener(
  type: "downloadedPartialAudio",
  listener: (translationId: string, data: DownloadedPartialAudioData) => void
): this

// For errors
addEventListener(
  type: "downloadAudioError",
  listener: (videoId: string) => void
): this
```

**Example:**

```typescript
downloader
  .addEventListener("downloadedPartialAudio", (translationId, data) => {
    console.log(`Chunk ${data.index}/${data.amount} received`);
    uploadToYandex(data.audioData);
  })
  .addEventListener("downloadedAudio", (translationId, data) => {
    console.log("Full audio downloaded");
    finalizeTranslation(data.audioData);
  })
  .addEventListener("downloadAudioError", (videoId) => {
    console.error(`Failed to download audio for video: ${videoId}`);
    handleDownloadError(videoId);
  });
```

#### `removeEventListener()`

Removes previously registered event listeners.

```typescript
removeEventListener(
  type: "downloadedAudio" | "downloadedPartialAudio" | "downloadAudioError",
  listener: Function
): this
```

---

## Strategies

### Currently Implemented

#### `ytAudio`

Extracts audio from YouTube videos using the platform's internal APIs.

**File:** `src/audioDownloader/ytAudio/strategy.ts`

**How it works:**

1. Parses YouTube player response
2. Extracts audio stream URLs
3. Returns an async iterator for streaming chunks

**Return Type:**

```typescript
interface AudioDataResult {
  fileId: string;
  mediaPartsLength: number;
  getMediaBuffers: () => AsyncIterable<Uint8Array>;
}
```

### Future Strategies (Not Implemented)

These strategies exist in the Yandex Browser implementation but are currently broken or incompatible:

| Strategy | Status | Notes |
|----------|--------|-------|
| `web_api_slow` | Broken | Slow API extraction method |
| `web_api_steal_sig_and_n` | Broken | Signature stealing method |

---

## Events

### `downloadedAudio`

Fired when the complete audio has been successfully downloaded.

**Payload:**

```typescript
[translationId: string, data: DownloadedAudioData]
```

**DownloadedAudioData:**

```typescript
interface DownloadedAudioData {
  videoId: string;
  fileId: string;
  audioData: Uint8Array;
}
```

### `downloadedPartialAudio`

Fired for each chunk of audio data during download. This is the primary event for streaming audio to the translation service.

**Payload:**

```typescript
[translationId: string, data: DownloadedPartialAudioData]
```

**DownloadedPartialAudioData:**

```typescript
interface DownloadedPartialAudioData {
  videoId: string;
  fileId: string;
  audioData: Uint8Array;
  version: number;       // Protocol version (currently 1)
  index: number;         // Current chunk index (0-based)
  amount: number;        // Total number of chunks
}
```

### `downloadAudioError`

Fired when audio download fails.

**Payload:**

```typescript
[videoId: string]
```

---

## Types

### AudioDownloadRequestOptions

Options passed to the internal download request handler.

```typescript
interface AudioDownloadRequestOptions {
  audioDownloader: AudioDownloader;
  translationId: string;
  videoId: string;
  signal: AbortSignal;
}
```

### AvailableAudioDownloadType

Union type of all available extraction strategies.

```typescript
type AvailableAudioDownloadType = "ytAudio";
```

### Strategy Function Type

Each strategy function follows this signature:

```typescript
type StrategyFunction = (params: {
  videoId: string;
  signal: AbortSignal;
}) => Promise<AudioDataResult | null>;

interface AudioDataResult {
  fileId: string;
  mediaPartsLength: number;
  getMediaBuffers: () => AsyncIterable<Uint8Array>;
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { AudioDownloader } from "./audioDownloader";

const downloader = new AudioDownloader();

// Set up listeners
downloader.addEventListener("downloadedPartialAudio", (translationId, data) => {
  console.log(`Received chunk ${data.index + 1}/${data.amount}`);
  // Send chunk to translation service
  sendToTranslation(data.audioData, data.index);
});

downloader.addEventListener("downloadedAudio", (translationId, data) => {
  console.log("Audio download complete");
  finalizeTranslation(data.audioData);
});

downloader.addEventListener("downloadAudioError", (videoId) => {
  console.error(`Audio download failed for video: ${videoId}`);
  showErrorMessage(videoId);
});

// Start download
const controller = new AbortController();
await downloader.runAudioDownload("myVideoId", "trans_123", controller.signal);
```

### Integration with Translation Pipeline

```typescript
class VideoHandler {
  private audioDownloader: AudioDownloader;

  constructor() {
    this.audioDownloader = new AudioDownloader();
    this.setupAudioListeners();
  }

  private setupAudioListeners() {
    this.audioDownloader.addEventListener(
      "downloadedPartialAudio",
      async (translationId, data) => {
        await this.uploadAudioChunk(translationId, data);
      }
    );

    this.audioDownloader.addEventListener(
      "downloadAudioError",
      (videoId) => {
        this.handleTranslationError(videoId);
      }
    );
  }

  async startTranslation(videoId: string) {
    const translationId = this.createTranslationSession(videoId);
    const controller = new AbortController();

    this.translationControllers.set(translationId, controller);

    await this.audioDownloader.runAudioDownload(
      videoId,
      translationId,
      controller.signal
    );
  }
}
```

### Cleanup and Abort

```typescript
const controller = new AbortController();

// Store reference for later abort
this.currentDownload = { controller, translationId };

// Start download
await downloader.runAudioDownload(videoId, translationId, controller.signal);

// Later, cancel if needed
if (this.currentDownload) {
  this.currentDownload.controller.abort("Video changed");
  this.currentDownload = null;
}
```

---

## Error Handling

### Internal Errors

The module validates data at multiple points:

1. **Media Parts Length Validation**

```typescript
function assertValidMediaPartsLength(mediaPartsLength: number): void {
  if (!Number.isInteger(mediaPartsLength) || mediaPartsLength < 1) {
    throw new Error("Audio downloader. Invalid media parts length");
  }
}
```

2. **Audio Chunk Validation**

```typescript
function assertHasAudioChunk(chunk: Uint8Array | undefined): Uint8Array {
  if (!chunk || chunk.byteLength === 0) {
    throw new Error("Audio downloader. Empty audio");
  }
  return chunk;
}
```

3. **Chunk Count Verification**

After all chunks are downloaded, the module verifies the expected count matches:

```typescript
if (index !== mediaPartsLength) {
  throw new Error(
    `Audio downloader. Expected ${mediaPartsLength} chunks, got ${index}`
  );
}
```

### Error Events

All errors trigger the `downloadAudioError` event with the video ID. The original error is logged to debug output.

```typescript
try {
  await handleCommonAudioDownloadRequest(options);
} catch (err) {
  debug.error("Audio downloader. Failed to download audio", {
    videoId,
    error: err instanceof Error ? err.message : String(err),
  });
  this.onDownloadAudioError.dispatch(videoId);
}
```

---

## Implementation Details

### Download Flow

```
1. AudioDownloader.runAudioDownload() called
   │
2. handleCommonAudioDownloadRequest() called
   │
3. Strategy function executed for videoId
   │
4. Strategy returns AudioDataResult
   │
5. Validate media parts length
   │
   ├── If < 2 parts: Download single chunk and fire downloadedAudio
   │
   └── If ≥ 2 parts: Stream all chunks
        │
        ├── For each chunk:
        │     ├── Validate chunk
        │     └── Fire downloadedPartialAudio event
        │
        └── After all chunks:
              └── Verify count matches expected
```

### Event System (EventImpl)

The module uses `EventImpl` for type-safe event handling:

```typescript
onDownloadedAudio = new EventImpl<[string, DownloadedAudioData]>();
onDownloadedPartialAudio = new EventImpl<[string, DownloadedPartialAudioData]>();
onDownloadAudioError = new EventImpl<[string]>();
```

`EventImpl` provides:
- Type-safe listener registration
- Automatic listener cleanup
- Async dispatch support

---

## Adding New Strategies

To add a new audio extraction strategy:

1. **Create the strategy function:**

```typescript
// src/audioDownloader/strategies/myNewStrategy.ts
export async function getAudioFromMySource({
  videoId,
  signal,
}: {
  videoId: string;
  signal: AbortSignal;
}): Promise<AudioDataResult | null> {
  // Implementation
  return {
    fileId: "file_id_here",
    mediaPartsLength: 10,
    getMediaBuffers: async function* () {
      // Yield Uint8Array chunks
      yield new Uint8Array([...]);
    },
  };
}
```

2. **Register the strategy:**

```typescript
// src/audioDownloader/strategies/index.ts
import { getAudioFromMySource } from "./myNewStrategy";

export const MY_NEW_STRATEGY = "myNewStrategy";

export const strategies = {
  [YT_AUDIO_STRATEGY]: getAudioFromYtAudio,
  [MY_NEW_STRATEGY]: getAudioFromMySource,
} as const;
```

3. **Add tests:**

```typescript
// tests/audioDownloader.test.ts
describe("myNewStrategy", () => {
  it("should return valid audio data", async () => {
    const result = await getAudioFromMySource({
      videoId: "abc123",
      signal: new AbortController().signal,
    });
    
    expect(result).toBeDefined();
    expect(result?.mediaPartsLength).toBeGreaterThan(0);
  });
});
```

---

## Performance Considerations

- **Chunked Processing**: Audio is streamed in chunks to avoid large memory allocations
- **Abort Support**: Long-running downloads can be cancelled to free resources
- **Single Instance**: Only one downloader should be active per video to avoid redundant requests
- **Caching**: Consider caching audio data if the same video is translated multiple times

---

## Debug Logging

The module uses the project's debug system:

```typescript
debug.log("Audio downloader created", { strategy });
debug.log("Audio downloader. Url found", { audioDownloadType });
debug.log("Audio downloader. Audio download finished", { videoId });
debug.error("Audio downloader. Failed to download audio", { videoId, error });
```

Enable debug output to see detailed logs:

```typescript
import { debug } from "./utils/debug";
debug.enable();