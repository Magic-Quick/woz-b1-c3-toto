/**
 * Save Toto — idle pulse + level-driven animation для огня.
 *
 * Решает OI-203 v2: постоянная пульсация (яркость/контраст) + уровни снижаются
 * через высоту (scale.y) и интенсивность (opacity), ширина не меняется.
 * Использует только сжатую PNG-sequence из resources.
 * Unlock-последовательность использует 3 явные ступени затухания: 3 → 2 → 1 → 0.
 *
 * Привязывается к FireSprite node. ThreatView.setFireLevel() вызывает setLevel().
 */
import { _decorator, Component, tween, Tween, Vec3, UIOpacity, CCFloat, CCString, Sprite, SpriteFrame, resources, Node } from 'cc';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoFireAnimation')
export class SaveTotoFireAnimation extends Component {
    private logger = createSaveTotoLogger('SaveTotoFireAnimation');

    @property({ type: CCFloat, tooltip: 'Ширина огня (scale.x, неизменна)' })
    public baseScaleX: number = 1;

    @property({ type: CCFloat, tooltip: 'Макс высота огня на уровне 3 (scale.y)' })
    public maxScaleY: number = 1;

    @property({ type: CCFloat, tooltip: 'Высота огня на уровне 2' })
    public level2ScaleY: number = 0.74;

    @property({ type: CCFloat, tooltip: 'Высота огня на уровне 1' })
    public level1ScaleY: number = 0.48;

    @property({ type: CCFloat, tooltip: 'Остаточная высота огня на уровне 0 перед полным затуханием' })
    public level0ScaleY: number = 0.2;

    @property({ type: CCFloat, tooltip: 'Амплитуда idle-пульсации высоты' })
    public idleAmplitude: number = 0.06;

    @property({ type: CCFloat, tooltip: 'Полупериод idle-пульсации (сек)' })
    public idleHalfDurationSec: number = 0.35;

    @property({ type: CCFloat, tooltip: 'Длительность перехода между уровнями (сек)' })
    public levelTransitionSec: number = 0.45;

    @property({ type: CCFloat, tooltip: 'Макс opacity на уровне 3' })
    public maxOpacity: number = 255;

    @property({ type: CCFloat, tooltip: 'Opacity на уровне 2' })
    public level2Opacity: number = 190;

    @property({ type: CCFloat, tooltip: 'Opacity на уровне 1' })
    public level1Opacity: number = 105;

    @property({ type: CCString, tooltip: 'Resources path до папки с fire frame sequence' })
    public sequenceFramesResourceDir: string = 'save-toto/fire';

    @property({ type: CCFloat, tooltip: 'FPS для fire frame sequence' })
    public sequenceFrameFps: number = 10;

    @property({ type: CCString, tooltip: 'Порядок Layer-кадров, например 1,4,5,6,5,4' })
    public sequenceFrameOrder: string = '1,4,5,6,5,4';

    @property({ type: Node, tooltip: 'Мягкий внешний glow под огнём' })
    public glowBaseNode: Node | null = null;

    @property({ type: Node, tooltip: 'Более яркий core glow под огнём' })
    public glowCoreNode: Node | null = null;

    @property({ type: CCFloat, tooltip: 'Базовый scale для outer glow' })
    public glowBaseScale: number = 1.16;

    @property({ type: CCFloat, tooltip: 'Базовый scale для core glow' })
    public glowCoreScale: number = 1.04;

    @property({ type: CCFloat, tooltip: 'Амплитуда пульса outer glow' })
    public glowBasePulseAmplitude: number = 0.035;

    @property({ type: CCFloat, tooltip: 'Амплитуда пульса core glow' })
    public glowCorePulseAmplitude: number = 0.05;

    @property({ type: CCFloat, tooltip: 'Полупериод outer glow' })
    public glowBaseHalfDurationSec: number = 0.62;

    @property({ type: CCFloat, tooltip: 'Полупериод core glow' })
    public glowCoreHalfDurationSec: number = 0.42;

    private opacity: UIOpacity | null = null;
    private idleTween: any = null;
    private level = 3;
    private sprite: Sprite | null = null;
    private fallbackSpriteFrame: SpriteFrame | null = null;
    private sequenceFrames: SpriteFrame[] = [];
    private sequenceReady = false;
    private sequenceFrameIndex = 0;
    private sequenceFrameTimer = 0;
    private paused = false;
    private glowBaseOpacity: UIOpacity | null = null;
    private glowCoreOpacity: UIOpacity | null = null;

