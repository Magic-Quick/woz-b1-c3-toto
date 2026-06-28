/**
 * Save Toto — контракты view-слоя.
 *
 * Источник: ARCHITECTURE.md §9 (View API contract).
 *
 * Контракт разделения ответственности: state machine и systems вызывают только
 * методы view-интерфейсов; визуальные tween-кривые живут в `.anim`/prefabs,
 * а не в бизнес-логике (ARCHITECTURE.md §13, §15).
 *
 * Эти интерфейсы — TypeScript-контракты, реализуемые конкретными view-компонентами
 * (например SaveTotoThreatView). State machine зависит от интерфейсов, не от классов.
 */

import { Node } from 'cc';
import {
    SaveTotoBonusReward,
    SaveTotoFireLevel,
    SaveTotoScriptedReelResult,
} from '../types';

/**
 * Threat-слой: клетка, Тото, замки, огонь, packshot transition.
 * Клетка остаётся one-piece asset; door-swing отсутствует в MVP (OI-104).
 */
export interface SaveTotoThreatView {
    /** Установить уровень огня (3 — максимум, 0 — потух). */
    setFireLevel(level: SaveTotoFireLevel): void;

    /** Снять один замок по индексу; возвращает Promise, резолвящийся по завершении анимации. */
    removeLock(index: number): Promise<void>;

    /** Переход в packshot после снятия последнего замка. Клетка НЕ открывается дверцей. */
    playPackshotTransition(): Promise<void>;

    /** Показать освобождённого Тото (выпрыгивание/свет). */
    playTotoFreed(): Promise<void>;
}

/**
 * Slot-слой: reel 5×3, баланс, WIN, подсветка scatter.
 * `WIN` — фиксированный visual label, не главный counter (OI-204).
 */
export interface SaveTotoSlotView {
    /** Показать начальный (idle) расклад барабанов. */
    showIdleReel(result: SaveTotoScriptedReelResult): void;

    /** Запустить анимацию вращения к scripted результату. */
    playSpinToResult(result: SaveTotoScriptedReelResult): Promise<void>;

    /** Подсветить scatter-символы Тото на финальном раскладе. */
    highlightScatters(): Promise<void>;

    /** Количество scatter-символов на текущем раскладе. */
    getScatterCount(): number;

    /** Установить текущее значение баланса (без анимации). */
    setBalanceValue(value: number): void;

    /** Докрутить баланс до target за указанную длительность. */
    countBalanceTo(value: number, durationSeconds: number): Promise<void>;
}

/**
 * Bonus-слой: сетка 6 корзин, 3 выбора, floating reward.
 * Не выбранные корзины остаются закрытыми (OI-006).
 */
export interface SaveTotoBonusView {
    /** Показать сетку корзин с idle pulse. */
    showBaskets(): Promise<void>;

    /** Скрыть сетку корзин. */
    hideBaskets(): Promise<void>;

    /** Включить/выключить интерактивность конкретной корзины. */
    setBasketEnabled(index: number, enabled: boolean): void;

    /** Открыть корзину и показать scripted reward; резолвится по завершении анимации. */
    openBasket(index: number, reward: SaveTotoBonusReward): Promise<void>;

    /** Anchor-нода корзины (для FX flight/спавна). */
    getBasketAnchor(index: number): Node;
}

/**
 * HUD-слой: SPIN и CTA кнопки.
 */
export interface SaveTotoHudView {
    /** Показать/активировать SPIN-кнопку (с idle pulse). */
    showSpinButton(active: boolean): void;

    /** Показать/активировать CTA-кнопку (только после Payout). */
    showCtaButton(active: boolean): void;
}
