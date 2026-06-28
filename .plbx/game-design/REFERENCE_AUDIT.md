---
document_type: "reference_audit"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.0.0"
status: "active_reference_plan"
date: "2026-06-28"
---

# Аудит reference-материалов `Save Toto`

## 1. Назначение

Документ фиксирует новые вводные: в `.plbx/reference/slot-game/` лежит готовый Cocos Creator 3.8.8 template слот-игры, который нужно взять за основу логики, а в `.plbx/reference/other-assets/` лежит параллельный Oz-like проект для подсмотра решений по сцене, VFX, audio, CTA и адаптиву.

Reference-папки не являются production runtime. Их нельзя копировать целиком в `assets/` без аудита зависимостей, лицензий, `.meta` и соответствия GDD.

## 2. Reference sources

| Путь | Роль | Что брать | Что не брать напрямую |
|---|---|---|---|
| `.plbx/reference/slot-game/` | Базовый slot template | Core logic: `Bootstrap`, `SlotController`, `SlotColumn`, `ElementConfiguration`, `ForcedSpawnManager`, `WinChecker`, spin button, reward, CTA skeleton | Default 3×3 layout, demo symbols, generic UX без Toto flow |
| `.plbx/reference/other-assets/` | Параллельный Oz-like проект | 5-column scene patterns, richer CTA, audio unlock, orientation, VFX flights, reward count polish, Spin pulse/tutorial fade | Dorothy/Witch/Bridge gameplay как сюжетную механику, чужие production assets без решения |
| `.plbx/reference/scene.png` | Visual target | Композиция Save Toto | Runtime source/sliced asset |

## 3. Slot template audit

Template scene:

```text
.plbx/reference/slot-game/assets/scene.scene
```

Ключевая структура:

```text
Canvas
  Slot
    Columns
      Colimn_1
      Colimn_2
      Colimn_3
  SpinsController
  RewardController
  SpinButton
  CTAScreen
  VFXContainer
System
  Bootstrap
  WinAnimation
  ElementConfiguration
  ForcedSpawnManager
  ColumnMoveEffect
  VFXSpawner
```

Полезные компоненты:

| Компонент | Reference path | Решение для Save Toto |
|---|---|---|
| `Bootstrap` | `slot-game/assets/scripts/controllers/Bootstrap.ts` | Использовать как DI/startup основу, расширить `SaveTotoBootstrap` state machine hooks |
| `SpinButtonController` | `slot-game/assets/scripts/controllers/SpinButtonController.ts` | Использовать input-lock/spin-start паттерн, взять pulse из `other-assets` |
| `SlotController` | `slot-game/assets/scripts/Slot/SlotController.ts` | Использовать columns orchestration, forced spawn, visible elements, spin-complete event |
| `SlotColumn` / `ColumnMover` | `slot-game/assets/scripts/Slot/SlotColumn.ts`, `ColumnMover.ts` | Использовать движение колонок, но настроить на 5 columns × 3 visible rows |
| `ElementConfiguration` | `slot-game/assets/scripts/Slot/Elements/ElementConfiguration.ts` | Использовать Inspector-конфигурацию symbols/scatter |
| `ForcedSpawnManager` | `slot-game/assets/scripts/Slot/managers/ForcedSpawnManager.ts` + `other-assets/scripts/Slot/managers/ForcedSpawnManager.ts` | Базовый API из template, улучшенную версию взять из `other-assets` с `hasRulesForSpin()` и фильтрацией forced lines |
| `WinChecker` | `slot-game/assets/scripts/Slot/WinChecker.ts` | Адаптировать под 5×3 и scatter-count; paylines вторичны |
| `RewardController` | `slot-game/assets/scripts/controllers/RewardController.ts` | Использовать как основу balance/final value counter, заменить reward formula на scripted payout |
| `CTAScreen` | `slot-game/assets/scripts/Slot/CTAScreen.ts` | Использовать show/hide skeleton, взять `plbx_html_playable` интеграцию из `other-assets` |

## 4. Parallel project audit

Parallel scene:

```text
.plbx/reference/other-assets/scene.scene
```

Полезные решения:

| Решение | Reference path | Применение в Save Toto |
|---|---|---|
| 5 columns slot layout | `other-assets/scene.scene` → `Slot/Columns/Colimn_1..5` | Базовый паттерн для 5×3 Save Toto reel |
| `SpinButtonController` pulse/tutorial fade | `other-assets/scripts/controllers/SpinButtonController.ts` | Пульсация `SPIN`, скрытие подсказки после первого tap |
| Audio unlock after first tap | `other-assets/scripts/audio/audio-controller.ts` + `Bootstrap.ts` | Безопасный WebAudio unlock; применить позже, если audio входит в scope |
| `plbx_html_playable` hooks | `other-assets/scripts/plbx_html/plbx_html_playable.ts`, `CTAScreen.ts` | `game_ready`, `game_end`, `download` для CTA/export |
| Orientation controller | `other-assets/scripts/controllers/OrientationController.ts` | Использовать как reference для portrait/landscape policy, не обязательно в MVP |
| Reward flights | `DollarRewardFlight.ts`, `ProjectileFlightBase.ts` | Reference для money payoff motion; production uses copied money sprites + own prefabs/`.anim`, key-flight в MVP не используется |
| Enhanced forced handling | `other-assets/scripts/Slot/SlotController.ts`, `ForcedSpawnManager.ts` | Фильтрация random wins не из forced lines |
| Rich CTA screen | `other-assets/scene.scene` → `CTAScreen` subtree | Взять layering/fade/CTA button structure как пример |

