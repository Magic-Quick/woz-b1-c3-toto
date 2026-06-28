/**
 * Save Toto — view одной корзины бонуса (для SaveTotoBasket.prefab).
 *
 * MVP: без open-basket sprite (OI-106). Selected state через scale/glow/label.
 * Tween-реализация; мигрирует на `basket_selected.anim` (ANIMATION_STRATEGY.md §5).
 */

import { _decorator, Component, Button, Label, Node, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoBonusReward, SaveTotoRewardKind } from '../types';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoBasketView')
export class SaveTotoBasketView extends Component {
    @property
    public basketIndex: number = 0;

    @property(Button)
    public basketButton: Button = null!;

    @property(Label)
    public rewardLabel: Label = null!;

    @property(Node)
    public glow: Node = null!;

    private opened: boolean = false;

    public onLoad(): void {
        if (this.glow) {
            const op = this.glow.getComponent(UIOpacity) || this.glow.addComponent(UIOpacity);
            op.opacity = 0;
        }
        if (this.rewardLabel) {
            this.rewardLabel.node.active = false;
        }
    }

    public setEnabled(enabled: boolean): void {
        if (this.basketButton) {
            this.basketButton.interactable = enabled && !this.opened;
        }
    }

    public isOpened(): boolean {
        return this.opened;
    }

    public async playSelected(reward: SaveTotoBonusReward): Promise<void> {
        if (this.opened) return;
        this.opened = true;
        if (this.basketButton) this.basketButton.interactable = false;

        if (this.rewardLabel) {
            this.rewardLabel.string = this.formatReward(reward);
            this.rewardLabel.node.active = true;
        }

        return new Promise<void>((resolve) => {
            tween(this.node)
                .to(0.16, { scale: new Vec3(1.18, 1.18, 1.18) })
                .to(0.18, { scale: new Vec3(1, 1, 1) })
                .call(() => resolve())
                .start();

            if (this.glow) {
                const op = this.glow.getComponent(UIOpacity);
                if (op) {
                    tween(op)
                        .to(0.12, { opacity: 255 })
                        .delay(0.3)
                        .to(0.2, { opacity: 0 })
                        .start();
                }
            }
        });
    }

    private formatReward(reward: SaveTotoBonusReward): string {
        if (reward.kind === SaveTotoRewardKind.MULTIPLIER) {
            return `x${reward.value}`;
        }
        return reward.label;
    }
}
