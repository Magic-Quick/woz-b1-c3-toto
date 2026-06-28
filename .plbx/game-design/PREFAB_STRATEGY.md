---
document_type: "prefab_strategy"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.0.0"
status: "draft_for_scene_automation"
date: "2026-06-28"
---

# Prefab strategy `Save Toto`

## 1. Назначение

Prefab — это reusable шаблон игрового объекта: нода или дерево нод со Sprite, Button, Label, Animation, scripts и explicit serialized references. В проекте prefabs нужны как промежуточный слой между raw assets и generated scene.

```text
Raw asset = картинка / звук / шрифт
Prefab = готовый объект с компонентами и wiring
.anim = AnimationClip с visual motion curves
Scene = собранный экран из layers, prefabs и anchors
```

## 2. Почему prefabs нужны в этом проекте

| Задача | Почему prefab лучше raw asset |
|---|---|
| 5×3 slot symbols | Один шаблон symbol-cell задаёт Sprite, scale, UITransform, animation hooks |
| 6 bonus baskets | Один `SaveTotoBasket.prefab`, 6 instances с разными indexes |
| 3 locks | Единая логика open/fall/hide, разные sprites left/center/right |
| CTA button | Button + label + pulse + click handler в одном reusable объекте |
| Floating reward / particles | Можно инстанцировать в FX layer без ручной сборки и запускать `.anim` clips |
| Scene automation | Builder создаёт instances prefab, а не вручную собирает компоненты каждый раз |

## 3. Целевой список prefabs

```text
assets/prefabs/save-toto/slot/
  SaveTotoSlotSymbol.prefab
  SaveTotoSymbolTotoScatter.prefab
  SaveTotoSymbolBasket.prefab
  SaveTotoSymbolKey.prefab
  SaveTotoSymbolDrop.prefab
  SaveTotoSymbolOz.prefab

assets/prefabs/save-toto/bonus/
  SaveTotoBasket.prefab

assets/prefabs/save-toto/threat/
  SaveTotoLock.prefab
  SaveTotoTotoCharacter.prefab
  SaveTotoFire.prefab

assets/prefabs/save-toto/ui/
  SaveTotoCtaButton.prefab
  SaveTotoFloatingReward.prefab

assets/prefabs/save-toto/fx/
  SaveTotoCoinBurst.prefab
  SaveTotoMoneyBurst.prefab
  SaveTotoGlowPulse.prefab
```

## 4. Prefab contracts

### 4.1. `SaveTotoBasket.prefab`

```text
SaveTotoBasket
  Sprite: assets/art/slot/symbol-basket.png
  Button
  UIOpacity
  Script: SaveTotoBasketView
  RewardLabel
  Glow
```

Contract:

```ts
interface SaveTotoBasketViewContract {
  basketIndex: number;
  setEnabled(enabled: boolean): void;
  playIdlePulse(): void;
  playSelected(reward: BonusReward): Promise<void>;
}
```

No open-basket sprite required. Selected state uses scale/glow/label animation.

### 4.2. `SaveTotoLock.prefab`

```text
SaveTotoLock
  Sprite: lock-left / lock-center / lock-right / open-lock
  UIOpacity
  Script: SaveTotoLockView
```

Contract:

```ts
interface SaveTotoLockViewContract {
  lockId: 'left' | 'center' | 'right';
  playOpenAndRemove(): Promise<void>;
}
```

No key flight required for MVP. Unlock feedback is lock animation only.

### 4.3. `SaveTotoSlotSymbol.prefab`

```text
SaveTotoSlotSymbol
  SymbolBg Sprite: assets/art/slot/symbols_bg.png
  Icon Sprite: symbol-specific sprite
  Script: SaveTotoSlotSymbolView
```

Contract:

```ts
interface SaveTotoSlotSymbolViewContract {
  symbolId: number;
  setSymbol(symbolId: number): void;
  playScatterHighlight(): Promise<void>;
}
```

`SaveTotoSymbolTotoScatter.prefab` is the scatter symbol prefab.

### 4.4. `SaveTotoCtaButton.prefab`

CTA can use the reference CTA as visual pattern, but production prefab is created in target project.

```text
SaveTotoCtaButton
  Sprite/Button base
  Label: CTA text
  Script: SaveTotoCtaButtonView
```

Only CTA button is active; no tap-anywhere redirect for MVP.


### 4.5. `SaveTotoMoneyBurst.prefab`

```text
SaveTotoMoneyBurst
  Sprite variants:
    assets/art/fx/money/money-dollar-coin.webp
    assets/art/fx/money/money-gold-coins.png
    assets/art/fx/money/money-gold-bricks.webp
    assets/art/fx/money/money-coin-stack-01.png
    assets/art/fx/money/money-coin-stack-02a.png
    assets/art/fx/money/money-coin-stack-02b.png
    assets/art/fx/money/money-coin-stack-03.png
    assets/art/fx/money/money-dollar-coin-large.png
  Animation
  Script: SaveTotoMoneyBurstView
```

Contract:

```ts
interface SaveTotoMoneyBurstViewContract {
  play(kind: 'dollarCoin' | 'dollarCoinLarge' | 'goldCoins' | 'goldBricks' | 'coinStack01' | 'coinStack02a' | 'coinStack02b' | 'coinStack03'): Promise<void>;
}
```

Clips are defined in `.plbx/game-design/ANIMATION_STRATEGY.md`.

## 5. Automation plan

Prefab and `.anim` binding can be automated from blueprint, but `.meta` must be created by Cocos importer/editor, not manually.

Target blueprint example:

```json
{
  "prefabs": [
    {
      "name": "SaveTotoBasket",
      "path": "assets/prefabs/save-toto/bonus/SaveTotoBasket.prefab",
      "sprite": "assets/art/slot/symbol-basket.png",
      "components": ["Sprite", "Button", "UIOpacity", "SaveTotoBasketView"],
      "children": ["RewardLabel", "Glow"]
    }
  ]
}
```

Automation rules:

1. Generator creates prefab nodes/components from blueprint.
2. Generator does not create `.meta` manually.
3. Serialized references are filled by Cocos editor script or explicit manual wiring step.
4. Scene builder instantiates prefabs; gameplay code receives explicit references.
5. Prefab generator can attach `Animation` component and clips generated by `ANIMATION_STRATEGY.md`.
6. Reference prefabs from `.plbx/reference/**` are never copied wholesale.

## 6. Implementation order

1. Create target scripts/interfaces for prefab view contracts.
2. Generate/create slot symbol prefabs.
3. Generate/create `SaveTotoBasket.prefab`.
4. Generate/create `SaveTotoLock.prefab`.
5. Generate/create basic CTA prefab.
6. Generate/create `SaveTotoMoneyBurst.prefab` and bind money `.anim` clips.
7. Update scene blueprint to instantiate prefabs instead of raw sprites where useful.
8. Run scene graph inspection and wiring validation.

## 7. Definition of done

- Prefabs live under `assets/prefabs/save-toto/**`.
- Visual clips live under `assets/animations/save-toto/**` and are bound through `Animation` components.
- Prefab class names are project-specific (`SaveToto*`).
- No prefab depends on `.plbx/reference/**` paths.
- No runtime `find()`/`getChildByName()` is needed inside gameplay flow.
- `Basket`, `Lock`, `SlotSymbol`, `CTA` prefabs can be reused by scene builder.
