# AGENTS.md — правила проекта `Save Toto`

## 1. Обязательные чтения

Перед любой работой агент обязан прочитать:

1. `GDD.md`
2. `.plbx/game-design/GDD.md`
3. `.plbx/game-design/OPEN_ISSUES.md`
4. `ARCHITECTURE.md`
5. `AGENTS.md`

Если задача связана со сценой, дополнительно прочитать:

```text
.plbx/game-design/SCENE_SETUP.md
.plbx/game-design/AUTO_SCENE_ASSEMBLY_PLAN.md
.plbx/game-design/ASSET_SPEC.md
```

Если задача связана с QA/export, дополнительно прочитать:

```text
.plbx/game-design/QA_CHECKLIST.md
.plbx/game-design/EXPORT_CHECKLIST.md
```

## 2. Проект

| Поле | Значение |
|---|---|
| Название | `Save Toto` |
| ID | `WOZ_B1_C3_SaveToto` |
| Тип | Web playable ad |
| Ориентация | Portrait `9:16` |
| Core | `1 spin + 3 basket picks + Toto freed + CTA` |
| Текущий статус | Чистый Cocos Creator 3.8.8 проект; runtime-ассеты разложены; gameplay-сцена и скрипты ещё не собраны |

## 3. Главные правила

- Не перезаписывать исходный `GDD.md` без отдельной задачи.
- Не создавать `.meta` вручную.
- Не включать `.plbx/reference/scene.png` в production bundle как runtime asset без решения.
- Не использовать `find()` / `getChildByName()` для gameplay wiring.
- Не хардкодить координаты в gameplay logic; использовать scene blueprint/config.
- Не добавлять новые библиотеки без явного запроса.
- Не менять store/CTA поведение без синхронизации `OPEN_ISSUES.md`.

## 4. Scene-first workflow

Разрешённый порядок:

```text
ASSET_SPEC -> SCENE_SETUP -> scene blueprint -> generated scene -> explicit wiring -> state machine -> gameplay logic
```

Запрещённый порядок:

```text
manual visual scene -> runtime find by name -> logic fixes positions directly
```

## 5. Runtime flow contract

1. Intro показывает клетку, Тото, огонь, замки, reel и `SPIN`.
2. `SPIN` запускает scripted reel result.
3. Scatter result запускает bonus.
4. Bonus принимает 3 picks из 6 корзин.
5. Каждый pick снимает один замок и снижает огонь.
6. После 3 picks клетка открывается, Тото освобождён.
7. `WIN` докручивается, затем показывается CTA.
8. Fail-финал отсутствует.

## 6. Definition of done для любой реализации

- Изменения соответствуют документам `.plbx/game-design/`.
- Все новые неизвестные добавлены в `OPEN_ISSUES.md`.
- Сцена не ломает explicit wiring.
- QA checklist обновлён, если меняется flow.
- Export checklist обновлён, если меняется CTA/store/bundle.
