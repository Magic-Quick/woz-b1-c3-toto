/**
 * Save Toto — реестр имён событий.
 *
 * Источник контракта: ARCHITECTURE.md §10.
 * Включает как глобальные Save Toto события (state machine → analytics/input),
 * так и внутренние template-сигналы slot core (необходимые для миграции).
 */

/**
 * Глобальные события Save Toto (state machine / аналитика / input).
 * Direction — направление потока по ARCHITECTURE.md §10.
 */
export const SaveTotoEvents = {
    /** system → analytics. Игровой цикл стартовал. */
    EVT_GAME_START: 'save-toto:game-start',

    /** state → analytics. Показ угрозы (intro). */
    EVT_INTRO_SHOWN: 'save-toto:intro-shown',

    /** input → state. Игрок нажал SPIN. */
    EVT_SPIN_CLICK: 'save-toto:spin-click',

    /** template → state/audio. Колонки начали движение. */
    EVT_TEMPLATE_SPIN_STARTED: 'save-toto:template-spin-started',

    /** template → state. Спин завершён; visibleElements + scatterCount доступны. */
    EVT_TEMPLATE_SPIN_COMPLETE: 'save-toto:template-spin-complete',

    /** state → analytics. Зафиксирован результат спина (3 scatter). */
    EVT_SPIN_RESULT: 'save-toto:spin-result',

    /** state → analytics. Бонус-фаза стартовала (сетка корзин показана). */
    EVT_BONUS_START: 'save-toto:bonus-start',

    /** input → state. Игрок выбрал корзину. */
    EVT_BASKET_PICK: 'save-toto:basket-pick',

    /** bonus → analytics. Награда из корзины раскрыта. */
    EVT_REWARD_REVEALED: 'save-toto:reward-revealed',

    /** threat → analytics. Замок снят. */
    EVT_LOCK_REMOVED: 'save-toto:lock-removed',

    /** threat → analytics. Огонь снижен. */
    EVT_FIRE_LEVEL_CHANGED: 'save-toto:fire-level-changed',

    /** threat → analytics. Тото освобождён (packshot transition). */
    EVT_TOTO_FREED: 'save-toto:toto-freed',

    /** state → analytics. Balance/final value counter стартовал. */
    EVT_BALANCE_COUNT_START: 'save-toto:balance-count-start',

    /** state → analytics. Balance/final value counter завершён. */
    EVT_BALANCE_COUNT_COMPLETE: 'save-toto:balance-count-complete',

    /** state → analytics. End-card показан. */
    EVT_CTA_SHOWN: 'save-toto:cta-shown',

    /** input → store. CTA button tap. */
    EVT_CTA_CLICK: 'save-toto:cta-click',
} as const;

/**
 * Внутренние события slot template core (перенесены из slot-game/GameEvents.ts).
 * Используются для оркестрации колонок и остаются внутренним сигналом reel core;
 * глобальные переходы выполняются только через SaveTotoStateMachine.
 */
export const SaveTotoSlotEvents = {
    /** Колонка остановилась. */
    COLUMN_MOVEMENT_COMPLETE: 'save-toto:column-movement-complete',

    /** Спин завершён (все колонки остановились). Внутренний сигнал reel core. */
    SPIN_COMPLETE: 'save-toto:spin-complete',

    /** Обнаружен line-win (вторичен в Save Toto; scatter — основной gate). */
    WIN_DETECTED: 'save-toto:win-detected',

    /** Количество спинов изменилось. */
    SPINS_UPDATED: 'save-toto:spins-updated',

    /** Доступность спинов изменилась. */
    SPINS_AVAILABILITY_CHANGED: 'save-toto:spins-availability-changed',

    /** Награда изменилась. */
    REWARD_UPDATED: 'save-toto:reward-updated',

    /** Общая награда изменилась. */
    REWARD_TOTAL_CHANGED: 'save-toto:reward-total-changed',
} as const;
