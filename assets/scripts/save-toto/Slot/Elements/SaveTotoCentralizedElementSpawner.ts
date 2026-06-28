/**
 * Save Toto — централизованный спавнер элементов (перенесён из slot-game/Slot/Elements/CentralizedElementSpawner.ts).
 * Владеет всеми элементами колонок. Исправления:
 *  - getComponent('SlotElement') → getComponent('SaveTotoSlotElement') (типизированно).
 *  - прямой setter .id вместо хрупкого bracket-доступа.
 *  - hasColumnBonusElements учитывает columnIndex (bugfix).
 */

import { Node, instantiate, Vec3 } from 'cc';
import { IElementType, IVisibleElementsConfig, IBonusElementType } from '../../interfaces/IElementType';
import { IColumnElementData } from '../../interfaces/IColumnElementData';
import { SaveTotoElementRandomizer } from './SaveTotoElementRandomizer';
import { SaveTotoSlotElement } from './SaveTotoSlotElement';

export type { IColumnElementData };

export class SaveTotoCentralizedElementSpawner {
    private elementTypes: IElementType[] = [];
    private bonusElementTypes: IBonusElementType[] = [];
    private columns: IColumnElementData[] = [];
    private randomizer: SaveTotoElementRandomizer = new SaveTotoElementRandomizer();
    private totalColumns: number = 0;

    public init(elementTypes: IElementType[], bonusElementTypes: IBonusElementType[], totalColumns: number): void {
        this.elementTypes = elementTypes;
        this.bonusElementTypes = bonusElementTypes || [];
        this.totalColumns = totalColumns;
    }

    public registerColumn(
        columnIndex: number,
        visibleConfig: IVisibleElementsConfig,
        totalElements: number,
        elementSpacing: number,
        startY: number,
        columnNode: Node
    ): void {
        const columnData: IColumnElementData = {
            elementTypes: [],
            elements: [],
            visibleConfig: visibleConfig,
            totalElements: totalElements,
            visibleElements: visibleConfig.count,
            elementSpacing: elementSpacing,
            startY: startY,
            columnIndex: columnIndex
        };

        this.columns[columnIndex] = columnData;
        this.generateInitialElementsForColumn(columnIndex, columnNode);
    }

    private generateInitialElementsForColumn(columnIndex: number, columnNode: Node): void {
        const columnData = this.columns[columnIndex];
        if (!columnData) return;

        this.randomizer.initializeBonusSpawnManager(this.bonusElementTypes, this.totalColumns, columnData.totalElements);

        const validElementTypes = this.elementTypes.filter(element => element.weight > 0);

        if (validElementTypes.length === 0) {
            console.error('[SaveToto] No elements with weight > 0 available for initial column generation');
            return;
        }

        let elementTypes: IElementType[];

        if (this.bonusElementTypes.length > 0) {
            elementTypes = this.randomizer.generateColumnElementsWithBonuses(
                columnData.visibleConfig,
                validElementTypes,
                this.bonusElementTypes,
                columnData.totalElements,
                columnIndex,
                this.totalColumns
            );
        } else {
            elementTypes = this.randomizer.generateColumnElements(
                columnData.visibleConfig,
                validElementTypes,
                columnData.totalElements
            );
        }

        columnData.elementTypes = elementTypes;
        columnData.elements = [];

        for (let i = 0; i < columnData.totalElements; i++) {
            const element = this.createElement(elementTypes[i], i, columnData, columnNode);
            if (element) columnData.elements.push(element);
        }
    }

    private createElement(elementType: IElementType | undefined, index: number, columnData: IColumnElementData, columnNode: Node): Node | null {
        if (!elementType || !elementType.prefab) {
            console.error('[SaveToto] Element prefab is null for element type:', elementType?.id);
            return null;
        }

        const element = instantiate(elementType.prefab);
        element.parent = columnNode;
        element.setPosition(new Vec3(0, columnData.startY + (index * columnData.elementSpacing), 0));

        const slotElementComponent = element.getComponent(SaveTotoSlotElement);
        if (slotElementComponent) {
            slotElementComponent.id = elementType.id;
        }

        return element;
    }

    public onColumnMovementComplete(columnIndex: number, columnNode: Node): void {
        const columnData = this.columns[columnIndex];
        if (!columnData) return;

        const elementsToDestroy = columnData.elements.slice(0, columnData.elements.length - columnData.visibleElements);
        elementsToDestroy.forEach(element => element?.destroy());

        columnData.elements = columnData.elements.slice(-columnData.visibleElements);
        columnData.elementTypes = columnData.elementTypes.slice(-columnData.visibleElements);

        const newElementsCount = columnData.totalElements - columnData.visibleElements;
        if (columnData.elements.length > 0) {
            const topElementY = columnData.elements[columnData.elements.length - 1].position.y;

            const validElementTypes = this.elementTypes.filter(element => element.weight > 0);

            if (validElementTypes.length === 0) {
                console.error('[SaveToto] No elements with weight > 0 available for movement completion');
                return;
            }

            let newElementTypes: IElementType[];
            if (this.bonusElementTypes.length > 0) {
                newElementTypes = this.randomizer.generateColumnElementsWithBonuses(
                    columnData.visibleConfig,
                    validElementTypes,
                    this.bonusElementTypes,
                    newElementsCount,
                    columnIndex,
                    this.totalColumns
                );
            } else {
                newElementTypes = [];
                for (let i = 0; i < newElementsCount; i++) {
                    newElementTypes.push(this.randomizer.getRandomElementWithoutWeight(validElementTypes));
                }
            }

            for (let i = 0; i < newElementsCount; i++) {
                const newElement = this.createElement(newElementTypes[i], columnData.totalElements - newElementsCount + i, columnData, columnNode);
                if (newElement) {
                    newElement.setPosition(new Vec3(0, topElementY + ((i + 1) * columnData.elementSpacing), 0));
                    columnData.elements.push(newElement);
                    columnData.elementTypes.push(newElementTypes[i]);
                }
            }
        }
    }

