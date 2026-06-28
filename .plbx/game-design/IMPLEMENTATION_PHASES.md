---
document_type: "implementation_phases"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.1.0"
status: "template_first_scene_first_plan"
date: "2026-06-28"
---

# Фазы реализации `Save Toto`

## Фаза 0. Документация, reference-аудит и решения

Цель: зафиксировать, что `slot-game` является базой логики, а `other-assets` — reference для решений.

Задачи:

1. Прочитать `GDD.md`, `.plbx/game-design/GDD.md`, `OPEN_ISSUES.md`, `REFERENCE_AUDIT.md`, `ASSET_SPEC.md`, `PREFAB_STRATEGY.md`, `ANIMATION_STRATEGY.md`, `SCENE_SETUP.md`, `ARCHITECTURE.md`, `AGENTS.md`.
2. Проверить `.plbx/reference/slot-game/assets/scene.scene` через scene graph.
3. Проверить `.plbx/reference/other-assets/scene.scene` через scene graph.
4. Использовать принятые решения из `OPEN_ISSUES.md`: existing symbols, стартовые prizes, store stub, no auto-flow MVP, Toto scatter.
5. Не копировать reference-проекты целиком.

Готово, когда reference roles понятны и migration-specific open issues добавлены.

## Фаза 1. Template module import/adaptation

Цель: перенести slot core в целевой проект как основу логики.

Задачи:

1. Создать target module `assets/scripts/save-toto/`.
2. Перенести/адаптировать из `slot-game`:
   - common/logger/validator;
   - events;
   - `SlotController`, `SlotColumn`, `ColumnMover`;
   - elements config/spawner/randomizer;
   - win animation basics;
   - spin button;
   - reward controller;
   - CTA screen skeleton.
3. Взять enhanced `ForcedSpawnManager` и `SpinButtonController` patterns из `other-assets`.
4. Переименовать/namespace-ить production классы под `SaveToto*` и добавить понятные комментарии для навигации.
5. Не копировать `.meta` из reference вручную.

Готово, когда TypeScript модуль компилируется без сцены и не зависит от reference paths.

## Фаза 2. Save Toto config и symbol mapping

Цель: описать данные слота без сцены.

Задачи:

1. Создать `SaveTotoConfig`.
2. Закрепить symbol IDs: Toto=scatter, basket, key/regular fallback, drop, Oz.
3. Настроить reel `5×3`, `columns=5`, `visibleRows=3`.
4. Настроить forced result для первого scripted spin.
5. Добавить scatter-count check по Toto symbol отдельно от paylines.
6. Добавить rewards by pick index.
7. Выключить auto-spin/auto-pick для MVP.

Готово, когда scripted spin result можно проверить unit/manual без visual scene.

## Фаза 3. Asset ingest validation

Цель: убедиться, что runtime ассеты готовы.

Задачи:

1. Проверить `assets/art/**` и `assets/fonts/**`.
2. Проверить `.meta`, созданные Cocos importer/editor.
3. Подтвердить `.plbx/reference/**` как reference-only.
4. Не включать reference assets в production bundle.

Готово, когда `ASSET_SPEC.md` выполнен для runtime assets.

## Фаза 3.5. Prefab contracts и reusable objects

Цель: создать reusable prefab-слой между raw assets и generated scene.

Задачи:

1. Прочитать `.plbx/game-design/PREFAB_STRATEGY.md`.
2. Создать view contracts/scripts для `SaveTotoBasketView`, `SaveTotoLockView`, `SaveTotoSlotSymbolView`, `SaveTotoCtaButtonView`.
3. Создать prefabs в `assets/prefabs/save-toto/**` через Cocos/editor workflow.
4. Не создавать `.meta` вручную.
5. Проверить, что prefabs не зависят от `.plbx/reference/**`.

Готово, когда scene blueprint может инстанцировать basket/lock/symbol/CTA prefabs.

## Фаза 3.6. AnimationClip contracts и generated `.anim`

Цель: вынести visual tween curves из gameplay-кода в reusable `.anim` clips.

Задачи:

1. Прочитать `.plbx/game-design/ANIMATION_STRATEGY.md`.
2. Создать animation blueprint для UI, basket, lock, fire, packshot и money FX clips.
3. Сгенерировать/создать `.anim` clips через Cocos/editor workflow в `assets/animations/save-toto/**`.
4. Подключить clips к `Animation` components на prefabs.
5. Не создавать `.meta` вручную.

Готово, когда view methods могут запускать clips без hardcoded tween curves в state machine.

## Фаза 4. Scene blueprint под template-compatible hierarchy

Цель: создать data-driven blueprint, совместимый с template core.

Задачи:

