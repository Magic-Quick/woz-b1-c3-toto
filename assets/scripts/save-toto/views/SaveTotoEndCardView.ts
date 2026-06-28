/**
 * Save Toto — view end-card слоя.
 *
 * Теперь умеет запускать CTA pulse на реальной end-card кнопке PlayNowButton,
 * если на её node присутствует SaveTotoCtaPulseAnimation.
 */

import { _decorator, Component, Node, Label, tween, UIOpacity, Button } from 'cc';
import { SaveTotoCtaPulseAnimation } from '../animations/SaveTotoCtaPulseAnimation';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoEndCardView')
export class SaveTotoEndCardView extends Component {
    @property(Node)
    public root: Node = null!;

    @property(Node)
    public endTotoRoot: Node = null!;

    @property(Label)
    public endWinLabel: Label = null!;

    @property(Button)
    public playNowButton: Button = null!;

    onLoad(): void {
        this.hideImmediate();
    }

    public hideImmediate(): void {
        if (this.root) this.root.active = false;
        this.stopCtaPulse();
    }

    public async show(finalWin: number): Promise<void> {
        if (this.endWinLabel) {
            this.endWinLabel.string = `${Math.round(finalWin)}`;
        }
        if (this.root) this.root.active = true;

        const op = this.root.getComponent(UIOpacity) || this.root.addComponent(UIOpacity);
        op.opacity = 0;

        return new Promise<void>((resolve) => {
            tween(op)
                .to(0.5, { opacity: 255 })
                .call(() => {
                    this.playCtaPulse();
                    resolve();
                })
                .start();
        });
    }

    public hide(): void {
        this.stopCtaPulse();
        if (this.root) this.root.active = false;
    }

    public getPlayNowButton(): Button {
        return this.playNowButton;
    }

    private playCtaPulse(): void {
        const pulse = this.playNowButton?.node?.getComponent(SaveTotoCtaPulseAnimation);
        pulse?.play();
    }

    private stopCtaPulse(): void {
        const pulse = this.playNowButton?.node?.getComponent(SaveTotoCtaPulseAnimation);
        pulse?.stopAndReset();
    }
}
