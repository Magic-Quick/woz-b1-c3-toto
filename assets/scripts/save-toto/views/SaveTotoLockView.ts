/**
 * Save Toto — view одного замка.
 *
 * Unlock-анимация: ключ вылетает из позиции корзины к замку, замок scale-up +
 * swap спрайта на open-lock, ключ исчезает. Open-lock остаётся видимым.
 *
 * По возможности делегирует SaveTotoLockOpenRemoveAnimation; при его отсутствии
 * использует tween fallback.
 */
import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3, UIOpacity, UITransform, Tween, Color } from 'cc';
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
    private tutorialHighlightNode: Node | null = null;
    private tutorialHighlightOpacity: UIOpacity | null = null;
    private tutorialHighlightBaseScale: Vec3 = new Vec3(1, 1, 1);
    private readonly tutorialHighlightColor = new Color(255, 247, 220, 255);

    onLoad(): void {
        this.originalScale = this.node.scale.clone();
        // Применяем mirror к базовому scale (x = -|x|).
        if (this.mirror) {
            this.originalScale.x = -Math.abs(this.originalScale.x);
            this.node.setScale(this.originalScale);
        }
        this.ensureTutorialHighlight();
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

        this.resetTutorialHighlight();

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

    public async playTutorialHighlight(delaySeconds: number = 0): Promise<void> {
        const highlightNode = this.ensureTutorialHighlight();
        if (!highlightNode || !this.tutorialHighlightOpacity) return;

        this.resetTutorialHighlight();

        if (delaySeconds > 0) {
            // OI-519: задержка синхронная с Cocos timeScale/pause.
            if (this.node?.isValid) {
                await new Promise<void>((resolve) => {
                    let done = false;
                    const finish = () => { if (!done) { done = true; resolve(); } };
                    tween(this.node)
                        .delay(delaySeconds)
                        .call(finish)
                        .start();
                });
            }
        }

        if (!this.node?.isValid || !highlightNode.isValid || !this.tutorialHighlightOpacity.isValid) return;

        const sx = this.originalScale.x;
        const emphasizedScale = new Vec3(sx < 0 ? -1.05 : 1.05, 1.05, 1.05);

        return new Promise<void>((resolve) => {
            tween(this.tutorialHighlightOpacity!)
                .to(0.18, { opacity: 185 }, { easing: 'sineOut' })
                .delay(0.12)
                .to(0.22, { opacity: 0 }, { easing: 'sineIn' })
                .call(() => resolve())
                .start();

            tween(highlightNode)
                .to(0.18, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineOut' })
                .delay(0.12)
                .to(0.22, { scale: this.tutorialHighlightBaseScale.clone() }, { easing: 'sineInOut' })
                .start();

            tween(this.node)
                .to(0.18, { scale: emphasizedScale }, { easing: 'sineOut' })
                .delay(0.12)
                .to(0.22, { scale: this.originalScale.clone() }, { easing: 'sineInOut' })
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

    private ensureTutorialHighlight(): Node | null {
        if (this.tutorialHighlightNode && this.tutorialHighlightNode.isValid) {
            return this.tutorialHighlightNode;
        }

        const sourceSprite = this.node.getComponent(Sprite);
        const sourceTransform = this.node.getComponent(UITransform);
        if (!sourceSprite || !sourceTransform) {
            return null;
        }

        const highlightNode = new Node('TutorialHighlight');
        highlightNode.layer = this.node.layer;
        this.node.addChild(highlightNode);
        highlightNode.setPosition(0, 0, 0);
        highlightNode.setScale(this.tutorialHighlightBaseScale);
        highlightNode.setSiblingIndex(this.node.children.length - 1);

        const highlightTransform = highlightNode.addComponent(UITransform);
        highlightTransform.setContentSize(sourceTransform.contentSize);

        const highlightSprite = highlightNode.addComponent(Sprite);
        highlightSprite.spriteFrame = sourceSprite.spriteFrame;
        highlightSprite.sizeMode = sourceSprite.sizeMode;
        highlightSprite.type = sourceSprite.type;
        highlightSprite.color = this.tutorialHighlightColor;

        const highlightOpacity = highlightNode.addComponent(UIOpacity);
        highlightOpacity.opacity = 0;

        this.tutorialHighlightNode = highlightNode;
        this.tutorialHighlightOpacity = highlightOpacity;
        return highlightNode;
    }

    private resetTutorialHighlight(): void {
        if (this.tutorialHighlightNode?.isValid) {
            Tween.stopAllByTarget(this.tutorialHighlightNode);
            this.tutorialHighlightNode.setScale(this.tutorialHighlightBaseScale.clone());
        }
        if (this.tutorialHighlightOpacity?.isValid) {
            Tween.stopAllByTarget(this.tutorialHighlightOpacity);
            this.tutorialHighlightOpacity.opacity = 0;
        }
        if (this.node?.isValid) {
            Tween.stopAllByTarget(this.node);
            this.node.setScale(this.originalScale.clone());
        }
    }
}
