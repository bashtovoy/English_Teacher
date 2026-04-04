import UI from "../ui";
import { CLOSE_ICON } from "../ui/icons";
import type { LangLearnController, LangLearnState } from "./LangLearnController";
import { testQwenApiConnection, isQwenApiAvailable } from "./phraseSegmenter/qwenApiRefiner";
import { testWhisperConnection, isWhisperAvailable, getAlignmentProviderInfo } from "./audioAligner";
import type { PhraseItem } from "./phraseSegmenter/semanticSegmenter";

export class LangLearnPanel {
  public container: HTMLElement;
  private header: HTMLElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private phraseCounter: HTMLElement;
  private pauseInput: HTMLInputElement;
  private origPreview: HTMLElement;
  private transPreview: HTMLElement;

  private playPauseBtn: HTMLButtonElement;

  private llmModelInput: HTMLInputElement;
  private llmProgressText: HTMLElement;

  // Qwen API settings
  private qwenApiKeyInput: HTMLInputElement;
  private qwenBaseUrlInput: HTMLInputElement;
  private qwenModelInput: HTMLInputElement;
  private qwenTestBtn: HTMLButtonElement;
  private qwenStatusEl: HTMLElement;
  private useRefinerSelect: HTMLSelectElement;

  // Whisper API settings
  private whisperApiKeyInput: HTMLInputElement;
  private whisperBaseUrlInput: HTMLInputElement;
  private whisperModelInput: HTMLInputElement;
  private whisperTestBtn: HTMLButtonElement;
  private whisperStatusEl: HTMLElement;
  
  // WhisperX / Replicate settings
  private alignmentProviderSelect: HTMLSelectElement;
  private replicateApiKeyInput: HTMLInputElement;
  private replicateModelInput: HTMLInputElement;

  private overlayContainer: HTMLElement;
  private origSubEl: HTMLElement;
  private transSubEl: HTMLElement;
  private originalVOTSubtitlesDisplay: string = "";
  private logsTextArea: HTMLTextAreaElement;
  private copyLogsBtn: HTMLButtonElement;
  private clearLogsBtn: HTMLButtonElement;
  private logsMetaEl: HTMLElement;
  private readonly onViewportChanged = () => this.updateSubtitlesSafeArea();

  constructor(private controller: LangLearnController, private portal: HTMLElement) {
    this.createPanelUI();
    this.createSubtitlesUI();

    this.controller.onStateChange = (s) => this.renderState(s);
    this.controller.onPhraseChange = (p) => this.renderPhrase(Math.max(1, this.controller.getState().currentIndex + 1), this.controller.getState().phrases.length, p);
    this.controller.onShowSubtitles = (orig, trans, both) => this.showSubtitles(orig, trans, both);
    this.controller.onLogsChange = (logs) => this.renderLogs(logs);

    // Hide normal VOT subtitles if active so we don't duplicate
    const uiManager = (window as any)._votUIManager;
    if (uiManager?.videoHandler?.subtitlesWidget) {
      this.originalVOTSubtitlesDisplay = uiManager.videoHandler.subtitlesWidget.container.style.display;
      uiManager.videoHandler.subtitlesWidget.container.style.display = "none";
    }

    // Initial render
    this.renderState(this.controller.getState());
    this.renderLogs(this.controller.getLogsText());
    this.updateSubtitlesSafeArea();
    window.addEventListener("resize", this.onViewportChanged);
  }

