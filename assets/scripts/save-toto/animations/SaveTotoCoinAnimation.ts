/**
 * Save Toto — анимация монет, летящих к balance label при пополнении счёта.
 *
 * Спавнит N монет (money-dollar-coin) из случайных точек вокруг источника,
 * летят дугой к balance label, fade-out у цели. Self-contained: вызов play().
 *
 * Привязывается к узлу-контейнеру (например FxLayer). Источник и цель — через @property.
 */
import { _decorator, Component, Node, Sprite, SpriteFrame, UIOpacity, tween, Vec3, Tween, CCInteger, CCFloat, instantiate } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoCoinAnimation')
export class SaveTotoCoinAnimation extends Component {
    @property(SpriteFrame)
    public coinSpriteFrame: SpriteFrame | null = null;

    @property(Node)
    public targetNode: Node | null = null;

    @property({ type: CCInteger, tooltip: 'Количество монет' })
    public coinCount: number = 10;

    @property({ type: CCFloat, tooltip: 'Размер монеты' })
    public coinSize: number = 50;

    @property({ type: CCFloat, tooltip: 'Длительность полёта (сек)' })
    public flightDuration: number = 0.6;

    @property({ type: CCFloat, tooltip: 'Разброс источника по X' })
    public sourceSpreadX: number = 200;

    @property({ type: CCFloat, tooltip: 'Разброс источника по Y' })
    public sourceSpreadY: number = 100;

    private pool: Node[] = [];

    /**
     * Запустить анимацию монет, летящих к targetNode.
     * @param sourceWorldPos мировая позиция источника (корзина/символ)
     */
    public play(sourceWorldPos: Vec3): void {
        if (!this.coinSpriteFrame || !this.targetNode) return;
        const targetWorld = this.targetNode.worldPosition;

        for (let i = 0; i < this.coinCount; i++) {
            this.scheduleOnce(() => this.spawnCoin(sourceWorldPos, targetWorld, i), i * 0.04);
        }
    }

    private spawnCoin(sourceWorld: Vec3, targetWorld: Vec3, index: number): void {
        const coin = new Node('Coin');
        this.node.addChild(coin);

        const sprite = coin.addComponent(Sprite);
        sprite.spriteFrame = this.coinSpriteFrame;
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        const ut = coin.getComponent('cc.UITransform') as any;
        ut.setContentSize(this.coinSize, this.coinSize);

        const op = coin.addComponent(UIOpacity);
        op.opacity = 0;

        // Случайный offset источника.
        const ox = (Math.random() - 0.5) * this.sourceSpreadX;
        const oy = (Math.random() - 0.5) * this.sourceSpreadY;
        const srcWithOffset = new Vec3(sourceWorld.x + ox, sourceWorld.y + oy, sourceWorld.z);

        // Локальные координаты относительно this.node.
        const localFrom = this.node.inverseTransformPoint(new Vec3(), srcWithOffset);
        const localTo = this.node.inverseTransformPoint(new Vec3(), targetWorld);

        coin.setPosition(localFrom);

        // Дуга: midpoint выше прямой.
        const mid = new Vec3(
            (localFrom.x + localTo.x) / 2,
            (localFrom.y + localTo.y) / 2 + 80 + Math.random() * 40,
            0
        );

        tween(coin)
            .call(() => { op.opacity = 255; })
            .to(this.flightDuration * 0.5, { position: mid, scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineOut' })
            .to(this.flightDuration * 0.5, { position: localTo, scale: new Vec3(0.5, 0.5, 1) }, { easing: 'sineIn' })
            .call(() => {
                tween(op)
                    .to(0.1, { opacity: 0 })
                    .call(() => coin.destroy())
                    .start();
            })
            .start();
    }
}
