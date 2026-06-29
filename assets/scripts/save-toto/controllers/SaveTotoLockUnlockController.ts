/**
 * Save Toto — контроллер открытия/снятия замков (OI-105, OI-104).
 *
 * MVP: без key flight. Анимация открытого/снятого замка через view-метод
 * SaveTotoLockView.playOpenAndRemove(). Порядок снятия — left → center → right (OI-202).
 *
 * Контроллер хранит порядок замков и делегирует визуальную анимацию view,
 * резолвя Promise по завершении. Не хранит gameplay state (ARCHITECTURE.md §6).
 */

import { SaveTotoLockId } from '../types';
import { Vec3 } from 'cc';

export interface SaveTotoLockViewLike {
    lockId: SaveTotoLockId;
    playOpenAndRemove(): Promise<void>;
    /** Unlock с key-flight из мировой позиции источника (корзины). */
    playUnlockFrom?(keyFromWorldPos: Vec3): Promise<void>;
}

export class SaveTotoLockUnlockController {
    private lockOrder: SaveTotoLockId[];
    private lockViews: Map<SaveTotoLockId, SaveTotoLockViewLike> = new Map();
    private removedLocks: Set<SaveTotoLockId> = new Set();

    constructor(lockOrder: SaveTotoLockId[] = ['left', 'center', 'right']) {
        this.lockOrder = lockOrder;
    }

    /** Зарегистрировать view замка по его id. */
    public registerLockView(lockId: SaveTotoLockId, view: SaveTotoLockViewLike): void {
        this.lockViews.set(lockId, view);
    }

    /** Количество замков, доступных для снятия. */
    public getRemainingLocks(): number {
        return this.lockOrder.length - this.removedLocks.size;
    }

    /** Снять замок по индексу выбора (0 — первый pick). Возвращает Promise. */
    public async removeLockByPickIndex(pickIndex: number): Promise<SaveTotoLockId | null> {
        const lockId = this.lockOrder[pickIndex];
        if (!lockId || this.removedLocks.has(lockId)) {
            return null;
        }

        const view = this.lockViews.get(lockId);
        if (view) {
            await view.playOpenAndRemove();
        }

        this.removedLocks.add(lockId);
        return lockId;
    }

    /**
     * Снять замок с key-flight из позиции корзины.
     * @param pickIndex 0-based индекс выбора
     * @param keyFromWorldPos мировая позиция корзины (источник ключа)
     */
    public async removeLockWithKey(pickIndex: number, keyFromWorldPos: Vec3): Promise<SaveTotoLockId | null> {
        const lockId = this.lockOrder[pickIndex];
        if (!lockId || this.removedLocks.has(lockId)) {
            return null;
        }

        const view = this.lockViews.get(lockId);
        if (view) {
            if (view.playUnlockFrom) {
                await view.playUnlockFrom(keyFromWorldPos);
            } else {
                await view.playOpenAndRemove();
            }
        }

        this.removedLocks.add(lockId);
        return lockId;
    }

    public isLockRemoved(lockId: SaveTotoLockId): boolean {
        return this.removedLocks.has(lockId);
    }

    public reset(): void {
        this.removedLocks.clear();
    }
}
