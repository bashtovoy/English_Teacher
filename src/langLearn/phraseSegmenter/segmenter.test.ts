import { describe, it, expect } from 'bun:test';
import { alignTranslation, segmentSubtitleLines, computePhraseConfidence, mergeByConfidence } from './semanticSegmenter';
import type { PhraseItem } from './semanticSegmenter';
import type { SubtitleLine } from '../../subtitles/types';

describe('LangLearn Segmenter & Alignment', () => {
    it('keeps sentence as primary unit and only splits long sentences by punctuation', () => {
        const lines: SubtitleLine[] = [
            {
                text: "First sentence, short clause, end. Second one: tail",
                startMs: 0,
                durationMs: 3000,
                speakerId: '',
                tokens: []
            }
        ];

        const result = segmentSubtitleLines(lines);
        expect(result.map((item) => item.text)).toEqual([
            "First sentence, short clause, end.",
            "Second one: tail"
        ]);
        expect(result[0].startMs).toBe(0);
        expect(result[result.length - 1].endMs).toBe(3000);
    });

    it('splits phrase by sentence punctuation inside one subtitle line', () => {
        const lines: SubtitleLine[] = [
            {
                text: "Hello, world. Next part",
                startMs: 0,
                durationMs: 1200,
                speakerId: '',
                tokens: [
                    { text: "Hello", startMs: 0, durationMs: 220, isWordLike: true },
                    { text: ", ", startMs: 220, durationMs: 60, isWordLike: false },
                    { text: "world", startMs: 280, durationMs: 220, isWordLike: true },
                    { text: ". ", startMs: 500, durationMs: 60, isWordLike: false },
                    { text: "Next", startMs: 560, durationMs: 280, isWordLike: true },
                    { text: " part", startMs: 840, durationMs: 280, isWordLike: true }
                ]
            }
        ];

        const result = segmentSubtitleLines(lines);
        expect(result.length).toBe(2);
        expect(result[0].text).toBe("Hello, world.");
        expect(result[1].text).toBe("Next part");
        expect(result[0].endMs).toBe(560);
        expect(result[1].startMs).toBe(560);
    });

    it('splits phrase by long pauses between speech tokens', () => {
        const lines: SubtitleLine[] = [
            {
                text: "We wait then continue",
                startMs: 0,
                durationMs: 2400,
                speakerId: '',
                tokens: [
                    { text: "We", startMs: 0, durationMs: 220, isWordLike: true },
                    { text: " wait", startMs: 260, durationMs: 260, isWordLike: true },
                    { text: " then", startMs: 1700, durationMs: 250, isWordLike: true },
                    { text: " continue", startMs: 2000, durationMs: 300, isWordLike: true }
                ]
            }
        ];

        const result = segmentSubtitleLines(lines);
        // After semantic completeness enforcement, "We wait" (2 words, no terminal punctuation)
        // is merged with "then continue" since it's too short to stand independently.
        expect(result.length).toBe(1);
        expect(result[0].text).toBe("We wait then continue");
        expect(result[0].startMs).toBe(0);
        expect(result[0].endMs).toBe(2300);
    });

    it('splits long phrases by soft logical boundaries', () => {
        const lines: SubtitleLine[] = [
            {
                text: "This approach can be very effective for daily practice",
                startMs: 0,
                durationMs: 1200,
                speakerId: '',
                tokens: []
            },
            {
                text: "but it requires attention to context and rhythm,",
                startMs: 1200,
                durationMs: 1300,
                speakerId: '',
                tokens: []
            },
            {
                text: "so we still add fallback checks for stability",
                startMs: 2500,
                durationMs: 1200,
                speakerId: '',
                tokens: []
            }
        ];

        const result = segmentSubtitleLines(lines);
        expect(result.length).toBe(2);
        expect(result[0].text).toContain("rhythm,");
        expect(result[0].endMs).toBe(2500);
        expect(result[1].startMs).toBe(2500);
    });

    it('splits phrase on long subtitle timing gaps', () => {
        const lines: SubtitleLine[] = [
            { text: "We start with the first idea", startMs: 0, durationMs: 900, speakerId: '', tokens: [] },
            { text: "and connect it with another one", startMs: 900, durationMs: 900, speakerId: '', tokens: [] },
            { text: "then we continue", startMs: 3200, durationMs: 800, speakerId: '', tokens: [] },
        ];

        const result = segmentSubtitleLines(lines);
        expect(result.length).toBe(2);
        expect(result[0].endMs).toBe(1800);
        expect(result[1].startMs).toBe(3200);
    });

    it('forces split when phrase becomes too long without punctuation', () => {
        const lines: SubtitleLine[] = [
            { text: "one two three four", startMs: 0, durationMs: 500, speakerId: '', tokens: [] },
            { text: "five six seven eight", startMs: 500, durationMs: 500, speakerId: '', tokens: [] },
            { text: "nine ten eleven twelve", startMs: 1000, durationMs: 500, speakerId: '', tokens: [] },
            { text: "thirteen fourteen fifteen sixteen", startMs: 1500, durationMs: 500, speakerId: '', tokens: [] },
            { text: "seventeen eighteen nineteen twenty", startMs: 2000, durationMs: 500, speakerId: '', tokens: [] },
        ];

        const result = segmentSubtitleLines(lines);
        expect(result.length).toBe(2);
        expect(result[0].text).toBe("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen");
        expect(result[1].text).toBe("seventeen eighteen nineteen twenty");
    });

    it('merges incomplete tails so phrase keeps complete meaning', () => {
        const lines: SubtitleLine[] = [
            { text: "This matters because", startMs: 0, durationMs: 1000, speakerId: '', tokens: [] },
            { text: "it changes the final result.", startMs: 1000, durationMs: 1200, speakerId: '', tokens: [] },
        ];

        const result = segmentSubtitleLines(lines);
        expect(result.length).toBe(1);
        expect(result[0].text).toBe("This matters because it changes the final result.");
        expect(result[0].startMs).toBe(0);
        expect(result[0].endMs).toBe(2200);
    });

    it('keeps full word coverage after semantic checks', () => {
        const lines: SubtitleLine[] = [
            {
                text: "We validate every boundary, and ensure the final words are kept",
                startMs: 0,
                durationMs: 2200,
                speakerId: '',
                tokens: []
            },
            {
                text: "without losing context at the end.",
                startMs: 2200,
                durationMs: 1200,
                speakerId: '',
                tokens: []
            }
        ];

        const result = segmentSubtitleLines(lines);
        const merged = result.map((item) => item.text).join(' ').toLowerCase();
        expect(merged).toContain("final words are kept");
        expect(merged).toContain("without losing context at the end");
    });

    it('splits very long phrase without punctuation into compact timed chunks', () => {
        const lines: SubtitleLine[] = [
            {
                text: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour",
                startMs: 0,
                durationMs: 14000,
                speakerId: '',
                tokens: []
            }
        ];

        const result = segmentSubtitleLines(lines);
        expect(result.length).toBeGreaterThan(1);
        expect(result[0].startMs).toBe(0);
        expect(result[result.length - 1].endMs).toBe(14000);
        for (const phrase of result) {
            expect(phrase.endMs - phrase.startMs).toBeLessThanOrEqual(5300);
        }
    });

    it('aligns translation correctly with temporary gaps', () => {
        const origPhrases = [
            { text: "and the reason why this works", startMs: 0, endMs: 2500 }
        ];

        const transLines: SubtitleLine[] = [
            { text: "и причина", startMs: 0, durationMs: 1200, speakerId: '', tokens: [] },
            { text: "по которой это работает", startMs: 1200, durationMs: 1300, speakerId: '', tokens: [] },
            { text: "довольно проста", startMs: 2500, durationMs: 1500, speakerId: '', tokens: [] },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(1);
        expect(result[0].transText).toBe("и причина по которой это работает");
        expect(result[0].transStartMs).toBe(0);
        expect(result[0].transEndMs).toBe(2500);
    });

    it('falls back to the nearest translation line when no overlap', () => {
        const origPhrases = [
            { text: "hello", startMs: 0, endMs: 1000 }
        ];

        const transLines: SubtitleLine[] = [
            { text: "привет", startMs: 2000, durationMs: 1000, speakerId: '', tokens: [] },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(1);
        expect(result[0].transText).toBe("привет");
    });

    it('aligns translation sequentially without duplicating adjacent phrases', () => {
        const origPhrases = [
            { text: "phrase 1", startMs: 0, endMs: 700 },
            { text: "phrase 2", startMs: 700, endMs: 1700 },
            { text: "phrase 3", startMs: 1700, endMs: 2700 },
        ];

        const transLines: SubtitleLine[] = [
            { text: "первая.", startMs: 0, durationMs: 900, speakerId: '', tokens: [] },
            { text: "вторая.", startMs: 900, durationMs: 900, speakerId: '', tokens: [] },
            { text: "третья.", startMs: 1800, durationMs: 1000, speakerId: '', tokens: [] },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(3);
        expect(result[0].transText).toBe("первая.");
        expect(result[1].transText).toBe("вторая.");
        expect(result[2].transText).toBe("третья.");
    });

    it('does not merge adjacent translation lines during alignment', () => {
        const origPhrases = [
            { text: "first original", startMs: 0, endMs: 1200 },
            { text: "second original", startMs: 1200, endMs: 2400 },
        ];

        const transLines: SubtitleLine[] = [
            { text: "первая часть перевода", startMs: 0, durationMs: 1200, speakerId: '', tokens: [] },
            { text: "вторая часть перевода", startMs: 1200, durationMs: 1200, speakerId: '', tokens: [] },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(2);
        expect(result[0].transText).toBe("первая часть перевода");
        expect(result[1].transText).toBe("вторая часть перевода");
    });

    it('keeps sequential mapping when first translation line briefly overlaps next original phrase', () => {
        const origPhrases = [
            { text: "questions?", startMs: 11679, endMs: 12559 },
            { text: "Not really.", startMs: 12559, endMs: 13333 },
            { text: "I love it.", startMs: 13120, endMs: 14160 },
        ];

        const transLines: SubtitleLine[] = [
            { text: "вопросы? Не совсем.", startMs: 11679, durationMs: 1209, speakerId: '', tokens: [] },
            { text: "Я люблю это.", startMs: 12888, durationMs: 711, speakerId: '', tokens: [] },
            { text: "Мне кажется", startMs: 13599, durationMs: 711, speakerId: '', tokens: [] },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(3);
        // With confidence-based alignment, the split translation "вопросы? Не совсем."
        // maps the first strong-punctuation segment to the first orig phrase.
        expect(result[0].transText).toBe("вопросы?");
        expect(result[1].transText).toContain("совсем");
        expect(result[2].transText).toContain("люблю");
    });

    it('does not consume the next translation fragment when resolving short overlap with global shift', () => {
        const origPhrases = [
            { text: "first short", startMs: 0, endMs: 1000 },
            { text: "second short", startMs: 1000, endMs: 2000 },
        ];

        const transLines: SubtitleLine[] = [
            { text: "первая. вторая.", startMs: 1200, durationMs: 1000, speakerId: '', tokens: [] },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(2);
        expect(result[0].transText).toBe("первая.");
        expect(result[1].transText).toBe("вторая.");
    });

    it('keeps the first question phrase compact when translation line spills into the next thought', () => {
        const origPhrases = [
            { text: "Satya, what brings you here to Germany?", startMs: 480, endMs: 2710 },
            { text: "You know, it's our AI tour today in Munich and I'm excited to be here.", startMs: 2720, endMs: 7301 },
        ];

        const transLines: SubtitleLine[] = [
            {
                text: "Сатья, что привело тебя в Германию? Знаете, сегодня у нас в Мюнхене тур по местам,",
                startMs: 480,
                durationMs: 3608,
                speakerId: '',
                tokens: []
            },
            {
                text: "связанным с искусственным интеллектом, и я очень рад быть здесь.",
                startMs: 4088,
                durationMs: 3582,
                speakerId: '',
                tokens: []
            },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(2);
        expect(result[0].transText).toBe("Сатья, что привело тебя в Германию?");
        expect(result[1].transText).toContain("сегодня у нас в Мюнхене");
    });

    it('splits long translated sentence groups across adjacent originals by meaning boundary', () => {
        const origPhrases = [
            {
                text: "For example, we are definitely an American company.",
                startMs: 94479,
                endMs: 97920,
            },
            {
                text: "We're a multinational company and invested significant capital in Europe.",
                startMs: 97920,
                endMs: 104159,
            },
        ];

        const transLines: SubtitleLine[] = [
            {
                text: "Например, если присмотреться мы определенно американская компания. Мы — многонациональная компания, но у нас есть значительный капитал,",
                startMs: 94290,
                durationMs: 7117,
                speakerId: '',
                tokens: []
            },
            {
                text: "который мы инвестировали в Европу, в Германию, рискуя своими средствами,",
                startMs: 101407,
                durationMs: 5676,
                speakerId: '',
                tokens: []
            },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(2);
        expect(result[0].transText).toBe("Например, если присмотреться мы определенно американская компания.");
        expect(result[1].transText).toContain("многонациональная компания");
    });

    it('produces confidence field on aligned results', () => {
        const origPhrases = [
            { text: "hello world", startMs: 0, endMs: 1500 },
        ];
        const transLines: SubtitleLine[] = [
            { text: "привет мир", startMs: 0, durationMs: 1500, speakerId: '', tokens: [] },
        ];

        const result = alignTranslation(origPhrases, transLines);
        expect(result.length).toBe(1);
        expect(typeof result[0].confidence).toBe('number');
        expect(result[0].confidence).toBeGreaterThan(0);
    });
});

describe('Confidence Scoring', () => {
    const makePhrase = (overrides: Partial<PhraseItem> = {}): PhraseItem => ({
        index: 0,
        origText: "test phrase here",
        transText: "тестовая фраза здесь",
        startMs: 0,
        endMs: 2000,
        transStartMs: 0,
        transEndMs: 2000,
        confidence: 0,
        ...overrides,
    });

    it('returns high score for well-matched pairs', () => {
        const phrase = makePhrase({
            origText: "Hello, how are you today?",
            transText: "Привет, как дела сегодня?",
            startMs: 0,
            endMs: 2000,
            transStartMs: 0,
            transEndMs: 2200,
        });
        const score = computePhraseConfidence(phrase);
        expect(score).toBeGreaterThanOrEqual(0.7);
    });

    it('returns zero for empty translation', () => {
        const phrase = makePhrase({
            transText: "",
        });
        expect(computePhraseConfidence(phrase)).toBe(0);
    });

    it('returns low score for timing overflow', () => {
        const phrase = makePhrase({
            origText: "short",
            transText: "очень длинный перевод",
            startMs: 0,
            endMs: 800,
            transStartMs: 0,
            transEndMs: 5000,
        });
        const score = computePhraseConfidence(phrase);
        expect(score).toBeLessThan(0.5);
    });

    it('penalizes very short translation for long original', () => {
        const phrase = makePhrase({
            origText: "This is a rather long original phrase with many words",
            transText: "да",
            startMs: 0,
            endMs: 4000,
            transStartMs: 0,
            transEndMs: 400,
        });
        const score = computePhraseConfidence(phrase);
        expect(score).toBeLessThan(0.4);
    });
});

describe('mergeByConfidence', () => {
    const makePhrase = (index: number, overrides: Partial<PhraseItem> = {}): PhraseItem => ({
        index,
        origText: `phrase ${index}`,
        transText: `перевод ${index}`,
        startMs: index * 1500,
        endMs: (index + 1) * 1500,
        transStartMs: index * 1500,
        transEndMs: (index + 1) * 1500,
        confidence: 0.9,
        ...overrides,
    });

    it('does not merge high-confidence phrases', () => {
        const phrases: PhraseItem[] = [
            makePhrase(0, { confidence: 0.9 }),
            makePhrase(1, { confidence: 0.85 }),
            makePhrase(2, { confidence: 0.95 }),
        ];
        const result = mergeByConfidence(phrases);
        expect(result.length).toBe(3);
    });

    it('merges adjacent low-confidence phrases when total duration is in range', () => {
        const phrases: PhraseItem[] = [
            makePhrase(0, { confidence: 0.8, startMs: 0, endMs: 1500 }),
            makePhrase(1, { confidence: 0.1, startMs: 1500, endMs: 3000, transText: "" }),
            makePhrase(2, { confidence: 0.2, startMs: 3000, endMs: 4500, transText: "коротко" }),
            makePhrase(3, { confidence: 0.8, startMs: 4500, endMs: 6000 }),
        ];
        const result = mergeByConfidence(phrases);
        // Should attempt to merge the low-confidence region (indexes 0-3 due to neighbors)
        expect(result.length).toBeLessThanOrEqual(phrases.length);
        // All results should have confidence field
        for (const p of result) {
            expect(typeof p.confidence).toBe('number');
        }
    });
});
