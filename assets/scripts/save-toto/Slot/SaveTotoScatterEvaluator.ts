/**
 * Save Toto — scatter-оценщик (PRIMARY bonus gate).
 *
 * Соответствие GDD §6.2, OPEN_ISSUES OI-201/OI-402: scatter-роль выполняет символ Тото.
 * Scatter-count — основной gate запуска бонуса; line wins вторичны.
 *
 * Считает scatter-символы по всему visible grid и возвращает count + позиции.
 */

import { IElementType } from '../interfaces/IElementType';
import { SaveTotoElementConfiguration } from './Elements/SaveTotoElementConfiguration';

export interface SaveTotoScatterResult {
    /** Количество scatter-символов на сетке. */
    count: number;
    /** Позиции scatter [columnIndex, rowIndex]. */
    positions: [number, number][];
    /** Достаточно ли scatter для запуска бонуса. */
    triggersBonus: boolean;
}

export class SaveTotoScatterEvaluator {
    private scatterElementId: number = 0;
    private scatterRequired: number = 3;

    public init(scatterElementId: number, scatterRequired: number): void {
        this.scatterElementId = scatterElementId;
        this.scatterRequired = Math.max(1, scatterRequired);
    }

    /**
     * Посчитать scatter по visible grid (column-major: visibleElements[columnIndex][rowIndex]).
     */
    public evaluate(visibleElements: IElementType[][]): SaveTotoScatterResult {
        const positions: [number, number][] = [];

        for (let col = 0; col < visibleElements.length; col++) {
            const column = visibleElements[col];
            if (!column) continue;
            for (let row = 0; row < column.length; row++) {
                const element = column[row];
                if (element && element.id === this.scatterElementId) {
                    positions.push([col, row]);
                }
            }
        }

        const count = positions.length;
        return {
            count,
            positions,
            triggersBonus: count >= this.scatterRequired,
        };
    }

    public getScatterElementId(): number {
        return this.scatterElementId;
    }

    public getScatterRequired(): number {
        return this.scatterRequired;
    }
}

/** Утилита: получить scatter-тип из ElementConfiguration (Toto). */
export function resolveScatterElementType(config: SaveTotoElementConfiguration): IElementType | null {
    const scatters = config.getScatterElements();
    return scatters.length > 0 ? scatters[0] : null;
}
