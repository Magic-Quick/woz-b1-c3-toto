/**
 * Save Toto — view bonus-слоя.
 *
 * PRESENTATION FIX 2026-06-29:
 * - explicit `reelRoot` ref
 * - при showBaskets() reel скрывается, чтобы бонусная сетка была очевидна визуально
 * - при hideBaskets() reel остаётся скрытым (дальше идёт payout/endcard)
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

    /** Reel скрывается в момент входа в bonus, чтобы сетка корзин была очевидна. */
    @property(Node)
    public reelRoot: Node | null = null;

    // FIX 2026-06-29: НЕ вызываем hideImmediate() в onLoad.
    // BonusRoot стартует неактивным в сцене (_active=false), поэтому onLoad
    // компонента не выполняется при старте — он выполняется в первый раз ровно
    // когда showBaskets() ставит bonusRoot.active=true. Если в onLoad снова
    // деактивировать ноду, bonus тут же гаснет и остаётся невидимым (tween opacity
    // дорабатывает вхолостую). Начальное состояние видимости — ответственность
    // сцены, а не компонента.
    public hideImmediate(): void {
        if (this.bonusRoot) this.bonusRoot.active = false;
        if (this.instructionLabel) this.instructionLabel.active = false;
    }

    public async showBaskets(): Promise<void> {
        if (this.reelRoot) {
            this.reelRoot.active = false;
        }
        if (this.bonusRoot) this.bonusRoot.active = true;
        if (this.instructionLabel) this.instructionLabel.active = true;

        const op = this.bonusRoot.getComponent(UIOpacity) || this.bonusRoot.addComponent(UIOpacity);
        op.opacity = 0;

        const basketGrid = this.basketViews.length > 0 ? this.basketViews[0].node.parent : null;
        const originalGridScale = basketGrid?.scale.clone() ?? new Vec3(1, 1, 1);
        if (basketGrid) {
            basketGrid.setScale(new Vec3(originalGridScale.x * 0.88, originalGridScale.y * 0.88, originalGridScale.z));
            tween(basketGrid)
                .to(0.35, { scale: originalGridScale }, { easing: 'backOut' })
                .start();
        }

        this.basketViews.forEach(v => {
            v.node.active = true;
            v.setEnabled(true);
        });

        return new Promise<void>((resolve) => {
            tween(op)
                .to(0.35, { opacity: 255 })
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

        this.setAllBasketsEnabled(false);
        await view.playSelected(reward);
    }

    public getBasketAnchor(index: number): Node {
        const view = this.basketViews[index];
        return view?.node ?? this.node;
    }

    public revealRemaining(): void {
        // MVP: оставшиеся корзины остаются закрытыми (OI-006).
    }
}
