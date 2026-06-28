/**
 * Save Toto — линейное движение колонки (перенесён из slot-game/Slot/ScrollEffects/LinearMoveEffect.ts).
 */

import { _decorator, Vec3, CCFloat } from 'cc';
import { SaveTotoMovementEffectBehaviour } from './SaveTotoMovementEffectBehaviour';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoLinearMoveEffect')
export class SaveTotoLinearMoveEffect extends SaveTotoMovementEffectBehaviour {
    @property({ type: CCFloat })
    public durationSec: number = 1.0;

    public apply(startPos: Vec3, targetPos: Vec3, t: number, _currentPos: Vec3, _totalDurationSec: number): Vec3 {
        const clamped = Math.min(Math.max(t, 0), 1);
        return new Vec3(
            startPos.x + (targetPos.x - startPos.x) * clamped,
            startPos.y + (targetPos.y - startPos.y) * clamped,
            startPos.z + (targetPos.z - startPos.z) * clamped
        );
    }

    public getTotalDuration(_distance: number): number {
        return Math.max(this.durationSec, 0.0001);
    }
}
