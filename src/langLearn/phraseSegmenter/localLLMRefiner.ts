import type { PhraseItem } from "./semanticSegmenter";

/**
 * Stub fallback refiner - no longer uses WebLLM
 * 
 * The primary refiner is now qwenApiRefiner which uses Qwen-3.5-Omni API.
 * This module is kept for backward compatibility and as a no-op fallback.
 */

export type LLMRefinerOptions = {
  enabled?: boolean;
  force?: boolean;
  maxWindows?: number;
  maxWindowSize?: number;
  maxWindowTimeoutMs?: number;
  log?: (event: string, payload: Record<string, unknown>) => void;
  onProgress?: (progress: { text: string; progress: number; timeElapsed: number }) => void;
  onWindowApplied?: (start: number, end: number, phrases: PhraseItem[]) => void;
};

/**
 * Always returns false - WebLLM has been removed
 */
export const isWebGPUAvailable = async (): Promise<boolean> => {
  return false;
};

/**
 * No-op refiner - just returns phrases as-is
 * The actual refinement is done by qwenApiRefiner
 */
export const refinePhrasesWithLocalLLM = async (
  phrases: PhraseItem[],
  options: LLMRefinerOptions = {},
): Promise<PhraseItem[]> => {
  options.log?.("local_llm_skipped", { 
    reason: "webllm_removed",
    note: "Use qwenApiRefiner for phrase refinement" 
  });
  return phrases;
};

/**
 * @deprecated Use refinePhrasesWithLocalLLM instead
 */
export const detectSuspiciousIndexes = (_phrases: PhraseItem[]): number[] => {
  return [];
};

/**
 * @deprecated Use refinePhrasesWithLocalLLM instead
 */
export const buildSuspiciousWindows = (
  _suspiciousIndexes: number[],
  _totalPhrases: number,
  _maxWindowSize = 5,
): Array<{ start: number; end: number }> => {
  return [];
};
