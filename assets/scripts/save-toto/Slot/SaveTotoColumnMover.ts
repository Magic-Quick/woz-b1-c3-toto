/**
 * Save Toto — движение колонки (перенесён из slot-game/Slot/ColumnMover.ts).
 * Plain-класс (не Component); обновляется из SaveTotoSlotColumn.update().
 * Событие остановки использует SaveTotoSlotEvents.COLUMN_MOVEMENT_COMPLETE.
 *
 * FIX 2026-06-28:
 * - если movementEffect не назначен, update() больше не падает на this.effect.apply(...)
 * - используется linear fallback interpolation (тот же результат, что SaveTotoLinearMoveEffect)
 */

import { Node, Vec3 } from 'cc';
import { SaveTotoElementSpawner } from './Elements/SaveTotoElementSpawner';
import { SaveTotoMovementEffectBehaviour } from './ScrollEffects/SaveTotoMovementEffectBehaviour';
import { SaveTotoSlotEvents } from '../events/SaveTotoEvents';

/**
 * Fallback linear interpolation, используемый когда movementEffect не назначен.
 */
function linearInterpolate(startPos: Vec3, targetPos: Vec3, t: number): Vec3 {
    const clamped = Math.min(Math.max(t, 0), 1);
    return new Vec3(
        startPos.x + (targetPos.x - startPos.x) * clamped,
        startPos.y + (targetPos.y - startPos.y) * clamped,
        startPos.z + (targetPos.z - startPos.z) * clamped
    );
}

export class SaveTotoColumnMover {
    private totalElements: number = 5;
    private visibleElements: number = 3;
    private elementSpacing: number = 140;
    private elementSpawner: SaveTotoElementSpawner = null;
    private isMoving: boolean = false;
    private movingElements: Node[] = [];
    private startPositions: Vec3[] = [];
    private targetPositions: Vec3[] = [];
    private moveProgress: number = 0;
    private moveDuration: number = 0;
    private effect: SaveTotoMovementEffectBehaviour = null;
    private columnNode: Node = null;

    constructor(columnNode: Node, elementSpawner: SaveTotoElementSpawner, _columnIndex: number) {
        this.columnNode = columnNode;
        this.elementSpawner = elementSpawner;
    }

    public init(totalElements: number, visibleElements: number, elementSpacing: number, movementEffect?: SaveTotoMovementEffectBehaviour): void {
        this.totalElements = totalElements;
        this.visibleElements = visibleElements;
        this.elementSpacing = elementSpacing;
        this.effect = movementEffect;
    }

    public update(deltaTime: number): void {
        if (this.isMoving && this.movingElements.length > 0) {
            this.moveProgress += deltaTime;
            const progress = Math.min(this.moveProgress / this.moveDuration, 1);

            this.movingElements.forEach((element, index) => {
                if (element && element.isValid && this.startPositions[index] && this.targetPositions[index]) {
                    const startPos = this.startPositions[index];
                    const targetPos = this.targetPositions[index];

                    const currentPos = this.effect
                        ? this.effect.apply(
                            startPos,
                            targetPos,
                            progress,
                            new Vec3(startPos.x, startPos.y, startPos.z),
                            this.moveDuration
                        )
                        : linearInterpolate(startPos, targetPos, progress);

                    element.setPosition(currentPos);
                }
            });

            if (progress >= 1) {
                this.movingElements.forEach((element, index) => {
                    const targetPos = this.targetPositions[index];
                    if (element && element.isValid && targetPos) {
                        element.setPosition(targetPos);
                    }
                });
                this.onMovementComplete();
            }
        }
    }

    public startMovement(): void {
        if (this.isMoving || !this.elementSpawner) {
            return;
        }

        const elements = this.elementSpawner.getElements();
        if (elements.length === 0) {
            return;
        }

        this.isMoving = true;
        this.moveElementsDown(elements);
    }

    private moveElementsDown(elements: Node[]): void {
        const moveDistance = (this.totalElements - this.visibleElements) * this.elementSpacing;
        const effectDuration = (this.effect && this.effect.getTotalDuration)
            ? this.effect.getTotalDuration(moveDistance)
            : 1.0;
        this.moveDuration = Math.max(effectDuration, 0.0001);

        this.movingElements = [];
        this.startPositions = [];
        this.targetPositions = [];
        this.moveProgress = 0;

        elements.forEach((element) => {
            if (!element || !element.isValid) return;

            const currentPos = element.position;
            const targetPos = new Vec3(currentPos.x, currentPos.y - moveDistance, currentPos.z);

            this.movingElements.push(element);
            this.startPositions.push(new Vec3(currentPos.x, currentPos.y, currentPos.z));
            this.targetPositions.push(targetPos);
        });
    }

    private onMovementComplete(): void {
        if (this.elementSpawner) {
            this.elementSpawner.onMovementComplete();
        }

        this.isMoving = false;
        this.movingElements = [];
        this.startPositions = [];
        this.targetPositions = [];
        this.moveProgress = 0;
        this.moveDuration = 0;

        this.columnNode.emit(SaveTotoSlotEvents.COLUMN_MOVEMENT_COMPLETE);
    }

    public stopMovement(): void {
        this.isMoving = false;
        this.movingElements = [];
        this.startPositions = [];
        this.targetPositions = [];
        this.moveProgress = 0;
        this.moveDuration = 0;
    }

    public isCurrentlyMoving(): boolean {
        return this.isMoving;
    }

    public setEffect(effect: SaveTotoMovementEffectBehaviour): void {
        this.effect = effect;
    }

    public destroy(): void {
        this.stopMovement();
    }
}
