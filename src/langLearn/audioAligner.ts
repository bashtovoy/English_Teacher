/**
 * Audio Aligner Module
 * 
 * Provides word-level forced alignment for audio tracks using Whisper API.
 * This module implements the new pipeline:
 * 1. Extract audio segment
 * 2. Send to Whisper for word-level transcription
 * 3. Return precise word timestamps
 */

import type { SubtitleLine, SubtitleToken } from "../subtitles/types";

// ============================================================================
// Types
// ============================================================================

export interface WordAlignment {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface PhraseAlignment {
  text: string;
  startMs: number;
  endMs: number;
  words: WordAlignment[];
}

export interface AudioAlignerConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  language?: string;
  // WhisperX support
  provider?: 'openai' | 'replicate' | 'huggingface';
  replicateApiKey?: string;
  replicateModel?: string;
}

export interface AlignmentResult {
  words: WordAlignment[];
  phrases: PhraseAlignment[];
  duration: number;
}

export interface AlignerOptions {
  onProgress?: (progress: { text: string; progress: number; timeElapsed: number }) => void;
  log?: (event: string, payload: Record<string, unknown>) => void;
}

// Alignment provider type
export type AlignmentProvider = 'whisper' | 'whisperx' | 'auto';

// ============================================================================
// Configuration
// ============================================================================

const getEnvString = (key: string, fallback: string): string => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw?.trim() || fallback;
  } catch {
    return fallback;
  }
};

const getConfig = (): AudioAlignerConfig => ({
  apiKey: getEnvString("vot.langlearn.whisper.apiKey", ""),
  baseUrl: getEnvString("vot.langlearn.whisper.baseUrl", "https://api.openai.com/v1"),
  model: getEnvString("vot.langlearn.whisper.model", "whisper-1"),
  language: getEnvString("vot.langlearn.whisper.language", "en"),
  provider: (getEnvString("vot.langlearn.alignment.provider", "openai") as AudioAlignerConfig['provider']) ?? 'openai',
  replicateApiKey: getEnvString("vot.langlearn.replicate.apiKey", ""),
  replicateModel: getEnvString("vot.langlearn.replicate.model", "victor/whisperx"),
});

// ============================================================================
// Whisper API Client
// ============================================================================

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperSegment {
  text: string;
  start: number;
  end: number;
  words?: WhisperWord[];
}

interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
}

/**
 * Call Whisper API with word-level timestamps
 */
