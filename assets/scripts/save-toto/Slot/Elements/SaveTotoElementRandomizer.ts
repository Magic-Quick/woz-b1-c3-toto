/**
 * Save Toto — рандомизатор элементов (перенесён из slot-game/Slot/Elements/ElementRandomizer.ts).
 * Взвешенный выбор; weight = 0 не спавнится в обычных спинах (используется forced spawn).
 */

import { IElementType, IVisibleElementsConfig, IBonusElementType } from '../../interfaces/IElementType';
import { IBonusSpawnResult } from '../../interfaces/IBonusSpawnTypes';
import { SaveTotoBonusSpawnManager } from '../managers/SaveTotoBonusSpawnManager';

export class SaveTotoElementRandomizer {
    private weightCache: Map<IElementType, number> = new Map();
    private totalWeightSum: number = 0;
    private bonusSpawnManager: SaveTotoBonusSpawnManager = new SaveTotoBonusSpawnManager();

    private updateWeightCache(elementTypes: IElementType[]): void {
        this.weightCache.clear();
        this.totalWeightSum = 0;
        for (const element of elementTypes) {
            this.weightCache.set(element, this.totalWeightSum);
            this.totalWeightSum += element.weight;
        }
    }

    public getRandomElement(elementTypes: IElementType[]): IElementType {
        const validElements = elementTypes.filter(element => element.weight > 0);

        if (validElements.length === 0) {
            console.warn('[SaveToto] No elements with weight > 0 available for spawning');
            return elementTypes[0] || { id: 0, prefab: null, weight: 1, value: 0 };
        }

        if (validElements.length === 1) return validElements[0];

        this.updateWeightCache(validElements);
        const random = Math.random() * this.totalWeightSum;

        for (const element of validElements) {
            const cumulativeWeight = this.weightCache.get(element) || 0;
            if (random <= cumulativeWeight + element.weight) {
                return element;
            }
        }

        return validElements[validElements.length - 1];
    }

    public getRandomElementWithoutWeight(elementTypes: IElementType[]): IElementType {
        if (elementTypes.length <= 1) return elementTypes[0] || { id: 0, prefab: null, weight: 1, value: 0 };

        const randomIndex = Math.floor(Math.random() * elementTypes.length);
        return elementTypes[randomIndex];
    }

    public getRandomElements(count: number, elementTypes: IElementType[], allowDuplicates: boolean = true): IElementType[] {
        if (count <= 0) return [];

        const validElements = elementTypes.filter(element => element.weight > 0);

        if (validElements.length === 0) {
            console.warn('[SaveToto] No elements with weight > 0 available for random selection');
            return [];
        }

        const result: IElementType[] = [];
        if (allowDuplicates) {
            for (let i = 0; i < count; i++) {
                result.push(this.getRandomElement(validElements));
            }
        } else {
            const shuffled = [...validElements].sort(() => Math.random() - 0.5);
            result.push(...shuffled.slice(0, Math.min(count, validElements.length)));
        }
        return result;
    }

    public generateColumnElements(config: IVisibleElementsConfig, elementTypes: IElementType[], totalElementsCount: number): IElementType[] {
        const result: IElementType[] = [];
        const validElements = elementTypes.filter(element => element.weight > 0);

        if (validElements.length === 0) {
            console.warn('[SaveToto] No elements with weight > 0 available for column generation');
            return [];
        }

        for (let i = totalElementsCount - 1; i >= 0; i--) {
            const isVisibleElement = i >= (totalElementsCount - config.count);

            if (isVisibleElement && config.specificElements?.length > 0) {
                const specificIndex = config.specificElements.length - 1 - (i - (totalElementsCount - config.count));
                const element = config.specificElements[specificIndex] || this.getRandomElement(validElements);
                result.unshift(element);
            } else if (isVisibleElement) {
                result.unshift(this.getRandomElement(validElements));
            } else {
                result.unshift(this.getRandomElementWithoutWeight(validElements));
            }
        }
        return result;
    }

    public generateWinCombination(elementTypes: IElementType[], columnCount: number = 5): IElementType[] {
        const validElements = elementTypes.filter(element => element.weight > 0);

        if (validElements.length === 0) {
            console.warn('[SaveToto] No elements with weight > 0 available for win combination');
            return [];
        }

        const luckyElement = this.getRandomElement(validElements);
        return Array(columnCount).fill(luckyElement);
    }

    public isWinningCombination(combination: IElementType[]): boolean {
        return combination.length > 1 && combination.every(element => element.id === combination[0].id);
    }

    public calculateWinValue(combination: IElementType[]): number {
        return this.isWinningCombination(combination) ? combination[0].value * combination.length : 0;
    }

    public initializeBonusSpawnManager(bonusElements: IBonusElementType[], columnCount: number, totalElementsPerColumn: number): void {
        this.bonusSpawnManager.initialize(bonusElements, columnCount, totalElementsPerColumn);
    }

    public generateBonusSpawn(): IBonusSpawnResult {
        return this.bonusSpawnManager.generateBonusSpawn();
    }

    public generateMultipleBonuses(count: number): IBonusSpawnResult[] {
        return this.bonusSpawnManager.generateMultipleBonuses(count);
    }

    public generateColumnElementsWithBonuses(
        config: IVisibleElementsConfig,
        elementTypes: IElementType[],
        bonusElements: IBonusElementType[],
        totalElementsCount: number,
        columnIndex: number,
        columnCount: number
    ): IElementType[] {
        const validElements = elementTypes.filter(element => element.weight > 0);

        if (validElements.length === 0) {
            console.warn('[SaveToto] No elements with weight > 0 available for column generation with bonuses');
            return [];
        }

        const baseElements = this.generateColumnElements(config, validElements, totalElementsCount);

        if (bonusElements.length === 0) {
            return baseElements;
        }

        this.bonusSpawnManager.initialize(bonusElements, columnCount, totalElementsCount);
        const bonusSpawn = this.bonusSpawnManager.generateBonusSpawn();

        if (bonusSpawn.bonusElements.length === 0) {
            return baseElements;
        }

        const elementsWithBonuses = [...baseElements];

        bonusSpawn.spawnPositions.forEach((position, index) => {
            const column = Math.floor(position / totalElementsCount);
            const elementIndex = position % totalElementsCount;

            if (column === columnIndex && elementIndex < elementsWithBonuses.length) {
                elementsWithBonuses[elementIndex] = bonusSpawn.bonusElements[index];
            }
        });

        return elementsWithBonuses;
    }

    public validateBonusConstraints(bonus: IBonusElementType, positions: number[]): boolean {
        return this.bonusSpawnManager.validateSpawnConstraints(bonus, positions);
    }

    public getBonusProbability(bonus: IBonusElementType): number {
        return this.bonusSpawnManager.getBonusSpawnProbability(bonus);
    }
}
