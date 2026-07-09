/**
 * Save Toto — level-driven fire presentation.
 *
 * Visual fire loop проигрывается editor-driven Animation на дочернем
 * FireAnimatedSprite. Скрипт не хардкодит position и опирается на scene setup:
 * visual node можно двигать вручную в редакторе. Gameplay управляет только
 * интенсивностью огня: uniform scale, opacity, glow и playback speed.
 */
import { _decorator, Animation, AnimationState, CCFloat, Component, Node, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { SaveTotoFireLevel } from '../types';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoFireAnimation')
export class SaveTotoFireAnimation extends Component {
    private logger = createSaveTotoLogger('SaveTotoFireAnimation');

    @property({ type: CCFloat, tooltip: 'Базовый multiplier ширины огня' })
    public baseScaleX: number = 1;

    @property({ type: CCFloat, tooltip: 'Максимальный scale на уровне F4' })
    public maxScale: number = 1;

    @property({ type: CCFloat, tooltip: 'Scale на уровне F3 (после первого spin win)' })
    public level3Scale: number = 0.88;

    @property({ type: CCFloat, tooltip: 'Scale на уровне F2 (первый pick bonus)' })
    public level2Scale: number = 0.74;

    @property({ type: CCFloat, tooltip: 'Scale на уровне F1 (второй pick bonus)' })
    public level1Scale: number = 0.48;

    @property({ type: CCFloat, tooltip: 'Остаточный scale на уровне F0 перед полным затуханием' })
    public level0Scale: number = 0.2;

    @property({ type: CCFloat, tooltip: 'Длительность перехода между уровнями (сек)' })
    public levelTransitionSec: number = 0.45;

    @property({ type: CCFloat, tooltip: 'Макс opacity на уровне F4' })
    public maxOpacity: number = 255;

    @property({ type: CCFloat, tooltip: 'Opacity на уровне F3' })
    public level3Opacity: number = 228;

    @property({ type: CCFloat, tooltip: 'Opacity на уровне F2' })
    public level2Opacity: number = 190;

    @property({ type: CCFloat, tooltip: 'Opacity на уровне F1' })
    public level1Opacity: number = 105;

    @property({ type: Node, tooltip: 'Дочерний sprite node с editor AnimationClip fire loop' })
    public animatedSpriteNode: Node | null = null;

    @property({ type: Node, tooltip: 'Мягкий внешний glow под огнём' })
    public glowBaseNode: Node | null = null;

    @property({ type: Node, tooltip: 'Более яркий core glow под огнём' })
    public glowCoreNode: Node | null = null;

    @property({ type: CCFloat, tooltip: 'Базовый scale для outer glow' })
    public glowBaseScale: number = 1.16;

    @property({ type: CCFloat, tooltip: 'Базовый scale для core glow' })
    public glowCoreScale: number = 1.04;

    private level: SaveTotoFireLevel = 4;
    private paused = false;
    private glowBaseOpacity: UIOpacity | null = null;
    private glowCoreOpacity: UIOpacity | null = null;
    private animatedSpriteOpacity: UIOpacity | null = null;
    private animatedSpriteAnimation: Animation | null = null;
    private animatedSpriteState: AnimationState | null = null;

    private getGlowProfile(level: SaveTotoFireLevel): {
        baseOpacity: number;
        coreOpacity: number;
        baseScale: number;
        coreScale: number;
    } {
        switch (level) {
            case 3:
                return {
                    baseOpacity: 160,
                    coreOpacity: 186,
                    baseScale: this.glowBaseScale * 0.98,
                    coreScale: this.glowCoreScale * 0.97,
                };
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
            case 4:
            default:
                return {
                    baseOpacity: 180,
                    coreOpacity: 200,
                    baseScale: this.glowBaseScale,
                    coreScale: this.glowCoreScale,
                };
        }
    }

    private getLevelProfile(level: SaveTotoFireLevel): { scale: number; opacity: number; fpsMultiplier: number } {
        switch (level) {
            case 3:
                return {
                    scale: this.level3Scale,
                    opacity: this.level3Opacity,
                    fpsMultiplier: 0.94,
                };
            case 2:
                return {
                    scale: this.level2Scale,
                    opacity: this.level2Opacity,
                    fpsMultiplier: 0.88,
                };
            case 1:
                return {
                    scale: this.level1Scale,
                    opacity: this.level1Opacity,
                    fpsMultiplier: 0.72,
                };
            case 0:
                return {
                    scale: this.level0Scale,
                    opacity: 0,
                    fpsMultiplier: 0,
                };
            case 4:
            default:
                return {
                    scale: this.maxScale,
                    opacity: this.maxOpacity,
                    fpsMultiplier: 1,
                };
        }
    }

    onLoad(): void {
        this.glowBaseOpacity = this.glowBaseNode?.getComponent(UIOpacity) || this.glowBaseNode?.addComponent(UIOpacity) || null;
        this.glowCoreOpacity = this.glowCoreNode?.getComponent(UIOpacity) || this.glowCoreNode?.addComponent(UIOpacity) || null;
        this.animatedSpriteOpacity = this.animatedSpriteNode?.getComponent(UIOpacity) || this.animatedSpriteNode?.addComponent(UIOpacity) || null;
        this.animatedSpriteAnimation = this.animatedSpriteNode?.getComponent(Animation) || null;

        if (!this.animatedSpriteNode) {
            this.logger.warn('Diagnostic: animatedSpriteNode is not bound. Fire loop clip will not play.');
        } else if (!this.animatedSpriteAnimation) {
            this.logger.warn('Diagnostic: Animation component is missing on animatedSpriteNode. Fire loop clip will not play.');
        }
        if (!this.glowBaseNode || !this.glowCoreNode) {
            this.logger.warn('Diagnostic: glowBaseNode/glowCoreNode are not fully bound. Fire glow response will be partial.');
        }

        this.applyVisualLevel(this.level);
        this.applyGlowLevel(this.level);
        this.syncAnimatedSpritePlayback(this.level, true);
    }

    private stopVisualTweens(): void {
        if (this.animatedSpriteNode) {
            Tween.stopAllByTarget(this.animatedSpriteNode);
        }
        if (this.animatedSpriteOpacity) {
            Tween.stopAllByTarget(this.animatedSpriteOpacity);
        }
        if (this.glowBaseNode) {
            Tween.stopAllByTarget(this.glowBaseNode);
        }
        if (this.glowCoreNode) {
            Tween.stopAllByTarget(this.glowCoreNode);
        }
        if (this.glowBaseOpacity) {
            Tween.stopAllByTarget(this.glowBaseOpacity);
        }
        if (this.glowCoreOpacity) {
            Tween.stopAllByTarget(this.glowCoreOpacity);
        }
    }

    private buildVisualScale(levelScale: number): Vec3 {
        return new Vec3(this.baseScaleX * levelScale, levelScale, 1);
    }

    private applyVisualLevel(level: SaveTotoFireLevel): void {
        const profile = this.getLevelProfile(level);
        if (this.animatedSpriteNode) {
            this.animatedSpriteNode.setScale(this.buildVisualScale(profile.scale));
        }
        if (this.animatedSpriteOpacity) {
            this.animatedSpriteOpacity.opacity = profile.opacity;
        }
    }

    private applyGlowLevel(level: SaveTotoFireLevel): void {
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

    private getAnimatedClipName(): string | null {
        return this.animatedSpriteAnimation?.defaultClip?.name ?? null;
    }

    private syncAnimatedSpritePlayback(level: SaveTotoFireLevel, forceRestart: boolean): void {
        if (!this.animatedSpriteNode || !this.animatedSpriteAnimation) {
            return;
        }

        if (level <= 0) {
            this.animatedSpriteAnimation.pause();
            return;
        }

        const clipName = this.getAnimatedClipName();
        if (!clipName) {
            this.logger.warn('Diagnostic: default fire clip is not assigned on animatedSpriteNode.Animation.');
            return;
        }

        this.animatedSpriteNode.active = true;
        if (forceRestart || !this.animatedSpriteState) {
            this.animatedSpriteAnimation.play(clipName);
            this.animatedSpriteState = this.animatedSpriteAnimation.getState(clipName) ?? null;
        } else {
            this.animatedSpriteAnimation.resume();
        }

        const profile = this.getLevelProfile(level);
        if (this.animatedSpriteState) {
            this.animatedSpriteState.speed = Math.max(profile.fpsMultiplier, 0.01);
        }
    }

    public setLevel(level: SaveTotoFireLevel): void {
        this.level = level;
        if (!this.animatedSpriteNode || !this.animatedSpriteOpacity) {
            return;
        }

        const profile = this.getLevelProfile(level);
        const glowProfile = this.getGlowProfile(level);
        this.stopVisualTweens();
        this.syncAnimatedSpritePlayback(level, false);

        tween(this.animatedSpriteNode)
            .to(this.levelTransitionSec, { scale: this.buildVisualScale(profile.scale) }, { easing: 'sineInOut' })
            .start();
        tween(this.animatedSpriteOpacity)
            .to(this.levelTransitionSec, { opacity: profile.opacity }, { easing: 'sineInOut' })
            .call(() => {
                if (level === 0 && this.animatedSpriteNode) {
                    this.animatedSpriteNode.active = false;
                }
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
        this.animatedSpriteAnimation?.pause();
    }

    public resumeAnimation(): void {
        if (!this.paused) return;
        this.paused = false;
        if (this.level > 0) {
            this.syncAnimatedSpritePlayback(this.level, false);
        }
    }

    public extinguish(): void {
        this.setLevel(0);
    }
}
