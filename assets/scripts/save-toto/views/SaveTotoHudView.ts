/**
 * Save Toto — view HUD-слоя (implements SaveTotoHudView).
 *
 * CTA pulse по возможности делегируется компоненту SaveTotoCtaPulseAnimation
 * на CtaButton node; при его отсутствии используется tween fallback.
 */

import { _decorator, Component, Button, Node } from 'cc';
import { SaveTotoHudView as ISaveTotoHudView } from '../interfaces/SaveTotoViews';
import { SaveTotoAutoPulse } from '../animations/SaveTotoAutoPulse';

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
        // DA-010: стартуем SPIN скрытым — state machine покажет кнопку в
        // enterSpinReady после intro. Раньше один кадр SPIN был виден/интерактивен
        // до enterIntro (безопасно, но визуальный артефакт).
        this.showSpinButton(false);
        this.showCtaButton(false);
    }

    public showSpinButton(active: boolean): void {
        if (this.spinButtonNode) this.spinButtonNode.active = active;
        this.setSpinButtonInteractable(active);
    }

    public setSpinButtonInteractable(interactable: boolean): void {
        if (this.spinButton) this.spinButton.interactable = interactable;

        const pulse = this.spinButtonNode?.getComponent(SaveTotoAutoPulse);
        if (!pulse) return;

        if (interactable) {
            pulse.play();
        } else {
            pulse.stopAndReset();
        }
    }

    public showCtaButton(active: boolean): void {
        if (this.ctaButtonNode) this.ctaButtonNode.active = active;
        if (this.ctaButton) this.ctaButton.interactable = active;
    }
}
