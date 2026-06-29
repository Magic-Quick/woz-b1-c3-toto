---
document_type: "animation_strategy"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.1.0"
status: "script_tween_layer_done_anim_migration_pending"
date: "2026-06-29"
---

# Animation strategy `Save Toto`

## 1. Назначение

`.anim` файлы в Cocos Creator — это `AnimationClip` assets с кривыми анимации. Они не заменяют prefabs, а дополняют их:

```text
Prefab = объект / дерево нод + компоненты + serialized references
.anim = AnimationClip с кривыми transform/opacity/sprite/color/etc.
Prefab + Animation component + .anim clips = reusable animated object
```

Для `Save Toto` `.anim` должны хранить визуальные motion details, а gameplay/state machine должны только запускать методы view-компонентов.

## 2. Почему `.anim` лучше хардкода для визуальных движений

| Анимация | Почему `.anim` лучше |
|---|---|
| `SPIN` pulse | Настраивается без изменения gameplay-кода |
| Basket selected | Один clip для 6 instances `SaveTotoBasket.prefab` |
| Lock open/remove | Предсказуемый clip для left/center/right locks |
| Fire level transition | Можно иметь разные visual presets на одном fire asset |
| CTA pulse/fade | Легко менять timing/easing под marketing review |
| Packshot intro | Визуальный transition отделён от state machine |
| Toto idle/head/tongue | Layered character animation без gameplay хардкода |
| Money/coin bursts | Можно переиспользовать sprites/prefab в разных payoff moments |

## 3. Что не переносить в `.anim`

| Логика | Где должна жить |
|---|---|
| Slot reel movement / column timing | Template-derived slot code/config |
| Scatter evaluation | `SaveTotoScatterEvaluator` / reel system |
| State transitions | `SaveTotoStateMachine` |
| Balance numeric counting | `BalanceController` / `RewardController` code |
| Adaptive layout | Scene/layout config |
| Store redirect / analytics | Adapters |

## 4. Целевая структура animation assets

```text
assets/animations/save-toto/ui/
  spin_pulse.anim
  cta_pulse.anim
  cta_intro.anim

assets/animations/save-toto/bonus/
  basket_idle_pulse.anim
  basket_selected.anim
  floating_reward_in.anim

assets/animations/save-toto/threat/
  lock_open_remove_left.anim
  lock_open_remove_center.anim
  lock_open_remove_right.anim
  fire_level_3_to_2.anim
  fire_level_2_to_1.anim
  fire_level_1_to_0.anim
  toto_idle.anim
  toto_happy.anim

assets/animations/save-toto/packshot/
  packshot_intro.anim
  logo_cta_fade.anim

assets/animations/save-toto/fx/
  money_dollar_pop.anim
  money_gold_coins_pop.anim
  money_gold_bricks_pop.anim
  money_coin_stack_pop.anim
  glow_pulse.anim
```

## 5. Prefab + animation binding

| Prefab | Clips |
|---|---|
| `SaveTotoBasket.prefab` | `basket_idle_pulse.anim`, `basket_selected.anim` |
| `SaveTotoLock.prefab` | `lock_open_remove_left/center/right.anim` или один parameterized clip per instance |
| `SaveTotoFire.prefab` | `fire_level_3_to_2.anim`, `fire_level_2_to_1.anim`, `fire_level_1_to_0.anim` |
| `SaveTotoTotoCharacter.prefab` | `toto_idle.anim`, `toto_happy.anim` |
| `SaveTotoCtaButton.prefab` | `cta_intro.anim`, `cta_pulse.anim` |
| `SaveTotoMoneyBurst.prefab` | `money_dollar_pop.anim`, `money_gold_coins_pop.anim`, `money_gold_bricks_pop.anim`, `money_coin_stack_pop.anim` |
| `SaveTotoGlowPulse.prefab` | `glow_pulse.anim` |

View methods должны запускать clips:

```ts
basketView.playSelected(reward);
lockView.playOpenAndRemove();
fireView.playLevelTransition(3, 2);
ctaView.playPulse();
moneyBurstView.play(kind);
```

State machine не должна знать clip names, durations или easing.

## 6. Automation plan

`.anim` файлы можно генерировать автоматически из blueprint, но безопаснее делать это через Cocos Editor API/editor script, чтобы Cocos сам создал UUID и `.meta`.

Target blueprint example:

```json
{
  "animations": [
    {
      "name": "basket_selected",
      "path": "assets/animations/save-toto/bonus/basket_selected.anim",
      "duration": 0.45,
      "tracks": [
        { "property": "scale", "keys": [[0, 1], [0.16, 1.12], [0.45, 1]] },
        { "property": "opacity", "node": "Glow", "keys": [[0, 0], [0.16, 255], [0.45, 0]] }
      ]
    }
  ]
}
```

Automation rules:

1. Генератор создаёт `AnimationClip` через Cocos/editor workflow.
2. Генератор не создаёт `.meta` вручную.
3. Clips подключаются к `Animation` component на prefab.
4. Gameplay вызывает view methods, а не пишет tween-кривые в state machine.
5. `.anim` из `.plbx/reference/**` не копируются wholesale; их можно читать как пример структуры.

