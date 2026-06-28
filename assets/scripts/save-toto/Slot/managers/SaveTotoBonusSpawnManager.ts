/**
 * Save Toto — менеджер спавна бонусных символов (перенесён из slot-game/Slot/managers/BonusSpawnManager.ts).
 * Случайное размещение бонусов. В Save Toto scatter-расклад scripted, поэтому этот
 * менеджер вторичен; сохранён для совместимости со template-логикой генерации колонок.
 */

import { IBonusElementType } from '../../interfaces/IElementType';
import { IBonusSpawnResult, IBonusSpawnConfig } from '../../interfaces/IBonusSpawnTypes';

export type { IBonusSpawnResult, IBonusSpawnConfig };

export class SaveTotoBonusSpawnManager {
    private bonusElements: IBonusElementType[] = [];
    private spawnConfig: IBonusSpawnConfig;
    private columnCount: number = 0;
    private totalElementsPerColumn: number = 0;

    constructor(config: IBonusSpawnConfig = {
        maxAttempts: 100,
        allowOverlap: false,
        prioritizeRareBonuses: true
    }) {
        this.spawnConfig = config;
    }

    public initialize(bonusElements: IBonusElementType[], columnCount: number, totalElementsPerColumn: number): void {
        this.bonusElements = bonusElements;
        this.columnCount = columnCount;
        this.totalElementsPerColumn = totalElementsPerColumn;
    }

    public generateBonusSpawn(): IBonusSpawnResult {
        if (this.bonusElements.length === 0) {
            return this.createEmptyResult();
        }

        const availableBonuses = this.getAvailableBonuses();
        if (availableBonuses.length === 0) {
            return this.createEmptyResult();
        }

        const selectedBonus = this.selectBonus(availableBonuses);
        const spawnPositions = this.calculateSpawnPositions(selectedBonus);

        return {
            bonusElements: Array(spawnPositions.length).fill(selectedBonus),
            spawnPositions: spawnPositions,
            totalColumnsUsed: this.getUniqueColumnsCount(spawnPositions)
        };
    }

    public generateMultipleBonuses(count: number): IBonusSpawnResult[] {
        const results: IBonusSpawnResult[] = [];
        const usedColumns = new Set<number>();
        const usedPositions = new Set<string>();

        for (let i = 0; i < count; i++) {
            const result = this.generateBonusSpawnWithConstraints(usedColumns, usedPositions);
            if (result.bonusElements.length > 0) {
                results.push(result);
                this.updateUsedConstraints(result, usedColumns, usedPositions);
            }
        }

        return results;
    }

    public validateSpawnConstraints(bonus: IBonusElementType, positions: number[]): boolean {
        const columnCounts = this.getColumnCounts(positions);

        for (const [, count] of columnCounts.entries()) {
            if (count > bonus.maxCountPerColumn) {
                return false;
            }
        }

        const uniqueColumns = columnCounts.size;
        if (uniqueColumns > bonus.maxColumnsCount) {
            return false;
        }

        return true;
    }

    public getBonusSpawnProbability(bonus: IBonusElementType): number {
        const totalWeight = this.bonusElements.reduce((sum, b) => sum + b.weight, 0);
        return totalWeight > 0 ? bonus.weight / totalWeight : 0;
    }

    private getAvailableBonuses(): IBonusElementType[] {
        return this.bonusElements.filter(bonus =>
            bonus.maxCountPerColumn > 0 &&
            bonus.maxColumnsCount > 0
        );
    }

    private selectBonus(availableBonuses: IBonusElementType[]): IBonusElementType {
        if (this.spawnConfig.prioritizeRareBonuses) {
            const sortedBonuses = [...availableBonuses].sort((a, b) => a.weight - b.weight);
            return this.selectByWeight(sortedBonuses);
        }

        return this.selectByWeight(availableBonuses);
    }

    private selectByWeight(bonuses: IBonusElementType[]): IBonusElementType {
        const totalWeight = bonuses.reduce((sum, bonus) => sum + bonus.weight, 0);
        const random = Math.random() * totalWeight;

        let currentWeight = 0;
        for (const bonus of bonuses) {
            currentWeight += bonus.weight;
            if (random <= currentWeight) {
                return bonus;
            }
        }

        return bonuses[bonuses.length - 1];
    }

