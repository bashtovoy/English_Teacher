import type { SubtitleLine, SubtitleToken } from '../../subtitles/types';

export interface PhraseBoundary {
    text: string;
    startMs: number;
    endMs: number;
}

export interface WordToken {
    text: string;
    startMs: number;
    durationMs: number;
    isWordLike: boolean;
}

export interface PhraseItem {
    index: number;
    origText: string;
    transText: string;
    startMs: number;
    endMs: number;
    transStartMs: number;
    transEndMs: number;
    confidence: number;
    // Word-level tokens with timestamps for precise playback
    origTokens?: WordToken[];
    transTokens?: WordToken[];
}

const WORD_RE = /[\p{L}\p{N}]+/gu;
const FIRST_WORD_RE = /[\p{L}\p{N}]+/u;
const STRONG_END_PUNCT_RE = /[.!?\u2026]+(?:["'`)\]}\u00BB\u201D\u2019]+)?$/u;
const SOFT_END_PUNCT_RE = /[,;:]+(?:["'`)\]}\u00BB\u201D\u2019]+)?$/u;
const HAS_WORD_RE = /[\p{L}\p{N}]/u;
const CLOSING_PUNCT_RE = /["'`)\]}\u00BB\u201D\u2019]/u;

const STRONG_PUNCTUATION = new Set(['.', '!', '?', '…']);
const SOFT_PUNCTUATION = new Set([',', ';', ':']);
const LOGICAL_CONNECTOR_WORDS = new Set([
    "and", "but", "or", "so", "because", "if", "then", "while", "when",
    "although", "though", "however", "therefore", "also", "plus",
    "that", "which", "who", "whose", "where", "whereas", "whether",
    "и", "но", "а", "или", "если", "когда", "тогда", "хотя", "однако",
    "поэтому", "также", "затем", "чтобы", "который", "которая", "которые"
]);
const INCOMPLETE_TAIL_WORDS = new Set([
    ...LOGICAL_CONNECTOR_WORDS,
    "to", "of", "for", "with", "from", "into", "onto", "at", "by", "as", "than",
    "в", "на", "с", "к", "по", "от", "до", "о", "об", "за", "из", "под", "над", "для", "без"
]);

const MAX_WORDS_PER_PHRASE = 16;
const MAX_DURATION_MS = 6500;
const HARD_GAP_MS = 850;
const MIN_HARD_PAUSE_WORDS = 1;
const MIN_HARD_PAUSE_DURATION_MS = 350;
const TARGET_CHARS_PER_LINE = 42;
const MAX_CHARS_TWO_LINES = TARGET_CHARS_PER_LINE * 2;
const MIN_CHARS_FOR_LOGICAL_SPLIT = 28;
const MIN_WORDS_FOR_INDEPENDENT_NON_TERMINAL_PHRASE = 4;
const SOFT_TAIL_MIN_WORDS = 5;
const ENDING_PUNCTUATION_RE = /[.!?\u2026]+(?:["'`)\]}\u00BB\u201D\u2019]+)?$/u;
const MIN_PHRASE_DURATION_MS = 700;
const MIN_MICRO_PHRASE_DURATION_MS = 450;
const MIN_PHRASE_WORDS = 2;
const MAX_OVERLAP_RESOLUTION_MS = 180;
const MAX_FORCE_CHUNK_WORDS = 12;
const MAX_FORCE_CHUNK_DURATION_MS = 5200;
const FORCED_SPLIT_SCAN_WINDOW_WORDS = 3;
const ALIGNMENT_OVERLAP_SLOP_MS = 80;
const ALIGNMENT_MAX_SHORT_ORIG_DURATION_MS = 2_200;
const ALIGNMENT_MAX_SHORT_ORIG_WORDS = 4;
const ALIGNMENT_MAX_EXPAND_GAP_MS = 450;
const ALIGNMENT_MAX_OVERFLOW_DURATION_RATIO = 1.45;
const ALIGNMENT_MAX_OVERFLOW_WORD_RATIO = 2.25;
const ALIGNMENT_PAIR_REBALANCE_MIN_IMPROVEMENT = 0.08;
const ALIGNMENT_MIN_TRANSLATION_PART_MS = 280;
const TRANSLATION_MICRO_MERGE_MAX_GAP_MS = 280;
const CONFIDENCE_MIN_FOR_BUNDLE = 0.45;
const BUNDLE_MIN_DURATION_MS = 2_500;
const BUNDLE_MAX_DURATION_MS = 8_000;
const BUNDLE_MERGE_MAX_GAP_MS = 500;
const INCOMPLETE_QUESTION_ENDINGS = new Set([
    "what", "when", "where", "why", "how", "who", "which", "whose",
    "do", "does", "did", "is", "are", "was", "were", "can", "could", "will", "would", "should",
    "кто", "что", "когда", "где", "почему", "зачем", "как"
]);

const countWords = (text: string): number => text.match(WORD_RE)?.length ?? 0;

const joinPhraseText = (parts: string[]): string =>
    parts
        .join(' ')
        .replace(/\s+([,.;:!?…])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

type BoundaryType = 'none' | 'soft' | 'strong';

type TimedTextChunk = {
    text: string;
    startMs: number;
    endMs: number;
    pauseToNextMs: number;
    boundary: BoundaryType;
    nextWord: string | null;
};

const tokenEndMs = (token: SubtitleToken): number =>
    token.startMs + Math.max(0, token.durationMs);

const isTokenUsable = (token: SubtitleToken): boolean =>
    typeof token.text === "string" && token.text.length > 0;

const firstWordFromText = (text: string): string | null =>
    text.match(FIRST_WORD_RE)?.[0]?.toLowerCase() ?? null;

const classifyBoundary = (text: string): BoundaryType => {
    const trimmed = text.trim();
    if (!trimmed) return 'none';
    if (STRONG_END_PUNCT_RE.test(trimmed)) return 'strong';
    if (SOFT_END_PUNCT_RE.test(trimmed)) return 'soft';
    return 'none';
};

const isStrongPunctuation = (char: string): boolean =>
    STRONG_PUNCTUATION.has(char);

const isSoftPunctuation = (char: string): boolean =>
    SOFT_PUNCTUATION.has(char);

const canContinuePunctuationCluster = (char: string): boolean =>
    isStrongPunctuation(char) || isSoftPunctuation(char) || CLOSING_PUNCT_RE.test(char);

const lastWordFromText = (text: string): string | null => {
    const words = text.match(WORD_RE);
    if (!words?.length) return null;
    return words[words.length - 1].toLowerCase();
};

const firstLetterFromText = (text: string): string | null =>
    text.match(/\p{L}/u)?.[0] ?? null;

const startsWithLowercaseLetter = (text: string): boolean => {
    const letter = firstLetterFromText(text);
    if (!letter) return false;
    return letter === letter.toLowerCase() && letter !== letter.toUpperCase();
};

const hasUnclosedBrackets = (text: string): boolean => {
    const pairs: Array<[RegExp, RegExp]> = [
        [/\(/g, /\)/g],
        [/\[/g, /\]/g],
        [/\{/g, /\}/g],
        [/«/g, /»/g],
    ];
    return pairs.some(([openRe, closeRe]) => {
        const opens = text.match(openRe)?.length ?? 0;
        const closes = text.match(closeRe)?.length ?? 0;
        return opens > closes;
    });
};

function splitByPunctuationBoundaries(text: string): string[] {
    const segments: string[] = [];
    let buffer = "";

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        buffer += char;

        if (!isStrongPunctuation(char) && !isSoftPunctuation(char)) {
            continue;
        }

        while (i + 1 < text.length && canContinuePunctuationCluster(text[i + 1])) {
            i += 1;
            buffer += text[i];
        }

        segments.push(buffer);
        buffer = "";
    }

    if (buffer) {
        segments.push(buffer);
    }

    return segments;
}

const splitTextByTimeSlices = (text: string, slices: number): string[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (slices <= 1) return [trimmed];

    const result: string[] = [];
    let cursor = 0;

    for (let i = 1; i < slices; i += 1) {
        const ideal = Math.round((trimmed.length * i) / slices);
        let cut = ideal;

        while (cut < trimmed.length && trimmed[cut] !== ' ') {
            cut += 1;
        }
        if (cut >= trimmed.length) {
            cut = ideal;
            while (cut > cursor && trimmed[cut] !== ' ') {
                cut -= 1;
            }
        }

        if (cut <= cursor + 1) {
            continue;
        }
        result.push(trimmed.slice(cursor, cut).trim());
        cursor = cut;
    }

    const tail = trimmed.slice(cursor).trim();
    if (tail) {
        result.push(tail);
    }

    return result.filter((item) => item.length > 0);
};

const pickForcedSplitWordIndex = (text: string, words: Array<{ word: string; end: number }>, fromWordIdx: number): number => {
    const targetWordIdx = Math.min(fromWordIdx + MAX_FORCE_CHUNK_WORDS - 1, words.length - 1);
    const minIdx = Math.max(fromWordIdx + 2, targetWordIdx - FORCED_SPLIT_SCAN_WINDOW_WORDS);
    const maxIdx = Math.min(words.length - 2, targetWordIdx + FORCED_SPLIT_SCAN_WINDOW_WORDS);
    let bestIdx = targetWordIdx;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let idx = minIdx; idx <= maxIdx; idx += 1) {
        const current = words[idx];
        const next = words[idx + 1];
        let score = -Math.abs(idx - targetWordIdx);

        const tailChunk = text.slice(0, current.end).trimEnd();
        if (/[,;:]/u.test(tailChunk[tailChunk.length - 1] ?? '')) {
            score += 3;
        }
        if (next && LOGICAL_CONNECTOR_WORDS.has(next.word.toLowerCase())) {
            score += 2;
        }

        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    }

    return bestIdx;
};

const splitLongPartByWords = (text: string): string[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const words = Array.from(trimmed.matchAll(WORD_RE), (match) => ({
        word: match[0],
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length
    }));

    if (words.length <= MAX_FORCE_CHUNK_WORDS) {
        return [trimmed];
    }

    const result: string[] = [];
    let wordStart = 0;
    let charStart = 0;

    while (wordStart < words.length) {
        const remaining = words.length - wordStart;
        if (remaining <= MAX_FORCE_CHUNK_WORDS) {
            const tail = trimmed.slice(charStart).trim();
            if (tail) result.push(tail);
            break;
        }

        const splitWordIdx = pickForcedSplitWordIndex(trimmed, words, wordStart);
        const charEnd = words[splitWordIdx].end;
        const segment = trimmed.slice(charStart, charEnd).trim();
        if (segment) {
            result.push(segment);
        }
        charStart = charEnd;
        wordStart = splitWordIdx + 1;
    }

    return result.filter((item) => item.length > 0);
};

const splitOverlongTextPart = (text: string, estimatedDurationMs: number): string[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const byWords = splitLongPartByWords(trimmed);
    if (byWords.length > 1) {
        const totalWeight = byWords.reduce((sum, part) => sum + textWeight(part), 0);
        const refined: string[] = [];
        for (const part of byWords) {
            const partWeight = textWeight(part);
            const partDurationMs = totalWeight > 0
                ? Math.round(estimatedDurationMs * (partWeight / totalWeight))
                : estimatedDurationMs;
            if (partDurationMs > MAX_FORCE_CHUNK_DURATION_MS) {
                const slices = Math.max(2, Math.ceil(partDurationMs / MAX_FORCE_CHUNK_DURATION_MS));
                refined.push(...splitTextByTimeSlices(part, slices));
            } else {
                refined.push(part);
            }
        }
        return refined.filter((item) => item.length > 0);
    }

    if (estimatedDurationMs > MAX_FORCE_CHUNK_DURATION_MS) {
        const slices = Math.max(2, Math.ceil(estimatedDurationMs / MAX_FORCE_CHUNK_DURATION_MS));
        const byTime = splitTextByTimeSlices(trimmed, slices);
        if (byTime.length > 1) {
            return byTime;
        }
    }

    return [trimmed];
};

const textWeight = (text: string): number => {
    const compact = text.replace(/\s+/g, "");
    return compact.length > 0 ? compact.length : 1;
};

function splitChunkByPunctuation(chunk: {
    text: string;
    startMs: number;
    endMs: number;
}): TimedTextChunk[] {
    const punctuationParts = splitByPunctuationBoundaries(chunk.text).filter((part) => part.trim().length > 0);
    if (punctuationParts.length === 0) return [];

    const sourceDurationMs = Math.max(0, chunk.endMs - chunk.startMs);
    const punctuationWeight = punctuationParts.reduce((sum, part) => sum + textWeight(part), 0);
    const parts: Array<{ text: string; forcedBreakAfter: boolean }> = [];
    for (const part of punctuationParts) {
        const partWeight = textWeight(part);
        const estimatedDurationMs = punctuationWeight > 0
            ? Math.round(sourceDurationMs * (partWeight / punctuationWeight))
            : sourceDurationMs;
        const splitParts = splitOverlongTextPart(part, estimatedDurationMs);
        for (let idx = 0; idx < splitParts.length; idx += 1) {
            parts.push({
                text: splitParts[idx],
                forcedBreakAfter: idx < splitParts.length - 1
            });
        }
    }

    if (parts.length === 0) return [];

    if (parts.length === 1) {
        return [{
            text: parts[0].text,
            startMs: chunk.startMs,
            endMs: chunk.endMs,
            pauseToNextMs: 0,
            boundary: classifyBoundary(parts[0].text),
            nextWord: null
        }];
    }

    const totalWeight = parts.reduce((sum, part) => sum + textWeight(part.text), 0);
    let remainingWeight = totalWeight;
    let cursor = chunk.startMs;
    const result: TimedTextChunk[] = [];

    for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        const weight = textWeight(part.text);
        const isLast = i === parts.length - 1;
        const remainingDuration = Math.max(0, chunk.endMs - cursor);
        const partDuration = isLast || remainingWeight <= 0
            ? remainingDuration
            : Math.max(0, Math.round(remainingDuration * (weight / remainingWeight)));
        const nextCursor = isLast
            ? chunk.endMs
            : Math.min(chunk.endMs, cursor + partDuration);

        result.push({
            text: part.text,
            startMs: cursor,
            endMs: nextCursor,
            pauseToNextMs: 0,
            boundary: part.forcedBreakAfter ? 'strong' : classifyBoundary(part.text),
            nextWord: null
        });

        cursor = nextCursor;
        remainingWeight -= weight;
    }

    return result;
}

function collectTimedChunks(lines: SubtitleLine[]): TimedTextChunk[] {
    const baseChunks: Array<{
        text: string;
        startMs: number;
        endMs: number;
    }> = [];
    const flatTokens: SubtitleToken[] = [];

    for (const line of lines) {
        const usableTokens = (line.tokens ?? []).filter(isTokenUsable);
        if (usableTokens.length > 0) {
            flatTokens.push(...usableTokens);
            continue;
        }

        const fallbackText = line.text ?? "";
        if (!fallbackText) continue;

        const startMs = Math.max(0, line.startMs);
        const endMs = Math.max(startMs, line.startMs + Math.max(0, line.durationMs));
        baseChunks.push({
            text: fallbackText,
            startMs,
            endMs
        });
    }

    if (flatTokens.length > 0) {
        baseChunks.length = 0;
        for (const token of flatTokens) {
            const startMs = Math.max(0, token.startMs);
            const endMs = Math.max(startMs, tokenEndMs(token));
            baseChunks.push({
                text: token.text,
                startMs,
                endMs
            });
        }
    }

    const chunks: TimedTextChunk[] = [];
    for (const baseChunk of baseChunks) {
        chunks.push(...splitChunkByPunctuation(baseChunk));
    }

    for (let i = 0; i < chunks.length; i += 1) {
        const nextChunk = chunks[i + 1];
        chunks[i].pauseToNextMs = nextChunk
            ? Math.max(0, nextChunk.startMs - chunks[i].endMs)
            : 0;
        chunks[i].nextWord = nextChunk ? firstWordFromText(nextChunk.text) : null;
    }

    return chunks;
}

function segmentLinesForAlignment(lines: SubtitleLine[]): PhraseBoundary[] {
    const phrases: PhraseBoundary[] = [];

    for (const line of lines) {
        const tokensText = (line.tokens ?? [])
            .filter(isTokenUsable)
            .map((token) => token.text)
            .join('');
        const sourceText = (line.text && line.text.length > 0 ? line.text : tokensText).trim();
        if (!sourceText || !HAS_WORD_RE.test(sourceText)) {
            continue;
        }

        const startMs = Math.max(0, line.startMs);
        const endMs = Math.max(startMs, line.startMs + Math.max(0, line.durationMs));
        const splitChunks = splitChunkByPunctuation({
            text: sourceText,
            startMs,
            endMs
        });

        for (const chunk of splitChunks) {
            const chunkText = joinPhraseText([chunk.text]);
            if (!chunkText || !HAS_WORD_RE.test(chunkText)) {
                continue;
            }
            phrases.push({
                text: chunkText,
                startMs: chunk.startMs,
                endMs: chunk.endMs
            });
        }
    }

    return phrases;
}

function resolveOverlappingPhrases(phrases: PhraseBoundary[]): PhraseBoundary[] {
    if (phrases.length < 2) return phrases;

    const normalized = phrases.map((phrase) => ({ ...phrase }));
    for (let i = 1; i < normalized.length; i += 1) {
        const prev = normalized[i - 1];
        const current = normalized[i];
        if (current.startMs >= prev.endMs) {
            continue;
        }

        const overlapMs = prev.endMs - current.startMs;
        if (overlapMs <= 0) {
            continue;
        }

        if (overlapMs <= MAX_OVERLAP_RESOLUTION_MS) {
            const splitPoint = Math.round((prev.endMs + current.startMs) / 2);
            prev.endMs = Math.max(prev.startMs, splitPoint);
            current.startMs = Math.max(prev.endMs, Math.min(current.endMs, splitPoint));
            continue;
        }

        current.startMs = Math.max(current.startMs, prev.endMs);
        if (current.endMs < current.startMs) {
            current.endMs = current.startMs;
        }
    }

    return normalized;
}

function needsSemanticMerge(current: PhraseBoundary, next: PhraseBoundary | undefined): boolean {
    if (!next) return false;
    const currentText = current.text.trim();
    if (!currentText) return false;
    if (ENDING_PUNCTUATION_RE.test(currentText)) return false;

    const currentWordCount = countWords(currentText);
    const tailWord = lastWordFromText(currentText);
    const endsWithSoftPunctuation = SOFT_END_PUNCT_RE.test(currentText);
    const nextStartsLower = startsWithLowercaseLetter(next.text);
    const currentDuration = Math.max(0, current.endMs - current.startMs);

    if (tailWord && INCOMPLETE_QUESTION_ENDINGS.has(tailWord)) {
        return true;
    }
    if (tailWord && INCOMPLETE_TAIL_WORDS.has(tailWord)) {
        return true;
    }
    if (hasUnclosedBrackets(currentText)) {
        return true;
    }
    if (endsWithSoftPunctuation && currentWordCount < SOFT_TAIL_MIN_WORDS) {
        return true;
    }
    if (nextStartsLower && currentWordCount < MIN_WORDS_FOR_INDEPENDENT_NON_TERMINAL_PHRASE) {
        return true;
    }
    if (currentDuration < MIN_MICRO_PHRASE_DURATION_MS && currentWordCount <= MIN_PHRASE_WORDS) {
        return true;
    }
    if (
        currentDuration < MIN_PHRASE_DURATION_MS &&
        currentWordCount < MIN_PHRASE_WORDS &&
        !ENDING_PUNCTUATION_RE.test(currentText)
    ) {
        return true;
    }
    if (currentWordCount <= 2) {
        const words = wordsFromText(currentText);
        if (words.some((word) => LOGICAL_CONNECTOR_WORDS.has(word))) {
            return true;
        }
    }

    return false;
}

function enforceSemanticCompleteness(phrases: PhraseBoundary[]): PhraseBoundary[] {
    if (phrases.length < 2) return phrases;

    const nonOverlappingPhrases = resolveOverlappingPhrases(phrases);
    const result: PhraseBoundary[] = [];
    for (let i = 0; i < nonOverlappingPhrases.length; i += 1) {
        let current = { ...nonOverlappingPhrases[i] };

        while (i + 1 < nonOverlappingPhrases.length && needsSemanticMerge(current, nonOverlappingPhrases[i + 1])) {
            const next = nonOverlappingPhrases[i + 1];
            current = {
                text: joinPhraseText([current.text, next.text]),
                startMs: Math.min(current.startMs, next.startMs),
                endMs: Math.max(current.endMs, next.endMs)
            };
            i += 1;
        }

        result.push(current);
    }

    return result;
}

function wordsFromText(text: string): string[] {
    return Array.from(text.toLowerCase().matchAll(WORD_RE), (m) => m[0]);
}

function hasWordCoverageMismatch(chunks: TimedTextChunk[], phrases: PhraseBoundary[]): boolean {
    const sourceWords = wordsFromText(chunks.map((chunk) => chunk.text).join(' '));
    const phraseWords = wordsFromText(phrases.map((phrase) => phrase.text).join(' '));
    if (sourceWords.length !== phraseWords.length) {
        return true;
    }

    for (let i = 0; i < sourceWords.length; i += 1) {
        if (sourceWords[i] !== phraseWords[i]) {
            return true;
        }
    }
    return false;
}

function fallbackPhrasesFromChunks(chunks: TimedTextChunk[]): PhraseBoundary[] {
    return chunks
        .map((chunk) => ({
            text: joinPhraseText([chunk.text]),
            startMs: chunk.startMs,
            endMs: chunk.endMs
        }))
        .filter((item) => item.text.length > 0);
}

type SegmentSubtitleOptions = {
    semanticPostProcess?: boolean;
};

export function segmentSubtitleLines(lines: SubtitleLine[], options: SegmentSubtitleOptions = {}): PhraseBoundary[] {
    const { semanticPostProcess = true } = options;
    if (lines.length === 0) return [];

    const chunks = collectTimedChunks(lines);
    if (chunks.length === 0) return [];

    const phrases: PhraseBoundary[] = [];
    let currentText: string[] = [];
    let currentStartMs = -1;
    let currentEndMs = 0;
    let currentWordCount = 0;
    let currentCharCount = 0;

    const flushPhrase = () => {
        const text = joinPhraseText(currentText);
        if (!text) {
            currentText = [];
            currentStartMs = -1;
            currentEndMs = 0;
            currentWordCount = 0;
            currentCharCount = 0;
            return;
        }

        phrases.push({
            text,
            startMs: currentStartMs >= 0 ? currentStartMs : 0,
            endMs: Math.max(currentEndMs, currentStartMs >= 0 ? currentStartMs : 0),
        });

        currentText = [];
        currentStartMs = -1;
        currentEndMs = 0;
        currentWordCount = 0;
        currentCharCount = 0;
    };

    for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        const chunkText = chunk.text.trim();
        if (!chunkText) continue;

        if (currentStartMs < 0) {
            currentStartMs = chunk.startMs;
        }

        if (currentText.length === 0 && !HAS_WORD_RE.test(chunkText)) {
            continue;
        }

        currentText.push(chunkText);
        currentEndMs = Math.max(currentEndMs, chunk.endMs);
        currentWordCount += countWords(chunkText);
        currentCharCount += chunkText.length;

        const phraseDuration = Math.max(0, currentEndMs - currentStartMs);
        const hasEnoughForHardPause =
            currentWordCount >= MIN_HARD_PAUSE_WORDS ||
            phraseDuration >= MIN_HARD_PAUSE_DURATION_MS;
        const reachedHardLimit =
            currentWordCount >= MAX_WORDS_PER_PHRASE ||
            phraseDuration >= MAX_DURATION_MS;

        const nextChunk = chunks[i + 1];
        const sentenceTooLong = currentCharCount > MAX_CHARS_TWO_LINES;
        const nextStartsWithConnector = chunk.nextWord
            ? LOGICAL_CONNECTOR_WORDS.has(chunk.nextWord)
            : false;
        const softBoundaryCandidate = chunk.boundary === 'soft';
        const logicalBoundaryCandidate =
            nextStartsWithConnector &&
            currentCharCount >= MIN_CHARS_FOR_LOGICAL_SPLIT;
        const canSplitAtNaturalBoundary =
            (softBoundaryCandidate || logicalBoundaryCandidate) &&
            currentCharCount >= TARGET_CHARS_PER_LINE;

        const shouldBreak =
            !nextChunk ||
            chunk.boundary === 'strong' ||
            (sentenceTooLong && canSplitAtNaturalBoundary) ||
            (hasEnoughForHardPause && chunk.pauseToNextMs >= HARD_GAP_MS) ||
            reachedHardLimit;

        if (shouldBreak) {
            flushPhrase();
        }
    }

    if (currentText.length > 0) {
        flushPhrase();
    }

    if (!semanticPostProcess) {
        return phrases;
    }

    const semanticPhrases = enforceSemanticCompleteness(phrases);
    if (hasWordCoverageMismatch(chunks, semanticPhrases)) {
        return fallbackPhrasesFromChunks(chunks);
    }
    return semanticPhrases;
}

export class SemanticSegmenter {
    private static instance: SemanticSegmenter;

    static async load(_onProgress?: (p: number) => void): Promise<SemanticSegmenter> {
        if (!this.instance) {
            this.instance = new SemanticSegmenter();
        }
        return this.instance;
    }

    async segment(lines: SubtitleLine[]): Promise<PhraseBoundary[]> {
        if (lines.length === 0) return [];

        return segmentSubtitleLines(lines);
    }
}

const clampNumber = (value: number, minValue: number, maxValue: number): number =>
    Math.max(minValue, Math.min(maxValue, value));

function mergeMicroTranslationPhrases(phrases: PhraseBoundary[]): PhraseBoundary[] {
    if (phrases.length < 2) return phrases;

    const nonOverlapping = resolveOverlappingPhrases(phrases);
    const result: PhraseBoundary[] = [];

    for (let i = 0; i < nonOverlapping.length; i += 1) {
        let current = { ...nonOverlapping[i] };

        while (i + 1 < nonOverlapping.length) {
            const next = nonOverlapping[i + 1];
            const gapMs = Math.max(0, next.startMs - current.endMs);
            if (gapMs > TRANSLATION_MICRO_MERGE_MAX_GAP_MS) {
                break;
            }

            const normalizedCurrent = current.text.trim();
            const currentDuration = Math.max(0, current.endMs - current.startMs);
            const currentWords = countWords(normalizedCurrent);
            const currentTail = lastWordFromText(normalizedCurrent);
            const hasTerminalPunctuation = ENDING_PUNCTUATION_RE.test(normalizedCurrent);
            const shouldMerge =
                !hasTerminalPunctuation &&
                (
                    currentDuration < MIN_MICRO_PHRASE_DURATION_MS ||
                    currentWords <= 1 ||
                    (!!currentTail && (
                        INCOMPLETE_TAIL_WORDS.has(currentTail) ||
                        INCOMPLETE_QUESTION_ENDINGS.has(currentTail)
                    ))
                );

            if (!shouldMerge) {
                break;
            }

            current = {
                text: joinPhraseText([current.text, next.text]),
                startMs: Math.min(current.startMs, next.startMs),
                endMs: Math.max(current.endMs, next.endMs),
            };
            i += 1;
        }

        result.push(current);
    }

    return result;
}

const hasWordLikeText = (text: string): boolean => HAS_WORD_RE.test(text);

function splitTextIntoLogicalUnits(text: string): string[] {
    const normalized = joinPhraseText([text]);
    if (!normalized) return [];

    const punctParts = splitByPunctuationBoundaries(normalized)
        .map((part) => joinPhraseText([part]))
        .filter((part) => part.length > 0 && hasWordLikeText(part));

    if (punctParts.length === 0) {
        return [];
    }

    const units: string[] = [];
    for (const part of punctParts) {
        const splitParts = splitLongPartByWords(part);
        for (const splitPart of splitParts) {
            const clean = joinPhraseText([splitPart]);
            if (clean && hasWordLikeText(clean)) {
                units.push(clean);
            }
        }
    }

    return units;
}

type LogicalSplit = {
    headText: string;
    tailText: string;
    ratio: number;
    score: number;
};

function pickLogicalSplitByRatio(units: string[], targetRatio: number): LogicalSplit | null {
    if (units.length < 2) return null;

    const weights = units.map((unit) => textWeight(unit));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return null;

    let prefixWeight = 0;
    let best: LogicalSplit | null = null;

    for (let cut = 1; cut < units.length; cut += 1) {
        prefixWeight += weights[cut - 1];
        const headText = joinPhraseText(units.slice(0, cut));
        const tailText = joinPhraseText(units.slice(cut));
        if (!headText || !tailText) continue;

        const ratio = prefixWeight / totalWeight;
        let score = Math.abs(ratio - targetRatio);

        if (ENDING_PUNCTUATION_RE.test(headText)) {
            score -= 0.08;
        } else if (SOFT_END_PUNCT_RE.test(headText)) {
            score -= 0.03;
        } else {
            score += 0.04;
        }

        const tailFirstWord = firstWordFromText(tailText);
        if (tailFirstWord && LOGICAL_CONNECTOR_WORDS.has(tailFirstWord)) {
            score += 0.03;
        }

        const headWords = countWords(headText);
        const tailWords = countWords(tailText);
        if (headWords < 2 || tailWords < 2) {
            score += 0.12;
        }

        const candidate: LogicalSplit = {
            headText,
            tailText,
            ratio,
            score,
        };

        if (!best || candidate.score < best.score) {
            best = candidate;
        }
    }

    return best;
}

function pickOverlapUpperBound(
    overlappingIndexes: number[],
    transPhrases: PhraseBoundary[],
    origPhrase: PhraseBoundary
): number {
    if (overlappingIndexes.length === 0) return -1;
    if (overlappingIndexes.length === 1) return overlappingIndexes[0];

    const origDuration = Math.max(1, origPhrase.endMs - origPhrase.startMs);
    const origWordCount = countWords(origPhrase.text);
    if (origDuration <= ALIGNMENT_MAX_SHORT_ORIG_DURATION_MS || origWordCount <= ALIGNMENT_MAX_SHORT_ORIG_WORDS) {
        return overlappingIndexes[0];
    }

    const firstIdx = overlappingIndexes[0];
    const maxAllowedDurationMs = Math.max(
        origDuration + 800,
        Math.round(origDuration * ALIGNMENT_MAX_OVERFLOW_DURATION_RATIO)
    );
    const maxAllowedWords = Math.max(
        origWordCount + 4,
        Math.round(origWordCount * ALIGNMENT_MAX_OVERFLOW_WORD_RATIO)
    );

    let bestIdx = firstIdx;
    for (const candidateIdx of overlappingIndexes) {
        const selected = transPhrases.slice(firstIdx, candidateIdx + 1);
        const selectedText = joinPhraseText(selected.map((item) => item.text));
        const selectedDurationMs = Math.max(0, selected[selected.length - 1].endMs - selected[0].startMs);
        const selectedWords = countWords(selectedText);

        if (candidateIdx > firstIdx) {
            const isOverflow =
                selectedDurationMs > maxAllowedDurationMs ||
                selectedWords > maxAllowedWords;
            if (isOverflow) {
                break;
            }
        }

        bestIdx = candidateIdx;

        const hasTerminalBoundary = ENDING_PUNCTUATION_RE.test(selectedText);
        if (hasTerminalBoundary && selectedDurationMs >= Math.round(origDuration * 0.6)) {
            break;
        }
    }

    return bestIdx;
}

function rebalanceAdjacentMappedPhrases(phrases: PhraseItem[]): PhraseItem[] {
    if (phrases.length < 2) return phrases;

    const result = phrases.map((phrase) => ({
        ...phrase,
        transText: joinPhraseText([phrase.transText]),
    }));

    for (let i = 0; i < result.length - 1; i += 1) {
        const current = result[i];
        const next = result[i + 1];
        const currentOrigDuration = Math.max(1, current.endMs - current.startMs);
        const nextOrigDuration = Math.max(1, next.endMs - next.startMs);
        const currentTransDuration = Math.max(0, current.transEndMs - current.transStartMs);
        const nextTransDuration = Math.max(0, next.transEndMs - next.transStartMs);
        const currentOrigWords = countWords(current.origText);
        const nextOrigWords = countWords(next.origText);
        const currentTransWords = countWords(current.transText);
        const nextTransWords = countWords(next.transText);

        const currentOverflow =
            currentTransDuration > Math.max(currentOrigDuration + 900, Math.round(currentOrigDuration * ALIGNMENT_MAX_OVERFLOW_DURATION_RATIO)) ||
            (currentOrigWords > 0 && currentTransWords > Math.max(currentOrigWords + 4, Math.round(currentOrigWords * ALIGNMENT_MAX_OVERFLOW_WORD_RATIO)));
        const nextOverflow =
            nextTransDuration > Math.max(nextOrigDuration + 900, Math.round(nextOrigDuration * ALIGNMENT_MAX_OVERFLOW_DURATION_RATIO)) ||
            (nextOrigWords > 0 && nextTransWords > Math.max(nextOrigWords + 4, Math.round(nextOrigWords * ALIGNMENT_MAX_OVERFLOW_WORD_RATIO)));
        const currentUnderfilled =
            currentOrigWords >= 3 &&
            currentTransWords <= Math.max(1, Math.round(currentOrigWords * 0.55)) &&
            currentTransDuration < Math.round(currentOrigDuration * 0.7);
        const nextUnderfilled =
            nextOrigWords >= 3 &&
            nextTransWords <= Math.max(1, Math.round(nextOrigWords * 0.55)) &&
            nextTransDuration < Math.round(nextOrigDuration * 0.7);

        const shouldTryRebalance =
            (currentOverflow && nextUnderfilled) ||
            (currentUnderfilled && nextOverflow) ||
            (currentOverflow && nextTransWords === 0) ||
            (nextOverflow && currentTransWords === 0);
        if (!shouldTryRebalance) {
            continue;
        }

        const combinedText = joinPhraseText([current.transText, next.transText]);
        const units = splitTextIntoLogicalUnits(combinedText);
        if (units.length < 2) {
            continue;
        }

        const targetRatio = currentOrigDuration / (currentOrigDuration + nextOrigDuration);
        const bestSplit = pickLogicalSplitByRatio(units, targetRatio);
        if (!bestSplit) {
            continue;
        }

        const currentWeight = textWeight(current.transText);
        const nextWeight = textWeight(next.transText);
        const currentRatio = (currentWeight + nextWeight) > 0
            ? currentWeight / (currentWeight + nextWeight)
            : targetRatio;
        const improvement = Math.abs(currentRatio - targetRatio) - Math.abs(bestSplit.ratio - targetRatio);
        if (improvement < ALIGNMENT_PAIR_REBALANCE_MIN_IMPROVEMENT && !(currentOverflow || nextOverflow)) {
            continue;
        }

        const updatedCurrentText = bestSplit.headText;
        const updatedNextText = bestSplit.tailText;
        if (updatedCurrentText === current.transText && updatedNextText === next.transText) {
            continue;
        }

        result[i] = {
            ...current,
            transText: updatedCurrentText,
        };
        result[i + 1] = {
            ...next,
            transText: updatedNextText,
        };

        const windowStart = Math.min(current.transStartMs, next.transStartMs);
        const windowEnd = Math.max(current.transEndMs, next.transEndMs);
        const windowDuration = Math.max(0, windowEnd - windowStart);
        if (windowDuration <= 0) {
            continue;
        }

        let firstDuration = Math.round(windowDuration * targetRatio);
        if (windowDuration >= ALIGNMENT_MIN_TRANSLATION_PART_MS * 2) {
            firstDuration = clampNumber(
                firstDuration,
                ALIGNMENT_MIN_TRANSLATION_PART_MS,
                windowDuration - ALIGNMENT_MIN_TRANSLATION_PART_MS
            );
        } else {
            firstDuration = Math.round(windowDuration / 2);
        }

        const splitPoint = windowStart + Math.max(0, firstDuration);
        result[i].transStartMs = windowStart;
        result[i].transEndMs = Math.max(windowStart, splitPoint);
        result[i + 1].transStartMs = Math.max(result[i].transEndMs, splitPoint);
        result[i + 1].transEndMs = windowEnd;
    }

    for (let i = 0; i < result.length; i += 1) {
        if (i > 0 && result[i].transStartMs < result[i - 1].transEndMs) {
            const splitPoint = Math.round((result[i].transStartMs + result[i - 1].transEndMs) / 2);
            result[i - 1].transEndMs = Math.max(result[i - 1].transStartMs, splitPoint);
            result[i].transStartMs = Math.max(result[i - 1].transEndMs, Math.min(result[i].transEndMs, splitPoint));
        }
        if (result[i].transEndMs < result[i].transStartMs) {
            result[i].transEndMs = result[i].transStartMs;
        }
    }

    return result;
}

export function alignTranslation(
    origPhrases: PhraseBoundary[],
    transLines: SubtitleLine[],
    origLines?: SubtitleLine[]
): PhraseItem[] {
    const phraseCenter = (phrase: PhraseBoundary): number =>
        Math.round((phrase.startMs + phrase.endMs) / 2);
    const transPhrases = mergeMicroTranslationPhrases(
        resolveOverlappingPhrases(segmentLinesForAlignment(transLines))
    );
    const transCenters = transPhrases.map(phraseCenter);
    let transCursor = 0;

    const median = (values: number[]): number => {
        if (values.length === 0) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        }
        return sorted[mid];
    };

    const findNearestTransIndex = (targetMs: number, fromIndex = 0): number => {
        const total = transCenters.length;
        if (total === 0) return -1;

        const start = Math.max(0, fromIndex);
        if (start >= total) return total - 1;

        let left = start;
        let right = total - 1;
        while (left <= right) {
            const mid = left + ((right - left) >> 1);
            if (transCenters[mid] < targetMs) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        const rightCandidate = Math.min(left, total - 1);
        const leftCandidate = Math.max(start, rightCandidate - 1);
        const leftDistance = Math.abs(transCenters[leftCandidate] - targetMs);
        const rightDistance = Math.abs(transCenters[rightCandidate] - targetMs);
        return leftDistance <= rightDistance ? leftCandidate : rightCandidate;
    };

    const estimateGlobalShiftMs = (): number => {
        if (origPhrases.length === 0 || transPhrases.length === 0) return 0;

        let shift = 0;
        for (let iter = 0; iter < 3; iter += 1) {
            const diffs: number[] = [];
            for (const orig of origPhrases) {
                const origCenter = phraseCenter(orig);
                const nearestIdx = findNearestTransIndex(origCenter + shift);
                if (nearestIdx < 0) continue;
                const transCenter = phraseCenter(transPhrases[nearestIdx]);
                diffs.push(transCenter - origCenter);
            }
            if (diffs.length === 0) break;
            shift = median(diffs);
        }

        return Math.max(-15_000, Math.min(15_000, shift));
    };

    const estimatedShiftMs = estimateGlobalShiftMs();
    const mapped = origPhrases.map((orig, index) => {
        if (transPhrases.length === 0) {
            return {
                index,
                origText: orig.text,
                transText: "",
                startMs: orig.startMs,
                endMs: orig.endMs,
                transStartMs: orig.startMs,
                transEndMs: orig.endMs,
                confidence: 0,
            };
        }

        const adjustedStart = orig.startMs + estimatedShiftMs;
        const adjustedEnd = orig.endMs + estimatedShiftMs;
        let firstIdx = -1;
        let lastIdx = -1;
        const overlappingIndexes: number[] = [];
        for (let i = transCursor; i < transPhrases.length; i += 1) {
            const phrase = transPhrases[i];
            const overlaps =
                phrase.startMs < adjustedEnd + ALIGNMENT_OVERLAP_SLOP_MS &&
                phrase.endMs > adjustedStart - ALIGNMENT_OVERLAP_SLOP_MS;
            if (overlaps) {
                overlappingIndexes.push(i);
                continue;
            }

            if (overlappingIndexes.length > 0 && phrase.startMs >= adjustedEnd + ALIGNMENT_OVERLAP_SLOP_MS) {
                break;
            }
        }

        if (overlappingIndexes.length > 0) {
            firstIdx = overlappingIndexes[0];
            lastIdx = pickOverlapUpperBound(overlappingIndexes, transPhrases, orig);
        }

        if (firstIdx < 0) {
            const adjustedCenter = phraseCenter(orig) + estimatedShiftMs;
            const fallbackIdx = findNearestTransIndex(adjustedCenter, transCursor);
            if (fallbackIdx >= 0) {
                const fallbackDistance = Math.abs(phraseCenter(transPhrases[fallbackIdx]) - adjustedCenter);
                const maxFallbackDistance = Math.max(2_200, (orig.endMs - orig.startMs) * 2);
                if (fallbackDistance <= maxFallbackDistance) {
                    firstIdx = fallbackIdx;
                    lastIdx = fallbackIdx;
                }
            }
        }

        if (firstIdx >= 0 && lastIdx >= firstIdx) {
            let nextCursor = transCursor;
            while (
                nextCursor <= lastIdx &&
                transPhrases[nextCursor].endMs <= adjustedEnd + ALIGNMENT_OVERLAP_SLOP_MS
            ) {
                nextCursor += 1;
            }
            nextCursor = Math.max(nextCursor, lastIdx + 1);
            transCursor = Math.min(nextCursor, transPhrases.length);
        }

        let resolvedLastIdx = lastIdx;
        if (firstIdx >= 0 && resolvedLastIdx >= firstIdx) {
            const selected = transPhrases.slice(firstIdx, resolvedLastIdx + 1);
            const selectedText = joinPhraseText(selected.map((item) => item.text));
            const selectedDurationMs = selected[selected.length - 1].endMs - selected[0].startMs;
            const selectedWordCount = countWords(selectedText);
            const selectedTailWord = lastWordFromText(selectedText);
            const hasTerminalPunctuation = ENDING_PUNCTUATION_RE.test(selectedText.trim());
            const shouldExpandWithNext =
                resolvedLastIdx + 1 < transPhrases.length &&
                !hasTerminalPunctuation &&
                (
                    selectedDurationMs < MIN_MICRO_PHRASE_DURATION_MS ||
                    (selectedDurationMs < MIN_PHRASE_DURATION_MS && selectedWordCount < MIN_PHRASE_WORDS) ||
                    (!!selectedTailWord && (
                        INCOMPLETE_TAIL_WORDS.has(selectedTailWord) ||
                        INCOMPLETE_QUESTION_ENDINGS.has(selectedTailWord)
                    ))
                );

            if (shouldExpandWithNext) {
                const nextPhrase = transPhrases[resolvedLastIdx + 1];
                const gapMs = Math.max(0, nextPhrase.startMs - selected[selected.length - 1].endMs);
                if (gapMs <= ALIGNMENT_MAX_EXPAND_GAP_MS) {
                    resolvedLastIdx += 1;
                    transCursor = Math.max(transCursor, resolvedLastIdx + 1);
                }
            }
        }

        const trans = firstIdx >= 0 && resolvedLastIdx >= firstIdx
            ? transPhrases.slice(firstIdx, resolvedLastIdx + 1)
            : [];

        const transText = joinPhraseText(trans.map((item) => item.text));
        const transStartMs = trans.length > 0 ? trans[0].startMs : orig.startMs;
        const transEndMs = trans.length > 0 ? trans[trans.length - 1].endMs : orig.endMs;
        
        // Extract original tokens if source lines provided
        const origTokens = origLines 
            ? extractTokensInRange(origLines, orig.startMs, orig.endMs)
            : undefined;
        
        // Create translation tokens
        const transTokens = transText 
            ? createAlignedTranslationTokens(transText, origTokens ?? [], transStartMs, transEndMs)
            : undefined;
        
        return {
            index,
            origText: orig.text,
            transText,
            startMs: orig.startMs,
            endMs: orig.endMs,
            transStartMs,
            transEndMs,
            confidence: 0,
            origTokens,
            transTokens,
        };
    });

    const rebalanced = rebalanceAdjacentMappedPhrases(mapped);
    const withConfidence = rebalanced.map((phrase) => ({
        ...phrase,
        confidence: computePhraseConfidence(phrase),
    }));
    return mergeByConfidence(withConfidence);
}

/**
 * Extract tokens with timestamps from subtitle lines that fall within a time range.
 */
function extractTokensInRange(
    lines: SubtitleLine[],
    startMs: number,
    endMs: number
): WordToken[] {
    const tokens: WordToken[] = [];
    
    for (const line of lines) {
        // Check if line overlaps with range
        const lineEnd = line.startMs + Math.max(0, line.durationMs);
        if (lineEnd < startMs || line.startMs > endMs) continue;
        
        // Add tokens that fall within the range
        for (const token of line.tokens ?? []) {
            const tokenEnd = token.startMs + Math.max(0, token.durationMs);
            if (tokenEnd >= startMs && token.startMs <= endMs) {
                tokens.push({
                    text: token.text,
                    startMs: token.startMs,
                    durationMs: token.durationMs,
                    isWordLike: token.isWordLike,
                });
            }
        }
    }
    
    // Sort by start time
    tokens.sort((a, b) => a.startMs - b.startMs);
    return tokens;
}

/**
 * Distribute timestamps for translation words proportionally.
 * Creates word tokens for translation text based on the timing window.
 */
function createTranslationTokens(
    text: string,
    startMs: number,
    endMs: number
): WordToken[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    
    const duration = Math.max(0, endMs - startMs);
    if (duration <= 0) return [];
    
    // Split into words
    const wordMatches = Array.from(trimmed.matchAll(WORD_RE));
    if (wordMatches.length === 0) return [];
    
    const tokens: WordToken[] = [];
    const totalChars = trimmed.length;
    let cursor = startMs;
    
    for (let i = 0; i < wordMatches.length; i++) {
        const match = wordMatches[i];
        const word = match[0];
        const wordStart = match.index ?? 0;
        const wordEnd = wordStart + word.length;
        
        // Calculate duration proportional to word position
        const startRatio = wordStart / totalChars;
        const endRatio = wordEnd / totalChars;
        const wordStartMs = startMs + Math.round(duration * startRatio);
        const wordEndMs = i === wordMatches.length - 1 
            ? endMs 
            : startMs + Math.round(duration * endRatio);
        
        tokens.push({
            text: word,
            startMs: wordStartMs,
            durationMs: Math.max(0, wordEndMs - wordStartMs),
            isWordLike: true,
        });
        
        cursor = wordEndMs;
    }
    
    return tokens;
}

/**
 * Create word tokens from text with interpolated timing based on alignment.
 * Uses original tokens as reference for better timing distribution.
 */
function createAlignedTranslationTokens(
    transText: string,
    origTokens: WordToken[],
    transStartMs: number,
    transEndMs: number
): WordToken[] {
    const trimmed = transText.trim();
    if (!trimmed) return [];
    
    const transDuration = Math.max(0, transEndMs - transStartMs);
    if (transDuration <= 0) return [];
    
    // Split into words
    const wordMatches = Array.from(trimmed.matchAll(WORD_RE));
    if (wordMatches.length === 0) return [];
    
    const tokens: WordToken[] = [];
    const transWordCount = wordMatches.length;
    const origWordCount = origTokens.filter(t => t.isWordLike).length;
    
    // If we have original tokens with timing, use them for alignment
    if (origWordCount > 0 && transWordCount > 0) {
        const origWordTokens = origTokens.filter(t => t.isWordLike);
        const origDuration = origWordTokens.length > 0
            ? origWordTokens[origWordTokens.length - 1].startMs + origWordTokens[origWordTokens.length - 1].durationMs - origWordTokens[0].startMs
            : transDuration;
        
        // Map each translation word to a corresponding original word timing
        for (let i = 0; i < wordMatches.length; i++) {
            const match = wordMatches[i];
            const word = match[0];
            
            // Find corresponding original word index
            const origIndex = Math.min(
                Math.round((i * origWordCount) / transWordCount),
                origWordTokens.length - 1
            );
            const origToken = origWordTokens[origIndex];
            
            if (origToken) {
                // Scale timing to translation window
                const origRelativeStart = origToken.startMs - (origWordTokens[0]?.startMs ?? 0);
                const scaledStart = transStartMs + (origRelativeStart / Math.max(1, origDuration)) * transDuration;
                const scaledDuration = (origToken.durationMs / Math.max(1, origDuration)) * transDuration;
                
                tokens.push({
                    text: word,
                    startMs: Math.round(scaledStart),
                    durationMs: Math.round(Math.max(0, scaledDuration)),
                    isWordLike: true,
                });
            }
        }
    } else {
        // Fallback: proportional distribution
        return createTranslationTokens(trimmed, transStartMs, transEndMs);
    }
    
    return tokens;
}

export function computePhraseConfidence(phrase: PhraseItem): number {
    const origDurationMs = Math.max(1, phrase.endMs - phrase.startMs);
    const transDurationMs = Math.max(1, phrase.transEndMs - phrase.transStartMs);
    const origWords = countWords(phrase.origText);
    const transWords = countWords(phrase.transText);

    let score = 1.0;

    // Empty translation is very bad
    if (!phrase.transText || !phrase.transText.trim()) {
        return 0;
    }

    // Timing ratio: ideal is 0.6–1.6
    const timingRatio = transDurationMs / origDurationMs;
    if (timingRatio < 0.3) {
        score -= 0.4;
    } else if (timingRatio < 0.6) {
        score -= 0.15;
    } else if (timingRatio > 2.5) {
        score -= 0.4;
    } else if (timingRatio > 1.6) {
        score -= 0.15;
    }

    // Word ratio: ideal is 0.3–3.0
    if (origWords > 0 && transWords > 0) {
        const wordRatio = transWords / origWords;
        if (wordRatio < 0.15) {
            score -= 0.35;
        } else if (wordRatio < 0.3) {
            score -= 0.15;
        } else if (wordRatio > 4.0) {
            score -= 0.35;
        } else if (wordRatio > 3.0) {
            score -= 0.15;
        }
    } else if (origWords > 2 && transWords === 0) {
        score -= 0.5;
    }

    // Text completeness: penalize incomplete tail words in translation
    const tailWord = lastWordFromText(phrase.transText);
    const hasTerminal = ENDING_PUNCTUATION_RE.test(phrase.transText.trim());
    if (tailWord && INCOMPLETE_TAIL_WORDS.has(tailWord) && !hasTerminal) {
        score -= 0.15;
    }

    // Overflow: translation much longer than original
    if (transDurationMs > origDurationMs * ALIGNMENT_MAX_OVERFLOW_DURATION_RATIO + 900) {
        score -= 0.2;
    }

    // Very short translation for long original
    if (origDurationMs > 3000 && transDurationMs < 500) {
        score -= 0.3;
    }

    return clampNumber(score, 0, 1);
}

export function mergeByConfidence(
    phrases: PhraseItem[],
    minConfidence: number = CONFIDENCE_MIN_FOR_BUNDLE
): PhraseItem[] {
    if (phrases.length < 2) return phrases;

    // Find low-confidence indexes
    const lowConfIndexes = new Set<number>();
    for (let i = 0; i < phrases.length; i += 1) {
        if (phrases[i].confidence < minConfidence) {
            lowConfIndexes.add(i);
            // Also include direct neighbors for context
            if (i > 0) lowConfIndexes.add(i - 1);
            if (i < phrases.length - 1) lowConfIndexes.add(i + 1);
        }
    }

    if (lowConfIndexes.size === 0) return phrases;

    // Build merge ranges from contiguous low-confidence regions
    const sortedIndexes = Array.from(lowConfIndexes).sort((a, b) => a - b);
    const mergeRanges: Array<{ start: number; end: number }> = [];
    let rangeStart = sortedIndexes[0];
    let rangeEnd = sortedIndexes[0];

    for (let i = 1; i < sortedIndexes.length; i += 1) {
        const idx = sortedIndexes[i];
        const prevPhrase = phrases[rangeEnd];
        const curPhrase = phrases[idx];
        const gapMs = Math.max(0, curPhrase.startMs - prevPhrase.endMs);
        const mergedDuration = curPhrase.endMs - phrases[rangeStart].startMs;

        if (idx === rangeEnd + 1 && gapMs <= BUNDLE_MERGE_MAX_GAP_MS && mergedDuration <= BUNDLE_MAX_DURATION_MS) {
            rangeEnd = idx;
        } else {
            mergeRanges.push({ start: rangeStart, end: rangeEnd });
            rangeStart = idx;
            rangeEnd = idx;
        }
    }
    mergeRanges.push({ start: rangeStart, end: rangeEnd });

    // Build result: merge ranges into bundles, keep others as-is
    const result: PhraseItem[] = [];
    let cursor = 0;

    for (const range of mergeRanges) {
        // Copy phrases before this range
        while (cursor < range.start) {
            result.push(phrases[cursor]);
            cursor += 1;
        }

        const rangeSize = range.end - range.start + 1;
        if (rangeSize <= 1) {
            // Single phrase, no merge needed
            result.push(phrases[cursor]);
            cursor = range.end + 1;
            continue;
        }

        const rangePhrases = phrases.slice(range.start, range.end + 1);
        const totalOrigDuration = rangePhrases[rangePhrases.length - 1].endMs - rangePhrases[0].startMs;

        // Only merge if the block is within acceptable duration range
        if (totalOrigDuration < BUNDLE_MIN_DURATION_MS || totalOrigDuration > BUNDLE_MAX_DURATION_MS) {
            // Just pass through without merging
            for (const p of rangePhrases) {
                result.push(p);
            }
            cursor = range.end + 1;
            continue;
        }

        // Merge: combine translation texts and redistribute based on original durations
        const combinedTransText = joinPhraseText(rangePhrases.map((p) => p.transText));
        const transWindowStart = Math.min(...rangePhrases.map((p) => p.transStartMs));
        const transWindowEnd = Math.max(...rangePhrases.map((p) => p.transEndMs));
        const combinedTransDuration = Math.max(0, transWindowEnd - transWindowStart);

        // Split combined text proportionally across phrases by original duration
        const units = splitTextIntoLogicalUnits(combinedTransText);
        if (units.length < rangeSize) {
            // Not enough text units to split — merge into fewer phrases
            const origDurations = rangePhrases.map((p) => Math.max(1, p.endMs - p.startMs));
            const totalOrigMs = origDurations.reduce((s, d) => s + d, 0);
            let transCursor = transWindowStart;

            for (let i = 0; i < rangePhrases.length; i += 1) {
                const ratio = origDurations[i] / totalOrigMs;
                const targetRatio = ratio;

                // Try to split text by ratio
                const remainingUnits = splitTextIntoLogicalUnits(
                    combinedTransText.slice(
                        combinedTransText.indexOf(
                            rangePhrases[i > 0 ? i : 0].transText.trim().slice(0, 5)
                        ) >= 0 ? 0 : 0
                    )
                );

                const transDur = Math.round(combinedTransDuration * targetRatio);
                const transEnd = i === rangePhrases.length - 1
                    ? transWindowEnd
                    : Math.min(transWindowEnd, transCursor + transDur);

                result.push({
                    ...rangePhrases[i],
                    transText: rangePhrases[i].transText, // keep original text
                    transStartMs: transCursor,
                    transEndMs: transEnd,
                    confidence: computePhraseConfidence(rangePhrases[i]),
                });
                transCursor = transEnd;
            }
        } else {
            // Enough units — distribute by original duration ratios
            const origDurations = rangePhrases.map((p) => Math.max(1, p.endMs - p.startMs));
            const totalOrigMs = origDurations.reduce((s, d) => s + d, 0);
            let unitCursor = 0;
            let transCursor = transWindowStart;

            for (let i = 0; i < rangePhrases.length; i += 1) {
                const ratio = origDurations[i] / totalOrigMs;
                const targetUnits = i === rangePhrases.length - 1
                    ? units.length - unitCursor
                    : Math.max(1, Math.round(units.length * ratio));
                const actualUnits = Math.min(targetUnits, units.length - unitCursor);

                if (actualUnits <= 0) {
                    const transDur = Math.round(combinedTransDuration * ratio);
                    const transEnd = i === rangePhrases.length - 1
                        ? transWindowEnd
                        : Math.min(transWindowEnd, transCursor + transDur);
                    result.push({
                        ...rangePhrases[i],
                        transText: '',
                        transStartMs: transCursor,
                        transEndMs: transEnd,
                        confidence: 0,
                    });
                    transCursor = transEnd;
                    continue;
                }

                const assignedText = joinPhraseText(units.slice(unitCursor, unitCursor + actualUnits));
                const transDur = Math.round(combinedTransDuration * ratio);
                const transEnd = i === rangePhrases.length - 1
                    ? transWindowEnd
                    : Math.min(transWindowEnd, transCursor + transDur);

                const merged: PhraseItem = {
                    ...rangePhrases[i],
                    transText: assignedText,
                    transStartMs: transCursor,
                    transEndMs: transEnd,
                    confidence: 0, // will be recomputed
                };
                merged.confidence = computePhraseConfidence(merged);
                result.push(merged);

                unitCursor += actualUnits;
                transCursor = transEnd;
            }
        }

        cursor = range.end + 1;
    }

    // Copy remaining phrases
    while (cursor < phrases.length) {
        result.push(phrases[cursor]);
        cursor += 1;
    }

    // Re-index
    for (let i = 0; i < result.length; i += 1) {
        result[i] = { ...result[i], index: i };
    }

    return result;
}
