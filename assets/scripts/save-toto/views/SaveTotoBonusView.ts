/**
 * Save Toto — view bonus-слоя (implements SaveTotoBonusView).
 * 6 корзин, 3 выбора, reward-by-pick-index. Не выбранные корзины остаются закрытыми (OI-006).
 */

import { _decorator, Component, Node, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoBonusView as ISaveTotoBonusView } from '../interfaces/SaveTotoViews';
import { SaveTotoBasketView } from './SaveTotoBasketView';
import { SaveTotoBonusReward } from '../types';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoBonusView')
export class SaveTotoBonusView extends Component implements ISaveTotoBonusView {
    @property(Node)
    public bonusRoot: Node = null!;

    @property([SaveTotoBasketView])
    public basketViews: SaveTotoBasketView[] = [];

    @property(Node)
    public instructionLabel: Node = null!;

    onLoad(): void {
        this.hideImmediate();
    }

    public hideImmediate(): void {
        if (this.bonusRoot) this.bonusRoot.active = false;
        if (this.instructionLabel) this.instructionLabel.active = false;
    }

    public async showBaskets(): Promise<void> {
        if (this.bonusRoot) this.bonusRoot.active = true;
        if (this.instructionLabel) this.instructionLabel.active = true;

        const op = this.bonusRoot.getComponent(UIOpacity) || this.bonusRoot.addComponent(UIOpacity);
        op.opacity = 0;

        // Все корзины включены и доступны до первого выбора.
        this.basketViews.forEach(v => v.setEnabled(true));

        return new Promise<void>((resolve) => {
            tween(op)
                .to(0.4, { opacity: 255 })
                .call(() => resolve())
                .start();
        });
    }

    public async hideBaskets(): Promise<void> {
        if (!this.bonusRoot) return;
        const op = this.bonusRoot.getComponent(UIOpacity) || this.bonusRoot.addComponent(UIOpacity);
        return new Promise<void>((resolve) => {
            tween(op)
                .to(0.25, { opacity: 0 })
                .call(() => {
                    this.bonusRoot.active = false;
                    resolve();
                })
                .start();
        });
    }

    public setBasketEnabled(index: number, enabled: boolean): void {
        const view = this.basketViews[index];
        if (view) view.setEnabled(enabled);
    }

    public setAllBasketsEnabled(enabled: boolean): void {
        this.basketViews.forEach(v => v.setEnabled(enabled));
    }

    public async openBasket(index: number, reward: SaveTotoBonusReward): Promise<void> {
        const view = this.basketViews[index];
        if (!view) return;

        // Блокируем остальные корзины на время unlock sequence.
        this.setAllBasketsEnabled(false);

        await view.playSelected(reward);
    }

    public getBasketAnchor(index: number): Node {
        const view = this.basketViews[index];
        return view?.node ?? this.node;
    }

    /** Раскрыть оставшиеся корзины декоративно (опционально, polish). */
    public revealRemaining(): void {
        // MVP: оставшиеся корзины остаются закрытыми (OI-006).
    }
}
