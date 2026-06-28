/**
 * Save Toto — лёгкое idle bob/rock для character parts.
 *
 * Безопасный phase-1 заменитель `.anim` clip для TotoHead / TotoTongue.
 * Анимирует owner node: небольшое вертикальное смещение + rotation z.
 */

import { _decorator, Component, tween, Tween, Vec3, CCFloat, CCBoolean } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoAutoFloat')
export class SaveTotoAutoFloat extends Component {
    @property({ type: CCFloat, tooltip: 'Vertical amplitude in local units' })
    public yOffset: number = 8;

    @property({ type: CCFloat, tooltip: 'Rotation amplitude in degrees around Z' })
    public rotationZDeg: number = 3;

    @property({ type: CCFloat, tooltip: 'Half-cycle duration in seconds' })
    public halfDurationSec: number = 0.8;

    @property({ type: CCFloat, tooltip: 'Optional initial delay before first motion' })
    public initialDelaySec: number = 0;

    @property({ type: CCBoolean, tooltip: 'Autostart on enable' })
    public playOnEnable: boolean = true;

    private originalPos: Vec3 = new Vec3();
    private originalEulerZ: number = 0;
    private activeTween: Tween<any> | null = null;
    private started: boolean = false;

    onLoad(): void {
        this.originalPos = this.node.position.clone();
        this.originalEulerZ = this.node.eulerAngles.z;
    }

    onEnable(): void {
        if (this.playOnEnable) {
            this.play();
        }
    }

    onDisable(): void {
        this.stopAndReset();
    }

    onDestroy(): void {
        this.stopAndReset();
    }

    public play(): void {
        if (!this.node || !this.node.isValid) return;
        this.stopAndReset(false);
        this.started = true;

        const upPos = new Vec3(this.originalPos.x, this.originalPos.y + this.yOffset, this.originalPos.z);
        const downPos = new Vec3(this.originalPos.x, this.originalPos.y - this.yOffset, this.originalPos.z);

        let tw = tween(this.node);
        if (this.initialDelaySec > 0) {
            tw = tw.delay(this.initialDelaySec);
        }

        tw = tw
            .parallel(
                tween().to(this.halfDurationSec, { position: upPos }, { easing: 'sineInOut' })
                      .to(this.halfDurationSec, { position: downPos }, { easing: 'sineInOut' })
                      .to(this.halfDurationSec, { position: this.originalPos }, { easing: 'sineInOut' })
                      .union(),
                tween().to(this.halfDurationSec, { eulerAngles: new Vec3(0, 0, this.originalEulerZ + this.rotationZDeg) }, { easing: 'sineInOut' })
                      .to(this.halfDurationSec, { eulerAngles: new Vec3(0, 0, this.originalEulerZ - this.rotationZDeg) }, { easing: 'sineInOut' })
                      .to(this.halfDurationSec, { eulerAngles: new Vec3(0, 0, this.originalEulerZ) }, { easing: 'sineInOut' })
                      .union()
            )
            .repeatForever();

        this.activeTween = tw;
        this.activeTween.start();
    }

    public stopAndReset(reset: boolean = true): void {
        if (this.activeTween) {
            this.activeTween.stop();
            this.activeTween = null;
        }
        Tween.stopAllByTarget(this.node);
        if (reset && this.node && this.node.isValid) {
            this.node.setPosition(this.originalPos);
            this.node.setRotationFromEuler(0, 0, this.originalEulerZ);
        }
        this.started = false;
    }

    public isPlaying(): boolean {
        return this.started;
    }
}
