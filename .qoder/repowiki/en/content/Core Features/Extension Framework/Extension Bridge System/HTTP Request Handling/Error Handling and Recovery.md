# Error Handling and Recovery

<cite>
**Referenced Files in This Document**
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)
- [errors.ts](file://src/utils/errors.ts)
- [debug.ts](file://src/utils/debug.ts)
- [constants.ts](file://src/extension/constants.ts)
- [bridgeTransport.ts](file://src/extension/bridgeTransport.ts)
- [abort.ts](file://src/utils/abort.ts)
- [background.ts](file://src/extension/background.ts)
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
This document explains the error handling and recovery mechanisms for the HTTP request system in the extension. It covers:
- Comprehensive error reporting for request failures, port disconnection issues, and serialization problems
- Fallback strategies for port unavailability, timeouts, and response type resolution failures
- Error message formatting and debugging information collection
- Graceful degradation when critical components fail
- Cleanup procedures for failed requests, resource deallocation, and state recovery
- Examples of common error scenarios, diagnostic techniques, and production recovery strategies

## Project Structure
The HTTP request pipeline spans three layers:
- MAIN-world polyfill that exposes a userscript-like API and manages GM_xmlhttpRequest lifecycle
- ISOLATED-world bridge that validates and forwards requests to the background service worker
- Background service worker that executes the actual fetch, applies DNR header rules, and streams responses

```mermaid
graph TB
subgraph "MAIN World"
P["prelude.ts<br/>GM_xmlhttpRequest polyfill"]
end
subgraph "ISOLATED World"
B["bridge.ts<br/>port management, UA-CH headers, binary assembly"]
BS["bodySerialization.ts<br/>body serialization and coercion"]
end
subgraph "Background (Service Worker)"
BG["background.ts<br/>fetch, DNR rules, streaming"]
end
subgraph "Utilities"
E["errors.ts<br/>error formatting"]
D["debug.ts<br/>conditional logging"]
C["constants.ts<br/>message types"]
T["bridgeTransport.ts<br/>transferables for binary"]
A["abort.ts<br/>AbortSignal helpers"]
end
P --> |TYPE_XHR_START/ABORT| B
B --> |start/abort| BG
BG --> |progress/load/error| B
B --> |TYPE_XHR_EVENT| P
P --> |error formatting| E
B --> |error formatting| E
P --> |debug logs| D
B --> |debug logs| D
B --> |binary assembly| T
P --> |serialization| BS
B --> |serialization| BS
P --> |AbortSignal helpers| A
BG --> |AbortSignal helpers| A
```

**Diagram sources**
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [background.ts](file://src/extension/background.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)
- [errors.ts](file://src/utils/errors.ts)
- [debug.ts](file://src/utils/debug.ts)
- [constants.ts](file://src/extension/constants.ts)
- [bridgeTransport.ts](file://src/extension/bridgeTransport.ts)
- [abort.ts](file://src/utils/abort.ts)

**Section sources**
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [background.ts](file://src/extension/background.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)
- [errors.ts](file://src/utils/errors.ts)
- [debug.ts](file://src/utils/debug.ts)
- [constants.ts](file://src/extension/constants.ts)
- [bridgeTransport.ts](file://src/extension/bridgeTransport.ts)
- [abort.ts](file://src/utils/abort.ts)

## Core Components
- GM_xmlhttpRequest polyfill and promise adapter in MAIN world
- Bridge port lifecycle, acknowledgment, and fallback watchdog
- Binary response assembly and response type resolution
- Serialization and coercion of request bodies across worlds
- Error message formatting and AbortSignal helpers
- Background fetch orchestration and DNR header injection

Key responsibilities:
- Pre-validate and serialize request bodies to prevent structured cloning failures
- Arm a fallback watchdog to detect stalled bridges and trigger timeout callbacks
- Detect port disconnections and emit terminal error events
- Assemble binary responses from base64 chunks and typed arrays
- Normalize and strip headers for specific hosts (e.g., Yandex) and inject UA client hints
- Provide canonical AbortError instances and timeout signals

**Section sources**
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)
- [errors.ts](file://src/utils/errors.ts)
- [abort.ts](file://src/utils/abort.ts)

## Architecture Overview
The request lifecycle and error handling flow:

```mermaid
sequenceDiagram
participant Page as "Page Script"
participant Polyfill as "prelude.ts"
participant Bridge as "bridge.ts"
participant BG as "background.ts"
Page->>Polyfill : GM_xmlhttpRequest(details)
Polyfill->>Polyfill : serialize body, wrap callbacks
Polyfill->>Bridge : post TYPE_XHR_START
Bridge->>BG : connect port and forward start
BG-->>Bridge : ack(TYPE_XHR_ACK)
Bridge-->>Polyfill : ack(TYPE_XHR_ACK) + arm watchdog
alt progress events
BG-->>Bridge : progress chunkB64
Bridge->>Bridge : decode base64 to ArrayBuffer
Bridge-->>Polyfill : TYPE_XHR_EVENT {type : "progress"}
end
alt load
BG-->>Bridge : load {response,responseType}
Bridge->>Bridge : assemble ArrayBuffer/Blob
Bridge-->>Polyfill : TYPE_XHR_EVENT {type : "load"}
end
opt error/timeout/abort
BG-->>Bridge : error/timeout/abort
Bridge-->>Polyfill : TYPE_XHR_EVENT {type : "error"/"timeout"/"abort"}
end
opt port disconnect
BG-->>Bridge : disconnect before terminal
Bridge-->>Polyfill : error (port disconnected)
end
opt fallback watchdog fires
Polyfill-->>Polyfill : timeout fallback triggers
Polyfill-->>Page : ontimeout callback
end
```

**Diagram sources**
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [background.ts](file://src/extension/background.ts)

## Detailed Component Analysis

### GM_xmlhttpRequest Polyfill and Promise Adapter (MAIN world)
Responsibilities:
- Wrap callbacks to ensure settlement semantics and prevent multiple resolutions
- Serialize request bodies before crossing worlds to avoid structured cloning issues
- Post TYPE_XHR_START to the bridge and track per-request callback state
- Arm a fallback watchdog to detect stalled bridges and trigger timeout callbacks
- Finalize requests by invoking appropriate callbacks and cleaning up state

Key behaviors:
- Settlement handlers call original callbacks and resolve/reject promises once
- Watchdog uses a grace period to avoid premature timeouts
- On fatal errors, emits terminal error payloads with standardized fields

```mermaid
flowchart TD
Start(["GM_xmlhttpRequest"]) --> Serialize["Serialize body for port"]
Serialize --> PostStart["Post TYPE_XHR_START to bridge"]
PostStart --> Ack{"Ack received?"}
Ack --> |No| TimeoutFallback["Arm fallback watchdog"]
Ack --> |Yes| Progress["Handle progress events"]
Progress --> Load["Handle load"]
Progress --> Timeout["Handle timeout"]
Progress --> Abort["Handle abort"]
Load --> Finalize["Call onload and cleanup"]
Timeout --> Finalize
Abort --> Finalize
TimeoutFallback --> FireTimeout["Fire ontimeout and cleanup"]
```

**Diagram sources**
- [prelude.ts](file://src/extension/prelude.ts)

**Section sources**
- [prelude.ts](file://src/extension/prelude.ts)

### Bridge Port Management and Fallback Watchdog
Responsibilities:
- Establish and manage a persistent port to the background service worker
- Validate and normalize headers, especially for specific hosts
- Assemble binary responses from base64 chunks and typed arrays
- Detect port disconnections and emit terminal error events
- Clean up resources and settle ports on terminal events

Key behaviors:
- Acknowledgment arms a watchdog timer with a grace period
- Disconnections trigger a terminal error event with a descriptive message
- Binary responses are reconstructed from chunks or base64 fallback

```mermaid
flowchart TD
Start(["startXhr"]) --> Connect["Connect to background port"]
Connect --> Ack["Send TYPE_XHR_ACK"]
Ack --> OnMsg{"onMessage"}
OnMsg --> Progress["progress: decode base64 to ArrayBuffer"]
OnMsg --> Load["load: assemble ArrayBuffer/Blob"]
OnMsg --> Error["error/timeout/abort: emit terminal"]
Progress --> Reemit["postXhrEvent"]
Load --> Reemit
Error --> Reemit
Reemit --> Terminal{"terminal event?"}
Terminal --> |Yes| Settle["disconnectPortSafely and cleanup"]
Terminal --> |No| Wait["continue listening"]
```

**Diagram sources**
- [bridge.ts](file://src/extension/bridge.ts)

**Section sources**
- [bridge.ts](file://src/extension/bridge.ts)

### Background Fetch Orchestration and DNR Header Injection
Responsibilities:
- Execute the actual fetch with proper credentials and caching options
- Apply declarativeNetRequest session rules to inject headers that cannot be set via fetch
- Stream progress and final responses back to the bridge
- Respect AbortSignals and enforce timeouts

Key behaviors:
- Respects anonymous/withCredentials flags and cache directives
- Applies DNR rules for specific hosts to ensure UA client hints are preserved
- Emits progress events for binary chunks and final load/error/timeout/abort events

**Section sources**
- [background.ts](file://src/extension/background.ts)

### Body Serialization and Coercion Across Worlds
Responsibilities:
- Detect and serialize ArrayBuffer, TypedArray, Blob, and File-like bodies
- Coerce cross-world wrappers into recoverable byte sequences
- Summarize bodies for debugging without leaking sensitive data
- Decode serialized bodies back into fetch/XHR-compatible forms

Key behaviors:
- Uses base64 encoding for binary payloads transported via JSON
- Attempts multiple recovery strategies for cross-compartment objects
- Provides safe debug summaries with limits on key counts and sizes

**Section sources**
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)

### Error Message Formatting and Abort Helpers
Responsibilities:
- Provide a unified error-to-string conversion that extracts meaningful messages
- Normalize AbortError instances and signals for consistent handling
- Create timeout signals that integrate with external AbortSignals

Key behaviors:
- Extracts nested message fields from error objects
- Falls back to serialized object representation or constructor names
- Ensures AbortError semantics across runtimes

**Section sources**
- [errors.ts](file://src/utils/errors.ts)
- [abort.ts](file://src/utils/abort.ts)

### Debugging Information Collection
Responsibilities:
- Conditional logging that can be toggled off in production builds
- Structured debug payloads for request lifecycle events
- Warnings and errors for exceptional conditions

Key behaviors:
- Logs acknowledgments, progress, and terminal events with status and timing
- Emits warnings for suspicious serialized bodies and port disconnections
- Provides context-rich payloads for diagnostics

**Section sources**
- [debug.ts](file://src/utils/debug.ts)
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)

## Dependency Analysis
The following diagram shows the primary dependencies among the error-handling components:

```mermaid
graph LR
P["prelude.ts"] --> E["errors.ts"]
P --> D["debug.ts"]
P --> BS["bodySerialization.ts"]
P --> C["constants.ts"]
P --> T["bridgeTransport.ts"]
B["bridge.ts"] --> E
B --> D
B --> BS
B --> C
B --> T
BG["background.ts"] --> BS
BG --> D
BG --> C
P --> A["abort.ts"]
BG --> A
```

**Diagram sources**
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [background.ts](file://src/extension/background.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)
- [errors.ts](file://src/utils/errors.ts)
- [debug.ts](file://src/utils/debug.ts)
- [constants.ts](file://src/extension/constants.ts)
- [bridgeTransport.ts](file://src/extension/bridgeTransport.ts)
- [abort.ts](file://src/utils/abort.ts)

**Section sources**
- [prelude.ts](file://src/extension/prelude.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [background.ts](file://src/extension/background.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)
- [errors.ts](file://src/utils/errors.ts)
- [debug.ts](file://src/utils/debug.ts)
- [constants.ts](file://src/extension/constants.ts)
- [bridgeTransport.ts](file://src/extension/bridgeTransport.ts)
- [abort.ts](file://src/utils/abort.ts)

## Performance Considerations
- Binary transfer optimization: Transferables are used to move ArrayBuffers efficiently between worlds
- Chunked assembly: Large binary responses are assembled incrementally to reduce memory pressure
- Header normalization: UA client hints are cached and injected via DNR to minimize repeated work
- Watchdog grace period: Prevents premature timeouts during slow network conditions

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common error scenarios and recovery strategies:
- Port unavailability or disconnection
  - Symptom: Terminal error event indicating bridge port disconnected
  - Recovery: Retry the request; the bridge replaces active requests and aborts previous ones
  - Diagnostic: Inspect acknowledgment and last bridge event timestamps
  - Section sources
    - [bridge.ts](file://src/extension/bridge.ts)
    - [prelude.ts](file://src/extension/prelude.ts)

- Timeout handling
  - Symptom: ontimeout callback invoked after fallback watchdog fires
  - Recovery: Increase timeout, retry with exponential backoff, or switch to a different endpoint
  - Diagnostic: Check watchdog grace period and last bridge event timestamps
  - Section sources
    - [prelude.ts](file://src/extension/prelude.ts)

- Response type resolution failures
  - Symptom: Binary response not delivered as ArrayBuffer or Blob
  - Recovery: Ensure responseType is set appropriately; the bridge reconstructs binary from chunks or base64 fallback
  - Diagnostic: Verify direct response, chunk aggregation, and fallback base64 presence
  - Section sources
    - [bridge.ts](file://src/extension/bridge.ts)

- Serialization problems for request bodies
  - Symptom: Bodies degrade to opaque objects or strings during cross-world transport
  - Recovery: Use the provided serialization helpers; they attempt multiple recovery strategies
  - Diagnostic: Review debug summaries for body kinds and lengths
  - Section sources
    - [bodySerialization.ts](file://src/extension/bodySerialization.ts)
    - [prelude.ts](file://src/extension/prelude.ts)

- Host-specific header issues (e.g., Yandex)
  - Symptom: Requests rejected due to missing or incorrect headers
  - Recovery: Allow the bridge to strip forbidden headers and inject UA client hints via DNR
  - Diagnostic: Confirm header normalization and DNR rule updates
  - Section sources
    - [bridge.ts](file://src/extension/bridge.ts)

- Abort handling
  - Symptom: Requests cancelled unexpectedly
  - Recovery: Use AbortSignal helpers to coordinate cancellations; ensure canonical AbortError semantics
  - Diagnostic: Check AbortError detection and timeout signal integration
  - Section sources
    - [abort.ts](file://src/utils/abort.ts)
    - [errors.ts](file://src/utils/errors.ts)

Cleanup and resource deallocation:
- Port cleanup: Disconnect ports and remove them from active maps on terminal events
- Callback cleanup: Clear timeout IDs and remove callback state after invocation
- Binary assembly: Reset chunk buffers and byte counters after assembling responses
- Watchdog cleanup: Clear timers when acknowledged or settled

**Section sources**
- [bridge.ts](file://src/extension/bridge.ts)
- [prelude.ts](file://src/extension/prelude.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)

## Conclusion
The HTTP request system employs layered error handling and recovery:
- The MAIN-world polyfill ensures robust callback settlement and fallback timeouts
- The bridge manages port lifecycles, binary assembly, and host-specific header normalization
- The background service worker executes fetch requests and streams responses with DNR header injection
- Utilities provide consistent error formatting, AbortSignal helpers, and conditional debugging

Together, these components deliver a resilient pipeline capable of diagnosing and recovering from port disconnections, timeouts, serialization issues, and response type mismatches, with careful cleanup and graceful degradation.