---
document_type: "documentation_plan"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.0.0"
status: "draft_for_development"
date: "2026-06-28"
source_reference: "Tripledot B1-C2 documentation set"
---

# План документации проекта `WOZ_B1_C3_SaveToto`

## 1. Назначение

Этот документ фиксирует полный набор рабочих документов для разработки playable `Save Toto` по образцу проекта `Tripledot B1-C2`: сначала синхронизируется дизайн, затем ассеты и сцена, затем логика, QA и экспорт.

Проект находится на стартовой Cocos-стадии: есть исходный `GDD.md`, чистый Cocos Creator 3.8.8 проект, runtime-ассеты в `assets/art/`, шрифты `assets/fonts/bodegasans/` и визуальный ориентир `.plbx/reference/scene.png`, а также reference-only папки `.plbx/reference/other-assets/` и `.plbx/reference/slot-game/`. Runtime-сцена и скрипты gameplay ещё не собраны.

## 2. Иерархия источников правды

| Приоритет | Документ | Роль |
|---:|---|---|
| 1 | `.plbx/game-design/GDD.md` | Полный игровой дизайн и сценарий playable |
| 2 | `GDD.md` | Исходный клиентский/командный бриф, не перезаписывать без отдельного решения |
| 3 | `.plbx/game-design/OPEN_ISSUES.md` | Все логические пробелы и вопросы к команде/клиенту |
| 4 | `.plbx/game-design/REFERENCE_AUDIT.md` | Роли `slot-game` template и `other-assets` reference |
| 5 | `.plbx/game-design/ASSET_SPEC.md` | Инвентаризация ассетов, роли, недостающие элементы |
| 6 | `.plbx/game-design/PREFAB_STRATEGY.md` | Правила prefab-слоя и автоматизации reusable объектов |
| 7 | `.plbx/game-design/ANIMATION_STRATEGY.md` | Правила `.anim` clips, binding к prefabs и animation automation |
| 8 | `.plbx/game-design/SCENE_SETUP.md` | Целевая иерархия сцены, layout и wiring |
| 9 | `.plbx/game-design/AUTO_SCENE_ASSEMBLY_PLAN.md` | План автоматической сборки сцены и оценка подхода scene-first |
| 10 | `ARCHITECTURE.md` | Технические контракты систем, state machine, события, конфиги |
| 11 | `.plbx/game-design/IMPLEMENTATION_PHASES.md` | Пошаговая последовательность реализации |
| 12 | `.plbx/game-design/QA_CHECKLIST.md` | Функциональные, визуальные и регрессионные проверки |
| 13 | `.plbx/game-design/EXPORT_CHECKLIST.md` | Проверки playable-сборок и рекламных сетей |
| 14 | `AGENTS.md` | Правила работы агентов и ограничения |

Если документы конфликтуют, приоритет выше у документа с меньшим номером.

## 3. Текущее состояние документов

| Документ | Статус | Что сделано |
|---|---|---|
| `.plbx/game-design/GDD.md` | Создан | Детализирован сценарий `1 spin + 3 picks + payout + CTA` |
| `.plbx/game-design/OPEN_ISSUES.md` | Создан | Вынесены paytable, призы, store/CTA, auto-flow, asset gaps и template migration gaps |
| `.plbx/game-design/REFERENCE_AUDIT.md` | Создан | Зафиксированы роли `slot-game` как logic base и `other-assets` как parallel reference |
| `.plbx/game-design/ASSET_SPEC.md` | Создан | Зафиксированы найденные PNG, размеры и роли |
| `.plbx/game-design/PREFAB_STRATEGY.md` | Создан | Зафиксирован prefab-слой, список target prefabs и automation rules |
| `.plbx/game-design/ANIMATION_STRATEGY.md` | Создан | Зафиксированы `.anim` clips, generator rules и money sprites for payoff animations |
| `.plbx/game-design/SCENE_SETUP.md` | Создан | Описана целевая структура Canvas `1080×1920` |
| `.plbx/game-design/AUTO_SCENE_ASSEMBLY_PLAN.md` | Обновлён | Scene-first совмещён с template-compatible hierarchy |
| `ARCHITECTURE.md` | Обновлён | Описаны template-derived slot core, state machine, config и adapters |
| `.plbx/game-design/IMPLEMENTATION_PHASES.md` | Обновлён | Фазы начинаются с reference-аудита и template module adaptation |
| `.plbx/game-design/QA_CHECKLIST.md` | Создан | Чеклист по фазам playable |
| `.plbx/game-design/EXPORT_CHECKLIST.md` | Создан | Чеклист рекламного экспорта |
| `AGENTS.md` | Создан | Правила для coder/scene/asset/QA агентов |