async function callWhisperApi(
  audioBlob: Blob,
  transcript: string,
  config: AudioAlignerConfig,
  options: AlignerOptions = {},
): Promise<WhisperResponse> {
  if (!config.apiKey) {
    throw new Error("Whisper API key not configured");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.mp3");
  formData.append("model", config.model ?? "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  
  if (config.language) {
    formData.append("language", config.language);
  }

  // If we have a transcript, use it for better alignment
  if (transcript) {
    formData.append("prompt", transcript.slice(0, 224)); // Whisper prompt limit
  }

  options.log?.("whisper_api_call", {
    model: config.model,
    audioSize: audioBlob.size,
    hasTranscript: Boolean(transcript),
  });

  const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Whisper API error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  return response.json();
}

// ============================================================================
// WhisperX via Replicate API
// ============================================================================

interface ReplicateWord {
  word: string;
  start: number;
  end: number;
  score?: number;
}

interface ReplicateSegment {
  text: string;
  start: number;
  end: number;
  words?: ReplicateWord[];
}

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: {
    text?: string;
    segments?: ReplicateSegment[];
    word_segments?: ReplicateWord[];
  };
  error?: string;
  urls?: {
    get?: string;
    cancel?: string;
  };
}

/**
 * Call WhisperX via Replicate API for phoneme-level alignment
 * More accurate than standard Whisper for word boundaries (~10-20ms vs ~50-100ms)
 */
async function callWhisperXViaReplicate(
  audioBlob: Blob,
  transcript: string,
  config: AudioAlignerConfig,
  options: AlignerOptions = {},
): Promise<WhisperResponse> {
  if (!config.replicateApiKey) {
    throw new Error("Replicate API key not configured for WhisperX");
  }

  options.log?.("whisperx_replicate_call", {
    model: config.replicateModel,
    audioSize: audioBlob.size,
    hasTranscript: Boolean(transcript),
  });

  // Convert audio to base64
  const audioBuffer = await audioBlob.arrayBuffer();
  const audioBase64 = btoa(
    new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
  const audioDataUrl = `data:audio/mp3;base64,${audioBase64}`;

  // Map language codes to WhisperX alignment models
  // These models provide phoneme-level forced alignment for precise word boundaries
  // VOXPOPULI is a multilingual model that supports many European languages
  const alignModelMap: Record<string, string> = {
    "en": "WAV2VEC2_ASR_LARGE_LV60K_960H",      // English - best accuracy
    "de": "VOXPOPULI",                            // German
    "fr": "VOXPOPULI",                            // French
    "es": "VOXPOPULI",                            // Spanish
    "it": "VOXPOPULI",                            // Italian
    "pt": "VOXPOPULI",                            // Portuguese
    "pl": "VOXPOPULI",                            // Polish
    "nl": "VOXPOPULI",                            // Dutch
    "sv": "VOXPOPULI",                            // Swedish
    "tr": "VOXPOPULI",                            // Turkish
    "ru": "VOXPOPULI",                            // Russian (multilingual)
    "ja": undefined as unknown as string,         // Japanese - auto-detect
    "ko": undefined as unknown as string,         // Korean - auto-detect
    "zh": undefined as unknown as string,         // Chinese - auto-detect
    "ar": undefined as unknown as string,         // Arabic - auto-detect
    "hi": undefined as unknown as string,         // Hindi - auto-detect
  };

  const language = config.language ?? "en";
  const alignModel = alignModelMap[language] ?? undefined; // undefined = auto-detect

  options.log?.("whisperx_language_config", {
    language,
    alignModel: alignModel ?? "auto",
  });

  // Start prediction
  const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${config.replicateApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: config.replicateModel ?? "victor/whisperx",
      input: {
        audio_file: audioDataUrl,
        language: language,
        return_timestamps: "word",
        // Use language-specific alignment model for accurate phoneme-level alignment
        align_model: alignModel,
        // Use transcript as initial prompt for better alignment
        initial_prompt: transcript ? transcript.slice(0, 224) : undefined,
      },
    }),
  });

  if (!startResponse.ok) {
    const errorText = await startResponse.text().catch(() => "");
    throw new Error(`Replicate API error ${startResponse.status}: ${errorText.slice(0, 200)}`);
  }

  const prediction = await startResponse.json() as ReplicatePrediction;
  const predictionUrl = prediction.urls?.get;

  if (!predictionUrl) {
    throw new Error("No prediction URL returned from Replicate");
  }

  // Poll for result
  let result = prediction;
  let attempts = 0;
  const maxAttempts = 180; // 3 minutes max for longer audio

  while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pollResponse = await fetch(predictionUrl, {
      headers: {
        "Authorization": `Token ${config.replicateApiKey}`,
      },
    });
    
    if (pollResponse.ok) {
      result = await pollResponse.json() as ReplicatePrediction;
    }
    attempts++;
    
    const progress = Math.min(0.9, attempts / maxAttempts);
    options.onProgress?.({
      text: `⏳ WhisperX обработка... (${attempts}s)`,
      progress: progress,
      timeElapsed: attempts * 1000,
    });
  }

  if (result.status === "failed") {
    throw new Error(`WhisperX failed: ${result.error || "Unknown error"}`);
  }

  if (attempts >= maxAttempts) {
    throw new Error("WhisperX timeout: processing took too long");
  }

  // Convert WhisperX output to WhisperResponse format
  const segments: WhisperSegment[] = [];
  
  if (result.output?.segments) {
    for (const seg of result.output.segments) {
      segments.push({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        words: seg.words?.map((w) => ({
          word: w.word ?? w.word,
          start: w.start,
          end: w.end,
        })),
      });
    }
  }

  options.log?.("whisperx_complete", {
    segmentCount: segments.length,
    wordCount: segments.reduce((sum, s) => sum + (s.words?.length ?? 0), 0),
    duration: attempts,
  });

  return {
    text: result.output?.text ?? "",
    segments,
  };
}

