---
document_type: 'debug_audit'
project_id: 'WOZ_B1_C3_SaveToto'
language: 'ru'
version: '1.2.0'
status: 'audit_pass_3_da017_fixed'
date: '2026-07-09'
---

# Debug Audit — регрессии, bottleneck'ы и перфоманс

Проход по код-слою `assets/scripts/save-toto/**`. Сфокусировано на регрессиях
flow, утечках циклов/твинов и лишних re-render'ах. Источник истины — код;
поведение сверялось с `ARCHITECTURE.md` и `OPEN_ISSUES.md`.

Легенда серьёзности: **C** critical (краш/расхождение flow/серьёзный перф),
**H** high, **M** medium, **L** low.

## 1. Критические находки (исправлены в этом проходе)

### DA-001 (C) — `requestAnimationFrame`-циклы для счёта баланса

**Файл:** `views/SaveTotoSlotView.ts` (`addBalanceValue`, `multiplyBalanceValue`,
`countBalanceTo`).

**Проблема:** Подсчёт баланса реализован через браузерный `requestAnimationFrame`,
а не через `tween`/`update` движка Cocos.

- Не синхронизирован с кадровым циклом Cocos (движок может ставить RAF на паузу
  при сворачивании, но логика состояния уходит «вчерашней»).
- Несколько RAF-циклов могут стекаться: `addBalanceValue` вызывается в каждом
  из 3 basket-pick'ов и в `playSimpleWin` (спины 1–2). Если прошлый цикл не
  успел завершиться, новый бежит параллельно и оба пишут в один `Label.string`.
- Нет отмены при уничтожении ноды/Label: тик продолжает писать
  `this.balanceLabel.string = ...` в уничтоженный компонент → runtime-ошибки.

**Фикс:** Переведено на `tween` по proxy-объекту с `onUpdate` + guard
`this.balanceLabel?.isValid`. Отмена через `Tween.stopAllByTarget(proxy)`.

### DA-002 (C) — CoinFountain: per-coin RAF + захардкоженный `dt = 1/60`

**Файл:** `animations/SaveTotoCoinFountain.ts` (`spawnCoin`).

**Проблема:** Каждая монета запускает собственный `requestAnimationFrame(tick)`
с `const dt = 1 / 60`. За фонтан (`durationSeconds=2.8`, `spawnInterval=0.08`,
`coinsPerBurst=3`) спавнится ~100 монет = ~100 параллельных RAF-циклов.

- На 120 Гц дисплеях физика летит в 2× быстрее (dt захардкожен 1/60).
- RAF не отменяется при `stop()`/`onDisable()` — монеты продолжают тикать после
  выключения фонтана, лишь сами себя убивают по `coin.isValid`.
- Много мелких JS-замыканий и обращений к `node.setPosition` вне основного
  цикла движка → фрагментация帧 и jitter.

**Фикс:** Монеты хранятся в массиве состояний; вся физика/фейдобновление
перенесены в `update(dt)` компонента (один цикл на все монеты, dt из движка).

### DA-003 (C) — `SlotController.onSpinComplete` без re-entry guard

**Файл:** `Slot/SaveTotoSlotController.ts` (`checkSpinCompletion` →
`onSpinComplete`).

**Проблема:** `checkSpinCompletion` привязан к `COLUMN_MOVEMENT_COMPLETE` каждой
колонки (5 подписок). Когда все колонки останавливаются, `onSpinComplete()` emit'ит
`SPIN_COMPLETE` и делает `currentSpinIndex += 1`. Повторный вызов
`checkSpinCompletion` (например, из `stopAllColumns()` или дублирующий event
колонки) запустит `onSpinComplete` снова → двойной emit + двойной инкремент
`currentSpinIndex` → scripted spin-нумерация уезжает, forced-правила применяются
не к тем спинам. State machine слушает через `.once`, поэтому второй emit
игнорируется, но инкремент уже испорчен.

**Фикс:** Добавлен флаг `spinCompletionPending`, сбрасываемый в
`startAllColumnsMovement`. `checkSpinCompletion` игнорирует повторные срабатывания,
пока активен guard.

