# Project Context & Decision Log

> Этот файл содержит ключевую информацию о проекте и принятых архитектурных решениях для быстрого восстановления контекста в новых диалогах.

## 📌 Обзор проекта

**Название:** English_Teacher (Voice Over Translation / VOT)
**Описание:** Расширение для закадрового перевода видео с поддержкой субтитров, скачивания аудио и обучения языкам.
**Репозиторий:** https://github.com/bashtovoy/English_Teacher.git
**Последний коммит:** `62a716a` — docs: reorder language badges to EN, DE, FR, UK, RU

---

## 🏗️ Архитектура проекта

### Ключевые компоненты:

1. **Core (Ядро)**
   - `src/core/` — основная логика: авторизация, перевод, кэширование, управление видео
   - `translationHandler.ts` — обработка переводов
   - `translationOrchestrator.ts` — оркестрация процессов перевода
   - `videoLifecycleController.ts` — управление жизненным циклом видео

2. **Extension (Расширение)**
   - `src/extension/` — интеграция с браузером: bridge, background, webext APIs
   - `background.ts` — сервис-воркер расширения

3. **UI (Интерфейс)**
   - `src/ui/` — компоненты интерфейса, менеджер UI, оверлеи
   - `src/ui/components/` — переиспользуемые компоненты (кнопки, слайдеры, селекты)
   - `src/ui/views/` — экраны (overlay, settings)

4. **Subtitles (Субтитры)**
   - `src/subtitles/` — процессинг, сегментация, layout, widget
   - `smartLayout.ts` — умное расположение
   - `smartWrap.ts` — перенос текста

5. **Audio Downloader (Загрузка аудио)**
   - `src/audioDownloader/` — скачивание аудио с видео
   - `ytAudio/` — специфическая логика для YouTube

6. **Localization (Локализация)**
   - `src/localization/` — поддержка 50+ языков
   - `locales/` — JSON файлы локализации

7. **LangLearn (Обучение языкам)**
   - `src/langLearn/` — панель обучения, выравнивание аудио/фраз
   - `phraseSegmenter/` — сегментация фраз (включая Qwen API, Local LLM)

---

## 📝 История коммитов

| Коммит | Описание |
|--------|----------|
| `62a716a` | **reorder language badges** — изменён порядок языков в бейджах на EN, DE, FR, UK, RU |
| `d383854` | **remove country flags** — удалены флаги стран из языковых бейджей, добавлена документация DE/UK/FR |
| `2152a17` | **switch main README to English** — основной README на английском, добавлен README-RU для русской версии |
| `4f55ea8` | **clean project history** — очистка истории, удаление node_modules из git, добавление .qoder/wiki документов |

---

## 🎯 Принятые решения

### Документация и README

1. **Основной README на английском** (`README.md`) для международного аудиторием
2. **Языковые версии:** README-EN.md, README-RU.md, README-DE.md, README-UK.md, README-FR.md
3. **Порядок языковых бейджей:** English → DE → FR → UK → RU (слева направо)
4. **Без флагов стран** — языковые бейджи содержат только текст языков

### Технический стек

- **TypeScript** — основной язык
- **Vite** — сборка (vite.config.ts, vite.extension.config.ts)
- **SCSS** — стили с mixins
- **Biome** — линтер и форматтер

### Сборка

- `npm run build` — стандартная сборка userscript
- `npm run build:min` — минифицированная сборка
- `npm run build:ext` — нативные расширения Chrome/Firefox
- `npm run build:dev` — dev-сборка с sourcemaps

---

## 📂 Структура проекта

```
English_Teacher/
├── src/
│   ├── core/           # Ядро: перевод, видео, кэширование
│   ├── extension/      # Интеграция с браузером
│   ├── ui/             # Интерфейс пользователя
│   ├── subtitles/      # Субтитры
│   ├── audioDownloader/ # Загрузка аудио
│   ├── localization/   # Локализация (50+ языков)
│   ├── langLearn/      # Обучение языкам
│   ├── bootstrap/      # Инициализация
│   ├── config/         # Конфигурация
│   ├── styles/         # SCSS стили
│   ├── types/          # TypeScript типы
│   └── utils/          # Утилиты
├── docs/               # Документация (API, ARCHITECTURE, AUDIODOWNLOADER)
├── demo/               # Демо-файлы
├── scripts/            # Скрипты (generate_report, wiki-gen)
├── tests/              # Тесты
├── dist/               # Артефакты сборки (vot.user.js)
├── README.md           # Основной README (английский)
├── README-*.md         # Языковые версии README
├── PROJECT_CONTEXT.md  # Этот файл — контекст проекта
└── improvement_plan.md # План улучшений
```

---

## 🔄 Автоматическое обновление контекста

Этот файл должен обновляться после каждой значимой задачи. Рекомендуется:

1. **После каждого merge** — добавлять запись в таблицу коммитов
2. **При изменении архитектуры** — обновлять секцию архитектуры
3. **При принятии новых решений** — добавлять в секцию решений
4. **Регулярно** — просматривать и актуализировать информацию

---

## 🔧 Важные файлы

| Файл | Описание |
|------|----------|
| `Implementation_Plan.md` | План реализации проекта |
| `improvement_plan.md` | План улучшений |
| `docs/API.md` | API документация |
| `docs/ARCHITECTURE.md` | Архитектурная документация |
| `docs/AUDIODOWNLOADER.md` | Документация по загрузке аудио |
| `LANG_SUPPORT.md` | Поддерживаемые языки |

---

*Последнее обновление: 2026-04-04
*Автор: Andrii Bashtovyi*