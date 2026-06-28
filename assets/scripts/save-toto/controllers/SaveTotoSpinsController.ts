/**
 * Save Toto — контроллер количества спинов (перенесён из slot-game/controllers/SpinsController.ts).
 * @ccclass переименован → SaveTotoSpinsController.
 * Save Toto: один сценарный спин (initialValue = 1 задаётся в Inspector).
 */

import { _decorator } from 'cc';
import { SaveTotoBaseValueController } from '../core/SaveTotoBaseValueController';
import { SaveTotoSlotEvents } from '../events/SaveTotoEvents';

const { ccclass } = _decorator;

@ccclass('SaveTotoSpinsController')
export class SaveTotoSpinsController extends SaveTotoBaseValueController {
    protected getDisplayPrefix(): string {
        return '';
    }

    protected getDisplaySuffix(): string {
        return '';
    }

    protected getUpdateEventName(): string {
        return SaveTotoSlotEvents.SPINS_UPDATED;
    }

    protected emitValueUpdated(): void {
        super.emitValueUpdated();
        this.node.emit(SaveTotoSlotEvents.SPINS_AVAILABILITY_CHANGED, this.currentValue > 0);
    }

    public getCurrentSpins(): number {
        return this.getCurrentValue();
    }

    public setSpins(spins: number): void {
        this.setValue(spins);
    }

    public addSpins(amount: number): void {
        this.addValue(amount);
    }

    public removeSpins(amount: number): void {
        this.subtractValue(amount);
    }
}