    private calculateSpawnPositions(bonus: IBonusElementType): number[] {
        const positions: number[] = [];
        const maxPositions = Math.min(
            bonus.maxCountPerColumn * bonus.maxColumnsCount,
            this.columnCount * this.totalElementsPerColumn
        );

        const targetCount = this.calculateTargetCount(bonus);
        const actualCount = Math.min(targetCount, maxPositions);

        for (let attempt = 0; attempt < this.spawnConfig.maxAttempts && positions.length < actualCount; attempt++) {
            const position = this.generateRandomPosition();

            if (this.canAddPosition(position, bonus, positions)) {
                positions.push(position);
            }
        }

        return positions;
    }

    private calculateTargetCount(bonus: IBonusElementType): number {
        const baseCount = Math.floor(bonus.maxCountPerColumn * bonus.maxColumnsCount * 0.7);
        const randomFactor = 0.5 + Math.random() * 0.5;
        return Math.max(1, Math.floor(baseCount * randomFactor));
    }

    private generateRandomPosition(): number {
        const column = Math.floor(Math.random() * this.columnCount);
        const element = Math.floor(Math.random() * this.totalElementsPerColumn);
        return column * this.totalElementsPerColumn + element;
    }

    private canAddPosition(position: number, bonus: IBonusElementType, existingPositions: number[]): boolean {
        const allPositions = [...existingPositions, position];

        if (!this.validateSpawnConstraints(bonus, allPositions)) {
            return false;
        }

        if (!this.spawnConfig.allowOverlap && existingPositions.indexOf(position) !== -1) {
            return false;
        }

        return true;
    }

    private generateBonusSpawnWithConstraints(usedColumns: Set<number>, usedPositions: Set<string>): IBonusSpawnResult {
        const availableBonuses = this.bonusElements.filter(bonus => {
            const remainingColumns = this.columnCount - usedColumns.size;
            return bonus.maxColumnsCount <= remainingColumns;
        });

        if (availableBonuses.length === 0) {
            return this.createEmptyResult();
        }

        const selectedBonus = this.selectBonus(availableBonuses);
        const positions = this.calculateConstrainedPositions(selectedBonus, usedColumns, usedPositions);

        return {
            bonusElements: Array(positions.length).fill(selectedBonus),
            spawnPositions: positions,
            totalColumnsUsed: this.getUniqueColumnsCount(positions)
        };
    }

    private calculateConstrainedPositions(bonus: IBonusElementType, usedColumns: Set<number>, usedPositions: Set<string>): number[] {
        const positions: number[] = [];
        const availableColumns = Array.from({ length: this.columnCount }, (_, i) => i)
            .filter(col => !usedColumns.has(col));

        const targetCount = Math.min(
            bonus.maxCountPerColumn * Math.min(bonus.maxColumnsCount, availableColumns.length),
            bonus.maxCountPerColumn * bonus.maxColumnsCount
        );

        for (let i = 0; i < targetCount && positions.length < targetCount; i++) {
            const column = availableColumns[Math.floor(Math.random() * availableColumns.length)];
            const element = Math.floor(Math.random() * this.totalElementsPerColumn);
            const position = column * this.totalElementsPerColumn + element;
            const positionKey = `${column}-${element}`;

            if (!usedPositions.has(positionKey) && this.canAddPosition(position, bonus, positions)) {
                positions.push(position);
            }
        }

        return positions;
    }

    private updateUsedConstraints(result: IBonusSpawnResult, usedColumns: Set<number>, usedPositions: Set<string>): void {
        result.spawnPositions.forEach(position => {
            const column = Math.floor(position / this.totalElementsPerColumn);
            const element = position % this.totalElementsPerColumn;

            usedColumns.add(column);
            usedPositions.add(`${column}-${element}`);
        });
    }

    private getColumnCounts(positions: number[]): Map<number, number> {
        const counts = new Map<number, number>();

        positions.forEach(position => {
            const column = Math.floor(position / this.totalElementsPerColumn);
            counts.set(column, (counts.get(column) || 0) + 1);
        });

        return counts;
    }

    private getUniqueColumnsCount(positions: number[]): number {
        const columns = new Set<number>();
        positions.forEach(position => {
            columns.add(Math.floor(position / this.totalElementsPerColumn));
        });
        return columns.size;
    }

    private createEmptyResult(): IBonusSpawnResult {
        return {
            bonusElements: [],
            spawnPositions: [],
            totalColumnsUsed: 0
        };
    }
}
