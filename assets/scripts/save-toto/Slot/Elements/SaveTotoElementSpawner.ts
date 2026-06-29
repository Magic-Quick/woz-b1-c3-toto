/**
 * Save Toto — спавнер элементов колонки (перенесён из slot-game/Slot/Elements/ElementSpawner.ts).
 * Тонкая фасадная обёртка над SaveTotoCentralizedElementSpawner.
 */

import { Node } from 'cc';
import { IElementType, IVisibleElementsConfig, IBonusElementType } from '../../interfaces/IElementType';
import { SaveTotoCentralizedElementSpawner } from './SaveTotoCentralizedElementSpawner';

export class SaveTotoElementSpawner {
    private centralizedSpawner: SaveTotoCentralizedElementSpawner = null;
    private columnIndex: number = 0;
    private visibleConfig: IVisibleElementsConfig = null;
    private totalElements: number = 5;
    private visibleElements: number = 3;
    private elementSpacing: number = 115;
    private startY: number = -115;
    private bonusElementTypes: IBonusElementType[] = [];
    private columnNode: Node = null;

    constructor(columnNode: Node, centralizedSpawner?: SaveTotoCentralizedElementSpawner) {
        this.columnNode = columnNode;
        this.centralizedSpawner = centralizedSpawner || null;
    }

    public setCentralizedSpawner(spawner: SaveTotoCentralizedElementSpawner): void {
        this.centralizedSpawner = spawner;
    }

    public init(
        elementTypes: IElementType[],
        visibleConfig: IVisibleElementsConfig,
        totalElements: number,
        elementSpacing: number,
        startY: number,
        bonusElementTypes?: IBonusElementType[],
        columnIndex?: number,
        _totalColumns?: number
    ): void {
        this.columnIndex = columnIndex || 0;
        this.visibleConfig = visibleConfig;
        this.totalElements = totalElements;
        this.visibleElements = visibleConfig.count;
        this.elementSpacing = elementSpacing;
        this.startY = startY;
        this.bonusElementTypes = bonusElementTypes || [];

        if (!this.centralizedSpawner) {
            return;
        }

        this.centralizedSpawner.registerColumn(
            this.columnIndex,
            this.visibleConfig,
            this.totalElements,
            this.elementSpacing,
            this.startY,
            this.columnNode
        );
    }

    public onMovementComplete(): void {
        if (this.centralizedSpawner) {
            this.centralizedSpawner.onColumnMovementComplete(this.columnIndex, this.columnNode);
        }
    }

    public getElements(): Node[] {
        return this.centralizedSpawner ? this.centralizedSpawner.getColumnElements(this.columnIndex) : [];
    }

    public getVisibleElementTypes(): IElementType[] {
        return this.centralizedSpawner ? this.centralizedSpawner.getColumnVisibleElementTypes(this.columnIndex) : [];
    }

    public getFirstVisibleElementTypes(): IElementType[] {
        return this.centralizedSpawner ? this.centralizedSpawner.getColumnFirstVisibleElementTypes(this.columnIndex) : [];
    }

    public setVisibleElementsTypes(elementTypes: IElementType[]): void {
        if (this.centralizedSpawner) {
            this.centralizedSpawner.setColumnVisibleElements(this.columnIndex, elementTypes, this.columnNode);
        }
    }

    public setFirstVisibleElementsTypes(elementTypes: IElementType[]): void {
        if (this.centralizedSpawner) {
            this.centralizedSpawner.setColumnFirstVisibleElements(this.columnIndex, elementTypes, this.columnNode);
        }
    }

    public reset(): void {
        if (this.centralizedSpawner) {
            this.centralizedSpawner.resetColumn(this.columnIndex, this.columnNode);
        }
    }

    public getBonusElements(): IBonusElementType[] {
        return this.bonusElementTypes;
    }

    public setBonusElements(bonusElements: IBonusElementType[]): void {
        this.bonusElementTypes = bonusElements;
    }

    public hasBonusElements(): boolean {
        return this.centralizedSpawner ? this.centralizedSpawner.hasColumnBonusElements(this.columnIndex) : false;
    }

    public getBonusElementCount(): number {
        return this.centralizedSpawner ? this.centralizedSpawner.getColumnBonusElementCount(this.columnIndex) : 0;
    }

    public getBonusElementsInVisibleArea(): IElementType[] {
        return this.centralizedSpawner ? this.centralizedSpawner.getColumnBonusElements(this.columnIndex) : [];
    }
}
