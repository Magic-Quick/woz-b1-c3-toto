/**
 * Save Toto — CTA/end-card экран (адаптирован из slot-game/Slot/CTAScreen.ts).
 *
 * АДАПТАЦИЯ: форматирование награды вынесено в отдельный метод formatAmount,
 * чтобы WIN оставался фиксированным visual label (OI-204), а числовое значение
 * формировалось state machine/PayoutSystem. Показ CTA gated state machine
 * (только после Payout), не generic after-spins (OI-407).
 */

import { _decorator, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoCTAScreen')
export class SaveTotoCTAScreen extends Component {
    @property(Label)
    public rewardAmount: Label = null!;

    @property({ tooltip: 'Родительская нода CTA/end-card экрана' })
    public ctaNode: Node = null!;

    public setRewardAmount(amount: number): void {
        if (!this.rewardAmount) {
            return;
        }

        this.rewardAmount.string = this.formatAmount(amount);
    }

    /** Форматирование числового значения для end-card. */
    protected formatAmount(amount: number): string {
        return `${Math.round(amount)}`;
    }

    public show(): void {
        if (this.ctaNode && this.ctaNode.isValid) {
            this.ctaNode.active = true;
        } else if (this.node && this.node.isValid) {
            this.node.active = true;
        }
    }

    public hide(): void {
        if (this.ctaNode && this.ctaNode.isValid) {
            this.ctaNode.active = false;
        } else if (this.node && this.node.isValid) {
            this.node.active = false;
        }
    }

    public getRewardAmount(): number {
        if (this.rewardAmount && this.rewardAmount.isValid) {
            return parseFloat(this.rewardAmount.string) || 0;
        }
        return 0;
    }
}
