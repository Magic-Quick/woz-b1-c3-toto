/**
 * Save Toto — idle pulse + level-driven animation для огня.
 *
 * Решает OI-203 v2: постоянная пульсация (яркость/контраст) + уровни снижаются
 * через высоту (scale.y) и интенсивность (opacity), ширина не меняется.
 * Если в `assets/resources/save-toto/fire/` есть sprite-кадры, проигрывает их как
 * лёгкую ping-pong frame animation поверх существующей scale/opacity логики.
 *
 * Привязывается к FireSprite node. ThreatView.setFireLevel() вызывает setLevel().
 */
import { _decorator, Component, tween, Tween, Vec3, UIOpacity, CCFloat, CCInteger, CCString, Sprite, SpriteFrame, resources } from 'cc';

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

    @property({ type: CCString, tooltip: 'Resources-папка с fire frames' })
    public framesResourceDir: string = 'save-toto/fire';

    @property({ type: CCFloat, tooltip: 'FPS sprite-анимации огня' })
    public frameFps: number = 12;

    @property({ tooltip: 'Использовать ping-pong проигрывание кадров' })
    public pingPongFrames: boolean = true;

    private opacity: UIOpacity | null = null;
    private idleTween: any = null;
    private level = 3;
    private sprite: Sprite | null = null;
    private frames: SpriteFrame[] = [];
    private frameTimer = 0;
    private frameIndex = 0;
    private frameDirection = 1;

    onLoad(): void {
        this.opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        this.sprite = this.node.getComponent(Sprite) || null;
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
        this.loadFireFrames();
        this.startIdlePulse();
    }

    update(dt: number): void {
        if (!this.sprite || this.frames.length <= 1 || this.level <= 0) return;
        const frameDuration = 1 / Math.max(this.frameFps, 1);
        this.frameTimer += dt;
        while (this.frameTimer >= frameDuration) {
            this.frameTimer -= frameDuration;
            this.advanceFrame();
        }
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

    private loadFireFrames(): void {
        if (!this.sprite || !this.framesResourceDir) return;

        resources.loadDir(this.framesResourceDir, SpriteFrame, (err, assets) => {
            if (err || !assets || assets.length === 0 || !this.node?.isValid || !this.sprite) {
                return;
            }

            this.frames = assets
                .slice()
                .sort((a, b) => this.extractFrameOrder(a.name) - this.extractFrameOrder(b.name));

            this.frameIndex = 0;
            this.frameDirection = 1;
            this.frameTimer = 0;
            this.applyCurrentFrame();
        });
    }

    private extractFrameOrder(name: string): number {
        const match = name.match(/(\d+)(?!.*\d)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    private advanceFrame(): void {
        if (this.frames.length <= 1) return;

        if (!this.pingPongFrames) {
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
            this.applyCurrentFrame();
            return;
        }

        let nextIndex = this.frameIndex + this.frameDirection;
        if (nextIndex >= this.frames.length) {
            this.frameDirection = -1;
            nextIndex = Math.max(this.frames.length - 2, 0);
        } else if (nextIndex < 0) {
            this.frameDirection = 1;
            nextIndex = Math.min(1, this.frames.length - 1);
        }

        this.frameIndex = nextIndex;
        this.applyCurrentFrame();
    }

    private applyCurrentFrame(): void {
        if (!this.sprite || this.frames.length === 0) return;
        this.sprite.spriteFrame = this.frames[this.frameIndex] || this.frames[0];
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
