/**
 * Save Toto — короткий фонтан монет из центра за спрайтом Тото в финале.
 *
 * Ограниченно по времени спавнит монеты из центра, разлетающиеся в разные стороны по экрану.
 * Параболическая траектория (вверх + в сторону + гравитация вниз). Fade-out у краёв.
 *
 * Привязывается к узлу-контейнеру (EndCardLayer или FxLayer). start/stop по play()/stop().
 */
import { _decorator, Component, Node, Sprite, SpriteFrame, UIOpacity, tween, Vec3, CCFloat, CCInteger, math } from 'cc';

const { ccclass, property } = _decorator;

interface CoinState {
    node: Node;
    opacity: UIOpacity;
    x: number;
    y: number;
    rot: number;
    vx: number;
    vy: number;
    spin: number;
    elapsed: number;
}

@ccclass('SaveTotoCoinFountain')
export class SaveTotoCoinFountain extends Component {
    @property(SpriteFrame)
    public coinSpriteFrame: SpriteFrame | null = null;

    @property({ type: CCFloat, tooltip: 'Размер монеты' })
    public coinSize: number = 60;

    @property({ type: CCFloat, tooltip: 'Интервал спавна (сек)' })
    public spawnInterval: number = 0.08;

    @property({ type: CCInteger, tooltip: 'Монет за вспышку' })
    public coinsPerBurst: number = 3;

    @property({ type: CCFloat, tooltip: 'Начальная скорость вверх' })
    public velocityY: number = 600;

    @property({ type: CCFloat, tooltip: 'Разброс скорости по X' })
    public velocityXSpread: number = 800;

    @property({ type: CCFloat, tooltip: 'Гравитация (px/с²)' })
    public gravity: number = 1200;

    @property({ type: CCFloat, tooltip: 'Длительность жизни монеты (сек)' })
    public lifetime: number = 2.5;

    @property({ type: CCFloat, tooltip: 'Длительность фонтана (сек)' })
    public durationSeconds: number = 2.8;

    private running = false;
    private spawnTimer = 0;
    private elapsed = 0;
    private coins: CoinState[] = [];

    // НЕ вызываем this.node.active = false в onLoad — EndFountain стартует
    // неактивным в сцене. onLoad срабатывает при первой активации EndCardLayer
    // и если тут деактивировать ноду, фонтан погаснет сразу после show().
    // Начальное состояние видимости — ответственность сцены.

    public play(): void {
        this.destroyAllCoins();
        this.node.active = true;
        this.running = true;
        this.spawnTimer = 0;
        this.elapsed = 0;
    }

    public stop(): void {
        this.running = false;
        this.spawnTimer = 0;
        this.elapsed = 0;
        this.node.active = false;
        this.destroyAllCoins();
    }

    onDisable(): void {
        this.running = false;
        this.destroyAllCoins();
    }

    onDestroy(): void {
        this.running = false;
        this.destroyAllCoins();
    }

    update(dt: number): void {
        if (!this.running) return;
        this.elapsed += dt;
        if (this.elapsed >= this.durationSeconds) {
            this.stop();
            return;
        }

        // Спавн.
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            for (let i = 0; i < this.coinsPerBurst; i++) {
                this.spawnCoin();
            }
        }

        // Физика + fade всех активных монет в одном цикле (DA-002).
        // Раньше каждая монета имела собственный requestAnimationFrame с
        // захардкоженным dt = 1/60, что ломало физику на не-60Гц и плодило
        // ~100 параллельных RAF-циклов.
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.elapsed += dt;
            coin.x += coin.vx * dt;
            coin.y += coin.vy * dt - 0.5 * this.gravity * coin.elapsed * dt;
            coin.rot += coin.spin * dt;

            if (!coin.node.isValid) {
                this.coins.splice(i, 1);
                continue;
            }
            coin.node.setPosition(coin.x, coin.y, 0);
            coin.node.angle = coin.rot;

            const lifeT = coin.elapsed / this.lifetime;
            if (lifeT > 0.7) {
                coin.opacity.opacity = Math.round(255 * (1 - (lifeT - 0.7) / 0.3));
            }

            if (coin.elapsed >= this.lifetime) {
                coin.node.destroy();
                this.coins.splice(i, 1);
            }
        }
    }

    private spawnCoin(): void {
        if (!this.coinSpriteFrame) return;
        const coinNode = new Node('FountainCoin');
        coinNode.layer = this.node.layer;
        this.node.addChild(coinNode);

        const sprite = coinNode.addComponent(Sprite);
        sprite.spriteFrame = this.coinSpriteFrame;
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        const ut = coinNode.getComponent('cc.UITransform') as any;
        ut.setContentSize(this.coinSize, this.coinSize);

        const opacity = coinNode.addComponent(UIOpacity);
        opacity.opacity = 255;

        coinNode.setPosition(0, 0, 0);

        const vx = (Math.random() - 0.5) * this.velocityXSpread;
        const vy = this.velocityY + Math.random() * 200;
        const spin = (Math.random() - 0.5) * 720;

        this.coins.push({
            node: coinNode,
            opacity,
            x: 0,
            y: 0,
            rot: 0,
            vx,
            vy,
            spin,
            elapsed: 0,
        });
    }

    private destroyAllCoins(): void {
        for (const coin of this.coins) {
            if (coin.node.isValid) coin.node.destroy();
        }
        this.coins.length = 0;
        const children = [...this.node.children];
        children.forEach((child) => child.destroy());
    }
}
