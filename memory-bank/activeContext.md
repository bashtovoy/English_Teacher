# Active Context — English_Teacher (VOT)

## Current Focus
- Проект в стабильном состоянии, активная разработка не ведётся
- Memory Bank в корне проекта (`memory-bank/`) с 6 отдельными файлами
- Репозиторий очищен от мусора (удалено 276 файлов)
- Настроены протоколы поведения агента (startup и completion)

## Recent Changes
- Strengthened Memory Bank protocol with explicit "BEFORE attempt_completion" enforcement rule
- Test task: Memory Bank protocol demonstration completed successfully
- Created global Cline rules at `~/Documents/Cline/Rules/memory-bank.md` — Memory Bank protocol applies to all projects
- Created `.clinerules` file to automate agent behavior — agent now automatically reads Memory Bank at session start and updates it after each task
- Updated `agentWorkflow.md` with official Cline Memory Bank commands and agent workflow protocols
- Added startup protocol: agent reads Memory Bank files at beginning of each task
- Added completion protocol: agent updates Memory Bank after completing each task
- `9462aad` — chore: clean project - remove old version backup, debug logs, and unused demo/test files
- `4b53f90` — docs: add Memory Bank per Cline documentation
- `fb8abe3` — docs: add PROJECT_CONTEXT.md and auto-update script
- `62a716a` — docs: reorder language badges to EN, DE, FR, UK, RU

## Active Decisions
- Main README in English for international audience
- Language versions: EN, RU, DE, UK, FR
- Language badges order: EN → DE → FR → UK → RU
- No country flags in language badges — text only
- Memory Bank в корне проекта `memory-bank/`
- `.qoder/` wiki-документация оставлена (закоммичена)

## Workflow Rules
- Memory Bank must always be up to date after each task

## Cleanup Summary (9462aad)
Удалено 276 файлов (81,301 строк):
- `voice-over-translation-1.11.2/` — полная копия старой версии (~200 файлов)
- `log.txt` — временный отладочный лог LangLearn
- `tests/ui.js` — устаревший тест-демо
- `demo/segmentation_lab.html` — экспериментальная лаборатория

## Next Steps
- [ ] Ждать новых feature requests или bug reports
- [ ] Обновлять Memory Bank после значительных изменений
