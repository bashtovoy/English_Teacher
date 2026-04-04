import type { PhraseItem, WordToken } from "./semanticSegmenter";
import { computePhraseConfidence } from "./semanticSegmenter";

/**
 * Qwen-3.5-Omni API Refiner for Language Learning
 * 
 * Uses Qwen-3.5-Omni via OpenAI-compatible API for semantic phrase segmentation
 * optimized for language learning purposes.
 */

export type QwenApiOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  timeoutMs?: number;
  log?: (event: string, payload: Record<string, unknown>) => void;
  onProgress?: (progress: { text: string; progress: number; timeElapsed: number }) => void;
  onChunkRefined?: (startIndex: number, endIndex: number, phrases: PhraseItem[]) => void;
};

type QwenApiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxRetries: number;
  timeoutMs: number;
};

type SegmentationRequest = {
  phrases: Array<{
    index: number;
    original: string;
    translated: string;
    startMs: number;
    endMs: number;
  }>;
};

type SegmentationResponse = {
  phrases: Array<{
    index: number;
    original: string;
    translated: string;
    confidence: number;
  }>;
};

const WORD_RE = /[\p{L}\p{N}]+/gu;
const ENDING_PUNCTUATION_RE = /[.!?\u2026]+(?:["'`)\]}\u00BB\u201D\u2019]+)?$/u;

const countWords = (text: string): number => text.match(WORD_RE)?.length ?? 0;

/**
 * Get words from text with their indices
 */
const getWordsWithIndices = (text: string): Array<{ word: string; index: number }> => {
  const matches = Array.from(text.matchAll(WORD_RE));
  return matches.map((m, i) => ({ word: m[0], index: i }));
};

/**
 * Create translation tokens based on original tokens and word alignment.
 * Maps translation words to original words proportionally.
 */
const createAlignedTransTokens = (
  transText: string,
  origTokens: WordToken[] | undefined,
  transStartMs: number,
  transEndMs: number
): WordToken[] => {
  const trimmed = transText.trim();
  if (!trimmed) return [];

  const transDuration = Math.max(0, transEndMs - transStartMs);
  if (transDuration <= 0) return [];

  const transWords = getWordsWithIndices(trimmed);
  if (transWords.length === 0) return [];

  // If no original tokens, distribute proportionally
  if (!origTokens || origTokens.length === 0) {
    const tokens: WordToken[] = [];
    const totalChars = trimmed.length;
    
    for (let i = 0; i < transWords.length; i++) {
      const { word } = transWords[i];
      const wordStart = trimmed.indexOf(word, i > 0 ? trimmed.indexOf(transWords[i-1].word) + transWords[i-1].word.length : 0);
      const startRatio = wordStart / totalChars;
      const endRatio = (wordStart + word.length) / totalChars;
      
      tokens.push({
        text: word,
        startMs: transStartMs + Math.round(transDuration * startRatio),
        durationMs: Math.round(transDuration * (endRatio - startRatio)),
        isWordLike: true,
      });
    }
    return tokens;
  }

  // Get word-like original tokens
  const origWordTokens = origTokens.filter(t => t.isWordLike);
  if (origWordTokens.length === 0) {
    return createAlignedTransTokens(transText, undefined, transStartMs, transEndMs);
  }

  const origWordCount = origWordTokens.length;
  const transWordCount = transWords.length;
  
  // Calculate original timing range
  const origStartMs = origWordTokens[0].startMs;
  const origEndMs = origWordTokens[origWordTokens.length - 1].startMs + origWordTokens[origWordTokens.length - 1].durationMs;
  const origDuration = Math.max(1, origEndMs - origStartMs);

  const tokens: WordToken[] = [];

  for (let i = 0; i < transWordCount; i++) {
    // Map translation word to corresponding original word
    const origIndex = Math.min(
      Math.round((i * origWordCount) / transWordCount),
      origWordCount - 1
    );
    const origToken = origWordTokens[origIndex];

    // Scale original timing to translation window
    const relativeStart = origToken.startMs - origStartMs;
    const scaledStart = transStartMs + (relativeStart / origDuration) * transDuration;
    const scaledDuration = (origToken.durationMs / origDuration) * transDuration;

    tokens.push({
      text: transWords[i].word,
      startMs: Math.round(scaledStart),
      durationMs: Math.round(Math.max(1, scaledDuration)),
      isWordLike: true,
    });
  }

  return tokens;
};

/**
 * Merge tokens from multiple phrases into one array
 */
const mergeTokens = (tokensArrays: Array<WordToken[] | undefined>): WordToken[] => {
  const result: WordToken[] = [];
  for (const tokens of tokensArrays) {
    if (tokens) {
      result.push(...tokens);
    }
  }
  return result;
};

const normalizeText = (value: string): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?…])/g, "$1")
    .trim();

