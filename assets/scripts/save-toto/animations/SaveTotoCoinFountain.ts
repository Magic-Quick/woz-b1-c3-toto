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
        this.stop();
    }

    onDestroy(): void {
        this.stop();
    }

    update(dt: number): void {
        if (!this.running) return;
        this.elapsed += dt;
        if (this.elapsed >= this.durationSeconds) {
            this.stop();
            return;
        }
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            for (let i = 0; i < this.coinsPerBurst; i++) {
                this.spawnCoin();
            }
        }
    }

    private spawnCoin(): void {
        if (!this.coinSpriteFrame) return;
        const coin = new Node('FountainCoin');
        this.node.addChild(coin);

        const sprite = coin.addComponent(Sprite);
        sprite.spriteFrame = this.coinSpriteFrame;
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        const ut = coin.getComponent('cc.UITransform') as any;
        ut.setContentSize(this.coinSize, this.coinSize);

        const op = coin.addComponent(UIOpacity);
        op.opacity = 255;

        // Начальная позиция — центр контейнера.
        coin.setPosition(0, 0, 0);

        // Случайная скорость.
        const vx = (Math.random() - 0.5) * this.velocityXSpread;
        const vy = this.velocityY + Math.random() * 200;
        const spin = (Math.random() - 0.5) * 720; // град/сек

        let elapsed = 0;
        let x = 0, y = 0;
        let rot = 0;

        const tick = () => {
            if (!coin.isValid) return;
            const dt = 1 / 60;
            elapsed += dt;
            x += vx * dt;
            y += vy * dt - 0.5 * this.gravity * elapsed * dt;
            rot += spin * dt;
            coin.setPosition(x, y, 0);
            coin.angle = rot;

            // Fade-out в последней трети жизни.
            const lifeT = elapsed / this.lifetime;
            if (lifeT > 0.7) {
                op.opacity = Math.round(255 * (1 - (lifeT - 0.7) / 0.3));
            }

            if (elapsed < this.lifetime) {
                requestAnimationFrame(tick);
            } else {
                if (coin.isValid) coin.destroy();
            }
        };
        requestAnimationFrame(tick);
    }

    private destroyAllCoins(): void {
        const children = [...this.node.children];
        children.forEach((child) => child.destroy());
    }
}
