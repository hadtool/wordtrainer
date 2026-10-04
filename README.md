# Слова — тренажёр английских слов
Запуск: `npm install && npm run dev`. Сборка: `npm run build` (папка dist, base './' — подходит для GitHub Pages).
Наборы: public/data/index.json + a1.json, b2.json… Формат слова: {id, word, options[4], correct}. id не менять.

## Наборы
Положи CSV `tools/source/<уровень>.csv` (word,translation,topic) и выполни `python3 tools/build_sets.py build` — появятся JSON-наборы и index.json (id сохраняются). Проверка: `python3 tools/build_sets.py check`.
## Офлайн
После сборки и публикации открой сайт онлайн два раза — дальше он работает без сети и ставится на телефон.

## Наборы из документа со словами
Сохрани документ как `tools/source/words.md` и выполни `python3 tools/import_units.py` — появятся `unit01.json … unit10.json` и `index.json`.
Переводы лежат в `tools/source/translations.txt` (слово=перевод). Скрипт перечислит слова без перевода.
