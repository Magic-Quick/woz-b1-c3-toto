/**
 * Save Toto — event-driven basket selected animation.
 *
 * Self-contained component for Basket_01..06 nodes.
 * Handles scale pulse + optional glow fade.
 */

import { _decorator, Component, Node, tween, Tween, Vec3, UIOpacity, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoBasketSelectedAnimation')
export class SaveTotoBasketSelectedAnimation extends Component {
    @property(Node)
    public glow: Node = null!;

    @property({ type: CCFloat })
    public peakScaleMultiplier: number = 0.18;

    @property({ type: CCFloat })
    public scaleUpDurationSec: number = 0.16;

    @property({ type: CCFloat })
    public scaleDownDurationSec: number = 0.18;

    @property({ type: CCFloat })
    public glowInDurationSec: number = 0.12;

    @property({ type: CCFloat })
    public glowHoldDurationSec: number = 0.3;

    @property({ type: CCFloat })
    public glowOutDurationSec: number = 0.2;

    private originalScale: Vec3 = new Vec3(1, 1, 1);

    onLoad(): void {
        this.originalScale = this.node.scale.clone();
        if (this.glow) {
            const op = this.glow.getComponent(UIOpacity) || this.glow.addComponent(UIOpacity);
            op.opacity = 0;
        }
    }

    public play(): Promise<void> {
        if (!this.node || !this.node.isValid) return Promise.resolve();

        Tween.stopAllByTarget(this.node);
        this.node.setScale(this.originalScale);

        const targetScale = this.originalScale.clone().multiplyScalar(1 + this.peakScaleMultiplier);

        return new Promise<void>((resolve) => {
            tween(this.node)
                .to(this.scaleUpDurationSec, { scale: targetScale }, { easing: 'sineOut' })
                .to(this.scaleDownDurationSec, { scale: this.originalScale }, { easing: 'sineInOut' })
                .call(() => resolve())
                .start();

            if (this.glow) {
                const op = this.glow.getComponent(UIOpacity) || this.glow.addComponent(UIOpacity);
                Tween.stopAllByTarget(op);
                op.opacity = 0;
                tween(op)
                    .to(this.glowInDurationSec, { opacity: 255 })
                    .delay(this.glowHoldDurationSec)
                    .to(this.glowOutDurationSec, { opacity: 0 })
                    .start();
            }
        });
    }
}
