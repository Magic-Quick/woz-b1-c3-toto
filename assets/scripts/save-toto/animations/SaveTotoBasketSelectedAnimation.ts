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
            // Более сочная/интенсивная selection: двух-волна scale + долгий hold glow.
            tween(this.node)
                .to(this.scaleUpDurationSec, { scale: targetScale }, { easing: 'backOut' })
                .to(this.scaleDownDurationSec * 0.6, { scale: this.originalScale.clone().multiplyScalar(1.04) }, { easing: 'sineInOut' })
                .to(this.scaleDownDurationSec, { scale: this.originalScale }, { easing: 'sineInOut' })
                .call(() => resolve())
                .start();

            if (this.glow) {
                const op = this.glow.getComponent(UIOpacity) || this.glow.addComponent(UIOpacity);
                Tween.stopAllByTarget(op);
                Tween.stopAllByTarget(this.glow);
                op.opacity = 0;
                // Glow: яркий flash + долгий hold + пульсация масштаба glow.
                tween(op)
                    .to(this.glowInDurationSec, { opacity: 255 })
                    .to(this.glowHoldDurationSec, { opacity: 230 })
                    .to(this.glowOutDurationSec, { opacity: 0 })
                    .start();
                const glowScaleUp = this.glow.scale.clone().multiplyScalar(1.35);
                tween(this.glow)
                    .to(this.glowInDurationSec, { scale: glowScaleUp }, { easing: 'sineOut' })
                    .to(this.glowHoldDurationSec, { scale: glowScaleUp.clone().multiplyScalar(0.92) })
                    .to(this.glowOutDurationSec, { scale: this.glow.scale.clone() })
                    .start();
            }
        });
    }
}
