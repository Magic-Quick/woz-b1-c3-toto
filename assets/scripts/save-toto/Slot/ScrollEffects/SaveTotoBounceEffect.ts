/**
 * Save Toto — эффект движения с отскоком (перенесён из slot-game/Slot/ScrollEffects/BounceEffect.ts).
 * Трёхфазное движение: подъём → центр → возврат.
 */

import { _decorator, Vec3, CCFloat } from 'cc';
import { SaveTotoMovementEffectBehaviour } from './SaveTotoMovementEffectBehaviour';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoBounceEffect')
export class SaveTotoBounceEffect extends SaveTotoMovementEffectBehaviour {
    @property({ type: CCFloat })
    public upHeight: number = 30;

    @property({ type: CCFloat })
    public belowOffset: number = 0;

    @property({ type: CCFloat })
    public upDur: number = 0.2;

    @property({ type: CCFloat })
    public centerDurSec: number = 1.0;

    @property({ type: CCFloat })
    public returnDur: number = 0.2;

    public apply(startPos: Vec3, targetPos: Vec3, t: number, _currentPos: Vec3, totalDurationSec: number): Vec3 {
        const upSec = Math.max(this.upDur, 0);
        const returnSec = Math.max(this.returnDur, 0);
        const elapsedSec = Math.min(Math.max(t, 0), 1) * totalDurationSec;

        const upEndTime = upSec;
        const returnStartTime = Math.max(totalDurationSec - returnSec, upEndTime);
        const centerDur = Math.max(returnStartTime - upEndTime, 0.000001);

        const x = startPos.x + (targetPos.x - startPos.x) * t;
        const z = startPos.z + (targetPos.z - startPos.z) * t;

        const upEndY = startPos.y + this.upHeight;
        const belowTargetY = targetPos.y - this.belowOffset;

        let y: number;
        if (upSec > 0 && elapsedSec <= upEndTime) {
            const upProgress = Math.min(Math.max(elapsedSec / upSec, 0), 1);
            const eased = 1 - Math.pow(1 - upProgress, 3);
            y = startPos.y + this.upHeight * eased;
        } else if (elapsedSec < returnStartTime) {
            const midProgress = Math.min(Math.max((elapsedSec - upEndTime) / centerDur, 0), 1);
            y = upEndY + (belowTargetY - upEndY) * midProgress;
        } else if (returnSec > 0) {
            const returnElapsed = elapsedSec - returnStartTime;
            const returnProgress = Math.min(Math.max(returnElapsed / Math.max(returnSec, 0.000001), 0), 1);
            const eased = 1 - Math.pow(1 - returnProgress, 3);
            y = belowTargetY + (targetPos.y - belowTargetY) * eased;
        } else {
            y = targetPos.y;
        }

        return new Vec3(x, y, z);
    }

    public getTotalDuration(_distance: number): number {
        const centerDur = Math.max(this.centerDurSec, 0.0001);
        return Math.max(this.upDur, 0) + centerDur + Math.max(this.returnDur, 0);
    }
}