## 4. Документы по фазам разработки

### 4.1. Фаза дизайна

Обязательные документы:

- `.plbx/game-design/GDD.md`
- `.plbx/game-design/OPEN_ISSUES.md`
- `GDD.md`

Цель: закрыть игровую последовательность, тексты, призы, правила idle/auto-play и CTA.

### 4.2. Фаза ассетов

Обязательные документы:

- `.plbx/game-design/REFERENCE_AUDIT.md`
- `.plbx/game-design/ASSET_SPEC.md`
- `.plbx/game-design/PREFAB_STRATEGY.md`
- `.plbx/game-design/ANIMATION_STRATEGY.md`
- `.plbx/game-design/SCENE_SETUP.md`

Цель: подготовить runtime-ассеты, отделить reference-only материалы и понять, какие решения можно переносить из template/parallel reference.

### 4.3. Фаза сцены

Обязательные документы:

- `.plbx/game-design/SCENE_SETUP.md`
- `.plbx/game-design/AUTO_SCENE_ASSEMBLY_PLAN.md`
- `ARCHITECTURE.md`

Цель: собрать стабильную template-compatible иерархию сцены и явные ссылки до подключения Save Toto state machine.

### 4.4. Фаза кода

Обязательные документы:

- `ARCHITECTURE.md`
- `.plbx/game-design/IMPLEMENTATION_PHASES.md`
- `AGENTS.md`

Цель: адаптировать slot template, затем реализовать Save Toto state machine, bonus picks, unlock sequence, payout, CTA и аналитику без поиска нод по именам.

### 4.5. Фаза проверки и экспорта

Обязательные документы:

- `.plbx/game-design/QA_CHECKLIST.md`
- `.plbx/game-design/EXPORT_CHECKLIST.md`

Цель: проверить сценарий, adaptive, CTA, store links, network constraints и вес сборки.

## 5. Правила синхронизации

1. Если меняется сценарий, сначала обновить `.plbx/game-design/GDD.md`, затем `OPEN_ISSUES.md`.
2. Если меняется состав ассетов, сначала обновить `ASSET_SPEC.md`, затем `SCENE_SETUP.md`.
3. Если меняется prefab-слой, сначала обновить `PREFAB_STRATEGY.md`, затем `SCENE_SETUP.md` и генератор/сцену.
4. Если меняются `.anim` clips или visual animation rules, сначала обновить `ANIMATION_STRATEGY.md`, затем prefabs/scene blueprint.
5. Если меняются события или состояния, синхронизировать `ARCHITECTURE.md` и `QA_CHECKLIST.md`.
6. Перед реализацией нерешённые вопросы из `OPEN_ISSUES.md` должны быть либо закрыты, либо явно приняты как допущения.

## 6. Reference policy

- `.plbx/reference/slot-game/` — базовый template логики слота.
- `.plbx/reference/other-assets/` — reference решений для VFX/audio/CTA/adaptive.
- `.plbx/reference/**` не является production runtime.

## 7. Definition of done документационной фазы

- Полный GDD описывает все стадии от intro до CTA.
- Все найденные ассеты имеют роль или пометку `reference_only`.
- Prefab strategy описывает raw asset → prefab → scene pipeline.
- Animation strategy описывает raw asset → `.anim` clip → prefab Animation component pipeline.
- Все критические неизвестные вынесены в `OPEN_ISSUES.md`.
- Template-first + scene-first подход описан как pipeline, а не как ручная сборка статичного мокапа.
- Реализационные фазы позволяют начать со сцены без хардкода runtime-логики.