/**
 * Smart alignment function that chooses best available provider
 */
async function performAlignment(
  audioBlob: Blob,
  transcript: string,
  config: AudioAlignerConfig,
  options: AlignerOptions = {},
): Promise<WhisperResponse> {
  // Prefer WhisperX if Replicate is configured
  if (config.provider === 'replicate' && config.replicateApiKey) {
    options.log?.("alignment_provider_selected", { provider: "whisperx_replicate" });
    try {
      return await callWhisperXViaReplicate(audioBlob, transcript, config, options);
    } catch (error) {
      options.log?.("whisperx_fallback", { 
        error: error instanceof Error ? error.message : String(error),
        fallbackTo: "whisper_openai"
      });
      // Fallback to Whisper if WhisperX fails
      if (config.apiKey) {
        return callWhisperApi(audioBlob, transcript, config, options);
      }
      throw error;
    }
  }
  
  // Use OpenAI Whisper
  if (config.apiKey) {
    options.log?.("alignment_provider_selected", { provider: "whisper_openai" });
    return callWhisperApi(audioBlob, transcript, config, options);
  }
  
  throw new Error("No alignment provider configured. Please set up Whisper (OpenAI) or WhisperX (Replicate) API key.");
}

// ============================================================================
// Audio Extraction
// ============================================================================

/**
 * Extract audio segment from video element
 */
async function extractAudioSegment(
  video: HTMLVideoElement,
  startMs: number,
  endMs: number,
): Promise<Blob> {
  // Use MediaRecorder to capture audio from video
  const stream = (video as any).captureStream?.() as MediaStream;
  if (!stream) {
    throw new Error("captureStream not supported");
  }

  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    throw new Error("No audio tracks in video stream");
  }

  const audioStream = new MediaStream(audioTracks);
  const mediaRecorder = new MediaRecorder(audioStream, {
    mimeType: "audio/webm;codecs=opus",
  });

  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      resolve(blob);
    };

    mediaRecorder.onerror = () => {
      reject(new Error("MediaRecorder error"));
    };

    // Record the segment
    const originalTime = video.currentTime;
    const duration = (endMs - startMs) / 1000;

    video.currentTime = startMs / 1000;
    
    video.onseeked = () => {
      mediaRecorder.start();
      video.play().catch(reject);

      setTimeout(() => {
        video.pause();
        mediaRecorder.stop();
        video.currentTime = originalTime;
      }, duration * 1000 + 100);
    };
  });
}

/**
 * Get audio from video URL or element
 */
async function getAudioFromVideo(
  video: HTMLVideoElement,
  startMs: number,
  endMs: number,
): Promise<Blob> {
  // Try to extract audio segment
  try {
    return await extractAudioSegment(video, startMs, endMs);
  } catch (error) {
    // Fallback: try to get audio from src
    const videoSrc = video.src || (video.querySelector("source") as HTMLSourceElement)?.src;
    if (!videoSrc) {
      throw new Error("Cannot extract audio: no video source");
    }

    // Fetch and convert
    const response = await fetch(videoSrc);
    const blob = await response.blob();
    return blob;
  }
}

/**
 * Get audio from translation player (VOT audio element)
 */
async function getAudioFromTranslationPlayer(
  player: any,
  startMs: number,
  endMs: number,
): Promise<Blob | null> {
  const audioElement = player?.audioElement ?? player?.audio;
  if (!audioElement || !(audioElement instanceof HTMLMediaElement)) {
    return null;
  }

  // Get audio source
  const audioSrc = audioElement.src;
  if (!audioSrc) {
    return null;
  }

  try {
    const response = await fetch(audioSrc);
    const blob = await response.blob();
    return blob;
  } catch {
    return null;
  }
}

// ============================================================================
// Alignment Functions
// ============================================================================

/**
 * Convert Whisper response to WordAlignment array
 */
