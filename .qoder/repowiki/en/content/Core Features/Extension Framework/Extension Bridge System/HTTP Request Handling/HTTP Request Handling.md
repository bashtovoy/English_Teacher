# HTTP Request Handling

<cite>
**Referenced Files in This Document**
- [background.ts](file://src/extension/background.ts)
- [bridge.ts](file://src/extension/bridge.ts)
- [prelude.ts](file://src/extension/prelude.ts)
- [bodySerialization.ts](file://src/extension/bodySerialization.ts)
- [base64.ts](file://src/extension/base64.ts)
- [bridgeTransport.ts](file://src/extension/bridgeTransport.ts)
- [yandexHeaders.ts](file://src/extension/yandexHeaders.ts)
- [constants.ts](file://src/extension/constants.ts)
- [gm.ts](file://src/utils/gm.ts)
- [gm.ts](file://src/types/utils/gm.ts)
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
This document explains the HTTP request handling system that proxies GM_xmlhttpRequest operations through the extension's background service worker. It covers the complete request lifecycle from initiation in the page world to completion in the content script, including port establishment, progress tracking, response processing, binary data handling with base64 encoding, chunk aggregation, Yandex API header normalization, timeout handling, error propagation, and terminal event cleanup.

## Project Structure
The HTTP request handling spans three execution contexts:
- Page world (MAIN): Provides GM_xmlhttpRequest polyfills and manages callbacks/promises.
- Isolated content script (bridge): Bridges to the background service worker and manages binary aggregation and UA-CH header injection for Yandex.
- Background service worker: Executes fetch(), streams binary responses, applies DNR header rules, and posts terminal events.

```mermaid
graph TB
subgraph "Page World (MAIN)"
P["prelude.ts<br/>GM_xmlhttpRequest polyfill"]
end
subgraph "Isolated Content Script (Bridge)"
B["bridge.ts<br/>Port management<br/>Binary aggregation<br/>UA-CH injection"]
BT["bridgeTransport.ts<br/>Transferables"]
end
subgraph "Background Service Worker"
BG["background.ts<br/>fetch() execution<br/>DNR header rules<br/>Streaming"]
BS["bodySerialization.ts<br/>Body serialization/coercion"]
BB["base64.ts<br/>Base64 encode/decode"]
YH["yandexHeaders.ts<br/>Header normalization"]
C["constants.ts<br/>Message types/port name"]
end
P --> B
B --> BG
B --> BT
BG --> BS
BG --> BB
B --> YH
BG --> YH
B --> C
BG --> C
```

**Diagram sources**
- [prelude.ts:1-641](file://src/extension/prelude.ts#L1-L641)
- [bridge.ts:1-699](file://src/extension/bridge.ts#L1-L699)
- [background.ts:1-1086](file://src/extension/background.ts#L1-L1086)
- [bodySerialization.ts:1-570](file://src/extension/bodySerialization.ts#L1-L570)
- [base64.ts:1-128](file://src/extension/base64.ts#L1-L128)
- [bridgeTransport.ts:1-46](file://src/extension/bridgeTransport.ts#L1-L46)
- [yandexHeaders.ts:1-56](file://src/extension/yandexHeaders.ts#L1-L56)
- [constants.ts:1-102](file://src/extension/constants.ts#L1-L102)

**Section sources**
- [prelude.ts:1-641](file://src/extension/prelude.ts#L1-L641)
- [bridge.ts:1-699](file://src/extension/bridge.ts#L1-L699)
- [background.ts:1-1086](file://src/extension/background.ts#L1-L1086)
- [constants.ts:1-102](file://src/extension/constants.ts#L1-L102)

## Core Components
- Precedence and polyfills: The page world installs GM_xmlhttpRequest and GM4 promise APIs, serializes bodies, and forwards requests to the bridge.
- Bridge: Manages extension messaging ports, normalizes headers for Yandex, injects UA-CH headers, aggregates binary chunks, and posts events to the page.
- Background: Executes fetch(), applies DNR header rules for Yandex endpoints, streams binary responses, and posts terminal events.
- Serialization and base64: Converts binary bodies to base64 for transport and decodes them back into ArrayBuffers or Blobs.
- Transport: Uses Transferable objects to move ArrayBuffer chunks efficiently across message boundaries.

**Section sources**
- [prelude.ts:288-380](file://src/extension/prelude.ts#L288-L380)
- [bridge.ts:335-561](file://src/extension/bridge.ts#L335-L561)
- [background.ts:535-925](file://src/extension/background.ts#L535-L925)
- [bodySerialization.ts:466-570](file://src/extension/bodySerialization.ts#L466-L570)
- [base64.ts:110-128](file://src/extension/base64.ts#L110-L128)
- [bridgeTransport.ts:9-25](file://src/extension/bridgeTransport.ts#L9-L25)

## Architecture Overview
The system routes GM_xmlhttpRequest through a structured pipeline:
- Page world creates a request ID, serializes the body, and sends TYPE_XHR_START to the bridge.
- Bridge establishes a port named "vot_gm_xhr" and forwards the request to the background.
- Background applies DNR rules for Yandex endpoints, executes fetch(), streams binary responses, and posts progress and terminal events.
- Bridge aggregates binary chunks, converts them to ArrayBuffer or Blob, and posts events to the page.
- Page world invokes callbacks and resolves/rejects promises based on terminal events.

```mermaid
sequenceDiagram
participant Page as "Page World (MAIN)"
participant Bridge as "Bridge (Isolated)"
participant SW as "Background SW"
participant Net as "Network"
Page->>Bridge : TYPE_XHR_START (requestId, details)
Bridge->>SW : connect(PORT_NAME=vot_gm_xhr)
SW-->>Bridge : port established
Bridge->>SW : start (details with serialized body)
SW->>SW : apply DNR header rules (Yandex)
SW->>Net : fetch(url, init)
Net-->>SW : Response stream
loop Binary streaming
SW-->>Bridge : progress (chunkB64)
Bridge->>Bridge : decode base64 -> ArrayBuffer
Bridge->>Page : TYPE_XHR_EVENT (progress)
end
SW-->>Bridge : load (final response)
Bridge->>Page : TYPE_XHR_EVENT (load)
Page->>Page : onload/onprogress callbacks
```

**Diagram sources**
- [prelude.ts:309-380](file://src/extension/prelude.ts#L309-L380)
- [bridge.ts:335-468](file://src/extension/bridge.ts#L335-L468)
- [background.ts:535-925](file://src/extension/background.ts#L535-L925)

## Detailed Component Analysis

### Request Initiation (Page World)
- Creates a unique request ID and stores callback state.
- Serializes the request body using bridge serialization helpers to prevent cross-world degradation.
- Sends TYPE_XHR_START with method, URL, headers, serialized data, timeout, responseType, and credentials flags.
- Arms a fallback watchdog timer to trigger timeout callbacks if no progress arrives within timeout + grace period.

```mermaid
flowchart TD
Start([Initiate GM_xmlhttpRequest]) --> GenId["Generate requestId"]
GenId --> Serialize["Serialize body for port"]
Serialize --> SendStart["Send TYPE_XHR_START"]
SendStart --> AckWait["Wait for TYPE_XHR_ACK"]
AckWait --> ProgressLoop{"Progress events?"}
ProgressLoop --> |Yes| OnProgress["Invoke onprogress"]
ProgressLoop --> |No| TimeoutCheck{"Timeout reached?"}
TimeoutCheck --> |Yes| FireTimeout["Fire ontimeout and abort"]
TimeoutCheck --> |No| ProgressLoop
OnProgress --> ProgressLoop
FireTimeout --> End([End])
```

**Diagram sources**
- [prelude.ts:309-380](file://src/extension/prelude.ts#L309-L380)
- [prelude.ts:167-211](file://src/extension/prelude.ts#L167-L211)
- [prelude.ts:506-523](file://src/extension/prelude.ts#L506-L523)
- [prelude.ts:576-611](file://src/extension/prelude.ts#L576-L611)

**Section sources**
- [prelude.ts:309-380](file://src/extension/prelude.ts#L309-L380)
- [prelude.ts:167-211](file://src/extension/prelude.ts#L167-L211)
- [prelude.ts:506-523](file://src/extension/prelude.ts#L506-L523)
- [prelude.ts:576-611](file://src/extension/prelude.ts#L576-L611)

### Port Establishment and Message Types
- Bridge connects to the background using a fixed port name "vot_gm_xhr".
- Defines message types for REQ/RES, NOTIFY, XHR_START, XHR_ABORT, XHR_ACK, and XHR_EVENT.
- Uses a marker to distinguish bridge messages from unrelated postMessage traffic.

```mermaid
classDiagram
class Constants {
+PORT_NAME="vot_gm_xhr"
+TYPE_XHR_START
+TYPE_XHR_ABORT
+TYPE_XHR_ACK
+TYPE_XHR_EVENT
+TYPE_REQ
+TYPE_RES
+TYPE_NOTIFY
}
class Bridge {
+connect()
+postMessage()
+onMessage()
+onDisconnect()
}
Constants <.. Bridge : "uses"
```

**Diagram sources**
- [constants.ts:26-102](file://src/extension/constants.ts#L26-L102)
- [bridge.ts:365-380](file://src/extension/bridge.ts#L365-L380)

**Section sources**
- [constants.ts:26-102](file://src/extension/constants.ts#L26-L102)
- [bridge.ts:365-380](file://src/extension/bridge.ts#L365-L380)

### Binary Data Handling and Base64 Encoding
- Bodies can be strings, ArrayBuffer, TypedArray, Blob, or JSON-serializable objects.
- Serialized envelopes carry base64-encoded bytes and optional MIME type for Blobs.
- Decoding converts base64 to Uint8Array, then to ArrayBuffer or Blob as needed.
- For large binary responses, the background streams chunks as base64; the bridge decodes and aggregates them into a single ArrayBuffer.

```mermaid
flowchart TD
In([Incoming body]) --> CheckType{"Is body already serialized?"}
CheckType --> |Yes| UseExisting["Use existing envelope"]
CheckType --> |No| Detect["Detect type (ArrayBuffer/TypedArray/Blob/Object)"]
Detect --> Coerce["Coerce to bytes (Uint8Array)"]
Coerce --> Encode["Encode to base64"]
Encode --> Envelope["Create envelope {__votExtBody:true, kind, b64[, mime]}"]
Envelope --> Out([Serialized body])
subgraph "Decoding path"
Encoded["Base64 string"] --> Decode["Decode to Uint8Array"]
Decode --> Kind{"Response type?"}
Kind --> |arraybuffer/blob| AB["Create ArrayBuffer or Blob"]
Kind --> |text/json| Text["Use text or JSON"]
end
```

**Diagram sources**
- [bodySerialization.ts:466-570](file://src/extension/bodySerialization.ts#L466-L570)
- [base64.ts:110-128](file://src/extension/base64.ts#L110-L128)
- [bridge.ts:412-455](file://src/extension/bridge.ts#L412-L455)

**Section sources**
- [bodySerialization.ts:12-570](file://src/extension/bodySerialization.ts#L12-L570)
- [base64.ts:110-128](file://src/extension/base64.ts#L110-L128)
- [bridge.ts:412-455](file://src/extension/bridge.ts#L412-L455)

### Yandex API Header Normalization
- For Yandex API hosts, the bridge strips sensitive headers and injects minimal UA-CH headers required by the known-good capture.
- The background applies declarativeNetRequest (DNR) rules to remove Origin/Referer and suppress extra UA-CH headers, then sets only allowed headers.
- This ensures endpoints like video translation requests validate the request as originating from a real Chromium tab.

```mermaid
flowchart TD
HostCheck["Check Yandex API hostname"] --> |Yes| Strip["Strip sensitive headers"]
HostCheck --> |No| Skip["Skip normalization"]
Strip --> UA["Inject minimal UA-CH headers"]
UA --> DNR["Apply DNR rules (remove/add headers)"]
DNR --> Fetch["Execute fetch()"]
Skip --> Fetch
```

**Diagram sources**
- [bridge.ts:489-503](file://src/extension/bridge.ts#L489-L503)
- [yandexHeaders.ts:21-55](file://src/extension/yandexHeaders.ts#L21-L55)
- [background.ts:193-262](file://src/extension/background.ts#L193-L262)

**Section sources**
- [bridge.ts:489-503](file://src/extension/bridge.ts#L489-L503)
- [yandexHeaders.ts:21-55](file://src/extension/yandexHeaders.ts#L21-L55)
- [background.ts:193-262](file://src/extension/background.ts#L193-L262)

### Response Processing and Streaming
- The background determines responseType and processes responses accordingly:
  - text/json: reads text and parses JSON when needed.
  - arraybuffer/blob/stream: streams binary via a reader; small responses fit inline as base64; large responses stream chunks.
- Progress events include loaded/total and lengthComputable for progress tracking.
- Terminal events include load/error/timeout/abort with final status and response metadata.

```mermaid
flowchart TD
Start([Fetch response]) --> RespType{"responseType"}
RespType --> |text/json| TextPath["Read text<br/>Parse JSON if needed"]
RespType --> |arraybuffer/blob| BinPath["Compute content-length"]
BinPath --> Large{"Content-length > threshold?"}
Large --> |Yes| Stream["Stream chunks (base64)"]
Large --> |No| Inline["Read entire ArrayBuffer<br/>Base64 inline"]
Stream --> Progress["Post progress events"]
Inline --> Load["Post load with responseB64"]
TextPath --> Load
Progress --> Load
Load --> End([Terminal])
```

**Diagram sources**
- [background.ts:786-870](file://src/extension/background.ts#L786-L870)
- [background.ts:802-834](file://src/extension/background.ts#L802-L834)

**Section sources**
- [background.ts:786-870](file://src/extension/background.ts#L786-L870)
- [background.ts:802-834](file://src/extension/background.ts#L802-L834)

### Timeout Handling and Error Propagation
- The background sets an AbortController and a timeout timer; on timeout, it aborts the fetch.
- The bridge maintains a fallback watchdog that triggers ontimeout if no progress arrives within timeout + grace period.
- Errors propagate as terminal error events with error messages; aborts are distinguished by AbortError or explicit abort/timeout signals.

```mermaid
flowchart TD
Start([Start request]) --> Timer["Start timeout timer"]
Timer --> AbortCheck{"Abort requested?"}
AbortCheck --> |Yes| Abort["Abort fetch"]
AbortCheck --> |No| Running["Running"]
Running --> Timeout{"Timeout reached?"}
Timeout --> |Yes| Abort
Timeout --> |No| Running
Abort --> Terminal["Post terminal abort/error"]
```

**Diagram sources**
- [background.ts:603-615](file://src/extension/background.ts#L603-L615)
- [background.ts:871-923](file://src/extension/background.ts#L871-L923)
- [prelude.ts:167-211](file://src/extension/prelude.ts#L167-L211)

**Section sources**
- [background.ts:603-615](file://src/extension/background.ts#L603-L615)
- [background.ts:871-923](file://src/extension/background.ts#L871-L923)
- [prelude.ts:167-211](file://src/extension/prelude.ts#L167-L211)

### Terminal Event Cleanup
- After terminal events (load/error/timeout/abort), the bridge disconnects the port and removes the request state.
- The background cleans up timers and ensures no lingering resources remain.

```mermaid
flowchart TD
Terminal["Receive terminal event"] --> Disconnect["Disconnect port"]
Disconnect --> Remove["Remove request state"]
Remove --> End([Cleanup complete])
```

**Diagram sources**
- [bridge.ts:459-467](file://src/extension/bridge.ts#L459-L467)
- [background.ts:516-521](file://src/extension/background.ts#L516-L521)

**Section sources**
- [bridge.ts:459-467](file://src/extension/bridge.ts#L459-L467)
- [background.ts:516-521](file://src/extension/background.ts#L516-L521)

## Dependency Analysis
The following diagram shows key dependencies among modules involved in HTTP request handling:

```mermaid
graph LR
P["prelude.ts"] --> B["bridge.ts"]
B --> BG["background.ts"]
B --> BT["bridgeTransport.ts"]
BG --> BS["bodySerialization.ts"]
BG --> BB["base64.ts"]
B --> YH["yandexHeaders.ts"]
BG --> YH
B --> C["constants.ts"]
BG --> C
P --> GMU["utils/gm.ts"]
GMU --> P
```

**Diagram sources**
- [prelude.ts:1-641](file://src/extension/prelude.ts#L1-L641)
- [bridge.ts:1-699](file://src/extension/bridge.ts#L1-L699)
- [background.ts:1-1086](file://src/extension/background.ts#L1-L1086)
- [bodySerialization.ts:1-570](file://src/extension/bodySerialization.ts#L1-L570)
- [base64.ts:1-128](file://src/extension/base64.ts#L1-L128)
- [bridgeTransport.ts:1-46](file://src/extension/bridgeTransport.ts#L1-L46)
- [yandexHeaders.ts:1-56](file://src/extension/yandexHeaders.ts#L1-L56)
- [constants.ts:1-102](file://src/extension/constants.ts#L1-L102)
- [gm.ts:1-248](file://src/utils/gm.ts#L1-L248)

**Section sources**
- [prelude.ts:1-641](file://src/extension/prelude.ts#L1-L641)
- [bridge.ts:1-699](file://src/extension/bridge.ts#L1-L699)
- [background.ts:1-1086](file://src/extension/background.ts#L1-L1086)
- [bodySerialization.ts:1-570](file://src/extension/bodySerialization.ts#L1-L570)
- [base64.ts:1-128](file://src/extension/base64.ts#L1-L128)
- [bridgeTransport.ts:1-46](file://src/extension/bridgeTransport.ts#L1-L46)
- [yandexHeaders.ts:1-56](file://src/extension/yandexHeaders.ts#L1-L56)
- [constants.ts:1-102](file://src/extension/constants.ts#L1-L102)
- [gm.ts:1-248](file://src/utils/gm.ts#L1-L248)

## Performance Considerations
- Binary streaming threshold: Responses larger than a configured threshold are streamed as chunks to avoid large base64 payloads in extension messaging.
- Transferables: The bridge transport marks and extracts Transferable objects to minimize copies when posting progress chunks and final responses.
- UA-CH caching: The bridge caches minimal UA-CH headers for a short TTL to reduce repeated high-entropy queries.
- DNR rule batching: The background queues DNR rule updates to avoid race conditions and redundant updates.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and diagnostics:
- Port disconnect before terminal event: The bridge logs and posts an error event; verify the page script did not unload prematurely.
- Timeout without progress: The fallback watchdog fires ontimeout; increase timeout or check network connectivity.
- Aborted requests: Verify abort calls and ensure no race with early termination.
- Binary response mismatch: Confirm responseType matches expected type; arraybuffer yields ArrayBuffer, blob yields Blob, text/json yields strings or parsed objects.
- Yandex API failures: Ensure UA-CH headers are injected and forbidden headers are removed via DNR rules.

**Section sources**
- [bridge.ts:470-485](file://src/extension/bridge.ts#L470-L485)
- [prelude.ts:167-211](file://src/extension/prelude.ts#L167-L211)
- [background.ts:871-923](file://src/extension/background.ts#L871-L923)

## Conclusion
The HTTP request handling system provides a robust, cross-world bridge for GM_xmlhttpRequest. It serializes bodies safely, normalizes headers for Yandex endpoints, streams binary responses efficiently, and propagates progress and terminal events reliably. The design balances compatibility with userscript managers and the constraints of MV3 extension architecture.