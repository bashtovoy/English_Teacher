import { SemanticSegmenter, alignTranslation, type PhraseItem } from './phraseSegmenter/semanticSegmenter';
import { refinePhrasesWithLocalLLM } from './phraseSegmenter/localLLMRefiner';
import { refinePhrasesWithQwenApi, isQwenApiAvailable } from './phraseSegmenter/qwenApiRefiner';
import { 
    alignOriginalAudio, 
    alignTranslationAudio, 
    isWhisperAvailable,
    type WordAlignment,
    type PhraseAlignment
} from './audioAligner';
import { 
    groupWordsIntoPhrases, 
    phraseAlignmentToPhraseItem
} from './phraseAligner';
import type { SubtitleLine } from '../subtitles/types';
import type { VideoHandler } from '../index';

type RefinerType = 'qwen-api' | 'local-webgpu' | 'none';
type AlignmentMode = 'whisper-audio' | 'subtitle-tokens' | 'hybrid';

const getRefinerType = (): RefinerType => {
    try {
        const stored = globalThis.localStorage?.getItem("vot.langlearn.refiner.type");
        if (stored === "qwen-api" || stored === "local-webgpu" || stored === "none") {
            return stored;
        }
    } catch {
        // ignore
    }
    // Default to Qwen API if key is configured, otherwise local
    if (isQwenApiAvailable()) {
        return "qwen-api";
    }
    return "local-webgpu";
};

export interface LangLearnState {
    currentIndex: number;
    isPlaying: boolean;
    isAlignmentComplete: boolean;
    pauseMs: number;
    phrases: PhraseItem[];
}

type SegmentPlaybackLog = {
    expectedStartMs: number;
    expectedEndMs: number;
    actualStartMs: number;
    actualEndMs: number;
    startDriftMs: number;
    endDriftMs: number;
    playbackRate: number;
    elapsedWallMs: number;
    maxWaitMs: number;
};

export class LangLearnController {
    private static readonly LANGLEARN_PATCH_VERSION = 'langlearn-patch-2026-04-01-whisper-v1';
    private static readonly ALIGNMENT_ENGINE_VERSION = 'audio-aware-alignment-v1';
    private static readonly TRANSLATION_START_PADDING_MS = 0;
    private static readonly TRANSLATION_END_PADDING_MS = 25;
    private static readonly ORIGINAL_START_PADDING_MS = 0;
    private static readonly ORIGINAL_END_PADDING_MS = 25;
    private static readonly TIMING_TOLERANCE_SEC = 0.015;
    private static readonly MIN_SEGMENT_DURATION_MS = 120;
    private static readonly TRANSLATION_RATE_TARGET_ORIG_RATIO = 1.15;
    private static readonly TRANSLATION_RATE_MAX = 1.35;
    private static readonly LOW_CONFIDENCE_THRESHOLD = 0.35;
    private static readonly LOG_STORAGE_KEY = 'vot.langlearn.debugLogs';
    private static readonly LOG_PREFIX = '[LangLearn][Logs]';

    private state: LangLearnState = {
        currentIndex: 0,
        isPlaying: false,
        isAlignmentComplete: false,
        pauseMs: 1500,
        phrases: [],
    };

    private videoHandler: VideoHandler;
    private abortController: AbortController | null = null;
    private playerEventsDetached = false;
    private logLines: string[] = [];
    private logSequence = 0;
    private refinedIndexes = new Set<number>();
    private llmProcessing = false;
    private playRunId = 0;

    public onStateChange?: (state: LangLearnState) => void;
    public onPhraseChange?: (phrase: PhraseItem | null) => void;
    public onShowSubtitles?: (origText: string, transText: string, showBoth: boolean) => void;
    public onLogsChange?: (logs: string) => void;
    public onLLMProgress?: (progress: { text: string; progress: number; timeElapsed: number }) => void;

