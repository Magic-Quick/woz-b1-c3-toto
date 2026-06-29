/**
 * Save Toto — idle pulse + level-driven animation для огня.
 *
 * Решает OI-203 v2: постоянная пульсация (яркость/контраст) + уровни снижаются
 * через высоту (scale.y) и интенсивность (opacity), ширина не меняется.
 * Предпочитает сжатую PNG-sequence из resources и использует DOM overlay
 * только как fallback для одиночного animated asset.
 * Unlock-последовательность использует 3 явные ступени затухания: 3 → 2 → 1 → 0.
 *
 * Привязывается к FireSprite node. ThreatView.setFireLevel() вызывает setLevel().
 */
import { _decorator, Component, tween, Tween, Vec3, UIOpacity, CCFloat, CCString, Sprite, SpriteFrame, resources, Asset, UITransform, game, sys, director } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoFireAnimation')
export class SaveTotoFireAnimation extends Component {
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

    @property({ type: CCString, tooltip: 'Resources path до animated fire asset без расширения' })
    public animatedOverlayResourcePath: string = 'save-toto/fire/fire';

    private opacity: UIOpacity | null = null;
    private idleTween: any = null;
    private level = 3;
    private sprite: Sprite | null = null;
    private fallbackSpriteFrame: SpriteFrame | null = null;
    private fireUiTransform: UITransform | null = null;
    private canvasTransform: UITransform | null = null;
    private overlayImg: HTMLImageElement | null = null;
    private overlayContainer: HTMLElement | null = null;
    private overlayReady = false;
    private sequenceFrames: SpriteFrame[] = [];
    private sequenceReady = false;
    private sequenceFrameIndex = 0;
    private sequenceFrameTimer = 0;

    private getLevelProfile(level: 0 | 1 | 2 | 3): { scaleY: number; opacity: number; pulseAmplitude: number } {
        switch (level) {
            case 2:
                return {
                    scaleY: this.level2ScaleY,
                    opacity: this.level2Opacity,
                    pulseAmplitude: this.idleAmplitude * 0.72,
                };
            case 1:
                return {
                    scaleY: this.level1ScaleY,
                    opacity: this.level1Opacity,
                    pulseAmplitude: this.idleAmplitude * 0.45,
                };
            case 0:
                return {
                    scaleY: this.level0ScaleY,
                    opacity: 0,
                    pulseAmplitude: 0,
                };
            case 3:
            default:
                return {
                    scaleY: this.maxScaleY,
                    opacity: this.maxOpacity,
                    pulseAmplitude: this.idleAmplitude,
                };
        }
    }

    onLoad(): void {
        this.opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        this.sprite = this.node.getComponent(Sprite) || null;
        this.fireUiTransform = this.node.getComponent(UITransform) || null;
        this.canvasTransform = director.getScene()?.getChildByName('Canvas')?.getComponent(UITransform) || null;
        this.fallbackSpriteFrame = this.sprite?.spriteFrame ?? null;
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
        if (this.sprite && (this.shouldUseSequenceFrames() || this.shouldUseAnimatedOverlay())) {
            this.sprite.spriteFrame = null;
        }
        this.loadSequenceFrames();
        this.startIdlePulse();
    }

    update(dt: number): void {
        if (this.sequenceReady) {
            this.advanceSequence(dt);
            return;
        }

        this.syncOverlayToNode();
    }

    onDisable(): void {
        this.setOverlayVisible(false);
    }

    onEnable(): void {
        this.setOverlayVisible(true);
    }

