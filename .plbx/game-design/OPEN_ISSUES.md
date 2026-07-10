---
document_type: 'open_issues'
project_id: 'WOZ_B1_C3_SaveToto'
language: 'ru'
version: '1.4.1'
status: 'visual_pass_done_pending_runtime_qa'
date: '2026-07-09'
---

# Пробелы логики и неуточнённые моменты `Save Toto`

## 1. Критические вопросы до production-реализации

| ID | Статус | Вопрос | Решение / текущее допущение | Что может измениться |
|---|---|---|---|---|
| `OI-001` | Accepted assumption | Финальный paytable и реальные символы барабанов | Пока используем имеющиеся символы из `assets/art/slot/**`. Если клиент запросит/пришлёт актуальный paytable, обновим symbol mapping. | Client review |
| `OI-002` | Accepted assumption | Призы в 3 выбранных корзинах | Берём стартовые значения из текущего плана: Pick 1 `250k`, Pick 2 `x3`, Pick 3 `1M`, финал `10,000,000`. | Client/performance tuning |
| `OI-003` | Accepted assumption | Точная формула финального WIN | Берём scripted final total по `.plbx/reference/scene.png`, позже сверяем с клиентом. | Client review |
| `OI-004` | Accepted assumption | Store URL и платформенный routing | Добавляем легко заменяемую заглушку `StoreAdapter`/`plbx_html_playable.download()` wrapper. | Реальные store links перед export |
| `OI-005` | Closed for MVP | Политика idle auto-play | Пока не настраиваем auto-spin/auto-pick. Gameplay ждёт пользователя. | Network QA может потребовать auto-flow |
| `OI-006` | Closed for MVP | Должен ли игрок видеть все 6 корзин после выбора 3 | Не выбранные корзины остаются закрытыми. | Можно раскрыть декоративно в polish |
| `OI-007` | Accepted assumption | Финальный текст CTA и end-card | Можно взять CTA-кнопку из reference как визуальный паттерн; делаем базовый overlay с лого + CTA. | Финальный marketing copy |
| `OI-008` | Resolved | Допустимость WOZ/Zynga logo/assets | Это реклама для разработчика/правообладателя Zynga; ассеты частично предоставлены ими. Использование допустимо в рамках проекта. | Legal/client constraints при export |

## 2. Вопросы по сцене и визуалу

| ID | Статус | Вопрос | Решение / текущее допущение | Последствие для разработки |
|---|---|---|---|---|
| `OI-101` | Resolved | Целевая runtime-сцена `1080×1920` или `720×1280` | Настройки сцены поправлены пользователем. Layout docs остаются в design units `1080×1920`, runtime scale-fit по настройкам Cocos. | Scene blueprint не должен хардкодить engine canvas без config |
| `OI-102` | Resolved | Нужно ли pixel-perfect повторять `.plbx/reference/scene.png` | Нет. `scene.png` — только примерное расположение элементов. | Визуальный QA проверяет пропорции, не pixel-perfect |
| `OI-103` | Resolved | Клетка одним слоем или из частей | Клетка одним слоем. Тото и замки имеют вырезы под прутья для имитации объёма. Тото разрезан на слои для анимации. | Не планировать door-layer prefab; anim focus на Toto/locks/packshot |
| `OI-104` | Resolved | Как анимировать открытие клетки без двери | После 3 открытых замков используем staged payoff: `cage-open` state → `toto-full-body` reveal → final end-card. Door-swing не используется. | `playPackshotTransition()` остаётся payoff method, но теперь с отдельными open-cage / freed-Toto стадиями |
| `OI-105` | Closed for MVP | Есть ли отдельный key asset | Пока без ключа и без key flight. Используем анимацию открытого замка. | Использовать `LockUnlockController`/lock animation вместо key flight |
| `OI-106` | Closed for MVP | Есть ли открытое состояние корзины | Нет. Достаточно лёгкой анимации самого basket asset. | Один `Basket.prefab` со state через scale/glow/label, без open sprite |
| `OI-107` | Closed for MVP | Нужен ли отдельный end-card packshot | Начинаем с лого и CTA; packshot overlay базовый. | `EndCardLayer` simple overlay, expandable later |

## 3. Вопросы по логике

