# AGENTS.md — правила проекта `Save Toto`

## 1. Обязательные чтения

Перед любой работой агент обязан прочитать:

1. `GDD.md`
2. `.plbx/game-design/GDD.md`
3. `.plbx/game-design/OPEN_ISSUES.md`
4. `.plbx/game-design/REFERENCE_AUDIT.md`
5. `ARCHITECTURE.md`
6. `AGENTS.md`

Если задача связана со сценой, дополнительно прочитать:

```text
.plbx/game-design/SCENE_SETUP.md
.plbx/game-design/AUTO_SCENE_ASSEMBLY_PLAN.md
.plbx/game-design/ASSET_SPEC.md
.plbx/game-design/PREFAB_STRATEGY.md
.plbx/game-design/ANIMATION_STRATEGY.md
```

Если задача связана с кодом slot/template migration, дополнительно изучить:

```text
.plbx/reference/slot-game/README.md
.plbx/reference/slot-game/assets/scripts/controllers/Bootstrap.ts
.plbx/reference/slot-game/assets/scripts/Slot/SlotController.ts
.plbx/reference/slot-game/assets/scripts/Slot/SlotColumn.ts
.plbx/reference/slot-game/assets/scripts/Slot/managers/ForcedSpawnManager.ts
.plbx/reference/other-assets/scripts/controllers/SpinButtonController.ts
.plbx/reference/other-assets/scripts/Slot/managers/ForcedSpawnManager.ts
.plbx/game-design/PREFAB_STRATEGY.md
.plbx/game-design/ANIMATION_STRATEGY.md
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
| Runtime base | Cocos Creator 3.8.8 + slot template from `.plbx/reference/slot-game/` |
| Parallel reference | `.plbx/reference/other-assets/` для VFX/audio/CTA/adaptive patterns |
| Текущий статус | Чистый Cocos project; runtime-ассеты разложены; docs обновлены под template-first план |

## 3. Главные правила

- Не перезаписывать исходный `GDD.md` без отдельной задачи.
- Не создавать `.meta` вручную.
- Не редактировать `.plbx/reference/**` без отдельной задачи.
- Не копировать reference-проекты целиком в `assets/`.
- Не включать `.plbx/reference/**` в production bundle.
- Не использовать `find()` / `getChildByName()` для gameplay wiring.
- Не хардкодить координаты в gameplay logic; использовать scene blueprint/config.
- Не добавлять новые библиотеки без явного запроса.
- Не менять store/CTA поведение без синхронизации `OPEN_ISSUES.md` и `EXPORT_CHECKLIST.md`.

## 4. Template-first + scene-first workflow

Разрешённый порядок:

```text
REFERENCE_AUDIT -> ASSET_SPEC -> SCENE_SETUP -> template module adaptation -> scene blueprint -> generated scene -> explicit wiring -> SaveToto state machine
```

Запрещённый порядок:

```text
copy reference project wholesale -> manual scene fixes -> runtime find by name -> gameplay coordinates in code
```

## 5. Runtime flow contract

1. Intro показывает клетку, Тото, огонь, замки, reel и `SPIN`.
2. `SPIN` запускает template-derived 5×3 scripted reel spin.
3. Scatter result запускает bonus; paylines secondary/optional.
4. Bonus принимает 3 picks из 6 корзин.
5. Каждый pick снимает один замок слева направо и снижает огонь.
6. После 3 picks запускается переход в packshot; клетка как one-piece asset не открывается дверцей.
7. Balance/final value докручивается, `WIN` остаётся fixed visual label, затем показывается CTA.
8. Fail-финал отсутствует.

## 6. Reference migration rules

- `slot-game` — основа логики reels/spin/forced spawn/reward skeleton.
- `other-assets` — источник паттернов: 5-column layout, pulse, audio unlock, orientation, VFX flights, CTA fade.
- Generic template CTA-after-spins нужно отключить: CTA показывается только после `Payout`.
- `WinChecker` должен быть адаптирован: scatter-count запускает bonus; line wins не являются главным flow gate. Scatter symbol = Toto.
- Все перенесённые классы переименовываются/namespace-ятся под `SaveToto*` для поддержки и навигации.
- Prefabs создаются в `assets/prefabs/save-toto/**`; `.meta` создаёт Cocos, не агент вручную.
- `.anim` clips создаются/генерируются через Cocos/editor workflow в `assets/animations/save-toto/**`; gameplay не хардкодит visual tween curves.

## 7. Definition of done для любой реализации

- Изменения соответствуют документам `.plbx/game-design/`.
- Все новые неизвестные добавлены в `OPEN_ISSUES.md`.
- Сцена не ломает explicit wiring.
- Reference-папки не изменены и не попали в runtime bundle.
- QA checklist обновлён, если меняется flow.
- Export checklist обновлён, если меняется CTA/store/bundle.