function whisperToWordAlignments(response: WhisperResponse): WordAlignment[] {
  const words: WordAlignment[] = [];

  for (const segment of response.segments) {
    if (segment.words) {
      for (const w of segment.words) {
        words.push({
          word: w.word.trim(),
          startMs: Math.round(w.start * 1000),
          endMs: Math.round(w.end * 1000),
          confidence: 1.0, // Whisper doesn't provide confidence per word
        });
      }
    }
  }

  return words;
}

/**
 * Convert WordAlignment array to SubtitleToken array
 */
function wordAlignmentsToTokens(alignments: WordAlignment[]): SubtitleToken[] {
  return alignments.map((a) => ({
    text: a.word,
    startMs: a.startMs,
    durationMs: a.endMs - a.startMs,
    isWordLike: true,
  }));
}

/**
 * Merge subtitle tokens with word alignments
 * Uses subtitle tokens as reference, but adjusts timings from Whisper
 */
function mergeTokensWithAlignments(
  subtitleTokens: SubtitleToken[],
  alignments: WordAlignment[],
): WordAlignment[] {
  if (alignments.length === 0) return [];
  if (subtitleTokens.length === 0) return alignments;

  const result: WordAlignment[] = [];
  let alignIndex = 0;

  for (const token of subtitleTokens) {
    if (!token.isWordLike) continue;

    // Find matching alignment by word similarity
    const tokenWord = token.text.toLowerCase().trim();
    
    while (alignIndex < alignments.length) {
      const align = alignments[alignIndex];
      const alignWord = align.word.toLowerCase().trim();

      // Check if words match (allowing for punctuation differences)
      const cleanToken = tokenWord.replace(/[^\p{L}\p{N}]/gu, "");
      const cleanAlign = alignWord.replace(/[^\p{L}\p{N}]/gu, "");

      if (cleanToken === cleanAlign) {
        result.push(align);
        alignIndex++;
        break;
      } else if (cleanAlign.length < cleanToken.length) {
        // Alignment word might be partial, combine
        alignIndex++;
      } else {
        // Skip this alignment
        alignIndex++;
      }
    }
  }

  // Add remaining alignments
  while (alignIndex < alignments.length) {
    result.push(alignments[alignIndex]);
    alignIndex++;
  }

  return result;
}

// ============================================================================
// Caching
// ============================================================================

const CACHE_PREFIX = "vot.langlearn.alignment.";

interface CachedAlignment {
  videoId: string;
  trackType: "original" | "translation";
  hash: string;
  alignments: WordAlignment[];
  timestamp: number;
}

/**
 * Generate hash for subtitle content
 */