## 2. Высокий приоритет (частично исправлено / помечено)

### DA-004 (H) — `WinAnimationManager.scheduleAnimations`: raw `setTimeout`

**Файл:** `Slot/managers/SaveTotoWinAnimationManager.ts` (стр. 61).

`setTimeout(() => this.startAnimations(animations), globalDelay*1000)` не
отменяется при `stopAllAnimations()`. Если win-анимации остановлены до истечения
delay, `startAnimations` всё равно стартует твинов после. Guard добавлен
(фильтрация «протухших» отложенных батчей через token).

### DA-005 (H) — gameplay-задержки на raw `setTimeout`

**Файлы:**
- `controllers/SaveTotoStateMachine.ts:156,313,360` (intro remaining, spin-3
  пустая пауза, simple-win пауза)
- `views/SaveTotoThreatView.ts:125` (пауза между lock-tutorial hints)
- `views/SaveTotoLockView.ts:97` (delay перед tutorial highlight)

**Проблема:** `setTimeout` не учитывает Cocos `timeScale`/pause и не отменяется
при `onDestroy`/`onDisable`. При выходе со сцены таймеры додумывают задержку и
могут дернуть методы на невалидных нодах.

**Фикс:** переведено на `delaySeconds()` helper (`tween(this.node).delay(sec).call()`
с `isValid` guard). Синхронно с Cocos timeScale/pause, твин на `this.node`
авто-останавливается при уничтожении. Мгновенный resolve если нода невалидна.

### DA-006 (H) — runtime `getChildByName`/`getComponentsInChildren`

**Файлы:**
- `controllers/SaveTotoStateMachine.ts:195` —
  `getComponentsInChildren(SaveTotoCircularLightAnimation)` в
  `setIntroAmbientFxPaused`.
- `views/SaveTotoSlotView.ts:104` — `node.getChildByName('Light')` в
  `blinkScatter`.
- `views/SaveTotoThreatView.ts:145` — `getChildByName('CageSwingRoot')` в
  `playPackshotTransition`.

**Проблема:** Нарушает дух AGENTS.md §3 (no runtime string lookup). `getComponentsInChildren`
на `slotView.node` обходил всё поддерево (5 колонок с элементами).

**Фикс (partial):** кэш вместо `@property` (полный перенос на serialized refs
требует editor re-wiring):
- `StateMachine`: `cachedCircularLights[]` заполняется один раз в `init()`.
- `ThreatView`: `cageSwingRoot` кэшируется в `onLoad()`.
- `SlotView`: `scatterLightCache: Map<Node, Node|null>` (элементы динамические).

## 3. Перфоманс / лишние re-render'ы

### DA-007 (M) — idle `update()` на 5 колонках и Fire

`SaveTotoSlotColumn.update(dt)` вызывал `columnMover.update(dt)` каждый кадр,
даже когда колонка не крутилась (ранний `if (!this.isMoving)` в ColumnMover).
`SaveTotoFireAnimation.update(dt)` тоже бежал всегда (ранний return по
`paused`/`!sequenceReady`). На 5 колонках + fire это 6 пустых вызовов/кадр.

**Фикс:**
- `SlotColumn`: `enabled = false` в `initWithConfiguration` и в `update()` при
  not-moving; `enabled = true` в `startColumnMovement()`.
- `FireAnimation`: `enabled = false` при `setLevel(0)`/`pauseAnimation()`;
  `enabled = true` при `resumeAnimation()`/`setLevel(>0)`. Idle tween (`tween()`)
  не зависит от `enabled` — пульсация продолжается.

### DA-008 (M) — `SlotView.blinkScatter`/`pulseWinElement`: незачищаемые `setTimeout`

`setTimeout(finish, 2500)` / `setTimeout(finish, 1500)` — таймаут-защита от
зависшего твина. `done`-flag предотвращал двойной resolve, но сам таймер не
очищался после `.call(finish)` твина. Маленький leak (до 2.5 c).

**Фикс:** `clearTimeout` в `finish` после срабатывания твина (или таймаута).