    public getColumnElements(columnIndex: number): Node[] {
        const columnData = this.columns[columnIndex];
        return columnData ? columnData.elements : [];
    }

    public getColumnVisibleElementTypes(columnIndex: number): IElementType[] {
        const columnData = this.columns[columnIndex];
        if (!columnData) return [];
        return columnData.elementTypes.slice(-columnData.visibleElements);
    }

    public getColumnFirstVisibleElementTypes(columnIndex: number): IElementType[] {
        const columnData = this.columns[columnIndex];
        if (!columnData) return [];
        return columnData.elementTypes.slice(0, columnData.visibleElements);
    }

    public setColumnVisibleElements(columnIndex: number, elementTypes: IElementType[], columnNode: Node): void {
        const columnData = this.columns[columnIndex];
        if (!columnData || elementTypes.length !== columnData.visibleElements) return;

        const startIndex = columnData.elementTypes.length - columnData.visibleElements;
        for (let i = 0; i < elementTypes.length; i++) {
            columnData.elementTypes[startIndex + i] = elementTypes[i];
            columnData.elements[startIndex + i]?.destroy();
            const created = this.createElement(elementTypes[i], startIndex + i, columnData, columnNode);
            if (created) columnData.elements[startIndex + i] = created;
        }
    }

    public setColumnFirstVisibleElements(columnIndex: number, elementTypes: IElementType[], columnNode: Node): void {
        const columnData = this.columns[columnIndex];
        if (!columnData || elementTypes.length !== columnData.visibleElements) return;

        for (let i = 0; i < elementTypes.length; i++) {
            columnData.elementTypes[i] = elementTypes[i];
            columnData.elements[i]?.destroy();
            const created = this.createElement(elementTypes[i], i, columnData, columnNode);
            if (created) columnData.elements[i] = created;
        }
    }

    public resetColumn(columnIndex: number, columnNode: Node): void {
        const columnData = this.columns[columnIndex];
        if (!columnData) return;

        columnData.elements.forEach(element => element?.destroy());
        columnData.elements = [];
        columnData.elementTypes = [];
        this.generateInitialElementsForColumn(columnIndex, columnNode);
    }

    public getColumnBonusElements(columnIndex: number): IElementType[] {
        const columnData = this.columns[columnIndex];
        if (!columnData) return [];

        const visibleTypes = this.getColumnVisibleElementTypes(columnIndex);
        return visibleTypes.filter(elementType =>
            this.bonusElementTypes.some(bonus => bonus.id === elementType.id)
        );
    }

    public getColumnBonusElementCount(columnIndex: number): number {
        const columnData = this.columns[columnIndex];
        if (!columnData) return 0;

        return columnData.elementTypes.filter(elementType =>
            this.bonusElementTypes.some(bonus => bonus.id === elementType.id)
        ).length;
    }

    public hasColumnBonusElements(columnIndex: number): boolean {
        return this.getColumnBonusElementCount(columnIndex) > 0;
    }

    public getAllBonusElements(): IElementType[][] {
        return this.columns.map((_, index) => this.getColumnBonusElements(index));
    }

    public getTotalBonusCount(): number {
        return this.columns.reduce((total, _, index) => {
            return total + this.getColumnBonusElementCount(index);
        }, 0);
    }

    public hasBonusElements(): boolean {
        return this.columns.some((_, index) => this.hasColumnBonusElements(index));
    }

    public getBonusElementsByType(type: 'scatter' | 'wild' | 'all'): IElementType[][] {
        const bonusElements = this.bonusElementTypes.filter(bonus => {
            switch (type) {
                case 'scatter':
                    return bonus.isScatter;
                case 'wild':
                    return bonus.isWild;
                case 'all':
                default:
                    return true;
            }
        });

        const bonusIds = bonusElements.map(bonus => bonus.id);

        return this.getAllBonusElements().map(columnBonuses =>
            columnBonuses.filter(element => bonusIds.indexOf(element.id) !== -1)
        );
    }

    public getBonusSpawnProbability(bonusId: number): number {
        const bonus = this.bonusElementTypes.find(b => b.id === bonusId);
        if (!bonus) return 0;

        const totalWeight = this.bonusElementTypes.reduce((sum, b) => sum + b.weight, 0);
        return totalWeight > 0 ? bonus.weight / totalWeight : 0;
    }

    public validateBonusConfiguration(): boolean {
        return this.elementTypes.length > 0 && this.bonusElementTypes.length > 0;
    }

    public resetAllColumns(): void {
        this.columns.forEach((_, index) => {
            const columnData = this.columns[index];
            if (columnData) {
                columnData.elements.forEach(element => element?.destroy());
                columnData.elements = [];
                columnData.elementTypes = [];
            }
        });
    }
}
