/**
 * Save Toto — event-driven lock open/remove animation.
 *
 * Self-contained component for LockLeft/Center/Right nodes.
 * Phase-2 animation layer: view calls this component if present, otherwise falls
 * back to inline tween. Later can be replaced by real AnimationClip without
 * changing SaveTotoLockView contract.
 */

import { _decorator, Component, tween, Tween, Vec3, UIOpacity, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoLockOpenRemoveAnimation')
export class SaveTotoLockOpenRemoveAnimation extends Component {
    @property({ type: CCFloat })
    public scaleUpMultiplier: number = 0.25;

    @property({ type: CCFloat })
    public scaleUpDurationSec: number = 0.12;

    @property({ type: CCFloat })
    public dropDistance: number = 120;

    @property({ type: CCFloat })
    public removeDurationSec: number = 0.25;

    private originalPos: Vec3 = new Vec3();
    private originalScale: Vec3 = new Vec3(1, 1, 1);

    onLoad(): void {
        this.originalPos = this.node.position.clone();
        this.originalScale = this.node.scale.clone();
    }

    public play(): Promise<void> {
        if (!this.node || !this.node.isValid) return Promise.resolve();

        Tween.stopAllByTarget(this.node);
        const opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        Tween.stopAllByTarget(opacity);
        opacity.opacity = 255;
        this.node.setScale(this.originalScale);
        this.node.setPosition(this.originalPos);

        const targetScale = this.originalScale.clone().multiplyScalar(1 + this.scaleUpMultiplier);
        const targetPos = new Vec3(this.originalPos.x, this.originalPos.y - this.dropDistance, this.originalPos.z);

        return new Promise<void>((resolve) => {
            tween(this.node)
                .to(this.scaleUpDurationSec, { scale: targetScale }, { easing: 'sineOut' })
                .call(() => {
                    tween(opacity).to(this.removeDurationSec, { opacity: 0 }).start();
                })
                .to(this.removeDurationSec, { position: targetPos }, { easing: 'quadIn' })
                .call(() => {
                    this.node.active = false;
                    resolve();
                })
                .start();
        });
    }
}
