/**
 * Save Toto — базовый класс эффекта движения колонки (перенесён из slot-game/Slot/ScrollEffects/MovementEffectBehaviour.ts).
 * Стратегия движения: конкретные эффекты (Linear/Bounce) переопределяют apply().
 */

import { _decorator, Component, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('SaveTotoMovementEffectBehaviour')
export abstract class SaveTotoMovementEffectBehaviour extends Component {
    public abstract apply(
        startPos: Vec3,
        targetPos: Vec3,
        t: number,
        currentPos: Vec3,
        totalDurationSec: number
    ): Vec3;

    public getTotalDuration(distance: number): number {
        return 1.0;
    }
}