    private getGlowProfile(level: 0 | 1 | 2 | 3): {
        baseOpacity: number;
        coreOpacity: number;
        baseScale: number;
        coreScale: number;
    } {
        switch (level) {
            case 2:
                return {
                    baseOpacity: 138,
                    coreOpacity: 172,
                    baseScale: this.glowBaseScale * 0.95,
                    coreScale: this.glowCoreScale * 0.94,
                };
            case 1:
                return {
                    baseOpacity: 92,
                    coreOpacity: 118,
                    baseScale: this.glowBaseScale * 0.9,
                    coreScale: this.glowCoreScale * 0.88,
                };
            case 0:
                return {
                    baseOpacity: 0,
                    coreOpacity: 0,
                    baseScale: this.glowBaseScale * 0.84,
                    coreScale: this.glowCoreScale * 0.82,
                };
            case 3:
            default:
                return {
                    baseOpacity: 180,
                    coreOpacity: 200,
                    baseScale: this.glowBaseScale,
                    coreScale: this.glowCoreScale,
                };
        }
    }

    private getLevelProfile(level: 0 | 1 | 2 | 3): { scaleY: number; opacity: number; pulseAmplitude: number; fpsMultiplier: number } {
        switch (level) {
            case 2:
                return {
                    scaleY: this.level2ScaleY,
                    opacity: this.level2Opacity,
                    pulseAmplitude: this.idleAmplitude * 0.72,
                    fpsMultiplier: 0.88,
                };
            case 1:
                return {
                    scaleY: this.level1ScaleY,
                    opacity: this.level1Opacity,
                    pulseAmplitude: this.idleAmplitude * 0.45,
                    fpsMultiplier: 0.72,
                };
            case 0:
                return {
                    scaleY: this.level0ScaleY,
                    opacity: 0,
                    pulseAmplitude: 0,
                    fpsMultiplier: 0,
                };
            case 3:
            default:
                return {
                    scaleY: this.maxScaleY,
                    opacity: this.maxOpacity,
                    pulseAmplitude: this.idleAmplitude,
                    fpsMultiplier: 1,
                };
        }
    }

    onLoad(): void {
        this.opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        this.sprite = this.node.getComponent(Sprite) || null;
        this.fallbackSpriteFrame = this.sprite?.spriteFrame ?? null;
        this.glowBaseOpacity = this.glowBaseNode?.getComponent(UIOpacity) || this.glowBaseNode?.addComponent(UIOpacity) || null;
        this.glowCoreOpacity = this.glowCoreNode?.getComponent(UIOpacity) || this.glowCoreNode?.addComponent(UIOpacity) || null;
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
        this.applyGlowLevel(3);
        if (this.sprite && this.shouldUseSequenceFrames()) {
            this.sprite.spriteFrame = null;
        }
        this.loadSequenceFrames();
        this.startIdlePulse();
    }

    update(dt: number): void {
        if (this.paused) return;
        this.advanceSequence(dt);
    }

    /** Постоянная пульсация: дрожание высоты + мерцание opacity (вау-эффект). */
    private startIdlePulse(): void {
        this.stopIdlePulse();
        const profile = this.getLevelProfile(this.level as 0 | 1 | 2 | 3);
        const baseY = profile.scaleY;
        const pulseAmplitude = profile.pulseAmplitude;
        const up = baseY * (1 + pulseAmplitude);
        const down = baseY * (1 - pulseAmplitude * 0.55);
        const baseOpacity = profile.opacity;
        const glowProfile = this.getGlowProfile(this.level as 0 | 1 | 2 | 3);

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

        this.startGlowPulse(
            this.glowBaseNode,
            this.glowBaseOpacity,
            glowProfile.baseScale,
            this.glowBasePulseAmplitude,
            this.glowBaseHalfDurationSec,
            glowProfile.baseOpacity,
            0.8,
        );
        this.startGlowPulse(
            this.glowCoreNode,
            this.glowCoreOpacity,
            glowProfile.coreScale,
            this.glowCorePulseAmplitude,
            this.glowCoreHalfDurationSec,
            glowProfile.coreOpacity,
            0.74,
        );

        this.idleTween.start();
    }

    private stopIdlePulse(): void {
        if (this.idleTween) {
            this.idleTween.stop();
            this.idleTween = null;
        }
        Tween.stopAllByTarget(this.node);
        if (this.opacity) Tween.stopAllByTarget(this.opacity);
        if (this.glowBaseNode) Tween.stopAllByTarget(this.glowBaseNode);
        if (this.glowCoreNode) Tween.stopAllByTarget(this.glowCoreNode);
        if (this.glowBaseOpacity) Tween.stopAllByTarget(this.glowBaseOpacity);
        if (this.glowCoreOpacity) Tween.stopAllByTarget(this.glowCoreOpacity);
    }

