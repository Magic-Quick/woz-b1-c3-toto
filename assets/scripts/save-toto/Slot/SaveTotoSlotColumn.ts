/**
 * Save Toto — колонка слота (перенесена из slot-game/Slot/SlotColumn.ts).
 * @ccclass переименован → SaveTotoSlotColumn.
 */

import { _decorator, Component } from 'cc';
import { SaveTotoElementSpawner } from './Elements/SaveTotoElementSpawner';
import { SaveTotoCentralizedElementSpawner } from './Elements/SaveTotoCentralizedElementSpawner';
import { SaveTotoColumnMover } from './SaveTotoColumnMover';
import { IElementType, IVisibleElementsConfig, IBonusElementType } from '../interfaces/IElementType';
import { SaveTotoMovementEffectBehaviour } from './ScrollEffects/SaveTotoMovementEffectBehaviour';

const { ccclass } = _decorator;

@ccclass('SaveTotoSlotColumn')
export class SaveTotoSlotColumn extends Component {
    private totalElements: number = 5;
    private visibleElements: number = 3;
    private elementSpacing: number = 115;
    private startY: number = -115;

    private elementSpawner: SaveTotoElementSpawner = null;
    private columnMover: SaveTotoColumnMover = null;

    public initWithConfiguration(
        elementTypes: IElementType[],
        visibleConfig: IVisibleElementsConfig,
        totalElementsPerColumn: number,
        elementSpacing?: number,
        startY?: number,
        bonusElementTypes?: IBonusElementType[],
        columnIndex?: number,
        totalColumns?: number,
        movementEffect?: SaveTotoMovementEffectBehaviour,
        centralizedSpawner?: SaveTotoCentralizedElementSpawner
    ): void {
        this.totalElements = totalElementsPerColumn;
        this.visibleElements = visibleConfig.count;
        this.elementSpacing = elementSpacing ?? this.elementSpacing;
        this.startY = startY ?? this.startY;

        this.elementSpawner = new SaveTotoElementSpawner(this.node, centralizedSpawner);
        this.columnMover = new SaveTotoColumnMover(this.node, this.elementSpawner, columnIndex ?? 0);

        this.elementSpawner.init(elementTypes, visibleConfig, this.totalElements, this.elementSpacing, this.startY, bonusElementTypes, columnIndex, totalColumns);
        this.columnMover.init(this.totalElements, this.visibleElements, this.elementSpacing, movementEffect);
        // OI-521: колонка стартует неактивной в update-смысле; включаем в startColumnMovement.
        this.enabled = false;
    }

    protected update(deltaTime: number): void {
        if (!this.columnMover) return;
        // OI-521: если колонка не крутится — нет смысла дёргать columnMover.update
        // каждый кадр (5 колонок × пустой вызов = стабильный оверхед на idle).
        // Выключаем update; включаем обратно в startColumnMovement.
        if (!this.columnMover.isCurrentlyMoving()) {
            this.enabled = false;
            return;
        }
        this.columnMover.update(deltaTime);
    }

    protected onDestroy(): void {
        if (this.columnMover) {
            this.columnMover.destroy();
        }
    }

    public startColumnMovement(): void {
        // OI-521: включаем update — колонка снова «живая».
        this.enabled = true;
        this.columnMover?.startMovement();
    }

    public stopColumnMovement(): void {
        this.columnMover?.stopMovement();
    }

    public isColumnMoving(): boolean {
        return this.columnMover?.isCurrentlyMoving() ?? false;
    }

    public resetColumn(): void {
        this.columnMover?.stopMovement();
        this.elementSpawner?.reset();
    }

    public getVisibleElementTypes(): IElementType[] {
        return this.elementSpawner?.getVisibleElementTypes() ?? [];
    }

    public getFirstVisibleElementTypes(): IElementType[] {
        return this.elementSpawner?.getFirstVisibleElementTypes() ?? [];
    }

    public getVisibleElementsCount(): number {
        return this.visibleElements;
    }

    public setVisibleElements(elementTypes: IElementType[]): void {
        this.elementSpawner?.setVisibleElementsTypes(elementTypes);
    }
}
