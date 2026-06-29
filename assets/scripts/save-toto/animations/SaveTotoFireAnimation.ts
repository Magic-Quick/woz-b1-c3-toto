/**
 * Save Toto — idle pulse + level-driven animation для огня.
 *
 * Решает OI-203 v2: постоянная пульсация (яркость/контраст) + уровни снижаются
 * через высоту (scale.y) и интенсивность (opacity), ширина не меняется.
 *
 * Привязывается к FireSprite node. ThreatView.setFireLevel() вызывает setLevel().
 */
import { _decorator, Component, Node, tween, Tween, Vec3, UIOpacity, CCFloat, CCInteger } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoFireAnimation')
export class SaveTotoFireAnimation extends Component {
    @property({ type: CCFloat, tooltip: 'Ширина огня (scale.x, неизменна)' })
    public baseScaleX: number = 1;

    @property({ type: CCFloat, tooltip: 'Макс высота огня на уровне 3 (scale.y)' })
    public maxScaleY: number = 1;

    @property({ type: CCFloat, tooltip: 'Амплитуда idle-пульсации высоты' })
    public idleAmplitude: number = 0.06;

    @property({ type: CCFloat, tooltip: 'Полупериод idle-пульсации (сек)' })
    public idleHalfDurationSec: number = 0.35;

    @property({ type: CCFloat, tooltip: 'Длительность перехода между уровнями (сек)' })
    public levelTransitionSec: number = 0.45;

    @property({ type: CCFloat, tooltip: 'Макс opacity на уровне 3' })
    public maxOpacity: number = 255;

    @property({ type: CCFloat, tooltip: 'Мин opacity на уровне 1 (уровень 0 = потух, opacity 0)' })
    public minOpacity: number = 90;

    private opacity: UIOpacity | null = null;
    private idleTween: any = null;
    private level = 3;

    onLoad(): void {
        this.opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        // FIX: anchor снизу — чтобы scaleY опускал только верхнюю часть, низ неподвижен.
        const ut = this.node.getComponent('cc.UITransform') as any;
        if (ut) {
            const halfH = ut.height / 2;
            ut.anchorY = 0;
            // Сдвинуть позицию вниз на halfH, чтобы визуально низ остался там же.
            const p = this.node.position;
            this.node.setPosition(p.x, p.y - halfH, p.z);
        }
        this.node.setScale(new Vec3(this.baseScaleX, this.maxScaleY, 1));
        this.opacity.opacity = this.maxOpacity;
        this.startIdlePulse();
    }

    /** Постоянная пульсация: дрожание высоты + мерцание opacity (вау-эффект). */
    private startIdlePulse(): void {
        this.stopIdlePulse();
        const baseY = this.levelTargetScaleY();
        const up = baseY * (1 + this.idleAmplitude);
        const down = baseY * (1 - this.idleAmplitude * 0.5);
        const baseOpacity = this.levelTargetOpacity();

        this.idleTween = tween(this.node)
            .to(this.idleHalfDurationSec, { scale: new Vec3(this.baseScaleX, up, 1) }, { easing: 'sineInOut' })
            .to(this.idleHalfDurationSec, { scale: new Vec3(this.baseScaleX, down, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever();

        // Отдельный opacity-flicker для яркости/контраста.
        tween(this.opacity)
            .to(this.idleHalfDurationSec * 0.7, { opacity: baseOpacity }, { easing: 'sineOut' })
            .to(this.idleHalfDurationSec * 0.7, { opacity: baseOpacity * 0.78 }, { easing: 'sineIn' })
            .union()
            .repeatForever()
            .start();

        this.idleTween.start();
    }

    private stopIdlePulse(): void {
        if (this.idleTween) {
            this.idleTween.stop();
            this.idleTween = null;
        }
        Tween.stopAllByTarget(this.node);
        if (this.opacity) Tween.stopAllByTarget(this.opacity);
    }

    private levelTargetScaleY(): number {
        const t = this.level / 3;
        return 0.35 + t * (this.maxScaleY - 0.35);
    }

    private levelTargetOpacity(): number {
        if (this.level <= 0) return 0;
        const t = this.level / 3;
        return this.minOpacity + t * (this.maxOpacity - this.minOpacity);
    }

    /** Сменить уровень огня (3=макс, 0=потух). Width не меняется — только height + opacity. */
    public setLevel(level: 0 | 1 | 2 | 3): void {
        this.level = level;
        if (!this.opacity) return;
        const targetY = this.levelTargetScaleY();
        const targetOpacity = this.levelTargetOpacity();
        this.stopIdlePulse();
        // Плавный переход к новому уровню.
        tween(this.node)
            .to(this.levelTransitionSec, { scale: new Vec3(this.baseScaleX, targetY, 1) }, { easing: 'sineInOut' })
            .start();
        tween(this.opacity)
            .to(this.levelTransitionSec, { opacity: targetOpacity }, { easing: 'sineInOut' })
            .call(() => {
                if (level > 0) this.startIdlePulse();
            })
            .start();
    }

    /** Полностью потушить (packshot). */
    public extinguish(): void {
        this.setLevel(0);
    }
}
