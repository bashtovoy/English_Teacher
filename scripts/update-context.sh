#!/bin/bash
# Скрипт для обновления PROJECT_CONTEXT.md после коммитов
# Использование: ./scripts/update-context.sh

echo "Обновление PROJECT_CONTEXT.md..."

# Получаем последний коммит
LAST_HASH=$(git log -1 --oneline --no-color | awk '{print $1}')
LAST_MSG=$(git log -1 --oneline --no-color | cut -d' ' -f2-)

# Обновляем дату в PROJECT_CONTEXT.md
CURRENT_DATE=$(date +%Y-%m-%d)
sed -i '' "s/^*Последнее обновление:.*$/*Последнее обновление: ${CURRENT_DATE}/g" PROJECT_CONTEXT.md

# Обновляем информацию о последнем коммите
sed -i '' "s|^\*\*Последний коммит:\*\* .*$|**Последний коммит:** \`${LAST_HASH}\` — ${LAST_MSG}|g" PROJECT_CONTEXT.md

# Обновляем таблицу коммитов
TABLE_START=$(grep -n "## 📝 История коммитов" PROJECT_CONTEXT.md | head -1 | cut -d: -f1)
TABLE_SEP_LINE=$((TABLE_START + 2))

# Проверяем, есть ли уже этот коммит в таблице
if grep -q "${LAST_HASH}" PROJECT_CONTEXT.md; then
    echo "✓ Коммит ${LAST_HASH} уже есть в истории"
else
    # Добавляем новую запись
    sed -i '' "${TABLE_SEP_LINE}a\\
| \`${LAST_HASH}\` | **${LAST_MSG}** |" PROJECT_CONTEXT.md
    echo "✓ Добавлен коммит ${LAST_HASH} в историю"
fi

echo "✓ PROJECT_CONTEXT.md обновлён (дата: ${CURRENT_DATE})"
echo ""
echo "Не забудьте закоммитить изменения:"
echo "  git add PROJECT_CONTEXT.md"
echo "  git commit -m 'docs: update project context'"