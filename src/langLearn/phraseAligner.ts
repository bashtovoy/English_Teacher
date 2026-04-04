/**
 * Phrase Segmenter from Word Alignments
 * 
 * Takes word-level alignments and groups them into optimal phrases
 * for language learning using Qwen API for semantic analysis.
 */

import type { WordAlignment, PhraseAlignment } from "./audioAligner";
import type { PhraseItem, WordToken } from "./phraseSegmenter/semanticSegmenter";

// ============================================================================
// Configuration
// ============================================================================

const MIN_WORDS_PER_PHRASE = 2;
const MAX_WORDS_PER_PHRASE = 10;
const OPTIMAL_WORDS_PER_PHRASE = 5;
const MIN_PHRASE_DURATION_MS = 500;
const MAX_PHRASE_DURATION_MS = 5000;
const OPTIMAL_PHRASE_DURATION_MS = 2500;

// Sentence boundaries
const STRONG_END_PUNCT = new Set([".", "!", "?", "…"]);
const SOFT_END_PUNCT = new Set([",", ";", ":"]);

// Logical connector words (should start a phrase, not end it)
const CONNECTOR_WORDS = new Set([
  "and", "but", "or", "so", "because", "if", "then", "while", "when",
  "although", "though", "however", "therefore", "also", "that", "which",
  "и", "но", "а", "или", "если", "когда", "потому", "что", "который",
]);

// Incomplete phrase endings (should continue to next phrase)
const INCOMPLETE_ENDINGS = new Set([
  "the", "a", "an", "to", "of", "for", "with", "from", "in", "on", "at",
  "is", "are", "was", "were", "will", "would", "could", "should", "can",
  "в", "на", "с", "к", "по", "от", "до", "о", "об", "за", "из", "под",
]);

// ============================================================================
// Helper Functions
// ============================================================================

const WORD_RE = /[\p{L}\p{N}]+/gu;

const countWords = (text: string): number => text.match(WORD_RE)?.length ?? 0;

const normalizeWord = (word: string): string =>
  word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const endsWithPunctuation = (word: string, punctSet: Set<string>): boolean => {
  const trimmed = word.trim();
  if (!trimmed) return false;
  const lastChar = trimmed[trimmed.length - 1];
  return punctSet.has(lastChar);
};

const startsWithConnector = (word: string): boolean => {
  const normalized = normalizeWord(word);
  return CONNECTOR_WORDS.has(normalized);
};

const endsWithIncomplete = (word: string): boolean => {
  const normalized = normalizeWord(word);
  return INCOMPLETE_ENDINGS.has(normalized);
};

// ============================================================================
// Phrase Boundary Detection
// ============================================================================

type BoundaryScore = {
  index: number;
  score: number;
  reasons: string[];
};

/**
 * Calculate boundary score at a given position.
 * Higher score = better phrase boundary.
 */
function calculateBoundaryScore(
  words: WordAlignment[],
  index: number,
): BoundaryScore {
  const score: BoundaryScore = { index, score: 0, reasons: [] };

  if (index <= 0 || index >= words.length) {
    return score;
  }

  const prevWord = words[index - 1];
  const nextWord = words[index];

  // Strong punctuation is a strong boundary
  if (endsWithPunctuation(prevWord.word, STRONG_END_PUNCT)) {
    score.score += 10;
    score.reasons.push("strong_punctuation");
  }

  // Soft punctuation is a moderate boundary
  if (endsWithPunctuation(prevWord.word, SOFT_END_PUNCT)) {
    score.score += 3;
    score.reasons.push("soft_punctuation");
  }

  // Connector words should start a new phrase
  if (startsWithConnector(nextWord.word)) {
    score.score += 5;
    score.reasons.push("connector_word");
  }

  // Incomplete ending should NOT be a boundary
  if (endsWithIncomplete(prevWord.word)) {
    score.score -= 8;
    score.reasons.push("incomplete_ending");
  }

  // Duration considerations
  const phraseDuration = words[index - 1].endMs - words[0].startMs;
  if (phraseDuration > MAX_PHRASE_DURATION_MS) {
    score.score += 8;
    score.reasons.push("too_long");
  } else if (phraseDuration < MIN_PHRASE_DURATION_MS && index > 2) {
    score.score -= 5;
    score.reasons.push("too_short");
  }

  // Word count considerations
  const wordCount = index;
  if (wordCount > MAX_WORDS_PER_PHRASE) {
    score.score += 10;
    score.reasons.push("too_many_words");
  } else if (wordCount >= MIN_WORDS_PER_PHRASE && wordCount <= OPTIMAL_WORDS_PER_PHRASE) {
    score.score += 2;
    score.reasons.push("optimal_length");
  }

  // Pause between words (gap detection)
  const gapMs = nextWord.startMs - prevWord.endMs;
  if (gapMs > 300) {
    score.score += Math.min(5, gapMs / 100);
    score.reasons.push(`pause_${Math.round(gapMs)}ms`);
  }

  return score;
}