### DA-009 (M) — `HudView.pulseCta` — мёртвый код

`HudView.pulseCta()` не вызывался ниоткуда (CTA-pulse запускается через
`EndCardView.playCtaPulse`). Дублирующий tween-fallback без `Tween.stopAllByTarget`
— если бы вызвали, бесконечный tween нельзя было остановить через `stop()`.

**Фикс:** метод удалён; неиспользуемые импорты (`tween`, `Vec3`,
`SaveTotoCtaPulseAnimation`) убраны. CTA-pulse идёт единообразно через
`SaveTotoCtaPulseAnimation`.

### DA-010 (L) — `HudView.onLoad` показывает SPIN до state machine

`HudView.onLoad` → `showSpinButton(true)`, затем `Bootstrap` через
`scheduleOnce(...,0)` вызывает `startFlow` → `enterIntro` → `showSpinButton(false)`.
Один кадр SPIN виден/интерактивен до intro.

**Фикс:** `onLoad` теперь стартует SPIN скрытым (`showSpinButton(false)`); state
machine показывает кнопку в `enterSpinReady`.

### DA-011 (L) — `BonusView.hideBaskets` переactivates через `stop()`

`CoinFountain.onDisable` → `stop()` → `node.active = false` во время уже
идущего disable. Безопасно, но избыточно. (Уже учтено в рефакторе DA-002.)

## 4. Подтверждённые корректные паттерны

- `SaveTotoAutoPulse`/`SaveTotoAutoFloat`/`SaveTotoCircularLightAnimation`:
  корректный `onEnable`/`onDisable`/`onDestroy` lifecycle, `Tween.stopAllByTarget`
  в stop. Re-render-безопасны.
- `SaveTotoSpinButtonController`: input-only, click listener снят в `onDestroy`.
- `SaveTotoAnalyticsAdapter`: `sendOnce` через Set, non-blocking try/catch.
- State machine: input lock через state-check + `showSpinButton(false)`; basket
  handlers перепривязываются через `unwireBasketInputs` → `wireBasketInputs`.
- `SaveTotoForcedSpawnManager`: cell-based rules применяются детерминированно;
  `breakUnwantedWinLines` имеет `maxIterations` guard (нет бесконечного цикла).

## 6. Аудит-проход 3 — новые находки (DA-012…DA-017)

Дата: 2026-07-09. Полное чтение исходников, инспекция сцены (scene serialization,
node graph, component props), grep-трассировка CTA-flow.

### DA-017 (C) — PlayNowButton `_interactable: false`: CTA redirect сломан

**Файл:** `controllers/SaveTotoStateMachine.ts` (`enterEndCard`, `cleanupInputBindings`).
**Сцена:** `Canvas/EndCardLayer/PlayNowButton #284` — Button `_interactable: false`.

**Проблема:** Сцена сериализует `_interactable: false` на PlayNowButton (EndCardLayer).
`enterEndCard()` вешает `ctaButton.node.on(Button.EventType.CLICK, this.onCtaClick, this)`,
но **никогда не устанавливает `ctaButton.interactable = true`**. Cocos `Button` не эмитит
`CLICK` при `interactable = false` (`_onTouchEnd` делает ранний return) → `onCtaClick`
→ `store.redirect()` **никогда не вызывается**. Конверсионная воронка мертва.

`HudView.ctaButton` — отдельная кнопка в HUD-слое (управляется `showCtaButton`), НЕ
PlayNowButton из EndCardLayer. `enterEndCard` вызывает `hudView.showCtaButton(false)` —
это скрывает HUD-кнопку, а не включает endcard-кнопку.

**Фикс:** В `enterEndCard` после wiring click-handler добавлено `this.ctaButton.interactable = true`.
В `cleanupInputBindings` добавлено `this.ctaButton.interactable = false` для
restart/teardown-безопасности. Сценическое `_interactable: false` оставлено как
разумный default (кнопка disabled до показа endcard).

### DA-012 (M) — RewardController — мёртвый код

**Файл:** `controllers/SaveTotoRewardController.ts`.