    constructor(videoHandler: VideoHandler) {
        this.videoHandler = videoHandler;
    }

    public getState() {
        return this.state;
    }

    async start(origSubtitles: SubtitleLine[], transSubtitles: SubtitleLine[]) {
        this.stop();

        // Initialize state right away
        this.state.isAlignmentComplete = false;
        this.llmProcessing = true;
        this.state.currentIndex = 0;
        this.state.isPlaying = false;
        this.notifyState();

        // Disable normal translation syncing so it doesn't interfere.
        this.pauseTranslationPlayer();
        if (!this.playerEventsDetached) {
            this.videoHandler.audioPlayer.player?.removeVideoEvents?.();
            this.playerEventsDetached = true;
        }
        this.videoHandler.video.pause();

        this.resetLogsSession(origSubtitles, transSubtitles);
        this.appendLog('alignment_started', {
            origLines: origSubtitles.length,
            transLines: transSubtitles.length,
            whisperAvailable: isWhisperAvailable(),
        });

        // Run the new audio-aware alignment pipeline
        this.runAudioAwareAlignment(origSubtitles, transSubtitles)
            .then((final) => {
                this.state.phrases = final;
                this.state.isAlignmentComplete = true;
                if (this.onLLMProgress) {
                    this.onLLMProgress({
                        text: `✅ Готово: ${final.length} фраз`,
                        progress: 1,
                        timeElapsed: 0
                    });
                }
                for (let i = 0; i < final.length; i++) this.refinedIndexes.add(i);
                this.llmProcessing = false;
                this.logAlignmentSnapshot(origSubtitles, transSubtitles);
                this.notifyState();
            })
            .catch(err => {
                console.error("[LangLearn] Alignment error", err);
                this.appendLog('alignment_error', { 
                    error: err instanceof Error ? err.message : String(err) 
                });
                this.llmProcessing = false;
                // Fallback to basic alignment on error
                this.state.isAlignmentComplete = true;
                this.notifyState();
            });

        if (this.state.phrases.length === 0) {
            console.warn('[LangLearn] No phrases aligned.');
            this.appendLog('no_phrases_aligned', {});
            return;
        }

        this.state.currentIndex = 0;
        this.state.isPlaying = false; // explicitly start paused
        this.videoHandler.video.pause(); // re-ensure target is reached safely
        this.notifyState();
    }

