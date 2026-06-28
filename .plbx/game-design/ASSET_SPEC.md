---
document_type: "asset_spec"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.0.0"
status: "draft_asset_inventory"
date: "2026-06-28"
---

# Спецификация ассетов `Save Toto`

## 1. Назначение

Документ фиксирует найденные ассеты, их runtime-роли, размеры, правила импорта и пробелы. Перед любым изменением сцены или генерацией новых изображений нужно сверяться с этим документом.

## 2. Обнаруженные ассеты

| Файл | Размер | Роль | Runtime |
|---|---:|---|---|
| `.plbx/reference/scene.png` | `1302×2313` | Композитный visual reference | Нет |
| `assets/art/backgrounds/background.png` | `2315×2313` | Каменный фон | Да |
| `assets/art/logos/logo_woz_slots.png` | `395×296` | Логотип WOZ Slots | Да |
| `assets/art/scene/cage.png` | `740×1200` | Клетка | Да |
| `assets/art/scene/fire.png` | `1085×593` | Пламя | Да |
| `assets/art/scene/light.png` | `815×703` | Световой FX | Да |
| `assets/art/characters/toto-body.png` | `378×672` | Тело Тото | Да |
| `assets/art/characters/toto-head.png` | `301×403` | Голова Тото | Да |
| `assets/art/characters/toto-tongue.png` | `60×64` | Язык/эмоция | Да |
| `assets/art/scene/locks/lock-left.png` | `185×277` | Левый замок | Да |
| `assets/art/scene/locks/lock-center.png` | `187×301` | Центральный замок | Да |
| `assets/art/scene/locks/lock-right.png` | `187×274` | Правый замок | Да |
| `assets/art/scene/locks/open-lock.png` | `326×431` | Открытый/падающий замок | Да |
| `assets/art/slot/reel.png` | `1254×638` | Рамка/основа барабанов | Да |
| `assets/art/slot/symbols_bg.png` | `221×170` | Подложка символа | Да |
| `assets/art/slot/symbol-basket.png` | `144×140` | Корзина / scatter | Да |
| `assets/art/slot/symbol-key.png` | `144×130` | Ключ / тематический символ | Да |
| `assets/art/slot/symbol-drop.png` | `140×148` | Голубая капля / тематический символ | Да |
| `assets/art/slot/symbol-oz.png` | `94×127` | `Oz` low-pay symbol | Да |
| `assets/art/slot/symbol-toto.png` | `222×169` | Toto reel symbol | Да |
| `assets/art/ui/balance.png` | `258×91` | Balance panel | Да |
| `assets/art/ui/win.png` | `554×382` | Win panel | Да |
| `assets/art/ui/spin.png` | `509×168` | Spin button | Да |
| `assets/fonts/bodegasans/*.ttf` | font | UI font family | Да |

## 2.1. Reference-only материалы

| Путь | Назначение | Runtime |
|---|---|---|
| `.plbx/reference/scene.png` | Композитный визуальный ориентир | Нет |
| `.plbx/reference/other-assets/` | Parallel Oz-like assets/scripts/prefabs для анализа VFX/audio/CTA/adaptive | Нет |
| `.plbx/reference/slot-game/` | Готовый slot template, база логики reels/spin/forced spawn | Нет |

Эти материалы не должны импортироваться в production bundle без отдельного решения и синхронизации `OPEN_ISSUES.md`.

### Reference assets usage

- Из `slot-game` переносить прежде всего scripts/patterns, а не demo art.
- Из `other-assets` использовать art/prefabs только как visual/VFX reference до отдельного production решения.
- Runtime assets Save Toto остаются в `assets/art/**` и `assets/fonts/**`.

## 3. Текущие runtime-папки Cocos-проекта

```text
assets/art/backgrounds/background.png
assets/art/logos/logo_woz_slots.png
assets/art/characters/toto-body.png
assets/art/characters/toto-head.png
assets/art/characters/toto-tongue.png
assets/art/scene/cage.png
assets/art/scene/fire.png
assets/art/scene/light.png
assets/art/scene/locks/lock-left.png
assets/art/scene/locks/lock-center.png
assets/art/scene/locks/lock-right.png
assets/art/scene/locks/open-lock.png
assets/art/slot/reel.png
assets/art/slot/symbols_bg.png
assets/art/slot/symbol-basket.png
assets/art/slot/symbol-key.png
assets/art/slot/symbol-drop.png
assets/art/slot/symbol-oz.png
assets/art/slot/symbol-toto.png
assets/art/ui/balance.png
assets/art/ui/win.png
assets/art/ui/spin.png
assets/fonts/bodegasans/
```

Если Cocos Creator импортирует файлы, `.meta` создаются только редактором. Агент не создаёт `.meta` вручную.

## 3.1. Целевые prefab-папки