const getEnvString = (key: string, fallback: string): string => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw?.trim() || fallback;
  } catch {
    return fallback;
  }
};

const getEnvInt = (key: string, fallback: number): number => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.floor(parsed));
  } catch {
    return fallback;
  }
};

const getEnvBool = (key: string, fallback: boolean): boolean => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (raw == null) return fallback;
    return raw === "1" || raw.toLowerCase() === "true";
  } catch {
    return fallback;
  }
};

const getConfig = (): QwenApiConfig => ({
  apiKey: getEnvString("vot.langlearn.qwen.apiKey", ""),
  baseUrl: getEnvString("vot.langlearn.qwen.baseUrl", "https://openrouter.ai/api/v1"),
  model: getEnvString("vot.langlearn.qwen.model", "qwen/qwen3.6-plus-preview:free"),
  maxRetries: getEnvInt("vot.langlearn.qwen.maxRetries", 3),
  timeoutMs: getEnvInt("vot.langlearn.qwen.timeoutMs", 60000),
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  if (timeoutMs <= 0) return promise;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`API timeout (${timeoutMs}ms)`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Builds a prompt optimized for language learning phrase segmentation.
 * 
 * The goal is to create phrases that:
 * 1. Are complete semantic units (not cut mid-thought)
 * 2. Are optimal length for learning (3-8 words typically)
 * 3. Preserve natural speech patterns
 * 4. Match translation to original meaningfully
 */
const buildSegmentationPrompt = (request: SegmentationRequest, sourceLang: string = "en", targetLang: string = "ru"): string => {
  const phraseList = request.phrases.map((p, i) => 
    `${i + 1}. [${p.startMs}-${p.endMs}ms] ORIGINAL: "${p.original}" → TRANSLATED: "${p.translated}"`
  ).join("\n");

  return `You are an expert language learning content designer. Your task is to analyze subtitle segments and optimize them for language learning.

GOAL: Create phrase pairs that are optimal for learning - each phrase should be a complete thought that a learner can study, repeat, and understand independently.

INPUT LANGUAGE: ${sourceLang}
OUTPUT LANGUAGE: ${targetLang}

CURRENT SEGMENTS:
${phraseList}

TASK:
1. Analyze each segment pair for semantic completeness
2. Merge segments that form a single complete thought
3. Split segments that are too long or contain multiple ideas
4. Ensure each phrase pair has matching meaning (translation accuracy)
5. Each resulting phrase should be 3-10 words for optimal learning

RULES:
- Merge: If a segment ends mid-sentence (no period, incomplete thought), merge with the next
- Split: If a segment contains multiple sentences or is >10 words, split at natural boundaries
- Preserve: Keep good segments as-is (3-8 words, complete thought, accurate translation)

OUTPUT FORMAT (JSON only, no markdown):
{
  "phrases": [
    {
      "index": 0,
      "original": "combined original text",
      "translated": "combined translated text", 
      "confidence": 0.95
    }
  ]
}

Confidence scoring:
- 0.9-1.0: Perfect alignment, complete thought, optimal length
- 0.7-0.9: Good alignment, minor issues
- 0.5-0.7: Acceptable but could be better
- Below 0.5: Poor alignment, needs review

Return ONLY valid JSON, no other text.`;
};

/**
 * Builds a prompt for redistributing translation text across segments
 */
const buildRedistributionPrompt = (
  originals: Array<{ index: number; text: string }>,
  translationPool: string,
): string => {
  const originalList = originals.map(o => `${o.index + 1}. "${o.text}"`).join("\n");

  return `You are a language learning expert. Redistribute the Russian translation to match the English segments by meaning.

ENGLISH SEGMENTS:
${originalList}

RUSSIAN TRANSLATION POOL (all words to redistribute):
"${translationPool}"

TASK:
1. Split the Russian text to match each English segment's meaning
2. Use "|" to separate the Russian parts
3. Preserve ALL Russian words from the pool
4. Each Russian part should match the meaning of its English segment

OUTPUT FORMAT: Just the Russian text with "|" separators, nothing else.
Example: Привет. | Как дела? | Очень рад видеть.`;
};

/**
 * Parses JSON response from the model, handling various formats
 */
const parseJsonResponse = <T>(raw: string): T | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: string[] = [trimmed];

  // Try to extract from code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    candidates.push(codeBlockMatch[1].trim());
  }

  // Try to find JSON object
  const firstCurly = trimmed.indexOf("{");
  const lastCurly = trimmed.lastIndexOf("}");
  if (firstCurly >= 0 && lastCurly > firstCurly) {
    candidates.push(trimmed.slice(firstCurly, lastCurly + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  return null;
};

/**
 * Parses pipe-separated redistribution response
 */
const parseRedistributionResponse = (raw: string, expectedCount: number): string[] | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("|").map(s => s.trim()).filter(s => s.length > 0);
  
  if (parts.length === expectedCount) {
    return parts;
  }

  // If we got fewer parts, try to be lenient
  if (parts.length > 0 && parts.length <= expectedCount + 1) {
    // Pad with empty strings or merge extras
    while (parts.length < expectedCount) {
      parts.push("");
    }
    return parts.slice(0, expectedCount);
  }

  return null;
};

/**
 * Makes an API call to the Qwen endpoint
 */
const callQwenApi = async (
  config: QwenApiConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: QwenApiOptions = {},
): Promise<string> => {
  const { maxRetries = config.maxRetries, timeoutMs = config.timeoutMs } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      options.log?.("api_retry", { attempt, delayMs });
      await sleep(delayMs);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
          "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://github.com/ilyhalight/voice-over-translation",
          "X-Title": "VOT Language Learning",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.3,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`API error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty response from API");
      }

      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      options.log?.("api_error", { 
        attempt, 
        error: lastError.message,
        willRetry: attempt < maxRetries 
      });
    }
  }

  throw lastError || new Error("API call failed after retries");
};

/**
 * Redistribute timing across merged/split phrases, preserving word-level tokens
 */
const redistributeTimings = (
  phrases: PhraseItem[],
  newTexts: Array<{ original: string; translated: string }>,
): PhraseItem[] => {
  if (newTexts.length === 0 || phrases.length === 0) return phrases;

  const startMs = Math.min(...phrases.map(p => p.startMs));
  const endMs = Math.max(...phrases.map(p => p.endMs));
  const transStartMs = Math.min(...phrases.map(p => p.transStartMs));
  const transEndMs = Math.max(...phrases.map(p => p.transEndMs));

  const totalDuration = endMs - startMs;
  const totalTransDuration = transEndMs - transStartMs;

  // Merge all original tokens from input phrases
  const allOrigTokens = mergeTokens(phrases.map(p => p.origTokens));

  // Calculate weights based on text length
  const weights = newTexts.map(t => countWords(t.original) + countWords(t.translated) / 2);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  let cursor = startMs;
  let transCursor = transStartMs;

  return newTexts.map((text, i) => {
    const weight = weights[i] || 1;
    const durationRatio = weight / totalWeight;
    
    const duration = i === newTexts.length - 1 
      ? endMs - cursor 
      : Math.round(totalDuration * durationRatio);
    const transDuration = i === newTexts.length - 1
      ? transEndMs - transCursor 
      : Math.round(totalTransDuration * durationRatio);

    const phraseEnd = cursor + duration;
    const transPhraseEnd = transCursor + transDuration;

    // Extract original tokens for this time range
    const origTokensForPhrase = allOrigTokens.filter(
      t => t.startMs >= cursor && t.startMs < phraseEnd
    );

    // Create translation tokens aligned with original
    const transTokensForPhrase = createAlignedTransTokens(
      normalizeText(text.translated),
      origTokensForPhrase,
      transCursor,
      transPhraseEnd
    );

    const phrase: PhraseItem = {
      index: i,
      origText: normalizeText(text.original),
      transText: normalizeText(text.translated),
      startMs: cursor,
      endMs: phraseEnd,
      transStartMs: transCursor,
      transEndMs: transPhraseEnd,
      confidence: 0,
      origTokens: origTokensForPhrase.length > 0 ? origTokensForPhrase : undefined,
      transTokens: transTokensForPhrase.length > 0 ? transTokensForPhrase : undefined,
    };

    phrase.confidence = computePhraseConfidence(phrase);

    cursor = phrase.endMs;
    transCursor = phrase.transEndMs;

    return phrase;
  });
};

/**
 * Main function: Refine phrases using Qwen-3.5-Omni API
 * 
 * This function takes the initial phrase segmentation and uses
 * Qwen-3.5-Omni to optimize it for language learning.
 */
export const refinePhrasesWithQwenApi = async (
  phrases: PhraseItem[],
  options: QwenApiOptions = {},
): Promise<PhraseItem[]> => {
  if (phrases.length === 0) return phrases;

  const config = getConfig();
  
  // Check if API key is configured
  if (!config.apiKey) {
    options.log?.("qwen_refine_skipped", { 
      reason: "no_api_key",
      hint: "Set vot.langlearn.qwen.apiKey in localStorage or configure in UI" 
    });
    return phrases;
  }

  const startTime = Date.now();
  options.log?.("qwen_refine_started", { 
    phraseCount: phrases.length,
    model: config.model,
    baseUrl: config.baseUrl 
  });

  options.onProgress?.({ 
    text: "🔄 Подключение к Qwen API...",
    progress: 0.05, 
    timeElapsed: 0 
  });

  try {
    // Process in chunks to avoid token limits
    const CHUNK_SIZE = 20; // phrases per API call
    const result: PhraseItem[] = [];
    const chunks: PhraseItem[][] = [];

    for (let i = 0; i < phrases.length; i += CHUNK_SIZE) {
      chunks.push(phrases.slice(i, i + CHUNK_SIZE));
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const progress = 0.1 + (0.8 * chunkIndex) / chunks.length;

      options.onProgress?.({ 
        text: `🔄 Анализ фраз ${chunkIndex * CHUNK_SIZE + 1}-${Math.min((chunkIndex + 1) * CHUNK_SIZE, phrases.length)} из ${phrases.length}...`, 
        progress, 
        timeElapsed: Date.now() - startTime 
      });

      const request: SegmentationRequest = {
        phrases: chunk.map(p => ({
          index: p.index,
          original: p.origText,
          translated: p.transText,
          startMs: p.startMs,
          endMs: p.endMs,
        })),
      };

      const prompt = buildSegmentationPrompt(request);
      
      const response = await callQwenApi(config, [
        { role: "user", content: prompt }
      ], options);

      const parsed = parseJsonResponse<SegmentationResponse>(response);

      if (parsed?.phrases && Array.isArray(parsed.phrases)) {
        // Convert response back to PhraseItem format
        const newTexts = parsed.phrases.map(p => ({
          original: p.original,
          translated: p.translated,
        }));

        const refined = redistributeTimings(chunk, newTexts);
        
        // Re-index
        for (let i = 0; i < refined.length; i++) {
          refined[i].index = result.length + i;
        }

        result.push(...refined);
        options.onChunkRefined?.(chunkIndex * CHUNK_SIZE, chunkIndex * CHUNK_SIZE + chunk.length - 1, refined);
        
        options.log?.("qwen_chunk_refined", { 
          chunkIndex, 
          inputCount: chunk.length, 
          outputCount: refined.length 
        });
      } else {
        // Fallback: keep original chunk
        result.push(...chunk);
        options.log?.("qwen_chunk_parse_failed", { chunkIndex });
      }
    }

    // Final re-index
    for (let i = 0; i < result.length; i++) {
      result[i].index = i;
    }

    const elapsed = Date.now() - startTime;
    options.onProgress?.({ 
      text: `✅ Анализ завершён: ${result.length} фраз за ${(elapsed / 1000).toFixed(1)}с`, 
      progress: 1, 
      timeElapsed: elapsed 
    });

    options.log?.("qwen_refine_finished", { 
      inputCount: phrases.length, 
      outputCount: result.length,
      elapsedMs: elapsed 
    });

    return result;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    options.log?.("qwen_refine_failed", { 
      error: errorMessage,
      elapsedMs: elapsed 
    });

    options.onProgress?.({ 
      text: `⚠️ Ошибка API: ${errorMessage.slice(0, 50)}`, 
      progress: 0, 
      timeElapsed: elapsed 
    });

    // Return original phrases on error
    return phrases;
  }
};

/**
 * Quick redistribution using Qwen API
 * For when the segmentation is already good but translation needs rebalancing
 */
export const redistributeTranslationWithQwenApi = async (
  phrases: PhraseItem[],
  options: QwenApiOptions = {},
): Promise<PhraseItem[]> => {
  if (phrases.length === 0) return phrases;

  const config = getConfig();
  if (!config.apiKey) return phrases;

  const originals = phrases.map(p => ({ index: p.index, text: p.origText }));
  const translationPool = phrases.map(p => p.transText).join(" ");

  const prompt = buildRedistributionPrompt(originals, translationPool);
  
  try {
    const response = await callQwenApi(config, [
      { role: "user", content: prompt }
    ], options);

    const redistributed = parseRedistributionResponse(response, phrases.length);

    if (redistributed) {
      return phrases.map((p, i) => ({
        ...p,
        transText: normalizeText(redistributed[i] || p.transText),
      }));
    }
  } catch (err) {
    options.log?.("qwen_redistribute_failed", { 
      error: err instanceof Error ? err.message : String(err) 
    });
  }

  return phrases;
};

/**
 * Check if Qwen API is configured and available
 */
export const isQwenApiAvailable = (): boolean => {
  const config = getConfig();
  return Boolean(config.apiKey);
};

/**
 * Test the API connection
 */
export const testQwenApiConnection = async (
  options: QwenApiOptions = {},
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  const config = getConfig();

  if (!config.apiKey) {
    return { success: false, message: "API key not configured" };
  }

  const startTime = Date.now();

  try {
    const response = await callQwenApi(config, [
      { role: "user", content: "Reply with: OK" }
    ], { ...options, maxRetries: 0, timeoutMs: 10000 });

    const elapsed = Date.now() - startTime;

    if (response.toLowerCase().includes("ok")) {
      return { success: true, message: `Connected to ${config.model}`, latencyMs: elapsed };
    }

    return { success: true, message: `Got response: ${response.slice(0, 50)}`, latencyMs: elapsed };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return { 
      success: false, 
      message: err instanceof Error ? err.message : String(err),
      latencyMs: elapsed 
    };
  }
};