async function hashSubtitles(lines: SubtitleLine[]): Promise<string> {
  const text = lines.map((l) => l.text).join("");
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get cached alignment
 */
async function getCachedAlignment(
  videoId: string,
  trackType: "original" | "translation",
  lines: SubtitleLine[],
): Promise<WordAlignment[] | null> {
  try {
    const hash = await hashSubtitles(lines);
    const key = `${CACHE_PREFIX}${videoId}.${trackType}.${hash}`;
    const cached = globalThis.localStorage?.getItem(key);
    
    if (cached) {
      const parsed = JSON.parse(cached) as CachedAlignment;
      // Cache valid for 24 hours
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.alignments;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Store alignment in cache
 */
async function cacheAlignment(
  videoId: string,
  trackType: "original" | "translation",
  lines: SubtitleLine[],
  alignments: WordAlignment[],
): Promise<void> {
  try {
    const hash = await hashSubtitles(lines);
    const key = `${CACHE_PREFIX}${videoId}.${trackType}.${hash}`;
    const data: CachedAlignment = {
      videoId,
      trackType,
      hash,
      alignments,
      timestamp: Date.now(),
    };
    globalThis.localStorage?.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore cache errors
  }
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Align original audio with word-level timestamps
 */
export async function alignOriginalAudio(
  video: HTMLVideoElement,
  subtitles: SubtitleLine[],
  videoId: string,
  options: AlignerOptions = {},
): Promise<WordAlignment[]> {
  const config = getConfig();
  
  // Check if any provider is available
  const hasProvider = config.apiKey || (config.provider === 'replicate' && config.replicateApiKey);
  
  if (!hasProvider) {
    options.log?.("align_skipped", { reason: "no_api_key" });
    // Fallback: use existing subtitle tokens
    return subtitles.flatMap((line) =>
      (line.tokens ?? []).map((t) => ({
        word: t.text,
        startMs: t.startMs,
        endMs: t.startMs + t.durationMs,
        confidence: 0.5,
      })),
    );
  }

  // Check cache
  const cached = await getCachedAlignment(videoId, "original", subtitles);
  if (cached) {
    options.log?.("align_cache_hit", { trackType: "original" });
    return cached;
  }

  const providerName = config.provider === 'replicate' ? 'WhisperX' : 'Whisper';
  options.onProgress?.({
    text: `🎵 Анализ оригинальной аудиодорожки (${providerName})...`,
    progress: 0.1,
    timeElapsed: 0,
  });

  const startTime = Date.now();

  try {
    // Get audio from video
    const totalDuration = subtitles.length > 0 
      ? subtitles[subtitles.length - 1].startMs + subtitles[subtitles.length - 1].durationMs
      : video.duration * 1000;

    const audioBlob = await getAudioFromVideo(video, 0, totalDuration);
    
    options.onProgress?.({
      text: `🔊 Отправка аудио в ${providerName}...`,
      progress: 0.3,
      timeElapsed: Date.now() - startTime,
    });

    // Get transcript text for better alignment
    const transcript = subtitles.map((s) => s.text).join(" ");

    // Call alignment API (Whisper or WhisperX)
    const response = await performAlignment(audioBlob, transcript, config, options);
    
    options.onProgress?.({
      text: "📝 Обработка временных меток...",
      progress: 0.8,
      timeElapsed: Date.now() - startTime,
    });

    // Convert to word alignments
    const alignments = whisperToWordAlignments(response);

    // Cache result
    await cacheAlignment(videoId, "original", subtitles, alignments);

    options.log?.("align_complete", {
      trackType: "original",
      wordCount: alignments.length,
      duration: Date.now() - startTime,
    });

    options.onProgress?.({
      text: `✅ Оригинал: ${alignments.length} слов`,
      progress: 1,
      timeElapsed: Date.now() - startTime,
    });

    return alignments;
  } catch (error) {
    options.log?.("align_error", {
      trackType: "original",
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to subtitle tokens
    return subtitles.flatMap((line) =>
      (line.tokens ?? []).map((t) => ({
        word: t.text,
        startMs: t.startMs,
        endMs: t.startMs + t.durationMs,
        confidence: 0.3,
      })),
    );
  }
}

/**
 * Align translation audio with word-level timestamps
 */
export async function alignTranslationAudio(
  player: any,
  subtitles: SubtitleLine[],
  videoId: string,
  options: AlignerOptions = {},
): Promise<WordAlignment[]> {
  const config = getConfig();
  
  // Check if any provider is available
  const hasProvider = config.apiKey || (config.provider === 'replicate' && config.replicateApiKey);
  
  if (!hasProvider) {
    options.log?.("align_skipped", { reason: "no_api_key" });
    // Fallback: use existing subtitle tokens
    return subtitles.flatMap((line) =>
      (line.tokens ?? []).map((t) => ({
        word: t.text,
        startMs: t.startMs,
        endMs: t.startMs + t.durationMs,
        confidence: 0.5,
      })),
    );
  }

  // Check cache
  const cached = await getCachedAlignment(videoId, "translation", subtitles);
  if (cached) {
    options.log?.("align_cache_hit", { trackType: "translation" });
    return cached;
  }

  const providerName = config.provider === 'replicate' ? 'WhisperX' : 'Whisper';
  options.onProgress?.({
    text: `🎵 Анализ аудиодорожки перевода (${providerName})...`,
    progress: 0.1,
    timeElapsed: 0,
  });

  const startTime = Date.now();

  try {
    // Get audio from translation player
    const audioBlob = await getAudioFromTranslationPlayer(player, 0, 0);
    if (!audioBlob) {
      throw new Error("Cannot extract audio from translation player");
    }
    
    options.onProgress?.({
      text: `🔊 Отправка перевода в ${providerName}...`,
      progress: 0.3,
      timeElapsed: Date.now() - startTime,
    });

    // Get transcript text
    const transcript = subtitles.map((s) => s.text).join(" ");

    // Update config for translation language (Russian)
    const transConfig = {
      ...config,
      language: getEnvString("vot.langlearn.whisper.transLanguage", "ru"),
    };

    // Call alignment API (Whisper or WhisperX)
    const response = await performAlignment(audioBlob, transcript, transConfig, options);
    
    options.onProgress?.({
      text: "📝 Обработка временных меток перевода...",
      progress: 0.8,
      timeElapsed: Date.now() - startTime,
    });

    // Convert to word alignments
    const alignments = whisperToWordAlignments(response);

    // Cache result
    await cacheAlignment(videoId, "translation", subtitles, alignments);

    options.log?.("align_complete", {
      trackType: "translation",
      wordCount: alignments.length,
      duration: Date.now() - startTime,
    });

    options.onProgress?.({
      text: `✅ Перевод: ${alignments.length} слов`,
      progress: 1,
      timeElapsed: Date.now() - startTime,
    });

    return alignments;
  } catch (error) {
    options.log?.("align_error", {
      trackType: "translation",
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to subtitle tokens
    return subtitles.flatMap((line) =>
      (line.tokens ?? []).map((t) => ({
        word: t.text,
        startMs: t.startMs,
        endMs: t.startMs + t.durationMs,
        confidence: 0.3,
      })),
    );
  }
}

/**
 * Check if any alignment provider is configured
 */
export function isWhisperAvailable(): boolean {
  const config = getConfig();
  return Boolean(config.apiKey) || Boolean(config.replicateApiKey);
}

/**
 * Get current alignment provider info
 */
export function getAlignmentProviderInfo(): { 
  available: boolean; 
  provider: string; 
  hasOpenAI: boolean;
  hasReplicate: boolean;
} {
  const config = getConfig();
  const hasOpenAI = Boolean(config.apiKey);
  const hasReplicate = Boolean(config.replicateApiKey);
  
  if (config.provider === 'replicate' && hasReplicate) {
    return { available: true, provider: 'WhisperX (Replicate)', hasOpenAI, hasReplicate };
  }
  if (hasOpenAI) {
    return { available: true, provider: 'Whisper (OpenAI)', hasOpenAI, hasReplicate };
  }
  return { available: false, provider: 'None', hasOpenAI, hasReplicate };
}

/**
 * Test alignment API connection
 */
export async function testWhisperConnection(
  options: AlignerOptions = {},
): Promise<{ success: boolean; message: string; latencyMs?: number; provider?: string }> {
  const config = getConfig();
  const startTime = Date.now();

  try {
    // Test Replicate if configured and preferred
    if (config.provider === 'replicate' && config.replicateApiKey) {
      const response = await fetch("https://api.replicate.com/v1/models", {
        headers: {
          "Authorization": `Token ${config.replicateApiKey}`,
        },
      });
      
      if (response.ok) {
        return { 
          success: true, 
          message: "WhisperX (Replicate) connected", 
          latencyMs: Date.now() - startTime,
          provider: 'whisperx'
        };
      }
      return { 
        success: false, 
        message: "Replicate API error", 
        latencyMs: Date.now() - startTime 
      };
    }
    
    // Test OpenAI if configured
    if (config.apiKey) {
      const isValidFormat = config.apiKey.startsWith("sk-") || config.apiKey.length > 20;
      
      if (isValidFormat) {
        return { 
          success: true, 
          message: "Whisper (OpenAI) configured", 
          latencyMs: Date.now() - startTime,
          provider: 'whisper'
        };
      }
      return { 
        success: false, 
        message: "Invalid OpenAI API key format",
        provider: 'whisper'
      };
    }

    return { 
      success: false, 
      message: "No API key configured" 
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}