**Проблема:** RewardController wired в сцене (StateMachine @property) и в Bootstrap
(@property + `setDependencies`). `start()` подписывается на `WIN_DETECTED` →
`onWinDetected` → `addReward(totalWinValue)`. Но:

- StateMachine (690 строк) **ни разу** не ссылается на `this.rewardController`.
- Endcard берёт финальный выигрыш из `slotView.getBalanceValue()` (line 623), не из
  RewardController.
- `showCTAScreen()`, `updateCTAScreen()`, `getCurrentReward()` — **никогда не вызываются**.
- Накопленный `currentValue` уходит в чёрную дыру.
- Двойная бухгалтерия: StateMachine ведёт баланс через `slotView.addBalanceValue`/
  `multiplyBalanceValue` (basket picks), а RewardController отдельно аккумулирует
  `WIN_DETECTED totalWinValue` (line wins из SlotController).

**Статус:** Не критично (dead code не ломает flow), но:
1. Двойная бухгалтерия confusing для следующих разработчиков.
2. `onWinDetected` создаёт event-listener без видимого эффекта.
3. Рекомендация: либо удалить RewardController, либо интегрировать в flow (заменить
   `slotView.getBalanceValue()` на `rewardController.getCurrentReward()` и убрать
   дублирующий `slotView.addBalanceValue`).

### DA-013 (M) — CoinFountain `durationSeconds=30` в сцене, без pooling

**Файл:** `animations/SaveTotoCoinFountain.ts`; сцена: `EndFountain` node.
**Сериализация:** `durationSeconds=30` (не 2.8 default из кода).

**Проблема:** При `spawnInterval=0.08`, `coinsPerBurst=3` → ~37.5 монет/сек × 30 сек
= ~1125 монет за lifetime. Каждая монета: `new Node` + Sprite + UITransform + UIOpacity,
без pooling. Steady-state: ~94 alive coins одновременно. GC-pressure от node
creation/destruction во время endcard (conversion-critical moment).

**Статус:** Не критично (DA-002 fix уже устранил per-coin RAF; физика теперь в
`update(dt)` компонента), но:
1. Node pooling убрал бы ~1125 alloc/destroy cycles.
2. `durationSeconds=30` в сцене выглядит как editor-ошибка (default 2.8); стоит
   уточнить намерение (длинный фонтан для endcard или случайно сохранённое значение?).

### DA-014 (L) — SlotController нет `onDestroy`

**Файл:** `Slot/SaveTotoSlotController.ts` (341 строка, полностью прочитан).

**Проблема:** Нет `onDestroy`. 5 подписок `COLUMN_MOVEMENT_COMPLETE` на column nodes
никогда не off'd. `centralizedSpawner` (SaveTotoCentralizedElementSpawner) не имеет
destroy/cleanup метода.

**Статус:** Низкий риск — Cocos scene teardown уничтожает ноды и GC'ит listeners.
Но не чисто. Рекомендация: добавить `onDestroy()` с off для column listeners.

### DA-015 (L) — `delaySeconds` promise hang on destroy

**Файл:** `controllers/SaveTotoStateMachine.ts` (`delaySeconds`, line 174-186).

**Проблема:** `tween(this.node).delay(seconds).call(finish).start()`. При уничтожении
ноды Cocos авто-останавливает твин → `finish` не вызывается → Promise не resolves.
Любой `await this.delaySeconds(...)` в async-методе, который in-flight при teardown,
зависнет навсегда.

**Статус:** Только при teardown — нет gameplay-воздействия. `isValid`-guards дальше
в цепочке предотвращают крэши. Promise-leak минорный (ноды уже уничтожены).

### DA-016 (L) — WinAnimationManager raw `setTimeout` not cleared on destroy

**Файл:** `Slot/managers/SaveTotoWinAnimationManager.ts` (`scheduleAnimations`, line 62-75).

