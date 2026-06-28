/**
 * Save Toto — event-driven CTA pulse animation.
 *
 * Attached to CTA button node. Starts/stops a reusable pulse loop on demand.
 */

import { _decorator, Component, tween, Tween, Vec3, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoCtaPulseAnimation')
export class SaveTotoCtaPulseAnimation extends Component {
    @property({ type: CCFloat })
    public scaleMultiplier: number = 0.08;

    @property({ type: CCFloat })
    public halfDurationSec: number = 0.4;

    private originalScale: Vec3 = new Vec3(1, 1, 1);
    private playing: boolean = false;

    onLoad(): void {
        this.originalScale = this.node.scale.clone();
    }

    onDisable(): void {
        this.stopAndReset();
    }

    public play(): void {
        if (this.playing || !this.node || !this.node.isValid) return;
        this.stopAndReset(false);
        this.playing = true;
        const targetScale = this.originalScale.clone().multiplyScalar(1 + this.scaleMultiplier);
        tween(this.node)
            .to(this.halfDurationSec, { scale: targetScale }, { easing: 'sineInOut' })
            .to(this.halfDurationSec, { scale: this.originalScale }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    public stopAndReset(resetScale: boolean = true): void {
        Tween.stopAllByTarget(this.node);
        if (resetScale && this.node && this.node.isValid) {
            this.node.setScale(this.originalScale);
        }
        this.playing = false;
    }
}
