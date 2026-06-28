---
document_type: "export_checklist"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.0.0"
status: "draft"
date: "2026-06-28"
---

# Export checklist `Save Toto`

## 1. Перед сборкой

- [ ] Все критичные `OPEN_ISSUES.md` закрыты или приняты как допущения.
- [ ] Store URLs заданы для нужных платформ.
- [ ] Store adapter не зависит от reference-only `slot-game` или `other-assets` paths.
- [ ] CTA label утверждён.
- [ ] CTA активен только как button, tap-anywhere выключен.
- [ ] `.plbx/reference/scene.png` исключён из production bundle, если используется только как reference.
- [ ] `.plbx/reference/**` исключён из production bundle.
- [ ] `.plbx/reference/other-assets` audio/VFX assets не скопированы в production без отдельного решения.
- [ ] Production prefabs находятся в `assets/prefabs/save-toto/**`.
- [ ] Нет ручных `.meta`.
- [ ] Нет временных debug overlays.
- [ ] Нет production `console.log`.

## 2. Playable flow

- [ ] Playable запускается без сети.
- [ ] Первый кадр показывает понятную сцену.
- [ ] Пользователь может завершить flow за 4 taps.
- [ ] Idle auto-flow выключен в MVP или явно разрешён network QA перед export.
- [ ] Fail-финал отсутствует.
- [ ] End-card всегда показывает CTA.

## 3. Рекламные сети

| Проверка | Статус |
|---|---|
| CTA использует network-compatible redirect adapter | [ ] |
| AppLovin/MRAID adapter проверен, если нужен | [ ] |
| Mintegral naming/zip structure проверены, если нужен | [ ] |
| Store redirect не вызывается до user action, если сеть это требует | [ ] |
| Audio не обязателен для понимания flow | [ ] |

## 4. Размер и ассеты

- [ ] Bundle size в целевом лимите сети.
- [ ] PNG оптимизированы после финального visual QA.
- [ ] Неиспользуемые ассеты удалены из production build.
- [ ] Fonts включены только нужные.
- [ ] Texture compression не ломает логотип, WIN, SPIN и символы.

## 5. Финальная проверка

- [ ] Проверен iOS Safari/WebView сценарий.
- [ ] Проверен Android Chrome/WebView сценарий.
- [ ] Проверен быстрый tap spam.
- [ ] Проверен idle до end-card.
- [ ] Проверена повторная загрузка playable.
- [ ] Финальный архив/папка названы по требованиям кампании.