/**
 * Find all phrase boundaries based on word alignments
 */
function findPhraseBoundaries(words: WordAlignment[]): number[] {
  if (words.length <= 1) return [words.length];

  const boundaries: number[] = [];
  let phraseStart = 0;
  let wordCount = 0;

  for (let i = 1; i <= words.length; i++) {
    wordCount = i - phraseStart;

    // Check if we've hit hard limits
    if (wordCount >= MAX_WORDS_PER_PHRASE || i === words.length) {
      boundaries.push(i);
      phraseStart = i;
      continue;
    }

    // Calculate boundary score
    const boundary = calculateBoundaryScore(words, i);

    // Check if this is a good boundary
    if (boundary.score >= 5 && wordCount >= MIN_WORDS_PER_PHRASE) {
      boundaries.push(i);
      phraseStart = i;
    }
  }

  // Ensure we have at least one boundary
  if (boundaries.length === 0) {
    boundaries.push(words.length);
  }

  return boundaries;
}

// ============================================================================
// Phrase Creation
// ============================================================================

/**
 * Group word alignments into phrases
 */
export function groupWordsIntoPhrases(
  words: WordAlignment[],
  options: { minWords?: number; maxWords?: number } = {},
): PhraseAlignment[] {
  const { minWords = MIN_WORDS_PER_PHRASE, maxWords = MAX_WORDS_PER_PHRASE } = options;

  if (words.length === 0) return [];
  if (words.length <= minWords) {
    return [{
      text: words.map((w) => w.word).join(" "),
      startMs: words[0].startMs,
      endMs: words[words.length - 1].endMs,
      words,
    }];
  }

  const boundaries = findPhraseBoundaries(words);
  const phrases: PhraseAlignment[] = [];

  let start = 0;
  for (const boundary of boundaries) {
    const phraseWords = words.slice(start, boundary);
    if (phraseWords.length === 0) continue;

    const text = phraseWords.map((w) => w.word).join(" ");
    const startMs = phraseWords[0].startMs;
    const endMs = phraseWords[phraseWords.length - 1].endMs;

    phrases.push({
      text,
      startMs,
      endMs,
      words: phraseWords,
    });

    start = boundary;
  }

  return phrases;
}

/**
 * Convert PhraseAlignment to PhraseItem
 */
export function phraseAlignmentToPhraseItem(
  origPhrases: PhraseAlignment[],
  transPhrases: PhraseAlignment[],
): PhraseItem[] {
  const result: PhraseItem[] = [];
  const maxLen = Math.max(origPhrases.length, transPhrases.length);

  for (let i = 0; i < maxLen; i++) {
    const orig = origPhrases[i];
    const trans = transPhrases[i];

    if (!orig && !trans) continue;

    result.push({
      index: i,
      origText: orig?.text ?? "",
      transText: trans?.text ?? "",
      startMs: orig?.startMs ?? 0,
      endMs: orig?.endMs ?? 0,
      transStartMs: trans?.startMs ?? 0,
      transEndMs: trans?.endMs ?? 0,
      confidence: 1.0,
      origTokens: orig?.words.map((w) => ({
        text: w.word,
        startMs: w.startMs,
        durationMs: w.endMs - w.startMs,
        isWordLike: true,
      })),
      transTokens: trans?.words.map((w) => ({
        text: w.word,
        startMs: w.startMs,
        durationMs: w.endMs - w.startMs,
        isWordLike: true,
      })),
    });
  }

  return result;
}

/**
 * Align original and translation phrases by time overlap
 */