**Проблема:** `setTimeout(() => { if (token !== this.scheduleToken) return;
this.startAnimations(animations); }, globalDelay*1000)`. Token-guard покрывает
`stopAllAnimations()` (DA-004 fix), но:
1. `setTimeout` не очищается через `clearTimeout` при destroy.
2. `WinAnimationManager` — plain-класс (не Component), нет lifecycle.
3. При destroy сцены с pending setTimeout → `startAnimations` дернёт destroyed nodes.

**Статус:** Dormant по default (`globalDelay=0.0` в `SaveTotoWinAnimationConfiguration`).
Reachable только если editor ставит `globalDelay > 0`. Только при teardown.

### DA-018 (C) — SpriteFrame UUID без `@subId`: краш `Simple.updateUVs`

**Файл:** `assets/scene.scene` — `EndTotoRoot.cc.Sprite._spriteFrame`.

**Симптом:** Превью падает при переходе в финал (после 3 picks) с потоком одинаковых ошибок:
```
TypeError: Cannot read properties of undefined (reading '0')
  at Simple.updateUVs (engine:281367)
  at Simple.updateRenderData (engine:281230)
  at Sprite.updateRenderer (engine:115376)
  at UIRendererManager.updateAllDirtyRenderners (engine:115067)
  at Director.tick (engine:25992)
```

**Причина:** При переносе `toto-full-body.png` на `EndTotoRoot.Sprite._spriteFrame`
UUID получил главный идентификатор ассета БЕЗ суффикса sub-asset:

- ❌ `"__uuid__": "08ccdbe1-14dd-4f2e-9f0c-5d3be85734dd"` (ImageAsset, главный)
- ❌ `"__expectedType__": "cc.ImageAsset"`

вместо правильного:

- ✅ `"__uuid__": "08ccdbe1-14dd-4f2e-9f0c-5d3be85734dd@f9941"` (SpriteFrame sub-asset)
- ✅ `"__expectedType__": "cc.SpriteFrame"`

Cocos резолвит UUID без `@subId` как **главный ассет** (ImageAsset/Texture),
а не как SpriteFrame sub-asset. У ImageAsset нет свойства `.uv` →
`sprite.spriteFrame.uv` = `undefined` → `uv[0]` крашит каждый кадр рендера.

Engine-код `Simple.updateUVs`:
```js
if (!sprite.spriteFrame || !renderData) return;   // guard проходит (spriteFrame ≠ null)
var uv = sprite.spriteFrame.uv;                    // uv = undefined (ImageAsset, не SpriteFrame)
vData[uvOffset] = uv[index];                       // undefined[0] → TypeError
```

**Дискриминатор / почему краш только в финале:**
`EndCardLayer` (где живёт `EndTotoRoot`) стартует `active=false` и активируется
только в `endCardView.show()` — последнем шаге `enterPayout()`. До этого
битый spriteFrame не рендерится. Логи:
```
[SaveTotoStateMachine] enterPayout start
... playPackshotTransition done
... hideGameplayLayers done
... enterPayout visuals hidden. finalWin=2140000
→ EndCardLayer.active = true → первый рендер-кадр → краш
```

**Фикс:** `cocos_apply_edits` → `set_asset_ref` с полным UUID включая `@f9941`:
```
asset: "08ccdbe1-14dd-4f2e-9f0c-5d3be85734dd@f9941"
expectedType: "cc.SpriteFrame"
```

**Как предотвать в будущем:**

1. **Всегда указывай `@subId` для SpriteFrame ссылок.** Cocos image assets
   имеют несколько sub-assets:
   - `@6c48a` — texture
   - `@f9941` — spriteFrame (тот, что нужен для `cc.Sprite._spriteFrame`)

   UUID главного ассета (без `@subId`) резолвится как ImageAsset, который
   **не имеет** `.uv`, `.vertices`, `.rect` и других SpriteFrame-свойств.

2. **Проверяй `__expectedType__`.** Если после `set_asset_ref` в сцене
   появляется `"__expectedType__": "cc.ImageAsset"` вместо `"cc.SpriteFrame"` —
   это признак битой ссылки. Валидатор сцены это не ловит (UUID существует,
   тип валиден), но runtime падает.