    /**
     * New audio-aware alignment pipeline:
     * 1. Word-level forced alignment for original audio (Whisper)
     * 2. Semantic phrase segmentation
     * 3. Word-level forced alignment for translation audio
     * 4. Phrase pairing
     */
    private async runAudioAwareAlignment(
        origSubtitles: SubtitleLine[],
        transSubtitles: SubtitleLine[]
    ): Promise<PhraseItem[]> {
        const useWhisper = isWhisperAvailable();
        const alignmentMode: AlignmentMode = useWhisper ? 'whisper-audio' : 'subtitle-tokens';
        
        this.appendLog('alignment_mode', { mode: alignmentMode });

        if (this.onLLMProgress) {
            this.onLLMProgress({
                text: "🎵 Анализ аудиодорожек...",
                progress: 0.05,
                timeElapsed: 0
            });
        }

        let origAlignments: WordAlignment[];
        let transAlignments: WordAlignment[];

        if (useWhisper) {
            // ЭТАП 1: Word-level alignment для оригинала
            this.appendLog('whisper_original_start', {});
            origAlignments = await alignOriginalAudio(
                this.videoHandler.video,
                origSubtitles,
                (this.videoHandler as any).videoData?.videoId ?? 'unknown',
                {
                    onProgress: this.onLLMProgress,
                    log: (event, payload) => this.appendLog(event, payload),
                }
            );
            this.appendLog('whisper_original_complete', { wordCount: origAlignments.length });

            // ЭТАП 3: Word-level alignment для перевода
            this.appendLog('whisper_translation_start', {});
            transAlignments = await alignTranslationAudio(
                this.videoHandler.audioPlayer.player,
                transSubtitles,
                (this.videoHandler as any).videoData?.videoId ?? 'unknown',
                {
                    onProgress: this.onLLMProgress,
                    log: (event, payload) => this.appendLog(event, payload),
                }
            );
            this.appendLog('whisper_translation_complete', { wordCount: transAlignments.length });
        } else {
            // Fallback: use existing subtitle tokens
            this.appendLog('using_subtitle_tokens', {});
            origAlignments = origSubtitles.flatMap((line) =>
                (line.tokens ?? []).map((t) => ({
                    word: t.text,
                    startMs: t.startMs,
                    endMs: t.startMs + t.durationMs,
                    confidence: 0.5,
                }))
            );
            transAlignments = transSubtitles.flatMap((line) =>
                (line.tokens ?? []).map((t) => ({
                    word: t.text,
                    startMs: t.startMs,
                    endMs: t.startMs + t.durationMs,
                    confidence: 0.5,
                }))
            );
        }

        // ЭТАП 2 & 4: Group words into phrases
        if (this.onLLMProgress) {
            this.onLLMProgress({
                text: "📝 Сегментация фраз...",
                progress: 0.7,
                timeElapsed: 0
            });
        }

        const origPhrases = groupWordsIntoPhrases(origAlignments);
        const transPhrases = groupWordsIntoPhrases(transAlignments);

        this.appendLog('phrase_segmentation_complete', {
            origPhrases: origPhrases.length,
            transPhrases: transPhrases.length,
        });

        // Convert to PhraseItem format
        const phrases = phraseAlignmentToPhraseItem(origPhrases, transPhrases);

        this.appendLog('phrase_items_created', { count: phrases.length });

        // Optional: refine with Qwen if available
        const refinerType = getRefinerType();
        if (refinerType === 'qwen-api' && isQwenApiAvailable()) {
            if (this.onLLMProgress) {
                this.onLLMProgress({
                    text: "🤖 Уточнение сегментации...",
                    progress: 0.85,
                    timeElapsed: 0
                });
            }
            return this.runQwenApiRefinement(phrases);
        }

        return phrases;
    }

    private async runQwenApiRefinement(phrases: PhraseItem[]): Promise<PhraseItem[]> {
        this.appendLog('qwen_api_refinement_started', { phraseCount: phrases.length });
        
        return refinePhrasesWithQwenApi(phrases, {
            log: (event, payload) => this.appendLog(event, payload),
            onProgress: (p) => {
                if (this.onLLMProgress) {
                    this.onLLMProgress({
                        text: p.text,
                        progress: p.progress,
                        timeElapsed: p.timeElapsed
                    });
                }
            },
            onChunkRefined: (start, end, refined) => {
                for (let i = start; i <= end; i++) {
                    this.refinedIndexes.add(i);
                }
                // Update state incrementally
                const newPhrases = [...this.state.phrases];
                for (let i = 0; i < refined.length; i++) {
                    if (start + i < newPhrases.length) {
                        newPhrases[start + i] = refined[i];
                    }
                }
                this.state.phrases = newPhrases;
                this.notifyState();
            }
        });
    }

    private async runLocalRefinement(phrases: PhraseItem[]): Promise<PhraseItem[]> {
        this.appendLog('local_llm_refinement_started', { phraseCount: phrases.length });
        
        return refinePhrasesWithLocalLLM(phrases, {
            log: (event, payload) => this.appendLog(event, payload),
            onProgress: (p) => {
                if (this.onLLMProgress) {
                    // Ensure we always pass the expected object structure
                    this.onLLMProgress({
                        text: typeof p === 'string' ? p : (p?.text || 'Processing...'),
                        progress: typeof p === 'object' ? (p?.progress ?? 0) : 0,
                        timeElapsed: typeof p === 'object' ? (p?.timeElapsed ?? 0) : 0
                    });
                }
            },
            onWindowApplied: (start, end, refined) => {
                for (let i = start; i <= end; i++) {
                    this.refinedIndexes.add(i);
                }
                const total = this.state.phrases.length;
                const done = this.refinedIndexes.size;
                if (this.onLLMProgress) {
                    this.onLLMProgress({
                        text: `🔄 Анализ смысла: ${done} / ${total} фраз...`,
                        progress: done / total,
                        timeElapsed: 0
                    });
                }
                // Update state incrementally
                this.state.phrases = [...this.state.phrases];
                this.notifyState();
            }
        });
    }