export function alignPhrasePairs(
  origPhrases: PhraseAlignment[],
  transPhrases: PhraseAlignment[],
): Array<{ orig: PhraseAlignment; trans: PhraseAlignment | null }> {
  if (origPhrases.length === 0) return [];
  if (transPhrases.length === 0) {
    return origPhrases.map((orig) => ({ orig, trans: null }));
  }

  const result: Array<{ orig: PhraseAlignment; trans: PhraseAlignment | null }> = [];
  let transIndex = 0;

  for (const orig of origPhrases) {
    // Find overlapping translation phrases
    const overlapping: PhraseAlignment[] = [];

    while (transIndex < transPhrases.length) {
      const trans = transPhrases[transIndex];

      // Check for overlap
      const hasOverlap = 
        (trans.startMs < orig.endMs && trans.endMs > orig.startMs) ||
        (transIndex === transPhrases.length - 1 && overlapping.length === 0);

      if (hasOverlap) {
        overlapping.push(trans);
        transIndex++;
      } else if (trans.startMs >= orig.endMs) {
        // Translation is after original, stop looking
        break;
      } else {
        // Translation is before original, skip it
        transIndex++;
      }
    }

    // Merge overlapping translations
    const mergedTrans: PhraseAlignment | null = overlapping.length > 0 ? {
      text: overlapping.map((p) => p.text).join(" "),
      startMs: Math.min(...overlapping.map((p) => p.startMs)),
      endMs: Math.max(...overlapping.map((p) => p.endMs)),
      words: overlapping.flatMap((p) => p.words),
    } : null;

    result.push({ orig, trans: mergedTrans });
  }

  return result;
}

// ============================================================================
// Qwen-assisted Segmentation
// ============================================================================

interface QwenSegmentationRequest {
  words: Array<{ word: string; index: number }>;
  language: string;
}

interface QwenSegmentationResponse {
  boundaries: number[];
}

/**
 * Build prompt for Qwen to segment words into phrases
 */
function buildSegmentationPrompt(request: QwenSegmentationRequest): string {
  const wordList = request.words.map((w, i) => `${i}. ${w.word}`).join("\n");

  return `You are a language learning expert. Your task is to segment a sequence of words into optimal phrases for language learning.

GOAL: Create phrase boundaries that form complete, natural phrases optimal for learning.

LANGUAGE: ${request.language}

WORDS (numbered):
${wordList}

RULES:
1. Each phrase should have 3-8 words
2. Phrases should be complete thoughts
3. Break at natural sentence boundaries (period, question mark, exclamation)
4. Keep related words together (articles + nouns, prepositions + objects)
5. Don't break mid-phrase (e.g., "the big | house" is wrong)

OUTPUT FORMAT (JSON only):
{
  "boundaries": [5, 12, 18, ...]
}

The boundaries array contains the indices AFTER which a phrase ends.
For example, boundaries: [5, 12] means:
- Phrase 1: words 0-5
- Phrase 2: words 6-12
- Phrase 3: words 13-end

Return ONLY valid JSON, no other text.`;
}

/**
 * Parse Qwen segmentation response
 */
function parseSegmentationResponse(raw: string, maxIndex: number): number[] {
  const trimmed = raw.trim();
  
  // Try to extract JSON
  const jsonMatch = trimmed.match(/\{[\s\S]*"boundaries"[\s\S]*\}/);
  if (!jsonMatch) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as QwenSegmentationResponse;
    if (Array.isArray(parsed.boundaries)) {
      // Validate and sort boundaries
      return parsed.boundaries
        .filter((b) => Number.isFinite(b) && b > 0 && b < maxIndex)
        .sort((a, b) => a - b);
    }
  } catch {
    // Ignore parse errors
  }

  return [];
}

/**
 * Segment words into phrases using Qwen API
 */
export async function segmentWithQwen(
  words: WordAlignment[],
  language: string,
  qwenCall: (prompt: string) => Promise<string>,
): Promise<number[]> {
  if (words.length <= OPTIMAL_WORDS_PER_PHRASE) {
    return [words.length];
  }

  const request: QwenSegmentationRequest = {
    words: words.map((w, i) => ({ word: w.word, index: i })),
    language,
  };

  const prompt = buildSegmentationPrompt(request);

  try {
    const response = await qwenCall(prompt);
    const boundaries = parseSegmentationResponse(response, words.length);

    // Ensure we have valid boundaries
    if (boundaries.length === 0) {
      return findPhraseBoundaries(words);
    }

    // Ensure last boundary covers all words
    if (boundaries[boundaries.length - 1] !== words.length) {
      boundaries.push(words.length);
    }

    return boundaries;
  } catch (error) {
    // Fallback to heuristic segmentation
    return findPhraseBoundaries(words);
  }
}

export type { BoundaryScore };
