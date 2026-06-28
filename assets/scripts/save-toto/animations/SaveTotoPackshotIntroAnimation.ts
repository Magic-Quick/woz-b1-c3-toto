/**
 * Save Toto — event-driven packshot intro animation.
 *
 * Attached to CageRoot. Drives cage fade/scale and optional light FX reveal.
 */

import { _decorator, Component, Node, tween, Tween, Vec3, UIOpacity, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoPackshotIntroAnimation')
export class SaveTotoPackshotIntroAnimation extends Component {
    @property(Node)
    public lightFxNode: Node = null!;

    @property({ type: CCFloat })
    public bumpScale: number = 1.05;

    @property({ type: CCFloat })
    public settleScale: number = 0.92;

    @property({ type: CCFloat })
    public bumpDurationSec: number = 0.2;

    @property({ type: CCFloat })
    public fadeDurationSec: number = 0.4;

    private originalScale: Vec3 = new Vec3(1, 1, 1);

    onLoad(): void {
        this.originalScale = this.node.scale.clone();
        if (this.lightFxNode) {
            this.lightFxNode.active = false;
            const op = this.lightFxNode.getComponent(UIOpacity) || this.lightFxNode.addComponent(UIOpacity);
            op.opacity = 0;
        }
    }

    public play(): Promise<void> {
        if (!this.node || !this.node.isValid) return Promise.resolve();

        Tween.stopAllByTarget(this.node);
        const cageOpacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        Tween.stopAllByTarget(cageOpacity);
        cageOpacity.opacity = 255;
        this.node.setScale(this.originalScale);

        if (this.lightFxNode) {
            const lightOpacity = this.lightFxNode.getComponent(UIOpacity) || this.lightFxNode.addComponent(UIOpacity);
            Tween.stopAllByTarget(lightOpacity);
            this.lightFxNode.active = true;
            lightOpacity.opacity = 0;
            tween(lightOpacity).to(this.fadeDurationSec, { opacity: 255 }).start();
        }

        return new Promise<void>((resolve) => {
            tween(this.node)
                .to(this.bumpDurationSec, { scale: new Vec3(this.bumpScale, this.bumpScale, this.bumpScale) })
                .call(() => {
                    tween(cageOpacity).to(this.fadeDurationSec, { opacity: 110 }).start();
                })
                .to(this.fadeDurationSec, { scale: new Vec3(this.settleScale, this.settleScale, this.settleScale) })
                .call(() => resolve())
                .start();
        });
    }
}