    public getLogsText(): string {
        return this.logLines.join('\n');
    }

    public clearLogs() {
        this.logLines = [];
        this.logSequence = 0;
        this.notifyLogs();
    }

    togglePlayPause() {
        this.state.isPlaying = !this.state.isPlaying;
        this.notifyState();
        if (this.state.isPlaying) {
            this.interruptAndPlayCurrent();
        } else {
            if (this.abortController) {
                this.abortController.abort();
            }
            this.videoHandler.video.pause();
            this.pauseTranslationPlayer();
        }
    }

    setPauseDuration(ms: number) {
        this.state.pauseMs = ms;
        this.notifyState();
    }

    next() {
        if (this.state.currentIndex < this.state.phrases.length - 1) {
            this.state.currentIndex++;
            this.interruptAndPlayCurrent();
        }
    }

    prev() {
        if (this.state.currentIndex > 0) {
            this.state.currentIndex--;
            this.interruptAndPlayCurrent();
        }
    }

    stop() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.state.isPlaying = false;
        this.playRunId += 1;
        this.notifyState();

        this.videoHandler.video.pause();
        this.pauseTranslationPlayer();

        if (this.playerEventsDetached) {
            this.videoHandler.audioPlayer.player?.addVideoEvents?.();
            this.playerEventsDetached = false;
        }
    }

    private interruptAndPlayCurrent() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        const runId = ++this.playRunId;
        this.playLoop(this.abortController.signal, runId).catch(err => {
            if (err.name !== 'AbortError') console.error('[LangLearn] loop error', err);
        });
    }

    private async playLoop(signal: AbortSignal, runId: number) {
        while (this.state.currentIndex < this.state.phrases.length) {
            if (signal.aborted || runId !== this.playRunId) throw new DOMException('Aborted', 'AbortError');

            this.notifyState();
            await this.playPhrase(this.state.currentIndex, signal);

            if (signal.aborted || runId !== this.playRunId) {
                throw new DOMException('Aborted', 'AbortError');
            }

            this.state.currentIndex++;
        }
        if (runId === this.playRunId) {
            this.stop(); // auto stop at end
        }
    }

    private async playPhrase(index: number, signal: AbortSignal) {
        // Wait for LLM refinement if needed
        if (this.llmProcessing && !this.refinedIndexes.has(index)) {
            this.appendLog('llm_wait_begin', { phraseIndex: index });
            const startWait = Date.now();
            while (!this.refinedIndexes.has(index) && !signal.aborted) {
                // Max wait 30s per phrase to stay responsive
                if (Date.now() - startWait > 30000) {
                    this.appendLog('llm_wait_timeout', { phraseIndex: index });
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            this.appendLog('llm_wait_end', { phraseIndex: index, durationMs: Date.now() - startWait });
        }

        const phrase = this.state.phrases[index];
        if (!phrase) return;

        const video = this.videoHandler.video;
        const player = this.videoHandler.audioPlayer.player;
        const logEnabled = this.isDetailedLogsEnabled();
        if (logEnabled) {
            console.groupCollapsed(`${LangLearnController.LOG_PREFIX} Phrase ${index + 1}/${this.state.phrases.length}`);
            console.log({
                index: phrase.index,
                originalText: phrase.origText,
                translatedText: phrase.transText,
                originalTimingMs: {
                    startMs: phrase.startMs,
                    endMs: phrase.endMs,
                    durationMs: phrase.endMs - phrase.startMs,
                },
                translatedTimingMs: {
                    startMs: phrase.transStartMs,
                    endMs: phrase.transEndMs,
                    durationMs: phrase.transEndMs - phrase.transStartMs,
                },
            });
        }
        this.appendLog('phrase_begin', {
            phraseIndex: index,
            index: phrase.index,
            originalText: phrase.origText,
            translatedText: phrase.transText,
            alignment_confidence: phrase.confidence,
            originalTimingMs: {
                startMs: phrase.startMs,
                endMs: phrase.endMs,
                durationMs: phrase.endMs - phrase.startMs,
            },
            translatedTimingMs: {
                startMs: phrase.transStartMs,
                endMs: phrase.transEndMs,
                durationMs: phrase.transEndMs - phrase.transStartMs,
            },
            origTokensCount: phrase.origTokens?.length ?? 0,
            transTokensCount: phrase.transTokens?.length ?? 0,
            origTokens: phrase.origTokens?.map(t => ({ text: t.text, startMs: t.startMs, durationMs: t.durationMs })),
            transTokens: phrase.transTokens?.map(t => ({ text: t.text, startMs: t.startMs, durationMs: t.durationMs })),
        });

        try {
            // 1. Show translated text and play translated audio from the existing VOT player.
            this.onShowSubtitles?.(phrase.origText, phrase.transText, false);

            const isLowConfidence = phrase.confidence < LangLearnController.LOW_CONFIDENCE_THRESHOLD;
            const fallbackMode = isLowConfidence ? 'text_only' : 'audio';

            const playbackRate = this.getEffectivePlaybackRate(video.playbackRate);
            const translationPlaybackRate = this.getTranslationPlaybackRate(playbackRate, phrase);
            const transStartMs = Math.max(0, phrase.transStartMs - LangLearnController.TRANSLATION_START_PADDING_MS);
            const transEndMs = Math.max(transStartMs, phrase.transEndMs + LangLearnController.TRANSLATION_END_PADDING_MS);
            const transMedia = this.getTranslationMediaElement();

            if (isLowConfidence) {
                // Low-confidence fallback: show text only, skip translation audio
                this.appendLog('fallback_mode', {
                    phraseIndex: index,
                    mode: 'text_only',
                    confidence: phrase.confidence,
                    reason: 'low_alignment_confidence',
                });
                // Still show the text for the pause duration
                await this.delay(Math.max(this.state.pauseMs, 1200), signal);
            } else if (transMedia && (transEndMs - transStartMs) >= LangLearnController.MIN_SEGMENT_DURATION_MS) {
                const segmentLog = await this.playMediaSegment(
                    transMedia,
                    transStartMs,
                    transEndMs,
                    translationPlaybackRate,
                    signal,
                    async () => {
                        // Use only one play source to avoid duplicated playback starts.
                        if (player && typeof player.play === "function") {
                            await player.play().catch(() => { });
                            return;
                        }
                        await transMedia.play().catch(() => { });
                    },
                );
                this.logSegmentPlayback('translation', index, segmentLog);
                transMedia.pause();
                await player.pause().catch(() => { });
            } else {
                this.logSegmentSkip('translation', index, {
                    hasMedia: !!transMedia,
                    startMs: transStartMs,
                    endMs: transEndMs,
                });
            }

            // Pause between translation and original.
            await this.delay(this.state.pauseMs, signal);

            // 2. Show both subtitles and play original fragment from the video.
            this.onShowSubtitles?.(phrase.origText, phrase.transText, true);
            const origStartMs = Math.max(0, phrase.startMs - LangLearnController.ORIGINAL_START_PADDING_MS);
            const origEndMs = Math.max(origStartMs, phrase.endMs + LangLearnController.ORIGINAL_END_PADDING_MS);
            if ((origEndMs - origStartMs) >= LangLearnController.MIN_SEGMENT_DURATION_MS) {
                const segmentLog = await this.playMediaSegment(video, origStartMs, origEndMs, playbackRate, signal);
                this.logSegmentPlayback('original', index, segmentLog);
            } else {
                this.logSegmentSkip('original', index, {
                    hasMedia: true,
                    startMs: origStartMs,
                    endMs: origEndMs,
                });
            }

            // Pause before the next phrase.
            await this.delay(this.state.pauseMs, signal);
        } finally {
            video.pause();
            this.pauseTranslationPlayer();
            this.appendLog('phrase_end', {
                phraseIndex: index,
                aborted: signal.aborted,
            });
            if (logEnabled) {
                console.groupEnd();
            }
        }
    }

    private getEffectivePlaybackRate(rawRate: number): number {
        if (!Number.isFinite(rawRate) || rawRate <= 0) {
            return 1;
        }
        return Math.max(0.25, rawRate);
    }

    private getTranslationPlaybackRate(baseRate: number, phrase: PhraseItem): number {
        const origDurationMs = Math.max(1, phrase.endMs - phrase.startMs);
        const transDurationMs = Math.max(1, phrase.transEndMs - phrase.transStartMs);
        const targetDurationMs = Math.max(
            LangLearnController.MIN_SEGMENT_DURATION_MS,
            Math.round(origDurationMs * LangLearnController.TRANSLATION_RATE_TARGET_ORIG_RATIO)
        );

        if (transDurationMs <= targetDurationMs) {
            return baseRate;
        }

        const compressionRatio = transDurationMs / targetDurationMs;
        const adjusted = baseRate * compressionRatio;
        return Math.max(baseRate, Math.min(LangLearnController.TRANSLATION_RATE_MAX, adjusted));
    }

    private async playMediaSegment(
        media: HTMLMediaElement,
        startMs: number,
        endMs: number,
        playbackRate: number,
        signal: AbortSignal,
        playFn?: () => Promise<void>
    ): Promise<SegmentPlaybackLog> {
        if (endMs <= startMs) {
            const exact = Math.round(startMs);
            return {
                expectedStartMs: exact,
                expectedEndMs: exact,
                actualStartMs: exact,
                actualEndMs: exact,
                startDriftMs: 0,
                endDriftMs: 0,
                playbackRate,
                elapsedWallMs: 0,
                maxWaitMs: 0,
            };
        }

        const startedAt = this.getNowMs();
        media.pause();
        await this.seekMedia(media, startMs / 1000, signal);
        const actualStartMs = Math.round(media.currentTime * 1000);
        media.playbackRate = playbackRate;

        if (playFn) {
            await playFn();
        } else {
            await media.play().catch(() => { });
        }

        const expectedDurationMs = Math.max(0, endMs - startMs);
        const maxWaitMs = Math.max(1200, Math.round(expectedDurationMs / playbackRate) + 1200);
        await this.waitForMediaTime(media, endMs / 1000, signal, maxWaitMs);
        const actualEndMs = Math.round(media.currentTime * 1000);
        media.pause();

        return {
            expectedStartMs: Math.round(startMs),
            expectedEndMs: Math.round(endMs),
            actualStartMs,
            actualEndMs,
            startDriftMs: actualStartMs - Math.round(startMs),
            endDriftMs: actualEndMs - Math.round(endMs),
            playbackRate,
            elapsedWallMs: Math.round(this.getNowMs() - startedAt),
            maxWaitMs,
        };
    }

    private async seekMedia(media: HTMLMediaElement, targetSec: number, signal: AbortSignal): Promise<void> {
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const target = Math.max(0, targetSec);
        if (Math.abs(media.currentTime - target) <= LangLearnController.TIMING_TOLERANCE_SEC) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(cleanResolve, 400);
            const onAbort = () => {
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
            };
            const onSeekedOrTimeUpdate = () => {
                if (Math.abs(media.currentTime - target) <= LangLearnController.TIMING_TOLERANCE_SEC) {
                    cleanResolve();
                }
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                signal.removeEventListener('abort', onAbort);
                media.removeEventListener('seeked', onSeekedOrTimeUpdate);
                media.removeEventListener('timeupdate', onSeekedOrTimeUpdate);
            };

            function cleanResolve() {
                cleanup();
                resolve();
            }

            signal.addEventListener('abort', onAbort, { once: true });
            media.addEventListener('seeked', onSeekedOrTimeUpdate);
            media.addEventListener('timeupdate', onSeekedOrTimeUpdate);
            media.currentTime = target;
            onSeekedOrTimeUpdate();
        });
    }

    private async waitForMediaTime(
        media: HTMLMediaElement,
        targetSec: number,
        signal: AbortSignal,
        maxWaitMs: number
    ): Promise<void> {
        const target = Math.max(0, targetSec);
        if (media.currentTime >= target - LangLearnController.TIMING_TOLERANCE_SEC || media.ended) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(cleanResolve, maxWaitMs);
            const intervalId = setInterval(checkProgress, 20);
            const onAbort = () => {
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                signal.removeEventListener('abort', onAbort);
                media.removeEventListener('timeupdate', checkProgress);
                media.removeEventListener('ended', checkProgress);
            };

            function cleanResolve() {
                cleanup();
                resolve();
            }

            function checkProgress() {
                if (media.currentTime >= target - LangLearnController.TIMING_TOLERANCE_SEC || media.ended) {
                    cleanResolve();
                }
            }

            signal.addEventListener('abort', onAbort, { once: true });
            media.addEventListener('timeupdate', checkProgress);
            media.addEventListener('ended', checkProgress);
            checkProgress();
        });
    }

    private getTranslationMediaElement(): HTMLMediaElement | null {
        const playerAny = this.videoHandler.audioPlayer.player as any;
        const media = playerAny?.audioElement ?? playerAny?.audio;
        if (
            media &&
            typeof media.play === 'function' &&
            typeof media.pause === 'function' &&
            typeof media.currentTime === 'number'
        ) {
            return media as HTMLMediaElement;
        }

        return null;
    }

    private pauseTranslationPlayer() {
        const player = this.videoHandler.audioPlayer.player;
        if (player) {
            void player.pause().catch(() => { });
        }

        const transMedia = this.getTranslationMediaElement();
        transMedia?.pause();
    }

    private delay(ms: number, signal: AbortSignal): Promise<void> {
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                return reject(new DOMException('Aborted', 'AbortError'));
            }

            const timeoutId = setTimeout(() => {
                signal.removeEventListener('abort', onAbort);
                resolve();
            }, ms);

            function onAbort() {
                clearTimeout(timeoutId);
                reject(new DOMException('Aborted', 'AbortError'));
            }

            signal.addEventListener('abort', onAbort);
        });
    }

    private notifyState() {
        (globalThis as any).votLangLearnCurrentPhraseIndex = this.state.currentIndex;
        this.onStateChange?.({ ...this.state });
        this.onPhraseChange?.(this.state.phrases[this.state.currentIndex] ?? null);
    }

    private isDetailedLogsEnabled(): boolean {
        try {
            const flag = globalThis.localStorage?.getItem(LangLearnController.LOG_STORAGE_KEY);
            if (flag == null) {
                return true;
            }
            return flag !== '0' && flag.toLowerCase() !== 'false';
        } catch {
            return true;
        }
    }

    private getNowMs(): number {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }

    private logAlignmentSnapshot(origSubtitles: SubtitleLine[], transSubtitles: SubtitleLine[]) {
        if (!this.isDetailedLogsEnabled()) {
            return;
        }

        console.groupCollapsed(`${LangLearnController.LOG_PREFIX} Alignment snapshot`);
        console.log({
            sourceLines: origSubtitles.length,
            translatedLines: transSubtitles.length,
            alignedPhrases: this.state.phrases.length,
            langLearnPatchVersion: LangLearnController.LANGLEARN_PATCH_VERSION,
            alignmentEngineVersion: LangLearnController.ALIGNMENT_ENGINE_VERSION,
            note: `To disable logs set localStorage['${LangLearnController.LOG_STORAGE_KEY}']='0'`,
        });

        console.table(this.state.phrases.map((phrase) => ({
            index: phrase.index,
            origStartMs: phrase.startMs,
            origEndMs: phrase.endMs,
            origDurationMs: phrase.endMs - phrase.startMs,
            transStartMs: phrase.transStartMs,
            transEndMs: phrase.transEndMs,
            transDurationMs: phrase.transEndMs - phrase.transStartMs,
            origText: phrase.origText,
            transText: phrase.transText,
        })));
        console.groupEnd();

        this.appendLog('alignment_snapshot', {
            sourceLines: origSubtitles.length,
            translatedLines: transSubtitles.length,
            alignedPhrases: this.state.phrases.length,
            langLearnPatchVersion: LangLearnController.LANGLEARN_PATCH_VERSION,
            alignmentEngineVersion: LangLearnController.ALIGNMENT_ENGINE_VERSION,
            phrases: this.state.phrases.map((phrase) => ({
                index: phrase.index,
                origStartMs: phrase.startMs,
                origEndMs: phrase.endMs,
                origDurationMs: phrase.endMs - phrase.startMs,
                transStartMs: phrase.transStartMs,
                transEndMs: phrase.transEndMs,
                transDurationMs: phrase.transEndMs - phrase.transStartMs,
                origText: phrase.origText,
                transText: phrase.transText,
            })),
        });
    }

    private logSegmentSkip(kind: 'translation' | 'original', phraseIndex: number, data: Record<string, unknown>) {
        if (!this.isDetailedLogsEnabled()) {
            return;
        }
        console.warn(`${LangLearnController.LOG_PREFIX} Segment skipped`, {
            phraseIndex,
            kind,
            ...data,
        });
        this.appendLog('segment_skipped', {
            phraseIndex,
            kind,
            ...data,
        });
    }

    private logSegmentPlayback(kind: 'translation' | 'original', phraseIndex: number, data: SegmentPlaybackLog) {
        if (!this.isDetailedLogsEnabled()) {
            return;
        }
        console.log(`${LangLearnController.LOG_PREFIX} Segment playback`, {
            phraseIndex,
            kind,
            ...data,
        });
        this.appendLog('segment_playback', {
            phraseIndex,
            kind,
            ...data,
        });
    }

    private resetLogsSession(origSubtitles: SubtitleLine[], transSubtitles: SubtitleLine[]) {
        this.clearLogs();
        const videoData = (this.videoHandler as any)?.videoData;
        this.appendLog('session_started', {
            version: 'langlearn-log-v1',
            langLearnPatchVersion: LangLearnController.LANGLEARN_PATCH_VERSION,
            alignmentEngineVersion: LangLearnController.ALIGNMENT_ENGINE_VERSION,
            videoId: videoData?.videoId,
            host: videoData?.host,
            url: videoData?.url,
            sourceLines: origSubtitles.length,
            translatedLines: transSubtitles.length,
            pauseMs: this.state.pauseMs,
        });
    }

    private appendLog(event: string, payload: Record<string, unknown>) {
        if (!this.isDetailedLogsEnabled()) {
            return;
        }
        const entry = {
            seq: ++this.logSequence,
            at: new Date().toISOString(),
            event,
            ...payload,
        };
        this.logLines.push(JSON.stringify(entry));
        this.notifyLogs();
    }

    private notifyLogs() {
        this.onLogsChange?.(this.getLogsText());
    }
}