3. **Регресс-проверка после переносов нод.** При переносе/переименовании нод
   с Sprite-компонентами всегда сверяй, что `_spriteFrame` UUID оканчивается
   на `@f9941` (или другой sub-asset id), а не на главный UUID ассета.

4. **Стек-маркер для диагностики:** краш `Simple.updateUVs → undefined[0]`
   = 99% probability битый/несэмпленный SpriteFrame. Проверяй все активные
   Sprite-компоненты на наличие валидного SpriteFrame с `.uv`.

**Статус:** Fixed (OI-522).

## 7. Исправлено в этом проходе (сводка)

| ID | Файл | Изменение |
|---|---|---|
| DA-001 | `views/SaveTotoSlotView.ts` | balance counting: RAF → `tween` proxy + `isValid` guard + отмена предыдущего tween |
| DA-002 | `animations/SaveTotoCoinFountain.ts` | монеты в массиве, физика в `update(dt)`, dt из движка, чистый `stop()` |
| DA-003 | `Slot/SaveTotoSlotController.ts` | `spinCompletionPending` guard против повторного `onSpinComplete` |
| DA-004 | `Slot/managers/SaveTotoWinAnimationManager.ts` | token-guard отложенных win-анимаций против `stopAllAnimations` |
| DA-005 | `controllers/SaveTotoStateMachine.ts`, `views/SaveTotoThreatView.ts`, `views/SaveTotoLockView.ts` | raw `setTimeout` → `delaySeconds()` helper (tween-delay, синхронный с timeScale, `isValid` guard) |
| DA-006 | `controllers/SaveTotoStateMachine.ts`, `views/SaveTotoThreatView.ts`, `views/SaveTotoSlotView.ts` | runtime lookups → кэш (`cachedCircularLights`, `cageSwingRoot`, `scatterLightCache`) |
| DA-007 | `Slot/SaveTotoSlotColumn.ts`, `animations/SaveTotoFireAnimation.ts` | idle `enabled=false`: колонки + fire не дёргают пустой `update()` на idle |
| DA-008 | `views/SaveTotoSlotView.ts` | `clearTimeout` таймаут-защиты в `blinkScatter`/`pulseWinElement` после завершения твина |
| DA-009 | `views/SaveTotoHudView.ts` | удалён мёртвый `pulseCta()` + неиспользуемые импорты |
| DA-010 | `views/SaveTotoHudView.ts` | `onLoad` стартует SPIN скрытым (до `enterSpinReady`) |
| DA-017 | `controllers/SaveTotoStateMachine.ts` | `ctaButton.interactable = true` в `enterEndCard`; `false` в `cleanupInputBindings` — CTA redirect восстановлен |
| DA-018 | `assets/scene.scene` | `EndTotoRoot.Sprite._spriteFrame` UUID `08ccdbe1...` → `08ccdbe1...@f9941` + `expectedType: cc.SpriteFrame` |

## 8. Открытые задачи

DA-001…DA-011, DA-017, DA-018 закрыты. OI-519/520/521/522 отмечены как Resolved
(520 — partial: кэш вместо `@property`; полный перенос требует editor re-wiring).

**Открыты (не критичны, рекомендуются для следующего спринта):**

- **DA-012 (M):** RewardController — dead code. Решение: удалить или интегрировать в
  flow (заменить `slotView.getBalanceValue()` на `rewardController.getCurrentReward()` и
  убрать дублирующий `slotView.addBalanceValue`). Требует решения в `OPEN_ISSUES.md`.
- **DA-013 (M):** CoinFountain `durationSeconds=30` — уточнить намерение (editor-ошибка
  vs intentionally long). Добавить node-pooling если фонтан действительно 30 сек.
- **DA-014 (L):** SlotController — добавить `onDestroy()` с off для column listeners.
- **DA-015 (L):** `delaySeconds` — Promise hang при teardown. Минорный (ноды уничтожены).
- **DA-016 (L):** WinAnimationManager — `clearTimeout` на destroy. Dormant по default.

Дальнейший QA — рантайм-проверка полного flow (OI-508) после reload сцены в Cocos,
особенно CTA-click → store redirect после DA-017 fix.
