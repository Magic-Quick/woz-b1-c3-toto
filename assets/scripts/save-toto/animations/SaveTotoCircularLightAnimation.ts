/**
 * Save Toto — circular light animation под WinPanel (spin glow).
 *
 * Постоянное круговое вращение light-спрайта позади WinPanel для вау-эффекта.
 * Привязывается к дочернему узлу WinPanel. self-contained, start/stop по onEnable/onDisable.
 */
import { _decorator, Component, tween, Tween, Vec3, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoCircularLightAnimation')
export class SaveTotoCircularLightAnimation extends Component {
    @property({ type: CCFloat, tooltip: 'Полный оборот в секундах' })
    public rotationDurationSec: number = 6.0;

    @property({ type: CCFloat, tooltip: 'Масштаб относительно исходного' })
    public scaleMultiplier: number = 1.0;

    private originalScale: Vec3 = new Vec3(1, 1, 1);
    private tween: any = null;

    onLoad(): void {
        this.originalScale = this.node.scale.clone();
        const s = this.originalScale.clone().multiplyScalar(this.scaleMultiplier);
        this.node.setScale(s);
    }

    onEnable(): void {
        this.play();
    }

    onDisable(): void {
        this.stop();
    }

    public play(): void {
        this.stop();
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
    }
}