| ID | Статус | Вопрос | Решение / текущее допущение | Последствие для разработки |
|---|---|---|---|---|
| `OI-201` | Resolved | Scatter — корзина или Toto-symbol | Scatter будет символ Тото (`assets/art/slot/symbol-toto.png`). | Обновить symbol mapping: `totoId` = scatter id |
| `OI-202` | Resolved | Порядок снятия замков | Слева направо. | `lockOrder = ['left','center','right']` |
| `OI-203` | Resolved | Огонь: 4 отдельных уровня или scale/alpha | Реализовано editor-driven fire loop + runtime level transitions. Старт: `F4`. После первого spin-win (`Oz`) огонь снижается до `F3`. В bonus picks: `F3→F2→F1→F0`. Scale теперь сжимается и по X, и по Y; по Y — только сверху, нижняя кромка огня остаётся на месте. |
| `OI-204` | Resolved | Должен ли balance меняться | Balance увеличивается; в панели есть место под цифры. `WIN` — фиксированный/статичный label. | `BalanceController` animates count; `WinPanel` не главный counter |
| `OI-205` | Resolved | Tap anywhere на end-card или только CTA | Активна только CTA-кнопка. | Whole-screen redirect выключен |
| `OI-206` | Resolved | Можно ли пропускать spin/bonus animations | Анимации не пропускаем. Кнопка `SPIN` появляется/активируется только после окончания intro-анимации. | Strict input lock per state |

## 4. Вопросы по ассетам

| ID | Статус | Не хватает | Решение / текущее допущение | Последствие для разработки |
|---|---|---|---|---|
| `OI-301` | Closed for MVP | Open basket sprite | Не нужен. Корзины открываем/выбираем лёгкой анимацией самого ассета. | `Basket.prefab` без alternate sprite |
| `OI-302` | Closed for MVP | Standalone key sprite | Не нужен. Без пролётов ключей; только animation open lock. | Удалить key-flight из обязательного flow |
| `OI-303` | Partially addressed | Coin/bonus particles | Money sprites перенесены из reference; particles/`.anim`/prefabs нужно создать самим. | Запланировать generated particle/prefab/animation task |
| `OI-304` | Accepted assumption | CTA button | CTA можно взять из reference как визуальный паттерн; production prefab делаем свой. | Не копировать reference assets без решения |
| `OI-305` | Closed for MVP | Door/open cage layer | Door animation не нужна, но отдельный `cage-open` visual state используется в финальном payoff перед reveal Тото. | `cage open.png` подключён как промежуточный staged state |
| `OI-306` | Closed for MVP | Bonus reward labels | Runtime labels на Bodega Sans достаточно. | Reward text в `Basket.prefab`/floating reward |
| `OI-307` | Open later | Sound pack | Звуки должны быть уникальными; пользователь нарежет позже. | Не брать `other-assets` audio assets production |
| `OI-308` | Accepted plan | Автоматическая генерация `.anim` clips | `.anim` удобнее хардкод-твинов для visual motion; генерировать через Cocos/editor workflow, `.meta` вручную не создавать. | Добавить `ANIMATION_STRATEGY.md` и подключать clips к prefabs |

## 5. Вопросы по template/reference migration

| ID | Статус | Вопрос | Решение / текущее допущение | Последствие для разработки |
|---|---|---|---|---|
| `OI-401` | Resolved | Generic class names template или `SaveToto*` | Все имена переименовываем под проект для полноценной поддержки. Можно добавлять комментарии для навигации. | Target module uses `SaveToto*` / namespaced classes |
| `OI-402` | Accepted plan | Как адаптировать `WinChecker` | Берём оптимальный вариант: отдельный `SaveTotoScatterEvaluator` для bonus gate + optional line checker из template для visual wins; свериться с reference при реализации. | Scatter count — основной gate |
| `OI-403` | Accepted plan | Как гарантировать 3 scatter | Доработать template forced result и свериться с reference. | Нужен scripted visible result map, не только line forced rules |
| `OI-404` | Resolved | Брать ли `other-assets` audio system в MVP | Нет. Звуки уникальные, reference audio не копируем. | Audio hooks можно оставить, assets не переносить |
| `OI-405` | Closed for MVP | Брать ли `OrientationController` в MVP | Landscape/adaptive после MVP. | Portrait-first реализация |
| `OI-406` | Resolved | Использовать VFX/prefabs из `other-assets` production | Только reference, не копировать production. | Production VFX генерируем/создаём сами |
| `OI-407` | Resolved | Как отключить template CTA-after-spins | Используем предложенное решение: CTA только после `Payout` через `SaveTotoStateMachine`. | Generic template CTA path disabled |

## 6. Принятые глобальные решения

1. Все результаты spin, picks и payout заранее продуманы/scripted.
2. Flow только win-вариант; fail-финал отсутствует.
3. Template-first + scene-first workflow подтверждён.
4. Explicit wiring обязателен; runtime string lookup запрещён.
5. `.plbx/reference/slot-game/` — logic base, `.plbx/reference/other-assets/` — reference-only.

