/**
 * Save Toto — базовые типы данных.
 *
 * Источник контрактов: ARCHITECTURE.md §8 (config), GDD §5–§6, OPEN_ISSUES.md OI-201.
 *
 * Идентификаторы кода — English; идентификаторы символов/наград соответствуют
 * ролям из GDD. Scatter-роль выполняет символ Тото (OI-201).
 */

/** Идентификаторы символов барабана Save Toto (5×3). */
export enum SaveTotoSymbolId {
    /** Low-pay Oz-символ (assets/art/slot/symbol-oz.png). */
    OZ = 0,
    /** Тематический символ-ключ (assets/art/slot/symbol-key.png). MVP: обычный символ. */
    KEY = 1,
    /** Тематический символ-капля (assets/art/slot/symbol-drop.png). */
    DROP = 2,
    /** Корзина (assets/art/slot/symbol-basket.png). Обычный/декоративный символ. */
    BASKET = 3,
    /** Тото — scatter-символ, триггер бонуса (assets/art/slot/symbol-toto.png). OI-201. */
    TOTO = 4,
}

/** Тип награды, вскрываемой в корзине бонус-фазы. */
export enum SaveTotoRewardKind {
    /** Кредитный приз. */
    CREDIT = 0,
    /** Множитель, применяемый к сумме credit-наград. */
    MULTIPLIER = 1,
}

/** Scripted награда, привязанная к индексу выбора (pickIndex), а не к позиции корзины. */
export interface SaveTotoBonusReward {
    /** 0-based индекс выбора (0 — первый pick, 1 — второй, 2 — третий). */
    pickIndex: number;
    /** Идентификатор награды для аналитики (rewardId). */
    rewardId: string;
    /** Тип награды. */
    kind: SaveTotoRewardKind;
    /** Числовое значение: credit-сумма или множитель. */
    value: number;
    /** Короткий текстовый лейбл для floating reward / label. */
    label: string;
}

/** Позиция символа на сетке [columnIndex, rowIndex] (0-based). */
export type SaveTotoReelCell = [number, number];

/**
 * Scripted расклад первого (и единственного) спина.
 * Формат — column-major: `result[columnIndex][rowIndex]` — совместим с
 * `SlotController.getAllVisibleElements()` из template.
 *
 * Источник расклада: SCENE_SETUP.md §6 (3 scatter Тото в любой позиции).
 */
export type SaveTotoScriptedReelResult = SaveTotoSymbolId[][];

/** Порядок снятия замков (left → center → right). OI-202. */
export type SaveTotoLockId = 'left' | 'center' | 'right';

/** Уровень огня: F4 (максимум) → F0 (потух). */
export type SaveTotoFireLevel = 0 | 1 | 2 | 3 | 4;
