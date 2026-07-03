---
document_type: 'debug_audit'
project_id: 'WOZ_B1_C3_SaveToto'
language: 'ru'
version: '1.0.0'
status: 'audit_pass_1_critical_fixed'
date: '2026-07-03'
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

**Рекомендация:** перевести на `this.scheduleOnce(cb, sec)` (Component) или
`tween(...).delay(sec).call(cb).start()` с guard `this.node?.isValid`.
State machine — Component, у него есть `scheduleOnce`.

**Статус:** помечено в OPEN_ISSUES как OI-519; фиксы в этом проходе не делались,
чтобы не расширять scope (требует аккуратной переработки async-цепочек).

### DA-006 (H) — runtime `getChildByName`/`getComponentsInChildren`

**Файлы:**
- `controllers/SaveTotoStateMachine.ts:195` —
  `getComponentsInChildren(SaveTotoCircularLightAnimation)` в
  `setIntroAmbientFxPaused`. Дерево-обход при каждой паузе/возобновлении
  intro-FX.
- `views/SaveTotoSlotView.ts:104` — `node.getChildByName('Light')` в
  `blinkScatter`. Строковый lookup дочернего узла.
- `views/SaveTotoThreatView.ts:145` — `getChildByName('CageSwingRoot')` в
  `playPackshotTransition`.

**Проблема:** Нарушает дух AGENTS.md §3 (no runtime string lookup). Для view-FX
менее критично, чем для gameplay wiring, но `getComponentsInChildren` на
`slotView.node` обходит всё поддерево (включая 5 колонок с элементами) — заметно
на тяжёлой сцене.

**Рекомендация:** кэшировать ссылки на circular-light компоненты в `init`,
`CageSwingRoot`/`Light` вынести в `@property`.

**Статус:** помечено OI-520; не фиксировалось (требует editor re-wiring).

## 3. Перфоманс / лишние re-render'ы

### DA-007 (M) — idle `update()` на 5 колонках и Fire

`SaveTotoSlotColumn.update(dt)` вызывает `columnMover.update(dt)` каждый кадр,
даже когда колонка не крутится (ранний `if (!this.isMoving)` в ColumnMover).
`SaveTotoFireAnimation.update(dt)` тоже бежит всегда (ранний return по
`paused`/`!sequenceReady`). На 5 колонках + fire это 6 пустых вызовов/кадр.

**Рекомендация:** `this.enabled = false` когда не moving (включать в
`startMovement`, выключать в `onMovementComplete`). Для fire —
`update()` можно гасить на level 0.

### DA-008 (M) — `SlotView.blinkScatter`/`pulseWinElement`: незачищаемые `setTimeout`

`setTimeout(finish, 2500)` / `setTimeout(finish, 1500)` — таймаут-защита от
зависшего твина. `done`-flag предотвращает двойной resolve, но сам таймер не
очищается после `.call(finish)` твина. Маленький leak (до 2.5 c).

**Рекомендация:** `clearTimeout` в `finish` или `this.scheduleOnce`.

### DA-009 (M) — `HudView.pulseCta` — мёртвый код

`HudView.pulseCta()` не вызывается ниоткуда (CTA-pulse запускается через
`EndCardView.playCtaPulse`). Дублирующий tween-fallback без `Tween.stopAllByTarget`
— если когда-то вызовут, бесконечный tween не остановить через `stop()`.

**Рекомендация:** удалить или прокинуть через `SaveTotoCtaPulseAnimation` uniformly.

### DA-010 (L) — `HudView.onLoad` показывает SPIN до state machine

`HudView.onLoad` → `showSpinButton(true)`, затем `Bootstrap` через
`scheduleOnce(...,0)` вызывает `startFlow` → `enterIntro` → `showSpinButton(false)`.
Один кадр SPIN виден/интерактивен до intro. Безопасно (state machine игнорирует
click вне `SpinReady`), но визуальный артефакт.

**Рекомендация:** стартовать spin-button скрытым в сцене.

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

## 5. Исправлено в этом проходе (сводка)

| ID | Файл | Изменение |
|---|---|---|
| DA-001 | `views/SaveTotoSlotView.ts` | balance counting: RAF → `tween` proxy + `isValid` guard + отмена предыдущего tween |
| DA-002 | `animations/SaveTotoCoinFountain.ts` | монеты в массиве, физика в `update(dt)`, dt из движка, чистый `stop()` |
| DA-003 | `Slot/SaveTotoSlotController.ts` | `spinCompletionPending` guard против повторного `onSpinComplete` |
| DA-004 | `Slot/managers/SaveTotoWinAnimationManager.ts` | token-guard отложенных win-анимаций против `stopAllAnimations` |

## 6. Открытые задачи (перенесены в OPEN_ISSUES.md)

- **OI-519:** перевести raw `setTimeout` gameplay-задержки (state machine,
  ThreatView, LockView) на `scheduleOnce`/tween-delay с `isValid` guard.
- **OI-520:** заменить runtime `getChildByName`/`getComponentsInChildren`
  (DA-006) на `@property`/кэшированные ссылки.
- **OI-521:** гасить `enabled` у `SlotColumn`/`FireAnimation` в idle (DA-007).
