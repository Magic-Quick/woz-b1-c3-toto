---
document_type: "qa_checklist"
project_id: "WOZ_B1_C3_SaveToto"
language: "ru"
version: "1.1.0"
status: "script_tween_layer_done_anim_migration_pending"
date: "2026-06-29"
---

# QA checklist `Save Toto`

## 1. Старт и сцена

- [ ] Сцена открывается без ошибок.
- [ ] `.plbx/reference/scene.png` не используется как runtime background.
- [ ] Фон заполняет экран без пустых краёв.
- [ ] Логотип виден в safe area.
- [ ] Клетка, Тото, 3 замка и огонь видны на первом кадре.
- [ ] Reel 5×3 виден и не перекрыт HUD.
- [ ] `WIN`, balance и `SPIN` читаются.

## 2. SPIN-фаза

- [ ] `SPIN` пульсирует в `SpinReady`.
- [ ] Первый tap запускает spin.
- [ ] Повторные taps во время spin игнорируются.
- [ ] Reels останавливаются слева направо.
- [ ] Финальный расклад содержит минимум 3 scatter-символа Тото.
- [ ] Scatter подсвечиваются перед bonus.

## 3. Bonus-фаза

- [ ] Появляется 6 корзин.
- [ ] Инструкция к выбору видна и короткая.
- [ ] Tap по корзине открывает только одну корзину.
- [ ] Повторный tap по открытой корзине игнорируется.
- [ ] Reward определяется по номеру выбора, а не по позиции.
- [ ] После каждого pick input блокируется до конца unlock sequence.

## 4. Замки, огонь и Тото

- [ ] На старте видны 3 замка.
- [ ] Pick 1 снимает левый замок.
- [ ] Pick 2 снимает центральный замок.
- [ ] Pick 3 снимает правый замок.
- [ ] Огонь снижается после каждого снятия замка.
- [ ] После третьего замка запускается понятный переход в packshot; door-swing клетки не ожидается.
- [ ] Тото визуально освобождён/счастлив в payoff.

## 5. Payout и end-card

- [ ] Balance/final value докручивается; `WIN` остаётся фиксированным visual label.
- [ ] Payoff сопровождается glow/coin/positive FX.
- [ ] End-card появляется после payout.
- [ ] CTA виден, крупный и находится в safe area.
- [ ] Tap по CTA вызывает store adapter.
- [ ] Повторный tap не вызывает несколько redirect одновременно.

## 6. Idle / auto-flow

- [ ] Auto-spin выключен в MVP.
- [ ] Auto-pick выключен в MVP.
- [ ] Pulse/hint не нарушают animation lock.
- [ ] Playable не ломается при бездействии.

## 7. Адаптив и читаемость

- [ ] Портрет `9:16` читается.
- [ ] Узкий портрет не обрезает CTA.
- [ ] Высокий портрет не создаёт критичные пустоты.
- [ ] Горизонтальная ориентация либо поддержана, либо корректно letterbox/crop.
- [ ] Важные элементы не попадают под safe-area/notch.

## 8. Регрессии scene-first

- [ ] Runtime не использует `find()` для gameplay-нод.
- [ ] Все ссылки Bootstrap заполнены явно.
- [ ] Повторная генерация сцены не ломает ручные runtime файлы.
- [ ] Layout правится через blueprint/config, а не gameplay code.
- [ ] Нет ручных `.meta`.

## 9. Производительность

- [ ] Первый кадр появляется без заметной задержки.
- [ ] Spin и unlock sequence не проседают по FPS.
- [ ] Большие reference assets не попали в production bundle.
- [ ] Нет бесконечных tweens после EndCard.
- [ ] Нет ошибок в console на happy path.

## 10. Аналитика

- [ ] `game_start` отправляется один раз.
- [ ] `spin_click` отправляется один раз на пользовательский spin.
- [ ] `bonus_start` отправляется после scatter.
- [ ] `basket_pick` отправляется для каждого из 3 picks.
- [ ] `toto_freed` отправляется один раз.
- [ ] `cta_shown` отправляется один раз.
- [ ] `cta_click` отправляется перед redirect.

## 11. Проверка template migration

- [ ] Production code не импортирует напрямую из `.plbx/reference/**`.
- [ ] Slot core работает с 5 колонками и 3 видимыми рядами.
- [ ] Forced spin даёт scripted scatter result.
- [ ] Bonus запускается от scatter-count по символу Тото, а не от generic line win.
- [ ] Generic template CTA-after-spins отключён.
- [ ] CTA появляется только после `Toto freed` и payout.
- [ ] `SpinButton` блокируется во время spin/animation lock.
- [ ] Reference assets не попали в production bundle.
- [ ] Production prefabs находятся в `assets/prefabs/save-toto/**`.
- [ ] Basket/Lock/Symbol/CTA prefabs не зависят от `.plbx/reference/**`.


## 12. Проверка prefab strategy

- [ ] `SaveTotoBasket.prefab` используется для 6 basket instances.
- [ ] `SaveTotoLock.prefab` или equivalent lock prefab/view используется для 3 замков.
- [ ] Slot symbol prefabs подключены в `ElementConfiguration`.
- [ ] `SaveTotoCtaButton.prefab` активен только на EndCard.
- [ ] `.meta` для prefabs созданы Cocos/editor workflow, не вручную.


## 13. Проверка animation strategy

### 13a. Script-tween layer (OI-506a — Done)

- [x] `SaveTotoAutoPulse` на SpinButton + Basket_01..06 (idle pulse).
- [x] `SaveTotoAutoFloat` на TotoHead + TotoTongue (idle float).
- [x] `SaveTotoBasketSelectedAnimation` на Basket_01..06 (event-driven selection).
- [x] `SaveTotoLockOpenRemoveAnimation` на LockLeft/Center/Right (event-driven unlock).
- [x] `SaveTotoPackshotIntroAnimation` на CageRoot (event-driven packshot).
- [x] `SaveTotoCtaPulseAnimation` на PlayNowButton (EndCard, explicit play).
- [x] View-methods используют pattern «component-if-present → fallback tween».
- [x] `SaveTotoStateMachine` не содержит hardcoded visual tween curves.
- [x] Money sprites лежат в `assets/art/fx/money/**` и `assets/art/ui/rewards/**`, не в `.plbx/reference/**`.

### 13b. `.anim` clip migration (OI-506b — Pending)

- [ ] `.anim` `AnimationClip` assets находятся в `assets/animations/save-toto/**`.
- [ ] `.anim.meta` созданы Cocos/editor workflow, не вручную.
- [ ] `Animation` component + clip refs на prefabs.
- [ ] `view.playX()` вызывает `Animation.play()`, не script-tween.
- [ ] `fire_level_*`, `money_*_pop`, `floating_reward_in`, `glow_pulse`, `cta_intro`, `logo_cta_fade`, `toto_happy` clips реализованы.