## 7. Definition of done для закрытия open issues

- `OI-001`–`OI-008`, `OI-101`–`OI-107`, `OI-201`–`OI-206`, `OI-301`–`OI-307`, `OI-401`–`OI-407` отражены в GDD/Architecture/Scene docs.
- Открытыми остаются только вопросы, требующие будущего client/audio/VFX review: финальный paytable, финальные values, particles/`.anim` implementation, sound pack, landscape.
- QA checklist обновлён под принятые решения.
- GDD и scene setup синхронизированы после изменений.

## 8. Статус реализации (фаза code layer + scene blueprint)

### 8.1. Завершено

| Артефакт | Статус |
|---|---|
| Код-слой `assets/scripts/save-toto/**` (foundation: types, config, events, view interfaces) | Done |
| Миграция slot template core под `SaveToto*` (SlotController, SlotColumn, ElementConfiguration, ForcedSpawnManager, WinChecker, RewardController, SpinButtonController, VFXSpawner, CTAScreen, Bootstrap, Animations, ScrollEffects, Elements) | Done |
| SaveToto-specific системы: SaveTotoStateMachine, views (Threat/Slot/Bonus/Hud/EndCard), LockUnlockController, StoreAdapter, AnalyticsAdapter | Done |
| `SaveTotoScatterEvaluator` (primary bonus gate) + cell-based forced rules (scripted 3-scatter) | Done |
| TypeScript-компиляция код-слоя — без ошибок (engine `cc.d.ts` noise игнорируется редактором) | Done |
| `scene-blueprint.json` — data-контракт сцены из `SCENE_SETUP.md` | Done |
| Script-tween animation layer (OI-506a): 6 `SaveToto*Animation` компонентов навешаны на scene-nodes; reel mask + column-move-effect; bonus/cta lifecycle-фиксы | Done |

### 8.2. Принятые архитектурные решения в реализации

- `SaveTotoSpinButtonController` — **input-only**: эмитит `EVT_SPIN_CLICK`, НЕ драйвит slot и НЕ списывает спины. State machine оркестрирует spin через `SlotController.startAllColumnsMovement()` (соответствие `ARCHITECTURE.md` §12 mermaid). Input lock — через выключение кнопки state machine'ом.
- Scripted spin гарантируется `SaveTotoForcedSpawnManager` с **cell-based правилами** (`ISaveTotoForcedCellRule`), построенными в `SaveTotoBootstrap.initForcedScriptedResult()` из `config.reel.scriptedResult` (OI-403: scripted visible result map, не только line forced rules).
- Scatter — основной gate (`SaveTotoScatterEvaluator`, символ Тото, OI-201). Line wins вторичны (`SaveTotoWinChecker`, 5-col).
- Generic CTA-after-spins **отключён** (OI-407): `SaveTotoBootstrap` не показывает CTA; CTA показывается только `SaveTotoStateMachine` после `Payout`.
- `WIN` — фиксированный visual label (OI-204); balance — главный counter (`SaveTotoSlotView.countBalanceTo`).
- Все string-lookup `'SlotElement'` заменены на типизированный `getComponent(SaveTotoSlotElement)`.

### 8.3. Открытые задачи (editor-side, требуют Cocos Creator)

