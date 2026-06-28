/**
 * Save Toto — конкретные анимации выигрышных элементов (перенесены из slot-game/Slot/Animations/WinAnimationEffects.ts).
 */

import { Node, Tween, tween } from 'cc';
import { SaveTotoBaseWinAnimation } from './SaveTotoBaseWinAnimation';
import { IWinAnimationConfig } from '../../interfaces/IWinAnimationTypes';

abstract class SaveTotoScaleAnimation extends SaveTotoBaseWinAnimation {
    protected abstract getScaleMultiplier(): number;
    protected abstract getScaleDirection(): number;

    public start(): Tween<any> | null {
        this.stop();

        const originalScale = this.originalState.scale;
        const scaleMultiplier = this.getScaleMultiplier();
        const targetScale = originalScale.clone().multiplyScalar(1.0 + this.getScaleDirection() * scaleMultiplier);

        this.tween = tween(this.node)
            .to(this.getDuration() * 0.5, { scale: targetScale }, { easing: 'sineInOut' })
            .to(this.getDuration() * 0.5, { scale: originalScale }, { easing: 'sineInOut' })
            .union();

        this.applyRepeatLogic();
        return this.tween.start();
    }

    public stop(): void {
        this.stopTween();
        this.restoreOriginalState();
    }

    private stopTween(): void {
        if (this.tween) {
            this.tween.stop();
            this.tween = null;
        }
    }

    private applyRepeatLogic(): void {
        if (this.config.repeatCount === -1) {
            this.tween!.repeatForever();
        } else if (this.config.repeatCount > 0) {
            this.tween!.repeat(this.config.repeatCount);
        }
    }
}

export class SaveTotoScaleUpAnimation extends SaveTotoScaleAnimation {
    protected getScaleMultiplier(): number {
        return (this.config.customParams?.scaleUpMultiplier as number) || 0.5;
    }

    protected getScaleDirection(): number {
        return 1;
    }
}

export class SaveTotoScaleDownAnimation extends SaveTotoScaleAnimation {
    protected getScaleMultiplier(): number {
        return (this.config.customParams?.scaleDownMultiplier as number) || 0.3;
    }

    protected getScaleDirection(): number {
        return -1;
    }
}

export class SaveTotoAlphaChangeAnimation extends SaveTotoBaseWinAnimation {
    public start(): Tween<any> | null {
        this.stop();

        const slotElement = this.getSlotElement();
        if (!slotElement?.picture) {
            return null;
        }

        const sprite = slotElement.picture;
        const originalColor = sprite.color.clone();
        const targetColor = originalColor.clone();
        const alphaMultiplier = (this.config.customParams?.alphaChangeMultiplier as number) || 0.4;
        targetColor.a = originalColor.a * (0.3 + alphaMultiplier);

        this.tween = tween(sprite)
            .to(this.getDuration() * 0.5, { color: targetColor }, { easing: 'sineInOut' })
            .to(this.getDuration() * 0.5, { color: originalColor }, { easing: 'sineInOut' })
            .union();

        this.applyRepeatLogic();
        return this.tween.start();
    }

    public stop(): void {
        if (this.tween) {
            this.tween.stop();
            this.tween = null;
        }
        this.restoreOriginalState();
    }

    private applyRepeatLogic(): void {
        if (this.config.repeatCount === -1) {
            this.tween!.repeatForever();
        } else if (this.config.repeatCount > 0) {
            this.tween!.repeat(this.config.repeatCount);
        }
    }
}

export type { IWinAnimationConfig };
