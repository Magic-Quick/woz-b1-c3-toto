/**
 * Save Toto — circular light animation под WinPanel (spin glow).
 *
 * Постоянное круговое вращение light-спрайта позади WinPanel для вау-эффекта.
 * Light держится в максимально читаемом состоянии: полная непрозрачность, белый цвет,
 * без дополнительных pulse-эффектов.
 * Привязывается к дочернему узлу WinPanel. self-contained, start/stop по onEnable/onDisable.
 */
import { _decorator, Component, tween, Tween, Vec3, CCFloat, UIOpacity, Sprite, Color } from 'cc';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoCircularLightAnimation')
export class SaveTotoCircularLightAnimation extends Component {
    private logger = createSaveTotoLogger('SaveTotoCircularLightAnimation');

    @property({ type: CCFloat, tooltip: 'Полный оборот в секундах' })
    public rotationDurationSec: number = 6.0;

    @property({ type: CCFloat, tooltip: 'Масштаб относительно исходного' })
    public scaleMultiplier: number = 1.0;

    private originalScale: Vec3 = new Vec3(1, 1, 1);
    private tween: any = null;
    private opacity: UIOpacity | null = null;
    private sprite: Sprite | null = null;
    private readonly visibleColor = new Color(255, 255, 255, 255);

    onLoad(): void {
        this.sprite = this.node.getComponent(Sprite) || null;
        this.opacity = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        this.originalScale = this.node.scale.clone();
        const s = this.originalScale.clone().multiplyScalar(this.scaleMultiplier);
        this.node.setScale(s);
        this.opacity.opacity = 255;
        if (this.sprite) {
            this.sprite.color = this.visibleColor;
        }
        if (!this.sprite) {
            this.logger.warn('Diagnostic: circular light node has no Sprite component.');
        }
    }

    onEnable(): void {
        this.play();
    }

    onDisable(): void {
        this.stop();
    }

    public play(): void {
        this.stop();
        const baseScale = this.originalScale.clone().multiplyScalar(this.scaleMultiplier);
        this.node.setScale(baseScale);
        if (this.opacity) {
            this.opacity.opacity = 255;
        }
        if (this.sprite) {
            this.sprite.color = this.visibleColor;
        }
        // Бесконечное вращение вокруг Z.
        this.tween = tween(this.node)
            .by(this.rotationDurationSec, { angle: 360 })
            .repeatForever();
        this.tween.start();
    }

    public stop(): void {
        if (this.tween) {
            this.tween.stop();
            this.tween = null;
        }
        Tween.stopAllByTarget(this.node);
        this.node.angle = 0;
        this.node.setScale(this.originalScale.clone().multiplyScalar(this.scaleMultiplier));
        if (this.opacity) {
            this.opacity.opacity = 255;
        }
        if (this.sprite) {
            this.sprite.color = this.visibleColor;
        }
    }
}