    onDestroy(): void {
        this.destroyOverlayElement();
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

    private shouldUseAnimatedOverlay(): boolean {
        return !!this.animatedOverlayResourcePath && sys.isBrowser && typeof document !== 'undefined';
    }

    private shouldUseSequenceFrames(): boolean {
        return !!this.sequenceFramesResourceDir;
    }

    private loadSequenceFrames(): void {
        if (!this.shouldUseSequenceFrames()) {
            this.loadAnimatedOverlay();
            return;
        }

        resources.loadDir(this.sequenceFramesResourceDir, SpriteFrame, (err, assets) => {
            if (err || !assets || assets.length === 0 || !this.node?.isValid || !this.sprite) {
                this.loadAnimatedOverlay();
                return;
            }

            this.sequenceFrames = assets
                .slice()
                .sort((a, b) => this.extractFrameOrder(a.name) - this.extractFrameOrder(b.name));
            this.sequenceReady = this.sequenceFrames.length > 0;
            this.sequenceFrameIndex = 0;
            this.sequenceFrameTimer = 0;
            this.applySequenceFrame();
        });
    }

    private loadAnimatedOverlay(): void {
        if (!this.shouldUseAnimatedOverlay()) return;

        resources.load(this.animatedOverlayResourcePath, Asset, (err, asset) => {
            if (err || !asset || !this.node?.isValid) {
                this.restoreFallbackSprite();
                return;
            }

            const nativeUrl = (asset as Asset & { nativeUrl?: string }).nativeUrl;
            if (!nativeUrl) {
                this.restoreFallbackSprite();
                return;
            }

            const container = game.container as HTMLElement | null;
            if (!container || !game.canvas) {
                this.restoreFallbackSprite();
                return;
            }

            if (getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }

            const img = document.createElement('img');
            img.src = nativeUrl;
            img.alt = 'fire';
            img.draggable = false;
            img.style.position = 'absolute';
            img.style.pointerEvents = 'none';
            img.style.userSelect = 'none';
            img.style.transformOrigin = 'center bottom';
            img.style.objectFit = 'fill';
            img.style.zIndex = '4';
            img.style.display = 'none';

            container.appendChild(img);
            this.overlayContainer = container;
            this.overlayImg = img;
            this.overlayReady = true;
            this.syncOverlayToNode();
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

    private advanceSequence(dt: number): void {
        if (!this.sprite || this.sequenceFrames.length <= 1 || !this.node.activeInHierarchy || this.level <= 0) {
            return;
        }

        const frameDuration = 1 / Math.max(this.sequenceFrameFps, 1);
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

    private syncOverlayToNode(): void {
        if (!this.overlayReady || !this.overlayImg || !this.overlayContainer || !game.canvas || !this.fireUiTransform || !this.canvasTransform) {
            return;
        }

        if (!this.node.activeInHierarchy || this.level <= 0) {
            this.overlayImg.style.display = 'none';
            return;
        }

        const width = this.fireUiTransform.contentSize.width;
        const height = this.fireUiTransform.contentSize.height;
        const minWorld = this.fireUiTransform.convertToWorldSpaceAR(new Vec3(-width * this.fireUiTransform.anchorX, -height * this.fireUiTransform.anchorY, 0));
        const maxWorld = this.fireUiTransform.convertToWorldSpaceAR(new Vec3(width * (1 - this.fireUiTransform.anchorX), height * (1 - this.fireUiTransform.anchorY), 0));

        const minLocal = this.canvasTransform.convertToNodeSpaceAR(minWorld);
        const maxLocal = this.canvasTransform.convertToNodeSpaceAR(maxWorld);
        const canvasSize = this.canvasTransform.contentSize;
        const canvasRect = game.canvas.getBoundingClientRect();
        const containerRect = this.overlayContainer.getBoundingClientRect();

        const left = ((minLocal.x + canvasSize.width * 0.5) / canvasSize.width) * canvasRect.width + (canvasRect.left - containerRect.left);
        const right = ((maxLocal.x + canvasSize.width * 0.5) / canvasSize.width) * canvasRect.width + (canvasRect.left - containerRect.left);
        const top = ((canvasSize.height * 0.5 - maxLocal.y) / canvasSize.height) * canvasRect.height + (canvasRect.top - containerRect.top);
        const bottom = ((canvasSize.height * 0.5 - minLocal.y) / canvasSize.height) * canvasRect.height + (canvasRect.top - containerRect.top);

        this.overlayImg.style.left = `${left}px`;
        this.overlayImg.style.top = `${top}px`;
        this.overlayImg.style.width = `${Math.max(0, right - left)}px`;
        this.overlayImg.style.height = `${Math.max(0, bottom - top)}px`;
        this.overlayImg.style.opacity = `${(this.opacity?.opacity ?? 255) / 255}`;
        this.overlayImg.style.display = 'block';
    }

    private setOverlayVisible(visible: boolean): void {
        if (!this.overlayImg) return;
        if (!visible || this.level <= 0 || !this.node.activeInHierarchy) {
            this.overlayImg.style.display = 'none';
            return;
        }
        this.syncOverlayToNode();
    }

    private destroyOverlayElement(): void {
        if (this.overlayImg?.parentElement) {
            this.overlayImg.parentElement.removeChild(this.overlayImg);
        }
        this.overlayImg = null;
        this.overlayContainer = null;
        this.overlayReady = false;
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
