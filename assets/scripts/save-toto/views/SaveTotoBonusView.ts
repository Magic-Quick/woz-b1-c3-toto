/**
 * Save Toto — view bonus-слоя.
 *
 * OI-512: reels НЕ скрываются, а закрываются градиентным оверлэем (BonusDimmer),
 * который заканчивается на верхней границе — перед огнём и панелью выигрыша.
 * Градиент генерируется программно (вертикальный: прозрачный → тёмный → прозрачный),
 * чтобы создать плавное затемнение reels без резких краёв.
 */
import { _decorator, Component, Node, tween, Vec3, UIOpacity, Sprite, Graphics, Color, CCFloat } from 'cc';
import { SaveTotoBonusView as ISaveTotoBonusView } from '../interfaces/SaveTotoViews';
import { SaveTotoBasketView } from './SaveTotoBasketView';
import { SaveTotoBonusReward } from '../types';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoBonusView')
export class SaveTotoBonusView extends Component implements ISaveTotoBonusView {
    private logger = createSaveTotoLogger('SaveTotoBonusView');

    @property(Node)
    public bonusRoot: Node = null!;

    @property([SaveTotoBasketView])
    public basketViews: SaveTotoBasketView[] = [];

    @property(Node)
    public instructionLabel: Node = null!;

    /** Оверлэй с градиентом поверх reels. Если есть — reels не скрываются. */
    @property(Node)
    public dimmerNode: Node | null = null;

    // === Точки настройки dimmer (тюнинг в превью) ===
    @property({ type: CCFloat, tooltip: 'Ширина dimmer (покрытие reels по X)' })
    public dimmerWidth: number = 960;

    @property({ type: CCFloat, tooltip: 'Высота dimmer (покрытие reels по Y)' })
    public dimmerHeight: number = 480;

    @property({ type: CCFloat, tooltip: 'Позиция dimmer по Y (центр, относительно BonusRoot). Нижний край = posY - height/2' })
    public dimmerPosY: number = 130;

    @property({ type: CCFloat, tooltip: 'Макс. alpha градиента в центре (0-255)' })
    public dimmerMaxAlpha: number = 210;

    // FIX 2026-06-29: НЕ вызываем hideImmediate() в onLoad (см. OI-509).
    public hideImmediate(): void {
        if (this.bonusRoot) this.bonusRoot.active = false;
        if (this.instructionLabel) this.instructionLabel.active = false;
        if (this.dimmerNode) this.dimmerNode.active = false;
    }

    private gradientBuilt = false;

    onLoad(): void {
        // Градиент строим lazily в showBaskets (onLoad может не успеть для неактивной ноды).
    }

    /** Программно создать вертикальный градиент для dimmer (transparent→dark→transparent). */
    /** Построить градиентный dimmer через cc.Graphics (без runtime-текстур → нет WebGL-ошибок). */
    private buildGradientDimmer(): void {
        if (this.gradientBuilt || !this.dimmerNode) return;

        // Гарантируем UITransform с настраиваемым размером.
        let ut = this.dimmerNode.getComponent('cc.UITransform') as any;
        if (!ut) ut = this.dimmerNode.addComponent('cc.UITransform' as any);
        ut.setContentSize(this.dimmerWidth, this.dimmerHeight);
        // Позиция: центр dimmer (нижний край = posY - height/2).
        this.dimmerNode.setPosition(0, this.dimmerPosY, 0);

        // Рисуем вертикальный градиент полосками: alpha 0 сверху → max в середине → 0 снизу.
        const g = this.dimmerNode.getComponent(Graphics) || this.dimmerNode.addComponent(Graphics);
        g.clear();
        const W = this.dimmerWidth;
        const H = this.dimmerHeight;
        const strips = 24;
        const stripH = H / strips;
        for (let i = 0; i < strips; i++) {
            const t = (i + 0.5) / strips;            // 0..1 сверху вниз
            const v = Math.sin(t * Math.PI);          // 0..1..0
            const alpha = Math.round(this.dimmerMaxAlpha * v);
            g.fillColor = new Color(0, 0, 0, alpha);
            const y = H / 2 - (i + 1) * stripH;       // сверху вниз
            g.rect(-W / 2, y, W, stripH);
            g.fill();
        }

        const op = this.dimmerNode.getComponent(UIOpacity) || this.dimmerNode.addComponent(UIOpacity);
        op.opacity = 0;
        this.dimmerNode.active = false;
        this.gradientBuilt = true;
    }

    public async showBaskets(): Promise<void> {
        // OI-512: НЕ убираем reels — закрываем градиентным оверлэем.
        this.buildGradientDimmer();
        if (this.dimmerNode) {
            this.dimmerNode.active = true;
            const dop = this.dimmerNode.getComponent(UIOpacity) || this.dimmerNode.addComponent(UIOpacity);
            dop.opacity = 0;
            tween(dop).to(0.3, { opacity: 255 }).start();
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
        this.logger.info('hideBaskets start');
        return new Promise<void>((resolve) => {
            tween(op)
                .to(0.25, { opacity: 0 })
                .call(() => {
                    this.bonusRoot.active = false;
                    // Убираем dimmer (reels уже не нужны — дальше packshot).
                    if (this.dimmerNode) {
                        const dop = this.dimmerNode.getComponent(UIOpacity);
                        if (dop) {
                            tween(dop)
                                .to(0.25, { opacity: 0 })
                                .call(() => {
                                    this.dimmerNode.active = false;
                                    this.logger.info('hideBaskets done (bonusRoot + dimmer)');
                                    resolve();
                                })
                                .start();
                            return;
                        }

                        this.dimmerNode.active = false;
                    }
                    this.logger.info('hideBaskets done (bonusRoot)');
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
