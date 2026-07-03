/**
 * Save Toto — view end-card слоя.
 *
 * Packshot: затемняющий overlay + logo + EndToto (полностью видимый, body имеет вырезы
 * под клетку — клетка уже исчезла в playPackshotTransition). Toto в happy-анимации.
 * CTA pulse на PlayNowButton.
 */
import { _decorator, Component, Node, Label, tween, Vec3, UIOpacity, Button, Tween } from 'cc';
import { SaveTotoCtaPulseAnimation } from '../animations/SaveTotoCtaPulseAnimation';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoEndCardView')
export class SaveTotoEndCardView extends Component {
    private logger = createSaveTotoLogger('SaveTotoEndCardView');

    @property(Node)
    public root: Node = null!;

    @property(Node)
    public endTotoRoot: Node = null!;

    @property(Label)
    public endWinLabel: Label | null = null;

    @property(Label)
    public endLegalLabel: Label | null = null;

    @property(Button)
    public playNowButton: Button = null!;

    protected onLoad(): void {
        this.validateBindings();
    }

    // FIX 2026-06-29: НЕ вызываем hideImmediate() в onLoad (см. OI-509).
    public hideImmediate(): void {
        if (this.root) this.root.active = false;
        this.stopTotoHappy();
        this.stopCtaPulse();
    }

    onDisable(): void {
        this.stopTotoHappy();
        this.stopCtaPulse();
    }

    public async show(finalWin: number): Promise<void> {
        this.validateBindings();

        if (this.endWinLabel) {
            this.endWinLabel.string = `${Math.round(finalWin)}`;
        } else {
            this.logger.warn(`Diagnostic: endWinLabel is not bound; finalWin=${Math.round(finalWin)} will not be rendered as text.`);
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
        this.stopTotoHappy();
        this.stopCtaPulse();
        if (this.root) this.root.active = false;
    }

    public getPlayNowButton(): Button {
        return this.playNowButton;
    }

    private validateBindings(): void {
        if (this.endWinLabel && this.endLegalLabel && this.endWinLabel.node === this.endLegalLabel.node) {
            this.logger.warn('Diagnostic: endWinLabel and endLegalLabel point to the same node. Clearing endWinLabel to protect legal copy.');
            this.endWinLabel = null;
        }

        if (this.endLegalLabel && !this.endLegalLabel.string.trim()) {
            this.logger.warn('Diagnostic: endLegalLabel is bound but empty.');
        }
    }

    /** Happy-анимация Тото: ритмичный bounce на toto-full sprite. */
    private playTotoHappy(): void {
        if (!this.endTotoRoot) return;
        this.stopTotoHappy();
        const base = this.endTotoRoot.scale.clone();
        const pulseScale = base.clone().multiplyScalar(1.1);

        tween(this.endTotoRoot)
            .to(0.3, { scale: pulseScale }, { easing: 'sineInOut' })
            .to(0.3, { scale: base }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private stopTotoHappy(): void {
        if (!this.endTotoRoot) return;
        Tween.stopAllByTarget(this.endTotoRoot);
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
