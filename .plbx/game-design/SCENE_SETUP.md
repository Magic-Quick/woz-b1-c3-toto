---
document_type: "scene_setup_plan"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.0.0"
status: "draft_scene_first_plan"
date: "2026-06-28"
---

# План сцены `Save Toto`

## 1. Назначение

Документ описывает целевую иерархию сцены, имена нод, слои, layout и property wiring для playable `Save Toto`. План поддерживает подход: сначала автоматически собрать сцену и визуальные слои, затем подключать логику.

## 2. Текущий baseline

В текущем каталоге есть чистый Cocos Creator проект, документация и импортируемые ассеты. Cocos-проект создан; runtime-ассеты разложены в `assets/art/`, сцена и скрипты ещё не собраны.

```text
woz-b1-c3-toto/
  GDD.md
  README.md
  .plbx/reference/scene.png
  assets/art/**/*.png
  assets/fonts/bodegasans/*.ttf
```

Следовательно, первая scene-фаза должна собрать scene blueprint и импортировать ассеты через Cocos Creator, не создавая `.meta` вручную.

## 3. Целевой Canvas

| Параметр | Значение |
|---|---:|
| Design width | `1080` |
| Design height | `1920` |
| Orientation | Portrait `9:16` |
| Reference image | `.plbx/reference/scene.png` (`1302×2313`) |
| Safe horizontal margin | `64–96 px` |
| Safe bottom CTA margin | `80–120 px` |

## 4. Верхнеуровневая иерархия

```text
scene
  Canvas
    Camera
    BackgroundLayer
      BackgroundImage
    ThreatLayer
      Logo
      ChainAnchor
      CageRoot
        CageSwingRoot
          CageBase
          TotoRoot
            TotoBody
            TotoHead
              TotoTongue
          LocksRoot
            LockLeft
            LockCenter
            LockRight
          OpenLockFxRoot
      FireRoot
        FireSprite
        LightFx
    SlotLayer
      WinBalanceRoot
        BalancePanel
          BalanceLabel
        WinPanel
          WinTitleLabel
          WinValueLabel
      Slot
        ReelRoot
          ReelFrame
          Columns
            Column_1
            Column_2
            Column_3
            Column_4
            Column_5
          SymbolGrid
            SymbolCell_01_01
            ...
            SymbolCell_05_03
      BonusRoot
        BonusDimmer
        InstructionLabel
        BasketGrid
          Basket_01
          Basket_02
          Basket_03
          Basket_04
          Basket_05
          Basket_06
    HudLayer
      SpinButton
        SpinLabel
      CtaButton
        CtaLabel
    FxLayer
      LockFxRoot
      CoinFxRoot
      FloatingRewardRoot
    EndCardLayer
      EndOverlay
      EndLogo
      EndTotoRoot
      EndWinLabel
      PlayNowButton
  System
    SaveTotoBootstrap
    GameConfig
    ElementConfiguration
    ForcedSpawnManager
    ColumnMoveEffect
    WinAnimation
    AnalyticsAdapter
    StoreAdapter
```

## 4.1. Template-compatible requirements

Так как `.plbx/reference/slot-game/` теперь является базой логики, целевая сцена должна быть совместима с template core:

```text
Canvas
  Slot
    Columns
      Column_1 / Colimn_1
      Column_2 / Colimn_2
      Column_3 / Colimn_3
      Column_4 / Colimn_4
      Column_5 / Colimn_5
  SpinButton
  RewardController
  CTAScreen / EndCardLayer
System
  Bootstrap / SaveTotoBootstrap
  ElementConfiguration
  ForcedSpawnManager
  ColumnMoveEffect
  WinAnimation
```

Допускается исправить typo `Colimn` → `Column` в целевой сцене, но mapping должен быть зафиксирован в wiring config. Runtime не должен искать эти ноды по строковым именам.


## 4.2. Prefab layer requirements

Scene builder должен использовать prefabs там, где объект повторяется или содержит поведение:

| Scene nodes | Prefab | Количество |
|---|---|---:|
| `SymbolCell_**` / reel symbols | `SaveTotoSlotSymbol.prefab` / symbol-specific prefabs | 15 visible + pooled |
| `Basket_01..06` | `SaveTotoBasket.prefab` | 6 |
| `LockLeft/Center/Right` | `SaveTotoLock.prefab` | 3 |
| `PlayNowButton` / `CtaButton` | `SaveTotoCtaButton.prefab` | 1 |
| coin/glow FX | `SaveTotoCoinBurst.prefab`, `SaveTotoGlowPulse.prefab` | on demand |

Prefabs создаются в `assets/prefabs/save-toto/**`; `.meta` создаёт Cocos.


## 5. Layout для `1080×1920`

Координаты ниже указаны относительно центра Canvas.

