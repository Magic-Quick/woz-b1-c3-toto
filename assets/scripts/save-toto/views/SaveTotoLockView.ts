/**
 * Save Toto — view одного замка.
 *
 * Unlock-анимация: ключ вылетает из позиции корзины к замку, замок scale-up +
 * swap спрайта на open-lock, ключ исчезает. Open-lock остаётся видимым.
 *
 * По возможности делегирует SaveTotoLockOpenRemoveAnimation; при его отсутствии
 * использует tween fallback.
 */
import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoLockId } from '../types';
import { SaveTotoLockViewLike } from '../controllers/SaveTotoLockUnlockController';
import { SaveTotoLockOpenRemoveAnimation } from '../animations/SaveTotoLockOpenRemoveAnimation';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoLockView')
export class SaveTotoLockView extends Component implements SaveTotoLockViewLike {
    @property
    public lockId: SaveTotoLockId = 'left';

    /** Спрайт открытого замка (open-lock.png). Свопается после прилёта ключа. */
    @property(SpriteFrame)
    public openLockSpriteFrame: SpriteFrame | null = null;

    /** Спрайт ключа (symbol-key.png) для key-flight. Опционально. */
    @property(SpriteFrame)
    public keySpriteFrame: SpriteFrame | null = null;

    /** Контейнер для спавна ключа (общий fx-корень). Если null — ключ ребёнок this.node.parent. */
    @property(Node)
    public keyFlightRoot: Node | null = null;

    /** Зеркалить спрайт по X (для правого замка, чтобы open-lock смотрел логично). */
    @property
    public mirror: boolean = false;

    private originalScale: Vec3 = new Vec3(1, 1, 1);

    onLoad(): void {
        this.originalScale = this.node.scale.clone();
        // Применяем mirror к базовому scale (x = -|x|).
        if (this.mirror) {
            this.originalScale.x = -Math.abs(this.originalScale.x);
            this.node.setScale(this.originalScale);
        }
    }

    public async playOpenAndRemove(): Promise<void> {
        const node = this.node;
        if (!node || !node.isValid) return;
        await this.playUnlockFrom(node.worldPosition);
    }

    /**
     * Unlock с key-flight из мировой позиции корзины.
     * @param keyFromWorldPos мировая позиция корзины (откуда летит ключ)
     */
    public async playUnlockFrom(keyFromWorldPos: Vec3): Promise<void> {
        const node = this.node;
        if (!node || !node.isValid) return;

        // 1. Spawn ключ и летит к замку.
        if (this.keySpriteFrame && this.keyFlightRoot) {
            await this.flyKey(keyFromWorldPos);
        }

        // 2. Scale-up замка (вздрогнул) + swap на open-lock, open-lock остаётся.
        // Preserve sign of x для mirror.
        const sx = this.originalScale.x;
        await new Promise<void>((resolve) => {
            tween(node)
                .to(0.12, { scale: new Vec3(sx < 0 ? -1.25 : 1.25, 1.25, 1.25) }, { easing: 'sineOut' })
                .call(() => {
                    this.swapToOpenLock();
                })
                .to(0.18, { scale: this.originalScale }, { easing: 'backOut' })
                .call(() => resolve())
                .start();
        });
    }

    /** Лёт ключа из source к замку. Ключ спавнится как Sprite (symbol-key). */
    private flyKey(keyFromWorldPos: Vec3): Promise<void> {
        return new Promise<void>((resolve) => {
            const root = this.keyFlightRoot!;
            // Активируем root (иначе дочерние ноды не рендерятся).
            root.active = true;
            const keyNode = new Node('KeyFlight');
            root.addChild(keyNode);
            const sprite = keyNode.addComponent(Sprite);
            sprite.spriteFrame = this.keySpriteFrame!;
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            // UITransform уже добавляется компонентом Sprite; задаём размер.
            const tr = keyNode.getComponent('cc.UITransform') as any;
            tr.setContentSize(90, 90);

            const localFrom = root.inverseTransformPoint(new Vec3(), keyFromWorldPos);
            keyNode.setPosition(localFrom);
            const lockWorld = this.node.worldPosition;
            const localTo = root.inverseTransformPoint(new Vec3(), lockWorld);

            const op = keyNode.addComponent(UIOpacity);
            op.opacity = 0;

            tween(keyNode)
                .call(() => { op.opacity = 255; })
                .to(0.35, {
                    position: localTo,
                    scale: new Vec3(1.15, 1.15, 1.15),
                }, { easing: 'sineIn' })
                .call(() => {
                    tween(op)
                        .to(0.12, { opacity: 0 })
                        .call(() => { keyNode.destroy(); })
                        .start();
                    resolve();
                })
                .start();
        });
    }

    /** Swap спрайта замка на open-lock (с native размером, без искажений). */
    private swapToOpenLock(): void {
        if (!this.openLockSpriteFrame) return;
        const sprite = this.node.getComponent(Sprite);
        if (sprite) {
            sprite.spriteFrame = this.openLockSpriteFrame;
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        }
    }
}