1. Перенести layout из `SCENE_SETUP.md` в `scene-blueprint.json` или эквивалент.
2. Включить prefab instances из `PREFAB_STRATEGY.md`.
3. Включить `.anim` clip slots/bindings из `ANIMATION_STRATEGY.md`.
4. Включить template-compatible nodes:
   - `Slot`;
   - `Columns`;
   - `Colimn_1..Colimn_5` или финальные `Column_1..5` с documented mapping;
   - `SpinButton`;
   - `RewardController`;
   - `System/ElementConfiguration`;
   - `System/ForcedSpawnManager`.
5. Включить Save Toto nodes:
   - `ThreatLayer`;
   - `BonusRoot`;
   - `OpenLockFxRoot`;
   - `PackshotRoot`;
   - `EndCardLayer`.
6. Проверить, что blueprint не содержит gameplay logic или hardcoded visual curves.

Готово, когда blueprint может повторно собрать сцену без ручного поиска нод.

## Фаза 5. Автоматическая сборка сцены

Цель: получить визуальную сцену, совместимую с template slot core.

Задачи:

1. Создать Canvas, layers, template slot nodes, Save Toto threat nodes, prefab instances и Animation clip slots.
2. Разместить background, logo, cage, Toto, locks, fire, reel, HUD.
3. Создать 5 reel columns и подключить `SlotColumn`.
4. Создать `BonusRoot` с 6 instances `SaveTotoBasket.prefab`.
5. Создать `EndCardLayer` и `SaveTotoCtaButton.prefab` target.
6. Провести scene graph inspection.

Готово, когда сцена визуально похожа на `.plbx/reference/scene.png` и содержит all template + Save Toto anchors.

## Фаза 6. Wiring и minimal runtime smoke

Цель: связать сцену с template-derived code.

Задачи:

1. Заполнить explicit property references.
2. Настроить `ElementConfiguration` с Save Toto prefabs/symbols.
3. Настроить `ForcedSpawnManager` на scripted spin.
4. Проверить, что `Animation` clips на prefabs запускаются через view methods.
5. Проверить, что `SPIN` запускает движение 5 колонок.
6. Проверить, что `spin-complete` приходит один раз.

Готово, когда template spin работает без bonus/threat progression.

## Фаза 7. SaveToto state machine

Цель: наложить рекламный flow поверх template core.

Задачи:

1. Реализовать `Preload → Intro → SpinReady`.
2. Привязать `tap SPIN` к state machine.
3. На `spin-complete` считать scatter count.
4. При `scatterCount >= 3` запускать bonus.
5. Отключить generic CTA-after-spins поведение template.
6. Убедиться, что `SPIN` появляется/активируется только после intro-анимации.

Готово, когда один spin всегда ведёт в bonus.

## Фаза 8. Bonus picks и unlock sequence

Цель: реализовать 3 выбора корзин.

Задачи:

1. Показать 6 корзин.
2. Принимать taps только по неоткрытым корзинам.
3. Назначать reward по `pickIndex`.
4. Не использовать key flight в MVP.
5. Проигрывать open-lock/remove animation слева направо и снижать огонь.
6. После 3 picks перейти к payout.

Готово, когда 3 любых выбора стабильно освобождают progression.

## Фаза 9. Payout, Toto freed, End-card, adapters

Цель: закрыть рекламный payoff.

Задачи:

1. Не открывать клетку дверцей; запустить transition в packshot.
2. Проиграть happy Toto animation.
3. Докрутить balance/final value; `WIN` оставить фиксированным visual label.
4. Показать end-card и CTA.
5. Использовать `plbx_html_playable`/store adapter pattern из `other-assets`.
6. Отправить `game_end` перед CTA и `download` по click.

Готово, когда playable имеет полный no-fail финал.

## Фаза 10. Polish, audio и adaptive

Цель: усилить UX без изменения core.

Задачи:

1. Добавить SPIN pulse/tutorial fade.
2. Добавить glow/coin/money particles и `.anim` clips; key flights не входят в MVP.
3. Настроить fire transitions.
4. Не подключать reference audio assets; audio hooks оставить на будущие уникальные звуки.
5. Landscape/adaptive вынести после MVP.
6. Остановить tweens/FX при EndCard/store transition.

Готово, когда flow читается без текста и не проседает по FPS.

## Фаза 11. QA и export

Цель: подготовить сборки.

Задачи:

1. Выполнить `QA_CHECKLIST.md`.
2. Выполнить `EXPORT_CHECKLIST.md`.
3. Проверить reference assets не попали в production bundle.
4. Проверить CTA/store routing.
5. Проверить mobile safe areas.

Готово, когда playable проходит network-specific checks.
