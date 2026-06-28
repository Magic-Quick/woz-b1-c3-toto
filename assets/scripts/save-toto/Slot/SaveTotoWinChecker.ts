/**
 * Save Toto — проверка line-wins (перенесён и адаптирован под 5×3 из slot-game/Slot/WinChecker.ts).
 *
 * АДАПТАЦИЯ: winLines расширены до 5 колонок (3 горизонтальные + 2 диагонали).
 * В Save Toto line-wins ВТОРИЧНЫ (scatter-count — основной gate, см. SaveTotoScatterEvaluator).
 * Оставлен для optional визуальных wins и совместимости с template RewardController.
 */

import { IElementType } from '../interfaces/IElementType';
import { IWinLine, IWinResult } from '../interfaces/IWinTypes';
import { SaveTotoElementConfiguration } from './Elements/SaveTotoElementConfiguration';

export class SaveTotoWinChecker {
    /** Выигрышные линии для сетки 5×3. */
    private readonly winLines: IWinLine[] = [
        { positions: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] }, // верхняя горизонталь
        { positions: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] }, // средняя горизонталь
        { positions: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]] }, // нижняя горизонталь
        { positions: [[0, 0], [1, 1], [2, 2]] }, // диагональ ↘
        { positions: [[0, 2], [1, 1], [2, 0]] }, // диагональ ↗
    ];

    private elementTypes: IElementType[] = [];
    private elementConfiguration: SaveTotoElementConfiguration | null = null;

    public init(elementTypes: IElementType[], elementConfiguration: SaveTotoElementConfiguration): void {
        this.elementTypes = elementTypes;
        this.elementConfiguration = elementConfiguration;
    }

    public checkWinLines(visibleElements: IElementType[][]): IWinResult[] {
        return this.winLines
            .map((winLine, lineIndex) => this.checkLine(winLine, lineIndex, visibleElements))
            .filter(Boolean) as IWinResult[];
    }

    private checkLine(winLine: IWinLine, lineIndex: number, visibleElements: IElementType[][]): IWinResult | null {
        const lineElements = winLine.positions
            .map(([col, elem]) => visibleElements[col]?.[elem])
            .filter(Boolean);

        if (lineElements.length < 3) return null;

        const { baseElementId, matchCount } = this.findBaseElementAndMatchCount(lineElements);

        return matchCount >= 3 ? {
            lineIndex,
            elementId: baseElementId,
            matchCount,
            winValue: this.calculateWinValue(baseElementId, matchCount)
        } : null;
    }

    private findBaseElementAndMatchCount(lineElements: IElementType[]): { baseElementId: number, matchCount: number } {
        let baseElementId = -1;
        let matchCount = 0;
        let hasOnlyWilds = true;
        let firstWildId: number | null = null;

        for (let i = 0; i < lineElements.length; i++) {
            const currentElement = lineElements[i];
            const currentId = currentElement.id;
            const isWild = this.isWildSymbol(currentId);

            if (isWild) {
                matchCount++;
                if (firstWildId === null) {
                    firstWildId = currentId;
                }
                continue;
            }

            hasOnlyWilds = false;

            if (baseElementId === -1) {
                baseElementId = currentId;
                matchCount++;
                continue;
            }

            if (currentId === baseElementId) {
                matchCount++;
            } else {
                break;
            }
        }

        if (hasOnlyWilds && baseElementId === -1 && firstWildId !== null) {
            baseElementId = firstWildId;
        }

        return { baseElementId, matchCount };
    }

    private calculateWinValue(elementId: number, matchCount: number): number {
        if (this.elementConfiguration) {
            const bonusElement = this.elementConfiguration.getBonusElementById(elementId);
            if (bonusElement) {
                return bonusElement.value * matchCount;
            }
        }

        const elementType = this.elementTypes.find(e => e.id === elementId);
        return elementType ? elementType.value * matchCount : 0;
    }

    public getWinLinePositions(lineIndex: number): [number, number][] {
        return this.winLines[lineIndex]?.positions || [];
    }

    public isWildSymbol(elementId: number): boolean {
        if (!this.elementConfiguration) {
            return elementId === -1;
        }

        const bonusElement = this.elementConfiguration.getBonusElementById(elementId);
        return bonusElement ? bonusElement.isWild : false;
    }

    public getWildSymbolIds(): number[] {
        if (!this.elementConfiguration) {
            return [-1];
        }

        return this.elementConfiguration.getWildElements().map(element => element.id);
    }
}
