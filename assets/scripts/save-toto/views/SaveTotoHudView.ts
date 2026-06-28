/**
 * Save Toto — view HUD-слоя (implements SaveTotoHudView).
 *
 * CTA pulse по возможности делегируется компоненту SaveTotoCtaPulseAnimation
 * на CtaButton node; при его отсутствии используется tween fallback.
 */

import { _decorator, Component, Button, Node, tween, Vec3 } from 'cc';
import { SaveTotoHudView as ISaveTotoHudView } from '../interfaces/SaveTotoViews';
import { SaveTotoCtaPulseAnimation } from '../animations/SaveTotoCtaPulseAnimation';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoHudView')
export class SaveTotoHudView extends Component implements ISaveTotoHudView {
    @property(Node)
    public spinButtonNode: Node = null!;

    @property(Button)
    public spinButton: Button = null!;

    @property(Node)
    public ctaButtonNode: Node = null!;

    @property(Button)
    public ctaButton: Button = null!;

    onLoad(): void {
        this.showSpinButton(true);
        this.showCtaButton(false);
    }

    public showSpinButton(active: boolean): void {
        if (this.spinButtonNode) this.spinButtonNode.active = active;
        if (this.spinButton) this.spinButton.interactable = active;
    }

    public showCtaButton(active: boolean): void {
        if (this.ctaButtonNode) this.ctaButtonNode.active = active;
        if (this.ctaButton) this.ctaButton.interactable = active;
    }

    public pulseCta(): void {
        if (!this.ctaButtonNode) return;

        const pulseComponent = this.ctaButtonNode.getComponent(SaveTotoCtaPulseAnimation);
        if (pulseComponent) {
            pulseComponent.play();
            return;
        }

        tween(this.ctaButtonNode)
            .to(0.4, { scale: new Vec3(1.08, 1.08, 1.08) }, { easing: 'sineInOut' })
            .to(0.4, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
}
