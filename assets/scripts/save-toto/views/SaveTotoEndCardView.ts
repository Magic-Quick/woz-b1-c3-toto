/**
 * Save Toto — view end-card слоя.
 *
 * Packshot: затемняющий overlay + logo + EndToto (полностью видимый, body имеет вырезы
 * под клетку — клетка уже исчезла в playPackshotTransition). Toto в happy-анимации.
 * CTA pulse на PlayNowButton.
 */
import { _decorator, Component, Node, Label, tween, Vec3, UIOpacity, Button } from 'cc';
import { SaveTotoCtaPulseAnimation } from '../animations/SaveTotoCtaPulseAnimation';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoEndCardView')
export class SaveTotoEndCardView extends Component {
    @property(Node)
    public root: Node = null!;

    @property(Node)
    public endTotoRoot: Node = null!;

    @property(Label)
    public endWinLabel: Label = null!;

    @property(Button)
    public playNowButton: Button = null!;

    // FIX 2026-06-29: НЕ вызываем hideImmediate() в onLoad (см. OI-509).
    public hideImmediate(): void {
        if (this.root) this.root.active = false;
        this.stopCtaPulse();
    }

    public async show(finalWin: number): Promise<void> {
        if (this.endWinLabel) {
            this.endWinLabel.string = `${Math.round(finalWin)}`;
        }
        if (this.root) this.root.active = true;

        const op = this.root.getComponent(UIOpacity) || this.root.addComponent(UIOpacity);
        op.opacity = 0;

        // EndTotoRoot уже полностью виден (cage исчез в packshot). Запускаем happy bounce.
        this.playTotoHappy();

        return new Promise<void>((resolve) => {
            tween(op)
                .to(0.5, { opacity: 255 })
                .call(() => {
                    this.playCtaPulse();
                    resolve();
                })
                .start();
        });
    }

    public hide(): void {
        this.stopCtaPulse();
        if (this.root) this.root.active = false;
    }

    public getPlayNowButton(): Button {
        return this.playNowButton;
    }

    /** Happy-анимация Тото: ритмичный bounce на toto-full sprite. */
    private playTotoHappy(): void {
        if (!this.endTotoRoot) return;
        const base = this.endTotoRoot.scale.clone();
        // Бесконечный happy bounce loop.
        tween(this.endTotoRoot)
            .to(0.25, { scale: new Vec3(base.x * 1.08, base.y * 1.08, 1) }, { easing: 'sineOut' })
            .to(0.2, { scale: new Vec3(base.x * 0.98, base.y * 0.98, 1) }, { easing: 'sineIn' })
            .to(0.22, { scale: new Vec3(base.x * 1.04, base.y * 1.04, 1) }, { easing: 'sineOut' })
            .to(0.2, { scale: base }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private playCtaPulse(): void {
        const pulse = this.playNowButton?.node?.getComponent(SaveTotoCtaPulseAnimation);
        pulse?.play();
    }

    private stopCtaPulse(): void {
        const pulse = this.playNowButton?.node?.getComponent(SaveTotoCtaPulseAnimation);
        pulse?.stopAndReset();
    }
}
