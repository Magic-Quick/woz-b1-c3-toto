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
    private originalSiblingIndex: number | null = null;
    private originalCageParent: Node | null = null;

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

    public setTutorialFxPaused(paused: boolean): void {
        if (!this.fireAnim) return;
        if (paused) {
            this.fireAnim.pauseAnimation();
        } else {
            this.fireAnim.resumeAnimation();
        }
    }

    public beginTutorialPresentation(overlayNode: Node): void {
        const overlayParent = overlayNode?.parent;
        if (!overlayNode || !overlayParent || !this.cageRoot?.isValid) {
            this.logger.warn('Diagnostic: unable to raise CageRoot for tutorial presentation.');
            return;
        }

        if (this.originalSiblingIndex === null) {
            this.originalSiblingIndex = this.cageRoot.getSiblingIndex();
            this.originalCageParent = this.cageRoot.parent;
        }

        const cageWorldPosition = this.cageRoot.worldPosition.clone();
        overlayParent.addChild(this.cageRoot);
        this.cageRoot.setWorldPosition(cageWorldPosition);

        const targetIndex = Math.min(overlayParent.children.length - 1, overlayNode.getSiblingIndex() + 1);
        this.cageRoot.setSiblingIndex(targetIndex);
        this.logger.info(`beginTutorialPresentation siblingIndex=${targetIndex}`);
    }

    public endTutorialPresentation(): void {
        if (this.originalSiblingIndex === null || !this.cageRoot?.isValid || !this.originalCageParent?.isValid) {
            return;
        }

        const cageWorldPosition = this.cageRoot.worldPosition.clone();
        this.originalCageParent.addChild(this.cageRoot);
        this.cageRoot.setWorldPosition(cageWorldPosition);
        this.cageRoot.setSiblingIndex(this.originalSiblingIndex);
        this.logger.info(`endTutorialPresentation siblingIndex=${this.originalSiblingIndex}`);
        this.originalSiblingIndex = null;
        this.originalCageParent = null;
    }

    public async playLockTutorialHint(): Promise<void> {
        const locks = this.lockViews.filter((view) => !!view && view.node?.isValid);
        if (locks.length === 0) {
            this.logger.warn('Diagnostic: no lockViews available for tutorial hint.');
            return;
        }

        this.logger.info('playLockTutorialHint start');

        for (const lockView of locks) {
            await lockView.playTutorialHighlight();
            await new Promise<void>((resolve) => setTimeout(resolve, 500));
        }

        await Promise.all(locks.map((lockView) => lockView.playTutorialHighlight()));
        this.logger.info('playLockTutorialHint done');
    }

    public async removeLock(index: number): Promise<void> {
        const view = this.lockViews[index];
        if (!view) return;
        await view.playOpenAndRemove();
    }

    public async playPackshotTransition(): Promise<void> {
        this.logger.info('playPackshotTransition start');

        // Огонь гаснет.
        this.setFireLevel(0);

        // Скрываем основную композицию клетки синхронно, чтобы финальный fade не расползался.
        const cageSwing = this.cageRoot?.getChildByName('CageSwingRoot') ?? null;
        const fadeTargets = [cageSwing || this.cageRoot, this.fireNode].filter((node): node is Node => !!node && node.isValid);
        const duration = 0.4;
        if (fadeTargets.length === 0) {
            this.logger.info('playPackshotTransition done (no targets)');
            return;
        }

        await new Promise<void>((resolve) => {
            let done = 0;
            fadeTargets.forEach((target) => {
                const op = target.getComponent(UIOpacity) || target.addComponent(UIOpacity);
                tween(op)
                    .to(duration, { opacity: 0 }, { easing: 'sineIn' })
                    .call(() => {
                        target.active = false;
                        done += 1;
                        if (done >= fadeTargets.length) {
                            this.logger.info(`playPackshotTransition done. targets=${fadeTargets.length}`);
                            resolve();
                        }
                    })
                    .start();
            });
        });
    }

    public async playTotoFreed(): Promise<void> {
        // No-op: Тото скрывается в packshot-переходе, happy-анимация показывается
        // в финале через EndCardView (на toto-full sprite).
    }
}