## 4.1. Money sprite transfer

По отдельному решению пользователя из `other-assets` перенесены только отдельные money sprites, не prefabs и не `.meta`:

| Runtime file | Source reference |
|---|---|
| `assets/art/fx/money/money-dollar-coin.webp` | `.plbx/reference/other-assets/art/sprites/ui/dollar tilt_.webp` |
| `assets/art/fx/money/money-gold-coins.png` | `.plbx/reference/other-assets/art/sprites/ui/gold.png` |
| `assets/art/fx/money/money-gold-bricks.webp` | `.plbx/reference/other-assets/art/sprites/slot/Gold_Bricks_Backings copy 2.webp` |
| `assets/art/ui/rewards/reward-10m.webp` | `.plbx/reference/other-assets/art/sprites/ui/100,000,000.webp` |
| `assets/art/ui/rewards/reward-100m.webp` | `.plbx/reference/other-assets/art/sprites/ui/100,000,000 (1).webp` |

Правило `reference-only` сохраняется: дальнейшее копирование из `.plbx/reference/**` требует отдельного решения и обновления `ASSET_SPEC.md`.

## 5. Migration strategy

Рекомендуется не копировать template целиком, а перенести модульно:

1. Создать целевой модуль `assets/scripts/save-toto/`.
2. Скопировать/адаптировать базовые template файлы с новыми именами классов, чтобы избежать конфликтов с reference `.meta` и generic names.
3. Начать с slot core:
   - config;
   - events;
   - `SlotController`;
   - `SlotColumn`;
   - elements;
   - forced spawn;
   - spin button;
   - reward/win counter.
4. Затем подключить Save Toto-specific systems:
   - `SaveTotoStateMachine`;
   - `ThreatProgressController`;
   - `BonusPickController`;
   - `LockUnlockController`;
   - `StoreAdapter`.
5. Scene builder должен создать template-compatible nodes (`Slot`, `Columns`, `Colimn_1..5`, `System`), project prefabs и Save Toto-specific layers (`ThreatLayer`, `BonusRoot`, `EndCardLayer`).

## 6. Конкретные адаптации template под Save Toto

| Template default | Save Toto target | Действие |
|---|---|---|
| `3` columns | `5` columns | Использовать 5 нод колонок и `columns[5]` |
| `3` visible rows | `3` visible rows | Оставить 3 rows, настроить spacing/layout под reel art |
| `WinChecker` 3-column paylines | Toto scatter trigger + optional paylines | Добавить scatter count по `symbol-toto`; paylines не должны блокировать bonus |
| Spin count `3` | Один сценарный spin | `initialSpins = 1`, затем bonus flow, не generic CTA после spins=0 |
| Generic reward | Scripted final WIN | RewardController должен поддержать scripted counter до `finalWinValue` |
| CTA after no spins | CTA after Toto freed + payout | CTA показывается только state machine после `Payout` |
| Generic symbols | Save Toto symbols | Element IDs закрепить в config: Toto=scatter, basket, key/regular, drop, Oz |
| Template `openStore()` empty | Playbox/network adapter | Использовать `plbx_html_playable.download()`/store adapter |

## 7. Reference usage rules

1. `.plbx/reference/**` читается как источник решений, не как production asset folder.
2. Не редактировать reference-файлы, если задача явно не про reference cleanup.
3. Не копировать `.meta` из reference в target `assets/` вручную.
4. При переносе кода менять module namespace/class names под `SaveToto*`; generic names оставлять только если это явно documented utility.
5. Перед переносом сцены сверить `SCENE_SETUP.md`: scene-first остаётся актуален, но теперь target scene должна быть compatible с slot template.
6. Любые заимствованные assets из `other-assets` запрещены для production без отдельного решения; текущий план — reference-only.

## 8. Definition of done reference-аудита

- Slot template признан базой логики.
- Parallel project признан reference для UX/VFX/audio/CTA/adaptive, но не gameplay source of truth.
- Architecture и implementation phases обновлены на template-first + scene-first hybrid.
- Open issues содержат migration-specific вопросы.
- Agents rules запрещают прямое редактирование/copy-all reference.
