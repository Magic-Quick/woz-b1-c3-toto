/**
 * Save Toto — view bonus-слоя.
 *
 * OI-512: reels НЕ скрываются, а закрываются градиентным оверлэем (BonusDimmer),
 * который заканчивается на верхней границе — перед огнём и панелью выигрыша.
 * Градиент генерируется программно (вертикальный: прозрачный → тёмный → прозрачный),
 * чтобы создать плавное затемнение reels без резких краёв.
 */
import { _decorator, Component, Node, tween, Vec3, UIOpacity, Sprite, SpriteFrame, Texture2D, ImageAsset } from 'cc';
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

    /** Оверлэй с градиентом поверх reels. Если есть — reels не скрываются. */
    @property(Node)
    public dimmerNode: Node | null = null;

    // FIX 2026-06-29: НЕ вызываем hideImmediate() в onLoad (см. OI-509).
    public hideImmediate(): void {
        if (this.bonusRoot) this.bonusRoot.active = false;
        if (this.instructionLabel) this.instructionLabel.active = false;
        if (this.dimmerNode) this.dimmerNode.active = false;
    }

    onLoad(): void {
        this.buildGradientTexture();
    }

    /** Программно создать вертикальный градиент для dimmer (transparent→dark→transparent). */
    private buildGradientTexture(): void {
        if (!this.dimmerNode) return;
        const W = 16;
        const H = 64;
        const buf = new Uint8Array(W * H * 4);
        for (let y = 0; y < H; y++) {
            // Vignette: alpha 0 на краях, ~210 в середине.
            const t = y / (H - 1); // 0..1
            const v = Math.sin(t * Math.PI); // 0..1..0
            const alpha = Math.round(210 * v);
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                buf[i] = 0;     // R
                buf[i + 1] = 0; // G
                buf[i + 2] = 0; // B
                buf[i + 3] = alpha;
            }
        }
        const img = new ImageAsset();
        const src = { width: W, height: H, format: Texture2D.PixelFormat.RGBA8888, _data: buf };
        img.reset(src as any);
        const tex = new Texture2D();
        tex.image = img;
        const sf = new SpriteFrame();
        sf.texture = tex;

        const sprite = this.dimmerNode.getComponent(Sprite) || this.dimmerNode.addComponent(Sprite);
        sprite.spriteFrame = sf;
        sprite.type = Sprite.Type.SIMPLE;
        // Stretch во весь dimmer.
        const op = this.dimmerNode.getComponent(UIOpacity) || this.dimmerNode.addComponent(UIOpacity);
        op.opacity = 0;
        this.dimmerNode.active = false;
    }

    public async showBaskets(): Promise<void> {
        // OI-512: НЕ убираем reels — закрываем градиентным оверлэем.
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
        return new Promise<void>((resolve) => {
            tween(op)
                .to(0.25, { opacity: 0 })
                .call(() => {
                    this.bonusRoot.active = false;
                    // Убираем dimmer (reels уже не нужны — дальше packshot).
                    if (this.dimmerNode) {
                        const dop = this.dimmerNode.getComponent(UIOpacity);
                        if (dop) tween(dop).to(0.25, { opacity: 0 }).call(() => { this.dimmerNode.active = false; }).start();
                        else this.dimmerNode.active = false;
                    }
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