    private startGlowPulse(
        glowNode: Node | null,
        glowOpacity: UIOpacity | null,
        baseScale: number,
        amplitude: number,
        halfDuration: number,
        baseOpacity: number,
        opacityFloorFactor: number,
    ): void {
        if (!glowNode || !glowOpacity) return;

        const scaleUp = baseScale * (1 + amplitude);
        const scaleDown = baseScale * (1 - amplitude * 0.72);

        tween(glowNode)
            .to(halfDuration, { scale: new Vec3(scaleUp, scaleUp, 1) }, { easing: 'sineInOut' })
            .to(halfDuration, { scale: new Vec3(scaleDown, scaleDown, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();

        tween(glowOpacity)
            .to(halfDuration, { opacity: baseOpacity }, { easing: 'sineOut' })
            .to(halfDuration, { opacity: Math.round(baseOpacity * opacityFloorFactor) }, { easing: 'sineIn' })
            .union()
            .repeatForever()
            .start();
    }

    private applyGlowLevel(level: 0 | 1 | 2 | 3): void {
        const glowProfile = this.getGlowProfile(level);
        if (this.glowBaseNode) {
            this.glowBaseNode.setScale(new Vec3(glowProfile.baseScale, glowProfile.baseScale, 1));
        }
        if (this.glowCoreNode) {
            this.glowCoreNode.setScale(new Vec3(glowProfile.coreScale, glowProfile.coreScale, 1));
        }
        if (this.glowBaseOpacity) {
            this.glowBaseOpacity.opacity = glowProfile.baseOpacity;
        }
        if (this.glowCoreOpacity) {
            this.glowCoreOpacity.opacity = glowProfile.coreOpacity;
        }
    }

    private shouldUseSequenceFrames(): boolean {
        return !!this.sequenceFramesResourceDir;
    }

    private loadSequenceFrames(): void {
        if (!this.shouldUseSequenceFrames()) {
            this.logger.warn('Diagnostic: sequenceFramesResourceDir is empty, fire sequence will use fallback sprite.');
            this.restoreFallbackSprite();
            return;
        }

        resources.loadDir(this.sequenceFramesResourceDir, SpriteFrame, (err, assets) => {
            if (err || !assets || assets.length === 0 || !this.node?.isValid || !this.sprite) {
                this.logger.warn(`Diagnostic: failed to load fire frames from ${this.sequenceFramesResourceDir}. err=${err}`);
                return;
            }

            const filteredFrames = assets
                .slice()
                .filter((frame) => /^Layer\s+\d+$/i.test(frame.name))
                .sort((a, b) => this.extractFrameOrder(a.name) - this.extractFrameOrder(b.name));

            if (filteredFrames.length === 0) {
                this.logger.warn(`Diagnostic: no strict fire frames matched in ${this.sequenceFramesResourceDir}. assets=${assets.length}`);
                this.restoreFallbackSprite();
                return;
            }

            if (filteredFrames.length !== assets.length) {
                this.logger.info(`Diagnostic: filtered fire frames ${filteredFrames.length}/${assets.length}. Ignored non-Layer assets in ${this.sequenceFramesResourceDir}.`);
            }

            const orderedFrames = this.buildOrderedSequence(filteredFrames);
            if (orderedFrames.length === 0) {
                this.logger.warn(`Diagnostic: failed to build ordered fire sequence from ${this.sequenceFrameOrder}.`);
                this.restoreFallbackSprite();
                return;
            }

            this.sequenceFrames = orderedFrames;
            this.sequenceReady = this.sequenceFrames.length > 0;
            this.sequenceFrameIndex = 0;
            this.sequenceFrameTimer = 0;
            this.applySequenceFrame();
            this.logger.info(`Fire sequence ready. order=${this.sequenceFrames.map(frame => frame.name).join(' -> ')}, fps=${this.sequenceFrameFps}`);
        });
    }

    private restoreFallbackSprite(): void {
        if (this.sprite && this.fallbackSpriteFrame) {
            this.sprite.spriteFrame = this.fallbackSpriteFrame;
        }
    }

    private extractFrameOrder(name: string): number {
        const match = name.match(/(\d+)(?!.*\d)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    private buildOrderedSequence(filteredFrames: SpriteFrame[]): SpriteFrame[] {
        const framesByOrder = new Map<number, SpriteFrame>();
        filteredFrames.forEach((frame) => framesByOrder.set(this.extractFrameOrder(frame.name), frame));

        const requestedOrder = this.sequenceFrameOrder
            .split(',')
            .map((token) => parseInt(token.trim(), 10))
            .filter((value) => Number.isFinite(value));

        if (requestedOrder.length === 0) {
            this.logger.warn(`Diagnostic: invalid sequenceFrameOrder="${this.sequenceFrameOrder}". Falling back to sorted Layer order.`);
            return filteredFrames;
        }

        const orderedFrames: SpriteFrame[] = [];
        const missingOrders: number[] = [];

        requestedOrder.forEach((order) => {
            const frame = framesByOrder.get(order);
            if (frame) {
                orderedFrames.push(frame);
            } else {
                missingOrders.push(order);
            }
        });

        if (missingOrders.length > 0) {
            this.logger.warn(`Diagnostic: missing fire Layer frames for order entries: ${missingOrders.join(', ')}.`);
        }

        return orderedFrames;
    }

    private advanceSequence(dt: number): void {
        if (!this.sequenceReady || !this.sprite || this.sequenceFrames.length <= 1 || !this.node.activeInHierarchy || this.level <= 0) {
            return;
        }

        const profile = this.getLevelProfile(this.level as 0 | 1 | 2 | 3);
        const effectiveFps = Math.max(this.sequenceFrameFps * profile.fpsMultiplier, 1);
        const frameDuration = 1 / effectiveFps;
        this.sequenceFrameTimer += dt;
        while (this.sequenceFrameTimer >= frameDuration) {
            this.sequenceFrameTimer -= frameDuration;
            this.sequenceFrameIndex = (this.sequenceFrameIndex + 1) % this.sequenceFrames.length;
            this.applySequenceFrame();
        }
    }

    private applySequenceFrame(): void {
        if (!this.sprite || this.sequenceFrames.length === 0) return;
        this.sprite.spriteFrame = this.sequenceFrames[this.sequenceFrameIndex] || this.sequenceFrames[0];
    }

    private levelTargetScaleY(): number {
        return this.getLevelProfile(this.level as 0 | 1 | 2 | 3).scaleY;
    }

    private levelTargetOpacity(): number {
        return this.getLevelProfile(this.level as 0 | 1 | 2 | 3).opacity;
    }

    /** Сменить уровень огня (3=макс, 0=потух). Width не меняется — только height + opacity. */
    public setLevel(level: 0 | 1 | 2 | 3): void {
        this.level = level;
        if (!this.opacity) return;
        const targetY = this.levelTargetScaleY();
        const targetOpacity = this.levelTargetOpacity();
        const glowProfile = this.getGlowProfile(level);
        this.stopIdlePulse();
        // OI-521: на level 0 sequence-frame advance не нужен — гасим update.
        this.enabled = level > 0;
        // Плавный переход к новому уровню.
        tween(this.node)
            .to(this.levelTransitionSec, { scale: new Vec3(this.baseScaleX, targetY, 1) }, { easing: 'sineInOut' })
            .start();
        tween(this.opacity)
            .to(this.levelTransitionSec, { opacity: targetOpacity }, { easing: 'sineInOut' })
            .call(() => {
                if (level > 0 && !this.paused) this.startIdlePulse();
            })
            .start();

        if (this.glowBaseNode) {
            tween(this.glowBaseNode)
                .to(this.levelTransitionSec, { scale: new Vec3(glowProfile.baseScale, glowProfile.baseScale, 1) }, { easing: 'sineInOut' })
                .start();
        }
        if (this.glowCoreNode) {
            tween(this.glowCoreNode)
                .to(this.levelTransitionSec, { scale: new Vec3(glowProfile.coreScale, glowProfile.coreScale, 1) }, { easing: 'sineInOut' })
                .start();
        }
        if (this.glowBaseOpacity) {
            tween(this.glowBaseOpacity)
                .to(this.levelTransitionSec, { opacity: glowProfile.baseOpacity }, { easing: 'sineInOut' })
                .start();
        }
        if (this.glowCoreOpacity) {
            tween(this.glowCoreOpacity)
                .to(this.levelTransitionSec, { opacity: glowProfile.coreOpacity }, { easing: 'sineInOut' })
                .start();
        }
    }

    public pauseAnimation(): void {
        if (this.paused) return;
        this.paused = true;
        // OI-521: update не нужен пока анимация на паузе.
        this.enabled = false;
        this.stopIdlePulse();
    }

    public resumeAnimation(): void {
        if (!this.paused) return;
        this.paused = false;
        if (this.level > 0) {
            // OI-521: возобновляем update только если есть что анимировать.
            this.enabled = true;
            this.startIdlePulse();
        }
    }

    /** Полностью потушить (packshot). */
    public extinguish(): void {
        this.setLevel(0);
    }
}
