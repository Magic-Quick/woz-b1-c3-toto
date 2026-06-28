/**
 * Save Toto — конфигурация элементов (перенесена из slot-game/Slot/Elements/ElementConfiguration.ts).
 * @ccclass переименованы: ElementType → SaveTotoElementType, BonusElementType → SaveTotoBonusElementType,
 * ElementConfiguration → SaveTotoElementConfiguration.
 */

import { _decorator, Component, Prefab, CCFloat, CCInteger } from 'cc';
import { IElementType, IVisibleElementsConfig, IBonusElementType } from '../../interfaces/IElementType';

const { ccclass, property } = _decorator;

export type { IElementType, IVisibleElementsConfig, IBonusElementType };

@ccclass('SaveTotoElementType')
export class SaveTotoElementType implements IElementType {
    @property({ type: CCInteger })
    public id: number = 0;

    @property({ type: Prefab })
    public prefab: Prefab = null;

    @property({ type: CCFloat })
    public weight: number = 1;

    @property({ type: CCFloat })
    public value: number = 0;
}

@ccclass('SaveTotoBonusElementType')
export class SaveTotoBonusElementType implements IBonusElementType {
    @property({ type: CCInteger })
    public id: number = 0;

    @property({ type: Prefab })
    public prefab: Prefab = null;

    @property({ type: CCFloat })
    public weight: number = 1;

    @property({ type: CCFloat })
    public value: number = 0;

    @property
    public isScatter: boolean = false;

    @property
    public isWild: boolean = false;

    @property({ type: CCInteger })
    public maxCountPerColumn: number = 1;

    @property({ type: CCInteger })
    public maxColumnsCount: number = 1;
}

@ccclass('SaveTotoElementConfiguration')
export class SaveTotoElementConfiguration extends Component {
    @property({ type: [SaveTotoElementType] })
    public elementTypes: SaveTotoElementType[] = [];

    @property({ type: [SaveTotoBonusElementType] })
    public bonusElementTypes: SaveTotoBonusElementType[] = [];

    @property({ type: [Object] })
    public columnVisibleConfig: IVisibleElementsConfig[] = [];

    public defaultVisibleElementsCount: number = 3;

    @property
    public randomizeNonVisibleElements: boolean = true;

    public totalElementsPerColumn: number = 10;

    public getVisibleElementsConfig(columnIndex: number): IVisibleElementsConfig {
        if (columnIndex < this.columnVisibleConfig.length) {
            return this.columnVisibleConfig[columnIndex];
        }

        return {
            count: this.defaultVisibleElementsCount,
            useRandomization: true
        };
    }

    public getElementById(id: number): SaveTotoElementType | null {
        return this.elementTypes.find(element => element.id === id) || null;
    }

    public getAllElementTypes(): SaveTotoElementType[] {
        return this.elementTypes;
    }

    public getBonusElementById(id: number): SaveTotoBonusElementType | null {
        return this.bonusElementTypes.find(element => element.id === id) || null;
    }

    public getAllBonusElementTypes(): SaveTotoBonusElementType[] {
        return this.bonusElementTypes;
    }

    public getScatterElements(): SaveTotoBonusElementType[] {
        return this.bonusElementTypes.filter(element => element.isScatter);
    }

    public getWildElements(): SaveTotoBonusElementType[] {
        return this.bonusElementTypes.filter(element => element.isWild);
    }

    public validateConfiguration(): boolean {
        if (!this.elementTypes || this.elementTypes.length === 0) {
            return false;
        }

        for (const elementType of this.elementTypes) {
            if (!elementType.prefab) {
                return false;
            }

            if (elementType.weight < 0) {
                return false;
            }
        }

        for (const bonusElement of this.bonusElementTypes) {
            if (!bonusElement.prefab) {
                return false;
            }

            if (bonusElement.weight <= 0) {
                return false;
            }

            if (bonusElement.maxCountPerColumn <= 0) {
                return false;
            }

            if (bonusElement.maxColumnsCount <= 0) {
                return false;
            }
        }

        return true;
    }

    public getBonusElementsByType(type: 'scatter' | 'wild' | 'all'): SaveTotoBonusElementType[] {
        switch (type) {
            case 'scatter':
                return this.getScatterElements();
            case 'wild':
                return this.getWildElements();
            case 'all':
            default:
                return this.getAllBonusElementTypes();
        }
    }

    public getBonusElementsForColumn(columnIndex: number, maxColumns: number): SaveTotoBonusElementType[] {
        return this.bonusElementTypes.filter(bonus =>
            bonus.maxColumnsCount >= columnIndex + 1 ||
            bonus.maxColumnsCount >= maxColumns
        );
    }

    public getTotalBonusWeight(): number {
        return this.bonusElementTypes.reduce((sum, bonus) => sum + bonus.weight, 0);
    }

    public getBonusSpawnProbability(bonusId: number): number {
        const bonus = this.getBonusElementById(bonusId);
        if (!bonus) return 0;

        const totalWeight = this.getTotalBonusWeight();
        return totalWeight > 0 ? bonus.weight / totalWeight : 0;
    }

    public canSpawnBonusInColumn(bonusId: number, columnIndex: number, currentColumnCount: number): boolean {
        const bonus = this.getBonusElementById(bonusId);
        if (!bonus) return false;

        return bonus.maxColumnsCount > currentColumnCount;
    }

    public getMaxBonusCountForColumn(bonusId: number): number {
        const bonus = this.getBonusElementById(bonusId);
        return bonus ? bonus.maxCountPerColumn : 0;
    }

    public getMaxColumnsForBonus(bonusId: number): number {
        const bonus = this.getBonusElementById(bonusId);
        return bonus ? bonus.maxColumnsCount : 0;
    }
}
