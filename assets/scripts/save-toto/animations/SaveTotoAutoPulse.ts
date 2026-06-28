/**
 * Save Toto — универсальный idle pulse для UI/node.
 *
 * Безопасный phase-1 заменитель `.anim` clip для автоматических loop-анимаций.
 * Анимирует owner node: scale up/down по бесконечному циклу.
 *
 * Использование:
 * - SpinButton idle pulse
 * - Basket idle pulse
 *
 * В phase-2 (OI-506) должен быть заменён на AnimationClip, но интерфейс stopAndReset()
 * сохранится полезным для view-кода.
 */

import { _decorator, Component, tween, Tween, Vec3, CCFloat, CCBoolean } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoAutoPulse')
export class SaveTotoAutoPulse extends Component {
    @property({ type: CCFloat, tooltip: 'Scale multiplier above 1.0' })
    public scaleMultiplier: number = 0.08;

    @property({ type: CCFloat, tooltip: 'Half-cycle duration in seconds' })
    public halfDurationSec: number = 0.4;

    @property({ type: CCFloat, tooltip: 'Optional initial delay before first pulse' })
    public initialDelaySec: number = 0;

    @property({ type: CCBoolean, tooltip: 'Autostart on enable' })
    public playOnEnable: boolean = true;

    private originalScale: Vec3 = new Vec3(1, 1, 1);
    private activeTween: Tween<any> | null = null;
    private started: boolean = false;

    onLoad(): void {
        this.originalScale = this.node.scale.clone();
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

        const targetScale = this.originalScale.clone().multiplyScalar(1 + this.scaleMultiplier);
        let tw = tween(this.node);
        if (this.initialDelaySec > 0) {
            tw = tw.delay(this.initialDelaySec);
        }
        tw = tw
            .to(this.halfDurationSec, { scale: targetScale }, { easing: 'sineInOut' })
            .to(this.halfDurationSec, { scale: this.originalScale }, { easing: 'sineInOut' })
            .union()
            .repeatForever();

        this.activeTween = tw;
        this.activeTween.start();
    }

    /**
     * Остановить pulse. По умолчанию возвращает исходный scale.
     */
    public stopAndReset(resetScale: boolean = true): void {
        if (this.activeTween) {
            this.activeTween.stop();
            this.activeTween = null;
        }
        Tween.stopAllByTarget(this.node);
        if (resetScale && this.node && this.node.isValid) {
            this.node.setScale(this.originalScale);
        }
        this.started = false;
    }

    public isPlaying(): boolean {
        return this.started;
    }
}
