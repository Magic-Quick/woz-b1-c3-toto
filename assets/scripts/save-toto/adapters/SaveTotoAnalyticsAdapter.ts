/**
 * Save Toto — analytics adapter (ARCHITECTURE.md §10).
 *
 * Перенаправляет события аналитики. Non-blocking: ошибки аналитики не должны
 * блокировать playable (ARCHITECTURE.md §13). MVP логирует в консоль;
 * production подключает network SDK через ту же поверхность.
 */

import { createSaveTotoLogger } from '../common/SaveTotoLogger';

export interface SaveTotoAnalyticsEvent {
    name: string;
    payload?: Record<string, any>;
}

export class SaveTotoAnalyticsAdapter {
    private logger = createSaveTotoLogger('Analytics');
    private sentCount: number = 0;
    private onceEvents: Set<string> = new Set();

    /** Отправить событие аналитики. */
    public send(event: SaveTotoAnalyticsEvent): void {
        try {
            // Production hook: здесь можно вызвать network SDK.
            this.logger.debug(`analytics: ${event.name}`, event.payload ?? {});
            this.sentCount++;
        } catch (e) {
            // Non-blocking.
            this.logger.warn(`analytics send failed for ${event.name}`);
        }
    }

    /**
     * Отправить событие ровно один раз за сессию (для game_start, toto_freed, cta_shown и т.д.).
     */
    public sendOnce(event: SaveTotoAnalyticsEvent): void {
        if (this.onceEvents.has(event.name)) {
            return;
        }
        this.onceEvents.add(event.name);
        this.send(event);
    }

    public getSentCount(): number {
        return this.sentCount;
    }
}