| ID | Статус | Задача |
|---|---|---|
| `OI-501` | Done | Импорт `assets/scripts/save-toto/**` в Cocos — `.ts.meta` сгенерированы (51 файл). |
| `OI-502` | Done | Создание 5 symbol-prefabs `assets/prefabs/save-toto/slot/SaveTotoSymbol{Oz,Key,Drop,Basket,Toto}.prefab` через `tools/build-scene.mjs`. Требуется Cocos refresh для генерации `.prefab.meta` (UUID). |
| `OI-503` | Done | Сборка `assets/scene.scene` по blueprint: 6 layers, threat (cage/toto/3 locks/fire/light), slot (5 SaveTotoSlotColumn + SaveTotoSlotController), bonus (6 BasketView+Button+Glow+RewardLabel), hud, fx, endcard, System nodes. 86 узлов, 19 custom-скриптов. |
| `OI-504` | Done (partial) | Explicit wiring выполнен в `tools/build-scene.mjs`: Bootstrap→StateMachine/Slot/Spins/Reward/ElementConfig/ForcedMgr/CTAScreen; StateMachine→все views/ctaButton; SlotController.columns[5]; ThreatView.fireNode/lockViews[3]/cage/toto/light; BonusView.basketViews[6]; BasketView.basketButton/rewardLabel/glow; SlotView/HudView/EndCardView refs. НЕ завязано: ElementConfiguration prefab-ссылки (OI-505), CTAScreen.rewardAmount (опционально). |
| `OI-505` | Pending (auto) | `ElementConfiguration` prefab-wiring: build-скрипт двухпроходный — после Cocos refresh (импорт prefabs → `.prefab.meta`) повторный запуск `node tools/build-scene.mjs` автоматически заполнит elementTypes (Oz/Key/Drop/Basket) + bonusElementTypes (Toto scatter). |
| `OI-506` | Done (partial) | Animation automation: idle + event-driven `SaveToto*Animation` script-компоненты (AutoPulse/AutoFloat/BasketSelected/LockOpenRemove/PackshotIntro/CtaPulse) навешаны на scene-nodes через `tools/attach-*.mjs`. View-layer использует pattern «component-if-present → fallback tween». НЕ настоящие `.anim` `AnimationClip` assets — миграция в OI-506b. |
| `OI-506a` | Done | Script-tween animation layer: 6 `SaveToto*Animation` компонентов (idle pulse/float + event-driven selection/lock-open/packshot/cta-pulse) реализованы как `tween()` обёртки и привязаны к scene-nodes. `tools/attach-idle-components.mjs`, `tools/attach-phase2-animations.mjs`, `tools/attach-endcard-cta-pulse.mjs`, `tools/attach-column-move-effect.mjs`. |
| `OI-506b` | Pending | `.anim` `AnimationClip` migration: генерация настоящих `assets/animations/save-toto/**/*.anim` assets + `.anim.meta` (Cocos editor workflow), перенос tween-кривых из script-компонентов в clips, `Animation` component на prefabs, view-methods вызывают `Animation.play()` вместо script-tween. Контракт — `ANIMATION_STRATEGY.md` §4–§5. |
| `OI-507` | Open | Visual QA против `.plbx/reference/scene.png` после reload сцены в Cocos; сверка layout из SCENE_SETUP.md §5. |
| `OI-508` | Open | Runtime-проверка scripted flow: spin → 3 scatter → bonus → 3 picks → 3 open locks → cage-open → Toto full-body → end-card → CTA → store redirect. |
| `OI-509` | Resolved | Блокер: бонус не появлялся после спина (3 scatter scale-анимация, далее пусто). Причина: `SaveTotoBonusView.onLoad()` вызывал `hideImmediate()` → `bonusRoot.active=false`, а `BonusRoot` стартует неактивным → `onLoad` выполняется впервые при `showBaskets()`, сразу деактивируя ноду обратно. Тот же lifecycle-баг в `SaveTotoEndCardView`. Фикс: убран авто-вызов `hideImmediate()` из `onLoad` обоих views (начальное состояние видимости — ответственность сцены). |
| `OI-510` | Resolved | `SaveTotoSlotView.winLabel` был `null` — `WinPanel` пустой (нет Label-ребёнка). WIN-панель не показывала джекпот. Фикс: `tools/patch-win-label.mjs` добавил `WinValueLabel` (Label «10,000,000», Bodega) под `WinPanel` и привязал к `winLabel`. (OI-204: WIN — fixed visual label.) |
| `OI-511` | Resolved | BalanceLabel стартовал со `startingBalance` (555000). Теперь стартует пустым (0) и наполняется суммой из каждой выбранной корзины (credit rewards) через `SaveTotoSlotView.addBalanceValue()` (короткий count-up). MULTIPLIER-rewards (x3) баланс не меняют. Финальный payout считает до `finalWinValue`. |
| `OI-512` | Resolved | Reels не убирались, а перекрывались baskets; бонус не имел overlay. Теперь reels НЕ скрываются — `SaveTotoBonusView.showBaskets()` показывает градиентный `BonusDimmer` (программно-сгенерированная vertical-gradient texture: transparent→dark→transparent), закрывающий reels до верхней границы перед огнём/панелью. Baskets — нижняя треть экрана. |
| `OI-513` | Resolved | Scatter-highlight: 1× pulse → 3× scale blink + light-вспышка под Toto (`Light` child в Toto prefab, opacity blink 3 волны). |
| `OI-514` | Resolved | Fire: был static на level-transition. Теперь `SaveTotoFireAnimation` — постоянный idle pulse (height + opacity flicker) + level transitions меняют только height (scale.y) и intensity (opacity), width неизменен. Level 0 = потух. |
| `OI-515` | Resolved | Key flight: ключ (symbol-key SpriteFrame) вылетает из позиции корзины к замку, замок scale-up + swap на `open-lock.png` sprite, ключ исчезает. `SaveTotoLockView.playUnlockFrom(worldPos)`. Open-lock остаётся видимым. |
| `OI-516` | Resolved | Packshot (5-stage): `SaveTotoThreatView.playPackshotTransition()` — Stage 0: cage anticipation tremble (squash/stretch 0.25s); Stage 1+2 overlap: fire+locks fade (0.35s, sineIn, locks drift up +15) overlapped с cage swap (начинает через +0.12s); Stage 2: cage closed→open + toto-body→`HappyTotoAnimatedSprite` swap (backOut scale pop: cage 0.88→1.0 за 0.34s, Toto 0.82→1.0 за 0.38s). Existing `happy-toto-loop-animation` node is reparented from EndCard to `CageSwingRoot`, started via explicit `Animation.play()` from `SaveTotoThreatView.playTotoFreedAnimation()` after the freed visual activates (NOT `Animation.playOnLoad` — see OI-522), then receives Stage 2.5 joy bounce (hop y+18 + scale 1.08→1.0, backOut, 0.36s). Stage 3: open cage drift-up fade (y+25, scale 1.06, 0.32s sineIn); Stage 4: Toto float-away fade (y+55, scale 1.03, 0.4s sineIn) + cageRoot fade. End-card uses static `toto-full-body` and transform-only scale-bounce. |
| `OI-517` | Resolved | WinPanel: добавлен `Light` child с `SaveTotoCircularLightAnimation` (бесконечное круговое вращение light.png позади панели). |
| `OI-518` | Resolved | Basket glow усилен: двух-волна scale + долгий hold glow + масштаб glow (1.35×). Более сочная/интенсивная selection-анимация. |
| `OI-519` | Resolved | Перевести raw `setTimeout` gameplay-задержки (state machine intro/spin-3/simple-win паузы, ThreatView lock-tutorial, LockView tutorial delay) на tween-delay с `node.isValid` guard. Заменено на `delaySeconds()` helper (tween на `this.node`), синхронный с Cocos timeScale/pause, авто-отмена при уничтожении. См. `DEBUG_AUDIT.md` DA-005. |
| `OI-520` | Resolved (partial) | Runtime `getChildByName`/`getComponentsInChildren` заменены на кэш: `StateMachine.cachedCircularLights` (init), `ThreatView.cageSwingRoot` (onLoad), `SlotView.scatterLightCache` (Map). Полный перенос на `@property` требует editor re-wiring — оставлено как кэш-on-load. См. `DEBUG_AUDIT.md` DA-006. |
| `OI-521` | Resolved | Гасить `this.enabled` у `SaveTotoSlotColumn` (idle → false, `startColumnMovement` → true) и `SaveTotoFireAnimation` (level 0 / pause → false, resume/setLevel>0 → true). Убирает 6 пустых `update()` вызовов/кадр на idle. См. `DEBUG_AUDIT.md` DA-007. |
| `OI-522` | Resolved | Краш превью `Cannot read properties of undefined (reading '0')` (поток) при переходе в финал. Причина: `HappyTotoAnimatedSprite` (sprite-frame loop clip на `cc.ObjectCurve`) запускался через `Animation.playOnLoad=true` при первой активации ноды mid-game в packshot — автоплей сэмплировал клип в `onLoad` до готовности SpriteFrame-биндинга, и `Sprite` с `sizeMode=SIZE_TRIMMED` читал trim/texture несэмпленного кадра каждый кадр. Фикс: `playOnLoad=false` + явный `Animation.play(defaultClip)` из `SaveTotoThreatView.playTotoFreedAnimation()` после активации ноды (рабочий паттерн, зеркалит endcard). Дискриминатор: `FireAnimatedSprite` (тот же clip-формат, но `sizeMode=UNIFIED`) не падал. Если краш вернётся — `happy-toto-loop-animation.anim` (JSON-авторский `cc.ObjectCurve._values`) пересоздать в Cocos-редакторе (подтверждённый фикс того же `undefined[0]` в прошлой сессии). |

### 8.4. Замечание по сцене

Сборка `.scene`/`.prefab` с привязкой SpriteFrame/script UUID требует Cocos-редактора (`OI-501`): UUID скриптов и спрайтов генерируются импортёром, ручное создание `.meta` запрещено (`AGENTS.md` §3). `scene-blueprint.json` — source-of-truth для editor script / ручной сборки; Visual QA и explicit wiring — задачи `OI-504`/`OI-507`.