## 7. Money sprites for animation

В production assets добавлены money sprites: часть перенесена из `.plbx/reference/other-assets/` без reference `.meta`, часть перемещена из root проекта (`Stack*.png`, `dollar.png`) в runtime-папку:

| ID | Runtime file | Source reference | Назначение |
|---|---|---|---|
| `money_dollar_coin` | `assets/art/fx/money/money-dollar-coin.webp` | `art/sprites/ui/dollar tilt_.webp` | Single dollar coin pop/fly |
| `money_gold_coins` | `assets/art/fx/money/money-gold-coins.png` | `art/sprites/ui/gold.png` | Coin pile reward/payoff |
| `money_gold_bricks` | `assets/art/fx/money/money-gold-bricks.webp` | `art/sprites/slot/Gold_Bricks_Backings copy 2.webp` | Gold brick reward variant |
| `money_coin_stack_01` | `assets/art/fx/money/money-coin-stack-01.png` | Root provided `Stack01a.png` | Coin stack money burst |
| `money_coin_stack_02a` | `assets/art/fx/money/money-coin-stack-02a.png` | Root provided `Stack02a.png` | Coin stack money burst |
| `money_coin_stack_02b` | `assets/art/fx/money/money-coin-stack-02b.png` | Root provided `Stack02b.png` | Coin stack money burst |
| `money_coin_stack_03` | `assets/art/fx/money/money-coin-stack-03.png` | Root provided `Stack03a.png` | Large coin stack money burst |
| `money_dollar_coin_large` | `assets/art/fx/money/money-dollar-coin-large.png` | Root provided `dollar.png` | Dollar coin variant |
| `reward_10m` | `assets/art/ui/rewards/reward-10m.webp` | `art/sprites/ui/100,000,000.webp` | Reference reward label / fallback amount sprite |
| `reward_100m` | `assets/art/ui/rewards/reward-100m.webp` | `art/sprites/ui/100,000,000 (1).webp` | Reference reward label / fallback amount sprite |

Эти sprites можно использовать в `SaveTotoMoneyBurst.prefab`, `SaveTotoFloatingReward.prefab` и packshot payoff. Перед production export проверить вес и визуальную совместимость со стилем Save Toto.

## 9. Текущий статус реализации (OI-506a / OI-506b)

**OI-506a — Done (script-tween layer).** Все клипы из §4 реализованы НЕ как `.anim` `AnimationClip` assets, а как `SaveToto*Animation` script-компоненты (`tween()` обёртки), навешанные на scene-nodes через `tools/attach-*.mjs`:

| Запланированный clip | Реализация (script-tween) | Где |
|---|---|---|
| `spin_pulse.anim` | `SaveTotoAutoPulse` (scale loop) | SpinButton |
| `basket_idle_pulse.anim` | `SaveTotoAutoPulse` (6×, stagger) | Basket_01..06 |
| `toto_idle.anim` (head/tongue float) | `SaveTotoAutoFloat` (y/rot loop) | TotoHead, TotoTongue |
| `basket_selected.anim` | `SaveTotoBasketSelectedAnimation` (scale pulse + glow fade) | Basket_01..06 |
| `lock_open_remove_*.anim` | `SaveTotoLockOpenRemoveAnimation` (scale-up + drop + fade) | LockLeft/Center/Right |
| `packshot_intro.anim` | `SaveTotoPackshotIntroAnimation` (bump + settle) | CageRoot |
| `cta_pulse.anim` | `SaveTotoCtaPulseAnimation` (scale loop, explicit play) | PlayNowButton (EndCard) |

View-layer pattern: `view.playX()` сначала пытается вызвать `SaveToto*Animation` компонент (`getComponent`), при отсутствии — fallback на inline `tween()`. Это позволяет сцене работать до attach компонентов.

**НЕ реализовано в OI-506a (перенесено в OI-506b или ниже):**
- `fire_level_3_to_2 / 2_to_1 / 1_to_0.anim` — fire остался static sprite; `setFireLevel()` только меняет уровень в данных, визуальной анимации нет (OI-203 открыт).
- `money_dollar_pop / gold_coins / gold_bricks / coin_stack_pop.anim` — money sprites перенесены в `assets/art/fx/money/**`, но prefabs/clips/VFXSpawner не созданы.
- `floating_reward_in.anim` — `FxLayer/FloatingRewardRoot` пустой.
- `glow_pulse.anim`, `cta_intro.anim`, `logo_cta_fade.anim`, `toto_happy.anim` — отсутствуют.

**OI-506b — Pending (`.anim` migration).** Перенос script-tween кривых в настоящие `AnimationClip` assets в `assets/animations/save-toto/**` + `Animation` component на prefabs + `view.playX()` вызывает `Animation.play()`. Контракты §4–§5 остаются source-of-truth.

## 10. Definition of done

- `.anim` assets живут в `assets/animations/save-toto/**`.
- `.anim.meta` создаёт Cocos/editor workflow, не агент вручную.
- Prefabs содержат `Animation` component и ссылки на clips.
- State machine не содержит visual tween curves.
- Money sprites подключены только через production paths `assets/art/**`, не через `.plbx/reference/**`.