| Нода | X | Y | W | H | Примечание |
|---|---:|---:|---:|---:|---|
| `BackgroundImage` | `0` | `0` | cover | cover | Заполнить экран с crop |
| `Logo` | `-360` | `720` | `300` | auto | Левый верх, safe area |
| `CageRoot` | `60` | `470` | `620` | `880` | Главный фокус threat |
| `TotoRoot` | `70` | `430` | `300` | `440` | Внутри клетки |
| `LocksRoot` | `0` | `150` | `620` | `210` | Три замка поверх клетки |
| `FireRoot` | `0` | `170` | `900` | `360` | Под клеткой и за WIN panel |
| `WinBalanceRoot` | `0` | `95` | `960` | `190` | Между threat и reel |
| `Slot` / `ReelRoot` | `0` | `-430` | `960` | `490` | Template-compatible slot root + 5×3 grid |
| `SpinButton` | `0` | `-815` | `520` | `170` | Главный input |
| `BonusRoot` | `0` | `-380` | `960` | `560` | Показывается поверх/вместо reel |
| `EndCardLayer` | `0` | `0` | `1080` | `1920` | Hidden until final |

## 6. Symbol grid

| Параметр | Значение |
|---|---:|
| Columns | `5` |
| Rows | `3` |
| Cell width | `176` |
| Cell height | `142` |
| Grid width | `880` |
| Grid height | `430` |

Финальный scripted расклад первой версии: 3 scatter-символа Тото; basket/key/drop/Oz — обычные symbols/fillers.

```text
row 1: basket | key    | toto   | oz     | basket
row 2: oz     | drop   | basket | toto   | key
row 3: toto   | oz     | drop   | oz     | basket
```

Для триггера достаточно любых трёх scatter; лишние basket в visual reference допустимы как декоративный scripted outcome, но exact count нужно согласовать.

## 7. Bonus grid

| Параметр | Значение |
|---|---:|
| Basket count | `6` |
| Layout | `3×2` |
| Cell width | `260` |
| Cell height | `210` |
| Horizontal gap | `48` |
| Vertical gap | `36` |
| Position | Поверх `ReelRoot` |

```text
Basket_01  Basket_02  Basket_03
Basket_04  Basket_05  Basket_06
```

Корзины — instances `SaveTotoBasket.prefab`. У каждой должен быть явный `basketIndex`, а награда определяется по `pickIndex`, не по позиции. Не выбранные корзины остаются закрытыми.

## 8. Слои и порядок отрисовки

| Layer | Z-order | Содержимое |
|---|---:|---|
| `BackgroundLayer` | `0` | Фон |
| `ThreatLayer` | `10` | Клетка, Тото, огонь, замки |
| `SlotLayer` | `20` | Win/balance, reels, bonus |
| `HudLayer` | `30` | SPIN/CTA buttons |
| `FxLayer` | `40` | Key fly, rewards, coins |
| `EndCardLayer` | `50` | Final overlay and CTA |

## 9. Property wiring

Минимальные ссылки для `Bootstrap`:

```text
backgroundLayer
threatView
slotView
bonusView
hudView
endCardView
fxView
gameConfig
analyticsAdapter
storeAdapter
```

Минимальные ссылки для view-компонентов:

```text
ThreatView:
  cageRoot
  totoRoot
  lockViews[3]
  fireNode
  lightFxNode
  packshotRoot

SlotView / SlotController:
  slotRoot
  reelRoot
  columns[5]
  symbolCells[15]
  winValueLabel
  balanceLabel

BonusView:
  bonusRoot
  basketViews[6]
  instructionLabel

HudView:
  spinButton
  ctaButton

EndCardView:
  root
  playNowButton
  endWinLabel
```

## 10. Правила автоматической сборки

1. Генератор создаёт ноды строго по этому документу.
2. Runtime-логика не ищет критичные ноды по имени; generator заполняет property references или создаёт blueprint для ручного wiring.
3. Все размеры и позиции берутся из data config.
4. `.plbx/reference/scene.png` используется только для сверки композиции.
5. `.meta` не создаются вручную.
6. Если SpriteFrame UUID неизвестен, ссылка оставляется пустой и создаётся manual import task.

## 11. Definition of done scene-фазы

- Сцена открывается без ошибок.
- Все верхнеуровневые слои и ноды созданы.
- Ассеты размещены в целевых зонах и визуально напоминают `.plbx/reference/scene.png`.
- `SpinButton`, `Basket_01..06`, `PlayNowButton` имеют явные input targets.
- Все scripted animation anchors существуют: `LocksRoot`, `FireRoot`, `CageRoot`, `PackshotRoot`; `LockFxRoot` не обязателен для MVP.
- Сцена содержит template-compatible `Slot/Columns` с 5 колонками и explicit refs для `SlotController`.
- Повторяемые элементы используют prefabs из `assets/prefabs/save-toto/**`.
- Нет ручных `.meta`.
- Сцена готова к подключению state machine без переписывания иерархии.