```text
assets/prefabs/save-toto/slot/
assets/prefabs/save-toto/bonus/
assets/prefabs/save-toto/threat/
assets/prefabs/save-toto/ui/
assets/prefabs/save-toto/fx/
```

Подробный contract см. `.plbx/game-design/PREFAB_STRATEGY.md`. Prefabs создаются Cocos/editor workflow; `.meta` вручную не создаются.


## 4. Runtime-использование ассетов

### 4.1. Threat layer

| Нода | Sprite | Начальное состояние | Анимации |
|---|---|---|---|
| `BackgroundImage` | `assets/art/backgrounds/background.png` | Cover screen | Static/parallax optional |
| `Logo` | `assets/art/logos/logo_woz_slots.png` | Top-left safe area | Subtle idle shine optional |
| `CageBase` | `assets/art/scene/cage.png` | Center upper | Swing idle, open payoff fallback |
| `TotoBody` | `assets/art/characters/toto-body.png` | Inside cage | Idle breathing |
| `TotoHead` | `assets/art/characters/toto-head.png` | Inside cage | Look/bob |
| `TotoTongue` | `assets/art/characters/toto-tongue.png` | Child of head | Happy/tongue bounce |
| `Fire` | `assets/art/scene/fire.png` | Below cage, max intensity | Scale/alpha by level |
| `LockLeft/Center/Right` | lock PNGs | Visible | Snap-off / fall / hide |
| `OpenLockFx` | `assets/art/scene/locks/open-lock.png` | Hidden | Fall/open replacement |
| `LightFx` | `assets/art/scene/light.png` | Hidden | Payout glow |

### 4.2. Slot layer

| Нода | Sprite | Роль |
|---|---|---|
| `ReelFrame` | `assets/art/slot/reel.png` | Frame for 5×3 grid |
| `SymbolCell_*` | `assets/art/slot/symbols_bg.png` | Cell background |
| `SymbolBasket` | `assets/art/slot/symbol-basket.png` | Scatter |
| `SymbolKey` | `assets/art/slot/symbol-key.png` | Key symbol / fallback bonus key |
| `SymbolDrop` | `assets/art/slot/symbol-drop.png` | Regular symbol |
| `SymbolOz` | `assets/art/slot/symbol-oz.png` | Regular symbol |
| `SymbolToto` | `assets/art/slot/symbol-toto.png` | High-pay/Toto symbol |

### 4.3. HUD layer

| Нода | Sprite | Роль |
|---|---|---|
| `BalancePanel` | `assets/art/ui/balance.png` | Показ баланса |
| `WinPanel` | `assets/art/ui/win.png` | Подложка WIN counter |
| `SpinButton` | `assets/art/ui/spin.png` | Основной input |
| `InstructionLabel` | Runtime label | Текст подсказок |
| `CtaButton` | `assets/art/ui/spin.png` fallback | Финальная кнопка до отдельного CTA asset |

## 5. Недостающие ассеты и fallback

| Нужный ассет | Приоритет | Fallback |
|---|---|---|
| Open basket state | Не нужен для MVP | `SaveTotoBasket.prefab` selected animation на текущем basket asset |
| Standalone key | Не нужен для MVP | Lock-open animation без key flight |
| Cage door/open layer | Не нужен для MVP | Packshot transition после снятия замков |
| Coin/bonus particles | Средний | Сгенерировать production particles/prefabs отдельно |
| CTA button | Средний | Production `SaveTotoCtaButton.prefab`; reference only for visual pattern |
| Reward plaques | Средний | Runtime labels with Bodega Sans |
| Audio SFX | Later | Уникальные звуки будут нарезаны отдельно; reference audio не копировать |

## 6. Правила оптимизации

- `.plbx/reference/scene.png` не включать в production bundle, если он нужен только как reference.
- Большие изображения (`assets/art/backgrounds/background.png`, `assets/art/scene/cage.png`, `assets/art/scene/fire.png`) оптимизировать после утверждения визуала.
- Для одинаковых symbol cells использовать prefab/reuse, не дублировать текстуры.
- Fire level делать через scale/alpha/tint одной текстуры, пока нет отдельных sprites.
- Для bonus корзин не генерировать 6 разных текстур, если отличие только в reward label. Использовать один `SaveTotoBasket.prefab` и 6 instances.

## 7. Проверка ассетов перед scene-фазой

- [x] Все PNG открываются и имеют прозрачность там, где нужна.
- [x] `assets/art/scene/locks/open-lock.png` переименован или импортирован без пробела в runtime alias.
- [x] `.plbx/reference/scene.png` помечен как `reference_only`.
- [x] Файлы разложены по runtime-папкам Cocos-проекта.
- [x] `.meta` не создавались вручную; текущие `.meta` созданы Cocos Creator после импорта.
- [x] Fallback для key/open basket принят: key flight и open basket sprite не нужны в MVP.