  private createPanelUI() {
    this.container = UI.createEl("div", ["vot-lang-learn-panel"]);

    // Header
    const header = UI.createEl("div", ["vot-ll-header"]);
    const title = UI.createEl("span", ["vot-ll-title"]);
    title.textContent = "🎓 Режим изучения языка";

    const closeBtn = UI.createEl("button", ["vot-ll-icon-btn"]);
    closeBtn.innerHTML = CLOSE_ICON.strings[0];
    closeBtn.title = "Закрыть";
    closeBtn.addEventListener("click", () => this.close());
    header.append(title, closeBtn);

    // Controls
    const controls = UI.createEl("div", ["vot-ll-controls"]);
    this.prevBtn = UI.createEl("button", ["vot-ll-btn"]) as HTMLButtonElement;
    this.prevBtn.textContent = "← Пред";
    this.prevBtn.addEventListener("click", () => this.controller.prev());

    this.playPauseBtn = UI.createEl("button", ["vot-ll-btn"]) as HTMLButtonElement;
    this.playPauseBtn.textContent = "⏸ Пауза";
    this.playPauseBtn.addEventListener("click", () => this.controller.togglePlayPause());

    this.phraseCounter = UI.createEl("span", ["vot-ll-counter"]);
    this.phraseCounter.textContent = "Фраза 0 / 0";

    this.nextBtn = UI.createEl("button", ["vot-ll-btn"]) as HTMLButtonElement;
    this.nextBtn.textContent = "След →";
    this.nextBtn.addEventListener("click", () => this.controller.next());
    controls.append(this.prevBtn, this.playPauseBtn, this.phraseCounter, this.nextBtn);

    // Pause settings
    const settings = UI.createEl("div", ["vot-ll-settings"]);
    const pauseLabel = UI.createEl("label");
    pauseLabel.textContent = "Пауза между фразами (сек): ";
    this.pauseInput = UI.createEl("input") as HTMLInputElement;
    this.pauseInput.type = "number";
    this.pauseInput.step = "0.5";
    this.pauseInput.min = "0";
    this.pauseInput.value = (this.controller.getState().pauseMs / 1000).toString();
    this.pauseInput.addEventListener("change", () => {
      this.controller.setPauseDuration(parseFloat(this.pauseInput.value) * 1000);
    });
    pauseLabel.append(this.pauseInput);
    settings.append(pauseLabel);

    // Preview
    const preview = UI.createEl("div", ["vot-ll-preview"]);
    const origLabel = UI.createEl("div", ["vot-ll-label"]);
    origLabel.textContent = "Оригинал: ";
    this.origPreview = UI.createEl("span", ["vot-ll-text"]);
    origLabel.append(this.origPreview);

    const transLabel = UI.createEl("div", ["vot-ll-label"]);
    transLabel.textContent = "Перевод: ";
    this.transPreview = UI.createEl("span", ["vot-ll-text"]);
    transLabel.append(this.transPreview);
    preview.append(origLabel, transLabel);

    // LLM Settings - Refiner Selection
    const llmDetails = UI.createEl("details", ["vot-ll-llm-settings"]);
    llmDetails.style.marginTop = "12px";
    const llmSummary = UI.createEl("summary");
    llmSummary.textContent = "🤖 Настройки анализа фраз";
    llmSummary.style.cursor = "pointer";

    const llmForm = UI.createEl("div", ["vot-ll-llm-form"]);
    llmForm.style.marginTop = "12px";

    // Refiner type selector
    const refinerLabel = UI.createEl("label");
    refinerLabel.style.display = "flex";
    refinerLabel.style.flexDirection = "column";
    refinerLabel.style.gap = "4px";
    refinerLabel.style.marginBottom = "12px";
    const refinerLabelText = UI.createEl("span");
    refinerLabelText.textContent = "Метод анализа:";
    refinerLabelText.style.fontWeight = "500";
    this.useRefinerSelect = UI.createEl("select") as HTMLSelectElement;
    this.useRefinerSelect.style.padding = "6px 8px";
    this.useRefinerSelect.style.borderRadius = "4px";
    this.useRefinerSelect.style.border = "1px solid #444";
    this.useRefinerSelect.style.background = "#2a2a2a";
    this.useRefinerSelect.style.color = "#fff";
    
    const apiOption = UI.createEl("option") as HTMLOptionElement;
    apiOption.value = "qwen-api";
    apiOption.textContent = "🌐 Qwen API (рекомендуется)";
    
    const localOption = UI.createEl("option") as HTMLOptionElement;
    localOption.value = "local-webgpu";
    localOption.textContent = "💻 Локальная модель (WebGPU)";
    
    const noneOption = UI.createEl("option") as HTMLOptionElement;
    noneOption.value = "none";
    noneOption.textContent = "⚠️ Без анализа (только эвристика)";

    const savedRefiner = localStorage.getItem("vot.langlearn.refiner.type") || "qwen-api";
    this.useRefinerSelect.value = savedRefiner;
    this.useRefinerSelect.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.refiner.type", this.useRefinerSelect.value);
      this.updateRefinerUIVisibility();
    });
    this.useRefinerSelect.append(apiOption, localOption, noneOption);
    refinerLabel.append(refinerLabelText, this.useRefinerSelect);

    // Qwen API Settings Section
    const qwenSection = UI.createEl("div", ["vot-ll-qwen-section"]);
    qwenSection.style.display = "flex";
    qwenSection.style.flexDirection = "column";
    qwenSection.style.gap = "10px";
    qwenSection.style.padding = "10px";
    qwenSection.style.background = "#1a1a2e";
    qwenSection.style.borderRadius = "6px";
    qwenSection.style.marginBottom = "12px";

    // API Key
    const apiKeyLabel = UI.createEl("label");
    apiKeyLabel.style.display = "flex";
    apiKeyLabel.style.flexDirection = "column";
    apiKeyLabel.style.gap = "4px";
    const apiKeyLabelText = UI.createEl("span");
    apiKeyLabelText.textContent = "API Key:";
    apiKeyLabelText.style.fontSize = "12px";
    apiKeyLabelText.style.color = "#aaa";
    this.qwenApiKeyInput = UI.createEl("input") as HTMLInputElement;
    this.qwenApiKeyInput.type = "password";
    this.qwenApiKeyInput.placeholder = "sk-...";
    this.qwenApiKeyInput.value = localStorage.getItem("vot.langlearn.qwen.apiKey") || "";
    this.qwenApiKeyInput.style.padding = "6px 8px";
    this.qwenApiKeyInput.style.borderRadius = "4px";
    this.qwenApiKeyInput.style.border = "1px solid #444";
    this.qwenApiKeyInput.style.background = "#2a2a2a";
    this.qwenApiKeyInput.style.color = "#fff";
    this.qwenApiKeyInput.style.fontSize = "13px";
    this.qwenApiKeyInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.qwen.apiKey", this.qwenApiKeyInput.value.trim());
      this.updateQwenStatus();
    });
    apiKeyLabel.append(apiKeyLabelText, this.qwenApiKeyInput);

    // Base URL
    const baseUrlLabel = UI.createEl("label");
    baseUrlLabel.style.display = "flex";
    baseUrlLabel.style.flexDirection = "column";
    baseUrlLabel.style.gap = "4px";
    const baseUrlLabelText = UI.createEl("span");
    baseUrlLabelText.textContent = "API Endpoint:";
    baseUrlLabelText.style.fontSize = "12px";
    baseUrlLabelText.style.color = "#aaa";
    this.qwenBaseUrlInput = UI.createEl("input") as HTMLInputElement;
    this.qwenBaseUrlInput.type = "text";
    this.qwenBaseUrlInput.placeholder = "https://openrouter.ai/api/v1";
    this.qwenBaseUrlInput.value = localStorage.getItem("vot.langlearn.qwen.baseUrl") || "https://openrouter.ai/api/v1";
    this.qwenBaseUrlInput.style.padding = "6px 8px";
    this.qwenBaseUrlInput.style.borderRadius = "4px";
    this.qwenBaseUrlInput.style.border = "1px solid #444";
    this.qwenBaseUrlInput.style.background = "#2a2a2a";
    this.qwenBaseUrlInput.style.color = "#fff";
    this.qwenBaseUrlInput.style.fontSize = "13px";
    this.qwenBaseUrlInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.qwen.baseUrl", this.qwenBaseUrlInput.value.trim());
    });
    baseUrlLabel.append(baseUrlLabelText, this.qwenBaseUrlInput);

    // Model
    const modelLabel = UI.createEl("label");
    modelLabel.style.display = "flex";
    modelLabel.style.flexDirection = "column";
    modelLabel.style.gap = "4px";
    const modelLabelText = UI.createEl("span");
    modelLabelText.textContent = "Модель:";
    modelLabelText.style.fontSize = "12px";
    modelLabelText.style.color = "#aaa";
    this.qwenModelInput = UI.createEl("input") as HTMLInputElement;
    this.qwenModelInput.type = "text";
    this.qwenModelInput.placeholder = "qwen/qwen3.6-plus-preview:free";
    this.qwenModelInput.value = localStorage.getItem("vot.langlearn.qwen.model") || "qwen/qwen3.6-plus-preview:free";
    this.qwenModelInput.style.padding = "6px 8px";
    this.qwenModelInput.style.borderRadius = "4px";
    this.qwenModelInput.style.border = "1px solid #444";
    this.qwenModelInput.style.background = "#2a2a2a";
    this.qwenModelInput.style.color = "#fff";
    this.qwenModelInput.style.fontSize = "13px";
    this.qwenModelInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.qwen.model", this.qwenModelInput.value.trim());
    });
    modelLabel.append(modelLabelText, this.qwenModelInput);

    // Test button and status
    const testRow = UI.createEl("div");
    testRow.style.display = "flex";
    testRow.style.alignItems = "center";
    testRow.style.gap = "10px";
    
    this.qwenTestBtn = UI.createEl("button", ["vot-ll-btn", "vot-ll-btn-small"]) as HTMLButtonElement;
    this.qwenTestBtn.textContent = "🔍 Тест подключения";
    this.qwenTestBtn.style.padding = "6px 12px";
    this.qwenTestBtn.addEventListener("click", () => this.testQwenConnection());
    
    this.qwenStatusEl = UI.createEl("span");
    this.qwenStatusEl.style.fontSize = "12px";
    this.qwenStatusEl.style.color = "#888";
    
    testRow.append(this.qwenTestBtn, this.qwenStatusEl);
    
    qwenSection.append(apiKeyLabel, baseUrlLabel, modelLabel, testRow);

    // Whisper API Settings Section (for word-level alignment)
    const whisperSection = UI.createEl("div", ["vot-ll-whisper-section"]);
    whisperSection.style.display = "flex";
    whisperSection.style.flexDirection = "column";
    whisperSection.style.gap = "10px";
    whisperSection.style.padding = "10px";
    whisperSection.style.background = "#1e1e3f";
    whisperSection.style.borderRadius = "6px";
    whisperSection.style.marginTop = "12px";

    const whisperTitle = UI.createEl("div");
    whisperTitle.textContent = "🎵 Audio Alignment (выравнивание слов)";
    whisperTitle.style.fontWeight = "600";
    whisperTitle.style.fontSize = "13px";
    whisperTitle.style.marginBottom = "6px";
    whisperSection.append(whisperTitle);

    // Provider selection
    const providerLabel = UI.createEl("label");
    providerLabel.style.display = "flex";
    providerLabel.style.flexDirection = "column";
    providerLabel.style.gap = "4px";
    providerLabel.style.marginBottom = "8px";
    const providerLabelText = UI.createEl("span");
    providerLabelText.textContent = "Провайдер:";
    providerLabelText.style.fontSize = "12px";
    providerLabelText.style.fontWeight = "500";
    providerLabelText.style.color = "#aaa";
    this.alignmentProviderSelect = UI.createEl("select") as HTMLSelectElement;
    this.alignmentProviderSelect.style.padding = "6px 8px";
    this.alignmentProviderSelect.style.borderRadius = "4px";
    this.alignmentProviderSelect.style.border = "1px solid #444";
    this.alignmentProviderSelect.style.background = "#2a2a2a";
    this.alignmentProviderSelect.style.color = "#fff";
    
    const openaiOption = UI.createEl("option") as HTMLOptionElement;
    openaiOption.value = "openai";
    openaiOption.textContent = "🎤 Whisper (OpenAI) - быстро";
    
    const replicateOption = UI.createEl("option") as HTMLOptionElement;
    replicateOption.value = "replicate";
    replicateOption.textContent = "🎯 WhisperX (Replicate) - точнее";
    
    const savedProvider = localStorage.getItem("vot.langlearn.alignment.provider") || "openai";
    this.alignmentProviderSelect.value = savedProvider;
    this.alignmentProviderSelect.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.alignment.provider", this.alignmentProviderSelect.value);
      this.updateWhisperUIVisibility();
    });
    this.alignmentProviderSelect.append(openaiOption, replicateOption);
    providerLabel.append(providerLabelText, this.alignmentProviderSelect);
    whisperSection.append(providerLabel);

    // OpenAI Settings Group
    const openaiGroup = UI.createEl("div", ["vot-ll-openai-group"]);
    
    // Whisper API Key
    const whisperApiKeyLabel = UI.createEl("label");
    whisperApiKeyLabel.style.display = "flex";
    whisperApiKeyLabel.style.flexDirection = "column";
    whisperApiKeyLabel.style.gap = "4px";
    const whisperApiKeyLabelText = UI.createEl("span");
    whisperApiKeyLabelText.textContent = "OpenAI API Key:";
    whisperApiKeyLabelText.style.fontSize = "12px";
    whisperApiKeyLabelText.style.color = "#aaa";
    this.whisperApiKeyInput = UI.createEl("input") as HTMLInputElement;
    this.whisperApiKeyInput.type = "password";
    this.whisperApiKeyInput.placeholder = "sk-...";
    this.whisperApiKeyInput.value = localStorage.getItem("vot.langlearn.whisper.apiKey") || "";
    this.whisperApiKeyInput.style.padding = "6px 8px";
    this.whisperApiKeyInput.style.borderRadius = "4px";
    this.whisperApiKeyInput.style.border = "1px solid #444";
    this.whisperApiKeyInput.style.background = "#2a2a2a";
    this.whisperApiKeyInput.style.color = "#fff";
    this.whisperApiKeyInput.style.fontSize = "13px";
    this.whisperApiKeyInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.whisper.apiKey", this.whisperApiKeyInput.value.trim());
      this.updateWhisperStatus();
    });
    whisperApiKeyLabel.append(whisperApiKeyLabelText, this.whisperApiKeyInput);
    openaiGroup.append(whisperApiKeyLabel);
    
    // Whisper Base URL (for custom endpoints)
    const whisperBaseUrlLabel = UI.createEl("label");
    whisperBaseUrlLabel.style.display = "flex";
    whisperBaseUrlLabel.style.flexDirection = "column";
    whisperBaseUrlLabel.style.gap = "4px";
    whisperBaseUrlLabel.style.marginTop = "8px";
    const whisperBaseUrlLabelText = UI.createEl("span");
    whisperBaseUrlLabelText.textContent = "API Endpoint (опционально):";
    whisperBaseUrlLabelText.style.fontSize = "12px";
    whisperBaseUrlLabelText.style.color = "#aaa";
    this.whisperBaseUrlInput = UI.createEl("input") as HTMLInputElement;
    this.whisperBaseUrlInput.type = "text";
    this.whisperBaseUrlInput.placeholder = "https://api.openai.com/v1";
    this.whisperBaseUrlInput.value = localStorage.getItem("vot.langlearn.whisper.baseUrl") || "https://api.openai.com/v1";
    this.whisperBaseUrlInput.style.padding = "6px 8px";
    this.whisperBaseUrlInput.style.borderRadius = "4px";
    this.whisperBaseUrlInput.style.border = "1px solid #444";
    this.whisperBaseUrlInput.style.background = "#2a2a2a";
    this.whisperBaseUrlInput.style.color = "#fff";
    this.whisperBaseUrlInput.style.fontSize = "13px";
    this.whisperBaseUrlInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.whisper.baseUrl", this.whisperBaseUrlInput.value.trim());
    });
    whisperBaseUrlLabel.append(whisperBaseUrlLabelText, this.whisperBaseUrlInput);
    openaiGroup.append(whisperBaseUrlLabel);
    
    // Whisper Model
    const whisperModelLabel = UI.createEl("label");
    whisperModelLabel.style.display = "flex";
    whisperModelLabel.style.flexDirection = "column";
    whisperModelLabel.style.gap = "4px";
    whisperModelLabel.style.marginTop = "8px";
    const whisperModelLabelText = UI.createEl("span");
    whisperModelLabelText.textContent = "Модель:";
    whisperModelLabelText.style.fontSize = "12px";
    whisperModelLabelText.style.color = "#aaa";
    this.whisperModelInput = UI.createEl("input") as HTMLInputElement;
    this.whisperModelInput.type = "text";
    this.whisperModelInput.placeholder = "whisper-1";
    this.whisperModelInput.value = localStorage.getItem("vot.langlearn.whisper.model") || "whisper-1";
    this.whisperModelInput.style.padding = "6px 8px";
    this.whisperModelInput.style.borderRadius = "4px";
    this.whisperModelInput.style.border = "1px solid #444";
    this.whisperModelInput.style.background = "#2a2a2a";
    this.whisperModelInput.style.color = "#fff";
    this.whisperModelInput.style.fontSize = "13px";
    this.whisperModelInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.whisper.model", this.whisperModelInput.value.trim());
    });
    whisperModelLabel.append(whisperModelLabelText, this.whisperModelInput);
    openaiGroup.append(whisperModelLabel);

    // Replicate Settings Group
    const replicateGroup = UI.createEl("div", ["vot-ll-replicate-group"]);
    replicateGroup.style.display = "none";
    
    // Replicate API Key
    const replicateApiKeyLabel = UI.createEl("label");
    replicateApiKeyLabel.style.display = "flex";
    replicateApiKeyLabel.style.flexDirection = "column";
    replicateApiKeyLabel.style.gap = "4px";
    const replicateApiKeyLabelText = UI.createEl("span");
    replicateApiKeyLabelText.textContent = "Replicate API Token:";
    replicateApiKeyLabelText.style.fontSize = "12px";
    replicateApiKeyLabelText.style.color = "#aaa";
    this.replicateApiKeyInput = UI.createEl("input") as HTMLInputElement;
    this.replicateApiKeyInput.type = "password";
    this.replicateApiKeyInput.placeholder = "r8_...";
    this.replicateApiKeyInput.value = localStorage.getItem("vot.langlearn.replicate.apiKey") || "";
    this.replicateApiKeyInput.style.padding = "6px 8px";
    this.replicateApiKeyInput.style.borderRadius = "4px";
    this.replicateApiKeyInput.style.border = "1px solid #444";
    this.replicateApiKeyInput.style.background = "#2a2a2a";
    this.replicateApiKeyInput.style.color = "#fff";
    this.replicateApiKeyInput.style.fontSize = "13px";
    this.replicateApiKeyInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.replicate.apiKey", this.replicateApiKeyInput.value.trim());
      this.updateWhisperStatus();
    });
    replicateApiKeyLabel.append(replicateApiKeyLabelText, this.replicateApiKeyInput);
    replicateGroup.append(replicateApiKeyLabel);
    
    // Replicate Model
    const replicateModelLabel = UI.createEl("label");
    replicateModelLabel.style.display = "flex";
    replicateModelLabel.style.flexDirection = "column";
    replicateModelLabel.style.gap = "4px";
    replicateModelLabel.style.marginTop = "8px";
    const replicateModelLabelText = UI.createEl("span");
    replicateModelLabelText.textContent = "Модель WhisperX:";
    replicateModelLabelText.style.fontSize = "12px";
    replicateModelLabelText.style.color = "#aaa";
    this.replicateModelInput = UI.createEl("input") as HTMLInputElement;
    this.replicateModelInput.type = "text";
    this.replicateModelInput.placeholder = "victor/whisperx";
    this.replicateModelInput.value = localStorage.getItem("vot.langlearn.replicate.model") || "victor/whisperx";
    this.replicateModelInput.style.padding = "6px 8px";
    this.replicateModelInput.style.borderRadius = "4px";
    this.replicateModelInput.style.border = "1px solid #444";
    this.replicateModelInput.style.background = "#2a2a2a";
    this.replicateModelInput.style.color = "#fff";
    this.replicateModelInput.style.fontSize = "13px";
    this.replicateModelInput.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.replicate.model", this.replicateModelInput.value.trim());
    });
    replicateModelLabel.append(replicateModelLabelText, this.replicateModelInput);
    replicateGroup.append(replicateModelLabel);

    // Test button and status
    const whisperTestRow = UI.createEl("div");
    whisperTestRow.style.display = "flex";
    whisperTestRow.style.alignItems = "center";
    whisperTestRow.style.gap = "10px";
    whisperTestRow.style.marginTop = "12px";
    
    this.whisperTestBtn = UI.createEl("button", ["vot-ll-btn", "vot-ll-btn-small"]) as HTMLButtonElement;
    this.whisperTestBtn.textContent = "🔍 Тест";
    this.whisperTestBtn.style.padding = "6px 12px";
    this.whisperTestBtn.addEventListener("click", () => this.testWhisperConnection());
    
    this.whisperStatusEl = UI.createEl("span");
    this.whisperStatusEl.style.fontSize = "12px";
    this.whisperStatusEl.style.color = "#888";
    
    whisperTestRow.append(this.whisperTestBtn, this.whisperStatusEl);

    // Original language selector (for audio alignment)
    const origLangLabel = UI.createEl("label");
    origLangLabel.style.display = "flex";
    origLangLabel.style.flexDirection = "column";
    origLangLabel.style.gap = "4px";
    origLangLabel.style.marginTop = "8px";
    const origLangLabelText = UI.createEl("span");
    origLangLabelText.textContent = "🎬 Язык оригинала:";
    origLangLabelText.style.fontSize = "12px";
    origLangLabelText.style.fontWeight = "500";
    origLangLabelText.style.color = "#aaa";
    const origLangSelect = UI.createEl("select") as HTMLSelectElement;
    origLangSelect.style.padding = "6px 8px";
    origLangSelect.style.borderRadius = "4px";
    origLangSelect.style.border = "1px solid #444";
    origLangSelect.style.background = "#2a2a2a";
    origLangSelect.style.color = "#fff";
    
    const origLangOptions = [
      { value: "en", label: "🇬🇧 English" },
      { value: "de", label: "🇩🇪 Deutsch" },
      { value: "fr", label: "🇫🇷 Français" },
      { value: "es", label: "🇪🇸 Español" },
      { value: "it", label: "🇮🇹 Italiano" },
      { value: "pt", label: "🇵🇹 Português" },
      { value: "pl", label: "🇵🇱 Polski" },
      { value: "nl", label: "🇳🇱 Nederlands" },
      { value: "sv", label: "🇸🇪 Svenska" },
      { value: "tr", label: "🇹🇷 Türkçe" },
      { value: "ja", label: "🇯🇵 日本語" },
      { value: "ko", label: "🇰🇷 한국어" },
      { value: "zh", label: "🇨🇳 中文" },
      { value: "ar", label: "🇸🇦 العربية" },
      { value: "hi", label: "🇮🇳 हिन्दी" },
    ];
    
    for (const opt of origLangOptions) {
      const option = UI.createEl("option") as HTMLOptionElement;
      option.value = opt.value;
      option.textContent = opt.label;
      origLangSelect.append(option);
    }
    
    origLangSelect.value = localStorage.getItem("vot.langlearn.whisper.language") || "en";
    origLangSelect.addEventListener("change", () => {
      localStorage.setItem("vot.langlearn.whisper.language", origLangSelect.value);
    });
    origLangLabel.append(origLangLabelText, origLangSelect);

    // Translation language selector (always Russian)
    const transLangLabel = UI.createEl("label");
    transLangLabel.style.display = "flex";
    transLangLabel.style.flexDirection = "column";
    transLangLabel.style.gap = "4px";
    transLangLabel.style.marginTop = "8px";
    const transLangLabelText = UI.createEl("span");
    transLangLabelText.textContent = "🔊 Язык перевода (фиксировано):";
    transLangLabelText.style.fontSize = "12px";
    transLangLabelText.style.color = "#888";
    const transLangValue = UI.createEl("div");
    transLangValue.textContent = "🇷🇺 Русский";
    transLangValue.style.padding = "6px 8px";
    transLangValue.style.background = "#1a1a2e";
    transLangValue.style.borderRadius = "4px";
    transLangValue.style.fontSize = "13px";
    transLangValue.style.color = "#aaa";
    // Set Russian as default for translation
    localStorage.setItem("vot.langlearn.whisper.transLanguage", "ru");
    transLangLabel.append(transLangLabelText, transLangValue);

    // Whisper note
    const whisperNote = UI.createEl("div");
    whisperNote.style.fontSize = "11px";
    whisperNote.style.color = "#888";
    whisperNote.style.marginTop = "8px";
    whisperNote.innerHTML = "💡 <b>Whisper</b> (OpenAI) - быстрее (~2-5 сек)<br>🎯 <b>WhisperX</b> (Replicate) - точнее (~10-20мс), но дольше (~15-60 сек)";

    whisperSection.append(openaiGroup, replicateGroup, whisperTestRow, origLangLabel, transLangLabel, whisperNote);

    // Local WebGPU Settings Section
    const localSection = UI.createEl("div", ["vot-ll-local-section"]);
    localSection.style.display = "none";
    localSection.style.flexDirection = "column";
    localSection.style.gap = "10px";
    localSection.style.padding = "10px";
    localSection.style.background = "#1a2e1a";
    localSection.style.borderRadius = "6px";

    const localModelLabel = UI.createEl("label");
    localModelLabel.textContent = "Имя модели (MLC):";
    this.llmModelInput = UI.createEl("input") as HTMLInputElement;
    this.llmModelInput.type = "text";
    this.llmModelInput.placeholder = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
    this.llmModelInput.value = localStorage.getItem("vot.langlearn.llm.model") || "Llama-3.2-1B-Instruct-q4f16_1-MLC";
    this.llmModelInput.style.padding = "6px 8px";
    this.llmModelInput.style.borderRadius = "4px";
    this.llmModelInput.style.border = "1px solid #444";
    this.llmModelInput.style.background = "#2a2a2a";
    this.llmModelInput.style.color = "#fff";
    this.llmModelInput.addEventListener("change", () => localStorage.setItem("vot.langlearn.llm.model", this.llmModelInput.value.trim()));
    localModelLabel.append(this.llmModelInput);

    const forceLabel = UI.createEl("label");
    forceLabel.style.display = "flex";
    forceLabel.style.alignItems = "center";
    forceLabel.style.gap = "8px";
    forceLabel.style.marginTop = "8px";
    forceLabel.style.fontSize = "13px";
    forceLabel.textContent = "Принудительно загружать LLM ";
    const forceBox = UI.createEl("input") as HTMLInputElement;
    forceBox.type = "checkbox";
    forceBox.checked = localStorage.getItem("vot.langlearn.localLlm.force") === "true";
    forceBox.addEventListener("change", () => localStorage.setItem("vot.langlearn.localLlm.force", forceBox.checked.toString()));
    forceLabel.prepend(forceBox);

    const webgpuNote = UI.createEl("div");
    webgpuNote.style.fontSize = "11px";
    webgpuNote.style.color = "#888";
    webgpuNote.style.marginTop = "6px";
    webgpuNote.textContent = "⚠️ Требуется WebGPU (Chrome/Edge 113+). Модель загружается в браузере.";
    
    localSection.append(localModelLabel, forceLabel, webgpuNote);

    // Status card
    const llmStatusCard = UI.createEl("div", ["vot-ll-status-card"]);
    llmStatusCard.style.marginTop = "12px";
    this.llmProgressText = UI.createEl("div", ["vot-llm-progress-main"]);
    this.llmProgressText.textContent = "⚙️ Инициализация...";
    this.llmProgressText.style.fontSize = "13px";

    const progressBar = UI.createEl("div", ["vot-llm-progress-bar-container"]);
    const progressFill = UI.createEl("div", ["vot-llm-progress-bar-fill"]);
    progressBar.append(progressFill);

    llmStatusCard.append(this.llmProgressText, progressBar);

    llmForm.append(refinerLabel, qwenSection, whisperSection, localSection, llmStatusCard);
    llmDetails.append(llmSummary, llmForm);
    
    // Set initial visibility
    setTimeout(() => this.updateRefinerUIVisibility(), 0);
    setTimeout(() => this.updateWhisperUIVisibility(), 0);

    // Set up LLM progress callback
    this.controller.onLLMProgress = (progress) => {
      if (this.llmProgressText) {
        let text = "";
        let percent = 0;
        if (typeof progress === "string") {
          text = progress;
        } else if (progress && typeof progress === "object") {
          text = (progress as any).text || "Анализ...";
          percent = (progress as any).progress || 0;
        }
        this.llmProgressText.textContent = text;

        if (progressFill) {
          progressFill.style.width = `${Math.round(percent * 100)}%`;
        }

        if (text.includes("✅")) {
          this.llmProgressText.style.color = "#4CAF50";
          this.llmProgressText.style.fontWeight = "bold";
          if (progressFill) progressFill.style.backgroundColor = "#4CAF50";
        } else {
          this.llmProgressText.style.color = "#888";
          this.llmProgressText.style.fontWeight = "normal";
          if (progressFill) progressFill.style.backgroundColor = "#2196F3";
        }
      }
    };

    const logs = UI.createEl("div", ["vot-ll-logs"]);
    const logsHeader = UI.createEl("div", ["vot-ll-logs-header"]);
    const logsTitle = UI.createEl("span", ["vot-ll-logs-title"]);
    logsTitle.textContent = "Логи анализа";
    const logsActions = UI.createEl("div", ["vot-ll-logs-actions"]);
    this.copyLogsBtn = UI.createEl("button", ["vot-ll-btn", "vot-ll-btn-small"]) as HTMLButtonElement;
    this.copyLogsBtn.textContent = "Копировать";
    this.copyLogsBtn.addEventListener("click", () => {
      void this.copyLogsToClipboard();
    });
    this.clearLogsBtn = UI.createEl("button", ["vot-ll-btn", "vot-ll-btn-small"]) as HTMLButtonElement;
    this.clearLogsBtn.textContent = "Очистить";
    this.clearLogsBtn.addEventListener("click", () => this.controller.clearLogs());
    logsActions.append(this.copyLogsBtn, this.clearLogsBtn);
    logsHeader.append(logsTitle, logsActions);

    this.logsTextArea = UI.createEl("textarea", ["vot-ll-logs-textarea"]) as HTMLTextAreaElement;
    this.logsTextArea.readOnly = true;
    this.logsTextArea.spellcheck = false;
    this.logsTextArea.placeholder = "Логи появятся после запуска режима изучения.";
    this.logsMetaEl = UI.createEl("div", ["vot-ll-logs-meta"]);

    logs.append(logsHeader, this.logsTextArea, this.logsMetaEl);

    this.container.append(header, controls, settings, preview, llmDetails, logs);
    this.portal.appendChild(this.container);
  }

  private createSubtitlesUI() {
    this.overlayContainer = UI.createEl("div", ["vot-ll-subtitles-overlay"]);
    this.transSubEl = UI.createEl("div", ["vot-ll-sub-trans"]);
    this.origSubEl = UI.createEl("div", ["vot-ll-sub-orig"]);
    this.overlayContainer.append(this.transSubEl, this.origSubEl);
    this.portal.appendChild(this.overlayContainer);
  }

  private renderState(state: LangLearnState) {
    const hasPhrases = state.phrases.length > 0;
    this.prevBtn.disabled = !hasPhrases || state.currentIndex <= 0;
    this.nextBtn.disabled = !hasPhrases || state.currentIndex >= state.phrases.length - 1;
    this.playPauseBtn.disabled = !hasPhrases;
    this.playPauseBtn.textContent = state.isPlaying ? "⏸ Пауза" : "▶ Изучать";

    if (!state.isAlignmentComplete && hasPhrases) {
      this.playPauseBtn.style.opacity = "0.7";
      this.playPauseBtn.title = "Анализ смысла нейросетью продолжается...";
    } else {
      this.playPauseBtn.style.opacity = "1";
      this.playPauseBtn.title = "";
    }

    const statusPrefix = state.isAlignmentComplete ? "✅ " : "🔄 ";
    this.phraseCounter.textContent = `${statusPrefix}Фраза ${state.currentIndex + 1} / ${state.phrases.length}`;
  }

  private renderPhrase(current: number, total: number, phrase: PhraseItem | null) {
    if (!phrase) {
      this.origPreview.textContent = "-";
      this.transPreview.textContent = "-";
      return;
    }
    this.origPreview.textContent = `"${phrase.origText}"`;
    this.transPreview.textContent = `"${phrase.transText}"`;
  }

  private showSubtitles(orig: string, trans: string, showBoth: boolean) {
    this.transSubEl.textContent = trans;
    this.origSubEl.textContent = orig;
    this.origSubEl.style.opacity = showBoth ? "1" : "0";
    this.updateSubtitlesSafeArea();
  }

  private renderLogs(logs: string) {
    this.logsTextArea.value = logs;
    const lines = logs ? logs.split("\n").length : 0;
    this.logsMetaEl.textContent = `Строк логов: ${lines}`;
    this.updateSubtitlesSafeArea();
  }

  private async copyLogsToClipboard() {
    const logs = this.logsTextArea.value;
    if (!logs) {
      this.logsMetaEl.textContent = "Логи пустые.";
      return;
    }

    try {
      await navigator.clipboard.writeText(logs);
      this.logsMetaEl.textContent = `Скопировано (${logs.split("\n").length} строк).`;
      return;
    } catch {
      // Ignore and fallback below.
    }

    this.logsTextArea.focus();
    this.logsTextArea.select();
    const copied = document.execCommand("copy");
    this.logsMetaEl.textContent = copied
      ? `Скопировано (${logs.split("\n").length} строк).`
      : "Не удалось скопировать. Скопируй текст вручную из поля.";
  }

  private updateSubtitlesSafeArea() {
    if (!this.overlayContainer?.isConnected || !this.container?.isConnected) {
      return;
    }

    const rootRect = this.portal.getBoundingClientRect();
    const panelRect = this.container.getBoundingClientRect();
    const reserveRightPx = Math.max(0, rootRect.right - panelRect.left + 16);
    const minSubtitleRegionPx = 280;
    const reserveRightClamped = Math.min(
      reserveRightPx,
      Math.max(0, rootRect.width - minSubtitleRegionPx),
    );

    this.overlayContainer.style.left = "0px";
    this.overlayContainer.style.right = `${reserveRightClamped}px`;
    this.overlayContainer.style.width = "auto";

    const availableWidth = Math.max(minSubtitleRegionPx, rootRect.width - reserveRightClamped);
    const subtitleMaxWidth = Math.max(240, Math.round(availableWidth * 0.92));
    this.transSubEl.style.maxWidth = `${subtitleMaxWidth}px`;
    this.origSubEl.style.maxWidth = `${subtitleMaxWidth}px`;
  }

  private updateRefinerUIVisibility() {
    const refinerType = this.useRefinerSelect?.value || "qwen-api";
    const qwenSection = this.container.querySelector(".vot-ll-qwen-section") as HTMLElement;
    const localSection = this.container.querySelector(".vot-ll-local-section") as HTMLElement;

    if (qwenSection) {
      qwenSection.style.display = refinerType === "qwen-api" ? "flex" : "none";
    }
    if (localSection) {
      localSection.style.display = refinerType === "local-webgpu" ? "flex" : "none";
    }

    this.updateQwenStatus();
    this.updateWhisperStatus();
  }

  private updateWhisperUIVisibility() {
    const provider = this.alignmentProviderSelect?.value || "openai";
    const openaiGroup = this.container.querySelector(".vot-ll-openai-group") as HTMLElement;
    const replicateGroup = this.container.querySelector(".vot-ll-replicate-group") as HTMLElement;

    if (openaiGroup) {
      openaiGroup.style.display = provider === "openai" ? "flex" : "none";
      openaiGroup.style.flexDirection = "column";
    }
    if (replicateGroup) {
      replicateGroup.style.display = provider === "replicate" ? "flex" : "none";
      replicateGroup.style.flexDirection = "column";
    }

    this.updateWhisperStatus();
  }

  private updateQwenStatus() {
    if (!this.qwenStatusEl) return;
    
    const hasKey = Boolean(this.qwenApiKeyInput?.value?.trim());
    if (hasKey) {
      this.qwenStatusEl.textContent = "✓ Ключ задан";
      this.qwenStatusEl.style.color = "#4CAF50";
    } else {
      this.qwenStatusEl.textContent = "⚠ Введите API ключ";
      this.qwenStatusEl.style.color = "#ff9800";
    }
  }

  private async testQwenConnection() {
    if (!this.qwenTestBtn || !this.qwenStatusEl) return;

    this.qwenTestBtn.disabled = true;
    this.qwenTestBtn.textContent = "⏳ Проверка...";
    this.qwenStatusEl.textContent = "Подключение...";
    this.qwenStatusEl.style.color = "#888";

    const result = await testQwenApiConnection();

    this.qwenTestBtn.disabled = false;
    this.qwenTestBtn.textContent = "🔍 Тест подключения";

    if (result.success) {
      this.qwenStatusEl.textContent = `✅ ${result.message} (${result.latencyMs}ms)`;
      this.qwenStatusEl.style.color = "#4CAF50";
    } else {
      this.qwenStatusEl.textContent = `❌ ${result.message}`;
      this.qwenStatusEl.style.color = "#f44336";
    }
  }

  private updateWhisperStatus() {
    if (!this.whisperStatusEl) return;
    
    const provider = this.alignmentProviderSelect?.value || "openai";
    
    if (provider === "replicate") {
      const hasReplicateKey = Boolean(this.replicateApiKeyInput?.value?.trim());
      if (hasReplicateKey) {
        this.whisperStatusEl.textContent = "✓ Replicate ключ задан";
        this.whisperStatusEl.style.color = "#4CAF50";
      } else {
        this.whisperStatusEl.textContent = "⚠ Введите Replicate API Token";
        this.whisperStatusEl.style.color = "#ff9800";
      }
    } else {
      const hasOpenAIKey = Boolean(this.whisperApiKeyInput?.value?.trim());
      if (hasOpenAIKey) {
        this.whisperStatusEl.textContent = "✓ OpenAI ключ задан";
        this.whisperStatusEl.style.color = "#4CAF50";
      } else {
        this.whisperStatusEl.textContent = "⚠ Введите OpenAI API ключ";
        this.whisperStatusEl.style.color = "#ff9800";
      }
    }
  }

  private async testWhisperConnection() {
    if (!this.whisperTestBtn || !this.whisperStatusEl) return;

    this.whisperTestBtn.disabled = true;
    this.whisperTestBtn.textContent = "⏳ Проверка...";
    this.whisperStatusEl.textContent = "Подключение...";
    this.whisperStatusEl.style.color = "#888";

    const result = await testWhisperConnection();

    this.whisperTestBtn.disabled = false;
    this.whisperTestBtn.textContent = "🔍 Тест";

    if (result.success) {
      this.whisperStatusEl.textContent = `✅ ${result.message}`;
      if (result.latencyMs) {
        this.whisperStatusEl.textContent += ` (${result.latencyMs}ms)`;
      }
      this.whisperStatusEl.style.color = "#4CAF50";
    } else {
      this.whisperStatusEl.textContent = `❌ ${result.message}`;
      this.whisperStatusEl.style.color = "#f44336";
    }
  }

  public close() {
    this.controller.stop();
    this.controller.onLogsChange = undefined;
    this.controller.onStateChange = undefined;
    this.controller.onPhraseChange = undefined;
    this.controller.onShowSubtitles = undefined;
    window.removeEventListener("resize", this.onViewportChanged);
    this.container.remove();
    this.overlayContainer.remove();

    const uiManager = (window as any)._votUIManager;
    if (uiManager && uiManager.videoHandler) {
      if (uiManager.videoHandler.subtitlesWidget) {
        uiManager.videoHandler.subtitlesWidget.container.style.display = this.originalVOTSubtitlesDisplay;
      }
      uiManager.videoHandler.video.play().catch(() => { });
    }
  }
}
