/**
 * Save Toto — view threat-слоя (implements SaveTotoThreatView).
 *
 * Огонь: делегирует SaveTotoFireAnimation (idle pulse + level-driven height/opacity).
 * Packshot transition: клетка полностью исчезает (opacity 0), Тото остаётся непрозрачным
 * и переходит в happy-анимацию. Packshot overlay добавляется отдельно (EndCardLayer).
 */
import { _decorator, Component, Node, tween, Vec3, UIOpacity } from 'cc';
import { SaveTotoThreatView as ISaveTotoThreatView } from '../interfaces/SaveTotoViews';
import { SaveTotoFireLevel } from '../types';
import { SaveTotoLockView } from './SaveTotoLockView';
import { SaveTotoPackshotIntroAnimation } from '../animations/SaveTotoPackshotIntroAnimation';
import { SaveTotoFireAnimation } from '../animations/SaveTotoFireAnimation';
import { SaveTotoAutoFloat } from '../animations/SaveTotoAutoFloat';
import { createSaveTotoLogger } from '../common/SaveTotoLogger';

const { ccclass, property } = _decorator;

@ccclass('SaveTotoThreatView')
export class SaveTotoThreatView extends Component implements ISaveTotoThreatView {
    private logger = createSaveTotoLogger('SaveTotoThreatView');

    @property(Node)
    public fireNode: Node = null!;

    @property([SaveTotoLockView])
    public lockViews: SaveTotoLockView[] = [];

    @property(Node)
    public cageRoot: Node = null!;

    @property(Node)
    public totoRoot: Node = null!;

    @property(Node)
    public lightFxNode: Node = null!;

    /** Полный Тото (toto-full) — показывается после исчезновения клетки вместо assembled body+head+tongue. */
    @property(Node)
    public totoFullNode: Node | null = null;

    private currentFireLevel: SaveTotoFireLevel = 3;
    private fireAnim: SaveTotoFireAnimation | null = null;

    onLoad(): void {
        if (this.lightFxNode) this.lightFxNode.active = false;
        this.fireAnim = this.fireNode?.getComponent(SaveTotoFireAnimation) || null;
        if (this.fireAnim) {
            this.fireAnim.setLevel(3);
        } else {
            this.logger.warn('Diagnostic: SaveTotoFireAnimation is missing on fireNode. Fire level changes will not animate.');
        }
    }

    public setFireLevel(level: SaveTotoFireLevel): void {
        this.currentFireLevel = level;
        if (this.fireAnim) {
            this.fireAnim.setLevel(level);
        } else {
            this.logger.warn(`Diagnostic: setFireLevel(${level}) ignored because SaveTotoFireAnimation is not bound.`);
        }
    }

    public getFireLevel(): SaveTotoFireLevel {
        return this.currentFireLevel;
    }

    public async removeLock(index: number): Promise<void> {
        const view = this.lockViews[index];
        if (!view) return;
        await view.playOpenAndRemove();
    }

    public async playPackshotTransition(): Promise<void> {
        // Огонь гаснет.
        this.setFireLevel(0);

        // Скрываем всё в threat-слое: клетку, замки, собранного Тото.
        // Финальный Тото (toto-full) показывается отдельно в EndCardView.show().
        const cageSwing = this.cageRoot?.getChildByName('CageSwingRoot') ?? null;
        const fadeTarget = cageSwing || this.cageRoot;
        if (fadeTarget) {
            const op = fadeTarget.getComponent(UIOpacity) || fadeTarget.addComponent(UIOpacity);
            await new Promise<void>((resolve) => {
                tween(op)
                    .to(0.5, { opacity: 0 }, { easing: 'sineIn' })
                    .call(() => {
                        fadeTarget.active = false;
                        resolve();
                    })
                    .start();
            });
        }
    }

    public async playTotoFreed(): Promise<void> {
        // No-op: Тото скрывается в packshot-переходе, happy-анимация показывается
        // в финале через EndCardView (на toto-full sprite).
    }
}
