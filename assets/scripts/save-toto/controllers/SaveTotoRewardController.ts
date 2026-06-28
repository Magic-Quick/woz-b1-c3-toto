/**
 * Save Toto — контроллер награды/баланса (адаптирован из slot-game/controllers/RewardController.ts).
 *
 * АДАПТАЦИИ:
 *  - Display prefix/suffix пустые: WIN — фиксированный visual label (OI-204),
 *    reward/balance отображается числом без 'Reward: $'.
 *  - Награда scripted (state machine вызывает setReward/addReward для payout).
 *  - CTA-связь сохранена, но показ CTA gated state machine (только после Payout),
 *    не generic after-spins.
 */

import { _decorator } from 'cc';
import { SaveTotoBaseValueController } from '../core/SaveTotoBaseValueController';
import { SaveTotoSlotController } from '../Slot/SaveTotoSlotController';
import { IWinResult } from '../interfaces/IWinTypes';
import { SaveTotoCTAScreen } from '../Slot/SaveTotoCTAScreen';
import { SaveTotoSlotEvents } from '../events/SaveTotoEvents';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';
import { SaveTotoVFXSpawner } from './SaveTotoVFXSpawner';

const { ccclass } = _decorator;

@ccclass('SaveTotoRewardController')
export class SaveTotoRewardController extends SaveTotoBaseValueController {
    private vfxSpawner: SaveTotoVFXSpawner = null!;
    private slotController: SaveTotoSlotController = null!;
    private ctaScreen: SaveTotoCTAScreen | null = null;

    private logger = createSaveTotoLogger('SaveTotoRewardController');

    public setDependencies(slotController: SaveTotoSlotController, ctaScreen?: SaveTotoCTAScreen, vfxSpawner?: SaveTotoVFXSpawner): void {
        this.slotController = slotController;
        this.ctaScreen = ctaScreen || null;
        this.vfxSpawner = vfxSpawner || null;
    }

    protected getDisplayPrefix(): string {
        return '';
    }

    protected getDisplaySuffix(): string {
        return '';
    }

    protected getUpdateEventName(): string {
        return SaveTotoSlotEvents.REWARD_UPDATED;
    }

    start() {
        if (this.slotController) {
            this.slotController.node.on(SaveTotoSlotEvents.WIN_DETECTED, this.onWinDetected, this);
        }
    }

    onDestroy() {
        if (this.slotController) {
            this.slotController.node.off(SaveTotoSlotEvents.WIN_DETECTED, this.onWinDetected, this);
        }
    }

    protected emitValueUpdated(): void {
        super.emitValueUpdated();
        this.node.emit(SaveTotoSlotEvents.REWARD_TOTAL_CHANGED, this.currentValue);
    }

    private onWinDetected(_winResults: IWinResult[], totalWinValue: number): void {
        this.addReward(totalWinValue);

        if (this.vfxSpawner) {
            this.vfxSpawner.trySpawnVFX(totalWinValue);
        }
    }

    public updateCTAScreen(): void {
        if (!this.ctaScreen) {
            return;
        }

        this.ctaScreen.setRewardAmount(this.currentValue);
    }

    public showCTAScreen(): void {
        this.updateCTAScreen();
        if (this.ctaScreen) {
            this.ctaScreen.show();
        }
    }

    public getCurrentReward(): number {
        return this.getCurrentValue();
    }

    public setReward(reward: number): void {
        this.setValue(reward);
    }

    public addReward(amount: number): void {
        this.addValue(amount);
    }

    public subtractReward(amount: number): void {
        this.subtractValue(amount);
    }

    public resetReward(): void {
        this.resetValue();
    }
}
